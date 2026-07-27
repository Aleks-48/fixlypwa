import 'api_client.dart';

// Инфо-раздел дома (mobile-app.md §4, срез 22) — read-only на мобильном (наполняет председатель).
class InfoItem {
  final String id;
  final String type;
  final String title;
  final String content;

  InfoItem({required this.id, required this.type, required this.title, required this.content});

  factory InfoItem.fromJson(Map<String, dynamic> json) => InfoItem(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        content: json['content'] as String,
      );
}

const Map<String, String> infoTypeLabels = {
  'TRASH_SCHEDULE': 'Вывоз мусора',
  'EMERGENCY_CONTACTS': 'Аварийные службы',
  'PAYMENT_DETAILS': 'Реквизиты для оплаты',
  'CHAIRMAN_CONTACTS': 'Контакты председателя',
  'OTHER': 'Другое',
};

class InfoRepository {
  InfoRepository._();
  static final InfoRepository instance = InfoRepository._();

  final _api = ApiClient.instance;

  Future<List<InfoItem>> list() async {
    final data = await _api.get('/api/info') as Map<String, dynamic>;
    return (data['items'] as List).cast<Map<String, dynamic>>().map(InfoItem.fromJson).toList();
  }
}
