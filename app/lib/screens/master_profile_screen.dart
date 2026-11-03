import 'package:flutter/material.dart';
import 'package:fixly_app/core/protected_files.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/app_localizations.dart';

// =============================================================================
//  Экран профиля мастера (для жителя)
// =============================================================================

class MasterProfileScreen extends StatefulWidget {
  /// Краткие данные из списка (уже загружены, показываем сразу).
  final PublicMaster master;

  const MasterProfileScreen({super.key, required this.master});

  @override
  State<MasterProfileScreen> createState() => _MasterProfileScreenState();
}

class _MasterProfileScreenState extends State<MasterProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  MasterDetail? _detail;
  bool _loadingDetail = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _loadDetail();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadDetail() async {
    try {
      final d = await MasterRepository.instance.getMasterById(widget.master.id);
      if (mounted) {
        setState(() {
          _detail = d;
          _loadingDetail = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingDetail = false);
    }
  }

  void _openCreateRequest() {
    final c = AppColors.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CreateRequestSheet(
        master: widget.master,
        colors: c,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final master = _detail ?? widget.master;
    final initial = master.fullName.isNotEmpty ? master.fullName[0].toUpperCase() : 'M';
    final catLabels = master.categories
        .map((cat) => requestCategoryLabels[cat] ?? cat)
        .toList();

    return Scaffold(
      backgroundColor: c.background,
      body: CustomScrollView(
        slivers: [
          // ── SliverAppBar с профилем ─────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            backgroundColor: c.card,
            iconTheme: IconThemeData(color: c.textPrimary),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      c.primary.withValues(alpha: 0.2),
                      c.card,
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 40),
                      // Аватар
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: c.primary.withValues(alpha: 0.15),
                        child: Text(
                          initial,
                          style: TextStyle(
                            color: c.primary,
                            fontSize: 32,
                            fontWeight: AppTypography.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        master.fullName,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 20,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.mapPin, size: 13, color: c.textTertiary),
                          const SizedBox(width: 3),
                          Text(
                            master.city,
                            style: TextStyle(
                              color: c.textTertiary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Рейтинг + значок Проверен
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.amber.withValues(alpha: 0.15),
                              borderRadius:
                                  BorderRadius.circular(AppDimens.radiusSm),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.star_rounded,
                                    size: 15, color: Colors.amber),
                                const SizedBox(width: 4),
                                Text(
                                  master.rating.toStringAsFixed(1),
                                  style: TextStyle(
                                    color: c.textPrimary,
                                    fontWeight: AppTypography.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  ' (${master.reviewsCount})',
                                  style: TextStyle(
                                    color: c.textTertiary,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: c.success.withValues(alpha: 0.12),
                              borderRadius:
                                  BorderRadius.circular(AppDimens.radiusSm),
                            ),
                            child: Row(
                              children: [
                                Icon(LucideIcons.checkCircle2,
                                    size: 13, color: c.success),
                                const SizedBox(width: 4),
                                Text(
                                  AppLocalizations.tr('master_verified'),
                                  style: TextStyle(
                                    color: c.success,
                                    fontSize: 12,
                                    fontWeight: AppTypography.semibold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                color: c.card,
                child: TabBar(
                  controller: _tabs,
                  labelColor: c.primary,
                  unselectedLabelColor: c.textTertiary,
                  indicatorColor: c.primary,
                  tabs: [
                    Tab(text: AppLocalizations.tr('master_tab_info')),
                    Tab(text: AppLocalizations.tr('master_tab_portfolio')),
                    Tab(text: AppLocalizations.tr('master_tab_reviews')),
                  ],
                ),
              ),
            ),
          ),

          // ── Контент вкладок ─────────────────────────────────────────────────
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabs,
              children: [
                // Инфо
                _buildInfoTab(c, master, catLabels),
                // Портфолио
                _loadingDetail
                    ? const Center(child: CircularProgressIndicator())
                    : _buildPortfolioTab(c),
                // Отзывы
                _loadingDetail
                    ? const Center(child: CircularProgressIndicator())
                    : _buildReviewsTab(c),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'master_create_request_fab',
        onPressed: _openCreateRequest,
        backgroundColor: c.primary,
        icon: const Icon(LucideIcons.clipboardList, color: Colors.white),
        label: Text(
          AppLocalizations.tr('master_create_request'),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  // ── Вкладка «Инфо» ──────────────────────────────────────────────────────────

  Widget _buildInfoTab(AppColors c, PublicMaster master, List<String> catLabels) {
    return ListView(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      children: [
        // Специализации
        _Section(
          icon: LucideIcons.briefcase,
          title: AppLocalizations.tr('master_specialization'),
          colors: c,
          child: Wrap(
            spacing: 8,
            runSpacing: 6,
            children: catLabels.map((label) => Chip(
              label: Text(
                label,
                style: TextStyle(
                  color: c.primary,
                  fontSize: 12,
                  fontWeight: AppTypography.semibold,
                ),
              ),
              backgroundColor: c.primary.withValues(alpha: 0.1),
              side: BorderSide(color: c.primary.withValues(alpha: 0.3)),
              padding: const EdgeInsets.symmetric(horizontal: 4),
            )).toList(),
          ),
        ),

        const SizedBox(height: AppDimens.spaceMd),

        // О себе
        if (master.bio != null && master.bio!.isNotEmpty)
          _Section(
            icon: LucideIcons.user,
            title: AppLocalizations.tr('master_bio'),
            colors: c,
            child: Text(
              master.bio!,
              style: TextStyle(color: c.textSecondary, height: 1.5),
            ),
          ),

        if (master.bio != null && master.bio!.isNotEmpty)
          const SizedBox(height: AppDimens.spaceMd),

        // Контакт (телефон)
        if (master.phone != null)
          _Section(
            icon: LucideIcons.phone,
            title: AppLocalizations.tr('profile_phone'),
            colors: c,
            child: Text(
              master.phone!,
              style: TextStyle(
                color: c.textPrimary,
                fontWeight: AppTypography.semibold,
              ),
            ),
          ),

        const SizedBox(height: 100), // отступ под FAB
      ],
    );
  }

  // ── Вкладка «Портфолио» ─────────────────────────────────────────────────────

  Widget _buildPortfolioTab(AppColors c) {
    final portfolio = _detail?.portfolio ?? [];
    if (portfolio.isEmpty) {
      return _EmptyTab(
        icon: LucideIcons.image,
        message: AppLocalizations.tr('master_portfolio_empty'),
        colors: c,
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.85,
      ),
      itemCount: portfolio.length,
      itemBuilder: (ctx, i) {
        final item = portfolio[i];
        final catLabel = requestCategoryLabels[item.category] ?? item.category;
        return Container(
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
            border: Border.all(color: c.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Фото или заглушка
              Expanded(
                child: item.photoUrls.isNotEmpty
                    ? ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(AppDimens.radiusMd),
                        ),
                        child: ProtectedImage(
                          url: item.photoUrls.first,
                          placeholder: _PortfolioPlaceholder(colors: c),
                        ),
                      )
                    : ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(AppDimens.radiusMd),
                        ),
                        child: _PortfolioPlaceholder(colors: c),
                      ),
              ),
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: AppTypography.semibold,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      catLabel,
                      style: TextStyle(
                        color: c.primary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Вкладка «Отзывы» ────────────────────────────────────────────────────────

  Widget _buildReviewsTab(AppColors c) {
    final reviews = _detail?.reviews ?? [];
    if (reviews.isEmpty) {
      return _EmptyTab(
        icon: LucideIcons.star,
        message: AppLocalizations.tr('master_reviews_empty'),
        colors: c,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      itemCount: reviews.length,
      itemBuilder: (ctx, i) {
        final review = reviews[i];
        final phone = review.authorPhone ?? '???';
        final masked = phone.length > 4
            ? '${phone.substring(0, phone.length - 4)}****'
            : phone;

        return Container(
          margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
          padding: const EdgeInsets.all(AppDimens.spaceMd),
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
            border: Border.all(color: c.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: c.surfaceVariant,
                    child: Icon(LucideIcons.user, size: 14, color: c.textTertiary),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      masked,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: AppTypography.semibold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  // Звёзды
                  Row(
                    children: List.generate(5, (si) => Icon(
                      si < review.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                      size: 14,
                      color: Colors.amber[600],
                    )),
                  ),
                ],
              ),
              if (review.comment != null && review.comment!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  review.comment!,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Text(
                _formatDate(review.createdAt),
                style: TextStyle(
                  color: c.textTertiary,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year}';
  }
}

// =============================================================================
//  Виджет создания заявки к мастеру
// =============================================================================

class _CreateRequestSheet extends StatefulWidget {
  final PublicMaster master;
  final AppColors colors;
  const _CreateRequestSheet({required this.master, required this.colors});

  @override
  State<_CreateRequestSheet> createState() => _CreateRequestSheetState();
}

class _CreateRequestSheetState extends State<_CreateRequestSheet> {
  final _textCtrl = TextEditingController();
  String _category = '';
  bool _sending = false;

  static const _categoryKeys = [
    'PLUMBING',
    'ELECTRICITY',
    'CLEANING',
    'ELEVATOR',
    'OTHER',
  ];

  @override
  void initState() {
    super.initState();
    // Предзаполним категорию из специализаций мастера
    if (widget.master.categories.isNotEmpty) {
      _category = widget.master.categories.first;
    } else {
      _category = 'OTHER';
    }
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty || _category.isEmpty) return;

    setState(() => _sending = true);
    try {
      await RequestsRepository.instance.create(
        category: _category,
        text: text,
      );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.tr('request_sent_success')),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.of(context).success,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.colors;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(AppDimens.radiusLg),
          ),
        ),
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: c.textTertiary.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              AppLocalizations.tr('master_create_request'),
              style: TextStyle(
                color: c.textPrimary,
                fontSize: AppTypography.sectionTitle,
                fontWeight: AppTypography.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.master.fullName,
              style: TextStyle(color: c.primary, fontSize: 13),
            ),
            const SizedBox(height: AppDimens.spaceMd),

            // Категория
            Text(
              AppLocalizations.tr('label_role'),
              style: TextStyle(
                color: c.textTertiary,
                fontSize: AppTypography.caption,
                fontWeight: AppTypography.semibold,
              ),
            ),
            const SizedBox(height: 6),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _categoryKeys.map((key) {
                  final label = requestCategoryLabels[key] ?? key;
                  final selected = _category == key;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(label),
                      selected: selected,
                      onSelected: (v) {
                        if (v) setState(() => _category = key);
                      },
                      selectedColor: c.primary.withValues(alpha: 0.15),
                      backgroundColor: c.surfaceVariant,
                      labelStyle: TextStyle(
                        color: selected ? c.primary : c.textSecondary,
                        fontSize: 12,
                        fontWeight: selected
                            ? AppTypography.semibold
                            : AppTypography.regular,
                      ),
                      side: BorderSide(
                        color: selected ? c.primary : c.cardBorder,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: AppDimens.spaceSm),

            // Описание
            TextField(
              controller: _textCtrl,
              minLines: 3,
              maxLines: 5,
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                hintText: AppLocalizations.tr('request_description_hint'),
                hintStyle: TextStyle(color: c.textTertiary),
                filled: true,
                fillColor: c.background,
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

            const SizedBox(height: AppDimens.spaceMd),

            SizedBox(
              width: double.infinity,
              height: AppDimens.primaryTapTarget,
              child: ElevatedButton.icon(
                onPressed: _sending ? null : _submit,
                icon: _sending
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(LucideIcons.send, size: 16),
                label: Text(AppLocalizations.tr('btn_send')),
              ),
            ),

            const SizedBox(height: AppDimens.spaceXs),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
//  Вспомогательные виджеты
// =============================================================================

class _Section extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget child;
  final AppColors colors;
  const _Section({
    required this.icon,
    required this.title,
    required this.child,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: c.primary),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  color: c.textTertiary,
                  fontSize: AppTypography.caption,
                  fontWeight: AppTypography.semibold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _EmptyTab extends StatelessWidget {
  final IconData icon;
  final String message;
  final AppColors colors;
  const _EmptyTab({required this.icon, required this.message, required this.colors});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: c.textTertiary),
          const SizedBox(height: AppDimens.spaceMd),
          Text(
            message,
            style: TextStyle(color: c.textSecondary, fontSize: 15),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _PortfolioPlaceholder extends StatelessWidget {
  final AppColors colors;
  const _PortfolioPlaceholder({required this.colors});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return Container(
      color: c.surfaceVariant,
      child: Center(
        child: Icon(LucideIcons.image, color: c.textTertiary, size: 32),
      ),
    );
  }
}
