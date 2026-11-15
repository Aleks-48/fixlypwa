import 'dart:async';
import 'dart:convert';

import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/screens/master_application_screen.dart';
import 'package:fixly_app/screens/master_call_screen.dart';
import 'package:fixly_app/screens/master_home_shell.dart';
import 'package:fixly_app/screens/master_listings_screen.dart';
import 'package:fixly_app/screens/master_offers_screen.dart';
import 'package:fixly_app/screens/master_profile_screen.dart';
import 'package:fixly_app/screens/master_status_screen.dart';
import 'package:fixly_app/screens/masters_map_screen.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

typedef HttpMockHandler = Future<http.Response> Function(http.Request req);

http.Response jsonOk(Object? data, [int status = 200]) => http.Response.bytes(
      utf8.encode(jsonEncode({'data': data})),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

http.Response jsonErr(String message, [int status = 500]) =>
    http.Response.bytes(
      utf8.encode(jsonEncode({
        'error': {'code': 'ERR', 'message': message}
      })),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Widget wrapApp(Widget child, {Size size = const Size(390, 844)}) {
  return MediaQuery(
    data: MediaQueryData(size: size),
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: child,
    ),
  );
}

AuthUser makeUser() => AuthUser(
      id: 'u1',
      email: 'master@test.kz',
      phone: '+77001112233',
      fullName: 'Иван Мастеров',
      roles: const [],
    );

MasterProfile makeMaster({
  String fullName = 'Иван Мастеров',
  String city = 'Кокшетау',
  String? bio = 'Опыт 5 лет',
  String status = 'APPROVED',
}) =>
    MasterProfile(
      id: 'm1',
      status: status,
      city: city,
      categories: const ['PLUMBING', 'ELECTRICITY'],
      fullName: fullName,
      bio: bio,
    );

PublicMaster makePublicMaster({
  String id = 'pm1',
  String fullName = 'Мастер Тестов С Очень Длинным Именем Фамилией',
  String city = 'Кокшетау',
  List<String> categories = const ['PLUMBING'],
  double? lat = 53.28,
  double? lng = 69.38,
}) =>
    PublicMaster(
      id: id,
      fullName: fullName,
      shortName: fullName,
      city: city,
      categories: categories,
      bio: 'Сантехник широкого профиля с большим опытом работы',
      phone: '+77009998877',
      rating: 4.8,
      reviewsCount: 15,
      lat: lat,
      lng: lng,
    );

void main() {
  late HttpMockHandler mockHandler;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.testLoad(fileInput: 'API_BASE_URL=https://localhost\nENABLE_PUSH=false');
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    SharedPreferences.setMockInitialValues({});
    await initializeDateFormatting('ru', null);

    mockHandler = (req) async => jsonOk({});
    final client = MockClient((req) => mockHandler(req));
    http.runWithClient(() => ApiClient.instance, () => client);
  });

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    mockHandler = (req) async => jsonOk({});
  });

  tearDown(() {
    EventsRepository.instance.disconnect();
  });

  group('MasterHomeShell profile edit & stress', () {
    testWidgets('500 on profile save is caught gracefully and allows retry',
        (tester) async {
      mockHandler = (req) async {
        if (req.url.path == '/api/master/me/details') {
          return jsonOk({'master': null});
        }
        if (req.url.path == '/api/auth/profile' && req.method == 'PATCH') {
          return jsonErr('Ошибка сервера при обновлении ФИО', 500);
        }
        if (req.url.path == '/api/master/me' && req.method == 'PATCH') {
          return jsonErr('Ошибка сохранения профиля', 500);
        }
        return jsonOk({});
      };

      await tester.pumpWidget(
        wrapApp(MasterHomeShell(user: makeUser(), master: makeMaster())),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Профиль'));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Редактировать профиль'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Сохранить'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text('Ошибка сервера при обновлении ФИО'), findsOneWidget);
      expect(find.byType(AlertDialog), findsOneWidget);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
    });

    testWidgets(
        'double-tap on Save sends only one update and successful edit updates UI immediately',
        (tester) async {
      var authPatchCount = 0;
      var masterPatchCount = 0;
      final authGate = Completer<void>();

      mockHandler = (req) async {
        if (req.url.path == '/api/master/me/details') {
          return jsonOk({
            'master': {
              'id': 'm1',
              'fullName': 'Иван Мастеров',
              'city': 'Кокшетау',
              'categories': ['PLUMBING', 'ELECTRICITY'],
              'bio': 'Опыт 5 лет',
              'rating': 4.9,
              'reviewsCount': 3,
              'offersCount': 7,
              'portfolio': [],
              'reviews': [],
            }
          });
        }
        if (req.url.path == '/api/auth/profile' && req.method == 'PATCH') {
          authPatchCount++;
          await authGate.future;
          return jsonOk({'user': {'id': 'u1', 'fullName': 'Пётр Обновлённый'}});
        }
        if (req.url.path == '/api/master/me' && req.method == 'PATCH') {
          masterPatchCount++;
          return jsonOk({
            'master': {
              'id': 'm1',
              'status': 'APPROVED',
              'city': 'Астана',
              'categories': ['PLUMBING', 'ELECTRICITY'],
              'fullName': 'Пётр Обновлённый',
              'bio': 'Новый био текст',
            }
          });
        }
        return jsonOk({});
      };

      await tester.pumpWidget(
        wrapApp(MasterHomeShell(user: makeUser(), master: makeMaster())),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Профиль'));
      await tester.pumpAndSettle();

      expect(find.text('Иван Мастеров'), findsOneWidget);
      expect(find.text('Кокшетау'), findsOneWidget);
      expect(find.text('Опыт 5 лет'), findsOneWidget);

      await tester.tap(find.byTooltip('Редактировать профиль'));
      await tester.pumpAndSettle();

      final fields = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.byType(TextField),
      );
      await tester.enterText(fields.at(0), 'Пётр Обновлённый');
      await tester.enterText(fields.at(1), 'Астана');
      await tester.enterText(fields.at(2), 'Новый био текст');

      final saveBtn = find.text('Сохранить');
      await tester.tap(saveBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
      await tester.pump();

      expect(authPatchCount, 1);

      authGate.complete();
      await tester.pumpAndSettle();

      expect(authPatchCount, 1);
      expect(masterPatchCount, 1);
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.text('Пётр Обновлённый'), findsOneWidget);
      expect(find.text('Астана'), findsOneWidget);
      expect(find.text('Новый био текст'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
    });

    testWidgets('MasterHomeShell renders all tabs at 320x568 without overflow',
        (tester) async {
      mockHandler = (req) async {
        if (req.url.path == '/api/master/me/details') {
          return jsonOk({
            'master': {
              'id': 'm1',
              'fullName': 'Иван Мастеров Очень Длинное ФИО Для Проверки',
              'city': 'Кокшетау',
              'categories': ['PLUMBING', 'ELECTRICITY', 'CLEANING'],
              'bio': 'Качественный ремонт любой сложности в кратчайшие сроки',
              'rating': 4.9,
              'reviewsCount': 12,
              'offersCount': 34,
              'portfolio': [
                {
                  'id': 'p1',
                  'title': 'Замена стояка и установка счётчиков воды',
                  'description': 'Полный монтаж полипропиленовых труб',
                  'category': 'PLUMBING',
                  'photoUrls': [],
                }
              ],
              'reviews': [],
            }
          });
        }
        if (req.url.path == '/api/master/listings') {
          return jsonOk({'listings': []});
        }
        if (req.url.path == '/api/master/offers') {
          return jsonOk({'offers': []});
        }
        return jsonOk({});
      };

      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        wrapApp(
          MasterHomeShell(user: makeUser(), master: makeMaster()),
          size: const Size(320, 568),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('Откликов'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('Профиль'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.scrollUntilVisible(
        find.text('Добавить'),
        200,
        scrollable: find.descendant(
          of: find.byType(RefreshIndicator),
          matching: find.byType(Scrollable),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Добавить'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('Добавить работу в портфолио').last);
      await tester.pumpAndSettle();
      expect(find.text('Введите название работы'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
    });
  });

  group('MasterListingsScreen & MarketRepository stress', () {
    testWidgets('opening and disposing disconnects SSE cleanly', (tester) async {
      mockHandler = (req) async {
        if (req.url.path == '/api/master/listings') {
          return jsonOk({'listings': []});
        }
        if (req.url.path == '/api/master/offers') {
          return jsonOk({'offers': []});
        }
        return jsonOk({});
      };

      await tester.pumpWidget(wrapApp(const MasterListingsScreen()));
      await tester.pumpAndSettle();
      expect(find.text('Пока нет заказов в вашем городе — загляните позже'),
          findsOneWidget);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
      expect(tester.takeException(), isNull);
    });

    testWidgets('rapid offer submit only sends once and handles 500 cleanly',
        (tester) async {
      var respondCount = 0;
      final gate = Completer<void>();

      mockHandler = (req) async {
        if (req.url.path == '/api/master/listings') {
          return jsonOk({
            'listings': [
              {
                'id': 'l1',
                'category': 'PLUMBING',
                'title': 'Протекает труба в ванной',
                'description': 'Нужно заменить прокладку и проверить давление',
                'photoUrls': [],
                'buildingLabel': 'ул. Абая 10',
                'status': 'PUBLISHED',
                'publishedAt': '2026-11-15T10:00:00Z',
              }
            ]
          });
        }
        if (req.url.path == '/api/master/offers') {
          return jsonOk({'offers': []});
        }
        if (req.url.path == '/api/master/listings/l1/offers') {
          respondCount++;
          await gate.future;
          return jsonErr('Вы уже откликнулись или лимит исчерпан', 500);
        }
        return jsonOk({});
      };

      await tester.pumpWidget(wrapApp(const MasterListingsScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Откликнуться'));
      await tester.pumpAndSettle();

      final msgField = find.byType(TextField).first;
      await tester.enterText(msgField, 'Готов выехать сегодня');

      final submitBtn = find.widgetWithText(ElevatedButton, 'Откликнуться');
      await tester.tap(submitBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
      await tester.pump();

      expect(respondCount, 1);

      gate.complete();
      await tester.pumpAndSettle();

      expect(respondCount, 1);
      expect(find.text('Вы уже откликнулись или лимит исчерпан'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
    });

    testWidgets('malformed and 500 market responses render error state cleanly',
        (tester) async {
      var mode = 0;
      mockHandler = (req) async {
        if (req.url.path == '/api/master/offers') {
          return jsonOk({'offers': []});
        }
        if (req.url.path == '/api/master/listings') {
          if (mode == 0) return jsonErr('Временная ошибка базы', 500);
          if (mode == 1) return jsonOk('not-a-map');
          if (mode == 2) return jsonOk({'listings': 'not-a-list'});
          return jsonOk({
            'listings': [
              {
                'id': 'l2',
                'category': 'ELECTRICITY',
                'title': 'Не работает автомат',
                'description': 'Щиток в подъезде',
                'photoUrls': [],
                'buildingLabel': 'ул. Мира 5',
                'status': 'PUBLISHED',
                'publishedAt': '2026-11-15T10:00:00Z',
              }
            ]
          });
        }
        return jsonOk({});
      };

      await tester.pumpWidget(wrapApp(const MasterListingsScreen()));
      await tester.pumpAndSettle();
      expect(find.text('Повторить'), findsOneWidget);
      expect(tester.takeException(), isNull);

      mode = 1;
      await tester.tap(find.text('Повторить'));
      await tester.pumpAndSettle();
      expect(find.text('Некорректный ответ сервера'), findsOneWidget);
      expect(tester.takeException(), isNull);

      mode = 2;
      await tester.tap(find.text('Повторить'));
      await tester.pumpAndSettle();
      expect(find.text('Некорректный ответ сервера'), findsOneWidget);
      expect(tester.takeException(), isNull);

      mode = 3;
      await tester.tap(find.text('Повторить'));
      await tester.pumpAndSettle();
      expect(find.text('Не работает автомат'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
    });

    testWidgets('MasterListingsScreen and sheet render at 320x568 without overflow',
        (tester) async {
      mockHandler = (req) async {
        if (req.url.path == '/api/master/listings') {
          return jsonOk({
            'listings': [
              {
                'id': 'l1',
                'category': 'PLUMBING',
                'title':
                    'Срочная замена магистрального крана в подвале дома № 14',
                'description':
                    'Очень длинное описание неисправности, которое должно аккуратно обрезаться тремя строками без выхода за пределы экрана 320x568.',
                'photoUrls': [],
                'buildingLabel': 'ЖК Северное Сияние, корп. 2',
                'status': 'PUBLISHED',
                'publishedAt': '2026-11-15T10:00:00Z',
              }
            ]
          });
        }
        if (req.url.path == '/api/master/offers') {
          return jsonOk({'offers': []});
        }
        return jsonOk({});
      };

      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        wrapApp(const MasterListingsScreen(), size: const Size(320, 568)),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('Откликнуться'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
    });
  });

  group('MasterCallScreen stress', () {
    const webrtcChannel = MethodChannel('FlutterWebRTC.Method');

    void installWebRtcMocks() {
      var textureCounter = 0;
      var pcCounter = 0;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(webrtcChannel, (call) async {
        switch (call.method) {
          case 'initialize':
            return null;
          case 'createVideoRenderer':
            return <String, dynamic>{'textureId': textureCounter++};
          case 'getUserMedia':
            return <String, dynamic>{
              'streamId': 'stream-1',
              'audioTracks': <Map<String, dynamic>>[],
              'videoTracks': <Map<String, dynamic>>[],
            };
          case 'createPeerConnection':
            return <String, dynamic>{'peerConnectionId': 'pc-${++pcCounter}'};
          case 'createOffer':
          case 'createAnswer':
            return <String, dynamic>{
              'sdp': 'v=0\r\na=candidate:1 1 udp 2130706431 127.0.0.1 9 typ host\r\n',
              'type': call.method == 'createOffer' ? 'offer' : 'answer',
            };
          case 'getLocalDescription':
            return <String, dynamic>{
              'sdp': 'v=0\r\na=candidate:1 1 udp 2130706431 127.0.0.1 9 typ host\r\n',
              'type': 'offer',
            };
          default:
            return null;
        }
      });

      for (final ch in [
        'FlutterWebRTC.Event',
        'FlutterWebRTC/Texture0',
        'FlutterWebRTC/Texture1',
        'FlutterWebRTC/Texture2',
        'FlutterWebRTC/Texture3',
        'FlutterWebRTC/peerConnectionEventpc-1',
        'FlutterWebRTC/peerConnectionEventpc-2',
      ]) {
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(MethodChannel(ch), (call) async => null);
      }
    }

    void clearWebRtcMocks() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(webrtcChannel, null);
    }

    testWidgets(
        'slow overlapping status polls, non-Map poll payload, and hangup 500 do not crash',
        (tester) async {
      installWebRtcMocks();
      addTearDown(clearWebRtcMocks);

      var getCallsCount = 0;
      var endCallsCount = 0;
      Completer<void>? slowPollGate;
      dynamic nextPollPayload = {'call': {'id': 'c1'}};

      mockHandler = (req) async {
        if (req.url.path == '/api/video-calls' &&
            req.url.queryParameters['ice'] == '1') {
          return jsonOk({'iceServers': []});
        }
        if (req.url.path == '/api/video-calls' && req.method == 'POST') {
          final body = jsonDecode(req.body) as Map<String, dynamic>;
          if (body['action'] == 'dial') {
            return jsonOk({'id': 'c1'});
          }
          if (body['action'] == 'end') {
            endCallsCount++;
            return jsonErr('Hangup failed on server', 500);
          }
        }
        if (req.url.path == '/api/video-calls' && req.method == 'GET') {
          getCallsCount++;
          final activeGate = slowPollGate;
          if (activeGate != null && !activeGate.isCompleted) {
            await activeGate.future;
          }
          return jsonOk(nextPollPayload);
        }
        return jsonOk({});
      };

      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(wrapApp(
        const MasterCallScreen(name: 'Иван Мастеров', masterId: 'm1'),
        size: const Size(320, 568),
      ));
      await tester.pump();
      // Advance past the 8s ICE gathering timeout in description()
      await tester.pump(const Duration(seconds: 8));
      await tester.pump();

      expect(find.text('Ожидаем ответа'), findsOneWidget);

      // Slow poll takes >4s while Timer.periodic fires every 2s
      final pollGate = Completer<void>();
      slowPollGate = pollGate;
      await tester.pump(const Duration(seconds: 2));
      expect(getCallsCount, 1);
      await tester.pump(const Duration(seconds: 2));
      // Must NOT overlap while first poll is still in flight
      expect(getCallsCount, 1);

      pollGate.complete();
      await tester.pump();

      // Next poll returns null / non-Map / invalid call payload
      nextPollPayload = null;
      await tester.pump(const Duration(seconds: 2));
      expect(getCallsCount, 2);
      expect(tester.takeException(), isNull);

      nextPollPayload = 'not-a-map';
      await tester.pump(const Duration(seconds: 2));
      expect(getCallsCount, 3);
      expect(tester.takeException(), isNull);

      nextPollPayload = {'call': 'bad-call-object'};
      await tester.pump(const Duration(seconds: 2));
      expect(getCallsCount, 4);
      expect(tester.takeException(), isNull);

      // Hang up when server fails with 500 on action=end
      await tester.tap(find.byTooltip('Завершить'));
      await tester.pumpAndSettle();

      expect(endCallsCount, 1);
      expect(find.text('Звонок завершён'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    });

    testWidgets('missing WebRTC plugin fails gracefully without uncaught dispose errors',
        (tester) async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(webrtcChannel, (call) async {
        throw MissingPluginException(
            'No implementation found for method ${call.method}');
      });
      addTearDown(clearWebRtcMocks);

      await tester.pumpWidget(wrapApp(
        const MasterCallScreen(name: 'Иван Мастеров', masterId: 'm1'),
      ));
      await tester.pumpAndSettle();

      expect(
        find.text(
            'Не удалось начать звонок. Проверьте сеть и доступ к камере и микрофону.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('MasterOffers / Application / Status / Map stress', () {
    testWidgets(
        'MasterOffersScreen rapid withdraw double-tap sends once & 320x568 check',
        (tester) async {
      var withdrawCount = 0;
      final gate = Completer<void>();

      mockHandler = (req) async {
        if (req.url.path == '/api/master/offers') {
          return jsonOk({
            'offers': [
              {
                'id': 'o1',
                'listingId': 'l1',
                'message': 'Сделаю быстро',
                'price': 5000,
                'status': 'OFFERED',
                'createdAt': '2026-11-15T10:00:00Z',
                'listing': {
                  'id': 'l1',
                  'category': 'PLUMBING',
                  'title': 'Очень длинное название заявки для проверки на узком экране 320px',
                  'buildingLabel': 'ул. Абая 10',
                  'status': 'PUBLISHED',
                }
              }
            ]
          });
        }
        if (req.url.path == '/api/master/offers/o1/withdraw') {
          withdrawCount++;
          await gate.future;
          return jsonErr('Нельзя отозвать сейчас', 500);
        }
        return jsonOk({});
      };

      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        wrapApp(const MasterOffersScreen(), size: const Size(320, 568)),
      );
      await tester.pumpAndSettle();
      expect(find.text('≈ 5000 ₸'), findsOneWidget);

      await tester.tap(find.text('Отозвать'));
      await tester.pump();
      await tester.tap(find.byType(TextButton), warnIfMissed: false);
      await tester.pump();

      expect(withdrawCount, 1);

      gate.complete();
      await tester.pumpAndSettle();

      expect(withdrawCount, 1);
      expect(find.text('Нельзя отозвать сейчас'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets(
        'MasterApplicationScreen rapid submit sends once, handles 500, and disposes safely mid-flight',
        (tester) async {
      var registerCount = 0;
      final gate = Completer<void>();

      mockHandler = (req) async {
        if (req.url.path == '/api/master/register') {
          registerCount++;
          await gate.future;
          return jsonErr('Ошибка регистрации анкеты', 500);
        }
        return jsonOk({});
      };

      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(wrapApp(
        const MasterApplicationScreen(prefillFullName: 'Алексей Мастеров'),
        size: const Size(320, 568),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Сантехника'));
      await tester.pump();

      final submitBtn = find.widgetWithText(ElevatedButton, 'Отправить анкету');
      await tester.ensureVisible(submitBtn);
      await tester.tap(submitBtn);
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
      await tester.pump();

      expect(registerCount, 1);

      gate.complete();
      await tester.pumpAndSettle();

      expect(registerCount, 1);
      expect(find.text('Ошибка регистрации анкеты'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Verify disposing mid-flight does not throw unmounted setState
      final gate2 = Completer<void>();
      mockHandler = (req) async {
        if (req.url.path == '/api/master/register') {
          await gate2.future;
          return jsonErr('Поздняя ошибка', 500);
        }
        return jsonOk({});
      };
      await tester.ensureVisible(find.byType(ElevatedButton));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      await tester.pumpWidget(const SizedBox.shrink());
      gate2.complete();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('MasterStatusScreen renders cleanly at 320x568', (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(wrapApp(
        MasterStatusScreen(master: makeMaster(status: 'PENDING')),
        size: const Size(320, 568),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Анкета на проверке'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets(
        'MastersMapScreen prevents out-of-order category race, recovers from 500, and fits 320x568',
        (tester) async {
      final plumbingGate = Completer<void>();
      var failAll = true;

      mockHandler = (req) async {
        if (req.url.path == '/api/public/masters') {
          final cat = req.url.queryParameters['category'];
          if (cat == null) {
            if (failAll) return jsonErr('Сервер недоступен', 500);
            return jsonOk({
              'masters': [
                {
                  'id': 'pm1',
                  'fullName': 'Общий Мастер',
                  'city': 'Кокшетау',
                  'categories': ['PLUMBING'],
                  'rating': 4.5,
                  'reviewsCount': 4,
                  'lat': 53.28,
                  'lng': 69.38,
                }
              ]
            });
          }
          if (cat == 'PLUMBING') {
            await plumbingGate.future;
            return jsonOk({
              'masters': [
                {
                  'id': 'pm-plumb',
                  'fullName': 'Устаревший Сантехник',
                  'city': 'Кокшетау',
                  'categories': ['PLUMBING'],
                  'rating': 4.2,
                  'reviewsCount': 2,
                }
              ]
            });
          }
          if (cat == 'ELECTRICITY') {
            return jsonOk({
              'masters': [
                {
                  'id': 'pm-elec',
                  'fullName': 'Актуальный Электрик С Очень Длинным Именем',
                  'city': 'Кокшетау',
                  'categories': ['ELECTRICITY'],
                  'rating': 5.0,
                  'reviewsCount': 12,
                  'lat': 53.29,
                  'lng': 69.40,
                }
              ]
            });
          }
        }
        return jsonOk({});
      };

      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        wrapApp(const MastersMapScreen(), size: const Size(320, 568)),
      );
      await tester.pumpAndSettle();

      // 500 recovery
      expect(find.text('Повторить'), findsOneWidget);
      failAll = false;
      await tester.tap(find.text('Повторить'));
      await tester.pumpAndSettle();
      expect(find.text('Общий Мастер'), findsOneWidget);

      // Out-of-order category race: tap Сантехника (slow), then Электрика (fast)
      await tester.tap(find.widgetWithText(ChoiceChip, 'Сантехника'));
      await tester.pump();
      final elecChip = find.widgetWithText(ChoiceChip, 'Электрика');
      await tester.ensureVisible(elecChip);
      await tester.pump();
      await tester.tap(elecChip);
      await tester.pumpAndSettle();

      expect(find.text('Актуальный Электрик С Очень Длинным Именем'),
          findsOneWidget);

      // Now slow PLUMBING response arrives — must NOT overwrite ELECTRICITY!
      plumbingGate.complete();
      await tester.pumpAndSettle();
      expect(find.text('Устаревший Сантехник'), findsNothing);
      expect(find.text('Актуальный Электрик С Очень Длинным Именем'),
          findsOneWidget);

      // Switch to map view and tap marker at 320x568
      await tester.tap(find.byTooltip('На карте'));
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(LucideIcons.wrench).first, warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('MasterProfileScreen & request sheet render at 320x568 with double-tap guard',
        (tester) async {
      var createReqCount = 0;
      final gate = Completer<void>();

      mockHandler = (req) async {
        if (req.url.path == '/api/public/masters/pm1') {
          return jsonOk({
            'master': {
              'id': 'pm1',
              'fullName': 'Мастер Тестов С Очень Длинным Именем Фамилией',
              'city': 'Кокшетау',
              'categories': ['PLUMBING'],
              'bio': 'Сантехник широкого профиля',
              'phone': '+77009998877',
              'rating': 4.8,
              'reviewsCount': 15,
              'portfolio': [],
              'reviews': [],
            }
          });
        }
        if (req.url.path == '/api/requests' && req.method == 'POST') {
          createReqCount++;
          await gate.future;
          return jsonErr('Лимит заявок превышен', 500);
        }
        return jsonOk({});
      };

      await tester.binding.setSurfaceSize(const Size(320, 568));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(wrapApp(
        MasterProfileScreen(master: makePublicMaster()),
        size: const Size(320, 568),
      ));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('Оставить заявку'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, 'Течёт кран');
      final sendBtn = find.text('Отправить');
      await tester.tap(sendBtn);
      await tester.pump();
      await tester.tap(sendBtn, warnIfMissed: false);
      await tester.pump();

      expect(createReqCount, 1);

      gate.complete();
      await tester.pumpAndSettle();

      expect(createReqCount, 1);
      expect(find.text('Лимит заявок превышен'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
