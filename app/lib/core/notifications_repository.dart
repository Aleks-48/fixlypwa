import 'api_client.dart';

// Центр уведомлений (REQ-100/101, срез 7 на сайте) + FCM на мобильном (ADR-0012 §5, срез 20).
class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final String? entityType;
  final String? entityId;
  final DateTime? readAt;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.entityType,
    this.entityId,
    this.readAt,
    required this.createdAt,
  });

  bool get isRead => readAt != null;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: ApiJson.asNonEmptyString(json['id']),
        type: ApiJson.asString(json['type']),
        title: ApiJson.asString(json['title']),
        body: ApiJson.asString(json['body']),
        entityType: ApiJson.asNullableString(json['entityType']),
        entityId: ApiJson.asNullableString(json['entityId']),
        readAt: ApiJson.asNullableDateTime(json['readAt']),
        createdAt: ApiJson.asDateTime(json['createdAt']),
      );
}

class NotificationsPage {
  final List<AppNotification> notifications;
  final int unread;
  NotificationsPage({required this.notifications, required this.unread});
}

class NotificationsRepository {
  NotificationsRepository._();
  static final NotificationsRepository instance = NotificationsRepository._();

  final _api = ApiClient.instance;

  Future<NotificationsPage> list() async {
    final data = ApiJson.asMap(await _api.get('/api/notifications'));
    return NotificationsPage(
      notifications: ApiJson.asMapList(data['notifications'])
          .map(AppNotification.fromJson)
          .toList(),
      unread: ApiJson.asInt(data['unread']),
    );
  }

  // id — отметить одно; null — отметить все непрочитанные.
  Future<void> markRead({String? id}) async {
    await _api.post('/api/notifications/read', body: id != null ? {'id': id} : {});
  }

  Future<void> registerFcmToken(String token) async {
    await _api.post('/api/push/fcm-token', body: {'token': token});
  }
}
