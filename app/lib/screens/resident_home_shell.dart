import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/announcements_repository.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/announcements_screen.dart';
import 'package:fixly_app/screens/requests_screen.dart';
import 'package:fixly_app/screens/finance_screen.dart';
import 'package:fixly_app/screens/info_screen.dart';
import 'package:fixly_app/screens/notifications_screen.dart';
import 'package:fixly_app/screens/feature_catalog_list.dart';
import 'package:fixly_app/screens/polls_screen.dart';

// Оболочка жителя (mobile-app.md §4, срез 22; таб «Голоса» — срез 23) — заменяет
// main_wrapper.dart/resident_home_page.dart для роли RESIDENT. Таб-бар: Главная / Голоса /
// Заявки / Финансы / Профиль (Объявления и Инфо — с главной и из профиля, не отдельные табы).
class ResidentHomeShell extends StatefulWidget {
  final AuthUser user;
  const ResidentHomeShell({super.key, required this.user});

  @override
  State<ResidentHomeShell> createState() => _ResidentHomeShellState();
}

class _ResidentHomeShellState extends State<ResidentHomeShell> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    // Живые обновления (срез 24) — один коннект на всё время сессии жителя в приложении,
    // разрывается при выходе на LoginPage (эта оболочка тогда уходит с дерева виджетов).
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
      _HomeTab(user: widget.user),
      const PollsScreen(),
      const RequestsScreen(),
      const FinanceScreen(),
      _ProfileTab(user: widget.user),
    ];

    return Scaffold(
      backgroundColor: c.background,
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          backgroundColor: c.card,
          indicatorColor: c.primary.withOpacity(0.15),
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
          destinations: const [
            NavigationDestination(icon: Icon(LucideIcons.home), label: 'Главная'),
            NavigationDestination(icon: Icon(LucideIcons.vote), label: 'Голоса'),
            NavigationDestination(icon: Icon(LucideIcons.clipboardList), label: 'Заявки'),
            NavigationDestination(icon: Icon(LucideIcons.wallet), label: 'Финансы'),
            NavigationDestination(icon: Icon(LucideIcons.user), label: 'Профиль'),
          ],
        ),
      ),
    );
  }
}

class _HomeTab extends StatefulWidget {
  final AuthUser user;
  const _HomeTab({required this.user});

  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  List<Announcement> _recent = [];
  bool _loading = true;
  StreamSubscription<SseEvent>? _sub;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = EventsRepository.instance.stream.listen((e) {
      if (e.entityType == 'announcement') {
        _debounce?.cancel();
        _debounce = Timer(const Duration(milliseconds: 500), _load);
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final all = await AnnouncementsRepository.instance.list();
      if (!mounted) return;
      setState(() {
        _recent = all.take(3).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
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
            _QuickLinks(colors: c),
            const SizedBox(height: AppDimens.spaceLg),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Объявления',
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: AppTypography.sectionTitle,
                        fontWeight: AppTypography.bold)),
                TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AnnouncementsScreen()),
                  ),
                  child: Text('Все', style: TextStyle(color: c.primary)),
                ),
              ],
            ),
            const SizedBox(height: AppDimens.spaceSm),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(AppDimens.spaceMd),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_recent.isEmpty)
              Text('Объявлений пока нет', style: TextStyle(color: c.textTertiary))
            else
              for (final a in _recent)
                Container(
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
                      Text(a.title,
                          style: TextStyle(
                              color: c.textPrimary, fontWeight: AppTypography.semibold)),
                      const SizedBox(height: 4),
                      Text(a.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: c.textSecondary)),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _QuickLinks extends StatelessWidget {
  final AppColors colors;
  const _QuickLinks({required this.colors});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    final items = [
      (LucideIcons.info, 'Инфо о доме', () => const InfoScreen()),
    ];
    return Row(
      children: items
          .map((it) => Expanded(
                child: InkWell(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => it.$3()),
                  ),
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  child: Container(
                    padding: const EdgeInsets.all(AppDimens.spaceMd),
                    decoration: BoxDecoration(
                      color: c.card,
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                      border: Border.all(color: c.cardBorder),
                    ),
                    child: Column(
                      children: [
                        Icon(it.$1, color: c.primary),
                        const SizedBox(height: 6),
                        Text(it.$2,
                            textAlign: TextAlign.center,
                            style: TextStyle(color: c.textSecondary, fontSize: AppTypography.caption)),
                      ],
                    ),
                  ),
                ),
              ))
          .toList(),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final AuthUser user;
  const _ProfileTab({required this.user});

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
        title: const Text('Профиль'),
        titleTextStyle: TextStyle(color: c.textPrimary, fontSize: AppTypography.screenTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        children: [
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
                if (user.fullName != null)
                  _Row(icon: LucideIcons.user, label: user.fullName!, colors: c),
                if (user.email != null)
                  _Row(icon: LucideIcons.mail, label: user.email!, colors: c),
                if (user.phone != null)
                  _Row(icon: LucideIcons.phone, label: user.phone!, colors: c),
              ],
            ),
          ),
          const SizedBox(height: AppDimens.spaceMd),
          _MenuTile(
            icon: LucideIcons.info,
            label: 'Инфо о доме',
            colors: c,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InfoScreen())),
          ),
          _MenuTile(
            icon: LucideIcons.bell,
            label: 'Уведомления',
            colors: c,
            onTap: () =>
                Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          const FeatureCatalogSection(isChairman: false),
          const SizedBox(height: AppDimens.spaceMd),
          SizedBox(
            height: AppDimens.primaryTapTarget,
            child: OutlinedButton.icon(
              onPressed: () => _logout(context),
              icon: Icon(LucideIcons.logOut, color: c.danger),
              label: Text('Выйти', style: TextStyle(color: c.danger)),
              style: OutlinedButton.styleFrom(side: BorderSide(color: c.danger.withOpacity(0.4))),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppColors colors;
  const _Row({required this.icon, required this.label, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: colors.textTertiary),
          const SizedBox(width: AppDimens.spaceSm),
          Expanded(
            child: Text(label, style: TextStyle(color: colors.textPrimary)),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppColors colors;
  final VoidCallback onTap;
  const _MenuTile({required this.icon, required this.label, required this.colors, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = colors;
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