import 'api_client.dart';

// =============================================================================
//  МОДЕЛИ
// =============================================================================

/// Ответ при регистрации анкеты мастера (только id+status).
class MasterApplication {
  final String id;
  final String status; // PENDING | APPROVED | REJECTED | BLOCKED
  MasterApplication({required this.id, required this.status});

  factory MasterApplication.fromJson(Map<String, dynamic> json) =>
      MasterApplication(id: json['id'] as String, status: json['status'] as String);
}

/// Профиль мастера (текущего пользователя).
class MasterProfile {
  final String id;
  final String status;
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

/// Публичный профиль мастера (для списка/карты у жителя).
class PublicMaster {
  final String id;
  final String fullName;
  final String shortName;
  final String city;
  final List<String> categories;
  final String? bio;
  final String? phone;
  final double rating;
  final int reviewsCount;
  final double? lat;
  final double? lng;

  PublicMaster({
    required this.id,
    required this.fullName,
    required this.shortName,
    required this.city,
    required this.categories,
    this.bio,
    this.phone,
    required this.rating,
    required this.reviewsCount,
    this.lat,
    this.lng,
  });

  factory PublicMaster.fromJson(Map<String, dynamic> json) => PublicMaster(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        shortName: (json['shortName'] as String?) ?? (json['fullName'] as String),
        city: json['city'] as String,
        categories: ((json['categories'] as List?) ?? const []).cast<String>(),
        bio: json['bio'] as String?,
        phone: json['phone'] as String?,
        rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
        reviewsCount: (json['reviewsCount'] as int?) ?? 0,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}

/// Портфолио-работа мастера.
class MasterPortfolioItem {
  final String id;
  final String title;
  final String? description;
  final String category;
  final List<String> photoUrls;

  MasterPortfolioItem({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    required this.photoUrls,
  });

  factory MasterPortfolioItem.fromJson(Map<String, dynamic> json) =>
      MasterPortfolioItem(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        category: json['category'] as String,
        photoUrls: ((json['photoUrls'] as List?) ?? const []).cast<String>(),
      );
}

/// Отзыв о мастере.
class MasterReviewItem {
  final String id;
  final int rating;
  final String? comment;
  final DateTime createdAt;
  final String? authorPhone;

  MasterReviewItem({
    required this.id,
    required this.rating,
    this.comment,
    required this.createdAt,
    this.authorPhone,
  });

  factory MasterReviewItem.fromJson(Map<String, dynamic> json) => MasterReviewItem(
        id: json['id'] as String,
        rating: json['rating'] as int,
        comment: json['comment'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        authorPhone: json['authorPhone'] as String?,
      );
}

/// Детальный профиль мастера с портфолио и отзывами.
class MasterDetail extends PublicMaster {
  final List<MasterPortfolioItem> portfolio;
  final List<MasterReviewItem> reviews;
  final int offersCount;

  MasterDetail({
    required super.id,
    required super.fullName,
    required super.shortName,
    required super.city,
    required super.categories,
    super.bio,
    super.phone,
    required super.rating,
    required super.reviewsCount,
    required this.portfolio,
    required this.reviews,
    this.offersCount = 0,
  });

  factory MasterDetail.fromJson(Map<String, dynamic> json) => MasterDetail(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        shortName: (json['shortName'] as String?) ?? (json['fullName'] as String),
        city: json['city'] as String,
        categories: ((json['categories'] as List?) ?? const []).cast<String>(),
        bio: json['bio'] as String?,
        phone: json['phone'] as String?,
        rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
        reviewsCount: (json['reviewsCount'] as int?) ?? 0,
        offersCount: (json['offersCount'] as int?) ?? 0,
        portfolio: ((json['portfolio'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(MasterPortfolioItem.fromJson)
            .toList(),
        reviews: ((json['reviews'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(MasterReviewItem.fromJson)
            .toList(),
      );
}

// =============================================================================
//  РЕПОЗИТОРИЙ
// =============================================================================

class MasterRepository {
  MasterRepository._();
  static final MasterRepository instance = MasterRepository._();

  final _api = ApiClient.instance;

  /// Регистрация анкеты мастера.
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

  /// Статус анкеты текущего мастера — null если анкеты нет.
  Future<MasterProfile?> me() async {
    final data = await _api.get('/api/master/me') as Map<String, dynamic>;
    final master = data['master'] as Map<String, dynamic>?;
    return master == null ? null : MasterProfile.fromJson(master);
  }

  /// Обновление анкетных данных мастера в базе (био, город, категории)
  Future<MasterProfile> updateMasterProfile({
    String? city,
    String? bio,
    List<String>? categories,
  }) async {
    final data = await _api.patch('/api/master/me', body: {
      if (city != null) 'city': city,
      if (bio != null) 'bio': bio,
      if (categories != null) 'categories': categories,
    }) as Map<String, dynamic>;
    return MasterProfile.fromJson(data['master'] as Map<String, dynamic>);
  }

  /// Детальная информация собственного профиля мастера (с реальной статистикой, портфолио и отзывами)
  Future<MasterDetail?> myDetails() async {
    final data = await _api.get('/api/master/me/details') as Map<String, dynamic>;
    final master = data['master'] as Map<String, dynamic>?;
    return master == null ? null : MasterDetail.fromJson(master);
  }

  /// Добавление работы в собственное портфолио
  Future<MasterPortfolioItem> addPortfolioItem({
    required String title,
    String? description,
    required String category,
  }) async {
    final data = await _api.post('/api/master/me/details', body: {
      'title': title,
      if (description != null && description.isNotEmpty) 'description': description,
      'category': category,
    }) as Map<String, dynamic>;
    return MasterPortfolioItem.fromJson(data['item'] as Map<String, dynamic>);
  }

  /// Публичный список одобренных мастеров — для жителей.
  Future<List<PublicMaster>> listPublicMasters({
    String? category,
    String city = 'Кокшетау',
  }) async {
    var path = '/api/public/masters?city=${Uri.encodeComponent(city)}';
    if (category != null && category.isNotEmpty) {
      path += '&category=${Uri.encodeComponent(category)}';
    }
    final data = await _api.get(path) as Map<String, dynamic>;
    return ((data['masters'] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(PublicMaster.fromJson)
        .toList();
  }

  /// Детальный профиль мастера с портфолио и отзывами.
  Future<MasterDetail> getMasterById(String masterId) async {
    final data = await _api.get('/api/public/masters/$masterId') as Map<String, dynamic>;
    return MasterDetail.fromJson(data['master'] as Map<String, dynamic>);
  }
}

