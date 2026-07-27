import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/master_listings_screen.dart';
import 'package:fixly_app/screens/master_offers_screen.dart';
import 'package:fixly_app/screens/feature_catalog_list.dart';

// Оболочка мастера (ADR-0009, marketplace.md §6, срез 25) — САМОСТОЯТЕЛЬНЫЙ shell, не
// привязанный к ОСИ: Master — identity вне тенантов (в отличие от Resident/Chairman, у
// которых есть UserOsiRole). Таб-бар: Заказы / Мои отклики / Профиль.
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
            NavigationDestination(icon: Icon(LucideIcons.briefcase), label: 'Заказы'),
            NavigationDestination(icon: Icon(LucideIcons.messageSquare), label: 'Отклики'),
            NavigationDestination(icon: Icon(LucideIcons.user), label: 'Профиль'),
          ],
        ),
      ),
    );
  }
}

class _MasterProfileTab extends StatelessWidget {
  final AuthUser user;
  final MasterProfile master;
  const _MasterProfileTab({required this.user, required this.master});

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
        title: const Text('Профиль мастера'),
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
                Text(master.fullName,
                    style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.semibold)),
                const SizedBox(height: 6),
                _row(c, LucideIcons.mapPin, master.city),
                if (user.email != null) _row(c, LucideIcons.mail, user.email!),
                if (user.phone != null) _row(c, LucideIcons.phone, user.phone!),
                const SizedBox(height: AppDimens.spaceSm),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: master.categories
                      .map((cat) => Chip(
                            label: Text(requestCategoryLabels[cat] ?? cat),
                            backgroundColor: c.surfaceVariant,
                            labelStyle: TextStyle(color: c.textSecondary, fontSize: AppTypography.caption),
                            side: BorderSide(color: c.cardBorder),
                          ))
                      .toList(),
                ),
              ],
            ),
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

  Widget _row(AppColors c, IconData icon, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: c.textTertiary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label, style: TextStyle(color: c.textSecondary)),
          ),
        ],
      ),
    );
  }
}