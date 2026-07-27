import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/chairman_requests_screen.dart';
import 'package:fixly_app/screens/chairman_announcements_screen.dart';
import 'package:fixly_app/screens/apartments_residents_screen.dart';
import 'package:fixly_app/screens/notifications_screen.dart';
import 'package:fixly_app/screens/feature_catalog_list.dart';
import 'package:fixly_app/screens/chairman_polls_screen.dart';

// Оболочка председателя (REQ-143, ревизия REQ-121 — срез R2; таб «Голоса» — срез 23):
// оперативные функции в приложении (заявки дома, объявления, голосования, уведомления);
// управление (финансы, отчёты, импорт) — на сайте (REQ-145). Таб-бар: Главная / Заявки /
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
    // Живые обновления (срез 24) — один коннект на всё время сессии председателя в приложении.
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
            NavigationDestination(icon: Icon(LucideIcons.layoutDashboard), label: 'Главная'),
            NavigationDestination(icon: Icon(LucideIcons.clipboardList), label: 'Заявки'),
            NavigationDestination(icon: Icon(LucideIcons.megaphone), label: 'Объявления'),
            NavigationDestination(icon: Icon(LucideIcons.vote), label: 'Голоса'),
            NavigationDestination(icon: Icon(LucideIcons.moreHorizontal), label: 'Ещё'),
          ],
        ),
      ),
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

  // Дома и заявки на подключение грузятся вместе (review 2026-07-22: раньше панель заявок
  // читала себя один раз в своём initState и не обновлялась вместе с pull-to-refresh родителя —
  // после привязки жителя список оставался неактуальным до перезахода в приложение).
  Future<void> _load() async {
    try {
      final results = await Future.wait([
        OsiRepository.instance.listBuildings(),
        OsiRepository.instance.listOsiJoinRequests(),
      ]);
      if (mounted) {
        setState(() {
          _buildings = results[0] as List<Building>;
          _joinRequests = results[1] as List<PendingJoinRequest>;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
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

// Заявки на подключение (REQ-152/153, docs/specs/osi-join-request.md — портировано с веба,
// JoinRequestsPanel.tsx): контакт заявителя + пометка, привязку к квартире председатель делает
// как раньше (ApartmentsResidentsScreen → «Житель» → поиск по телефону/email), «Обработано»
// только снимает заявку со списка.
// Stateless (review 2026-07-22) — данные и обработчик приходят от _ChairmanHomeTabState, чтобы
// pull-to-refresh родителя обновлял и список заявок, а не только дома.
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
        title: const Text('Ещё'),
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
                  _row(c, LucideIcons.user, user.fullName!),
                if (user.email != null)
                  _row(c, LucideIcons.mail, user.email!),
                if (user.phone != null)
                  _row(c, LucideIcons.phone, user.phone!),
              ],
            ),
          ),
          const SizedBox(height: AppDimens.spaceMd),
          _menuTile(context, c, LucideIcons.users, 'Дома и жители',
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ApartmentsResidentsScreen()))),
          _menuTile(context, c, LucideIcons.bell, 'Уведомления',
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))),
          const SizedBox(height: AppDimens.spaceLg),
          const FeatureCatalogSection(isChairman: true),
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