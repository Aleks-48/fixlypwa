import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/core/analytics_repository.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/chairman_requests_screen.dart';
import 'package:fixly_app/screens/chairman_announcements_screen.dart';
import 'package:fixly_app/screens/apartments_residents_screen.dart';
import 'package:fixly_app/screens/notifications_screen.dart';
import 'package:fixly_app/screens/chairman_polls_screen.dart';
import 'package:fixly_app/screens/chairman_analytics_screen.dart';
import 'package:fixly_app/screens/pricing_screen.dart';
import 'package:fixly_app/screens/legal_docs_sheet.dart';
import 'package:fixly_app/screens/video_instructions_sheet.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:url_launcher/url_launcher.dart';

// Оболочка председателя:
// оперативные функции в приложении (заявки дома, объявления, голосования, уведомления);
// управление (финансы, отчёты, импорт) — на сайте. Таб-бар: Главная / Заявки /
// Объявления / Голоса / Ещё.
class ChairmanHomeShell extends StatefulWidget {
  final AuthUser user;
  const ChairmanHomeShell({super.key, required this.user});

  @override
  State<ChairmanHomeShell> createState() => _ChairmanHomeShellState();
}

class _ChairmanHomeShellState extends State<ChairmanHomeShell> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    EventsRepository.instance.connect();
  }

  @override
  void dispose() {
    EventsRepository.instance.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final pages = [
      _ChairmanHomeTab(user: widget.user),
      const ChairmanRequestsScreen(),
      const ChairmanAnnouncementsScreen(),
      const ChairmanPollsScreen(),
      _ChairmanMoreTab(user: widget.user),
    ];

    return ValueListenableBuilder<String>(
      valueListenable: appLanguage,
      builder: (context, lang, _) {
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
                NavigationDestination(icon: const Icon(LucideIcons.layoutDashboard), label: AppLocalizations.tr('nav_home')),
                NavigationDestination(icon: const Icon(LucideIcons.clipboardList), label: AppLocalizations.tr('nav_requests')),
                NavigationDestination(icon: const Icon(LucideIcons.megaphone), label: AppLocalizations.tr('nav_announcements')),
                NavigationDestination(icon: const Icon(LucideIcons.vote), label: AppLocalizations.tr('nav_polls')),
                NavigationDestination(icon: const Icon(LucideIcons.moreHorizontal), label: AppLocalizations.tr('nav_more')),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ChairmanHomeTab extends StatefulWidget {
  final AuthUser user;
  const _ChairmanHomeTab({required this.user});

  @override
  State<_ChairmanHomeTab> createState() => _ChairmanHomeTabState();
}

class _ChairmanHomeTabState extends State<_ChairmanHomeTab> {
  List<Building> _buildings = [];
  List<PendingJoinRequest> _joinRequests = [];
  bool _loading = true;
  final Set<String> _resolvingIds = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    List<Building> bList = [];
    List<PendingJoinRequest> reqList = [];
    try {
      bList = await OsiRepository.instance.listBuildings();
    } catch (_) {}
    try {
      reqList = await OsiRepository.instance.listOsiJoinRequests();
    } catch (_) {}

    if (mounted) {
      setState(() {
        _buildings = bList;
        _joinRequests = reqList;
        _loading = false;
      });
    }
  }

  Future<void> _resolveJoinRequest(String id) async {
    setState(() => _resolvingIds.add(id));
    try {
      await OsiRepository.instance.resolveJoinRequest(id);
      if (mounted) setState(() => _joinRequests.removeWhere((r) => r.id == id));
    } finally {
      if (mounted) setState(() => _resolvingIds.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: const Text('Fixly'),
        titleTextStyle: TextStyle(
            color: c.textPrimary, fontSize: AppTypography.screenTitle, fontWeight: AppTypography.bold),
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
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppDimens.spaceMd),
          children: [
            if (widget.user.fullName != null)
              Text('Здравствуйте, ${widget.user.fullName}!',
                  style: TextStyle(
                      color: c.textPrimary, fontSize: 20, fontWeight: AppTypography.bold)),
            const SizedBox(height: AppDimens.spaceMd),

            // Вызов виджета сводки реальной аналитики
            _MiniAnalyticsWidget(colors: c),
            const SizedBox(height: AppDimens.spaceLg),

            _JoinRequestsSection(
              requests: _joinRequests,
              resolvingIds: _resolvingIds,
              onResolve: _resolveJoinRequest,
            ),
            Text('Ваши дома',
                style: TextStyle(
                    color: c.textPrimary,
                    fontSize: AppTypography.sectionTitle,
                    fontWeight: AppTypography.bold)),
            const SizedBox(height: AppDimens.spaceSm),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(AppDimens.spaceMd),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_buildings.isEmpty)
              _EmptyBuildingsCard(colors: c)
            else
              for (final b in _buildings)
                Container(
                  margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
                  padding: const EdgeInsets.all(AppDimens.spaceMd),
                  decoration: BoxDecoration(
                    color: c.card,
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    border: Border.all(color: c.cardBorder),
                  ),
                  child: Row(
                    children: [
                      Icon(LucideIcons.building2, color: c.primary),
                      const SizedBox(width: AppDimens.spaceSm),
                      Expanded(child: Text(b.address, style: TextStyle(color: c.textPrimary))),
                    ],
                  ),
                ),
            const SizedBox(height: AppDimens.spaceSm),
            OutlinedButton.icon(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ApartmentsResidentsScreen()),
                );
                if (mounted) _load();
              },
              icon: Icon(LucideIcons.users, color: c.primary),
              label: Text('Дома и жители', style: TextStyle(color: c.primary)),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, AppDimens.minTapTarget),
                side: BorderSide(color: c.primary),
              ),
            ),
            const SizedBox(height: AppDimens.spaceMd),
            Text(
              'Полное управление (финансы, отчёты, импорт квартир) — на сайте.',
              style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniAnalyticsWidget extends StatefulWidget {
  final AppColors colors;
  const _MiniAnalyticsWidget({required this.colors});

  @override
  State<_MiniAnalyticsWidget> createState() => _MiniAnalyticsWidgetState();
}

class _MiniAnalyticsWidgetState extends State<_MiniAnalyticsWidget> {
  ChairmanAnalytics? _analytics;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await AnalyticsRepository.instance.getChairmanAnalytics(period: 'month');
      if (mounted) {
        setState(() {
          _analytics = res;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.colors;
    final pctStr = _analytics != null ? '${_analytics!.finance.progressPct}%' : '—';
    final inWorkStr = _analytics != null ? '${_analytics!.requests.inProgress} шт.' : '—';

    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(LucideIcons.barChart3, color: c.primary, size: 20),
                  const SizedBox(width: AppDimens.spaceSm),
                  Text(
                    'Аналитика дома',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontWeight: AppTypography.bold,
                      fontSize: AppTypography.body,
                    ),
                  ),
                ],
              ),
              InkWell(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ChairmanAnalyticsScreen()),
                ),
                child: Text(
                  'Отчёт →',
                  style: TextStyle(
                    color: c.primary,
                    fontWeight: AppTypography.semibold,
                    fontSize: AppTypography.caption,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppDimens.spaceMd),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator()))
          else
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Сбор средств', style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                      const SizedBox(height: 2),
                      Text(pctStr, style: TextStyle(color: c.success, fontWeight: AppTypography.bold, fontSize: 18)),
                    ],
                  ),
                ),
                Container(width: 1, height: 32, color: c.cardBorder),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(left: AppDimens.spaceSm),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Заявки в работе', style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                        const SizedBox(height: 2),
                        Text(inWorkStr, style: TextStyle(color: c.warning, fontWeight: AppTypography.bold, fontSize: 18)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _JoinRequestsSection extends StatelessWidget {
  final List<PendingJoinRequest> requests;
  final Set<String> resolvingIds;
  final ValueChanged<String> onResolve;

  const _JoinRequestsSection({
    required this.requests,
    required this.resolvingIds,
    required this.onResolve,
  });

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) return const SizedBox.shrink();
    final c = AppColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(LucideIcons.userCheck, color: c.primary, size: 18),
            const SizedBox(width: AppDimens.spaceXs),
            Text('Заявки на подключение (${requests.length})',
                style: TextStyle(
                    color: c.textPrimary,
                    fontSize: AppTypography.sectionTitle,
                    fontWeight: AppTypography.bold)),
          ],
        ),
        const SizedBox(height: AppDimens.spaceSm),
        for (final r in requests)
          AppCard(
            margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(r.fullName ?? (r.email ?? r.phone ?? '—'),
                          style: TextStyle(
                              color: c.textPrimary, fontWeight: AppTypography.semibold)),
                      if (r.fullName != null && (r.email != null || r.phone != null))
                        Text(r.email ?? r.phone ?? '',
                            style:
                                TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                      if (r.note != null) ...[
                        const SizedBox(height: 4),
                        Text(r.note!,
                            style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: AppDimens.spaceSm),
                OutlinedButton(
                  onPressed: resolvingIds.contains(r.id) ? null : () => onResolve(r.id),
                  child: Text(resolvingIds.contains(r.id) ? '…' : 'Обработано'),
                ),
              ],
            ),
          ),
        const SizedBox(height: AppDimens.spaceLg),
      ],
    );
  }
}

