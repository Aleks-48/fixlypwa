import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/core/mobile_exports.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:fixly_app/screens/chairman_announcements_screen.dart';
import 'package:fixly_app/screens/info_screen.dart';
import 'package:fixly_app/screens/legal_docs_sheet.dart';
import 'package:fixly_app/screens/notifications_screen.dart';
import 'package:fixly_app/screens/pricing_screen.dart';
import 'package:fixly_app/screens/splash_screen.dart';
import 'package:fixly_app/screens/start_screen.dart';
import 'package:fixly_app/screens/video_instructions_sheet.dart';
import 'package:fixly_app/screens/voting_screen.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:open_filex/open_filex.dart';
import 'package:shared_preferences/shared_preferences.dart';

http.Response _jsonOk(Object? data, {int status = 200}) {
  return http.Response.bytes(
    utf8.encode(jsonEncode({'data': data})),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

http.Response _jsonErr(String message, {int status = 500, String code = 'ERR'}) {
  return http.Response.bytes(
    utf8.encode(jsonEncode({
      'error': {'code': code, 'message': message},
    })),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

void _setSmallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(320, 568);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Widget _wrapApp(Widget home) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: home,
  );
}

void main() {
  late Future<http.Response> Function(http.Request req) mockHandler;

  setUpAll(() async {
    dotenv.testLoad(
      fileInput: 'API_BASE_URL=https://localhost\nENABLE_PUSH=false',
    );
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    SharedPreferences.setMockInitialValues({});
    await initializeDateFormatting('ru', null);

    final client = MockClient((req) => mockHandler(req));
    http.runWithClient(() => ApiClient.instance, () => client);
  });

  setUp(() {
    appLanguage.value = 'ru';
    openFileOverride = null;
    tempDirOverride = null;
    mockHandler = (req) async => _jsonOk({});
  });

  tearDown(() {
    openFileOverride = null;
    tempDirOverride = null;
    EventsRepository.instance.forceDisconnect();
  });

  group('PricingScreen stress tests', () {
    testWidgets(
      'unmounting before _loadRealApartmentCount resolves does not throw setState after dispose',
      (tester) async {
        final buildingsCompleter = Completer<http.Response>();
        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return buildingsCompleter.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const PricingScreen()));
        await tester.pump();

        // Dispose PricingScreen before /api/buildings finishes
        await tester.pumpWidget(_wrapApp(const Scaffold(body: SizedBox())));
        await tester.pump();

        buildingsCompleter.complete(_jsonOk({'buildings': []}));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);

        // Also test unmounting during /api/apartments loop
        final aptsCompleter = Completer<http.Response>();
        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return _jsonOk({
              'buildings': [
                {'id': 'b1', 'address': 'ул. Абая, 48'},
              ],
            });
          }
          if (req.url.path == '/api/apartments') {
            return aptsCompleter.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const PricingScreen()));
        await tester.pump();
        await tester.pump();

        await tester.pumpWidget(_wrapApp(const Scaffold(body: SizedBox())));
        await tester.pump();

        aptsCompleter.complete(_jsonOk({
          'apartments': [
            {'id': 'a1', 'number': '1'},
          ],
        }));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'locks apartment counter when DB has apartments and renders cleanly at 320x568',
      (tester) async {
        _setSmallViewport(tester);

        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return _jsonOk({
              'buildings': [
                {'id': 'b1', 'address': 'ул. Абая, дом 48, корпус 2'},
              ],
            });
          }
          if (req.url.path == '/api/apartments') {
            return _jsonOk({
              'apartments': [
                {'id': 'a1', 'number': '1'},
                {'id': 'a2', 'number': '2'},
                {'id': 'a3', 'number': '3'},
              ],
            });
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const PricingScreen()));
        await tester.pumpAndSettle();

        expect(find.text('3'), findsOneWidget);
        expect(find.text('Подтверждено'), findsOneWidget);
        expect(find.text('ул. Абая, дом 48, корпус 2'), findsOneWidget);
        expect(find.byIcon(LucideIcons.lock), findsNWidgets(2));

        // Tapping locked counter buttons does not change apartment count
        await tester.tap(find.byIcon(LucideIcons.lock).first);
        await tester.tap(find.byIcon(LucideIcons.lock).last);
        await tester.pump();
        expect(find.text('3'), findsOneWidget);

        // Toggle months & referral link and verify total recalculates
        await tester.tap(find.text('2 мес.'));
        await tester.pump();
        final refFinder = find.textContaining(
          'Есть реферальная ссылка',
          findRichText: true,
        );
        await tester.ensureVisible(refFinder);
        await tester.pumpAndSettle();
        await tester.tap(refFinder);
        await tester.pump();
        expect(find.text('300 ₸'), findsOneWidget);

        // Scroll through entire PricingScreen at 320x568 to verify zero overflow
        final supportBtn = find.text('Написать в поддержку');
        await tester.scrollUntilVisible(
          supportBtn,
          400,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();

        expect(supportBtn, findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'invoice button sends Bearer token, guards double-tap, and recovers from 500 error',
      (tester) async {
        _setSmallViewport(tester);

        final tempDir = Directory.systemTemp.createTempSync('pricing_test_');
        tempDirOverride = () async => tempDir;
        addTearDown(() {
          tempDirOverride = null;
          if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
        });

        String? openedPath;
        openFileOverride = (path) async {
          openedPath = path;
          return OpenResult(type: ResultType.done, message: 'done');
        };

        var invoiceCalls = 0;
        String? authHeader;
        Map<String, String>? queryParams;
        Completer<http.Response>? invoiceCompleter = Completer<http.Response>();

        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return _jsonOk({'buildings': []});
          }
          if (req.url.path == '/api/pricing/invoice') {
            invoiceCalls++;
            authHeader = req.headers['Authorization'];
            queryParams = req.url.queryParameters;
            final completer = invoiceCompleter;
            if (completer != null) {
              return completer.future;
            }
            return http.Response.bytes(
              utf8.encode(
                '<html><body>'
                '<div class="title">Счет на оплату №101</div>'
                '<div class="total">Итого: 6 000 ₸</div>'
                '</body></html>',
              ),
              200,
              headers: {'content-type': 'text/html; charset=utf-8'},
            );
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const PricingScreen()));
        await tester.pumpAndSettle();

        final invoiceBtn = find.text('Сформировать счет на оплату (PDF)');
        await tester.ensureVisible(invoiceBtn);
        await tester.pumpAndSettle();

        // Rapid double-tap while first invoice request is pending
        await tester.tap(invoiceBtn);
        await tester.pump();
        await tester.tap(invoiceBtn, warnIfMissed: false);
        await tester.pump();

        expect(invoiceCalls, 1);
        expect(authHeader, 'Bearer fixture');
        expect(queryParams?['plan'], 'standard');
        expect(queryParams?['apartments'], '50');
        expect(queryParams?['months'], '1');
        expect(queryParams?['useRef'], 'false');

        // Fail first attempt with 500
        invoiceCompleter.complete(http.Response('Server Error', 500));
        invoiceCompleter = null;
        await tester.pumpAndSettle();

        expect(find.textContaining('Не удалось сформировать счет'), findsOneWidget);

        // Retry after recovery succeeds and opens generated PDF
        await tester.tap(invoiceBtn);
        await tester.pump();
        for (var i = 0; i < 60 && openedPath == null; i++) {
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 25)),
          );
          await tester.pump();
        }
        await tester.pumpAndSettle();

        expect(invoiceCalls, 2);
        expect(openedPath, isNotNull);
        expect(openedPath!.endsWith('.pdf'), isTrue);
        expect(File(openedPath!).existsSync(), isTrue);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('NotificationsScreen stress tests', () {
    testWidgets(
      '500 error in _markAllRead and _onTapItem shows SnackBar, guards double-tap, and renders cleanly at 320x568',
      (tester) async {
        _setSmallViewport(tester);

        var markAllCalls = 0;
        var markItemCalls = 0;
        Completer<http.Response>? readCompleter;
        var failNextRead = true;
        var markAllDone = false;
        var item1Done = false;

        mockHandler = (req) async {
          if (req.url.path == '/api/notifications') {
            return _jsonOk({
              'notifications': [
                {
                  'id': 'n1',
                  'type': 'ANNOUNCEMENT',
                  'title': 'Отключение холодной воды на стояке №2',
                  'body': 'Плановые работы с 10:00 до 14:00 во втором подъезде.',
                  'readAt': (item1Done || markAllDone) ? '2026-11-15T10:00:00Z' : null,
                  'createdAt': '2026-11-15T09:00:00Z',
                },
                {
                  'id': 'n2',
                  'type': 'REQUEST',
                  'title': 'Заявка №45 выполнена мастером',
                  'body': 'Проверьте качество ремонта и подтвердите закрытие.',
                  'readAt': markAllDone ? '2026-11-15T10:05:00Z' : null,
                  'createdAt': '2026-11-15T08:00:00Z',
                },
              ],
              'unread': markAllDone ? 0 : (item1Done ? 1 : 2),
            });
          }
          if (req.url.path == '/api/notifications/read') {
            final body = jsonDecode(req.body) as Map<String, dynamic>;
            if (body.containsKey('id')) {
              markItemCalls++;
            } else {
              markAllCalls++;
            }
            final completer = readCompleter;
            if (completer != null) {
              return completer.future;
            }
            if (failNextRead) {
              return _jsonErr('Сервер недоступен', status: 500);
            }
            if (body['id'] == 'n1') {
              item1Done = true;
            } else {
              markAllDone = true;
            }
            return _jsonOk({'ok': true});
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const NotificationsScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Прочитать всё'), findsOneWidget);
        expect(find.text('Отключение холодной воды на стояке №2'), findsOneWidget);

        // Double-tap "Прочитать всё" while request is in flight
        final markAllCompleter = Completer<http.Response>();
        readCompleter = markAllCompleter;
        await tester.tap(find.text('Прочитать всё'));
        await tester.pump();
        await tester.tap(find.text('Прочитать всё'));
        await tester.pump();
        expect(markAllCalls, 1);

        // Complete with 500 error
        markAllCompleter.complete(_jsonErr('Сервер недоступен', status: 500));
        readCompleter = null;
        await tester.pumpAndSettle();

        expect(find.textContaining('Не удалось отметить прочитанным'), findsOneWidget);
        expect(find.text('Прочитать всё'), findsOneWidget);

        // Clear SnackBar
        ScaffoldMessenger.of(tester.element(find.byType(NotificationsScreen)))
            .hideCurrentSnackBar();
        await tester.pumpAndSettle();

        // Double-tap individual unread item while request is in flight
        final tapItemCompleter = Completer<http.Response>();
        readCompleter = tapItemCompleter;
        final itemFinder = find.text('Отключение холодной воды на стояке №2');
        await tester.tap(itemFinder);
        await tester.pump();
        await tester.tap(itemFinder);
        await tester.pump();
        expect(markItemCalls, 1);

        // Complete with 500 error
        tapItemCompleter.complete(_jsonErr('Ошибка записи', status: 500));
        readCompleter = null;
        await tester.pumpAndSettle();

        expect(find.textContaining('Не удалось отметить прочитанным'), findsOneWidget);

        // Retry item mark-read with success
        failNextRead = false;
        await tester.tap(itemFinder);
        await tester.pumpAndSettle();

        // Still one unread item left, then mark all read
        expect(find.text('Прочитать всё'), findsOneWidget);
        await tester.tap(find.text('Прочитать всё'));
        await tester.pumpAndSettle();

        expect(find.text('Прочитать всё'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'error state and empty state are pull-to-refresh scrollable at 320x568',
      (tester) async {
        _setSmallViewport(tester);

        var mode = 'error';
        mockHandler = (req) async {
          if (req.url.path == '/api/notifications') {
            if (mode == 'error') {
              return _jsonErr('Сетевой сбой', status: 500);
            }
            if (mode == 'empty') {
              return _jsonOk({'notifications': [], 'unread': 0});
            }
            return _jsonOk({
              'notifications': [
                {
                  'id': 'n1',
                  'type': 'INFO',
                  'title': 'Собрание собственников',
                  'body': 'Состоится завтра во дворе в 19:00.',
                  'readAt': null,
                  'createdAt': '2026-11-15T12:00:00Z',
                },
              ],
              'unread': 1,
            });
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const NotificationsScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Повторить'), findsOneWidget);

        // Pull-to-refresh from error state into empty state
        mode = 'empty';
        await tester.fling(find.byType(ListView), const Offset(0, 300), 1000);
        await tester.pumpAndSettle();

        expect(find.text('Пока нет уведомлений'), findsOneWidget);

        // Pull-to-refresh from empty state into populated list
        mode = 'data';
        await tester.fling(find.byType(ListView), const Offset(0, 300), 1000);
        await tester.pumpAndSettle();

        expect(find.text('Собрание собственников'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('InfoScreen stress tests', () {
    testWidgets(
      '500 error recovery, empty state pull-to-refresh, and 320x568 no overflow',
      (tester) async {
        _setSmallViewport(tester);

        var mode = 'error';
        mockHandler = (req) async {
          if (req.url.path == '/api/info') {
            if (mode == 'error') {
              return _jsonErr('Ошибка загрузки инфо', status: 500);
            }
            if (mode == 'empty') {
              return _jsonOk({'items': []});
            }
            return _jsonOk({
              'items': [
                {
                  'id': 'i1',
                  'type': 'TRASH_SCHEDULE',
                  'title': 'График вывоза твёрдых бытовых отходов (ТБО)',
                  'content': 'Ежедневно в 07:30 и 19:30 с контейнерной площадки у 3 подъезда.',
                },
                {
                  'id': 'i2',
                  'type': 'EMERGENCY_CONTACTS',
                  'title': 'Круглосуточная аварийная диспетчерская служба',
                  'content': 'Лифт: +7 (777) 111-22-33, Сантехник: +7 (777) 444-55-66',
                },
              ],
            });
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const InfoScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Ошибка загрузки инфо'), findsOneWidget);
        expect(find.text('Повторить'), findsOneWidget);

        // Recover to empty state via retry button
        mode = 'empty';
        await tester.tap(find.text('Повторить'));
        await tester.pumpAndSettle();

        expect(find.text('Раздел пока пуст'), findsOneWidget);

        // Pull-to-refresh from empty state to populated items
        mode = 'data';
        await tester.fling(find.byType(ListView), const Offset(0, 300), 1000);
        await tester.pumpAndSettle();

        expect(find.text('График вывоза твёрдых бытовых отходов (ТБО)'), findsOneWidget);
        expect(find.text('Круглосуточная аварийная диспетчерская служба'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('VotingScreen stress tests', () {
    testWidgets(
      'rejects empty/non-numeric SMS code without signing, accepts valid 6-digit code, zero overflow at 320x568',
      (tester) async {
        _setSmallViewport(tester);

        await tester.pumpWidget(_wrapApp(const VotingScreen()));
        await tester.pumpAndSettle();

        // Verify card headers & button fit 320x568
        expect(find.text('Закон НПА § 42'), findsWidgets);
        expect(find.text('Проголосовать и подписать ЭЦП'), findsWidgets);

        // Tapping without selecting option shows prompt SnackBar
        final firstVoteBtn = find.text('Проголосовать и подписать ЭЦП').first;
        await tester.ensureVisible(firstVoteBtn);
        await tester.pumpAndSettle();
        await tester.tap(firstVoteBtn);
        await tester.pumpAndSettle();
        expect(find.text('Пожалуйста, выберите вариант ответа'), findsOneWidget);

        ScaffoldMessenger.of(tester.element(find.byType(VotingScreen)))
            .hideCurrentSnackBar();
        await tester.pumpAndSettle();

        // Select first option and open signing sheet
        final optionFinder = find.text('За утверждение сметы');
        await tester.ensureVisible(optionFinder);
        await tester.pumpAndSettle();
        await tester.tap(optionFinder);
        await tester.pumpAndSettle();
        await tester.ensureVisible(firstVoteBtn);
        await tester.pumpAndSettle();
        await tester.tap(firstVoteBtn);
        await tester.pumpAndSettle();

        expect(find.text('Подписание ЭЦП'), findsOneWidget);
        expect(find.text('Выбран ответ: "За утверждение сметы"'), findsOneWidget);

        final submitSignBtn = find.text('Подписать и отправить');
        await tester.ensureVisible(submitSignBtn);
        await tester.pumpAndSettle();

        // 1. Submit with empty code -> rejected, sheet stays open, not signed
        await tester.tap(submitSignBtn);
        await tester.pumpAndSettle();
        expect(find.text('Введите код подтверждения (4–8 цифр)'), findsOneWidget);
        expect(find.text('Подписание ЭЦП'), findsOneWidget);
        expect(find.text('Голос заверен ЭЦП'), findsNothing);

        // 2. Submit with non-numeric code -> rejected
        await tester.enterText(find.byType(TextField), 'ab12cd');
        await tester.pump();
        await tester.ensureVisible(submitSignBtn);
        await tester.pumpAndSettle();
        await tester.tap(submitSignBtn);
        await tester.pumpAndSettle();
        expect(find.text('Введите код подтверждения (4–8 цифр)'), findsOneWidget);
        expect(find.text('Голос заверен ЭЦП'), findsNothing);

        // 3. Submit with too-short code -> rejected
        await tester.enterText(find.byType(TextField), '123');
        await tester.pump();
        await tester.ensureVisible(submitSignBtn);
        await tester.pumpAndSettle();
        await tester.tap(submitSignBtn);
        await tester.pumpAndSettle();
        expect(find.text('Введите код подтверждения (4–8 цифр)'), findsOneWidget);
        expect(find.text('Голос заверен ЭЦП'), findsNothing);

        // 4. Submit with valid 6-digit code -> signed!
        await tester.enterText(find.byType(TextField), '123456');
        await tester.pump();
        await tester.ensureVisible(submitSignBtn);
        await tester.pumpAndSettle();
        await tester.tap(submitSignBtn);
        await tester.pumpAndSettle();

        expect(find.text('Подписание ЭЦП'), findsNothing);
        expect(find.text('Голос заверен ЭЦП'), findsOneWidget);
        expect(find.text('Голос успешно подписан ЭЦП и зарегистрирован!'), findsOneWidget);

        // Scroll down to second poll card at 320x568
        final secondPollTitle = find.text('Выбор подрядной организации для ремонта фасада');
        await tester.scrollUntilVisible(
          secondPollTitle,
          300,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        expect(secondPollTitle, findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('StartScreen, LegalDocsSheet, VideoInstructionsSheet, SplashScreen & ChairmanAnnouncementsScreen at 320x568', () {
    testWidgets('StartScreen renders cleanly at 320x568 across languages', (tester) async {
      _setSmallViewport(tester);

      await tester.pumpWidget(_wrapApp(const StartScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Fixly'), findsOneWidget);
      expect(find.text('Вход'), findsOneWidget);
      expect(find.text('Регистрация'), findsOneWidget);

      appLanguage.value = 'kk';
      await tester.pumpAndSettle();
      expect(find.text('Кіру'), findsOneWidget);

      appLanguage.value = 'en';
      await tester.pumpAndSettle();
      expect(find.text('Log In'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('LegalDocsSheet renders all 5 tabs cleanly at 320x568', (tester) async {
      _setSmallViewport(tester);

      await tester.pumpWidget(_wrapApp(const Scaffold(body: LegalDocsSheet())));
      await tester.pumpAndSettle();

      expect(find.text('Правовой центр Fixly'), findsOneWidget);
      for (final tab in ['Председателям', 'Мастерам', 'Конфиденциальность', 'Пилот 50 ₸']) {
        await tester.ensureVisible(find.text(tab));
        await tester.pumpAndSettle();
        await tester.tap(find.text(tab));
        await tester.pumpAndSettle();
      }
      expect(tester.takeException(), isNull);
    });

    testWidgets('VideoInstructionsSheet renders both modes and all guides cleanly at 320x568', (tester) async {
      _setSmallViewport(tester);

      await tester.pumpWidget(_wrapApp(const Scaffold(body: VideoInstructionsSheet())));
      await tester.pumpAndSettle();

      expect(find.text('Инструкции и руководства'), findsOneWidget);

      // Cycle through every guide category chip in Docs mode (where UI mockup rows live)
      for (final tag in ['Быстрый вход', 'Для жителей', 'Кондоминиум', 'ОСИ / НСУ / УК']) {
        await tester.ensureVisible(find.text(tag));
        await tester.tap(find.text(tag));
        await tester.pumpAndSettle();
      }

      // Switch to Video mode
      await tester.tap(find.text('🎥 Видео'));
      await tester.pumpAndSettle();
      expect(find.text('Смотреть видео'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('SplashScreen renders at 320x568 and unmounts early without timer/animation errors', (tester) async {
      _setSmallViewport(tester);

      await tester.pumpWidget(_wrapApp(const SplashScreen()));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Fixly'), findsOneWidget);

      // Dispose SplashScreen before _startSequence finishes all delays
      await tester.pumpWidget(_wrapApp(const Scaffold(body: SizedBox())));
      await tester.pump(const Duration(seconds: 4));
      expect(tester.takeException(), isNull);
    });

    testWidgets('ChairmanAnnouncementsScreen passes buildingId to AnnouncementsRepository.list and renders at 320x568', (tester) async {
      _setSmallViewport(tester);

      String? requestedBuildingId;
      mockHandler = (req) async {
        if (req.url.path == '/api/buildings') {
          return _jsonOk({
            'buildings': [
              {'id': 'b-42', 'address': 'пр. Женис, 12'},
            ],
          });
        }
        if (req.url.path == '/api/announcements') {
          requestedBuildingId = req.url.queryParameters['buildingId'];
          return _jsonOk({
            'announcements': [
              {
                'id': 'ann-1',
                'title': 'Уборка двора в субботу',
                'body': 'Просьба убрать личный транспорт с парковки.',
                'isPinned': true,
                'createdAt': '2026-11-15T08:00:00Z',
                'readCount': 14,
                'readByViewer': true,
              },
            ],
          });
        }
        return _jsonOk({});
      };

      await tester.pumpWidget(_wrapApp(const ChairmanAnnouncementsScreen()));
      await tester.pumpAndSettle();

      expect(requestedBuildingId, 'b-42');
      expect(find.text('Уборка двора в субботу'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
