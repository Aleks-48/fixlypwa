import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Хранилище Bearer-токена сессии (ADR-0012 §1) — защищённое хранилище устройства
// (Keychain/Keystore), не SharedPreferences: токен эквивалентен паролю на время жизни сессии.
//
// Кеш в памяти (code review 2026-07-16): чтение secure storage — платформенный IPC на каждый
// запрос (~5-30 мс); токен читается с диска один раз, дальше из памяти, инвалидация — на
// write/clear. Один экземпляр на приложение — см. singleton ниже (иначе кеши разъезжаются).
class TokenStore {
  TokenStore._();
  static final TokenStore instance = TokenStore._();
  factory TokenStore() => instance;

  static const _key = 'osi_session_token';
  final _storage = const FlutterSecureStorage();

  String? _cached;
  bool _loaded = false;

  Future<String?> read() async {
    if (_loaded) return _cached;
    _cached = await _storage.read(key: _key);
    _loaded = true;
    return _cached;
  }

  Future<void> write(String token) async {
    _cached = token;
    _loaded = true;
    await _storage.write(key: _key, value: token);
  }

  Future<void> clear() async {
    _cached = null;
    _loaded = true;
    await _storage.delete(key: _key);
  }
}
