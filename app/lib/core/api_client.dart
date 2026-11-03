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
  String get baseUrl =>
      (dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000').replaceAll(RegExp(r'/+$'), '');

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

  dynamic _handle(http.Response res) {
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
    final body = parsed is Map<String, dynamic> ? parsed : <String, dynamic>{};
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return body['data'];
    }
    final errObj = body['error'];
    final errMessage = errObj is String
        ? errObj
        : (errObj is Map<String, dynamic> ? errObj['message'] as String? : null);
    final errCode = errObj is Map<String, dynamic> ? errObj['code'] as String? : null;

    throw ApiException(
      errCode ?? 'HTTP_ERROR',
      errMessage ?? (body['message'] as String?) ?? 'Ошибка сети (${res.statusCode})',
      res.statusCode,
    );
  }

  // Все транспортные сбои (нет сети, таймаут, разрыв) → ApiException NETWORK_ERROR.
  Future<dynamic> _run(Future<http.Response> Function() send) async {
    try {
      final res = await send().timeout(_timeout);
      return _handle(res);
    } on TimeoutException {
      throw ApiException('NETWORK_ERROR', 'Сервер не отвечает', 0);
    } on SocketException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    } on http.ClientException {
      throw ApiException('NETWORK_ERROR', 'Нет соединения с сервером', 0);
    }
  }

  Future<dynamic> get(String path, {bool auth = true}) async {
    final headers = await _headers(auth: auth);
    return _run(() => _http.get(Uri.parse('$baseUrl$path'), headers: headers));
  }

  Future<dynamic> post(String path, {Object? body, bool auth = true}) async {
    final headers = await _headers(auth: auth);
    return _run(() => _http.post(
          Uri.parse('$baseUrl$path'),
          headers: headers,
          body: body == null ? null : jsonEncode(body),
        ));
  }

  Future<dynamic> patch(String path, {Object? body, bool auth = true}) async {
    final headers = await _headers(auth: auth);
    return _run(() => _http.patch(
          Uri.parse('$baseUrl$path'),
          headers: headers,
          body: body == null ? null : jsonEncode(body),
        ));
  }

  Future<dynamic> delete(String path, {Object? body, bool auth = true}) async {
    final headers = await _headers(auth: auth);
    return _run(() => _http.delete(
          Uri.parse('$baseUrl$path'),
          headers: headers,
          body: body == null ? null : jsonEncode(body),
        ));
  }
}
