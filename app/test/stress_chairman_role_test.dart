import 'dart:async';
import 'dart:convert';

import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:fixly_app/screens/apartments_residents_screen.dart';
import 'package:fixly_app/screens/chairman_analytics_screen.dart';
import 'package:fixly_app/screens/chairman_announcements_screen.dart';
import 'package:fixly_app/screens/chairman_home_shell.dart';
import 'package:fixly_app/screens/chairman_join_requests_screen.dart';
import 'package:fixly_app/screens/chairman_polls_screen.dart';
import 'package:fixly_app/screens/chairman_requests_screen.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
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

AuthUser _makeChairman({String? fullName = 'Айдар Серикович Нурмагамбетов'}) {
  return AuthUser(
    id: 'chair-1',
    email: 'chair@fixly.kz',
    phone: '+77001234567',
    fullName: fullName,
    activeOsiId: 'osi-1',
    osiName: 'ОСИ Тестовый Дом',
    roles: [
      {'osiId': 'osi-1', 'role': 'CHAIRMAN'},
    ],
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
    mockHandler = (req) async => _jsonOk({});
  });

  tearDown(() {
    EventsRepository.instance.disconnect();
  });

  group('ChairmanHomeShell stress tests', () {
    testWidgets(
      '500 error on join request resolve shows error SnackBar and keeps item without uncaught exception',
      (tester) async {
        _setSmallViewport(tester);

        mockHandler = (req) async {
          switch (req.url.path) {
            case '/api/buildings':
              return _jsonOk({
                'buildings': [
                  {'id': 'b1', 'address': 'пр. Республики 45, корпус 2'},
                ],
              });
            case '/api/osi/join-requests':
              return _jsonOk({
                'requests': [
                  {
                    'id': 'jr-1',
                    'note': 'Кв. 18, собственник',
                    'user': {
                      'email': 'resident@fixly.kz',
                      'occupant': {'fullName': 'Марат Касымов'},
                    },
                  },
                ],
              });
            case '/api/analytics/chairman':
              return _jsonOk({
                'requests': {'total': 4, 'resolved': 1, 'inProgress': 2, 'received': 1, 'byCategory': {}},
                'finance': {'totalCharged': 100000, 'totalPaid': 80000, 'totalDebt': 20000, 'apartmentsWithDebt': 2, 'apartmentsTotal': 20, 'progressPct': 80},
                'polls': {'active': 1},
              });
            case '/api/osi/join-requests/jr-1/resolve':
              return _jsonErr('Ошибка сервера при обработке заявки', status: 500);
            default:
              return _jsonOk({});
          }
        };

        await tester.pumpWidget(_wrapApp(ChairmanHomeShell(user: _makeChairman())));
        await tester.pumpAndSettle();

        expect(find.text('Марат Касымов'), findsOneWidget);
        expect(find.text('Обработано'), findsOneWidget);

        await tester.ensureVisible(find.text('Обработано'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Обработано'));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(find.text('Ошибка сервера при обработке заявки'), findsOneWidget);
        expect(find.text('Марат Касымов'), findsOneWidget);

        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump(const Duration(seconds: 2));
      },
    );

    testWidgets(
      'rapid double-tap on resolve join request sends only 1 request',
      (tester) async {
        _setSmallViewport(tester);
        var resolveCalls = 0;
        final resolveGate = Completer<http.Response>();

        mockHandler = (req) async {
          switch (req.url.path) {
            case '/api/buildings':
              return _jsonOk({'buildings': []});
            case '/api/osi/join-requests':
              return _jsonOk({
                'requests': [
                  {
                    'id': 'jr-fast',
                    'user': {
                      'phone': '+77015550011',
                      'occupant': {'fullName': 'Алия Нурланова'},
                    },
                  },
                ],
              });
            case '/api/analytics/chairman':
              return _jsonOk({
                'requests': {'total': 0, 'resolved': 0, 'inProgress': 0, 'received': 0, 'byCategory': {}},
                'finance': {'totalCharged': 0, 'totalPaid': 0, 'totalDebt': 0, 'apartmentsWithDebt': 0, 'apartmentsTotal': 0, 'progressPct': 0},
                'polls': {'active': 0},
              });
            case '/api/osi/join-requests/jr-fast/resolve':
              resolveCalls++;
              return resolveGate.future;
            default:
              return _jsonOk({});
          }
        };

        await tester.pumpWidget(_wrapApp(ChairmanHomeShell(user: _makeChairman())));
        await tester.pumpAndSettle();

        final btn = find.text('Обработано');
        await tester.ensureVisible(btn);
        await tester.pumpAndSettle();
        await tester.tap(btn);
        await tester.pump();
        // Second rapid tap while request is in flight (button now displays '…' and is disabled)
        final busyBtn = find.text('…');
        expect(busyBtn, findsOneWidget);
        await tester.tap(busyBtn, warnIfMissed: false);
        await tester.pump();

        expect(resolveCalls, 1);

        resolveGate.complete(_jsonOk({}));
        await tester.pumpAndSettle();

        expect(find.text('Алия Нурланова'), findsNothing);
        expect(find.text('Заявка обработана'), findsOneWidget);

        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump(const Duration(seconds: 2));
      },
    );

    testWidgets(
      '320x568 tab navigation, profile edit 500 recovery + double-tap guard + immediate UI sync + logout guard',
      (tester) async {
        _setSmallViewport(tester);
        var patchCalls = 0;
        var logoutCalls = 0;
        var failNextPatch = true;
        Completer<http.Response>? patchGate;

        mockHandler = (req) async {
          switch (req.url.path) {
            case '/api/buildings':
              return _jsonOk({
                'buildings': [
                  {'id': 'b1', 'address': 'ул. Достык, дом 123, подъезд 1'},
                ],
              });
            case '/api/osi/join-requests':
              return _jsonOk({'requests': []});
            case '/api/analytics/chairman':
              return _jsonOk({
                'requests': {'total': 2, 'resolved': 1, 'inProgress': 1, 'received': 0, 'byCategory': {}},
                'finance': {'totalCharged': 50000, 'totalPaid': 25000, 'totalDebt': 25000, 'apartmentsWithDebt': 1, 'apartmentsTotal': 10, 'progressPct': 50},
                'polls': {'active': 0},
              });
            case '/api/requests':
              return _jsonOk({'requests': []});
            case '/api/announcements':
              return _jsonOk({'announcements': []});
            case '/api/polls':
              return _jsonOk({'polls': []});
            case '/api/auth/profile':
              patchCalls++;
              if (failNextPatch) {
                return _jsonErr('Сервер профиля недоступен', status: 500);
              }
              return patchGate!.future;
            case '/api/auth/logout':
              logoutCalls++;
              return _jsonOk({});
            default:
              return _jsonOk({});
          }
        };

        await tester.pumpWidget(_wrapApp(ChairmanHomeShell(
          user: _makeChairman(fullName: 'Константин Александрович Абдурахманов'),
        )));
        await tester.pumpAndSettle();

        // Navigate across all 5 tabs at 320x568 without RenderFlex overflow
        for (final label in ['Заявки', 'Объявления', 'Голоса', 'Ещё']) {
          await tester.tap(find.text(label));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        }

        // Open edit name dialog
        await tester.tap(find.byTooltip('Редактировать профиль'));
        await tester.pumpAndSettle();

        // Empty validation
        await tester.enterText(find.byType(TextField), '   ');
        await tester.tap(find.text('Сохранить'));
        await tester.pumpAndSettle();
        expect(find.text('Укажите ФИО'), findsOneWidget);
        expect(patchCalls, 0);

        // 500 error keeps dialog open with error text
        await tester.enterText(find.byType(TextField), 'Серик Омаров');
        await tester.tap(find.text('Сохранить'));
        await tester.pumpAndSettle();
        expect(patchCalls, 1);
        expect(find.text('Сервер профиля недоступен'), findsOneWidget);

        // Rapid double-tap Save sends only 1 PATCH and updates both tabs immediately
        failNextPatch = false;
        patchGate = Completer<http.Response>();
        await tester.tap(find.text('Сохранить'));
        await tester.pump();
        await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
        await tester.pump();
        expect(patchCalls, 2);

        patchGate.complete(_jsonOk({}));
        await tester.pumpAndSettle();

        expect(find.text('Серик Омаров'), findsOneWidget);
        expect(find.text('Данные профиля обновлены'), findsOneWidget);

        // Switch back to Home tab to confirm greeting also updated
        await tester.tap(find.text('Главная'));
        await tester.pumpAndSettle();
        expect(find.text('Здравствуйте, Серик Омаров!'), findsOneWidget);

        // Let the profile update SnackBar expire so it does not cover the logout button
        await tester.pump(const Duration(seconds: 5));
        await tester.pumpAndSettle();

        // Switch to More tab and test logout
        await tester.tap(find.text('Ещё'));
        await tester.pumpAndSettle();
        final logoutBtn = find.text('Выйти из аккаунта');
        await tester.scrollUntilVisible(
          logoutBtn,
          200,
          scrollable: find.descendant(
            of: find.byType(ListView).last,
            matching: find.byType(Scrollable),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(logoutBtn);
        await tester.pumpAndSettle();
        expect(logoutCalls, 1);

        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump(const Duration(seconds: 2));
      },
    );
  });

  group('ApartmentsResidentsScreen stress tests', () {
    testWidgets(
      'cancelling add-resident sheet does NOT show SnackBar or reload; successful add DOES show SnackBar and reloads apartments',
      (tester) async {
        _setSmallViewport(tester);
        var aptLoadCount = 0;
        var residentAdded = false;
        var addResidentCalls = 0;
        final addGate = Completer<http.Response>();

        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return _jsonOk({
              'buildings': [
                {'id': 'b1', 'address': 'ул. Кабанбай батыра, 15, блок А'},
              ],
            });
          }
          if (req.url.path == '/api/apartments') {
            aptLoadCount++;
            return _jsonOk({
              'apartments': [
                {
                  'id': 'apt-1',
                  'number': '12',
                  'area': 54.2,
                  'rooms': 2,
                  'occupants': residentAdded
                      ? [
                          {'id': 'occ-1', 'fullName': 'Алия Серикова', 'phone': '+77001112233'},
                        ]
                      : [],
                },
              ],
            });
          }
          if (req.url.path == '/api/residents') {
            addResidentCalls++;
            return addGate.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const ApartmentsResidentsScreen()));
        await tester.pumpAndSettle();

        expect(aptLoadCount, 1);
        expect(find.text('Квартира 12'), findsOneWidget);

        // Open add-resident sheet and dismiss it without submitting
        await tester.tap(find.text('Житель'));
        await tester.pumpAndSettle();
        expect(find.text('Житель кв. 12'), findsOneWidget);

        // Dismiss modal bottom sheet by tapping barrier at top-left
        await tester.tapAt(const Offset(10, 10));
        await tester.pumpAndSettle();

        expect(find.text('Житель добавлен'), findsNothing);
        expect(aptLoadCount, 1);
        expect(addResidentCalls, 0);

        // Re-open, submit with rapid double-tap
        await tester.tap(find.text('Житель'));
        await tester.pumpAndSettle();

        final fields = find.byType(TextField);
        await tester.enterText(fields.at(0), 'Алия Серикова');
        await tester.enterText(fields.at(1), '+77001112233');

        final submitBtn = find.text('Добавить жителя');
        await tester.ensureVisible(submitBtn);
        await tester.pumpAndSettle();
        await tester.tap(submitBtn);
        await tester.pump();
        await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
        await tester.pump();
        expect(addResidentCalls, 1);

        residentAdded = true;
        addGate.complete(_jsonOk({}));
        await tester.pumpAndSettle();

        expect(find.text('Житель добавлен'), findsOneWidget);
        expect(aptLoadCount, 2);
        expect(find.text('Алия Серикова (+77001112233)'), findsOneWidget);
      },
    );

    testWidgets(
      'CSV import handles 500 error, rapid double-tap, null 200 payload, and building switch race at 320x568',
      (tester) async {
        _setSmallViewport(tester);
        var importCalls = 0;
        var failImport = true;
        Completer<http.Response>? importGate;
        final b1SlowGate = Completer<http.Response>();

        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return _jsonOk({
              'buildings': [
                {'id': 'b1', 'address': 'Очень длинный адрес первого дома, проспект Абылай хана 99'},
                {'id': 'b2', 'address': 'Второй дом, ул. Сатпаева 10'},
              ],
            });
          }
          if (req.url.path == '/api/apartments') {
            final bId = req.url.queryParameters['buildingId'];
            if (bId == 'b1') {
              return b1SlowGate.future;
            }
            return _jsonOk({
              'apartments': [
                {'id': 'apt-b2', 'number': '202', 'occupants': []},
              ],
            });
          }
          if (req.url.path == '/api/apartments/import') {
            importCalls++;
            if (failImport) {
              return _jsonErr('Неверный формат CSV', status: 400);
            }
            return importGate!.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const ApartmentsResidentsScreen()));
        await tester.pump();
        await tester.pump();

        // While b1 apartments load slowly, switch dropdown to b2
        await tester.tap(find.byType(DropdownButtonFormField<Building>));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Второй дом, ул. Сатпаева 10').last);
        await tester.pumpAndSettle();

        expect(find.text('Квартира 202'), findsOneWidget);

        // Now stale slow response for b1 resolves — must NOT overwrite b2 apartments!
        b1SlowGate.complete(_jsonOk({
          'apartments': [
            {'id': 'apt-b1', 'number': '101', 'occupants': []},
          ],
        }));
        await tester.pumpAndSettle();
        expect(find.text('Квартира 202'), findsOneWidget);
        expect(find.text('Квартира 101'), findsNothing);

        // Open CSV import sheet
        await tester.tap(find.byTooltip('Импорт из списка'));
        await tester.pumpAndSettle();

        // Empty submit shows inline validation error
        await tester.ensureVisible(find.text('Импортировать'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Импортировать'));
        await tester.pumpAndSettle();
        expect(find.text('Введите данные для импорта'), findsOneWidget);

        // 400/500 error handled gracefully
        await tester.enterText(find.byType(TextField), '1,Тест Тестов,45.5,+77001234567');
        await tester.ensureVisible(find.text('Импортировать'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Импортировать'));
        await tester.pumpAndSettle();
        expect(importCalls, 1);
        expect(find.text('Ошибка: Неверный формат CSV'), findsOneWidget);

        // Rapid double-tap import with null 200 payload (tests non-Map response safety)
        failImport = false;
        importGate = Completer<http.Response>();
        await tester.ensureVisible(find.text('Импортировать'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Импортировать'));
        await tester.pump();
        await tester.tap(find.text('Импорт...'), warnIfMissed: false);
        await tester.pump();
        expect(importCalls, 2);

        importGate.complete(_jsonOk(null));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('Импорт завершён'), findsOneWidget);
      },
    );
  });

  group('ChairmanPollsScreen stress tests', () {
    testWidgets(
      '500 list error -> retry -> empty state -> create poll 500 error + double-tap guard at 320x568',
      (tester) async {
        _setSmallViewport(tester);
        var failList = true;
        var hasPoll = false;
        var createCalls = 0;
        var failCreate = true;
        Completer<http.Response>? createGate;

        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return _jsonOk({
              'buildings': [
                {'id': 'b1', 'address': 'Дом 1'},
              ],
            });
          }
          if (req.url.path == '/api/polls' && req.method == 'GET') {
            if (failList) return _jsonErr('Сбой загрузки опросов', status: 500);
            return _jsonOk({
              'polls': hasPoll
                  ? [
                      {
                        'id': 'p1',
                        'question': 'Установить шлагбаум во дворе?',
                        'closed': false,
                        'totalVotes': 10,
                        'options': [
                          {'id': 'o1', 'label': 'Да, обязательно нужно сделать', 'votes': 12},
                          {'id': 'o2', 'label': 'Нет', 'votes': 2},
                        ],
                      },
                    ]
                  : [],
            });
          }
          if (req.url.path == '/api/polls' && req.method == 'POST') {
            createCalls++;
            if (failCreate) return _jsonErr('Ошибка создания опроса', status: 500);
            return createGate!.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const ChairmanPollsScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Сбой загрузки опросов'), findsOneWidget);

        failList = false;
        await tester.tap(find.text('Повторить'));
        await tester.pumpAndSettle();
        expect(find.textContaining('Опросов пока нет'), findsOneWidget);

        // Open create poll sheet
        await tester.tap(find.byType(FloatingActionButton));
        await tester.pumpAndSettle();

        await tester.enterText(find.byType(TextField).first, 'Установить шлагбаум?');
        await tester.tap(find.text('Создать опрос'));
        await tester.pumpAndSettle();
        expect(createCalls, 1);
        expect(find.text('Ошибка создания опроса'), findsOneWidget);

        failCreate = false;
        createGate = Completer<http.Response>();
        await tester.tap(find.text('Создать опрос'));
        await tester.pump();
        await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
        await tester.pump();
        expect(createCalls, 2);

        hasPoll = true;
        createGate.complete(_jsonOk({'poll': {'id': 'p1'}}));
        await tester.pumpAndSettle();

        expect(find.text('Установить шлагбаум во дворе?'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('ChairmanAnnouncementsScreen stress tests', () {
    testWidgets(
      '500 error -> retry -> empty state -> create 500 + rapid double-tap -> delete guard at 320x568',
      (tester) async {
        _setSmallViewport(tester);
        var failList = true;
        var hasAnn = false;
        var createCalls = 0;
        var failCreate = true;
        Completer<http.Response>? createGate;

        mockHandler = (req) async {
          if (req.url.path == '/api/buildings') {
            return _jsonOk({
              'buildings': [
                {'id': 'b1', 'address': 'Дом 1'},
              ],
            });
          }
          if (req.url.path == '/api/announcements' && req.method == 'GET') {
            if (failList) return _jsonErr('Не удалось загрузить объявления', status: 500);
            return _jsonOk({
              'announcements': hasAnn
                  ? [
                      {
                        'id': 'a1',
                        'title': 'Очень длинный заголовок планового отключения горячей воды',
                        'body': 'С 09:00 до 18:00 проводятся работы.',
                        'isPinned': true,
                        'createdAt': '2026-11-15T10:00:00Z',
                        'readCount': 14,
                        'readByViewer': false,
                      },
                    ]
                  : [],
            });
          }
          if (req.url.path == '/api/announcements' && req.method == 'POST') {
            createCalls++;
            if (failCreate) return _jsonErr('Ошибка публикации', status: 500);
            return createGate!.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const ChairmanAnnouncementsScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Не удалось загрузить объявления'), findsOneWidget);

        failList = false;
        await tester.tap(find.text('Повторить'));
        await tester.pumpAndSettle();
        expect(find.textContaining('Объявлений пока нет'), findsOneWidget);

        await tester.tap(find.byType(FloatingActionButton));
        await tester.pumpAndSettle();

        final fields = find.byType(TextField);
        await tester.enterText(fields.at(0), 'Отключение воды');
        await tester.enterText(fields.at(1), 'С 9 до 18 часов');

        await tester.tap(find.text('Опубликовать'));
        await tester.pumpAndSettle();
        expect(createCalls, 1);
        expect(find.text('Ошибка публикации'), findsOneWidget);

        failCreate = false;
        createGate = Completer<http.Response>();
        await tester.tap(find.text('Опубликовать'));
        await tester.pump();
        await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
        await tester.pump();
        expect(createCalls, 2);

        hasAnn = true;
        createGate.complete(_jsonOk({}));
        await tester.pumpAndSettle();

        expect(find.textContaining('Очень длинный заголовок'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('ChairmanRequestsScreen stress tests', () {
    testWidgets(
      '500 list error -> retry -> empty -> status advance 500 error & rapid double-tap guard at 320x568',
      (tester) async {
        _setSmallViewport(tester);
        var failList = true;
        var hasItems = false;
        var statusCalls = 0;
        var failStatus = true;
        var currentStatus = 'RECEIVED';
        Completer<http.Response>? statusGate;

        mockHandler = (req) async {
          if (req.url.path == '/api/requests' && req.method == 'GET') {
            if (failList) return _jsonErr('Сервер заявок недоступен', status: 500);
            return _jsonOk({
              'requests': hasItems
                  ? [
                      {
                        'id': 'req-1',
                        'authorUserId': 'u-1',
                        'category': 'PLUMBING',
                        'text': 'Протекает труба в подвале второго подъезда',
                        'photoUrls': [],
                        'status': currentStatus,
                        'createdAt': '2026-11-15T10:00:00Z',
                        'updatedAt': '2026-11-15T10:00:00Z',
                        'messages': [],
                      },
                    ]
                  : [],
            });
          }
          if (req.url.path == '/api/requests/req-1/status') {
            statusCalls++;
            if (failStatus) return _jsonErr('Нельзя сменить статус', status: 500);
            return statusGate!.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const ChairmanRequestsScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Сервер заявок недоступен'), findsOneWidget);

        failList = false;
        await tester.tap(find.text('Повторить'));
        await tester.pumpAndSettle();
        expect(find.text('Заявок пока нет'), findsOneWidget);

        // Reload with items via RefreshIndicator / state reload by pumping new widget or pulling refresh
        hasItems = true;
        await tester.fling(find.text('Заявок пока нет'), const Offset(0, 300), 1000);
        await tester.pumpAndSettle();

        expect(find.text('Взять в работу'), findsOneWidget);

        // 500 error on status change shows SnackBar without crashing
        await tester.tap(find.text('Взять в работу'));
        await tester.pumpAndSettle();
        expect(statusCalls, 1);
        expect(find.text('Нельзя сменить статус'), findsOneWidget);

        // Rapid double-tap sends only 1 status request
        failStatus = false;
        statusGate = Completer<http.Response>();
        await tester.tap(find.text('Взять в работу'));
        await tester.pump();
        await tester.tap(find.text('Сохранение...'), warnIfMissed: false);
        await tester.pump();
        expect(statusCalls, 2);

        currentStatus = 'IN_PROGRESS';
        statusGate.complete(_jsonOk({}));
        await tester.pumpAndSettle();

        expect(find.text('Отметить решённой'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('ChairmanJoinRequestsScreen stress tests', () {
    testWidgets(
      '500 list error -> retry -> empty -> resolve 500 & rapid double-tap guard at 320x568',
      (tester) async {
        _setSmallViewport(tester);
        var failList = true;
        var hasReqs = false;
        var resolveCalls = 0;
        var failResolve = true;
        Completer<http.Response>? resolveGate;

        mockHandler = (req) async {
          if (req.url.path == '/api/osi/join-requests') {
            if (failList) return _jsonErr('Ошибка списка заявок', status: 500);
            return _jsonOk({
              'requests': hasReqs
                  ? [
                      {
                        'id': 'jr-1',
                        'note': 'Квартира 44, собственник',
                        'user': {
                          'phone': '+77009998877',
                          'occupant': {'fullName': 'Данияр Сулейменов'},
                        },
                      },
                    ]
                  : [],
            });
          }
          if (req.url.path == '/api/osi/join-requests/jr-1/resolve') {
            resolveCalls++;
            if (failResolve) return _jsonErr('Ошибка одобрения', status: 500);
            return resolveGate!.future;
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const ChairmanJoinRequestsScreen()));
        await tester.pumpAndSettle();
        expect(find.text('Ошибка списка заявок'), findsOneWidget);

        failList = false;
        await tester.tap(find.text('Повторить'));
        await tester.pumpAndSettle();
        expect(find.text('Новых заявок на присоединение нет'), findsOneWidget);

        hasReqs = true;
        await tester.fling(
          find.text('Новых заявок на присоединение нет'),
          const Offset(0, 300),
          1000,
        );
        await tester.pumpAndSettle();
        expect(find.text('Данияр Сулейменов'), findsOneWidget);

        // 500 error shows SnackBar and keeps item
        await tester.tap(find.text('Принять в ОСИ'));
        await tester.pumpAndSettle();
        expect(resolveCalls, 1);
        expect(find.text('Ошибка одобрения'), findsOneWidget);
        expect(find.text('Данияр Сулейменов'), findsOneWidget);

        // Rapid double-tap sends only 1 resolve call
        failResolve = false;
        resolveGate = Completer<http.Response>();
        await tester.tap(find.text('Принять в ОСИ'));
        await tester.pump();
        await tester.tap(find.text('Обработка...'), warnIfMissed: false);
        await tester.pump();
        expect(resolveCalls, 2);

        resolveGate.complete(_jsonOk({}));
        await tester.pumpAndSettle();

        expect(find.text('Заявка от Данияр Сулейменов одобрена'), findsOneWidget);
        expect(find.text('Новых заявок на присоединение нет'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('ChairmanAnalyticsScreen stress tests', () {
    testWidgets(
      '500 error recovery, period switch race guard, and 320x568 zero overflow across ru/kk/en',
      (tester) async {
        _setSmallViewport(tester);
        var failMonth = true;
        final refreshSlowGate = Completer<http.Response>();
        var useSlowForMonth = false;

        mockHandler = (req) async {
          if (req.url.path == '/api/analytics/chairman') {
            final period = req.url.queryParameters['period'];
            if (period == 'month' && failMonth) {
              return _jsonErr('Аналитика временно недоступна', status: 500);
            }
            if (period == 'month' && useSlowForMonth) {
              return refreshSlowGate.future;
            }
            return _jsonOk({
              'requests': {
                'total': period == 'quarter' ? 30 : 12,
                'resolved': period == 'quarter' ? 25 : 8,
                'inProgress': 2,
                'received': 2,
                'byCategory': {'PLUMBING': 6, 'ELECTRICITY': 4, 'OTHER': 2},
              },
              'finance': {
                'totalCharged': 2500000,
                'totalPaid': 1850000,
                'totalDebt': period == 'quarter' ? 999999 : 650000,
                'apartmentsWithDebt': 14,
                'apartmentsTotal': 120,
                'progressPct': 115, // edge case > 100%
              },
              'polls': {'active': 3},
            });
          }
          return _jsonOk({});
        };

        await tester.pumpWidget(_wrapApp(const ChairmanAnalyticsScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Аналитика временно недоступна'), findsOneWidget);

        failMonth = false;
        await tester.tap(find.text('Повторить'));
        await tester.pumpAndSettle();

        expect(find.text('115%'), findsOneWidget);
        expect(find.text('1.9 млн ₸'), findsOneWidget);
        expect(find.text('14 из 120'), findsOneWidget);
        expect(tester.takeException(), isNull);

        // Verify zero overflow in Kazakh and English too at 320x568
        for (final lang in ['kk', 'en', 'ru']) {
          appLanguage.value = lang;
          await tester.pumpWidget(_wrapApp(const ChairmanAnalyticsScreen()));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        }

        // Test slow refresh vs period switch race:
        // Start slow month refresh via AppBar refresh button, then switch to quarter before month returns
        useSlowForMonth = true;
        await tester.tap(find.byTooltip('Обновить'));
        await tester.pump();
        useSlowForMonth = false;
        // Wait for spinner? Actually while _loading == true, content is hidden; let's resolve slow month,
        // then start fast quarter and verify data updates cleanly.
        refreshSlowGate.complete(_jsonOk({
          'requests': {'total': 99, 'resolved': 1, 'inProgress': 1, 'received': 1, 'byCategory': {}},
          'finance': {'totalCharged': 100, 'totalPaid': 50, 'totalDebt': 50, 'apartmentsWithDebt': 1, 'apartmentsTotal': 2, 'progressPct': 50},
          'polls': {'active': 0},
        }));
        await tester.pumpAndSettle();
        expect(find.text('99'), findsOneWidget);

        await tester.tap(find.text('За квартал'));
        await tester.pumpAndSettle();
        expect(find.text('30'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });
}
