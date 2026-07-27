import 'dart:async';
import 'dart:convert';
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

  factory SseEvent.fromJson(Map<String, dynamic> json) => SseEvent(
        type: json['type'] as String,
        notificationId: json['notificationId'] as String?,
        entityType: json['entityType'] as String?,
        entityId: json['entityId'] as String?,
      );
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
  bool _wantConnected = false;
  int _retryAttempt = 0;
  int _generation = 0;

  Stream<SseEvent> get stream => _controller.stream;

  void connect() {
    if (_wantConnected) return;
    _wantConnected = true;
    _retryAttempt = 0;
    final gen = ++_generation;
    unawaited(_run(gen));
  }

  void disconnect() {
    _wantConnected = false;
    _generation++;
    _client?.close();
    _client = null;
  }

  Future<void> _run(int gen) async {
    while (_wantConnected && _generation == gen) {
      final client = http.Client();
      _client = client;
      try {
        final headers = await ApiClient.instance.authHeaders();
        final uri = Uri.parse('${ApiClient.instance.baseUrl}/api/events');
        final request = http.Request('GET', uri)..headers.addAll(headers);
        final response = await client.send(request).timeout(const Duration(seconds: 15));
        if (response.statusCode != 200) {
          throw http.ClientException('SSE HTTP ${response.statusCode}', uri);
        }
        _retryAttempt = 0; // соединение установлено — бэкофф сбрасывается для следующего разрыва

        var eventType = 'message';
        final dataBuffer = StringBuffer();

        await for (final line
            in response.stream.transform(utf8.decoder).transform(const LineSplitter())) {
          if (!_wantConnected || _generation != gen) break;
          if (line.isEmpty) {
            if (dataBuffer.isNotEmpty) _dispatch(eventType, dataBuffer.toString());
            eventType = 'message';
            dataBuffer.clear();
            continue;
          }
          if (line.startsWith(':')) continue; // heartbeat/комментарий сервера
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            dataBuffer.write(line.substring(5).trim());
          }
        }
      } catch (_) {
        // сеть/сервер недоступны или сессия истекла — переподключимся ниже с задержкой;
        // это фоновый канал (REQ-132 допускает временный поллинг), падать из-за него нельзя
      } finally {
        _client?.close();
        _client = null;
      }

      if (!_wantConnected || _generation != gen) return;
      // Экспоненциальный бэкофф 1с→2с→4с…→30с — не долбим сервер при долгом офлайне/logout.
      _retryAttempt++;
      final exponent = _retryAttempt - 1 > 5 ? 5 : _retryAttempt - 1;
      var seconds = 1 << exponent;
      if (seconds > 30) seconds = 30;
      await Future.delayed(Duration(seconds: seconds));
    }
  }

  void _dispatch(String eventType, String rawData) {
    if (eventType != 'notification') return;
    try {
      final json = jsonDecode(rawData) as Map<String, dynamic>;
      _controller.add(SseEvent.fromJson(json));
    } catch (_) {
      // сервер прислал что-то не по контракту — не рвём соединение из-за одного события
    }
  }
}
