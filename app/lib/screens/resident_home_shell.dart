import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/theme_notifier.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/announcements_repository.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/announcements_screen.dart';
import 'package:fixly_app/screens/requests_screen.dart';
import 'package:fixly_app/screens/finance_screen.dart';
import 'package:fixly_app/screens/info_screen.dart';
import 'package:fixly_app/screens/notifications_screen.dart';
import 'package:fixly_app/screens/polls_screen.dart';
import 'package:fixly_app/screens/legal_docs_sheet.dart';
import 'package:fixly_app/screens/video_instructions_sheet.dart';

// Импорт подключенных экранов
import 'package:fixly_app/screens/defect_scanner_screen.dart';
import 'package:fixly_app/screens/masters_map_screen.dart';
import 'package:fixly_app/screens/pdf_receipts_screen.dart';
import 'package:fixly_app/screens/documents_screen.dart';

// ============================================================================
//  ResidentHomeShell — Оболочка жителя
//  Таб-бар: Главная / Голоса / Заявки / Финансы / Профиль.
// ============================================================================

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
                NavigationDestination(icon: const Icon(LucideIcons.home), label: AppLocalizations.tr('nav_home')),
                NavigationDestination(icon: const Icon(LucideIcons.vote), label: AppLocalizations.tr('nav_polls')),
                NavigationDestination(icon: const Icon(LucideIcons.clipboardList), label: AppLocalizations.tr('nav_requests')),
                NavigationDestination(icon: const Icon(LucideIcons.wallet), label: AppLocalizations.tr('nav_payments')),
                NavigationDestination(icon: const Icon(LucideIcons.user), label: AppLocalizations.tr('nav_profile')),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ============================================================================
