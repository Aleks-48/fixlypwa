import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/screens/home_router.dart';
import 'package:fixly_app/screens/create_osi_screen.dart';
import 'package:fixly_app/screens/master_application_screen.dart';

// Регистрация с выбором роли (onboarding-unified.md §0, срез R2 — запрос Рахима 2026-07-17:
// «Регистрация с выбором роли: председатель, житель или мастер»). Технически — тот же
// единственный аккаунт, что и «Вход» (auth-email.md §3, первый код сам создаёт пользователя):
// разница только в собираемых полях (роль + ФИО) и в шаге ПОСЛЕ кода — куда ведём дальше
// определяет выбранная роль, не хранимое серверное состояние (сервер роль не назначает по
// этому выбору — она возникает из действия: создал ОСИ / привязан председателем / анкета
// одобрена, REQ-137/138).
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

enum _Step { role, form, code }

class _Role {
  final String value;
  final String label;
  final IconData icon;
  const _Role(this.value, this.label, this.icon);
}

const _roles = [
  _Role('RESIDENT', 'Житель', LucideIcons.home),
  _Role('CHAIRMAN', 'Председатель', LucideIcons.building2),
  _Role('MASTER', 'Мастер', LucideIcons.wrench),
];

class _RegisterScreenState extends State<RegisterScreen> {
  _Step _step = _Step.role;
  String? _selectedRole;

  final _formKey = GlobalKey<FormState>();
  final _fullNameCtrl = TextEditingController();
  final _identifierCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();

  bool _isLoading = false;
  String? _error;
  String _identifier = '';
  String _fullName = '';
  String? _devCode;

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _identifierCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  void _pickRole(String role) {
    setState(() {
      _selectedRole = role;
      _step = _Step.form;
      _error = null;
    });
  }

