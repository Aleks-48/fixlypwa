import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'token_store.dart';

// HTTP-клиент для бэкенда fixlypwa (ADR-0011/ADR-0012). Контракт ответа — { data } / { error }
// (fixlypwa/src/lib/http.ts). X-Client: mobile — сервер отвечает Bearer-токеном в теле вместо
// httpOnly-cookie (REQ-122/123), т.к. у Flutter нет cookie jar браузера.
//
// Инварианты (code review 2026-07-16): ЛЮБАЯ ошибка транспорта выходит наружу как ApiException
// (SocketException, таймаут, не-JSON тело от прокси — всё), чтобы `on ApiException` у вызывающих
// был единственной точкой обработки; на каждый вызов действует таймаут — мёртвый сервер не
// вешает экран до OS-таймаута сокета.
class ApiException implements Exception {
  final String code;
  final String message;
  final int statusCode;
  ApiException(this.code, this.message, this.statusCode);

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  final TokenStore _tokenStore = TokenStore();
  // Один Client на приложение — keep-alive вместо TCP+TLS-рукопожатия на каждый запрос.
  final http.Client _http = http.Client();

  static const _timeout = Duration(seconds: 15);

  // Дефолт — localhost (десктоп/симулятор iOS). Android-эмулятор видит хост через 10.0.2.2 —
  // задайте API_BASE_URL=http://10.0.2.2:3000 в .env для этого случая; физическое устройство —
  // IP машины с dev-сервером в локальной сети.
  String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    final raw = fromEnv.isNotEmpty
        ? fromEnv
        : (dotenv.isInitialized ? dotenv.env['API_BASE_URL'] : null) ??
            'http://localhost:3000';
    return raw.replaceAll(RegExp(r'/+$'), '');
  }

  Future<Map<String, String>> _headers({required bool auth}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'X-Client': 'mobile',
      // Обходит интерстициал ngrok free-tier (страница-предупреждение вместо JSON) — нужен
      // только пока бэкенд пробрасывается через ngrok для демо, в проде безвреден.
      'ngrok-skip-browser-warning': 'true',
    };
    if (auth) {
      final token = await _tokenStore.read();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Для стримящихся запросов (SSE, срез 24) — те же заголовки (Bearer, X-Client), что и у
  // обычных вызовов, но без Content-Type тела запроса (GET без body). EventsRepository шлёт
  // их вручную через http.Client().send(), т.к. в http-пакете нет клиента для text/event-stream.
  Future<Map<String, String>> authHeaders() => _headers(auth: true);

  dynamic _handle(http.Response res, {String field = 'data'}) {
    if (res.statusCode >= 300 && res.statusCode < 400) {
      throw ApiException(
        'BAD_RESPONSE',
        'Недопустимое перенаправление (${res.statusCode})',
        res.statusCode,
      );
    }
    dynamic parsed;
    if (res.body.isNotEmpty) {
      try {
        parsed = jsonDecode(res.body);
      } on FormatException {
        // Прокси/nginx может отдать HTML-страницу ошибки — не даём FormatException пролететь
        // мимо обработчиков ApiException у вызывающих.
        throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера (${res.statusCode})',
            res.statusCode);
      }
    }
    final body = parsed is Map<String, dynamic>
        ? parsed
        : (parsed is Map
            ? Map<String, dynamic>.from(parsed)
            : <String, dynamic>{});
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return body[field];
    }
    final errObj = body['error'];
    final rawErrMsg = errObj is Map ? errObj['message'] : null;
    final errMessage = errObj is String
        ? errObj
        : (rawErrMsg is String ? rawErrMsg : rawErrMsg?.toString());
    final rawErrCode = errObj is Map ? errObj['code'] : null;
    final errCode = rawErrCode is String ? rawErrCode : rawErrCode?.toString();
    final rawBodyMsg = body['message'];
    final bodyMessage =
        rawBodyMsg is String ? rawBodyMsg : rawBodyMsg?.toString();

    throw ApiException(
      errCode ?? 'HTTP_ERROR',
      errMessage ?? bodyMessage ?? 'Ошибка сети (${res.statusCode})',
      res.statusCode,
    );
  }

  // Все транспортные сбои (нет сети, таймаут, разрыв) → ApiException NETWORK_ERROR.
  Future<dynamic> _run(Future<http.Response> Function() send, {String field = 'data', Duration timeout = _timeout}) async {
    try {
      final res = await send().timeout(timeout);
      return _handle(res, field: field);
    } on TimeoutException {
      throw ApiException('NETWORK_ERROR', 'Сервер не отвечает', 0);
    } on SocketException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    } on http.ClientException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    } on IOException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    }
  }

  Future<String> uploadPhoto(String path) async {
    final file = File(path);
    if (await file.length() > 15 * 1024 * 1024) {
      throw ApiException('SIZE', 'Максимальный размер фото — 15 МБ', 0);
    }
    final bytes = await file.readAsBytes();
    final String subtype;
    if (bytes.length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255) {
      subtype = 'jpeg';
    } else if (bytes.length >= 8 && bytes[0] == 137 && ascii.decode(bytes.sublist(1, 4), allowInvalid: true) == 'PNG') {
      subtype = 'png';
    } else if (bytes.length >= 12 && ascii.decode(bytes.sublist(0, 4), allowInvalid: true) == 'RIFF' &&
        ascii.decode(bytes.sublist(8, 12), allowInvalid: true) == 'WEBP') {
      subtype = 'webp';
    } else {
      throw ApiException('FORMAT', 'Выберите фото JPEG, PNG или WebP', 0);
    }
    return _uploadMedia(bytes, 'photo.$subtype', http.MediaType('image', subtype));
  }

  Future<String> uploadAudio(File file) async {
    if (await file.length() > 10 * 1024 * 1024) {
      throw ApiException('SIZE', 'Максимальный размер записи — 10 МБ', 0);
    }
    return _uploadMedia(await file.readAsBytes(), 'message.m4a', http.MediaType('audio', 'mp4'));
  }

  Future<String> _uploadMedia(List<int> bytes, String name, http.MediaType type) async {
    final data = await _run(() async {
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/api/uploads'))
        ..followRedirects = false
        ..headers.addAll(await authHeaders())
        ..files.add(http.MultipartFile.fromBytes('file', bytes,
            filename: name, contentType: type));
      return http.Response.fromStream(await _http.send(request));
    });
    if (data is Map && data['urls'] is List) {
      final urls = data['urls'] as List;
      if (urls.isNotEmpty && urls.first != null) {
        final url = urls.first.toString().trim();
        if (url.isNotEmpty) return url;
      }
    }
    throw ApiException('BAD_RESPONSE', 'Сервер не вернул URL файла', 500);
  }

  Future<http.StreamedResponse> sendRaw(
    http.BaseRequest request, {
    Duration timeout = const Duration(seconds: 30),
  }) async {
    request.followRedirects = false;
    try {
      return await _http.send(request).timeout(timeout);
    } on TimeoutException {
      throw ApiException('NETWORK_ERROR', 'Сервер не отвечает', 0);
    } on SocketException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    } on http.ClientException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    } on IOException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    }
  }

  Future<dynamic> _sendJson(
    String method,
    String path, {
    required bool auth,
    Object? body,
    String field = 'data',
    Duration timeout = _timeout,
  }) async {
    final headers = await _headers(auth: auth);
    return _run(
      () async {
        final req = http.Request(method, Uri.parse('$baseUrl$path'))
          ..followRedirects = false
          ..headers.addAll(headers);
        if (body != null) {
          req.body = jsonEncode(body);
        }
        return http.Response.fromStream(await _http.send(req));
      },
      field: field,
      timeout: timeout,
    );
  }

  Future<dynamic> get(String path, {bool auth = true, String field = 'data'}) =>
      _sendJson('GET', path, auth: auth, field: field);

  Future<dynamic> post(String path,
          {Object? body, bool auth = true, Duration timeout = _timeout}) =>
      _sendJson('POST', path, auth: auth, body: body, timeout: timeout);

  Future<dynamic> patch(String path, {Object? body, bool auth = true}) =>
      _sendJson('PATCH', path, auth: auth, body: body);

  Future<dynamic> delete(String path, {Object? body, bool auth = true}) =>
      _sendJson('DELETE', path, auth: auth, body: body);
}

