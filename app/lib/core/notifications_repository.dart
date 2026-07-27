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
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        entityType: json['entityType'] as String?,
        entityId: json['entityId'] as String?,
        readAt: json['readAt'] != null ? DateTime.parse(json['readAt'] as String) : null,
        createdAt: DateTime.parse(json['createdAt'] as String),
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
    final data = await _api.get('/api/notifications') as Map<String, dynamic>;
    return NotificationsPage(
      notifications: (data['notifications'] as List)
          .cast<Map<String, dynamic>>()
          .map(AppNotification.fromJson)
          .toList(),
      unread: data['unread'] as int,
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
