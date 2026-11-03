import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/register_screen.dart';
import 'package:fixly_app/main.dart' show appLanguage;

class StartScreen extends StatelessWidget {
  const StartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return ValueListenableBuilder<String>(
      valueListenable: appLanguage,
      builder: (context, currentLang, _) {
        return Scaffold(
          backgroundColor: c.background,
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppDimens.spaceLg),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      PopupMenuButton<String>(
                        onSelected: (String langCode) {
                          AppLocalizations.changeLanguage(langCode);
                        },
                        itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                          const PopupMenuItem<String>(
                            value: 'ru',
                            child: Text('🇷🇺 Русский'),
                          ),
                          const PopupMenuItem<String>(
                            value: 'kk',
                            child: Text('🇰🇿 Қазақша'),
                          ),
                          const PopupMenuItem<String>(
                            value: 'en',
                            child: Text('🇬🇧 English'),
                          ),
                        ],
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: c.surfaceVariant,
                            borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                            border: Border.all(color: c.cardBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.language, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                currentLang == 'ru'
                                    ? '🇷🇺 РУС'
                                    : currentLang == 'kk'
                                        ? '🇰🇿 ҚАЗ'
                                        : '🇬🇧 ENG',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const Icon(Icons.arrow_drop_down, size: 18),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Spacer(flex: 2),
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppDimens.radiusLg),
                      gradient: LinearGradient(
                        colors: [c.gradientStart, c.gradientEnd],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: const Center(
                      child: Text('F',
                          style: TextStyle(
                              color: Colors.white, fontSize: 40, fontWeight: FontWeight.w900)),
                    ),
                  ),
                  const SizedBox(height: AppDimens.spaceLg),
                  Text('Fixly',
                      style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 30,
                          fontWeight: AppTypography.extraBold,
                          letterSpacing: -0.5)),
                  const SizedBox(height: 8),
                  Text(AppLocalizations.tr('app_tagline'),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body)),
                  const Spacer(flex: 4),
                  SizedBox(
                    width: double.infinity,
                    height: AppDimens.primaryTapTarget,
                    child: ElevatedButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginPage()),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: c.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                      ),
                      child: Text(AppLocalizations.tr('btn_login'),
                          style: const TextStyle(color: Colors.white, fontWeight: AppTypography.bold, fontSize: AppTypography.button)),
                    ),
                  ),
                  const SizedBox(height: AppDimens.spaceSm),
                  SizedBox(
                    width: double.infinity,
                    height: AppDimens.primaryTapTarget,
                    child: OutlinedButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RegisterScreen()),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: c.primary, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                      ),
                      child: Text(AppLocalizations.tr('btn_register'),
                          style: TextStyle(color: c.primary, fontWeight: AppTypography.bold, fontSize: AppTypography.button)),
                    ),
                  ),
                  const SizedBox(height: AppDimens.spaceMd),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
