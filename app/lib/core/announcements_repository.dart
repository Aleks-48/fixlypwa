import 'api_client.dart';

// Объявления дома (mobile-app.md §4, срез 22; создание — срез R2, ревизия REQ-121/143:
// председатель получил оперативный шелл в приложении). GET /api/announcements возвращает уже
// готовую проекцию AnnouncementView (fixlypwa/src/lib/comms/service.ts) — без raw reads-массива.
class Announcement {
  final String id;
  final String title;
  final String body;
  final bool isPinned;
  final DateTime createdAt;
  final int readCount;
  final bool readByViewer;

  Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.isPinned,
    required this.createdAt,
    required this.readCount,
    required this.readByViewer,
  });

  factory Announcement.fromJson(Map<String, dynamic> json) => Announcement(
        id: ApiJson.asNonEmptyString(json['id']),
        title: ApiJson.asString(json['title']),
        body: ApiJson.asString(json['body']),
        isPinned: ApiJson.asBool(json['isPinned']),
        createdAt: ApiJson.asDateTime(json['createdAt']),
        readCount: ApiJson.asInt(json['readCount']),
        readByViewer: ApiJson.asBool(json['readByViewer']),
      );
}

class AnnouncementsRepository {
  AnnouncementsRepository._();
  static final AnnouncementsRepository instance = AnnouncementsRepository._();

  final _api = ApiClient.instance;

  Future<List<Announcement>> list({String? buildingId}) async {
    final path = buildingId != null
        ? '/api/announcements?buildingId=${Uri.encodeQueryComponent(buildingId)}'
        : '/api/announcements';
    final data = ApiJson.asMap(await _api.get(path));
    return ApiJson.asMapList(data['announcements'])
        .map(Announcement.fromJson)
        .toList();
  }

  Future<void> markRead(String id) async {
    await _api.post('/api/announcements/${Uri.encodeComponent(id)}/read');
  }

  // Председатель публикует объявление дома (REQ-143). buildingId — сервер не выводит его сам
  // (в отличие от GET, который берёт дом ЖИТЕЛЯ по привязке) — вызывающий обязан передать.
  Future<void> create({
    required String buildingId,
    required String title,
    required String body,
    bool isPinned = false,
  }) async {
    await _api.post('/api/announcements', body: {
      'buildingId': buildingId,
      'title': title,
      'body': body,
      'isPinned': isPinned,
    });
  }

  Future<void> delete(String id) async {
    await _api.delete('/api/announcements?id=${Uri.encodeComponent(id)}');
  }
}
