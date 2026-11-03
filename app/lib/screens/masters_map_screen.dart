import 'dart:math';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/screens/master_profile_screen.dart';

// =============================================================================
//  Экран мастеров — список + карта
// =============================================================================

class MastersMapScreen extends StatefulWidget {
  const MastersMapScreen({super.key});

  @override
  State<MastersMapScreen> createState() => _MastersMapScreenState();
}

class _MastersMapScreenState extends State<MastersMapScreen>
    with SingleTickerProviderStateMixin {
  bool _isMapView = false;
  String _selectedCategory = 'ALL';
  PublicMaster? _selectedMaster;
  String _searchQuery = '';

  List<PublicMaster> _masters = [];
  bool _loading = true;
  String? _error;

  late final TextEditingController _searchCtrl;

  static const _categoryKeys = [
    'ALL',
    'PLUMBING',
    'ELECTRICITY',
    'CLEANING',
    'ELEVATOR',
    'OTHER',
  ];

  String _categoryLabel(String key) {
    if (key == 'ALL') return AppLocalizations.tr('filter_all');
    return requestCategoryLabels[key] ?? key;
  }

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final cat = _selectedCategory == 'ALL' ? null : _selectedCategory;
      final result = await MasterRepository.instance.listPublicMasters(category: cat);
      if (mounted) {
        setState(() {
          _masters = result;
          _loading = false;
          _selectedMaster = null;
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

  List<PublicMaster> get _filtered {
    final query = _searchQuery.trim().toLowerCase();
    return _masters.where((m) {
      final matchSearch = query.isEmpty ||
          m.fullName.toLowerCase().contains(query) ||
          (m.bio?.toLowerCase().contains(query) ?? false) ||
          m.categories.any((c) => (requestCategoryLabels[c] ?? c).toLowerCase().contains(query));
      return matchSearch;
    }).toList();
  }

  void _openMasterProfile(PublicMaster master) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MasterProfileScreen(master: master),
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text(
          AppLocalizations.tr('masters_title'),
          style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.bold),
        ),
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          IconButton(
            icon: Icon(
              _isMapView ? LucideIcons.list : LucideIcons.mapPin,
              color: c.primary,
            ),
            onPressed: () => setState(() {
              _isMapView = !_isMapView;
              _selectedMaster = null;
            }),
            tooltip: _isMapView
                ? AppLocalizations.tr('view_list')
                : AppLocalizations.tr('view_map'),
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
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _searchQuery = v),
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                hintText: AppLocalizations.tr('masters_search_hint'),
                hintStyle: TextStyle(color: c.textTertiary),
                prefixIcon: Icon(LucideIcons.search, color: c.textTertiary, size: 18),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: Icon(LucideIcons.x, color: c.textTertiary, size: 16),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: c.card,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
              children: _categoryKeys.map((key) {
                final selected = _selectedCategory == key;
                return Padding(
                  padding: const EdgeInsets.only(right: AppDimens.spaceXs),
                  child: ChoiceChip(
                    label: Text(_categoryLabel(key)),
                    selected: selected,
                    onSelected: (val) {
                      if (val && key != _selectedCategory) {
                        setState(() => _selectedCategory = key);
                        _load();
                      }
                    },
                    selectedColor: c.primary.withValues(alpha: 0.15),
                    backgroundColor: c.card,
                    labelStyle: TextStyle(
                      color: selected ? c.primary : c.textSecondary,
                      fontWeight:
                          selected ? AppTypography.semibold : AppTypography.regular,
                      fontSize: 13,
                    ),
                    side: BorderSide(color: selected ? c.primary : c.cardBorder),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  ),
                );
              }).toList(),
            ),
          ),

          // Счётчик
          if (!_loading && _error == null)
            Padding(
              padding: const EdgeInsets.only(left: AppDimens.spaceMd, bottom: 6),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '${_filtered.length} ${AppLocalizations.tr('masters_found')}',
                  style: TextStyle(
                    color: c.textTertiary,
                    fontSize: AppTypography.caption,
                  ),
                ),
              ),
            ),

          // Контент
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _buildError(c)
                    : _isMapView
                        ? _buildMapView(c)
                        : _buildListView(c),
          ),
        ],
      ),
    );
  }

  Widget _buildError(AppColors c) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.wifiOff, color: c.textTertiary, size: 48),
            const SizedBox(height: AppDimens.spaceMd),
            Text(
              AppLocalizations.tr('status_error'),
              style: TextStyle(color: c.textSecondary),
            ),
            const SizedBox(height: AppDimens.spaceSm),
            ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(LucideIcons.refreshCw, size: 16),
              label: const Text('Повторить'),
            ),
          ],
        ),
      ),
    );
  }

  // ── Список ──────────────────────────────────────────────────────────────────

  Widget _buildListView(AppColors c) {
    final list = _filtered;
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.userX, color: c.textTertiary, size: 48),
            const SizedBox(height: AppDimens.spaceMd),
            Text(
              AppLocalizations.tr('masters_not_found'),
              style: TextStyle(color: c.textSecondary, fontSize: 15),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        itemCount: list.length,
        itemBuilder: (context, index) => _MasterCard(
          master: list[index],
          onTap: () => _openMasterProfile(list[index]),
        ),
      ),
    );
  }

  // ── Карта ───────────────────────────────────────────────────────────────────

  Widget _buildMapView(AppColors c) {
    final list = _filtered;

    return Stack(
      children: [
        // Фон с сеткой
        Container(
          color: c.surfaceVariant.withValues(alpha: 0.4),
          child: CustomPaint(
            painter: _MapGridPainter(lineColor: c.cardBorder),
            size: Size.infinite,
          ),
        ),

        // Маркер «Ваш дом»
        Align(
          alignment: Alignment.center,
          child: _HomeMarker(colors: c),
        ),

        // Маркеры мастеров (детерминированные позиции по hash ID)
        LayoutBuilder(
          builder: (context, constraints) {
            return Stack(
              children: list.map((master) {
                double dx, dy;
                if (master.lat != null && master.lng != null) {
                  // Преобразуем реальные координаты Кокшетау в относительные координаты на Canvas
                  // Центр ~ (53.2848, 69.3775)
                  const centerLat = 53.2848;
                  const centerLng = 69.3775;
                  dx = 0.5 + (master.lng! - centerLng) * 15.0;
                  dy = 0.5 - (master.lat! - centerLat) * 15.0;
                  dx = dx.clamp(0.08, 0.92);
                  dy = dy.clamp(0.08, 0.92);
                } else {
                  final rng = Random(master.id.hashCode);
                  do {
                    dx = 0.1 + rng.nextDouble() * 0.8;
                    dy = 0.1 + rng.nextDouble() * 0.8;
                  } while ((dx - 0.5).abs() < 0.12 && (dy - 0.5).abs() < 0.12);
                }

                final x = constraints.maxWidth * dx;
                final y = constraints.maxHeight * dy;
                final isSelected = _selectedMaster?.id == master.id;

                return Positioned(
                  left: x - 22,
                  top: y - 22,
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedMaster = isSelected ? null : master;
                      });
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: isSelected ? 48 : 40,
                      height: isSelected ? 48 : 40,
                      decoration: BoxDecoration(
                        color: isSelected ? c.primary : c.card,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? Colors.white : c.primary,
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.25),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(
                          LucideIcons.wrench,
                          color: isSelected ? Colors.white : c.primary,
                          size: isSelected ? 22 : 18,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),

        // Карточка выбранного мастера
        if (_selectedMaster != null)
          Positioned(
            left: AppDimens.spaceMd,
            right: AppDimens.spaceMd,
            bottom: AppDimens.spaceLg,
            child: _SelectedMasterCard(
              master: _selectedMaster!,
              colors: c,
              onTap: () => _openMasterProfile(_selectedMaster!),
              onClose: () => setState(() => _selectedMaster = null),
            ),
          ),

        // Пустой список
        if (list.isEmpty)
          Center(
            child: Container(
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
              ),
              child: Text(
                AppLocalizations.tr('masters_not_found'),
                style: TextStyle(color: c.textSecondary),
              ),
            ),
          ),
      ],
    );
  }
}

// =============================================================================
//  Вспомогательные виджеты
// =============================================================================

class _HomeMarker extends StatelessWidget {
  final AppColors colors;
  const _HomeMarker({required this.colors});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: c.primary,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: c.primary.withValues(alpha: 0.4),
                blurRadius: 16,
                spreadRadius: 4,
              ),
            ],
          ),
          child: const Icon(LucideIcons.home, color: Colors.white, size: 22),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: c.cardBorder),
          ),
          child: Text(
            AppLocalizations.tr('your_home'),
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 11,
              fontWeight: AppTypography.bold,
            ),
          ),
        ),
      ],
    );
  }
}

