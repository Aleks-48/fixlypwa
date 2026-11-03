import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/master_listings_screen.dart';
import 'package:fixly_app/screens/master_offers_screen.dart';
import 'package:fixly_app/screens/notifications_screen.dart';
import 'package:fixly_app/screens/legal_docs_sheet.dart';
import 'package:fixly_app/screens/video_instructions_sheet.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/main.dart' show appLanguage;

// Оболочка мастера:
// САМОСТОЯТЕЛЬНЫЙ shell, не привязанный к ОСИ.
// Таб-бар: Заказы / Мои отклики / Профиль.
class MasterHomeShell extends StatefulWidget {
  final AuthUser user;
  final MasterProfile master;
  const MasterHomeShell({super.key, required this.user, required this.master});

  @override
  State<MasterHomeShell> createState() => _MasterHomeShellState();
}

class _MasterHomeShellState extends State<MasterHomeShell> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final pages = [
      const MasterListingsScreen(),
      const MasterOffersScreen(),
      _MasterProfileTab(user: widget.user, master: widget.master),
    ];

    return Scaffold(
      backgroundColor: c.background,
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          backgroundColor: c.card,
          indicatorColor: c.primary.withValues(alpha: 0.15),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: AppTypography.caption,
              color: selected ? c.primary : c.textTertiary,
              fontWeight: selected ? AppTypography.semibold : AppTypography.regular,
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return IconThemeData(color: selected ? c.primary : c.textTertiary);
          }),
        ),
        child: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: [
            NavigationDestination(icon: const Icon(LucideIcons.briefcase), label: AppLocalizations.tr('master_orders')),
            NavigationDestination(icon: const Icon(LucideIcons.messageSquare), label: AppLocalizations.tr('master_responses')),
            NavigationDestination(icon: const Icon(LucideIcons.user), label: AppLocalizations.tr('nav_profile')),
          ],
        ),
      ),
    );
  }
}

class _MasterProfileTab extends StatefulWidget {
  final AuthUser user;
  final MasterProfile master;
  const _MasterProfileTab({required this.user, required this.master});

  @override
  State<_MasterProfileTab> createState() => _MasterProfileTabState();
}