//  _HomeTab — Главная страница
// ============================================================================

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
            Text(AppLocalizations.tr('quick_actions'),
                style: TextStyle(
                    color: c.textPrimary,
                    fontSize: AppTypography.sectionTitle,
                    fontWeight: AppTypography.bold)),
            const SizedBox(height: AppDimens.spaceSm),
            _QuickLinks(colors: c),
            const SizedBox(height: AppDimens.spaceLg),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(AppLocalizations.tr('nav_announcements'),
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: AppTypography.sectionTitle,
                        fontWeight: AppTypography.bold)),
                TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AnnouncementsScreen()),
                  ),
                  child: Text(AppLocalizations.tr('filter_all'), style: TextStyle(color: c.primary)),
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
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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
      (LucideIcons.scanLine, AppLocalizations.tr('ai_scanner'), () => const DefectScannerScreen()),
      (LucideIcons.wrench, AppLocalizations.tr('nav_masters'), () => const MastersMapScreen()),
      (LucideIcons.fileText, AppLocalizations.tr('pdf_receipts'), () => const PdfReceiptsScreen()),
      (LucideIcons.folderClosed, AppLocalizations.tr('nav_documents'), () => const DocumentsScreen()),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppDimens.spaceSm,
        mainAxisSpacing: AppDimens.spaceSm,
        childAspectRatio: 2.3,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => item.$3()),
          ),
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimens.spaceMd,
              vertical: AppDimens.spaceSm,
            ),
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
              border: Border.all(color: c.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: c.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                  ),
                  child: Icon(item.$1, color: c.primary, size: 20),
                ),
                const SizedBox(width: AppDimens.spaceSm),
                Expanded(
                  child: Text(
                    item.$2,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontWeight: AppTypography.semibold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ============================================================================
//  _ProfileTab — Вкладка профиля
// ============================================================================

class _ProfileTab extends StatefulWidget {
  final AuthUser user;

  const _ProfileTab({required this.user});

  @override
  State<_ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<_ProfileTab> {
  late AuthUser _currentUser;
  File? _avatarFile;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _currentUser = widget.user;
  }

  Future<void> _logout(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppLocalizations.tr('logout_title')),
        content: Text(AppLocalizations.tr('logout_confirm')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(AppLocalizations.tr('btn_cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(AppLocalizations.tr('btn_logout'), style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm != true || !context.mounted) return;

    await AuthRepository.instance.logout();
    if (!context.mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
    );
  }

  // Открытие шторки редактирования профиля
  void _openEditProfileDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _EditProfileSheet(
        user: _currentUser,
        onSave: (updatedUser) {
          setState(() => _currentUser = updatedUser);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(AppLocalizations.tr('profile_updated')),
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
      ),
    );
  }

  // Метод съемки/выбора картинки через ImagePicker
  Future<void> _pickAvatarImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );
      if (image != null) {
        setState(() {
          _avatarFile = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Не удалось загрузить фото: $e')),
        );
      }
    }
  }

  // Окно выбора источника аватарки
  void _openAvatarPicker() {
    final c = AppColors.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
        ),
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: c.textTertiary.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Text(
              AppLocalizations.tr('photo_profile'),
              style: TextStyle(
                fontSize: AppTypography.sectionTitle,
                fontWeight: AppTypography.bold,
                color: c.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Icon(LucideIcons.camera, color: c.primary),
              title: Text(AppLocalizations.tr('photo_take'), style: TextStyle(color: c.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _pickAvatarImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: Icon(LucideIcons.image, color: c.primary),
              title: Text(AppLocalizations.tr('photo_gallery'), style: TextStyle(color: c.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _pickAvatarImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openSupportDialog() {
    showDialog(
      context: context,
      builder: (ctx) => _SupportContactDialog(colors: AppColors.of(context)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    
    // Подписываемся на ThemeNotifier из Provider
    final themeNotifier = context.watch<ThemeNotifier>();
    final isDark = themeNotifier.themeMode == ThemeMode.dark;

    final String notSpecified = AppLocalizations.tr('not_specified');
    final String fullName = (_currentUser.fullName != null && _currentUser.fullName!.isNotEmpty)
        ? _currentUser.fullName!
        : notSpecified;
    final String phone = (_currentUser.phone != null && _currentUser.phone!.isNotEmpty)
        ? _currentUser.phone!
        : notSpecified;
    final String email = (_currentUser.email != null && _currentUser.email!.isNotEmpty)
        ? _currentUser.email!
        : notSpecified;

    // Название ОСИ / ЖК жителя из базы данных
    final osiName = (_currentUser.osiName != null && _currentUser.osiName!.isNotEmpty)
        ? _currentUser.osiName!
        : (_currentUser.activeOsiId != null ? 'ЖК Сарыарка (ОСИ)' : 'ОСИ / ЖК не привязано');
    
    final apartmentInfo = (_currentUser.apartmentNumber != null && _currentUser.apartmentNumber!.isNotEmpty)
        ? 'кв. ${_currentUser.apartmentNumber}${_currentUser.buildingAddress != null ? " (${_currentUser.buildingAddress})" : ""}'
        : (_currentUser.activeOsiId != null ? 'кв. 42' : notSpecified);

    final String avatarInitial = (fullName != notSpecified) ? fullName[0].toUpperCase() : '?';

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
            icon: Icon(LucideIcons.userCog, color: c.primary),
            tooltip: AppLocalizations.tr('profile_edit'),
            onPressed: _openEditProfileDialog,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        children: [
          // Аватарка
          Center(
            child: Column(
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 46,
                      backgroundColor: c.primary.withValues(alpha: 0.18),
                      backgroundImage: _avatarFile != null ? FileImage(_avatarFile!) : null,
                      child: _avatarFile == null
                          ? Text(
                              avatarInitial,
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: AppTypography.bold,
                                color: c.primary,
                              ),
                            )
                          : null,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: _openAvatarPicker,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: c.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: c.background, width: 2),
                          ),
                          child: const Icon(LucideIcons.camera, size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppDimens.spaceSm),
                Text(
                  fullName,
                  style: TextStyle(
                    fontSize: AppTypography.sectionTitle,
                    fontWeight: AppTypography.bold,
                    color: c.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: c.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                  ),
                  child: Text(
                    osiName,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: AppTypography.semibold,
                      color: c.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppDimens.spaceLg),

          // Данные пользователя
          Text(
            AppLocalizations.tr('profile_resident_data'),
            style: TextStyle(
              color: c.textSecondary,
              fontSize: AppTypography.caption,
              fontWeight: AppTypography.semibold,
            ),
          ),
          const SizedBox(height: AppDimens.spaceSm),
          Container(
            padding: const EdgeInsets.all(AppDimens.spaceMd),
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
              border: Border.all(color: c.cardBorder),
            ),
            child: Column(
              children: [
                _InfoRow(icon: LucideIcons.building, title: AppLocalizations.tr('profile_osi'), value: osiName, colors: c),
                const Divider(height: 16),
                _InfoRow(icon: LucideIcons.home, title: AppLocalizations.tr('profile_address'), value: apartmentInfo, colors: c),
                const Divider(height: 16),
                _InfoRow(icon: LucideIcons.phone, title: AppLocalizations.tr('profile_phone'), value: phone, colors: c),
                const Divider(height: 16),
                _InfoRow(icon: LucideIcons.mail, title: AppLocalizations.tr('profile_email'), value: email, colors: c),
              ],
            ),
          ),

          const SizedBox(height: AppDimens.spaceLg),

          // Настройки
          Text(
            AppLocalizations.tr('nav_settings'),
            style: TextStyle(
              color: c.textSecondary,
              fontSize: AppTypography.caption,
              fontWeight: AppTypography.semibold,
            ),
          ),
          const SizedBox(height: AppDimens.spaceSm),

          // Переключатель тёмной темы
          Container(
            margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
              border: Border.all(color: c.cardBorder),
            ),
            child: SwitchListTile(
              secondary: Icon(
                isDark ? LucideIcons.moon : LucideIcons.sun,
                color: c.primary,
              ),
              title: Text(
                AppLocalizations.tr('dark_theme'),
                style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.regular),
              ),
              value: isDark,
              onChanged: (val) {
                context.read<ThemeNotifier>().toggleTheme(val);
              },
            ),
          ),

          // Переключатель языка (RU / KK / EN)
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

          _MenuTile(
            icon: LucideIcons.info,
            label: AppLocalizations.tr('profile_house_info'),
            colors: c,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const InfoScreen()),
            ),
          ),
          _MenuTile(
            icon: LucideIcons.bell,
            label: AppLocalizations.tr('profile_notifications'),
            colors: c,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
          _MenuTile(
            icon: LucideIcons.playCircle,
            label: appLanguage.value == 'kk' ? 'Бейненұсқаулықтар' : (appLanguage.value == 'en' ? 'Video Tutorials' : 'Видеоинструкции'),
            colors: c,
            onTap: () => VideoInstructionsSheet.show(context),
          ),
          _MenuTile(
            icon: LucideIcons.fileText,
            label: 'Публичная оферта и правила',
            colors: c,
            onTap: () => LegalDocsSheet.show(context, initialTab: LegalDocTab.resident),
          ),
          _MenuTile(
            icon: LucideIcons.headphones,
            label: AppLocalizations.tr('profile_support'),
            colors: c,
            onTap: _openSupportDialog,
          ),

          const SizedBox(height: AppDimens.spaceLg),

          // Выход
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
}

// ───────────────────── Вспомогательные компоненты ─────────────────────

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final AppColors colors;

  const _InfoRow({
    required this.icon,
    required this.title,
    required this.value,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: colors.primary),
        const SizedBox(width: AppDimens.spaceSm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontSize: 11, color: colors.textTertiary)),
              const SizedBox(height: 2),
              Text(value, style: TextStyle(fontSize: 14, color: colors.textPrimary, fontWeight: AppTypography.semibold)),
            ],
          ),
        ),
      ],
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppColors colors;
  final VoidCallback onTap;

  const _MenuTile({
    required this.icon,
    required this.label,
    required this.colors,
    required this.onTap,
  });

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
            Expanded(
              child: Text(
                label,
                style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.regular),
              ),
            ),
            Icon(Icons.chevron_right, color: c.textTertiary, size: 18),
          ],
        ),
      ),
    );
  }
}

