import 'package:fixly_app/main.dart';
import 'package:fixly_app/screens/splash_screen.dart';
import 'package:fixly_app/screens/start_screen.dart';
import 'package:fixly_app/theme_notifier.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('Guest reaches the start screen without a server connection', (tester) async {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    dotenv.testLoad(fileInput: 'API_BASE_URL=https://localhost\nENABLE_PUSH=false');
    await tester.pumpWidget(ChangeNotifierProvider(
      create: (_) => ThemeNotifier(),
      child: const MyApp(),
    ));
    expect(find.byType(SplashScreen), findsOneWidget);
    for (final ms in [200, 400, 300, 1800, 500, 500]) {
      await tester.pump(Duration(milliseconds: ms));
    }
    expect(find.byType(StartScreen), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
