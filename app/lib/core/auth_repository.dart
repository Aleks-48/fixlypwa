import 'api_client.dart';
import 'events_repository.dart';
import 'token_store.dart';
import 'push_repository.dart';

String? _asNullableString(dynamic value) {
  if (value == null) return null;
  return value is String ? value : value.toString();
}

// Профиль пользователя из /api/auth/me или /api/auth/otp/verify (fixlypwa/src/lib/auth/guards.ts
// publicUser()). roles — [{ osiId, role }], пусто у только что зарегистрированного жителя
// (auth-email.md §3 — первый вход создаёт аккаунт без ролей).
class AuthUser {
  final String id;
  final String? email;
  final String? phone;
  final String? fullName;
  final String? activeOsiId;
  final String? osiName;
  final String? apartmentNumber;
  final String? buildingAddress;
  final List<Map<String, dynamic>> roles;

  AuthUser({
    required this.id,
    this.email,
    this.phone,
    this.fullName,
    this.activeOsiId,
    this.osiName,
    this.apartmentNumber,
    this.buildingAddress,
    required this.roles,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final rawUser = json['user'];
    if (rawUser is! Map) {
      throw ApiException('BAD_RESPONSE', 'Некорректный профиль пользователя', 500);
    }
    final user = Map<String, dynamic>.from(rawUser);
    final id = _asNullableString(user['id']);
    if (id == null || id.isEmpty) {
      throw ApiException('BAD_RESPONSE', 'Некорректный профиль пользователя', 500);
    }

    final rawRoles = json['roles'];
    final parsedRoles = <Map<String, dynamic>>[];
    if (rawRoles is List) {
      for (final item in rawRoles) {
        if (item is Map) {
          parsedRoles.add(Map<String, dynamic>.from(item));
        }
      }
    }

    return AuthUser(
      id: id,
      email: _asNullableString(user['email']),
      phone: _asNullableString(user['phone']),
      fullName: _asNullableString(user['fullName']),
      activeOsiId: _asNullableString(json['activeOsiId']),
      osiName: _asNullableString(json['osiName']),
      apartmentNumber: _asNullableString(json['apartmentNumber']),
      buildingAddress: _asNullableString(json['buildingAddress']),
      roles: parsedRoles,
    );
  }

  // Роль пользователя В АКТИВНОЙ ОСИ (та же логика, что activeChairmanOsi/activeMemberOsi на
  // сервере: у пользователя может быть несколько ролей в разных ОСИ, важна только текущая).
  String? get activeRole {
    if (activeOsiId == null) return null;
    for (final r in roles) {
      if (_asNullableString(r['osiId']) == activeOsiId) {
        return _asNullableString(r['role']);
      }
    }
    return null;
  }
}

// Вход мобильного клиента (ADR-0012 §4, REQ-120): та же email/телефон+код схема, что у жителя
// на сайте (auth-email.md) — пароль и Google/Apple убраны на время миграции (Q-059).
class AuthRepository {
  AuthRepository._();
  static final AuthRepository instance = AuthRepository._();

  final _api = ApiClient.instance;
  final _tokenStore = TokenStore();

  Future<bool> hasStoredToken() async => (await _tokenStore.read()) != null;

  // REQ-005/006: identifier — телефон ИЛИ email, сервер сам определяет канал доставки кода.
  // Возвращает devCode, если сервер его отдал (ТОЛЬКО dev/e2e: OTP_DEV_ECHO=1 + console-провайдер,
  // security-review 2026-07-02) — экран входа показывает его как dev-подсказку, как на сайте.
  Future<({bool needsLink, String? username, String? devCode})> requestOtp(String identifier) async {
    final raw = await _api.post(
      '/api/auth/otp/request',
      body: {'identifier': identifier},
      auth: false,
    );
    final data = raw is Map ? raw : null;
    return (
      needsLink: data?['needsTelegramLink'] == true,
      username: _asNullableString(data?['telegramBotUsername']),
      devCode: _asNullableString(data?['devCode']),
    );
  }

  // fullName — ТОЛЬКО из формы регистрации (onboarding-unified.md §0/REQ-146/147); экран
  // «Вход» его не передаёт, обычный повторный вход сохранённое имя не трогает (сервер решает
  // это сам — client просто не шлёт поле). Успешная верификация сохраняет токен и сразу
  // подтягивает полный профиль (роли — в ответе verify их нет, только в /me) — единая точка
  // правды о форме AuthUser.
  Future<AuthUser> verifyOtp(String identifier, String code, {String? fullName}) async {
    final raw = await _api.post(
      '/api/auth/otp/verify',
      body: {
        'identifier': identifier,
        'code': code,
        if (fullName != null && fullName.trim().isNotEmpty) 'fullName': fullName.trim(),
      },
      auth: false,
    );
    final data = raw is Map ? raw : null;
    final token = _asNullableString(data?['token']);
    if (token == null || token.isEmpty) {
      throw ApiException(
        'NO_TOKEN',
        'Сервер не вернул токен сессии (ожидался мобильный ответ, X-Client: mobile)',
        500,
      );
    }
    await _tokenStore.write(token);

    try {
      final user = await me();
      if (user == null) {
        throw ApiException('AUTH_FAILED', 'Не удалось получить профиль после входа', 500);
      }
      return user;
    } catch (_) {
      await _tokenStore.clear();
      rethrow;
    }
  }

  // Вход председателя по email и паролю
  Future<AuthUser> loginWithPassword(String email, String password) async {
    final raw = await _api.post(
      '/api/auth/login',
      body: {
        'email': email.trim(),
        'password': password,
      },
      auth: false,
    );
    final data = raw is Map ? raw : null;
    final token = _asNullableString(data?['token']);
    if (token == null || token.isEmpty) {
      throw ApiException(
        'NO_TOKEN',
        'Сервер не вернул токен сессии',
        500,
      );
    }
    await _tokenStore.write(token);

    try {
      final user = await me();
      if (user == null) {
        throw ApiException('AUTH_FAILED', 'Не удалось получить профиль после входа', 500);
      }
      return user;
    } catch (_) {
      await _tokenStore.clear();
      rethrow;
    }
  }

  // null — нет сохранённого токена или он больше не действителен (истёк/отозван, 401
  // подчищает локальное хранилище, чтобы не переспрашивать сервер каждый раз впустую).
  Future<AuthUser?> me() async {
    try {
      final raw = await _api.get('/api/auth/me');
      if (raw is! Map) {
        throw ApiException('BAD_RESPONSE', 'Некорректный ответ профиля', 500);
      }
      return AuthUser.fromJson(Map<String, dynamic>.from(raw));
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        await _tokenStore.clear();
        return null;
      }
      rethrow;
    }
  }

  // Редактирование ФИО после регистрации (REQ-147) — доступно и role-less пользователю.
  // PATCH возвращает только { user } (без activeOsiId/roles) — вызывающий, кому нужен полный
  // AuthUser, сам перечитывает me() после успешного обновления.
  Future<void> updateProfile({required String fullName}) async {
    await _api.patch('/api/auth/profile', body: {'fullName': fullName.trim()});
  }

  Future<void> logout() async {
    EventsRepository.instance.forceDisconnect();
    try {
      await PushRepository.instance.unregister();
    } catch (_) {
      // Best-effort: отписка от push не должна блокировать выход.
    }
    try {
      await _api.post('/api/auth/logout');
    } catch (_) {
      // Best-effort: даже если сервер недоступен, локальный токен всё равно чистим.
    }
    await _tokenStore.clear();
  }
}
