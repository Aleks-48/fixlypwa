import 'api_client.dart';
import 'token_store.dart';
import 'push_repository.dart';

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
    final user = json['user'] as Map<String, dynamic>;
    return AuthUser(
      id: user['id'] as String,
      email: user['email'] as String?,
      phone: user['phone'] as String?,
      fullName: user['fullName'] as String?,
      activeOsiId: json['activeOsiId'] as String?,
      osiName: json['osiName'] as String?,
      apartmentNumber: json['apartmentNumber'] as String?,
      buildingAddress: json['buildingAddress'] as String?,
      roles: ((json['roles'] as List?) ?? const [])
          .cast<Map<String, dynamic>>(),
    );
  }

  // Роль пользователя В АКТИВНОЙ ОСИ (та же логика, что activeChairmanOsi/activeMemberOsi на
  // сервере: у пользователя может быть несколько ролей в разных ОСИ, важна только текущая).
  String? get activeRole {
    if (activeOsiId == null) return null;
    for (final r in roles) {
      if (r['osiId'] == activeOsiId) return r['role'] as String?;
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
  Future<String?> requestOtp(String identifier) async {
    final data = await _api.post(
      '/api/auth/otp/request',
      body: {'identifier': identifier},
      auth: false,
    ) as Map<String, dynamic>?;
    return data?['devCode'] as String?;
  }

  // fullName — ТОЛЬКО из формы регистрации (onboarding-unified.md §0/REQ-146/147); экран
  // «Вход» его не передаёт, обычный повторный вход сохранённое имя не трогает (сервер решает
  // это сам — client просто не шлёт поле). Успешная верификация сохраняет токен и сразу
  // подтягивает полный профиль (роли — в ответе verify их нет, только в /me) — единая точка
  // правды о форме AuthUser.
  Future<AuthUser> verifyOtp(String identifier, String code, {String? fullName}) async {
    final data = await _api.post(
      '/api/auth/otp/verify',
      body: {
        'identifier': identifier,
        'code': code,
        if (fullName != null && fullName.trim().isNotEmpty) 'fullName': fullName.trim(),
      },
      auth: false,
    ) as Map<String, dynamic>;

    final token = data['token'] as String?;
    if (token == null) {
      throw ApiException(
        'NO_TOKEN',
        'Сервер не вернул токен сессии (ожидался мобильный ответ, X-Client: mobile)',
        500,
      );
    }
    await _tokenStore.write(token);

    final user = await me();
    if (user == null) {
      throw ApiException('AUTH_FAILED', 'Не удалось получить профиль после входа', 500);
    }
    return user;
  }

  // Вход председателя по email и паролю
  Future<AuthUser> loginWithPassword(String email, String password) async {
    final data = await _api.post(
      '/api/auth/login',
      body: {
        'email': email.trim(),
        'password': password,
      },
      auth: false,
    ) as Map<String, dynamic>;

    final token = data['token'] as String?;
    if (token == null) {
      throw ApiException(
        'NO_TOKEN',
        'Сервер не вернул токен сессии',
        500,
      );
    }
    await _tokenStore.write(token);

    final user = await me();
    if (user == null) {
      throw ApiException('AUTH_FAILED', 'Не удалось получить профиль после входа', 500);
    }
    return user;
  }

  // null — нет сохранённого токена или он больше не действителен (истёк/отозван, 401
  // подчищает локальное хранилище, чтобы не переспрашивать сервер каждый раз впустую).
  Future<AuthUser?> me() async {
    try {
      final data = await _api.get('/api/auth/me') as Map<String, dynamic>;
      return AuthUser.fromJson(data);
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
    await PushRepository.instance.unregister();
    try {
      await _api.post('/api/auth/logout');
    } catch (_) {
      // Best-effort: даже если сервер недоступен, локальный токен всё равно чистим.
    }
    await _tokenStore.clear();
  }
}