class _EditProfileSheet extends StatefulWidget {
  final AuthUser user;
  final Function(AuthUser) onSave;

  const _EditProfileSheet({required this.user, required this.onSave});

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _emailCtrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.user.fullName);
    _phoneCtrl = TextEditingController(text: widget.user.phone);
    _emailCtrl = TextEditingController(text: widget.user.email);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      padding: EdgeInsets.only(
        left: AppDimens.spaceMd,
        right: AppDimens.spaceMd,
        top: AppDimens.spaceSm,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppDimens.spaceMd,
      ),
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
            AppLocalizations.tr('profile_edit'),
            style: TextStyle(
              fontSize: AppTypography.sectionTitle,
              fontWeight: AppTypography.bold,
              color: c.textPrimary,
            ),
          ),
          const SizedBox(height: AppDimens.spaceMd),
          TextField(
            controller: _nameCtrl,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              labelText: AppLocalizations.tr('label_full_name'),
              prefixIcon: const Icon(LucideIcons.user),
            ),
          ),
          const SizedBox(height: AppDimens.spaceSm),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            enabled: false, // Телефон — логин, не меняется
            style: TextStyle(color: c.textSecondary),
            decoration: InputDecoration(
              labelText: AppLocalizations.tr('profile_phone'),
              prefixIcon: const Icon(LucideIcons.phone),
            ),
          ),
          const SizedBox(height: AppDimens.spaceSm),
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              labelText: AppLocalizations.tr('profile_email'),
              prefixIcon: const Icon(LucideIcons.mail),
            ),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          SizedBox(
            width: double.infinity,
            height: AppDimens.primaryTapTarget,
            child: _SaveProfileButton(nameCtrl: _nameCtrl, emailCtrl: _emailCtrl, user: widget.user, onSave: widget.onSave),
          )
        ],
      ),
    );
  }
}

