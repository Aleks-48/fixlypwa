import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/core/protected_files.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/documents_repository.dart';
import 'package:fixly_app/core/app_localizations.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  String _selectedCategory = 'ALL';
  String _searchQuery = '';

  List<OsiDocument> _documents = [];
  bool _loading = true;
  String? _error;

  static const Map<String, String> _categoryLabels = {
    'ALL': 'Все документы',
    'PROTOCOL': 'Протоколы собраний',
    'CHARTER': 'Устав и учредительные',
    'ESTIMATE': 'Сметы и отчёты',
    'CONTRACT': 'Договоры',
    'OTHER': 'Прочее',
  };

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final docs = await DocumentsRepository.instance.fetchDocuments();
      if (mounted) {
        setState(() {
          _documents = docs;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _openDocument(OsiDocument doc) async {
    try {
      await openProtectedFile(doc.fileUrl);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка открытия документа: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    final filteredDocs = _documents.where((doc) {
      final matchesCategory = _selectedCategory == 'ALL' || doc.category == _selectedCategory;
      final query = _searchQuery.toLowerCase().trim();
      final matchesSearch = query.isEmpty ||
          doc.title.toLowerCase().contains(query) ||
          (doc.description?.toLowerCase().contains(query) ?? false);
      return matchesCategory && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text(
          AppLocalizations.tr('nav_documents'),
          style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.bold),
        ),
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.refreshCw, color: c.textPrimary, size: 20),
            onPressed: _loadDocuments,
            tooltip: 'Обновить',
          ),
        ],
      ),
      body: Column(
        children: [
          // Поиск
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimens.spaceMd,
              vertical: AppDimens.spaceXs,
            ),
            child: TextField(
              style: TextStyle(color: c.textPrimary),
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Поиск документа...',
                hintStyle: TextStyle(color: c.textTertiary),
                prefixIcon: Icon(LucideIcons.search, color: c.textTertiary, size: 18),
                filled: true,
                fillColor: c.card,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  borderSide: BorderSide(color: c.cardBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  borderSide: BorderSide(color: c.cardBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  borderSide: BorderSide(color: c.primary),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
              ),
            ),
          ),

          // Фильтр по категориям
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimens.spaceMd,
              vertical: 6,
            ),
            child: Row(
              children: _categoryLabels.entries.map((entry) {
                final selected = _selectedCategory == entry.key;
                return Padding(
                  padding: const EdgeInsets.only(right: AppDimens.spaceXs),
                  child: ChoiceChip(
                    label: Text(entry.value),
                    selected: selected,
                    onSelected: (val) {
                      if (val) setState(() => _selectedCategory = entry.key);
                    },
                    selectedColor: c.primary.withValues(alpha: 0.15),
                    backgroundColor: c.card,
                    labelStyle: TextStyle(
                      color: selected ? c.primary : c.textSecondary,
                      fontWeight: selected ? AppTypography.semibold : AppTypography.regular,
                      fontSize: 13,
                    ),
                    side: BorderSide(color: selected ? c.primary : c.cardBorder),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppDimens.spaceXs),

          // Список файлов
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _buildError(c)
                    : filteredDocs.isEmpty
                        ? _buildEmpty(c)
                        : RefreshIndicator(
                            onRefresh: _loadDocuments,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(AppDimens.spaceMd),
                              itemCount: filteredDocs.length,
                              itemBuilder: (context, index) {
                                final doc = filteredDocs[index];
                                final catLabel = _categoryLabels[doc.category] ?? doc.category;
                                return Container(
                                  margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
                                  padding: const EdgeInsets.all(AppDimens.spaceMd),
                                  decoration: BoxDecoration(
                                    color: c.card,
                                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                    border: Border.all(color: c.cardBorder),
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: c.primary.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                                        ),
                                        child: Icon(
                                          doc.category == 'PROTOCOL'
                                              ? LucideIcons.shieldCheck
                                              : LucideIcons.fileText,
                                          color: c.primary,
                                          size: 22,
                                        ),
                                      ),
                                      const SizedBox(width: AppDimens.spaceSm),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              doc.title,
                                              style: TextStyle(
                                                color: c.textPrimary,
                                                fontWeight: AppTypography.bold,
                                                fontSize: 14,
                                              ),
                                            ),
                                            if (doc.description != null && doc.description!.isNotEmpty) ...[
                                              const SizedBox(height: 3),
                                              Text(
                                                doc.description!,
                                                style: TextStyle(
                                                  color: c.textSecondary,
                                                  fontSize: 12,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                            const SizedBox(height: 6),
                                            Wrap(
                                              crossAxisAlignment: WrapCrossAlignment.center,
                                              spacing: 6,
                                              children: [
                                                Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(LucideIcons.calendar, size: 12, color: c.textTertiary),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      doc.formattedDate,
                                                      style: TextStyle(
                                                        color: c.textTertiary,
                                                        fontSize: 11,
                                                        fontWeight: AppTypography.medium,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                Container(
                                                  width: 3,
                                                  height: 3,
                                                  decoration: BoxDecoration(
                                                    color: c.textTertiary,
                                                    shape: BoxShape.circle,
                                                  ),
                                                ),
                                                Text(
                                                  catLabel,
                                                  style: TextStyle(
                                                    color: c.primary,
                                                    fontSize: 11,
                                                    fontWeight: AppTypography.semibold,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        icon: Icon(LucideIcons.externalLink, color: c.primary, size: 20),
                                        onPressed: () => _openDocument(doc),
                                        tooltip: 'Открыть документ',
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildError(AppColors c) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.alertCircle, color: c.textTertiary, size: 48),
          const SizedBox(height: AppDimens.spaceMd),
          Text('Ошибка загрузки документов', style: TextStyle(color: c.textSecondary)),
          const SizedBox(height: AppDimens.spaceSm),
          ElevatedButton.icon(
            onPressed: _loadDocuments,
            icon: const Icon(LucideIcons.refreshCw, size: 16),
            label: const Text('Повторить'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty(AppColors c) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.folderOpen, color: c.textTertiary, size: 56),
            const SizedBox(height: AppDimens.spaceMd),
            Text(
              'Председатель пока не добавил документы',
              style: TextStyle(
                color: c.textPrimary,
                fontWeight: AppTypography.bold,
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              'Официальные уставные документы, протоколы собраний и сметы появятся здесь сразу после публикации.',
              style: TextStyle(color: c.textTertiary, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
