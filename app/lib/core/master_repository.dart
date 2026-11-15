import 'api_client.dart';

String _asString(dynamic value, [String fallback = '']) =>
    value?.toString() ?? fallback;

List<String> _asStringList(dynamic value) {
  if (value is! List) return const [];
  return value.where((e) => e != null).map((e) => e.toString()).toList();
}

double? _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

int? _asInt(dynamic value) {
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

Map<String, dynamic> _requireMap(dynamic data, [String? nestedKey]) {
  if (data is! Map) {
    throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
  }
  if (nestedKey == null) return Map<String, dynamic>.from(data);
  final nested = data[nestedKey];
  if (nested is! Map) {
    throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
  }
  return Map<String, dynamic>.from(nested);
}

// =============================================================================
//  МОДЕЛИ
// =============================================================================

/// Ответ при регистрации анкеты мастера (только id+status).
class MasterApplication {
  final String id;
  final String status; // PENDING | APPROVED | REJECTED | BLOCKED
  MasterApplication({required this.id, required this.status});

  factory MasterApplication.fromJson(Map<String, dynamic> json) =>
      MasterApplication(
        id: _asString(json['id']),
        status: _asString(json['status'], 'PENDING'),
      );
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
        id: _asString(json['id']),
        status: _asString(json['status'], 'PENDING'),
        city: _asString(json['city']),
        categories: _asStringList(json['categories']),
        fullName: _asString(json['fullName']),
        bio: json['bio']?.toString(),
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

  factory PublicMaster.fromJson(Map<String, dynamic> json) {
    final fullName = _asString(json['fullName']);
    return PublicMaster(
      id: _asString(json['id']),
      fullName: fullName,
      shortName: json['shortName']?.toString() ?? fullName,
      city: _asString(json['city']),
      categories: _asStringList(json['categories']),
      bio: json['bio']?.toString(),
      phone: json['phone']?.toString(),
      rating: _asDouble(json['rating']) ?? 0.0,
      reviewsCount: _asInt(json['reviewsCount']) ?? 0,
      lat: _asDouble(json['lat']),
      lng: _asDouble(json['lng']),
    );
  }
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
        id: _asString(json['id']),
        title: _asString(json['title']),
        description: json['description']?.toString(),
        category: _asString(json['category'], 'OTHER'),
        photoUrls: _asStringList(json['photoUrls']),
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

  factory MasterReviewItem.fromJson(Map<String, dynamic> json) =>
      MasterReviewItem(
        id: _asString(json['id']),
        rating: _asInt(json['rating']) ?? 0,
        comment: json['comment']?.toString(),
        createdAt: DateTime.tryParse(_asString(json['createdAt'])) ??
            DateTime.fromMillisecondsSinceEpoch(0),
        authorPhone: json['authorPhone']?.toString(),
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
    super.lat,
    super.lng,
    required this.portfolio,
    required this.reviews,
    this.offersCount = 0,
  });

  factory MasterDetail.fromJson(Map<String, dynamic> json) {
    final fullName = _asString(json['fullName']);
    final rawPortfolio = json['portfolio'];
    final rawReviews = json['reviews'];
    return MasterDetail(
      id: _asString(json['id']),
      fullName: fullName,
      shortName: json['shortName']?.toString() ?? fullName,
      city: _asString(json['city']),
      categories: _asStringList(json['categories']),
      bio: json['bio']?.toString(),
      phone: json['phone']?.toString(),
      rating: _asDouble(json['rating']) ?? 0.0,
      reviewsCount: _asInt(json['reviewsCount']) ?? 0,
      lat: _asDouble(json['lat']),
      lng: _asDouble(json['lng']),
      offersCount: _asInt(json['offersCount']) ?? 0,
      portfolio: rawPortfolio is List
          ? rawPortfolio
              .whereType<Map>()
              .map((e) => MasterPortfolioItem.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      reviews: rawReviews is List
          ? rawReviews
              .whereType<Map>()
              .map((e) => MasterReviewItem.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
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
    });
    return MasterApplication.fromJson(_requireMap(data, 'master'));
  }

  /// Статус анкеты текущего мастера — null если анкеты нет.
  Future<MasterProfile?> me() async {
    final data = _requireMap(await _api.get('/api/master/me'));
    final master = data['master'];
    if (master == null) return null;
    if (master is! Map) {
      throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
    }
    return MasterProfile.fromJson(Map<String, dynamic>.from(master));
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
    });
    return MasterProfile.fromJson(_requireMap(data, 'master'));
  }

  /// Детальная информация собственного профиля мастера (с реальной статистикой, портфолио и отзывами)
  Future<MasterDetail?> myDetails() async {
    final data = _requireMap(await _api.get('/api/master/me/details'));
    final master = data['master'];
    if (master == null) return null;
    if (master is! Map) {
      throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
    }
    return MasterDetail.fromJson(Map<String, dynamic>.from(master));
  }

  /// Добавление работы в собственное портфолио
  Future<MasterPortfolioItem> addPortfolioItem({
    required String title,
    String? description,
    required String category,
    List<String> photoUrls = const [],
  }) async {
    final data = await _api.post('/api/master/me/details', body: {
      'title': title,
      'photoUrls': photoUrls,
      if (description != null && description.isNotEmpty) 'description': description,
      'category': category,
    });
    return MasterPortfolioItem.fromJson(_requireMap(data, 'item'));
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
    final data = _requireMap(await _api.get(path));
    final raw = data['masters'];
    if (raw is! List) {
      throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
    }
    final masters = <PublicMaster>[];
    for (final item in raw) {
      if (item is! Map) {
        throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
      }
      masters.add(PublicMaster.fromJson(Map<String, dynamic>.from(item)));
    }
    return masters;
  }

  /// Детальный профиль мастера с портфолио и отзывами.
  Future<MasterDetail> getMasterById(String masterId) async {
    final data = await _api.get('/api/public/masters/${Uri.encodeComponent(masterId)}');
    return MasterDetail.fromJson(_requireMap(data, 'master'));
  }
}

