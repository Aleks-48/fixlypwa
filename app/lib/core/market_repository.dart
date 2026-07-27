import 'api_client.dart';

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

  factory MarketListing.fromJson(Map<String, dynamic> json) => MarketListing(
        id: json['id'] as String,
        category: json['category'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        photoUrls: ((json['photoUrls'] as List?) ?? const []).cast<String>(),
        buildingLabel: json['buildingLabel'] as String,
        status: json['status'] as String,
        publishedAt: DateTime.parse(json['publishedAt'] as String),
      );
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

  factory MarketOfferListing.fromJson(Map<String, dynamic> json) => MarketOfferListing(
        id: json['id'] as String,
        category: json['category'] as String,
        title: json['title'] as String,
        buildingLabel: json['buildingLabel'] as String,
        status: json['status'] as String,
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

  factory MarketOffer.fromJson(Map<String, dynamic> json) => MarketOffer(
        id: json['id'] as String,
        listingId: json['listingId'] as String,
        message: json['message'] as String,
        price: json['price'] as String?,
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        listing: json['listing'] != null
            ? MarketOfferListing.fromJson(json['listing'] as Map<String, dynamic>)
            : null,
      );
}

class MarketRepository {
  MarketRepository._();
  static final MarketRepository instance = MarketRepository._();

  final _api = ApiClient.instance;

  Future<List<MarketListing>> listListings() async {
    final data = await _api.get('/api/master/listings') as Map<String, dynamic>;
    return (data['listings'] as List)
        .cast<Map<String, dynamic>>()
        .map(MarketListing.fromJson)
        .toList();
  }

  Future<List<MarketOffer>> listMyOffers() async {
    final data = await _api.get('/api/master/offers') as Map<String, dynamic>;
    return (data['offers'] as List)
        .cast<Map<String, dynamic>>()
        .map(MarketOffer.fromJson)
        .toList();
  }

  Future<void> respond(String listingId, {required String message, double? price}) async {
    await _api.post('/api/master/listings/$listingId/offers', body: {
      'message': message,
      if (price != null) 'price': price,
    });
  }

  Future<void> withdraw(String offerId) async {
    await _api.post('/api/master/offers/$offerId/withdraw');
  }
}