class _EmptyBuildingsCard extends StatelessWidget {
  final AppColors colors;
  const _EmptyBuildingsCard({required this.colors});

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
      child: Row(
        children: [
          Icon(LucideIcons.building2, color: c.textTertiary),
          const SizedBox(width: AppDimens.spaceSm),
          Expanded(
            child: Text('Домов пока нет — добавьте в разделе «Дома и жители»',
                style: TextStyle(color: c.textSecondary)),
          ),
        ],
      ),
    );
  }
}

class _ChairmanMoreTab extends StatelessWidget {
  final AuthUser user;
  const _ChairmanMoreTab({required this.user});

  Future<void> _logout(BuildContext context) async {
    await AuthRepository.instance.logout();
    if (!context.mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
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
        title: Text(AppLocalizations.tr('nav_more')),
        titleTextStyle: TextStyle(
          color: c.textPrimary, 
          fontSize: AppTypography.screenTitle,
          fontWeight: AppTypography.bold,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        children: [
          // Премиум-карточка профиля председателя с фото и ФИО
          Container(
            padding: const EdgeInsets.all(AppDimens.spaceLg),
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(AppDimens.radiusLg),
              border: Border.all(color: c.cardBorder),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: c.primary.withValues(alpha: 0.15),
                  child: Text(
                    user.fullName != null && user.fullName!.isNotEmpty
                        ? user.fullName![0].toUpperCase()
                        : 'П',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: AppTypography.bold,
                      color: c.primary,
                    ),
                  ),
                ),
                const SizedBox(height: AppDimens.spaceSm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      user.fullName ?? AppLocalizations.tr('role_chairman'),
                      style: TextStyle(
                        fontSize: AppTypography.sectionTitle,
                        fontWeight: AppTypography.bold,
                        color: c.textPrimary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    IconButton(
                      icon: Icon(LucideIcons.edit2, size: 16, color: c.primary),
                      onPressed: () => _showEditNameDialog(context, user),
                      tooltip: AppLocalizations.tr('profile_edit'),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: c.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                  ),
                  child: Text(
                    AppLocalizations.tr('role_chairman'),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: AppTypography.semibold,
                      color: c.primary,
                    ),
                  ),
                ),
                const SizedBox(height: AppDimens.spaceMd),
                Divider(height: 1, color: c.cardBorder),
                const SizedBox(height: AppDimens.spaceSm),
                if (user.phone != null)
                  _row(c, LucideIcons.phone, user.phone!),
                if (user.email != null)
                  _row(c, LucideIcons.mail, user.email!),
              ],
            ),
          ),
          const SizedBox(height: AppDimens.spaceLg),