class _SupportContactDialog extends StatelessWidget {
  final AppColors colors;

  const _SupportContactDialog({required this.colors});

  Future<void> _openUrl(BuildContext context, String urlStr) async {
    final uri = Uri.parse(urlStr);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppLocalizations.tr('support_open_error'))),
          );
        }
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.tr('support_link_error'))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return AlertDialog(
      backgroundColor: c.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
      ),
      title: Row(
        children: [
          Icon(LucideIcons.headphones, color: c.primary),
          const SizedBox(width: 8),
          Text(
            AppLocalizations.tr('profile_support'),
            style: TextStyle(
              color: c.textPrimary,
              fontSize: AppTypography.sectionTitle,
              fontWeight: AppTypography.bold,
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(LucideIcons.messageSquare, color: Colors.blue),
            title: Text(AppLocalizations.tr('support_telegram_chat'), style: TextStyle(color: c.textPrimary)),
            subtitle: const Text('@fixlyosibot'),
            onTap: () {
              Navigator.pop(context);
              _openUrl(context, 'https://t.me/fixlyosibot');
            },
          ),
          ListTile(
            leading: const Icon(LucideIcons.phoneCall, color: Colors.green),
            title: Text('WhatsApp', style: TextStyle(color: c.textPrimary)),
            subtitle: const Text('+7 (705) 596-64-86'),
            onTap: () {
              Navigator.pop(context);
              _openUrl(context, 'https://wa.me/77055966486');
            },
          ),
          ListTile(
            leading: const Icon(LucideIcons.mail, color: Colors.orange),
            title: Text(AppLocalizations.tr('support_email_dev'), style: TextStyle(color: c.textPrimary)),
            subtitle: const Text('fixly.support@gmail.com'),
            onTap: () {
              Navigator.pop(context);
              _openUrl(
                context,
                'mailto:fixly.support@gmail.com',
              );
            },
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(AppLocalizations.tr('btn_close'), style: TextStyle(color: c.primary)),
        )
      ],
    );
  }
}

// Кнопка сохранения профиля с реальным API-запросом
class _SaveProfileButton extends StatefulWidget {
  final TextEditingController nameCtrl;
  final TextEditingController emailCtrl;
  final AuthUser user;
  final Function(AuthUser) onSave;

  const _SaveProfileButton({
    required this.nameCtrl,
    required this.emailCtrl,
    required this.user,
    required this.onSave,
  });

  @override
  State<_SaveProfileButton> createState() => _SaveProfileButtonState();
}

class _SaveProfileButtonState extends State<_SaveProfileButton> {
  bool _saving = false;

  Future<void> _save() async {
    final name = widget.nameCtrl.text.trim();
    if (name.length < 2) return;
    setState(() => _saving = true);
    try {
      await AuthRepository.instance.updateProfile(fullName: name);
      // Also update email via /api/profile PATCH
      final email = widget.emailCtrl.text.trim();
      if (email.isNotEmpty) {
        await ApiClient.instance.patch('/api/profile', body: {
          'fullName': name,
          'email': email,
        });
      }
      final updated = AuthUser(
        id: widget.user.id,
        roles: widget.user.roles,
        fullName: name,
        phone: widget.user.phone,
        email: email.isNotEmpty ? email : widget.user.email,
        activeOsiId: widget.user.activeOsiId,
      );
      widget.onSave(updated);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: _saving ? null : _save,
      child: _saving
          ? const SizedBox(
              width: 20, height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : Text(AppLocalizations.tr('btn_save')),
    );
  }
}
