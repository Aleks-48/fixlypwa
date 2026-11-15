import 'dart:convert';

import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('Phone login waits for Telegram linking before asking for a code', (tester) async {
    dotenv.testLoad(fileInput: 'API_BASE_URL=https://localhost');
    var requests = 0;
    final client = MockClient((request) async {
      expect(request.url.path, '/api/auth/otp/request');
      requests++;
      final result = requests == 1
          ? {'needsTelegramLink': true, 'telegramBotUsername': 'fixly_test_bot'}
          : {'sent': true};
      return http.Response(jsonEncode({'data': result}), 200);
    });
    http.runWithClient(() => ApiClient.instance, () => client);
    await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const LoginPage()));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, '+77700000000');
    final submit = find.text('Получить код');
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(find.text('@fixly_test_bot'), findsOneWidget);
    await tester.tap(find.text('Назад'));
    await tester.pumpAndSettle();
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(requests, 2);
    expect(submit, findsNothing);
    expect(find.text('@fixly_test_bot'), findsNothing);
  });
}
