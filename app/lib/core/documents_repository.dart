import 'api_client.dart';

class OsiDocument {
  final String id;
  final String title;
  final String? description;
  final String category;
  final String fileUrl;
  final int? fileSize;
  final String? fileType;
  final bool isPublic;
  final DateTime createdAt;

  OsiDocument({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    required this.fileUrl,
    this.fileSize,
    this.fileType,
    required this.isPublic,
    required this.createdAt,
  });

  factory OsiDocument.fromJson(Map<String, dynamic> json) => OsiDocument(
        id: ApiJson.asNonEmptyString(json['id']),
        title: ApiJson.asString(json['title']),
        description: ApiJson.asNullableString(json['description']),
        category: ApiJson.asString(json['category']),
        fileUrl: ApiJson.asNonEmptyString(json['fileUrl']),
        fileSize: ApiJson.asNullableInt(json['fileSize']),
        fileType: ApiJson.asNullableString(json['fileType']),
        isPublic: ApiJson.asBool(json['isPublic'], defaultValue: true),
        createdAt: ApiJson.asDateTime(json['createdAt']),
      );

  String get formattedDate {
    final dt = createdAt.toLocal();
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final year = dt.year;
    final hours = dt.hour.toString().padLeft(2, '0');
    final minutes = dt.minute.toString().padLeft(2, '0');
    return '$day.$month.$year в $hours:$minutes';
  }

  String get formattedSize {
    if (fileSize == null || fileSize == 0) return 'PDF';
    final kb = fileSize! / 1024;
    if (kb < 1024) return '${kb.toStringAsFixed(1)} КБ';
    final mb = kb / 1024;
    return '${mb.toStringAsFixed(1)} МБ';
  }
}

class DocumentsRepository {
  DocumentsRepository._();
  static final DocumentsRepository instance = DocumentsRepository._();

  final _api = ApiClient.instance;

  Future<List<OsiDocument>> fetchDocuments() async {
    final data = ApiJson.asMap(await _api.get('/api/documents'));
    return ApiJson.asMapList(data['documents'])
        .map(OsiDocument.fromJson)
        .toList();
  }
}
