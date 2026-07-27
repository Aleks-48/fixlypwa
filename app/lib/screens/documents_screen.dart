import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

class AppDocument {
  final String id;
  final String title;
  final String category;
  final String size;
  final String date;

  AppDocument({
    required this.id,
    required this.title,
    required this.category,
    required this.size,
    required this.date,
  });
}

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  String _selectedCategory = 'Все';
  String _searchQuery = '';

  final List<String> _categories = [
    'Все',
    'Устав и учредительные',
    'Протоколы собраний',
    'Сметы и отчёты',
    'Договоры',
  ];

  final List<AppDocument> _documents = [
    AppDocument(
      id: '1',
      title: 'Устав ОСИ «ЖК Комфорт»',
      category: 'Устав и учредительные',
      size: '2.4 МБ',
      date: '12.01.2025',
    ),
    AppDocument(
      id: '2',
      title: 'Протокол общего собрания №4',
      category: 'Протоколы собраний',
      size: '1.1 МБ',
      date: '10.02.2026',
    ),
    AppDocument(
      id: '3',
      title: 'Годовой финансовый отчёт за 2025 год',
      category: 'Сметы и отчёты',
      size: '4.8 МБ',
      date: '15.01.2026',
    ),
    AppDocument(
      id: '4',
      title: 'Договор с обслуживающей компанией',
      category: 'Договоры',
      size: '850 КБ',
      date: '01.03.2026',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    final filteredDocs = _documents.where((doc) {
      final matchesCategory = _selectedCategory == 'Все' || doc.category == _selectedCategory;
      final matchesSearch = doc.title.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Библиотека документов', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: Column(
        children: [
          // Поиск
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimens.spaceMd,
              vertical: AppDimens.spaceSm,
            ),
            child: TextField(
              style: TextStyle(color: c.textPrimary),
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Поиск по названию...',
                hintStyle: TextStyle(color: c.textTertiary),
                prefixIcon: Icon(LucideIcons.search, color: c.textTertiary, size: 20),
                filled: true,
                fillColor: c.surfaceVariant,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          // Фильтр по категориям
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimens.spaceMd,
              vertical: AppDimens.spaceXs,
            ),
            child: Row(
              children: _categories.map((cat) {
                final selected = _selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: AppDimens.spaceXs),
                  child: ChoiceChip(
                    label: Text(cat),
                    selected: selected,
                    onSelected: (val) {
                      if (val) setState(() => _selectedCategory = cat);
                    },
                    selectedColor: c.primary.withOpacity(0.15),
                    backgroundColor: c.card,
                    labelStyle: TextStyle(
                      color: selected ? c.primary : c.textSecondary,
                      fontWeight: selected ? AppTypography.semibold : AppTypography.regular,
                    ),
                    side: BorderSide(color: selected ? c.primary : c.cardBorder),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppDimens.spaceSm),

          // Список файлов
          Expanded(
            child: filteredDocs.isEmpty
                ? Center(
                    child: Text('Документы не найдены', style: TextStyle(color: c.textTertiary)),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(AppDimens.spaceMd),
                    itemCount: filteredDocs.length,
                    itemBuilder: (context, index) {
                      final doc = filteredDocs[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        decoration: BoxDecoration(
                          color: c.card,
                          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                          border: Border.all(color: c.cardBorder),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: c.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                              ),
                              child: Icon(LucideIcons.fileText, color: c.primary, size: 24),
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
                                      fontWeight: AppTypography.semibold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${doc.date} • ${doc.size}',
                                    style: TextStyle(
                                      color: c.textTertiary,
                                      fontSize: AppTypography.caption,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: Icon(LucideIcons.download, color: c.primary, size: 20),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Загрузка "${doc.title}" начата')),
                                );
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}