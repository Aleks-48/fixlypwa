import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/screens/login_page.dart';

// Статус анкеты мастера вне APPROVED (REQ-148, срез 25) — тот же смысл, что «на проверке» в
// master_application_screen.dart (сразу после отправки формы), но теперь достижим ПОВТОРНО
// после перезапуска приложения: там это было состояние формы в памяти, здесь — перечитывается
// через GET /api/master/me при каждом заходе HomeRouter'а.
class MasterStatusScreen extends StatefulWidget {
  final MasterProfile master;
  const MasterStatusScreen({super.key, required this.master});

  @override
  State<MasterStatusScreen> createState() => _MasterStatusScreenState();
}

class _MasterStatusScreenState extends State<MasterStatusScreen> {
  bool _loggingOut = false;

  Future<void> _logout() async {
    if (_loggingOut) return;
    setState(() => _loggingOut = true);
    try {
      await AuthRepository.instance.logout();
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginPage()),
        (_) => false,
      );
    } finally {
      if (mounted) setState(() => _loggingOut = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final master = widget.master;
    final (icon, iconColor, title, message) = switch (master.status) {
      'REJECTED' => (
          Icons.report_gmailerrorred,
          c.danger,
          'Анкета отклонена',
          'Свяжитесь с поддержкой, чтобы уточнить причину.',
        ),
      'BLOCKED' => (
          Icons.block,
          c.danger,
          'Аккаунт заблокирован',
          'Свяжитесь с поддержкой.',
        ),
      _ => (
          Icons.access_time,
          c.warning,
          'Анкета на проверке',
          'Мы проверим анкету и откроем доступ к заказам вашего города. '
              'Обычно это занимает немного времени.',
        ),
    };

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('Мастер'),
        actions: [
          IconButton(
            icon: Icon(Icons.logout, color: c.textPrimary),
            onPressed: _loggingOut ? null : _logout,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimens.spaceLg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 48, color: iconColor),
              const SizedBox(height: AppDimens.spaceMd),
              Text(title,
                  textAlign: TextAlign.center,
                  style:
                      TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: AppTypography.bold)),
              const SizedBox(height: AppDimens.spaceSm),
              Text('${master.fullName} · ${master.city}',
                  textAlign: TextAlign.center, style: TextStyle(color: c.textTertiary)),
              const SizedBox(height: AppDimens.spaceSm),
              Text(message, textAlign: TextAlign.center, style: TextStyle(color: c.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }
}
