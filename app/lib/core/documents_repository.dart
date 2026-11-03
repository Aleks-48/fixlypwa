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
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        category: json['category'] as String,
        fileUrl: json['fileUrl'] as String,
        fileSize: json['fileSize'] as int?,
        fileType: json['fileType'] as String?,
        isPublic: json['isPublic'] as bool? ?? true,
        createdAt: DateTime.parse(json['createdAt'] as String),
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
    final data = await _api.get('/api/documents') as Map<String, dynamic>;
    return ((data['documents'] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(OsiDocument.fromJson)
        .toList();
  }
}
