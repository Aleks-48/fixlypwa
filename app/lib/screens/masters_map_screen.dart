import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

class Master {
  final String id;
  final String name;
  final String category;
  final double rating;
  final int completedJobs;
  final String avatarUrl;
  final List<String> portfolioImages;

  Master({
    required this.id,
    required this.name,
    required this.category,
    required this.rating,
    required this.completedJobs,
    required this.avatarUrl,
    required this.portfolioImages,
  });
}

class MastersMapScreen extends StatefulWidget {
  const MastersMapScreen({super.key});

  @override
  State<MastersMapScreen> createState() => _MastersMapScreenState();
}

class _MastersMapScreenState extends State<MastersMapScreen> {
  bool _isMapView = false;
  String _selectedCategory = 'Все';

  final List<String> _categories = [
    'Все',
    'Сантехника',
    'Электрика',
    'Отделка',
    'Двери и замки',
  ];

  final List<Master> _masters = [
    Master(
      id: '1',
      name: 'Алексей Смирнов',
      category: 'Сантехника',
      rating: 4.9,
      completedJobs: 42,
      avatarUrl: '',
      portfolioImages: [],
    ),
    Master(
      id: '2',
      name: 'Иван Петров',
      category: 'Электрика',
      rating: 4.8,
      completedJobs: 29,
      avatarUrl: '',
      portfolioImages: [],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Мастера и портфолио', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          IconButton(
            icon: Icon(_isMapView ? LucideIcons.list : LucideIcons.map, color: c.textPrimary),
            onPressed: () => setState(() => _isMapView = !_isMapView),
            tooltip: _isMapView ? 'Списком' : 'На карте',
          ),
        ],
      ),
      body: Column(
        children: [
          // Категории мастеров
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimens.spaceMd,
              vertical: AppDimens.spaceSm,
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
          Expanded(
            child: _isMapView ? _buildMapView(c) : _buildListView(c),
          ),
        ],
      ),
    );
  }

  Widget _buildListView(AppColors c) {
    final filtered = _selectedCategory == 'Все'
        ? _masters
        : _masters.where((m) => m.category == _selectedCategory).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Text('Мастера не найдены', style: TextStyle(color: c.textTertiary)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final master = filtered[index];
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
              CircleAvatar(
                radius: 24,
                backgroundColor: c.primary.withOpacity(0.1),
                child: Icon(LucideIcons.user, color: c.primary),
              ),
              const SizedBox(width: AppDimens.spaceSm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      master.name,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: AppTypography.semibold,
                      ),
                    ),
                    Text(
                      master.category,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: AppTypography.caption,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.star, size: 14, color: Colors.amber[700]),
                        const SizedBox(width: 4),
                        Text(
                          '${master.rating}',
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: AppTypography.caption,
                            fontWeight: AppTypography.bold,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '(${master.completedJobs} работ)',
                          style: TextStyle(
                            color: c.textTertiary,
                            fontSize: AppTypography.caption,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: c.textTertiary),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMapView(AppColors c) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.mapPin, size: 48, color: c.primary),
          const SizedBox(height: AppDimens.spaceSm),
          Text(
            'Интерактивная карта мастеров',
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: AppTypography.semibold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Отображение мастеров рядом с вашим домом',
            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
          ),
        ],
      ),
    );
  }
}