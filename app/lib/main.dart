import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:fixly_app/theme_notifier.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/screens/splash_screen.dart';
import 'firebase_options.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

final ValueNotifier<String> appLanguage = ValueNotifier<String>('ru');

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");

  await Future.wait([
    Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform),
    SharedPreferences.getInstance().then((prefs) {
      final String? savedLang = prefs.getString('saved_lang');
      if (savedLang != null) {
        appLanguage.value = savedLang;
      }
    }),
    initializeDateFormatting('ru'),
  ]);

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  runApp(
    ChangeNotifierProvider(
      create: (context) => ThemeNotifier(),
      child: const MyApp(),
    ),
  );
}

// Единый вход (ADR-0011/ADR-0012, срез 26): SplashScreen сам решает, куда вести —
// StartScreen (не авторизован) или HomeRouter (авторизован, ветвит по роли/статусу
// мастера). Именованные роуты и Supabase-based AuthGate — удалены вместе с Supabase
// (REQ-134/135, критерий фазы 6 build-plan-3-unification.md).
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeNotifier = context.watch<ThemeNotifier>();

    return MaterialApp(
      title: 'Fixly',
      debugShowCheckedModeBanner: false,
      themeMode: themeNotifier.themeMode,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      home: const SplashScreen(),
    );
  }
}