class _MasterCard extends StatelessWidget {
  final PublicMaster master;
  final VoidCallback onTap;
  const _MasterCard({required this.master, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final initial = master.fullName.isNotEmpty ? master.fullName[0].toUpperCase() : 'M';
    final catLabel = master.categories.isNotEmpty
        ? (requestCategoryLabels[master.categories.first] ?? master.categories.first)
        : '';

    return GestureDetector(
      onTap: onTap,
      child: Container(
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
              radius: 26,
              backgroundColor: c.primary.withValues(alpha: 0.12),
              child: Text(
                initial,
                style: TextStyle(
                  color: c.primary,
                  fontWeight: AppTypography.bold,
                  fontSize: 20,
                ),
              ),
            ),
            const SizedBox(width: AppDimens.spaceSm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    master.fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontWeight: AppTypography.semibold,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    catLabel,
                    style: TextStyle(
                      color: c.primary,
                      fontSize: AppTypography.caption,
                      fontWeight: AppTypography.medium,
                    ),
                  ),
                  if (master.bio != null && master.bio!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      master.bio!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.star_rounded, size: 15, color: Colors.amber[600]),
                      const SizedBox(width: 3),
                      Text(
                        master.rating.toStringAsFixed(1),
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 13,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '(${master.reviewsCount} ${AppLocalizations.tr("reviews_count")})',
                        style: TextStyle(
                          color: c.textTertiary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppDimens.spaceXs),
            Column(
              children: [
                Icon(LucideIcons.chevronRight, color: c.textTertiary, size: 18),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectedMasterCard extends StatelessWidget {
  final PublicMaster master;
  final AppColors colors;
  final VoidCallback onTap;
  final VoidCallback onClose;
  const _SelectedMasterCard({
    required this.master,
    required this.colors,
    required this.onTap,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    final catLabel = master.categories.isNotEmpty
        ? (requestCategoryLabels[master.categories.first] ?? master.categories.first)
        : '';
    final initial = master.fullName.isNotEmpty ? master.fullName[0].toUpperCase() : 'M';

    return Card(
      color: c.card,
      elevation: 12,
      shadowColor: Colors.black.withValues(alpha: 0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        side: BorderSide(color: c.primary.withValues(alpha: 0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        child: Row(
          children: [
            CircleAvatar(
              radius: 26,
              backgroundColor: c.primary.withValues(alpha: 0.12),
              child: Text(
                initial,
                style: TextStyle(
                  color: c.primary,
                  fontWeight: AppTypography.bold,
                  fontSize: 20,
                ),
              ),
            ),
            const SizedBox(width: AppDimens.spaceSm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    master.fullName,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontWeight: AppTypography.bold,
                      fontSize: 15,
                    ),
                  ),
                  Text(
                    catLabel,
                    style: TextStyle(
                      color: c.primary,
                      fontSize: AppTypography.caption,
                    ),
                  ),
                  Row(
                    children: [
                      Icon(Icons.star_rounded, size: 14, color: Colors.amber[600]),
                      const SizedBox(width: 3),
                      Text(
                        master.rating.toStringAsFixed(1),
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 12,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: onClose,
                  child: Icon(LucideIcons.x, color: c.textTertiary, size: 18),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: c.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    ),
                  ),
                  onPressed: onTap,
                  child: Text(
                    AppLocalizations.tr('master_view_profile'),
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}



// Сетка-фон карты
class _MapGridPainter extends CustomPainter {
  final Color lineColor;
  const _MapGridPainter({required this.lineColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = lineColor.withValues(alpha: 0.4)
      ..strokeWidth = 0.8;

    const step = 44.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _MapGridPainter old) => old.lineColor != lineColor;
}