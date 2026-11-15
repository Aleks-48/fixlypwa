import 'api_client.dart';

// Заявки жителя + тред (mobile-app.md §4, срез 22). Категории/статусы — те же значения enum,
// что у fixlypwa/prisma/schema.prisma RequestCategory/RequestStatus; подписи — см. request_labels.dart.
class RequestMessage {
  final String id;
  final String authorUserId;
  final String text;
  final String? audioUrl;
  final String? imageUrl;
  final DateTime createdAt;

  RequestMessage({
    required this.id,
    required this.authorUserId,
    required this.text,
    this.audioUrl,
    this.imageUrl,
    required this.createdAt,
  });

  factory RequestMessage.fromJson(Map<String, dynamic> json) => RequestMessage(
        id: ApiJson.asNonEmptyString(json['id']),
        authorUserId: ApiJson.asString(json['authorUserId']),
        text: ApiJson.asString(json['text']),
        audioUrl: ApiJson.asNullableString(json['audioUrl']),
        imageUrl: ApiJson.asNullableString(json['imageUrl']),
        createdAt: ApiJson.asDateTime(json['createdAt']),
      );
}

class ServiceRequest {
  final String id;
  final String authorUserId;
  final String category;
  final String text;
  final List<String> photoUrls;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<RequestMessage> messages;

  ServiceRequest({
    required this.id,
    required this.authorUserId,
    required this.category,
    required this.text,
    required this.photoUrls,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.messages,
  });

  factory ServiceRequest.fromJson(Map<String, dynamic> json) => ServiceRequest(
        id: ApiJson.asNonEmptyString(json['id']),
        authorUserId: ApiJson.asString(json['authorUserId']),
        category: ApiJson.asString(json['category']),
        text: ApiJson.asString(json['text']),
        photoUrls: ApiJson.asStringList(json['photoUrls'], allowMissing: true),
        status: ApiJson.asString(json['status']),
        createdAt: ApiJson.asDateTime(json['createdAt']),
        updatedAt: ApiJson.asDateTime(json['updatedAt']),
        messages: ApiJson.asMapList(json['messages'], allowMissing: true)
            .map(RequestMessage.fromJson)
            .toList(),
      );
}

class RequestsRepository {
  RequestsRepository._();
  static final RequestsRepository instance = RequestsRepository._();

  final _api = ApiClient.instance;

  Future<List<ServiceRequest>> listMine() async {
    final data = ApiJson.asMap(await _api.get('/api/requests'));
    return ApiJson.asMapList(data['requests'])
        .map(ServiceRequest.fromJson)
        .toList();
  }

  // Все заявки ОСИ (REQ-144) — ТОЛЬКО для CHAIRMAN/SUPERADMIN активной ОСИ; сервер сам
  // проверяет роль, для жителя ?scope=building молча возвращает те же «свои».
  Future<List<ServiceRequest>> listBuilding() async {
    final data = ApiJson.asMap(await _api.get('/api/requests?scope=building'));
    return ApiJson.asMapList(data['requests'])
        .map(ServiceRequest.fromJson)
        .toList();
  }

  // Председатель меняет статус (RECEIVED → IN_PROGRESS → RESOLVED).
  Future<void> setStatus(String requestId, String status) async {
    await _api.post(
      '/api/requests/${Uri.encodeComponent(requestId)}/status',
      body: {'status': status},
    );
  }

  Future<ServiceRequest> get(String id) async {
    final data = ApiJson.asMap(
      await _api.get('/api/requests/${Uri.encodeComponent(id)}'),
    );
    return ServiceRequest.fromJson(ApiJson.asMap(data['request']));
  }

  Future<String> create({
    required String category,
    required String text,
    List<String>? photoUrls,
  }) async {
    final data = ApiJson.asMap(await _api.post('/api/requests', body: {
      'category': category,
      'text': text,
      if (photoUrls != null && photoUrls.isNotEmpty) 'photoUrls': photoUrls,
    }));
    return ApiJson.asNonEmptyString(ApiJson.asMap(data['request'])['id']);
  }

  Future<void> addMessage(String requestId, String text, {String? imageUrl, String? audioUrl}) async {
    await _api.post(
      '/api/requests/${Uri.encodeComponent(requestId)}/messages',
      body: {
        'text': text,
        if (imageUrl != null) 'imageUrl': imageUrl,
        if (audioUrl != null) 'audioUrl': audioUrl,
      },
    );
  }
}
