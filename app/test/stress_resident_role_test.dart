import 'dart:async';
import 'dart:convert';

import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:fixly_app/screens/ai_assistant_screen.dart';
import 'package:fixly_app/screens/announcements_screen.dart';
import 'package:fixly_app/screens/create_request_screen.dart';
import 'package:fixly_app/screens/defect_scanner_screen.dart';
import 'package:fixly_app/screens/documents_screen.dart';
import 'package:fixly_app/screens/finance_screen.dart';
import 'package:fixly_app/screens/pdf_receipts_screen.dart';
import 'package:fixly_app/screens/polls_screen.dart';
import 'package:fixly_app/screens/request_thread_screen.dart';
import 'package:fixly_app/screens/requests_screen.dart';
import 'package:fixly_app/screens/resident_home_shell.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/theme_notifier.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<http.Response> _jsonOk(Map<String, dynamic> data, {int status = 200}) async =>
    http.Response.bytes(
      utf8.encode(jsonEncode({'data': data})),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Future<http.Response> _jsonErr(String message, {int status = 500, String code = 'ERR'}) async =>
    http.Response.bytes(
      utf8.encode(jsonEncode({
        'error': {'code': code, 'message': message}
      })),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

void _setSmallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(320, 568);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

void main() {
  late Future<http.Response> Function(http.BaseRequest req) mockHandler;
  late Future<http.StreamedResponse> Function(http.BaseRequest req)? mockStreamHandler;

  setUpAll(() async {
    dotenv.testLoad(fileInput: 'API_BASE_URL=https://localhost\nENABLE_PUSH=false');
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    SharedPreferences.setMockInitialValues({});
    await initializeDateFormatting('ru', null);
    mockHandler = (_) => _jsonOk({});
    mockStreamHandler = null;
    final client = MockClient.streaming((req, bodyStream) async {
      if (mockStreamHandler != null) {
        return mockStreamHandler!(req);
      }
      final res = await mockHandler(req);
      return http.StreamedResponse(
        Stream.value(res.bodyBytes),
        res.statusCode,
        headers: res.headers,
      );
    });
    http.runWithClient(() => ApiClient.instance, () => client);
  });

  setUp(() {
    appLanguage.value = 'ru';
    mockStreamHandler = null;
  });

  group('PollsScreen stress tests', () {
    testWidgets('vote error shows error SnackBar, does NOT fake success, allows retry', (tester) async {
      _setSmallViewport(tester);
      var voted = false;
      var failVote = true;

      mockHandler = (req) async {
        if (req.url.path == '/api/polls') {
          return _jsonOk({
            'polls': [
              {
                'id': 'p1',
                'question': 'Установить шлагбаум во дворе?',
                'closed': false,
                'totalVotes': voted ? 1 : 0,
                'myOptionId': voted ? 'o1' : null,
                'options': [
                  {'id': 'o1', 'label': 'Да, установить', 'votes': voted ? 1 : 0},
                  {'id': 'o2', 'label': 'Нет', 'votes': 0},
                ],
              }
            ]
          });
        }
        if (req.url.path == '/api/polls/vote') {
          if (failVote) {
            return _jsonErr('Сервер голосования недоступен', status: 500);
          }
          voted = true;
          return _jsonOk({'voted': true});
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const PollsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Нужен ваш голос'), findsOneWidget);
      await tester.tap(find.text('Да, установить'));
      await tester.pumpAndSettle();

      expect(find.text('Ваш голос принят'), findsNothing);
      expect(find.text('Вы проголосовали'), findsNothing);
      expect(find.text('Нужен ваш голос'), findsOneWidget);
      expect(find.text('Сервер голосования недоступен'), findsOneWidget);

      // Retry succeeds
      failVote = false;
      await tester.tap(find.text('Да, установить'));
      await tester.pumpAndSettle();

      expect(find.text('Вы проголосовали'), findsOneWidget);
      expect(find.text('100% (1)'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('rapid double-tap on poll option only sends 1 vote HTTP call', (tester) async {
      _setSmallViewport(tester);
      var voteCalls = 0;
      final voteCompleter = Completer<http.Response>();

      mockHandler = (req) async {
        if (req.url.path == '/api/polls') {
          return _jsonOk({
            'polls': [
              {
                'id': 'p1',
                'question': 'Провести субботник в субботу?',
                'closed': false,
                'totalVotes': voteCalls > 0 && voteCompleter.isCompleted ? 1 : 0,
                'myOptionId': voteCalls > 0 && voteCompleter.isCompleted ? 'o1' : null,
                'options': [
                  {'id': 'o1', 'label': 'Поддерживаю', 'votes': voteCalls > 0 && voteCompleter.isCompleted ? 1 : 0},
                  {'id': 'o2', 'label': 'Воздержусь', 'votes': 0},
                ],
              }
            ]
          });
        }
        if (req.url.path == '/api/polls/vote') {
          voteCalls++;
          return voteCompleter.future;
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const PollsScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Поддерживаю'));
      await tester.pump();
      await tester.tap(find.text('Поддерживаю'));
      await tester.pump();

      expect(voteCalls, 1);

      voteCompleter.complete(await _jsonOk({'voted': true}));
      await tester.pumpAndSettle();

      expect(find.text('Вы проголосовали'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('FinanceScreen stress tests', () {
    Map<String, dynamic> financePayload({double debt = 12500, List<Map<String, dynamic>>? payments}) => {
          'balances': {
            'MAINTENANCE': {'charged': debt, 'paid': 0, 'debt': debt},
            'TARGETED': {'charged': 0, 'paid': 0, 'debt': 0},
            'CAPITAL_REPAIR': {'charged': 0, 'paid': 0, 'debt': 0},
          },
          'charges': [
            {
              'id': 'c1',
              'period': '2026-11-01T00:00:00.000Z',
              'amount': debt.toStringAsFixed(2),
              'dueDate': '2026-11-25T00:00:00.000Z',
              'status': 'UNPAID',
              'tariff': {'category': 'MAINTENANCE'},
            }
          ],
          'payments': payments ?? [],
        };

    testWidgets('rapid double-tap on pay button only sends 1 checkout call; 320x568 zero overflow', (tester) async {
      _setSmallViewport(tester);
      var checkoutCalls = 0;
      var paid = false;
      final checkoutCompleter = Completer<http.Response>();

      mockHandler = (req) async {
        if (req.url.path == '/api/finance/resident') {
          return _jsonOk(financePayload(
            debt: paid ? 0 : 12500,
            payments: paid
                ? [
                    {
                      'id': 'pay1',
                      'amount': '12500.00',
                      'paidAt': '2026-11-15T10:00:00.000Z',
                      'method': 'test_card',
                    }
                  ]
                : [],
          ));
        }
        if (req.url.path == '/api/payments/checkout') {
          checkoutCalls++;
          paid = true;
          return checkoutCompleter.future;
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const FinanceScreen()));
      await tester.pumpAndSettle();

      // Verify tapping "Оплатить онлайн" disables the trigger button immediately and opens a single sheet
      await tester.tap(find.text('Оплатить онлайн'));
      await tester.pump();
      expect(
        tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Оплатить онлайн')).onPressed,
        isNull,
      );
      await tester.pumpAndSettle();

      expect(find.text('Оплата онлайн'), findsOneWidget);

      // Tap pay twice rapidly inside the sheet
      final payBtn = find.text('Оплатить ₸ 12 500');
      await tester.ensureVisible(payBtn);
      await tester.tap(payBtn);
      await tester.pump();
      expect(find.text('Проведение оплаты...'), findsOneWidget);

      await tester.tap(find.byType(ElevatedButton).last, warnIfMissed: false);
      await tester.pump();

      expect(checkoutCalls, 1);

      checkoutCompleter.complete(await _jsonOk({
        'success': true,
        'alreadyPaid': false,
        'gatewayRef': 'GW-LONG-REF-000123456789',
        'amount': 12500,
      }));
      await tester.pumpAndSettle();

      expect(find.text('Оплата прошла успешно!'), findsOneWidget);
      expect(find.text('GW-LONG-REF-000123456789'), findsOneWidget);

      await tester.tap(find.text('Закрыть чек'));
      await tester.pumpAndSettle();

      expect(find.text('Задолженности нет'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('500 on initial load recovers via retry; 400/500 checkout errors show inside sheet', (tester) async {
      _setSmallViewport(tester);
      var failInitial = true;
      var checkoutStatus = 400;

      mockHandler = (req) async {
        if (req.url.path == '/api/finance/resident') {
          if (failInitial) return _jsonErr('Временная ошибка сервера', status: 500);
          return _jsonOk(financePayload(debt: 8400));
        }
        if (req.url.path == '/api/payments/checkout') {
          if (checkoutStatus == 400) {
            return _jsonErr('Сумма задолженности изменилась', status: 400);
          }
          if (checkoutStatus == 500) {
            return _jsonErr('Шлюз оплаты не отвечает', status: 500);
          }
          return _jsonOk({'success': true, 'alreadyPaid': false, 'amount': 8400});
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const FinanceScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Временная ошибка сервера'), findsOneWidget);

      failInitial = false;
      await tester.tap(find.text('Повторить'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Оплатить онлайн'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Kaspi QR'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Оплатить ₸ 8 400'));
      await tester.tap(find.text('Оплатить ₸ 8 400'));
      await tester.pumpAndSettle();
      expect(find.text('Сумма задолженности изменилась'), findsOneWidget);

      checkoutStatus = 500;
      await tester.tap(find.text('Оплатить ₸ 8 400'));
      await tester.pumpAndSettle();
      expect(find.text('Шлюз оплаты не отвечает'), findsOneWidget);

      checkoutStatus = 200;
      await tester.tap(find.text('Оплатить ₸ 8 400'));
      await tester.pumpAndSettle();
      expect(find.text('Оплата прошла успешно!'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('Requests flow stress tests', () {
    testWidgets('CreateRequestScreen empty check, 500 recovery, rapid double-tap sends 1 POST at 320x568',
        (tester) async {
      _setSmallViewport(tester);
      var postCalls = 0;
      var failFirst = true;
      final postCompleter = Completer<http.Response>();

      mockHandler = (req) async {
        if (req.url.path == '/api/requests' && req.method == 'POST') {
          postCalls++;
          if (failFirst) {
            return _jsonErr('Ошибка создания заявки', status: 500);
          }
          return postCompleter.future;
        }
        return _jsonErr('Not found', status: 404);
      };

      String? createdId;
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: Builder(
          builder: (context) => Scaffold(
            body: ElevatedButton(
              onPressed: () async {
                createdId = await Navigator.push<String>(
                  context,
                  MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ));
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Empty submit
      final submitBtn = find.text('Отправить');
      await tester.scrollUntilVisible(submitBtn, 200, scrollable: find.byType(Scrollable).first);
      await tester.tap(submitBtn);
      await tester.pump();
      expect(find.text('Опишите проблему'), findsOneWidget);
      expect(postCalls, 0);

      // Enter text -> 500 error recovery
      await tester.scrollUntilVisible(find.byType(TextField), -200, scrollable: find.byType(Scrollable).first);
      await tester.enterText(find.byType(TextField), 'Течёт труба в подъезде');
      await tester.scrollUntilVisible(submitBtn, 200, scrollable: find.byType(Scrollable).first);
      await tester.tap(submitBtn);
      await tester.pumpAndSettle();
      expect(find.text('Ошибка создания заявки'), findsOneWidget);
      expect(postCalls, 1);

      // Rapid double-tap on retry
      failFirst = false;
      postCalls = 0;
      await tester.tap(submitBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
      await tester.pump();
      expect(postCalls, 1);

      postCompleter.complete(await _jsonOk({
        'request': {'id': 'req-42'}
      }));
      await tester.pumpAndSettle();

      expect(createdId, 'req-42');
      expect(tester.takeException(), isNull);
    });

    testWidgets('RequestsScreen 500 recovery & 320x568 viewport check', (tester) async {
      _setSmallViewport(tester);
      var fail = true;

      mockHandler = (req) async {
        if (req.url.path == '/api/requests') {
          if (fail) return _jsonErr('Не удалось загрузить заявки', status: 500);
          return _jsonOk({
            'requests': [
              {
                'id': 'r1',
                'authorUserId': 'u1',
                'category': 'PLUMBING',
                'text': 'Очень длинный текст заявки о протечке стояка на пятом этаже',
                'photoUrls': <String>[],
                'status': 'IN_PROGRESS',
                'createdAt': '2026-11-10T10:00:00.000Z',
                'updatedAt': '2026-11-10T10:00:00.000Z',
                'messages': <Map<String, dynamic>>[],
              }
            ]
          });
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const RequestsScreen()));
      await tester.pumpAndSettle();
      expect(find.text('Не удалось загрузить заявки'), findsOneWidget);

      fail = false;
      await tester.tap(find.text('Повторить'));
      await tester.pumpAndSettle();
      expect(find.text('Сантехника'), findsOneWidget);
      expect(find.text('В работе'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('RequestThreadScreen rapid double-tap send only posts once, handles 500, fits 320x568',
        (tester) async {
      _setSmallViewport(tester);
      var sendCalls = 0;
      var failNextSend = true;
      final sendCompleter = Completer<http.Response>();
      final messages = <Map<String, dynamic>>[
        {
          'id': 'm1',
          'authorUserId': 'chair1',
          'text': 'Мастер направлен',
          'createdAt': '2026-11-10T11:00:00.000Z',
        }
      ];

      mockHandler = (req) async {
        if (req.url.path == '/api/requests/r1' && req.method == 'GET') {
          return _jsonOk({
            'request': {
              'id': 'r1',
              'authorUserId': 'u1',
              'category': 'ELECTRICITY',
              'text': 'Не горит свет на 3 этаже',
              'photoUrls': <String>[],
              'status': 'IN_PROGRESS',
              'createdAt': '2026-11-10T10:00:00.000Z',
              'updatedAt': '2026-11-10T11:00:00.000Z',
              'messages': messages,
            }
          });
        }
        if (req.url.path == '/api/auth/me') {
          return _jsonOk({
            'user': {'id': 'u1', 'fullName': 'Алибек Сериков'},
            'roles': <Map<String, dynamic>>[],
          });
        }
        if (req.url.path == '/api/requests/r1/messages' && req.method == 'POST') {
          sendCalls++;
          if (failNextSend) {
            return _jsonErr('Сбой отправки сообщения', status: 500);
          }
          messages.add({
            'id': 'm2',
            'authorUserId': 'u1',
            'text': 'Спасибо, ждём',
            'createdAt': '2026-11-10T11:05:00.000Z',
          });
          return sendCompleter.future;
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(
          MaterialApp(theme: AppTheme.lightTheme, home: const RequestThreadScreen(requestId: 'r1')));
      await tester.pumpAndSettle();

      expect(find.text('Не горит свет на 3 этаже'), findsOneWidget);
      expect(find.text('Мастер направлен'), findsOneWidget);

      // 500 error recovery
      await tester.enterText(find.byType(TextField), 'Спасибо, ждём');
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();
      expect(find.text('Сбой отправки сообщения'), findsOneWidget);
      expect(sendCalls, 1);

      // Dismiss error SnackBar (it covers the bottom composer on a 320x568 viewport) before tapping retry
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();

      // Rapid double-tap on retry
      failNextSend = false;
      sendCalls = 0;
      await tester.tap(find.byIcon(Icons.send));
      await tester.pump();
      final disabledSendBtn = find.ancestor(
        of: find.byType(CircularProgressIndicator),
        matching: find.byType(IconButton),
      );
      expect(disabledSendBtn, findsOneWidget);
      expect(tester.widget<IconButton>(disabledSendBtn).onPressed, isNull);
      await tester.tap(disabledSendBtn, warnIfMissed: false);
      await tester.pump();
      expect(sendCalls, 1);

      sendCompleter.complete(await _jsonOk({'ok': true}));
      await tester.pumpAndSettle();
      expect(find.text('Спасибо, ждём'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('ResidentHomeShell stress tests', () {
    testWidgets('handles 500s on initial loads without crashing, renders all tabs on 320x568, profile edit & no fake fallbacks',
        (tester) async {
      _setSmallViewport(tester);

      mockHandler = (req) async {
        if (req.url.path == '/api/announcements') {
          return _jsonErr('Ошибка ленты объявлений', status: 500);
        }
        if (req.url.path == '/api/polls') {
          return _jsonErr('Ошибка опросов', status: 500);
        }
        if (req.url.path == '/api/requests') {
          return _jsonErr('Ошибка заявок', status: 500);
        }
        if (req.url.path == '/api/finance/resident') {
          return _jsonErr('Ошибка финансов', status: 500);
        }
        if (req.url.path == '/api/auth/profile' && req.method == 'PATCH') {
          return _jsonErr('Не удалось сохранить ФИО', status: 500);
        }
        return _jsonErr('Not found', status: 404);
      };

      final userWithMissingApt = AuthUser(
        id: 'u1',
        phone: '+77011234567',
        fullName: 'Айгуль Нурланова',
        activeOsiId: 'osi-1',
        osiName: null,
        apartmentNumber: null,
        buildingAddress: null,
        roles: const [
          {'osiId': 'osi-1', 'role': 'RESIDENT'}
        ],
      );

      await tester.pumpWidget(
        ChangeNotifierProvider(
          create: (_) => ThemeNotifier(),
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: ResidentHomeShell(user: userWithMissingApt),
          ),
        ),
      );

      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }

      // Home tab shows graceful error instead of fake empty state
      expect(find.text('Ошибка ленты объявлений'), findsOneWidget);
      expect(find.text('Объявлений пока нет'), findsNothing);

      // Navigate through all tabs at 320x568
      await tester.tap(find.text('Голоса'));
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('Ошибка опросов'), findsOneWidget);

      await tester.tap(find.text('Заявки'));
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('Ошибка заявок'), findsOneWidget);

      await tester.tap(find.text('Финансы'));
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('Ошибка финансов'), findsOneWidget);

      await tester.tap(find.text('Профиль'));
      await tester.pump(const Duration(milliseconds: 50));

      // No fake hardcoded fallbacks
      expect(find.text('ЖК Сарыарка (ОСИ)'), findsNothing);
      expect(find.text('кв. 42'), findsNothing);
      expect(find.text('Айгуль Нурланова'), findsOneWidget);

      // Unmount cleanly and drain any SSE reconnect timer
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
      expect(tester.takeException(), isNull);
    });

    testWidgets('Profile edit handles 500 error inline and preserves OSI & apartment info on success',
        (tester) async {
      _setSmallViewport(tester);
      var failSave = true;

      mockHandler = (req) async {
        if (req.url.path == '/api/announcements') return _jsonOk({'announcements': []});
        if (req.url.path == '/api/polls') return _jsonOk({'polls': []});
        if (req.url.path == '/api/requests') return _jsonOk({'requests': []});
        if (req.url.path == '/api/finance/resident') {
          return _jsonOk({'balances': null, 'charges': [], 'payments': []});
        }
        if (req.url.path == '/api/auth/profile' && req.method == 'PATCH') {
          if (failSave) return _jsonErr('Сервер перегружен', status: 500);
          return _jsonOk({'user': {'id': 'u1', 'fullName': 'Мадина Касымова'}});
        }
        return _jsonErr('Not found', status: 404);
      };

      final user = AuthUser(
        id: 'u1',
        phone: '+77019998877',
        fullName: 'Мадина Старая',
        activeOsiId: 'osi-77',
        osiName: 'ОСИ Алатау',
        apartmentNumber: '15',
        buildingAddress: 'ул. Абая 10',
        roles: const [
          {'osiId': 'osi-77', 'role': 'RESIDENT'}
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: ResidentHomeShell(user: user),
        ),
      );
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }

      await tester.tap(find.text('Профиль'));
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('ОСИ Алатау'), findsAtLeastNWidgets(1));
      expect(find.text('кв. 15 (ул. Абая 10)'), findsOneWidget);

      await tester.tap(find.byIcon(LucideIcons.userCog));
      await tester.pumpAndSettle();

      // Short name validation
      await tester.enterText(find.byType(TextField).first, 'А');
      await tester.tap(find.text('Сохранить'));
      await tester.pump();
      expect(find.text('Укажите ФИО (минимум 2 символа)'), findsOneWidget);

      // 500 error displays inside sheet
      await tester.enterText(find.byType(TextField).first, 'Мадина Касымова');
      await tester.tap(find.text('Сохранить'));
      await tester.pumpAndSettle();
      expect(find.text('Сервер перегружен'), findsOneWidget);

      // Retry succeeds and preserves OSI + apartment details
      failSave = false;
      await tester.tap(find.text('Сохранить'));
      await tester.pumpAndSettle();

      expect(find.text('Мадина Касымова'), findsOneWidget);
      expect(find.text('ОСИ Алатау'), findsAtLeastNWidgets(1));
      expect(find.text('кв. 15 (ул. Абая 10)'), findsOneWidget);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
      expect(tester.takeException(), isNull);
    });
  });

  group('Supporting resident screens stress tests', () {
    testWidgets('DocumentsScreen cramped 320x568 with simulated keyboard empty search has zero overflow',
        (tester) async {
      _setSmallViewport(tester);
      mockHandler = (req) async {
        if (req.url.path == '/api/documents') {
          return _jsonOk({
            'documents': [
              {
                'id': 'd1',
                'title': 'Протокол №1',
                'category': 'PROTOCOL',
                'fileUrl': '/uploads/p1.pdf',
                'isPublic': true,
                'createdAt': '2026-11-01T10:00:00.000Z',
              }
            ]
          });
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: const MediaQuery(
            data: MediaQueryData(size: Size(320, 568), viewInsets: EdgeInsets.only(bottom: 240)),
            child: DocumentsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'несуществующий');
      await tester.pumpAndSettle();

      expect(find.text('Председатель пока не добавил документы'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('AnnouncementsScreen long body bottom sheet renders on 320x568 with zero overflow',
        (tester) async {
      _setSmallViewport(tester);
      mockHandler = (req) async {
        if (req.url.path == '/api/announcements') {
          return _jsonOk({
            'announcements': [
              {
                'id': 'a1',
                'title': 'Важное объявление о плановых работах',
                'body': List.filled(40, 'Отключение воды с 10:00 до 18:00 во всех подъездах.').join(' '),
                'isPinned': true,
                'createdAt': '2026-11-12T08:00:00.000Z',
                'readCount': 5,
                'readByViewer': false,
              }
            ]
          });
        }
        if (req.url.path == '/api/announcements/a1/read') {
          return _jsonOk({'ok': true});
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const AnnouncementsScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Важное объявление о плановых работах'));
      await tester.pumpAndSettle();

      expect(find.text('Закреплено'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('PdfReceiptsScreen handles partial/null JSON safely at 320x568', (tester) async {
      _setSmallViewport(tester);
      mockHandler = (req) async {
        if (req.url.path == '/api/payments/receipt') {
          return http.Response.bytes(
            utf8.encode(jsonEncode({
              'receipt': {
                'period': '2026-11',
                'osi': {'name': 'ОСИ Тест', 'bin': null},
                'building': {'address': 'пр. Абая 5'},
                'apartment': {'number': '12', 'accountNumber': 'ACC12', 'residentName': 'Тест'},
                'charges': [
                  {'title': 'Содержание', 'amount': '5000.5'}
                ],
                'balances': null,
                'previousBalance': null,
                'paidInPeriod': 0,
                'totalCharged': 5000.5,
                'totalDue': 5000.5,
              }
            })),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return _jsonErr('Not found', status: 404);
      };

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const PdfReceiptsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Квитанция за 2026-11'), findsOneWidget);
      expect(find.text('Лицевой счёт ACC12'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('AiAssistantScreen handles non-JSON 502 and double-tap send without crashing', (tester) async {
      _setSmallViewport(tester);
      var chatCalls = 0;
      final chatCompleter = Completer<http.StreamedResponse>();

      mockStreamHandler = (req) async {
        if (req.url.path == '/api/assistant/chat') {
          chatCalls++;
          return chatCompleter.future;
        }
        return http.StreamedResponse(Stream.value(utf8.encode('{}')), 404);
      };

      final client = MockClient.streaming((req, _) => mockStreamHandler!(req));
      await http.runWithClient(() async {
        await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const AiAssistantScreen()));
        await tester.pumpAndSettle();

        await tester.enterText(find.byType(TextField), 'Сломался лифт');
        await tester.tap(find.byIcon(Icons.send));
        await tester.pump();
        await tester.tap(find.byType(FloatingActionButton), warnIfMissed: false);
        await tester.pump();

        expect(chatCalls, 1);

        await tester.runAsync(() async {
          chatCompleter.complete(http.StreamedResponse(
            Stream.value(utf8.encode('<html>502 Bad Gateway</html>')),
            502,
            headers: {'content-type': 'text/html'},
          ));
          await Future<void>.delayed(const Duration(milliseconds: 20));
        });
        await tester.pumpAndSettle();

        expect(find.byType(CircularProgressIndicator), findsNothing);
        expect(find.text('Ассистент недоступен'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }, () => client);
    });

    testWidgets('DefectScannerScreen renders 320x568 with zero overflow and catches picker error', (tester) async {
      _setSmallViewport(tester);
      const pickerChannel = MethodChannel('plugins.flutter.io/image_picker');
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(pickerChannel, (call) async {
        throw PlatformException(code: 'camera_access_denied', message: 'Нет доступа к камере');
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(pickerChannel, null));

      await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: const DefectScannerScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Сделайте фото или выберите из галереи'), findsOneWidget);
      expect(find.text('Камера'), findsOneWidget);
      expect(find.text('Галерея'), findsOneWidget);

      await tester.tap(find.text('Камера'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Ошибка при выборе фото:'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
