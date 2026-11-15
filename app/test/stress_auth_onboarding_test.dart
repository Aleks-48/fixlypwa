import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/core/token_store.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:fixly_app/screens/create_osi_screen.dart';
import 'package:fixly_app/screens/home_router.dart';
import 'package:fixly_app/screens/join_osi_screen.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/master_home_shell.dart';
import 'package:fixly_app/screens/master_status_screen.dart';
import 'package:fixly_app/screens/register_screen.dart';
import 'package:fixly_app/screens/resident_home_shell.dart';
import 'package:fixly_app/screens/chairman_home_shell.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

typedef HttpHandler = Future<http.Response> Function(http.Request req);

http.Response _jsonResponse(Object? body, {int status = 200}) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    status,
    headers: const {'content-type': 'application/json; charset=utf-8'},
  );
}

AuthUser _makeUser({
  String id = 'u1',
  String? fullName = 'Тест Пользователь',
  String? activeOsiId,
  List<Map<String, dynamic>> roles = const [],
}) {
  return AuthUser(
    id: id,
    email: 'test@fixly.kz',
    phone: '+77700000000',
    fullName: fullName,
    activeOsiId: activeOsiId,
    osiName: activeOsiId != null ? 'ОСИ Тест' : null,
    apartmentNumber: activeOsiId != null ? '12' : null,
    buildingAddress: activeOsiId != null ? 'ул. Абая 1' : null,
    roles: roles,
  );
}

Widget _wrap320(Widget child, {ThemeData? theme}) {
  return MaterialApp(
    theme: theme ?? AppTheme.lightTheme,
    home: MediaQuery(
      data: const MediaQueryData(size: Size(320, 568)),
      child: child,
    ),
  );
}

