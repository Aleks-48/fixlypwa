import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:fixly_app/main.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/screens/home_router.dart';
import 'package:fixly_app/screens/register_screen.dart';
import 'package:fixly_app/screens/legal_docs_sheet.dart';
import 'package:fixly_app/screens/video_instructions_sheet.dart';
import 'package:lucide_icons/lucide_icons.dart';

// ============================================================
//  LoginPage — экран входа (срез 21, ADR-0012 §4; палитра — U3, срез R2)
//  • Телефон/email + одноразовый код (та же схема, что у жителя на сайте, auth-email.md)
//  • Пароль и Google/Apple Sign-In убраны на время миграции (Q-059) — вернутся отдельным
//    срезом при подтверждённом спросе, вход тогда будет через свой OAuth в fixlypwa.
//  • «Регистрация» — отдельный экран с выбором роли (register_screen.dart, срез R2):
//    технически тот же аккаунт (auth-email.md §3), но собирает ФИО+роль и ведёт по шагу роли.
// ============================================================
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

enum _AuthMode { code, password }
enum _Step { identifier, code }

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin {
  final _identifierCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  _AuthMode _authMode = _AuthMode.code; // code (жители/мастера) или password (председатели)
  _Step _step = _Step.identifier;
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  String _identifier = '';
  String? _devCode; // приходит ТОЛЬКО в dev (OTP_DEV_ECHO=1) — подсказка для локального теста

  late AnimationController _animCtrl;
  late List<Animation<double>> _fadeAnims;
  late List<Animation<Offset>> _slideAnims;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _animCtrl.forward();
  }

  void _setupAnimations() {
    _animCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200));

    final intervals = [
      const Interval(0.0, 0.4),
      const Interval(0.1, 0.5),
      const Interval(0.2, 0.6),
      const Interval(0.3, 0.7),
      const Interval(0.4, 0.8),
    ];

    _fadeAnims =
        intervals.map((i) => CurvedAnimation(parent: _animCtrl, curve: i)).toList();

    _slideAnims = intervals
        .map((i) => Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero).animate(
            CurvedAnimation(
                parent: _animCtrl,
                curve: Interval(i.begin, i.end, curve: Curves.easeOutCubic))))
        .toList();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _identifierCtrl.dispose();
    _codeCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  // ── ВХОД ПРЕДСЕДАТЕЛЯ ПО ПАРОЛЮ ─────────────────────────────
  Future<void> _loginWithPassword() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final email = _identifierCtrl.text.trim();
      final password = _passwordCtrl.text;
      final user = await AuthRepository.instance.loginWithPassword(email, password);
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => HomeRouter(user: user)),
          (_) => false,
        );
      }
    } on ApiException catch (e) {
      _showError(_localizeError(e));
    } catch (_) {
      _showError(appLanguage.value == 'ru' ? 'Ошибка подключения' : 'Байланыс қатесі');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── ШАГ 1: запросить код ──────────────────────────────────
  Future<void> _requestCode() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      _identifier = _identifierCtrl.text.trim();
      final devCode = await AuthRepository.instance.requestOtp(_identifier);
      if (mounted) {
        setState(() {
          _step = _Step.code;
          _devCode = devCode;
        });
      }
    } on ApiException catch (e) {
      _showError(_localizeError(e));
    } catch (_) {
      _showError(appLanguage.value == 'ru' ? 'Ошибка подключения' : 'Байланыс қатесі');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── ШАГ 2: проверить код ──────────────────────────────────
  Future<void> _verifyCode() async {
    final code = _codeCtrl.text.trim();
    if (code.length != 6) {
      _showError(appLanguage.value == 'ru' ? 'Код — 6 цифр' : 'Код — 6 сан');
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = await AuthRepository.instance.verifyOtp(_identifier, code);
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => HomeRouter(user: user)),
          (_) => false,
        );
      }
    } on ApiException catch (e) {
      _showError(_localizeError(e));
    } catch (_) {
      _showError(appLanguage.value == 'ru' ? 'Ошибка подключения' : 'Байланыс қатесі');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String msg) {
    if (mounted) setState(() => _errorMessage = msg);
  }

  // Локализация серверных ошибок ПО КОДУ, не по тексту: сервер отвечает по-русски, а экран
  // двуязычный — казахоязычный пользователь не должен видеть русские строки (code review
  // 2026-07-16, замена удалённого _mapAuthError). Неизвестный код — показываем текст сервера.
  String _localizeError(ApiException e) {
    final ru = appLanguage.value == 'ru';
    switch (e.code) {
      case 'RATE_LIMITED':
        return ru ? 'Слишком много попыток. Попробуйте позже' : 'Тым көп әрекет. Кейінірек көріңіз';
      case 'SMS_UNAVAILABLE':
        return ru
            ? 'Вход по SMS временно недоступен — используйте email'
            : 'SMS арқылы кіру уақытша қолжетімсіз — email қолданыңыз';
      case 'NETWORK_ERROR':
        return ru ? 'Нет соединения с сервером' : 'Сервермен байланыс жоқ';
      case 'BAD_RESPONSE':
        return ru ? 'Некорректный ответ сервера' : 'Сервер жауабы дұрыс емес';
      case 'VALIDATION':
        // Тексты VALIDATION с сервера контекстные («Код истёк» и т.п.) — для ru показываем
        // как есть; для kz даём общий перевод, пока у сервера нет локализации (эпик i18n).
        return ru ? e.message : 'Код қате немесе мерзімі өткен. Жаңа код сұраңыз';
      default:
        return e.message;
    }
  }

  // ── BUILD ──────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return ValueListenableBuilder<String>(
      valueListenable: appLanguage,
      builder: (context, lang, _) {
        return Scaffold(
          backgroundColor: c.background,
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 48),
                    _animated(0, child: _logo(c)),
                    const SizedBox(height: 32),
                    _animated(1, child: _title(lang, c)),
                    const SizedBox(height: 24),
                    _animated(1, child: _authModeToggle(lang, c)),
                    const SizedBox(height: 24),
                    if (_authMode == _AuthMode.password) ..._passwordStep(lang, c),
                    if (_authMode == _AuthMode.code && _step == _Step.identifier) ..._identifierStep(lang, c),
                    if (_authMode == _AuthMode.code && _step == _Step.code) ..._codeStep(lang, c),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 12),
                      _errorBanner(c),
                    ],
                    const SizedBox(height: 20),
                    _animated(4, child: _submitButton(lang, c)),
                    const SizedBox(height: 8),
                    if (_step == _Step.identifier || _authMode == _AuthMode.password) _animated(4, child: _videoInstructionsLink(lang, c)),
                    const SizedBox(height: 8),
                    if (_step == _Step.identifier || _authMode == _AuthMode.password) _animated(4, child: _legalConsent(lang, c)),
                    const SizedBox(height: 24),
                    if (_step == _Step.identifier || _authMode == _AuthMode.password) _animated(4, child: _registerLink(lang, c)),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _logo(AppColors c) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: LinearGradient(
              colors: [c.gradientStart, c.gradientEnd],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Center(
            child: Text('F',
                style: TextStyle(
                    color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
          ),
        ),
        const SizedBox(width: 12),
        Text('Fixly',
            style: TextStyle(
                color: c.textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5)),
      ],
    );
  }

  Widget _title(String lang, AppColors c) {
    final subtitle = _step == _Step.identifier
        ? (lang == 'en' ? 'Log in to your account' : (lang == 'kk' ? 'Есептік жазбаңызға кіріңіз' : 'Войдите в свой аккаунт'))
        : (lang == 'en'
            ? 'Verification code sent to $_identifier'
            : (lang == 'kk' ? '$_identifier мекенжайына код жіберілді' : 'Код отправлен на $_identifier'));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          lang == 'en' ? 'Welcome\nback!' : (lang == 'kk' ? 'Қош\nкелдіңіз!' : 'Добро\nпожаловать!'),
          style: TextStyle(
            color: c.textPrimary,
            fontSize: 38,
            fontWeight: FontWeight.w800,
            height: 1.1,
            letterSpacing: -1.0,
          ),
        ),
        const SizedBox(height: 8),
        Text(subtitle, style: TextStyle(color: c.textSecondary, fontSize: 15)),
      ],
    );
  }

  List<Widget> _identifierStep(String lang, AppColors c) {
    return [
      _animated(
        2,
        child: _buildTextField(
          c: c,
          controller: _identifierCtrl,
          label: lang == 'en' ? 'Phone or email' : (lang == 'kk' ? 'Телефон немесе email' : 'Телефон или email'),
          hint: '+7 7XX XXX XX XX / email@example.com',
          icon: LucideIcons.user,
          keyboard: TextInputType.emailAddress,
          validator: (v) {
            final s = v?.trim() ?? '';
            if (s.isEmpty) {
              return lang == 'en' ? 'Enter phone or email' : (lang == 'kk' ? 'Телефон/email енгізіңіз' : 'Укажите телефон или email');
            }
            final looksEmail = s.contains('@') && s.split('@').last.contains('.');
            final looksPhone = s.replaceAll(RegExp(r'\D'), '').length >= 10;
            if (!looksEmail && !looksPhone) {
              return lang == 'en'
                  ? 'Invalid phone or email'
                  : (lang == 'kk' ? 'Телефон немесе email дұрыс емес' : 'Некорректный телефон или email');
            }
            return null;
          },
        ),
      ),
      _telegramBotHint(lang, c),
    ];
  }

  Widget _telegramBotHint(String lang, AppColors c) {
    final username = dotenv.env['TELEGRAM_BOT_USERNAME'];
    if (username == null || username.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: GestureDetector(
        onTap: () => launchUrl(Uri.parse('https://t.me/$username'),
            mode: LaunchMode.externalApplication),
        child: RichText(
          text: TextSpan(
            text: lang == 'en' ? 'Logging in with phone? Open ' : (lang == 'kk' ? 'Телефон арқылы кіресіз бе? Алдын ала ' : 'Входите по телефону? Заранее откройте '),
            style: TextStyle(color: c.textTertiary, fontSize: 12),
            children: [
              TextSpan(
                text: lang == 'en' ? 'Telegram bot' : (lang == 'kk' ? 'Telegram-ботты ашыңыз' : 'Telegram-бота'),
                style: TextStyle(color: c.primary, fontWeight: FontWeight.w600),
              ),
              TextSpan(
                text: lang == 'en'
                    ? ' and press "Start" — code arrives instantly.'
                    : (lang == 'kk' ? ' және «Бастау» батырмасын басыңыз.' : ' и нажмите «Начать» — код придёт мгновенно.'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _codeStep(String lang, AppColors c) {
    return [
      _animated(
        2,
        child: _buildTextField(
          c: c,
          controller: _codeCtrl,
          label: lang == 'en' ? 'Verification code' : (lang == 'kk' ? 'Хат/SMS коды' : 'Код из письма/SMS'),
          hint: '000000',
          icon: LucideIcons.keyRound,
          keyboard: TextInputType.number,
        ),
      ),
      if (_devCode != null) ...[
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: c.primary.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            'Code (dev): $_devCode',
            style: TextStyle(color: c.primaryLight, fontSize: 13),
          ),
        ),
      ],
      const SizedBox(height: 8),
      _animated(
        3,
        child: GestureDetector(
          onTap: () => setState(() {
            _step = _Step.identifier;
            _codeCtrl.clear();
            _errorMessage = null;
            _devCode = null;
          }),
          child: Text(
            lang == 'en' ? '← Change phone/email' : (lang == 'kk' ? '← Телефон/email өзгерту' : '← Изменить телефон/email'),
            style: TextStyle(color: c.primary, fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    ];
  }

  Widget _errorBanner(AppColors c) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.danger.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.danger.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(LucideIcons.alertCircle, color: c.danger, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(_errorMessage!, style: TextStyle(color: c.danger, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _authModeToggle(String lang, AppColors c) {
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.cardBorder),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _authMode = _AuthMode.code;
                  _errorMessage = null;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _authMode == _AuthMode.code ? c.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Text(
                  lang == 'en' ? 'Telegram / OTP' : (lang == 'kk' ? 'Telegram / Код' : 'По коду / Telegram'),
                  style: TextStyle(
                    color: _authMode == _AuthMode.code ? Colors.white : c.textSecondary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _authMode = _AuthMode.password;
                  _errorMessage = null;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _authMode == _AuthMode.password ? c.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Text(
                  lang == 'en' ? 'Chairman (Password)' : (lang == 'kk' ? 'Төраға (Құпиясөз)' : 'Председатель (Пароль)'),
                  style: TextStyle(
                    color: _authMode == _AuthMode.password ? Colors.white : c.textSecondary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _passwordStep(String lang, AppColors c) {
    return [
      _animated(
        2,
        child: _buildTextField(
          c: c,
          controller: _identifierCtrl,
          label: 'Email',
          hint: 'chairman@fixly.kz',
          icon: LucideIcons.mail,
          keyboard: TextInputType.emailAddress,
          validator: (v) {
            final s = v?.trim() ?? '';
            if (s.isEmpty) return 'Введите email';
            if (!s.contains('@')) return 'Некорректный email';
            return null;
          },
        ),
      ),
      const SizedBox(height: 16),
      _animated(
        2,
        child: _buildTextField(
          c: c,
          controller: _passwordCtrl,
          label: lang == 'en' ? 'Password' : (lang == 'kk' ? 'Құпиясөз' : 'Пароль'),
          hint: '••••••••',
          icon: LucideIcons.lock,
          obscureText: _obscurePassword,
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
              color: c.textSecondary,
              size: 20,
            ),
            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
          ),
          validator: (v) {
            if ((v ?? '').isEmpty) return 'Введите пароль';
            return null;
          },
        ),
      ),
    ];
  }

  Widget _submitButton(String lang, AppColors c) {
    final VoidCallback? onPressed;
    if (_isLoading) {
      onPressed = null;
    } else if (_authMode == _AuthMode.password) {
      onPressed = _loginWithPassword;
    } else {
      onPressed = (_step == _Step.identifier ? _requestCode : _verifyCode);
    }

    final String label;
    if (_authMode == _AuthMode.password) {
      label = lang == 'en' ? 'Sign In as Chairman' : (lang == 'kk' ? 'Төраға ретінде кіру' : 'Войти как председатель');
    } else {
      label = _step == _Step.identifier
          ? (lang == 'en' ? 'Get code' : (lang == 'kk' ? 'Код алу' : 'Получить код'))
          : (lang == 'en' ? 'Sign In' : (lang == 'kk' ? 'Кіру' : 'Войти'));
    }

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: c.primary,
          disabledBackgroundColor: c.primary.withOpacity(0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
              )
            : Text(label,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
      ),
    );
  }

  Widget _legalConsent(String lang, AppColors c) {
    return GestureDetector(
      onTap: () => LegalDocsSheet.show(context),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Text.rich(
          TextSpan(
            text: lang == 'en'
                ? 'By signing in, you accept the '
                : (lang == 'kk'
                    ? 'Кіру арқылы сіз '
                    : 'Входя в приложение, вы принимаете условия '),
            style: TextStyle(color: c.textTertiary, fontSize: 11, height: 1.35),
            children: [
              TextSpan(
                text: lang == 'en'
                    ? 'Public Offer'
                    : (lang == 'kk' ? 'Қоғамдық оферта' : 'Публичной оферты'),
                style: TextStyle(
                  color: c.primary,
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.underline,
                ),
              ),
              TextSpan(
                text: lang == 'en' ? ' & ' : (lang == 'kk' ? ' және ' : ' и '),
              ),
              TextSpan(
                text: lang == 'en'
                    ? 'Privacy Policy'
                    : (lang == 'kk' ? 'Құпиялылық саясатымен' : 'Политики конфиденциальности'),
                style: TextStyle(
                  color: c.primary,
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.underline,
                ),
              ),
              TextSpan(
                text: lang == 'en' ? '.' : (lang == 'kk' ? ' келісесіз.' : '.'),
              ),
            ],
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  Widget _videoInstructionsLink(String lang, AppColors c) {
    final text = switch (lang) {
      'kk' => '🎥 Бейненұсқаулық: Қалай кіру керек',
      'en' => '🎥 Video Tutorial: How to Login',
      _ => '🎥 Видеоинструкция: как войти и пользоваться',
    };
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(top: 4, bottom: 4),
        child: InkWell(
          onTap: () => VideoInstructionsSheet.show(context),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.playCircle, size: 16, color: c.primary),
                const SizedBox(width: 6),
                Text(
                  text,
                  style: TextStyle(
                    color: c.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Регистрация — отдельный экран с выбором роли (register_screen.dart, срез R2). Технически
  // тот же аккаунт (auth-email.md §3), но register_screen собирает ФИО+роль и после кода ведёт
  // по следующему шагу роли (создать ОСИ / ждать привязки / анкета мастера).
  Widget _registerLink(String lang, AppColors c) {
    return Center(
      child: GestureDetector(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const RegisterScreen()),
        ),
        child: RichText(
          text: TextSpan(
            text: lang == 'ru' ? 'Нет аккаунта?  ' : 'Аккаунт жоқ па?  ',
            style: TextStyle(color: c.textSecondary, fontSize: 14),
            children: [
              TextSpan(
                text: lang == 'ru' ? 'Зарегистрироваться' : 'Тіркелу',
                style: TextStyle(color: c.primary, fontWeight: FontWeight.w700, fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Анимированная обёртка ─────────────────────────────────
  Widget _animated(int index, {required Widget child}) {
    return FadeTransition(
      opacity: _fadeAnims[index],
      child: SlideTransition(position: _slideAnims[index], child: child),
    );
  }

  // ── Поле ввода ────────────────────────────────────────────
  Widget _buildTextField({
    required AppColors c,
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboard = TextInputType.text,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
      obscureText: obscureText,
      validator: validator,
      style: TextStyle(color: c.textPrimary, fontSize: 15),
      cursorColor: c.primary,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: TextStyle(color: c.textTertiary),
        hintStyle: TextStyle(color: c.textTertiary.withOpacity(0.6)),
        prefixIcon: Icon(icon, color: c.primary, size: 19),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: c.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: c.cardBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: c.cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: c.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: c.danger, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: c.danger, width: 1.5),
        ),
        errorStyle: TextStyle(color: c.danger, fontSize: 12),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }
}