/// Безопасное извлечение полей JSON-ответов без необработанных TypeError/FormatException.
abstract final class ApiJson {
  static ApiException badResponse() =>
      ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);

  static Map<String, dynamic> asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      for (final key in value.keys) {
        if (key is! String) throw badResponse();
      }
      return Map<String, dynamic>.from(value);
    }
    throw badResponse();
  }

  static Map<String, dynamic>? asNullableMap(dynamic value) {
    if (value == null) return null;
    return asMap(value);
  }

  static List<dynamic> asList(dynamic value) {
    if (value is List) return value;
    throw badResponse();
  }

  static List<Map<String, dynamic>> asMapList(
    dynamic value, {
    bool allowMissing = false,
  }) {
    if (value == null && allowMissing) return const [];
    return asList(value).map(asMap).toList();
  }

  static List<String> asStringList(
    dynamic value, {
    bool allowMissing = false,
  }) {
    if (value == null && allowMissing) return const [];
    return asList(value).map(asString).toList();
  }

  static String asString(dynamic value) {
    if (value is String) return value;
    throw badResponse();
  }

  static String asNonEmptyString(dynamic value) {
    if (value is String && value.isNotEmpty) return value;
    throw badResponse();
  }

  static String? asNullableString(dynamic value) {
    if (value == null) return null;
    if (value is String) return value;
    throw badResponse();
  }

  static bool asBool(dynamic value, {bool? defaultValue}) {
    if (value is bool) return value;
    if (value == null && defaultValue != null) return defaultValue;
    throw badResponse();
  }

  static int asInt(dynamic value, {int? defaultValue}) {
    if (value is int) return value;
    if (value is num &&
        value.isFinite &&
        value == value.truncateToDouble()) {
      return value.toInt();
    }
    if (value == null && defaultValue != null) return defaultValue;
    throw badResponse();
  }

  static int? asNullableInt(dynamic value, {bool allowString = false}) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num &&
        value.isFinite &&
        value == value.truncateToDouble()) {
      return value.toInt();
    }
    if (allowString && value is String) {
      final parsed = int.tryParse(value);
      if (parsed != null) return parsed;
    }
    throw badResponse();
  }

  static double asDouble(dynamic value, {bool allowString = false}) {
    if (value is num && value.isFinite) return value.toDouble();
    if (allowString && value is String) {
      final parsed = double.tryParse(value);
      if (parsed != null && parsed.isFinite) return parsed;
    }
    throw badResponse();
  }

  static double? asNullableDouble(dynamic value, {bool allowString = false}) {
    if (value == null) return null;
    return asDouble(value, allowString: allowString);
  }

  static DateTime asDateTime(dynamic value) {
    if (value is String) {
      final parsed = DateTime.tryParse(value);
      if (parsed != null) return parsed;
    }
    throw badResponse();
  }

  static DateTime? asNullableDateTime(dynamic value) {
    if (value == null) return null;
    return asDateTime(value);
  }
}