void main() {
  late HttpHandler mockHandler;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.testLoad(
      fileInput: 'API_BASE_URL=https://localhost\nENABLE_PUSH=false',
    );
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    SharedPreferences.setMockInitialValues({});
    await initializeDateFormatting('ru', null);

    mockHandler = (req) async => _jsonResponse({'data': {}});
    final client = MockClient((req) => mockHandler(req));
    http.runWithClient(() => ApiClient.instance, () => client);
  });

  setUp(() async {
    appLanguage.value = 'ru';
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    await TokenStore.instance.write('fixture');
    EventsRepository.instance.forceDisconnect();
    EventsRepository.instance.clientFactory = () => MockClient.streaming(
          (req, _) async => http.StreamedResponse(
            const Stream<List<int>>.empty(),
            200,
          ),
        );
    mockHandler = (req) async => _jsonResponse({'data': {}});
  });

  tearDown(() {
    EventsRepository.instance.forceDisconnect();
    EventsRepository.instance.clientFactory = null;
    appLanguage.value = 'ru';
  });

  group('ApiClient & AuthRepository stress', () {
    test('uploadPhoto validates urls payload safely and preserves headers', () async {
      final tempDir = Directory.systemTemp.createTempSync('fixly_upload_test_');
      addTearDown(() => tempDir.deleteSync(recursive: true));
      final jpeg = File('${tempDir.path}/sample.jpg')
        ..writeAsBytesSync([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);

      mockHandler = (req) async {
        expect(req.url.path, '/api/uploads');
        expect(req.headers['X-Client'], 'mobile');
        expect(req.headers['Authorization'], 'Bearer fixture');
        return _jsonResponse({
          'data': {
            'urls': [
              'https://cdn.example/first.jpg',
              'https://cdn.example/second.jpg',
            ],
          },
        });
      };
      final okUrl = await ApiClient.instance.uploadPhoto(jpeg.path);
      expect(okUrl, 'https://cdn.example/first.jpg');

      for (final badPayload in <Object?>[
        {'data': null},
        {'data': 'not-a-map'},
        {'data': <String, dynamic>{}},
        {'data': {'urls': 'not-a-list'}},
        {'data': {'urls': <String>[]}},
        {'data': {'urls': <Object?>[null]}},
        {'data': {'urls': ['   ']}},
      ]) {
        mockHandler = (req) async => _jsonResponse(badPayload);
        await expectLater(
          ApiClient.instance.uploadPhoto(jpeg.path),
          throwsA(
            isA<ApiException>()
                .having((e) => e.code, 'code', 'BAD_RESPONSE')
                .having((e) => e.statusCode, 'statusCode', 500),
          ),
        );
      }
    });

    test('ApiClient converts HTML and non-String error payloads into ApiException', () async {
      mockHandler = (req) async => http.Response('<html>502 Bad Gateway</html>', 502);
      await expectLater(
        ApiClient.instance.get('/api/auth/me'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'BAD_RESPONSE')
              .having((e) => e.statusCode, 'statusCode', 502),
        ),
      );

      mockHandler = (req) async => _jsonResponse({
            'error': {'code': 4290, 'message': ['Too many', 'requests']},
          }, status: 429);
      await expectLater(
        ApiClient.instance.post('/api/auth/login', body: {}, auth: false),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', '4290')
              .having((e) => e.statusCode, 'statusCode', 429),
        ),
      );
    });

    test('AuthRepository safely handles malformed JSON, clears token on failed me(), and force-disconnects SSE on logout', () async {
      mockHandler = (req) async => _jsonResponse({'data': null});
      await expectLater(
        AuthRepository.instance.me(),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'BAD_RESPONSE')),
      );

      mockHandler = (req) async => _jsonResponse({'data': {'user': 'bad'}});
      await expectLater(
        AuthRepository.instance.me(),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'BAD_RESPONSE')),
      );

      // Non-string apartmentNumber + non-Map entry inside roles must not crash
      final parsed = AuthUser.fromJson({
        'user': {'id': 'u1', 'fullName': 'Тест'},
        'activeOsiId': 'osi1',
        'apartmentNumber': 42,
        'roles': [
          'broken-entry',
          {'osiId': 'osi1', 'role': 'RESIDENT'},
        ],
      });
      expect(parsed.apartmentNumber, '42');
      expect(parsed.activeRole, 'RESIDENT');

      // verifyOtp when /me returns 500 must clear the newly written token
      mockHandler = (req) async {
        if (req.url.path == '/api/auth/otp/verify') {
          return _jsonResponse({'data': {'token': 'new-temp-token'}});
        }
        return _jsonResponse({'error': 'Server error'}, status: 500);
      };
      await expectLater(
        AuthRepository.instance.verifyOtp('+77700000000', '123456'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 500)),
      );
      expect(await AuthRepository.instance.hasStoredToken(), isFalse);

      // logout() force-disconnects SSE and clears token even if /logout fails
      await TokenStore.instance.write('active-token');
      EventsRepository.instance.connect();
      EventsRepository.instance.connect();
      expect(EventsRepository.instance.subscriberCount, 2);

      mockHandler = (req) async => _jsonResponse({'error': 'fail'}, status: 500);
      await AuthRepository.instance.logout();
      expect(EventsRepository.instance.subscriberCount, 0);
      expect(await AuthRepository.instance.hasStoredToken(), isFalse);
    });
  });

  group('EventsRepository ref-counting & SSE reconnects', () {
    testWidgets('ref-counted connect/disconnect keeps stream alive until last subscriber disconnects', (tester) async {
      var openCount = 0;
      String? capturedPath;
      String? capturedClientHeader;
      late StreamController<List<int>> streamCtrl;
      EventsRepository.instance.clientFactory = () => MockClient.streaming((req, _) async {
            openCount++;
            capturedPath = req.url.path;
            capturedClientHeader = req.headers['X-Client'];
            return http.StreamedResponse(streamCtrl.stream, 200);
          });

      streamCtrl = StreamController<List<int>>();
      final received = <SseEvent>[];
      final sub = EventsRepository.instance.stream.listen(received.add);
      addTearDown(sub.cancel);

      EventsRepository.instance.connect();
      EventsRepository.instance.connect();
      await tester.pump(Duration.zero);
      expect(openCount, 1);
      expect(capturedPath, '/api/events');
      expect(capturedClientHeader, 'mobile');
      expect(EventsRepository.instance.subscriberCount, 2);

      // First disconnect must NOT close the stream
      EventsRepository.instance.disconnect();
      expect(EventsRepository.instance.subscriberCount, 1);

      // Malformed JSON frame must be ignored without breaking the stream
      streamCtrl.add(utf8.encode('event: notification\ndata: {bad json\n\n'));
      streamCtrl.add(utf8.encode(
        'event: notification\ndata: {"type":"REQUEST_UPDATED","entityId":"req-1"}\n\n',
      ));
      await tester.pump(Duration.zero);
      expect(received.length, 1);
      expect(received.first.type, 'REQUEST_UPDATED');
      expect(received.first.entityId, 'req-1');

      // Second disconnect closes and clamps at 0
      EventsRepository.instance.disconnect();
      EventsRepository.instance.disconnect();
      expect(EventsRepository.instance.subscriberCount, 0);
      expect(EventsRepository.instance.hasReconnectTimer, isFalse);

      // Events pushed after final disconnect must NOT be delivered
      streamCtrl.add(utf8.encode(
        'event: notification\ndata: {"type":"REQUEST_UPDATED","entityId":"req-2"}\n\n',
      ));
      unawaited(streamCtrl.close());
      await tester.pump(Duration.zero);
      expect(received.length, 1);
    });

    testWidgets('reconnects with backoff on errors without duplicating timers and cleans up on forceDisconnect', (tester) async {
      var attempts = 0;
      EventsRepository.instance.clientFactory = () => MockClient.streaming((req, _) async {
            attempts++;
            if (attempts <= 2) {
              return http.StreamedResponse(const Stream<List<int>>.empty(), 500);
            }
            final controller = StreamController<List<int>>();
            // Keep open briefly then error
            Timer(const Duration(milliseconds: 50), () {
              if (!controller.isClosed) {
                controller.addError(const SocketException('drop'));
              }
            });
            return http.StreamedResponse(controller.stream, 200);
          });

      EventsRepository.instance.connect();
      await tester.pump();
      expect(attempts, 1);
      expect(EventsRepository.instance.hasReconnectTimer, isTrue);
      expect(EventsRepository.instance.retryAttempt, 1);

      // Before 1s elapses, another connect() must NOT duplicate timers or open a 2nd socket
      EventsRepository.instance.connect();
      await tester.pump(const Duration(milliseconds: 500));
      expect(attempts, 1);

      // 1s triggers attempt #2 (fails with 500 -> schedules 2s backoff)
      await tester.pump(const Duration(milliseconds: 600));
      expect(attempts, 2);
      expect(EventsRepository.instance.retryAttempt, 2);
      expect(EventsRepository.instance.hasReconnectTimer, isTrue);

      // 1.5s is not enough for 2s backoff
      await tester.pump(const Duration(milliseconds: 1500));
      expect(attempts, 2);

      // Remaining 0.6s triggers attempt #3 (200 OK resets retryAttempt, then stream error schedules 1s)
      await tester.pump(const Duration(milliseconds: 600));
      expect(attempts, 3);
      await tester.pump(const Duration(milliseconds: 100));
      expect(EventsRepository.instance.retryAttempt, 1);
      expect(EventsRepository.instance.hasReconnectTimer, isTrue);

      // forceDisconnect cancels pending timer cleanly (no pending timer assertion failure)
      EventsRepository.instance.forceDisconnect();
      expect(EventsRepository.instance.subscriberCount, 0);
      expect(EventsRepository.instance.hasReconnectTimer, isFalse);
      await tester.pump(const Duration(seconds: 5));
      expect(attempts, 3);
    });
  });

  group('HomeRouter role routing & video call resilience', () {
    testWidgets('RESIDENT and CHAIRMAN roles route directly without polling /api/master/me or /api/video-calls', (tester) async {
      final requestedPaths = <String>[];
      mockHandler = (req) async {
        requestedPaths.add(req.url.path);
        return _jsonResponse({'data': {}});
      };

      final resident = _makeUser(
        activeOsiId: 'osi1',
        roles: [
          {'osiId': 'osi1', 'role': 'RESIDENT'},
        ],
      );
      await tester.pumpWidget(_wrap320(HomeRouter(user: resident)));
      await tester.pump(const Duration(seconds: 7));
      expect(find.byType(ResidentHomeShell), findsOneWidget);
      expect(requestedPaths.contains('/api/master/me'), isFalse);
      expect(requestedPaths.contains('/api/video-calls'), isFalse);

      requestedPaths.clear();
      final chairman = _makeUser(
        activeOsiId: 'osi1',
        roles: [
          {'osiId': 'osi1', 'role': 'CHAIRMAN'},
        ],
      );
      await tester.pumpWidget(_wrap320(HomeRouter(user: chairman)));
      await tester.pump(const Duration(seconds: 7));
      expect(find.byType(ChairmanHomeShell), findsOneWidget);
      expect(requestedPaths.contains('/api/master/me'), isFalse);
      expect(requestedPaths.contains('/api/video-calls'), isFalse);
    });

    testWidgets('role-less user routes to JoinOsiScreen / MasterStatusScreen / MasterHomeShell', (tester) async {
      final noRoleUser = _makeUser();

      // 1. master == null -> JoinOsiScreen
      mockHandler = (req) async {
        if (req.url.path == '/api/master/me') return _jsonResponse({'data': {'master': null}});
        if (req.url.path == '/api/osi/join-request') return _jsonResponse({'data': {'requests': []}});
        return _jsonResponse({'data': {}});
      };
      await tester.pumpWidget(_wrap320(HomeRouter(user: noRoleUser)));
      await tester.pumpAndSettle();
      expect(find.byType(JoinOsiScreen), findsOneWidget);

      // 2. master PENDING -> MasterStatusScreen
      mockHandler = (req) async {
        if (req.url.path == '/api/master/me') {
          return _jsonResponse({
            'data': {
              'master': {
                'id': 'm1',
                'status': 'PENDING',
                'city': 'Кокшетау',
                'categories': ['PLUMBING'],
                'fullName': 'Мастер Тест',
              }
            }
          });
        }
        return _jsonResponse({'data': {}});
      };
      await tester.pumpWidget(_wrap320(HomeRouter(user: _makeUser(id: 'u2'))));
      await tester.pumpAndSettle();
      expect(find.byType(MasterStatusScreen), findsOneWidget);
    });

    testWidgets('APPROVED master handles non-Map video-calls, prevents overlapping polls, and handles null call name', (tester) async {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      addTearDown(
        () => tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.detached),
      );

      var videoCallHits = 0;
      Completer<http.Response>? slowPollCompleter;
      var mode = 'non_map';

      mockHandler = (req) async {
        if (req.url.path == '/api/master/me') {
          return _jsonResponse({
            'data': {
              'master': {
                'id': 'm1',
                'status': 'APPROVED',
                'city': 'Кокшетау',
                'categories': ['PLUMBING'],
                'fullName': 'Мастер Тест',
              }
            }
          });
        }
        if (req.url.path == '/api/master/me/details') {
          return _jsonResponse({
            'data': {
              'master': {
                'id': 'm1',
                'fullName': 'Мастер Тест',
                'city': 'Кокшетау',
                'categories': ['PLUMBING'],
                'portfolio': [],
                'reviews': [],
              }
            }
          });
        }
        if (req.url.path == '/api/listings') {
          return _jsonResponse({'data': {'listings': []}});
        }
        if (req.url.path == '/api/offers') {
          return _jsonResponse({'data': {'offers': []}});
        }
        if (req.url.path == '/api/video-calls' && req.method == 'GET') {
          videoCallHits++;
          if (mode == 'non_map') {
            return _jsonResponse({'data': {'call': 'bad-string-payload'}});
          }
          if (mode == 'slow') {
            slowPollCompleter = Completer<http.Response>();
            return slowPollCompleter!.future;
          }
          if (mode == 'incoming_null_name') {
            return _jsonResponse({
              'data': {
                'call': {
                  'id': 'call-1',
                  'incoming': true,
                  'answered': false,
                  'name': null,
                }
              }
            });
          }
        }
        return _jsonResponse({'data': {}});
      };

      await tester.pumpWidget(_wrap320(HomeRouter(user: _makeUser())));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byType(MasterHomeShell), findsOneWidget);

      // 3s tick with non-Map call payload must not throw
      await tester.pump(const Duration(seconds: 3));
      expect(videoCallHits, 1);
      expect(tester.takeException(), isNull);

      // Slow network: 2 ticks pass while request is in-flight -> still only 1 concurrent GET
      mode = 'slow';
      await tester.pump(const Duration(seconds: 3));
      expect(videoCallHits, 2);
      await tester.pump(const Duration(seconds: 3));
      await tester.pump(const Duration(seconds: 3));
      expect(videoCallHits, 2);

      // Complete slow poll, next tick triggers incoming call with null name
      mode = 'incoming_null_name';
      slowPollCompleter!.complete(_jsonResponse({'data': null}));
      await tester.pump();
      await tester.pump(const Duration(seconds: 3));
      await tester.pump();

      expect(find.text('Входящий видеозвонок'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Reject the call so dialog + timer dispose cleanly
      await tester.tap(find.text('Отклонить'));
      await tester.pump();

      // Unmount HomeRouter to verify periodic timer is cancelled
      await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
      await tester.pump();
    });
  });

  group('LoginPage stress', () {
    testWidgets('renders without overflow at 320x568 across modes, steps, and languages', (tester) async {
      for (final lang in ['ru', 'kk', 'en']) {
        appLanguage.value = lang;
        await tester.pumpWidget(_wrap320(const LoginPage()));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);

        // Switch to Chairman password mode
        final chairmanTab = switch (lang) {
          'en' => 'Chairman (Password)',
          'kk' => 'Төраға (Құпиясөз)',
          _ => 'Председатель (Пароль)',
        };
        await tester.tap(find.text(chairmanTab));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      }
    });

    testWidgets('rapid double-tap sends only 1 request and localizes 429/500 errors', (tester) async {
      var otpRequests = 0;
      var verifyRequests = 0;
      var passwordRequests = 0;
      Completer<http.Response>? pending;

      mockHandler = (req) async {
        final activePending = pending;
        if (req.url.path == '/api/auth/otp/request') {
          otpRequests++;
          if (activePending != null && !activePending.isCompleted) {
            return activePending.future;
          }
          return _jsonResponse({'data': {'devCode': '654321'}});
        }
        if (req.url.path == '/api/auth/otp/verify') {
          verifyRequests++;
          if (activePending != null && !activePending.isCompleted) {
            return activePending.future;
          }
          return _jsonResponse(
            {'error': {'code': 'RATE_LIMITED', 'message': 'Too fast'}},
            status: 429,
          );
        }
        if (req.url.path == '/api/auth/login') {
          passwordRequests++;
          if (activePending != null && !activePending.isCompleted) {
            return activePending.future;
          }
          return _jsonResponse({'error': 'Internal server error'}, status: 500);
        }
        return _jsonResponse({'data': {}});
      };

      await tester.pumpWidget(_wrap320(const LoginPage()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'user@fixly.kz');
      pending = Completer<http.Response>();

      final getCodeBtn = find.text('Получить код');
      await tester.ensureVisible(getCodeBtn);
      await tester.tap(getCodeBtn);
      await tester.pump();
      // Rapid second tap while in-flight
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(otpRequests, 1);

      // Trying to switch tab while loading must be ignored
      await tester.tap(find.text('Председатель (Пароль)'));
      await tester.pump();

      pending.complete(_jsonResponse({'data': {'devCode': '654321'}}));
      await tester.pumpAndSettle();

      // Now on code step (devCode visible)
      expect(find.text('Code (dev): 654321'), findsOneWidget);
      await tester.enterText(find.byType(TextFormField).first, '654321');
      pending = Completer<http.Response>();
      final signInBtn = find.text('Войти');
      await tester.ensureVisible(signInBtn);
      await tester.tap(signInBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(verifyRequests, 1);

      pending.complete(
        _jsonResponse({'error': 'Rate limit'}, status: 429),
      );
      await tester.pumpAndSettle();
      expect(find.text('Слишком много попыток. Попробуйте позже'), findsOneWidget);

      // Switch to password mode and test 500 + double-tap
      await tester.tap(find.text('Председатель (Пароль)'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField).at(0), 'chair@fixly.kz');
      await tester.enterText(find.byType(TextFormField).at(1), 'secret123');
      pending = Completer<http.Response>();
      final chairBtn = find.text('Войти как председатель');
      await tester.ensureVisible(chairBtn);
      await tester.tap(chairBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(passwordRequests, 1);

      pending.complete(_jsonResponse({'error': 'Внутренняя ошибка сервера'}, status: 500));
      await tester.pumpAndSettle();
      expect(find.text('Внутренняя ошибка сервера'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('JoinOsiScreen stress', () {
    testWidgets('discards out-of-order search responses and keeps newer query state', (tester) async {
      final queryCompleters = <String, Completer<http.Response>>{};
      mockHandler = (req) async {
        if (req.url.path == '/api/osi/join-request') {
          return _jsonResponse({'data': {'requests': []}});
        }
        if (req.url.path == '/api/osi/search') {
          final q = req.url.queryParameters['q'] ?? '';
          final c = Completer<http.Response>();
          queryCompleters[q] = c;
          return c.future;
        }
        return _jsonResponse({'data': {}});
      };

      await tester.pumpWidget(_wrap320(const JoinOsiScreen()));
      await tester.pumpAndSettle();

      // First query: "Абай"
      await tester.enterText(find.byType(TextField).first, 'Абай');
      await tester.pump(const Duration(milliseconds: 300));
      expect(queryCompleters.containsKey('Абай'), isTrue);
      expect(find.text('Ищем…'), findsOneWidget);

      // Second query while first is still in flight: "Байтерек"
      await tester.enterText(find.byType(TextField).first, 'Байтерек');
      await tester.pump(const Duration(milliseconds: 300));
      expect(queryCompleters.containsKey('Байтерек'), isTrue);

      // Newer query completes FIRST
      queryCompleters['Байтерек']!.complete(_jsonResponse({
        'data': {
          'results': [
            {'id': 'osi-new', 'name': 'ОСИ Байтерек', 'address': 'пр. Байтерек 7'},
          ],
        },
      }));
      await tester.pumpAndSettle();
      expect(find.text('ОСИ Байтерек'), findsOneWidget);
      expect(find.text('Ищем…'), findsNothing);

      // Older query completes LATE — must be discarded
      queryCompleters['Абай']!.complete(_jsonResponse({
        'data': {
          'results': [
            {'id': 'osi-old', 'name': 'ОСИ Абай Старый', 'address': 'ул. Абая 1'},
          ],
        },
      }));
      await tester.pumpAndSettle();
      expect(find.text('ОСИ Байтерек'), findsOneWidget);
      expect(find.text('ОСИ Абай Старый'), findsNothing);

      // Clearing query below 2 chars while a search is in-flight cancels late results
      await tester.enterText(find.byType(TextField).first, 'Алматы');
      await tester.pump(const Duration(milliseconds: 300));
      expect(queryCompleters.containsKey('Алматы'), isTrue);
      await tester.enterText(find.byType(TextField).first, 'А');
      await tester.pump();
      queryCompleters['Алматы']!.complete(_jsonResponse({
        'data': {
          'results': [
            {'id': 'osi-late', 'name': 'ОСИ Алматы Поздний', 'address': 'ул. Достык 10'},
          ],
        },
      }));
      await tester.pumpAndSettle();
      expect(find.text('ОСИ Алматы Поздний'), findsNothing);
      expect(find.text('Ищем…'), findsNothing);
      expect(find.text('Ничего не нашли — проверьте название.'), findsNothing);
    });

    testWidgets('handles 320x568 selection without overflow, guards double-submit/cancel, shows cancel errors, and survives unmount', (tester) async {
      var submitCount = 0;
      var cancelCount = 0;
      Completer<http.Response>? submitCompleter;
      Completer<http.Response>? cancelCompleter;

      mockHandler = (req) async {
        if (req.url.path == '/api/osi/join-request' && req.method == 'GET') {
          return _jsonResponse({'data': {'requests': []}});
        }
        if (req.url.path == '/api/osi/search') {
          return _jsonResponse({
            'data': {
              'results': [
                {'id': 'osi-1', 'name': 'ОСИ Сарыарка Комфорт', 'address': 'ул. Сарыарка 15'},
              ],
            },
          });
        }
        if (req.url.path == '/api/osi/join-request' && req.method == 'POST') {
          submitCount++;
          return submitCompleter!.future;
        }
        if (req.url.path == '/api/osi/join-request/req-1' && req.method == 'DELETE') {
          cancelCount++;
          return cancelCompleter!.future;
        }
        return _jsonResponse({'data': {}});
      };

      await tester.pumpWidget(_wrap320(const JoinOsiScreen()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, 'Сарыарка');
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpAndSettle();

      // Select OSI -> verify 320x568 has ZERO RenderFlex overflow
      await tester.tap(find.text('ОСИ Сарыарка Комфорт'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      // Rapid double-tap submit
      submitCompleter = Completer<http.Response>();
      final sendBtn = find.text('Отправить заявку');
      await tester.ensureVisible(sendBtn);
      await tester.tap(sendBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(submitCount, 1);

      submitCompleter.complete(_jsonResponse({
        'data': {'request': {'id': 'req-1'}},
      }));
      await tester.pumpAndSettle();
      expect(find.text('Отменить заявку'), findsOneWidget);

      // Rapid double-tap cancel + 500 error must be visible!
      cancelCompleter = Completer<http.Response>();
      final cancelBtn = find.text('Отменить заявку');
      await tester.ensureVisible(cancelBtn);
      await tester.tap(cancelBtn);
      await tester.pump();
      await tester.tap(find.text('Отменяем…'));
      await tester.pump();
      expect(cancelCount, 1);

      cancelCompleter.complete(_jsonResponse({'error': 'Ошибка отмены заявки'}, status: 500));
      await tester.pumpAndSettle();
      expect(find.text('Ошибка отмены заявки'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Now test unmounting during in-flight _submit() failure
      await tester.pumpWidget(_wrap320(JoinOsiScreen(key: UniqueKey())));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, 'Сарыарка');
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpAndSettle();
      await tester.tap(find.text('ОСИ Сарыарка Комфорт'));
      await tester.pumpAndSettle();

      submitCompleter = Completer<http.Response>();
      await tester.ensureVisible(find.text('Отправить заявку'));
      await tester.tap(find.text('Отправить заявку'));
      await tester.pump();

      // Unmount while submit is in-flight
      await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
      submitCompleter.complete(_jsonResponse({'error': 'Server down'}, status: 500));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('RegisterScreen & CreateOsiScreen stress', () {
    testWidgets('RegisterScreen renders cleanly at 320x568, guards double-tap, and survives unmount error', (tester) async {
      var otpCount = 0;
      Completer<http.Response>? otpCompleter;
      mockHandler = (req) async {
        if (req.url.path == '/api/auth/otp/request') {
          otpCount++;
          return otpCompleter!.future;
        }
        return _jsonResponse({'data': {}});
      };

      await tester.pumpWidget(_wrap320(const RegisterScreen()));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('title_register'), findsNothing);

      await tester.tap(find.text('Председатель'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.enterText(find.byType(TextFormField).at(0), 'Иванов Иван');
      await tester.enterText(find.byType(TextFormField).at(1), '+77700000001');

      otpCompleter = Completer<http.Response>();
      final continueBtn = find.text('Продолжить');
      await tester.ensureVisible(continueBtn);
      await tester.tap(continueBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(otpCount, 1);

      otpCompleter.complete(_jsonResponse({'data': {'devCode': '112233'}}));
      await tester.pumpAndSettle();
      expect(find.text('btn_verify_code'), findsNothing);
      expect(tester.takeException(), isNull);

      // Unmount during in-flight verify error
      var verifyCount = 0;
      Completer<http.Response>? verifyCompleter;
      mockHandler = (req) async {
        if (req.url.path == '/api/auth/otp/verify') {
          verifyCount++;
          return verifyCompleter!.future;
        }
        return _jsonResponse({'data': {}});
      };

      await tester.enterText(find.byType(TextFormField).first, '112233');
      verifyCompleter = Completer<http.Response>();
      final verifyBtn = find.text('Подтвердить');
      await tester.ensureVisible(verifyBtn);
      await tester.tap(verifyBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(verifyCount, 1);

      await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
      verifyCompleter.complete(_jsonResponse({'error': 'Invalid code'}, status: 400));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('CreateOsiScreen handles 320x568, double-tap on Next and Skip, 500 errors, and unmount safety', (tester) async {
      var createOsiCount = 0;
      var meCount = 0;
      Completer<http.Response>? osiCompleter;
      Completer<http.Response>? meCompleter;

      mockHandler = (req) async {
        if (req.url.path == '/api/osi') {
          createOsiCount++;
          return osiCompleter!.future;
        }
        if (req.url.path == '/api/auth/me') {
          meCount++;
          return meCompleter!.future;
        }
        return _jsonResponse({'data': {}});
      };

      await tester.pumpWidget(_wrap320(const CreateOsiScreen()));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.enterText(find.byType(TextFormField).at(0), 'ОСИ Жулдыз');
      osiCompleter = Completer<http.Response>();
      await tester.tap(find.text('Далее'));
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(createOsiCount, 1);

      // 500 error shows message cleanly
      osiCompleter.complete(_jsonResponse({'error': 'Ошибка создания ОСИ'}, status: 500));
      await tester.pumpAndSettle();
      expect(find.text('Ошибка создания ОСИ'), findsOneWidget);

      // Retry succeeds -> moves to step 2 (building)
      osiCompleter = Completer<http.Response>();
      await tester.tap(find.text('Далее'));
      await tester.pump();
      osiCompleter.complete(_jsonResponse({'data': {'activeOsiId': 'osi-new'}}));
      await tester.pumpAndSettle();
      expect(find.text('Добавьте дом'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Double-tap "Добавить дом позже" sends only 1 /api/auth/me and handles 500 error cleanly
      meCompleter = Completer<http.Response>();
      await tester.tap(find.text('Добавить дом позже'));
      await tester.pump();
      await tester.tap(find.text('Добавить дом позже'));
      await tester.pump();
      expect(meCount, 1);

      meCompleter.complete(_jsonResponse({'error': 'Сервер недоступен'}, status: 500));
      await tester.pumpAndSettle();
      expect(find.text('Сервер недоступен'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Unmount during in-flight _createBuildingAndFinish failure
      var buildingCount = 0;
      Completer<http.Response>? buildingCompleter;
      mockHandler = (req) async {
        if (req.url.path == '/api/buildings') {
          buildingCount++;
          return buildingCompleter!.future;
        }
        return _jsonResponse({'data': {}});
      };
      await tester.enterText(find.byType(TextFormField).first, 'ул. Абая 48');
      buildingCompleter = Completer<http.Response>();
      await tester.tap(find.text('Готово'));
      await tester.pump();
      expect(buildingCount, 1);

      await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
      buildingCompleter.complete(_jsonResponse({'error': 'Failed'}, status: 500));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
