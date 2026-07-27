import 'api_client.dart';

// Анкета мастера (REQ-068, onboarding-unified.md §0 вопрос 5: карточка → анкета → модерация).
// Требует вход (тот же телефон/email+код флоу, что у жителя) — не требует роли/привязки к ОСИ,
// Master живёт вне тенантов (identity).

class MasterApplication {
  final String id;
  final String status; // PENDING | APPROVED | REJECTED | BLOCKED
  MasterApplication({required this.id, required this.status});

  factory MasterApplication.fromJson(Map<String, dynamic> json) =>
      MasterApplication(id: json['id'] as String, status: json['status'] as String);
}

// Полный профиль анкеты (REQ-148, срез 25) — в отличие от MasterApplication (только id+status,
// то, что возвращает register()), несёт всё нужное для статус-экранов и профиля мастера.
class MasterProfile {
  final String id;
  final String status; // PENDING | APPROVED | REJECTED | BLOCKED
  final String city;
  final List<String> categories;
  final String fullName;
  final String? bio;

  MasterProfile({
    required this.id,
    required this.status,
    required this.city,
    required this.categories,
    required this.fullName,
    this.bio,
  });

  factory MasterProfile.fromJson(Map<String, dynamic> json) => MasterProfile(
        id: json['id'] as String,
        status: json['status'] as String,
        city: json['city'] as String,
        categories: ((json['categories'] as List?) ?? const []).cast<String>(),
        fullName: json['fullName'] as String,
        bio: json['bio'] as String?,
      );
}

class MasterRepository {
  MasterRepository._();
  static final MasterRepository instance = MasterRepository._();

  final _api = ApiClient.instance;

  Future<MasterApplication> register({
    required String fullName,
    required String city,
    required List<String> categories,
    String? bio,
  }) async {
    final data = await _api.post('/api/master/register', body: {
      'fullName': fullName,
      'city': city,
      'categories': categories,
      if (bio != null && bio.trim().isNotEmpty) 'bio': bio.trim(),
    }) as Map<String, dynamic>;
    return MasterApplication.fromJson(data['master'] as Map<String, dynamic>);
  }

  // Статус анкеты текущего пользователя (REQ-148) — null, если анкеты нет вовсе. Используется
  // и HomeRouter'ом (решить, куда вести role-less пользователя), и статус-экранами мастера.
  Future<MasterProfile?> me() async {
    final data = await _api.get('/api/master/me') as Map<String, dynamic>;
    final master = data['master'] as Map<String, dynamic>?;
    return master == null ? null : MasterProfile.fromJson(master);
  }
}
