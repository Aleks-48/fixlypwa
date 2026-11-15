import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_client.dart';

// Событие SSE (срез 24, REQ-132/133). Та же дисциплина REQ-105, что у push: сервер шлёт
// только type/entityType/entityId/notificationId, без title/body — экран, получив событие,
// перезапрашивает актуальные данные через уже существующий репозиторий (тот же _load(), что
// раньше вызывался вручную по pull-to-refresh).
class SseEvent {
  final String type;
  final String? notificationId;
  final String? entityType;
  final String? entityId;

  SseEvent({required this.type, this.notificationId, this.entityType, this.entityId});

  factory SseEvent.fromJson(Map<String, dynamic> json) {
    final type = json['type'];
    if (type is! String || type.isEmpty) {
      throw const FormatException('Missing SseEvent type');
    }
    return SseEvent(
      type: type,
      notificationId: json['notificationId']?.toString(),
      entityType: json['entityType']?.toString(),
      entityId: json['entityId']?.toString(),
    );
  }
}

// Живой поток вместо поллинга (mobile-app.md REQ-132/133, ADR-0012 §2). `EventSource`
// (браузерный API) недоступен во Flutter и не умеет заголовки — стримим вручную поверх
// http.Client().send() с тем же Bearer-заголовком, что у обычных запросов
// (ApiClient.authHeaders()), парсинг SSE-кадров (event:/data:/пустая строка — разделитель)
// вручную поверх utf8.decoder+LineSplitter. Один коннект на приложение (broadcast-стрим) —
// подписываются экраны в своём initState/dispose, как раньше подписывались на
// RefreshIndicator.
class EventsRepository {
  EventsRepository._();
  static final EventsRepository instance = EventsRepository._();

  final _controller = StreamController<SseEvent>.broadcast();
  http.Client? _client;
  Timer? _reconnectTimer;
  StreamSubscription<String>? _lineSub;
  Completer<void>? _activeDone;
  int _subscribers = 0;
  int _retryAttempt = 0;
  int _generation = 0;

  @visibleForTesting
  http.Client Function()? clientFactory;

  @visibleForTesting
  int get subscriberCount => _subscribers;

  @visibleForTesting
  bool get hasReconnectTimer => _reconnectTimer?.isActive ?? false;

  @visibleForTesting
  int get retryAttempt => _retryAttempt;

  Stream<SseEvent> get stream => _controller.stream;

  void connect() {
    final wasDisconnected = _subscribers == 0;
    _subscribers++;
    if (!wasDisconnected) return;
    _retryAttempt = 0;
    final gen = ++_generation;
    unawaited(_run(gen));
  }

  void disconnect() {
    if (_subscribers > 0) {
      _subscribers--;
    }
    if (_subscribers > 0) return;
    _teardownConnection();
  }

  void forceDisconnect() {
    _subscribers = 0;
    _teardownConnection();
  }

  void _teardownConnection() {
    _generation++;
    _retryAttempt = 0;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    final sub = _lineSub;
    _lineSub = null;
    if (sub != null) {
      unawaited(sub.cancel().catchError((_) {}));
    }
    final done = _activeDone;
    _activeDone = null;
    if (done != null && !done.isCompleted) {
      done.complete();
    }
    _client?.close();
    _client = null;
  }

  Future<void> _run(int gen) async {
    if (_subscribers == 0 || _generation != gen) return;

    http.Client? client;
    StreamSubscription<String>? sub;
    Completer<void>? done;

    try {
      final headers = await ApiClient.instance.authHeaders();
      if (_subscribers == 0 || _generation != gen) return;

      client = (clientFactory ?? http.Client.new)();
      _client = client;

      final uri = Uri.parse('${ApiClient.instance.baseUrl}/api/events');
      final request = http.Request('GET', uri)..headers.addAll(headers);
      final response = await client.send(request).timeout(const Duration(seconds: 15));
      if (_subscribers == 0 || _generation != gen) return;

      if (response.statusCode != 200) {
        throw http.ClientException('SSE HTTP ${response.statusCode}', uri);
      }
      _retryAttempt = 0; // соединение установлено — бэкофф сбрасывается для следующего разрыва

      done = Completer<void>();
      _activeDone = done;
      var eventType = 'message';
      final dataBuffer = StringBuffer();

      sub = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen(
        (line) {
          if (_subscribers == 0 || _generation != gen) return;
          if (line.isEmpty) {
            if (dataBuffer.isNotEmpty) {
              _dispatch(eventType, dataBuffer.toString());
            }
            eventType = 'message';
            dataBuffer.clear();
            return;
          }
          if (line.startsWith(':')) return; // heartbeat/комментарий сервера
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            if (dataBuffer.isNotEmpty) dataBuffer.write('\n');
            dataBuffer.write(line.substring(5).trim());
          }
        },
        onError: (Object err, StackTrace st) {
          if (!done!.isCompleted) done.completeError(err, st);
        },
        onDone: () {
          if (!done!.isCompleted) done.complete();
        },
        cancelOnError: true,
      );
      _lineSub = sub;
      await done.future;
    } catch (_) {
      // сеть/сервер недоступны или сессия истекла — переподключимся ниже с задержкой;
      // это фоновый канал (REQ-132 допускает временный поллинг), падать из-за него нельзя
    } finally {
      if (identical(_lineSub, sub)) {
        _lineSub = null;
      }
      if (identical(_activeDone, done)) {
        _activeDone = null;
      }
      client?.close();
      if (client != null && identical(_client, client)) {
        _client = null;
      }
      if (sub != null) {
        unawaited(sub.cancel().catchError((_) {}));
      }
    }

    if (_subscribers == 0 || _generation != gen) return;
    _scheduleReconnect(gen);
  }

  void _scheduleReconnect(int gen) {
    if (_subscribers == 0 || _generation != gen) return;
    _reconnectTimer?.cancel();
    // Экспоненциальный бэкофф 1с→2с→4с…→30с — не долбим сервер при долгом офлайне/logout.
    _retryAttempt++;
    final exponent = _retryAttempt - 1 > 5 ? 5 : _retryAttempt - 1;
    var seconds = 1 << exponent;
    if (seconds > 30) seconds = 30;
    _reconnectTimer = Timer(Duration(seconds: seconds), () {
      _reconnectTimer = null;
      if (_subscribers > 0 && _generation == gen) {
        unawaited(_run(gen));
      }
    });
  }

  void _dispatch(String eventType, String rawData) {
    if (eventType != 'notification') return;
    try {
      final decoded = jsonDecode(rawData);
      if (decoded is! Map) return;
      _controller.add(SseEvent.fromJson(Map<String, dynamic>.from(decoded)));
    } catch (_) {
      // сервер прислал что-то не по контракту — не рвём соединение из-за одного события
    }
  }
}
