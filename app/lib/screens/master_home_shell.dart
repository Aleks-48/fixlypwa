import 'dart:async';
import 'package:image_picker/image_picker.dart';
import '../core/api_client.dart';
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
  late MasterProfile _profile = widget.master;
  MasterDetail? _detail;
  bool _loading = true;
  bool _loggingOut = false;
  bool _openingPortfolioSheet = false;
  int _loadSeq = 0;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  @override
  void didUpdateWidget(covariant _MasterProfileTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.master != widget.master) {
      _profile = widget.master;
    }
  }

  Future<void> _loadDetails({bool updateProfile = true}) async {
    final seq = ++_loadSeq;
    if (mounted) {
      setState(() => _loading = true);
    }
    try {
      final details = await MasterRepository.instance.myDetails();
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _detail = details;
        if (updateProfile && details != null) {
          _profile = MasterProfile(
            id: details.id.isNotEmpty ? details.id : _profile.id,
            status: _profile.status,
            city: details.city.isNotEmpty ? details.city : _profile.city,
            categories: details.categories.isNotEmpty
                ? details.categories
                : _profile.categories,
            fullName: details.fullName.isNotEmpty
                ? details.fullName
                : _profile.fullName,
            bio: details.bio ?? _profile.bio,
          );
        }
        _loading = false;
      });
    } catch (_) {
      if (mounted && seq == _loadSeq) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _showEditMasterProfileDialog(BuildContext context) async {
    final updated = await showDialog<MasterProfile>(
      context: context,
      builder: (_) => _EditMasterProfileDialog(profile: _profile),
    );
    if (updated != null && mounted) {
      setState(() => _profile = updated);
      unawaited(_loadDetails(updateProfile: false));
    }
  }

  Future<void> _logout(BuildContext context) async {
    if (_loggingOut) return;
    setState(() => _loggingOut = true);
    try {
      await AuthRepository.instance.logout();
      if (!context.mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginPage()),
        (_) => false,
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Не удалось выйти из аккаунта')),
        );
      }
    } finally {
      if (mounted) setState(() => _loggingOut = false);
    }
  }

  Future<void> _showAddPortfolioModal() async {
    if (_openingPortfolioSheet) return;
    _openingPortfolioSheet = true;
    final category =
        _profile.categories.isNotEmpty ? _profile.categories.first : 'PLUMBING';
    try {
      final added = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _AddPortfolioSheet(category: category),
      );
      if (added == true && mounted) {
        await _loadDetails(updateProfile: false);
      }
    } finally {
      _openingPortfolioSheet = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final user = widget.user;
    final master = _profile;
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
                                Expanded(
                                  child: Text(
                                    AppLocalizations.tr('master_verified'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: c.success,
                                      fontSize: AppTypography.caption,
                                      fontWeight: AppTypography.semibold,
                                    ),
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
                  if (master.bio != null && master.bio!.trim().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      master.bio!,
                      style: TextStyle(color: c.textSecondary, fontSize: 13),
                    ),
                  ],
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
                children: [
                  Expanded(child: _statColumn(c, '$ratingStr ⭐', AppLocalizations.tr('master_rating'))),
                  Container(width: 1, height: 32, color: c.cardBorder),
                  Expanded(child: _statColumn(c, reviewsCountStr, AppLocalizations.tr('master_tab_reviews'))),
                  Container(width: 1, height: 32, color: c.cardBorder),
                  Expanded(child: _statColumn(c, offersCountStr, AppLocalizations.tr('master_responses'))),
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
                onPressed: _loggingOut ? null : () => _logout(context),
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
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: AppTypography.bold,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
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

class _EditMasterProfileDialog extends StatefulWidget {
  final MasterProfile profile;
  const _EditMasterProfileDialog({required this.profile});

  @override
  State<_EditMasterProfileDialog> createState() =>
      _EditMasterProfileDialogState();
}

class _EditMasterProfileDialogState extends State<_EditMasterProfileDialog> {
  late final TextEditingController _nameCtrl =
      TextEditingController(text: widget.profile.fullName);
  late final TextEditingController _cityCtrl =
      TextEditingController(text: widget.profile.city);
  late final TextEditingController _bioCtrl =
      TextEditingController(text: widget.profile.bio ?? '');
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _cityCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;
    final newName = _nameCtrl.text.trim();
    final newCity = _cityCtrl.text.trim();
    final newBio = _bioCtrl.text.trim();
    if (newName.isEmpty) {
      setState(() => _error = 'Укажите ФИО');
      return;
    }
    if (newCity.isEmpty) {
      setState(() => _error = 'Укажите город');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await AuthRepository.instance.updateProfile(fullName: newName);
      final updated = await MasterRepository.instance.updateMasterProfile(
        city: newCity,
        bio: newBio,
      );
      final merged = MasterProfile(
        id: updated.id.isNotEmpty ? updated.id : widget.profile.id,
        status: updated.status.isNotEmpty ? updated.status : widget.profile.status,
        city: updated.city.isNotEmpty ? updated.city : newCity,
        categories: updated.categories.isNotEmpty
            ? updated.categories
            : widget.profile.categories,
        fullName: newName,
        bio: newBio.isEmpty
            ? null
            : ((updated.bio != null && updated.bio!.isNotEmpty)
                ? updated.bio
                : newBio),
      );
      if (mounted) Navigator.pop(context, merged);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = e.message;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Не удалось сохранить профиль';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return PopScope(
      canPop: !_saving,
      child: AlertDialog(
        backgroundColor: c.card,
        title: Text(
          AppLocalizations.tr('profile_edit'),
          style: TextStyle(color: c.textPrimary),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _nameCtrl,
                enabled: !_saving,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: AppLocalizations.tr('label_full_name'),
                  labelStyle: TextStyle(color: c.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _cityCtrl,
                enabled: !_saving,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Город',
                  labelStyle: TextStyle(color: c.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _bioCtrl,
                enabled: !_saving,
                maxLines: 2,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: AppLocalizations.tr('master_bio'),
                  labelStyle: TextStyle(color: c.textSecondary),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(
                  _error!,
                  style: TextStyle(color: c.danger, fontSize: 13),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: _saving ? null : () => Navigator.pop(context),
            child: Text(AppLocalizations.tr('btn_cancel')),
          ),
          ElevatedButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(AppLocalizations.tr('btn_save')),
          ),
        ],
      ),
    );
  }
}

class _AddPortfolioSheet extends StatefulWidget {
  final String category;
  const _AddPortfolioSheet({required this.category});

  @override
  State<_AddPortfolioSheet> createState() => _AddPortfolioSheetState();
}

class _AddPortfolioSheetState extends State<_AddPortfolioSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  XFile? _photo;
  String? _uploadedUrl;
  bool _saving = false;
  String? _failure;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    if (_saving) return;
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        imageQuality: 85,
      );
      if (picked != null && mounted) {
        setState(() {
          _photo = picked;
          _uploadedUrl = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _failure = 'Не удалось выбрать фото');
      }
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      setState(() => _failure = 'Введите название работы');
      return;
    }
    setState(() {
      _saving = true;
      _failure = null;
    });
    try {
      if (_photo != null) {
        _uploadedUrl ??= await ApiClient.instance.uploadPhoto(_photo!.path);
      }
      await MasterRepository.instance.addPortfolioItem(
        title: title,
        description: _descCtrl.text.trim(),
        category: widget.category,
        photoUrls: _uploadedUrl == null ? [] : [_uploadedUrl!],
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _failure = e is ApiException ? e.message : 'Ошибка добавления: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return PopScope(
      canPop: !_saving,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Container(
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppDimens.radiusLg),
            ),
          ),
          padding: const EdgeInsets.all(AppDimens.spaceMd),
          child: SingleChildScrollView(
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
                TextField(
                  controller: _titleCtrl,
                  enabled: !_saving,
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
                TextField(
                  controller: _descCtrl,
                  enabled: !_saving,
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
                TextButton.icon(
                  icon: const Icon(Icons.photo),
                  label: Text(
                    _photo?.name ?? 'Прикрепить фото',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onPressed: _saving ? null : _pickPhoto,
                ),
                if (_failure != null) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      _failure!,
                      style: TextStyle(color: c.danger, fontSize: 13),
                    ),
                  ),
                ],
                SizedBox(
                  width: double.infinity,
                  height: AppDimens.primaryTapTarget,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: c.primary),
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(LucideIcons.plus,
                            color: Colors.white, size: 18),
                    label: Text(
                      AppLocalizations.tr('add_portfolio_item'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
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
}