          _menuTile(
            context, 
            c, 
            LucideIcons.barChart3, 
            AppLocalizations.tr('chairman_analytics'),
            () => Navigator.push(
              context, 
              MaterialPageRoute(builder: (_) => const ChairmanAnalyticsScreen()),
            ),
          ),
          _menuTile(
            context, 
            c, 
            LucideIcons.users, 
            AppLocalizations.tr('chairman_buildings'),
            () => Navigator.push(
              context, 
              MaterialPageRoute(builder: (_) => const ApartmentsResidentsScreen()),
            ),
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
          _menuTile(
            context,
            c,
            LucideIcons.creditCard,
            AppLocalizations.tr('pricing_menu_item'),
            () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PricingScreen()),
            ),
          ),
          _menuTile(
            context,
            c,
            LucideIcons.fileText,
            'Сформировать Годовой Отчет',
            () async {
              final uri = Uri.parse('${ApiClient.instance.baseUrl}/api/reports/annual');
              if (await canLaunchUrl(uri)) {
                launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
          ),
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
            LucideIcons.shieldCheck,
            'Публичная оферта и тарифы',
            () => LegalDocsSheet.show(context, initialTab: LegalDocTab.chairman),
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
                side: BorderSide(color: c.danger.withValues(alpha: 0.4)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showEditNameDialog(BuildContext context, AuthUser user) {
    final c = AppColors.of(context);
    final ctrl = TextEditingController(text: user.fullName ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.card,
        title: Text(AppLocalizations.tr('profile_edit'), style: TextStyle(color: c.textPrimary)),
        content: TextField(
          controller: ctrl,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            labelText: AppLocalizations.tr('label_full_name'),
            labelStyle: TextStyle(color: c.textSecondary),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppLocalizations.tr('btn_cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              final newName = ctrl.text.trim();
              if (newName.isEmpty) return;
              Navigator.pop(ctx);
              try {
                await AuthRepository.instance.updateProfile(fullName: newName);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(AppLocalizations.tr('profile_updated'))),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Ошибка обновления: $e')),
                  );
                }
              }
            },
            child: Text(AppLocalizations.tr('btn_save')),
          ),
        ],
      ),
    );
  }

  Widget _row(AppColors c, IconData icon, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: c.textTertiary),
          const SizedBox(width: AppDimens.spaceSm),
          Expanded(child: Text(label, style: TextStyle(color: c.textPrimary))),
        ],
      ),
    );
  }

  Widget _menuTile(BuildContext context, AppColors c, IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
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
            Icon(icon, color: c.primary, size: 20),
            const SizedBox(width: AppDimens.spaceSm),
            Expanded(child: Text(label, style: TextStyle(color: c.textPrimary))),
            Icon(Icons.chevron_right, color: c.textTertiary, size: 18),
          ],
        ),
      ),
    );
  }
}