class _MasterProfileTabState extends State<_MasterProfileTab> {
  MasterDetail? _detail;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() => _loading = true);
    try {
      final details = await MasterRepository.instance.myDetails();
      if (mounted) {
        setState(() {
          _detail = details;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showEditMasterProfileDialog(BuildContext context) {
    final c = AppColors.of(context);
    final nameCtrl = TextEditingController(text: widget.master.fullName);
    final bioCtrl = TextEditingController(text: widget.master.bio ?? '');
    final cityCtrl = TextEditingController(text: widget.master.city);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.card,
        title: Text(AppLocalizations.tr('profile_edit'), style: TextStyle(color: c.textPrimary)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: AppLocalizations.tr('label_full_name'),
                  labelStyle: TextStyle(color: c.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: cityCtrl,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Город',
                  labelStyle: TextStyle(color: c.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: bioCtrl,
                maxLines: 2,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: AppLocalizations.tr('master_bio'),
                  labelStyle: TextStyle(color: c.textSecondary),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppLocalizations.tr('btn_cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              final newName = nameCtrl.text.trim();
              if (newName.isNotEmpty) {
                await AuthRepository.instance.updateProfile(fullName: newName);
              }
              await MasterRepository.instance.updateMasterProfile(
                city: cityCtrl.text.trim(),
                bio: bioCtrl.text.trim(),
              );
              if (ctx.mounted) Navigator.pop(ctx);
              _loadDetails();
            },
            child: Text(AppLocalizations.tr('btn_save')),
          ),
        ],
      ),
    );
  }

  Future<void> _logout(BuildContext context) async {
    await AuthRepository.instance.logout();
    if (!context.mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
    );
  }

  void _showAddPortfolioModal() {
    final c = AppColors.of(context);
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String category = widget.master.categories.isNotEmpty ? widget.master.categories.first : 'PLUMBING';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: Container(
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
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
                  AppLocalizations.tr('add_portfolio_item'),
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: AppTypography.sectionTitle,
                    fontWeight: AppTypography.bold,
                  ),
                ),
                const SizedBox(height: AppDimens.spaceMd),

                // Название
                TextField(
                  controller: titleCtrl,
                  style: TextStyle(color: c.textPrimary),
                  decoration: InputDecoration(
                    hintText: AppLocalizations.tr('portfolio_title_hint'),
                    hintStyle: TextStyle(color: c.textTertiary),
                    filled: true,
                    fillColor: c.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                      borderSide: BorderSide(color: c.cardBorder),
                    ),
                  ),
                ),
                const SizedBox(height: AppDimens.spaceSm),

                // Описание
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  style: TextStyle(color: c.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'Описание выполненной работы...',
                    hintStyle: TextStyle(color: c.textTertiary),
                    filled: true,
                    fillColor: c.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                      borderSide: BorderSide(color: c.cardBorder),
                    ),
                  ),
                ),
                const SizedBox(height: AppDimens.spaceMd),

                SizedBox(
                  width: double.infinity,
                  height: AppDimens.primaryTapTarget,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: c.primary),
                    onPressed: () async {
                      final title = titleCtrl.text.trim();
                      if (title.isEmpty) return;
                      Navigator.pop(ctx);
                      if (mounted) {
                        final messenger = ScaffoldMessenger.of(context);
                        try {
                          await MasterRepository.instance.addPortfolioItem(
                            title: title,
                            description: descCtrl.text.trim(),
                            category: category,
                          );
                          _loadDetails();
                        } catch (e) {
                          messenger.showSnackBar(
                            SnackBar(content: Text('Ошибка добавления: $e')),
                          );
                        }
                      }
                    },
                    icon: const Icon(LucideIcons.plus, color: Colors.white, size: 18),
                    label: Text(
                      AppLocalizations.tr('add_portfolio_item'),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(height: AppDimens.spaceXs),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final user = widget.user;
    final master = widget.master;
    final detail = _detail;

    final ratingStr = detail != null ? detail.rating.toStringAsFixed(1) : '5.0';
    final reviewsCountStr = detail != null ? '${detail.reviewsCount}' : '0';
    final offersCountStr = detail != null ? '${detail.offersCount}' : '0';

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text(AppLocalizations.tr('nav_profile')),
        titleTextStyle: TextStyle(
          color: c.textPrimary,
          fontSize: AppTypography.screenTitle,
          fontWeight: AppTypography.bold,
        ),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.bell, color: c.textPrimary),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDetails,
        child: ListView(
          padding: const EdgeInsets.all(AppDimens.spaceMd),
          children: [
            // Карточка профиля мастера
            Container(
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
                        radius: 26,
                        backgroundColor: c.primary.withValues(alpha: 0.15),
                        child: Icon(LucideIcons.userCheck, color: c.primary, size: 26),
                      ),
                      const SizedBox(width: AppDimens.spaceSm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                             Row(
                               children: [
                                 Expanded(
                                   child: Text(
                                     master.fullName,
                                     style: TextStyle(
                                       color: c.textPrimary,
                                       fontWeight: AppTypography.bold,
                                       fontSize: AppTypography.sectionTitle,
                                     ),
                                   ),
                                 ),
                                 IconButton(
                                   icon: Icon(LucideIcons.edit2, size: 16, color: c.primary),
                                   onPressed: () => _showEditMasterProfileDialog(context),
                                   tooltip: AppLocalizations.tr('profile_edit'),
                                 ),
                               ],
                             ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Icon(LucideIcons.checkCircle2, color: c.success, size: 14),
                                const SizedBox(width: 4),
                                Text(
                                  AppLocalizations.tr('master_verified'),
                                  style: TextStyle(
                                    color: c.success,
                                    fontSize: AppTypography.caption,
                                    fontWeight: AppTypography.semibold,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppDimens.spaceMd),
                  const Divider(height: 1),
                  const SizedBox(height: AppDimens.spaceSm),
                  _row(c, LucideIcons.mapPin, master.city),
                  if (user.email != null) _row(c, LucideIcons.mail, user.email!),
                  if (user.phone != null) _row(c, LucideIcons.phone, user.phone!),
                  const SizedBox(height: AppDimens.spaceSm),
                  Text(
                    AppLocalizations.tr('master_specialization'),
                    style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: master.categories
                        .map((cat) => Chip(
                              label: Text(requestCategoryLabels[cat] ?? cat),
                              backgroundColor: c.surfaceVariant,
                              labelStyle: TextStyle(
                                color: c.textSecondary,
                                fontSize: AppTypography.caption,
                                fontWeight: AppTypography.medium,
                              ),
                              side: BorderSide(color: c.cardBorder),
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            ))
                        .toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimens.spaceMd),

            // Карточка РЕАЛЬНОЙ метрики / статистики мастера из БД
            Container(
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                border: Border.all(color: c.cardBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _statColumn(c, '$ratingStr ⭐', AppLocalizations.tr('master_rating')),
                  Container(width: 1, height: 32, color: c.cardBorder),
                  _statColumn(c, reviewsCountStr, AppLocalizations.tr('master_tab_reviews')),
                  Container(width: 1, height: 32, color: c.cardBorder),
                  _statColumn(c, offersCountStr, AppLocalizations.tr('master_responses')),
                ],
              ),
            ),

            const SizedBox(height: AppDimens.spaceLg),

            // ── Моё портфолио работ ──────────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: Text(
                    AppLocalizations.tr('my_portfolio'),
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 15,
                      fontWeight: AppTypography.bold,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: _showAddPortfolioModal,
                  icon: const Icon(LucideIcons.plus, size: 15),
                  label: const Text('Добавить', style: TextStyle(fontSize: 13)),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppDimens.spaceXs),

            if (_loading)
              const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
            else if (detail == null || detail.portfolio.isEmpty)
              Container(
                padding: const EdgeInsets.all(AppDimens.spaceMd),
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  border: Border.all(color: c.cardBorder),
                ),
                child: Center(
                  child: Text(
                    AppLocalizations.tr('master_portfolio_empty'),
                    style: TextStyle(color: c.textTertiary, fontSize: 13),
                  ),
                ),
              )
            else
              Column(
                children: detail.portfolio.map((item) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
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
                          color: c.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(LucideIcons.image, color: c.primary, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.semibold, fontSize: 14),
                            ),
                            if (item.description != null && item.description!.isNotEmpty)
                              Text(
                                item.description!,
                                style: TextStyle(color: c.textSecondary, fontSize: 12),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )).toList(),
              ),

            const SizedBox(height: AppDimens.spaceLg),

            // ── Отзывы жителей ────────────────────────────────────────────────
            Text(
              AppLocalizations.tr('my_reviews'),
              style: TextStyle(
                color: c.textPrimary,
                fontSize: AppTypography.sectionTitle,
                fontWeight: AppTypography.bold,
              ),
            ),
            const SizedBox(height: AppDimens.spaceSm),

            if (detail != null && detail.reviews.isNotEmpty)
              Column(
                children: detail.reviews.map((r) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: c.card,
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    border: Border.all(color: c.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: List.generate(5, (si) => Icon(
                              si < r.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                              size: 14,
                              color: Colors.amber[600],
                            )),
                          ),
                          Text(
                            '${r.createdAt.day}.${r.createdAt.month}.${r.createdAt.year}',
                            style: TextStyle(color: c.textTertiary, fontSize: 11),
                          ),
                        ],
                      ),
                      if (r.comment != null && r.comment!.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(r.comment!, style: TextStyle(color: c.textPrimary, fontSize: 13)),
                      ],
                    ],
                  ),
                )).toList(),
              )
            else
              Container(
                padding: const EdgeInsets.all(AppDimens.spaceMd),
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  border: Border.all(color: c.cardBorder),
                ),
                child: Center(
                  child: Text(
                    AppLocalizations.tr('master_reviews_empty'),
                    style: TextStyle(color: c.textTertiary, fontSize: 13),
                  ),
                ),
              ),

            const SizedBox(height: AppDimens.spaceLg),

            // Пункты меню
            _menuTile(
              context,
              c,
              LucideIcons.playCircle,
              appLanguage.value == 'kk' ? 'Бейненұсқаулықтар' : (appLanguage.value == 'en' ? 'Video Tutorials' : 'Видеоинструкции'),
              () => VideoInstructionsSheet.show(context),
            ),
            _menuTile(
              context,
              c,
              LucideIcons.fileText,
              'Оферта и регламент мастера',
              () => LegalDocsSheet.show(context, initialTab: LegalDocTab.master),
            ),
            _menuTile(
              context,
              c,
              LucideIcons.bell,
              AppLocalizations.tr('profile_notifications'),
              () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              ),
            ),

            // Переключатель языка
            Container(
              margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                border: Border.all(color: c.cardBorder),
              ),
              child: ListTile(
                leading: Icon(LucideIcons.globe, color: c.primary),
                title: Text(
                  AppLocalizations.tr('app_language'),
                  style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.regular),
                ),
                trailing: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: appLanguage.value,
                    dropdownColor: c.card,
                    icon: Icon(Icons.arrow_drop_down, color: c.textSecondary),
                    onChanged: (newLang) {
                      if (newLang != null) {
                        AppLocalizations.changeLanguage(newLang);
                      }
                    },
                    items: [
                      DropdownMenuItem(
                        value: 'ru',
                        child: Text(AppLocalizations.tr('lang_ru'), style: TextStyle(color: c.textPrimary, fontSize: 14)),
                      ),
                      DropdownMenuItem(
                        value: 'kk',
                        child: Text(AppLocalizations.tr('lang_kk'), style: TextStyle(color: c.textPrimary, fontSize: 14)),
                      ),
                      DropdownMenuItem(
                        value: 'en',
                        child: Text(AppLocalizations.tr('lang_en'), style: TextStyle(color: c.textPrimary, fontSize: 14)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppDimens.spaceLg),

            // Кнопка Выйти
            SizedBox(
              height: AppDimens.primaryTapTarget,
              child: OutlinedButton.icon(
                onPressed: () => _logout(context),
                icon: Icon(LucideIcons.logOut, color: c.danger),
                label: Text(
                  AppLocalizations.tr('profile_logout'),
                  style: TextStyle(
                    color: c.danger,
                    fontWeight: AppTypography.semibold,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: c.danger.withValues(alpha: 0.5)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(AppColors c, IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: c.textTertiary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: c.textSecondary, fontSize: 13),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statColumn(AppColors c, String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: AppTypography.bold,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
        ),
      ],
    );
  }

  Widget _menuTile(
    BuildContext context,
    AppColors c,
    IconData icon,
    String title,
    VoidCallback onTap,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
        border: Border.all(color: c.cardBorder),
      ),
      child: ListTile(
        leading: Icon(icon, color: c.primary),
        title: Text(
          title,
          style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.regular),
        ),
        trailing: Icon(LucideIcons.chevronRight, color: c.textTertiary, size: 18),
        onTap: onTap,
      ),
    );
  }
}