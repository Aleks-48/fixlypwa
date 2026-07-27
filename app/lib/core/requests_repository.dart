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
        id: json['id'] as String,
        authorUserId: json['authorUserId'] as String,
        text: json['text'] as String,
        audioUrl: json['audioUrl'] as String?,
        imageUrl: json['imageUrl'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
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
        id: json['id'] as String,
        authorUserId: json['authorUserId'] as String,
        category: json['category'] as String,
        text: json['text'] as String,
        photoUrls: ((json['photoUrls'] as List?) ?? const []).cast<String>(),
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        messages: ((json['messages'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(RequestMessage.fromJson)
            .toList(),
      );
}

class RequestsRepository {
  RequestsRepository._();
  static final RequestsRepository instance = RequestsRepository._();

  final _api = ApiClient.instance;

  Future<List<ServiceRequest>> listMine() async {
    final data = await _api.get('/api/requests') as Map<String, dynamic>;
    return (data['requests'] as List)
        .cast<Map<String, dynamic>>()
        .map(ServiceRequest.fromJson)
        .toList();
  }

  // Все заявки ОСИ (REQ-144) — ТОЛЬКО для CHAIRMAN/SUPERADMIN активной ОСИ; сервер сам
  // проверяет роль, для жителя ?scope=building молча возвращает те же «свои».
  Future<List<ServiceRequest>> listBuilding() async {
    final data = await _api.get('/api/requests?scope=building') as Map<String, dynamic>;
    return (data['requests'] as List)
        .cast<Map<String, dynamic>>()
        .map(ServiceRequest.fromJson)
        .toList();
  }

  // Председатель меняет статус (RECEIVED → IN_PROGRESS → RESOLVED).
  Future<void> setStatus(String requestId, String status) async {
    await _api.post('/api/requests/$requestId/status', body: {'status': status});
  }

  Future<ServiceRequest> get(String id) async {
    final data = await _api.get('/api/requests/$id') as Map<String, dynamic>;
    return ServiceRequest.fromJson(data['request'] as Map<String, dynamic>);
  }

  Future<String> create({
    required String category,
    required String text,
    List<String>? photoUrls,
  }) async {
    final data = await _api.post('/api/requests', body: {
      'category': category,
      'text': text,
      if (photoUrls != null && photoUrls.isNotEmpty) 'photoUrls': photoUrls,
    }) as Map<String, dynamic>;
    return (data['request'] as Map<String, dynamic>)['id'] as String;
  }

  Future<void> addMessage(String requestId, String text, {String? imageUrl, String? audioUrl}) async {
    await _api.post('/api/requests/$requestId/messages', body: {
      'text': text,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (audioUrl != null) 'audioUrl': audioUrl,
    });
  }
}
