import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/register_screen.dart';

// Стартовый экран (onboarding-unified.md §0, срез R2): ДВЕ равнозначные кнопки — «Вход» и
// «Регистрация» (запрос Рахима 2026-07-17). Технически обе ведут к одному и тому же аккаунту
// (auth-email.md §3 — первый вход по коду сам создаёт пользователя); разница — в собираемых
// полях (регистрация просит роль+ФИО) и в шаге после кода (см. register_screen.dart).
class StartScreen extends StatelessWidget {
  const StartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.spaceLg),
          child: Column(
            children: [
              const Spacer(flex: 3),
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
              Text('Платформа вашего дома',
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
                  child: const Text('Вход',
                      style: TextStyle(color: Colors.white, fontWeight: AppTypography.bold, fontSize: AppTypography.button)),
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
                  child: Text('Регистрация',
                      style: TextStyle(color: c.primary, fontWeight: AppTypography.bold, fontSize: AppTypography.button)),
                ),
              ),
              const SizedBox(height: AppDimens.spaceMd),
            ],
          ),
        ),
      ),
    );
  }
}
