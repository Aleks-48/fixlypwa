import 'dart:convert';

import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/screens/pdf_receipts_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('A receipt becomes available after a missing account is linked',
      (tester) async {
    dotenv.testLoad(fileInput: 'API_BASE_URL=https://localhost');
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    var hasAccount = false;
    final client = MockClient((req) async {
      expect(req.url.path, '/api/payments/receipt');
      expect(req.headers['Authorization'], 'Bearer fixture');
      if (!hasAccount) return http.Response('{"error":"Receipt not found"}', 404);
      return http.Response.bytes(utf8.encode(jsonEncode({'receipt': {
        'period': '2026-11', 'osi': {'name': 'ОСИ Тест'},
        'building': {'address': 'Тестовый дом'},
        'apartment': {'number': '4', 'accountNumber': 'QA42', 'residentName': 'Тест'},
        'charges': [], 'balances': [], 'previousBalance': 0, 'paidInPeriod': 0,
        'totalCharged': 0, 'totalDue': 0,
      }})), 200, headers: {'content-type':'application/json; charset=utf-8'});
    });
    http.runWithClient(() => ApiClient.instance, () => client);
    await tester.pumpWidget(const MaterialApp(home: PdfReceiptsScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Открыть PDF'), findsNothing);
    hasAccount = true;
    await tester.tap(find.text('Обновить'));
    await tester.pumpAndSettle();
    expect(find.text('Лицевой счёт QA42'), findsOneWidget);
    expect(find.text('Квитанция за 2026-11'), findsOneWidget);
    expect(find.text('Открыть PDF'), findsOneWidget);
  });
}
