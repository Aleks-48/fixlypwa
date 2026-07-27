import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/screens/start_screen.dart';
import 'package:fixly_app/screens/home_router.dart';

// ============================================================
//  SplashScreen — первый экран при запуске (палитра — U3, срез R2)
//  • Логотип с анимацией появления
//  • Пульсирующее кольцо
//  • Текстовый слоган
//  • Автоматический редирект (авторизован → HomeRouter, нет → StartScreen)
// ============================================================
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {

  // Контроллеры анимаций
  late AnimationController _logoCtrl;
  late AnimationController _pulseCtrl;
  late AnimationController _textCtrl;
  late AnimationController _bgCtrl;

  // Логотип
  late Animation<double>  _logoScale;
  late Animation<double>  _logoOpacity;

  // Пульс
  late Animation<double>  _pulseScale;
  late Animation<double>  _pulseOpacity;

  // Текст
  late Animation<double>  _textOpacity;
  late Animation<Offset>  _textSlide;

  // Фон
  late Animation<double>  _bgOpacity;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startSequence();
  }

  void _setupAnimations() {
    // Фон — появляется сразу
    _bgCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _bgOpacity = CurvedAnimation(parent: _bgCtrl, curve: Curves.easeIn);

    // Логотип — выпрыгивает с упругостью
    _logoCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900));
    _logoScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoCtrl, curve: Curves.elasticOut),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _logoCtrl,
          curve: const Interval(0.0, 0.4, curve: Curves.easeIn)),
    );

    // Пульс вокруг логотипа — бесконечная петля
    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1800));
    _pulseScale = Tween<double>(begin: 1.0, end: 1.8).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeOut),
    );
    _pulseOpacity = Tween<double>(begin: 0.35, end: 0.0).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeOut),
    );

    // Текст — всплывает снизу
    _textCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 700));
    _textOpacity = CurvedAnimation(
        parent: _textCtrl, curve: Curves.easeIn);
    _textSlide = Tween<Offset>(
            begin: const Offset(0, 0.5), end: Offset.zero)
        .animate(CurvedAnimation(
            parent: _textCtrl, curve: Curves.easeOutCubic));
  }

  Future<void> _startSequence() async {
    // 1. Фон
    _bgCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 200));

    // 2. Логотип
    _logoCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 400));

    // 3. Пульс (бесконечно)
    _pulseCtrl.repeat();

    // 4. Текст
    await Future.delayed(const Duration(milliseconds: 300));
    _textCtrl.forward();

    // 5. Держим сплэш + проверяем сессию
    await Future.delayed(const Duration(milliseconds: 1800));
    await _checkSessionAndNavigate();
  }

  Future<void> _checkSessionAndNavigate() async {
    // Срез 21 (ADR-0012 §1): сессия — Bearer-токен в защищённом хранилище, не Supabase.
    // me() возвращает null и чистит токен сам, если сессия истекла/отозвана на сервере.
    // Любой сбой сети (офлайн, сервер лежит, таймаут ApiClient) — НЕ повод зависнуть на
    // сплэше: уходим на StartScreen, токен при этом не трогаем (code review 2026-07-16).
    // Полноценный офлайн-режим с кешем профиля — предмет среза 22, не сплэша.
    AuthUser? user;
    try {
      user = await AuthRepository.instance.me();
    } catch (_) {
      user = null;
    }

    if (!mounted) return;

    Widget destination;
    if (user != null) {
      destination = HomeRouter(user: user);
    } else {
      destination = const StartScreen();
    }

    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, anim, __) => destination,
        transitionsBuilder: (_, anim, __, child) => FadeTransition(
          opacity: anim,
          child: child,
        ),
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _pulseCtrl.dispose();
    _textCtrl.dispose();
    _bgCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      body: FadeTransition(
        opacity: _bgOpacity,
        child: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [c.background, c.surface, c.background],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
          child: Stack(
            children: [
              // Декоративные точки фона
              ..._buildBackgroundDots(c),

              // Центральный контент
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Логотип с пульсом
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        // Внешний пульс
                        AnimatedBuilder(
                          animation: _pulseCtrl,
                          builder: (_, __) => Opacity(
                            opacity: _pulseOpacity.value,
                            child: Transform.scale(
                              scale: _pulseScale.value,
                              child: Container(
                                width: 110,
                                height: 110,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: c.primary,
                                    width: 2,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),

                        // Логотип
                        AnimatedBuilder(
                          animation: _logoCtrl,
                          builder: (_, child) => Opacity(
                            opacity: _logoOpacity.value,
                            child: Transform.scale(
                              scale: _logoScale.value,
                              child: child,
                            ),
                          ),
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [c.gradientStart, c.gradientEnd],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: c.primary.withOpacity(0.5),
                                  blurRadius: 30,
                                  spreadRadius: 5,
                                ),
                              ],
                            ),
                            child: const Center(
                              child: Text(
                                'F',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 52,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -2,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 32),

                    // Название + слоган
                    SlideTransition(
                      position: _textSlide,
                      child: FadeTransition(
                        opacity: _textOpacity,
                        child: Column(
                          children: [
                            Text(
                              'Fixly',
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 42,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -1.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 6),
                              decoration: BoxDecoration(
                                color: c.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: c.primary.withOpacity(0.3),
                                ),
                              ),
                              child: Text(
                                'Платформа вашего дома',
                                style: TextStyle(
                                  color: c.primaryLight,
                                  fontSize: 14,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Версия внизу
              Positioned(
                bottom: 40,
                left: 0,
                right: 0,
                child: FadeTransition(
                  opacity: _textOpacity,
                  child: Text(
                    'v1.0.0',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: c.textTertiary,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildBackgroundDots(AppColors c) {
    final positions = [
      [0.1, 0.15], [0.85, 0.1], [0.05, 0.7],
      [0.9, 0.65], [0.5, 0.08], [0.75, 0.85],
      [0.2, 0.9],  [0.95, 0.4],
    ];
    final sizes = [4.0, 3.0, 5.0, 3.0, 4.0, 3.5, 4.5, 3.0];

    return List.generate(positions.length, (i) {
      return Positioned(
        left:
            MediaQuery.of(context).size.width * positions[i][0],
        top: MediaQuery.of(context).size.height * positions[i][1],
        child: AnimatedBuilder(
          animation: _pulseCtrl,
          builder: (_, __) => Opacity(
            opacity: 0.15 +
                (_pulseCtrl.value * 0.15 * (i % 2 == 0 ? 1 : -1))
                    .clamp(0.0, 0.3),
            child: Container(
              width: sizes[i],
              height: sizes[i],
              decoration: BoxDecoration(
                color: c.primary,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      );
    });
  }
}
