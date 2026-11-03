import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:fixly_app/screens/home_router.dart';
import 'package:fixly_app/screens/create_osi_screen.dart';
import 'package:fixly_app/screens/master_application_screen.dart';
import 'package:fixly_app/screens/legal_docs_sheet.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

enum _Step { role, form, code }

class _Role {
  final String value;
  final String labelRu;
  final String labelKk;
  final String labelEn;
  final IconData icon;
  const _Role(this.value, this.labelRu, this.labelKk, this.labelEn, this.icon);

  String getLabel(String lang) => lang == 'en' ? labelEn : (lang == 'kk' ? labelKk : labelRu);
}

const _roles = [
  _Role('RESIDENT', 'Житель', 'Тұрғын', 'Resident', LucideIcons.home),
  _Role('CHAIRMAN', 'Председатель', 'Төраға', 'OSI Chairman', LucideIcons.building2),
  _Role('MASTER', 'Мастер', 'Шебер', 'Master / Specialist', LucideIcons.wrench),
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
      setState(() => _error = AppLocalizations.tr('status_error'));
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
        default:
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => HomeRouter(user: user)),
            (_) => false,
          );
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = AppLocalizations.tr('status_error'));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return ValueListenableBuilder<String>(
      valueListenable: appLanguage,
      builder: (context, lang, _) {
        return Scaffold(
          backgroundColor: c.background,
          appBar: AppBar(
            backgroundColor: c.background,
            elevation: 0,
            iconTheme: IconThemeData(color: c.textPrimary),
            title: Text(AppLocalizations.tr('title_register'), style: TextStyle(color: c.textPrimary)),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppDimens.spaceLg),
              child: switch (_step) {
                _Step.role => _roleStep(lang, c),
                _Step.form => _formStep(lang, c),
                _Step.code => _codeStep(lang, c),
              },
            ),
          ),
        );
      },
    );
  }

  Widget _roleStep(String lang, AppColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(AppLocalizations.tr('label_role'),
            style: TextStyle(
                color: c.textPrimary, fontSize: 24, fontWeight: AppTypography.extraBold)),
        const SizedBox(height: 8),
        Text(lang == 'en'
            ? 'Select a role — the next step depends on it'
            : (lang == 'kk' ? 'Рөлді таңдаңыз — келесі қадам оған байланысты' : 'Выберите роль — от неё зависит следующий шаг'),
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
                      child: Text(r.getLabel(lang),
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

  Widget _formStep(String lang, AppColors c) {
    final roleLabel = _roles.firstWhere((r) => r.value == _selectedRole).getLabel(lang);
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: () => setState(() => _step = _Step.role),
            icon: Icon(Icons.arrow_back, size: 16, color: c.textSecondary),
            label: Text('$roleLabel — ${lang == 'en' ? 'change' : (lang == 'kk' ? 'өзгерту' : 'изменить')}', style: TextStyle(color: c.textSecondary)),
            style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft),
          ),
          const SizedBox(height: AppDimens.spaceMd),
          Text(lang == 'en' ? 'Your Information' : (lang == 'kk' ? 'Сіздің деректеріңіз' : 'Ваши данные'),
              style: TextStyle(
                  color: c.textPrimary, fontSize: 24, fontWeight: AppTypography.extraBold)),
          const SizedBox(height: AppDimens.spaceLg),
          _field(
            c: c,
            controller: _fullNameCtrl,
            label: AppLocalizations.tr('label_full_name'),
            hint: AppLocalizations.tr('placeholder_full_name'),
            icon: LucideIcons.user,
            validator: (v) {
              final s = v?.trim() ?? '';
              if (s.isEmpty) return lang == 'en' ? 'Enter full name' : (lang == 'kk' ? 'Т.А.Ә. енгізіңіз' : 'Укажите ФИО');
              if (s.length < 2) return lang == 'en' ? 'Minimum 2 characters' : (lang == 'kk' ? 'Кемінде 2 таңба' : 'Минимум 2 символа');
              return null;
            },
          ),
          const SizedBox(height: AppDimens.spaceMd),
          _field(
            c: c,
            controller: _identifierCtrl,
            label: AppLocalizations.tr('label_phone'),
            hint: AppLocalizations.tr('placeholder_phone'),
            icon: LucideIcons.phone,
            keyboardType: TextInputType.phone,
            validator: (v) {
              final s = v?.trim() ?? '';
              if (s.isEmpty) return lang == 'en' ? 'Enter phone number' : (lang == 'kk' ? 'Телефонды енгізіңіз' : 'Укажите телефон');
              return null;
            },
          ),
          if (_error != null) ...[
            const SizedBox(height: AppDimens.spaceSm),
            Text(_error!, style: TextStyle(color: c.danger, fontSize: AppTypography.caption)),
          ],
          const SizedBox(height: AppDimens.spaceLg),
          SizedBox(
            width: double.infinity,
            height: AppDimens.primaryTapTarget,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _requestCode,
              style: ElevatedButton.styleFrom(
                backgroundColor: c.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(AppLocalizations.tr('btn_continue'),
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: AppTypography.bold,
                          fontSize: AppTypography.button)),
            ),
          ),
          const SizedBox(height: AppDimens.spaceMd),
          GestureDetector(
            onTap: () {
              final tab = switch (_selectedRole) {
                'CHAIRMAN' => LegalDocTab.chairman,
                'MASTER' => LegalDocTab.master,
                _ => LegalDocTab.resident,
              };
              LegalDocsSheet.show(context, initialTab: tab);
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text.rich(
                TextSpan(
                  text: lang == 'en'
                      ? 'By clicking "Continue", you agree to the '
                      : (lang == 'kk'
                          ? '«Жалғастыру» батырмасын басу арқылы сіз '
                          : 'Нажимая «Продолжить», вы принимаете условия '),
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
                      text: lang == 'en' ? ' and ' : (lang == 'kk' ? ' және ' : ' и '),
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
          ),
        ],
      ),
    );
  }

  Widget _codeStep(String lang, AppColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(lang == 'en' ? 'Enter Code' : (lang == 'kk' ? 'Кодты енгізіңіз' : 'Введите код'),
            style: TextStyle(
                color: c.textPrimary, fontSize: 24, fontWeight: AppTypography.extraBold)),
        const SizedBox(height: 8),
        Text('${AppLocalizations.tr('code_sent_notice')}: $_identifier',
            style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body)),
        const SizedBox(height: AppDimens.spaceLg),
        _field(
          c: c,
          controller: _codeCtrl,
          label: AppLocalizations.tr('label_enter_code'),
          hint: '123456',
          icon: LucideIcons.keyRound,
          keyboardType: TextInputType.number,
        ),
        if (_devCode != null && dotenv.env['OTP_DEV_ECHO'] == '1') ...[
          const SizedBox(height: 8),
          Text(' Dev OTP: $_devCode',
              style: TextStyle(color: c.warning, fontSize: AppTypography.caption, fontWeight: FontWeight.bold)),
        ],
        if (_error != null) ...[
          const SizedBox(height: AppDimens.spaceSm),
          Text(_error!, style: TextStyle(color: c.danger, fontSize: AppTypography.caption)),
        ],
        const SizedBox(height: AppDimens.spaceLg),
        SizedBox(
          width: double.infinity,
          height: AppDimens.primaryTapTarget,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _verifyAndRoute,
            style: ElevatedButton.styleFrom(
              backgroundColor: c.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(AppLocalizations.tr('btn_verify_code'),
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: AppTypography.bold,
                        fontSize: AppTypography.button)),
          ),
        ),
      ],
    );
  }

  Widget _field({
    required AppColors c,
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                color: c.textPrimary,
                fontSize: AppTypography.caption,
                fontWeight: AppTypography.semibold)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          style: TextStyle(color: c.textPrimary, fontSize: AppTypography.bodyLarge),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: c.textTertiary),
            prefixIcon: Icon(icon, size: 20, color: c.textSecondary),
            filled: true,
            fillColor: c.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
              borderSide: BorderSide(color: c.primary, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
