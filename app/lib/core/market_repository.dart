import 'api_client.dart';

String _asString(dynamic value, [String fallback = '']) =>
    value?.toString() ?? fallback;

List<String> _asStringList(dynamic value) {
  if (value is! List) return const [];
  return value.where((e) => e != null).map((e) => e.toString()).toList();
}

// Витрина заказов и отклики мастера (ADR-0009, marketplace.md §6, REQ-149/150, срез 25).
// Публикует заявку мастерам и принимает отклики председатель — на сайте (REQ-121: управление
// заявкой остаётся в вебе); мобильный клиент даёт только сторону мастера — ленту заказов и
// свои отклики, зеркалит web/src/app/master/page.tsx.

const Map<String, String> marketOfferStatusLabels = {
  'OFFERED': 'Отклик отправлен',
  'ACCEPTED': 'Отклик принят',
  'DECLINED': 'Выбрали другого мастера',
  'WITHDRAWN': 'Отозван',
};

class MarketListing {
  final String id;
  final String category;
  final String title;
  final String description;
  final List<String> photoUrls;
  final String buildingLabel;
  final String status; // PUBLISHED | TAKEN | CLOSED
  final DateTime publishedAt;

  MarketListing({
    required this.id,
    required this.category,
    required this.title,
    required this.description,
    required this.photoUrls,
    required this.buildingLabel,
    required this.status,
    required this.publishedAt,
  });

  factory MarketListing.fromJson(Map<String, dynamic> json) {
    final id = _asString(json['id']);
    if (id.isEmpty) {
      throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
    }
    return MarketListing(
      id: id,
      category: _asString(json['category'], 'OTHER'),
      title: _asString(json['title']),
      description: _asString(json['description']),
      photoUrls: _asStringList(json['photoUrls']),
      buildingLabel: _asString(json['buildingLabel']),
      status: _asString(json['status'], 'PUBLISHED'),
      publishedAt: DateTime.tryParse(_asString(json['publishedAt'])) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

// Урезанная проекция листинга внутри MarketOffer.listing — сервер (REQ-150) отдаёт только то
// же самое подмножество полей, что и в фиде (без osiId/requestId, ADR-0009).
class MarketOfferListing {
  final String id;
  final String category;
  final String title;
  final String buildingLabel;
  final String status;

  MarketOfferListing({
    required this.id,
    required this.category,
    required this.title,
    required this.buildingLabel,
    required this.status,
  });

  factory MarketOfferListing.fromJson(Map<String, dynamic> json) =>
      MarketOfferListing(
        id: _asString(json['id']),
        category: _asString(json['category'], 'OTHER'),
        title: _asString(json['title']),
        buildingLabel: _asString(json['buildingLabel']),
        status: _asString(json['status']),
      );
}

class MarketOffer {
  final String id;
  final String listingId;
  final String message;
  final String? price;
  final String status; // OFFERED | ACCEPTED | DECLINED | WITHDRAWN
  final DateTime createdAt;
  final MarketOfferListing? listing;

  MarketOffer({
    required this.id,
    required this.listingId,
    required this.message,
    this.price,
    required this.status,
    required this.createdAt,
    this.listing,
  });

  factory MarketOffer.fromJson(Map<String, dynamic> json) {
    final id = _asString(json['id']);
    final listingId = _asString(json['listingId']);
    if (id.isEmpty || listingId.isEmpty) {
      throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
    }
    final rawListing = json['listing'];
    return MarketOffer(
      id: id,
      listingId: listingId,
      message: _asString(json['message']),
      price: json['price']?.toString(),
      status: _asString(json['status'], 'OFFERED'),
      createdAt: DateTime.tryParse(_asString(json['createdAt'])) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      listing: rawListing is Map
          ? MarketOfferListing.fromJson(Map<String, dynamic>.from(rawListing))
          : null,
    );
  }
}

class MarketRepository {
  MarketRepository._();
  static final MarketRepository instance = MarketRepository._();

  final _api = ApiClient.instance;

  Future<List<MarketListing>> listListings() async {
    final data = await _api.get('/api/master/listings');
    if (data is! Map || data['listings'] is! List) {
      throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
    }
    final out = <MarketListing>[];
    for (final item in data['listings'] as List) {
      if (item is! Map) {
        throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
      }
      out.add(MarketListing.fromJson(Map<String, dynamic>.from(item)));
    }
    return out;
  }

  Future<List<MarketOffer>> listMyOffers() async {
    final data = await _api.get('/api/master/offers');
    if (data is! Map || data['offers'] is! List) {
      throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
    }
    final out = <MarketOffer>[];
    for (final item in data['offers'] as List) {
      if (item is! Map) {
        throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервера', 500);
      }
      out.add(MarketOffer.fromJson(Map<String, dynamic>.from(item)));
    }
    return out;
  }

  Future<void> respond(String listingId, {required String message, double? price}) async {
    await _api.post('/api/master/listings/${Uri.encodeComponent(listingId)}/offers', body: {
      'message': message,
      if (price != null) 'price': price,
    });
  }

  Future<void> withdraw(String offerId) async {
    await _api.post('/api/master/offers/${Uri.encodeComponent(offerId)}/withdraw');
  }
}