  Future<void> _requestCode() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      _fullName = _fullNameCtrl.text.trim();
      _identifier = _identifierCtrl.text.trim();
      final devCode = await AuthRepository.instance.requestOtp(_identifier);
      if (mounted) {
        setState(() {
          _step = _Step.code;
          _devCode = devCode;
        });
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Ошибка подключения');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyAndRoute() async {
    final code = _codeCtrl.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Код — 6 цифр');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final user = await AuthRepository.instance.verifyOtp(_identifier, code, fullName: _fullName);
      if (!mounted) return;

      // Куда ведём ПОСЛЕ кода — по роли, выбранной на этом экране (REQ-137). Роли пользователя
      // на сервере (user.roles) в этот момент всё ещё пустые — они появятся из следующего
      // действия (создание ОСИ / привязка председателем / одобрение анкеты).
      switch (_selectedRole) {
        case 'CHAIRMAN':
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const CreateOsiScreen()),
            (_) => false,
          );
          break;
        case 'MASTER':
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => MasterApplicationScreen(prefillFullName: _fullName)),
            (_) => false,
          );
          break;
        default: // RESIDENT
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => HomeRouter(user: user)),
            (_) => false,
          );
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Ошибка подключения');
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
        iconTheme: IconThemeData(color: c.textPrimary),
        title: Text('Регистрация', style: TextStyle(color: c.textPrimary)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimens.spaceLg),
          child: switch (_step) {
            _Step.role => _roleStep(c),
            _Step.form => _formStep(c),
            _Step.code => _codeStep(c),
          },
        ),
      ),
    );
  }

  Widget _roleStep(AppColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Кто вы?',
            style: TextStyle(
                color: c.textPrimary, fontSize: 26, fontWeight: AppTypography.extraBold)),
        const SizedBox(height: 8),
        Text('Выберите роль — от неё зависит следующий шаг',
            style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body)),
        const SizedBox(height: AppDimens.spaceLg),
        for (final r in _roles)
          Padding(
            padding: const EdgeInsets.only(bottom: AppDimens.spaceSm),
            child: InkWell(
              onTap: () => _pickRole(r.value),
              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
              child: Container(
                padding: const EdgeInsets.all(AppDimens.spaceMd),
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  border: Border.all(color: c.cardBorder),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: c.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                      ),
                      child: Icon(r.icon, color: c.primary),
                    ),
                    const SizedBox(width: AppDimens.spaceMd),
                    Expanded(
                      child: Text(r.label,
                          style: TextStyle(
                              color: c.textPrimary,
                              fontSize: AppTypography.bodyLarge,
                              fontWeight: AppTypography.semibold)),
                    ),
                    Icon(Icons.chevron_right, color: c.textTertiary),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _formStep(AppColors c) {
    final roleLabel = _roles.firstWhere((r) => r.value == _selectedRole).label;
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: () => setState(() => _step = _Step.role),
            icon: Icon(Icons.arrow_back, size: 16, color: c.textSecondary),
            label: Text('$roleLabel — изменить', style: TextStyle(color: c.textSecondary)),
            style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft),
          ),
          const SizedBox(height: AppDimens.spaceMd),
          Text('Ваши данные',
              style: TextStyle(
                  color: c.textPrimary, fontSize: 24, fontWeight: AppTypography.extraBold)),
          const SizedBox(height: AppDimens.spaceLg),
          _field(
            c: c,
            controller: _fullNameCtrl,
            label: 'ФИО',
            hint: 'Иванов Иван Иванович',
            icon: LucideIcons.user,
            validator: (v) {
              final s = v?.trim() ?? '';
              if (s.length < 2) return 'Укажите ФИО';
              return null;
            },
          ),
          const SizedBox(height: AppDimens.spaceSm),
          _field(
            c: c,
            controller: _identifierCtrl,
            label: 'Телефон или email',
            hint: '+7 7XX XXX XX XX / email@example.com',
            icon: LucideIcons.atSign,
            keyboard: TextInputType.emailAddress,
            validator: (v) {
              final s = v?.trim() ?? '';
              if (s.isEmpty) return 'Укажите телефон или email';
              final looksEmail = s.contains('@') && s.split('@').last.contains('.');
              final looksPhone = s.replaceAll(RegExp(r'\D'), '').length >= 10;
              if (!looksEmail && !looksPhone) return 'Некорректный телефон или email';
              return null;
            },
          ),
          _telegramBotHint(c),
          if (_error != null) ...[
            const SizedBox(height: AppDimens.spaceSm),
            Text(_error!, style: TextStyle(color: c.danger)),
          ],
          const SizedBox(height: AppDimens.spaceLg),
          _submitButton(c, label: 'Получить код', onPressed: _isLoading ? null : _requestCode),
        ],
      ),
    );
  }

  // Постоянная ссылка на бота (REQ-009/telegram-otp.md, срез R2) — заранее открыв бота и нажав
  // «Начать», житель получает код в Telegram мгновенно вместо ожидания SMS.
  Widget _telegramBotHint(AppColors c) {
    final username = dotenv.env['TELEGRAM_BOT_USERNAME'];
    if (username == null || username.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: GestureDetector(
        onTap: () => launchUrl(Uri.parse('https://t.me/$username'),
            mode: LaunchMode.externalApplication),
        child: RichText(
          text: TextSpan(
            text: 'Входите по телефону? Заранее откройте ',
            style: TextStyle(color: c.textTertiary, fontSize: 12),
            children: [
              TextSpan(
                text: 'Telegram-бота',
                style: TextStyle(color: c.primary, fontWeight: FontWeight.w600),
              ),
              const TextSpan(text: ' и нажмите «Начать» — код придёт мгновенно.'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _codeStep(AppColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Код подтверждения',
            style: TextStyle(color: c.textPrimary, fontSize: 24, fontWeight: AppTypography.extraBold)),
        const SizedBox(height: 8),
        Text('Отправлен на $_identifier', style: TextStyle(color: c.textSecondary)),
        const SizedBox(height: AppDimens.spaceLg),
        _field(
          c: c,
          controller: _codeCtrl,
          label: 'Код из письма/SMS',
          hint: '000000',
          icon: LucideIcons.keyRound,
          keyboard: TextInputType.number,
        ),
        if (_devCode != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: c.primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('Код (dev): $_devCode', style: TextStyle(color: c.primaryLight)),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: AppDimens.spaceSm),
          Text(_error!, style: TextStyle(color: c.danger)),
        ],
        const SizedBox(height: AppDimens.spaceLg),
        _submitButton(c, label: 'Подтвердить', onPressed: _isLoading ? null : _verifyAndRoute),
      ],
    );
  }

  Widget _submitButton(AppColors c, {required String label, required VoidCallback? onPressed}) {
    return SizedBox(
      width: double.infinity,
      height: AppDimens.primaryTapTarget,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: c.primary,
          disabledBackgroundColor: c.primary.withOpacity(0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
              )
            : Text(label,
                style: const TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
      ),
    );
  }

  Widget _field({
    required AppColors c,
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboard = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
      validator: validator,
      style: TextStyle(color: c.textPrimary),
      cursorColor: c.primary,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: TextStyle(color: c.textTertiary),
        prefixIcon: Icon(icon, color: c.primary, size: 19),
        filled: true,
        fillColor: c.surfaceVariant,
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
          borderSide: BorderSide(color: c.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
