import 'dart:convert';
import 'dart:io';

import 'package:fixly_app/core/analytics_repository.dart';
import 'package:fixly_app/core/announcements_repository.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/core/documents_repository.dart';
import 'package:fixly_app/core/finance_repository.dart';
import 'package:fixly_app/core/info_repository.dart';
import 'package:fixly_app/core/mobile_exports.dart';
import 'package:fixly_app/core/notifications_repository.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/core/payments_repository.dart';
import 'package:fixly_app/core/polls_repository.dart';
import 'package:fixly_app/core/protected_files.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/token_store.dart';
import 'package:fixly_app/main.dart' show appLanguage;
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:open_filex/open_filex.dart';

typedef HttpHandler = Future<http.Response> Function(http.Request req);

http.Response _jsonOk(Object? data, {int status = 200}) {
  return http.Response.bytes(
    utf8.encode(jsonEncode({'data': data})),
    status,
    headers: const {'content-type': 'application/json; charset=utf-8'},
  );
}

Matcher _isBadResponse() => isA<ApiException>()
    .having((e) => e.code, 'code', 'BAD_RESPONSE')
    .having((e) => e.statusCode, 'statusCode', 500);

void main() {
  late HttpHandler mockHandler;
  late Directory testTempRoot;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.testLoad(
      fileInput: 'API_BASE_URL=https://localhost\nENABLE_PUSH=false',
    );
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    await TokenStore.instance.write('fixture');

    mockHandler = (req) async => _jsonOk({});
    final client = MockClient((req) => mockHandler(req));
    http.runWithClient(() => ApiClient.instance, () => client);
  });

  setUp(() async {
    FlutterSecureStorage.setMockInitialValues({'osi_session_token': 'fixture'});
    await TokenStore.instance.write('fixture');
    mockHandler = (req) async => _jsonOk({});
    testTempRoot = Directory.systemTemp.createTempSync('fixly_sec_test_');
    tempDirOverride = () async => testTempRoot;
    protectedTempDirOverride = () async => testTempRoot;
  });

  tearDown(() {
    openFileOverride = null;
    tempDirOverride = null;
    openProtectedFileOverride = null;
    protectedTempDirOverride = null;
    if (testTempRoot.existsSync()) {
      testTempRoot.deleteSync(recursive: true);
    }
  });

  group('protectedFileUri & openProtectedFile security', () {
    test('allows valid same-origin /uploads paths and rejects traversal/external/encoding bypasses', () {
      expect(
        protectedFileUri('/uploads/doc_1-2.pdf').toString(),
        'https://localhost/uploads/doc_1-2.pdf',
      );
      expect(
        protectedFileUri('/uploads/2026/11/photo.jpg').toString(),
        'https://localhost/uploads/2026/11/photo.jpg',
      );
      expect(
        protectedFileUri('https://localhost/uploads/voice.m4a').toString(),
        'https://localhost/uploads/voice.m4a',
      );

      const maliciousUrls = <String>[
        '',
        'https://evil.com/uploads/a.pdf',
        'http://localhost/uploads/a.pdf',
        'https://localhost:8443/uploads/a.pdf',
        '//evil.com/uploads/a.pdf',
        'file:///uploads/a.pdf',
        'javascript://localhost/uploads/a.pdf',
        'ftp://localhost/uploads/a.pdf',
        'data:text/plain,/uploads/a.pdf',
        '/uploads/../etc/passwd',
        '/uploads/../uploads/secret.pdf',
        '/uploads/./secret.pdf',
        'uploads/../secret.pdf',
        '/etc/passwd',
        '/uploads',
        '/uploads/',
        '/uploads//a.pdf',
        '/uploads/%2e%2e/etc/passwd',
        '/uploads/%2E%2E/etc/passwd',
        '/uploads/..%2fetc/passwd',
        '/uploads/..%2Fetc/passwd',
        '/uploads/%5csecret.pdf',
        '/uploads/%5Csecret.pdf',
        '/uploads/%252e/a.pdf',
        r'\uploads\a.pdf',
        r'/uploads/..\etc/passwd',
        r'/uploads/dir\a.pdf',
        '/uploads/a.pdf?token=1',
        '/uploads/a.pdf?',
        '/uploads/a.pdf#frag',
        '/uploads/a.pdf#',
        '/uploads/.env',
        '/uploads/.hidden/a.pdf',
        '/uploads/sub/.git/config',
        '/uploads/bad name.pdf',
        'https://user:pass@localhost/uploads/a.pdf',
        'https://evil.com@localhost/uploads/a.pdf',
        '//user@localhost/uploads/a.pdf',
        'https://@localhost/uploads/a.pdf',
      ];

      for (final bad in maliciousUrls) {
        expect(
          () => protectedFileUri(bad),
          throwsA(isA<FormatException>()),
          reason: 'Expected FormatException for "$bad"',
        );
      }
    });

    test('openProtectedFile isolates downloads into unique fixly-* temp dirs and blocks redirects', () async {
      final openedPaths = <String>[];
      openProtectedFileOverride = (path) async {
        openedPaths.add(path);
        return OpenResult(type: ResultType.done, message: 'done');
      };

      var callCount = 0;
      mockHandler = (req) async {
        callCount++;
        expect(req.followRedirects, isFalse);
        expect(req.headers['Authorization'], 'Bearer fixture');
        expect(req.url.toString(), 'https://localhost/uploads/sub/doc.pdf');
        return http.Response.bytes([1, 2, 3, 4], 200);
      };

      await openProtectedFile('/uploads/sub/doc.pdf');
      await openProtectedFile('/uploads/sub/doc.pdf');
      expect(callCount, 2);
      expect(openedPaths.length, 2);

      final dir1 = File(openedPaths[0]).parent;
      final dir2 = File(openedPaths[1]).parent;
      expect(dir1.path, startsWith('${testTempRoot.path}/fixly-'));
      expect(dir2.path, startsWith('${testTempRoot.path}/fixly-'));
      expect(dir1.path, isNot(dir2.path));
      expect(File(openedPaths[0]).path.endsWith('/doc.pdf'), isTrue);

      for (final status in [301, 302, 307, 308]) {
        mockHandler = (req) async => http.Response(
              '<html>Moved</html>',
              status,
              headers: {'location': 'https://evil.com/leak'},
            );
        await expectLater(
          openProtectedFile('/uploads/sub/doc.pdf'),
          throwsA(
            isA<ApiException>()
                .having((e) => e.code, 'code', 'BAD_RESPONSE')
                .having((e) => e.statusCode, 'statusCode', status),
          ),
        );
      }
    });

    testWidgets('ProtectedImage falls back to placeholder on malicious URL without throwing', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ProtectedImage(
              url: '//evil.com/uploads/hack.png',
              placeholder: Icon(Icons.broken_image),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.byIcon(Icons.broken_image), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('ApiClient redirect & contract hardening', () {
    test('blocks 301/302/307/308 redirects across GET/POST/PATCH/DELETE without following or leaking Bearer token', () async {
      final api = ApiClient.instance;

      for (final status in [301, 302, 307, 308]) {
        for (final method in ['GET', 'POST', 'PATCH', 'DELETE']) {
          var requestsSent = 0;
          mockHandler = (req) async {
            requestsSent++;
            expect(req.method, method);
            expect(req.followRedirects, isFalse);
            expect(req.headers['X-Client'], 'mobile');
            expect(req.headers['Authorization'], 'Bearer fixture');
            return http.Response(
              '<html>Redirecting to evil</html>',
              status,
              headers: {'location': 'https://evil.example/steal-token'},
            );
          };

          Future<dynamic> call() {
            switch (method) {
              case 'GET':
                return api.get('/api/test');
              case 'POST':
                return api.post('/api/test', body: {'a': 1});
              case 'PATCH':
                return api.patch('/api/test', body: {'a': 1});
              default:
                return api.delete('/api/test', body: {'a': 1});
            }
          }

          await expectLater(
            call(),
            throwsA(
              isA<ApiException>()
                  .having((e) => e.code, 'code', 'BAD_RESPONSE')
                  .having((e) => e.statusCode, 'statusCode', status)
                  .having(
                    (e) => e.message,
                    'message',
                    'Недопустимое перенаправление ($status)',
                  ),
            ),
          );
          expect(requestsSent, 1, reason: 'Redirect must never be followed');
        }
      }
    });

    test('preserves X-Client, auth flag, {data}/{error} contracts on GET/POST/PATCH/DELETE', () async {
      final api = ApiClient.instance;

      mockHandler = (req) async {
        expect(req.method, 'POST');
        expect(req.followRedirects, isFalse);
        expect(req.headers['X-Client'], 'mobile');
        expect(req.headers.containsKey('Authorization'), isFalse);
        expect(jsonDecode(req.body), {'hello': 'world'});
        return _jsonOk({'ok': true});
      };
      final unauthRes = await api.post('/api/public', body: {'hello': 'world'}, auth: false);
      expect(unauthRes, {'ok': true});

      mockHandler = (req) async => http.Response.bytes(
            utf8.encode(jsonEncode({
              'error': {'code': 'FORBIDDEN', 'message': 'Доступ запрещён'}
            })),
            403,
            headers: const {'content-type': 'application/json; charset=utf-8'},
          );
      await expectLater(
        api.patch('/api/protected', body: {'x': 1}),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'FORBIDDEN')
              .having((e) => e.message, 'message', 'Доступ запрещён')
              .having((e) => e.statusCode, 'statusCode', 403),
        ),
      );
    });
  });

  group('mobile_exports sanitization, redirects & openPricingInvoice', () {
    test('openPdf sanitizes filename inside isolated fixly-* temp dir', () async {
      String? openedPath;
      openFileOverride = (path) async {
        openedPath = path;
        return OpenResult(type: ResultType.done, message: 'done');
      };

      await openPdf(['Строка 1', 'Строка 2'], '../../evil/name:test');
      expect(openedPath, isNotNull);
      final file = File(openedPath!);
      expect(file.existsSync(), isTrue);
      expect(file.parent.path, startsWith('${testTempRoot.path}/fixly-'));
      expect(file.uri.pathSegments.last, '____evil_name_test.pdf');
      final bytes = file.readAsBytesSync();
      expect(ascii.decode(bytes.take(5).toList()), '%PDF-');
    });

    test('openPricingInvoice sends encoded query, auth headers, followRedirects=false, and builds PDF', () async {
      String? openedPath;
      openFileOverride = (path) async {
        openedPath = path;
        return OpenResult(type: ResultType.done, message: 'done');
      };

      mockHandler = (req) async {
        expect(req.method, 'GET');
        expect(req.followRedirects, isFalse);
        expect(req.headers['Authorization'], 'Bearer fixture');
        expect(req.headers['X-Client'], 'mobile');
        expect(req.url.path, '/api/pricing/invoice');
        expect(req.url.queryParameters, {
          'plan': 'vip/pro',
          'apartments': '48',
          'months': '3',
          'useRef': 'true',
        });
        const htmlDoc = '''
          <html><body>
            <div class="title">СЧЕТ НА ОПЛАТУ № INV-123</div>
            <div class="details">
              <div class="box">Заказчик: ОСИ Тест</div>
              <div class="box">Основание: Оферта</div>
            </div>
            <table><tr><th>Услуга</th><th>Сумма</th></tr><tr><td>Подписка</td><td>1000 ₸</td></tr></table>
            <div class="total">Итого: 1000 KZT</div>
            <div class="footer">Официальное предложение</div>
          </body></html>
        ''';
        return http.Response.bytes(
          utf8.encode(htmlDoc),
          200,
          headers: {'content-type': 'text/html; charset=utf-8'},
        );
      };

      await openPricingInvoice(
        plan: 'vip/pro',
        apartments: 48,
        months: 3,
        useRef: true,
      );

      expect(openedPath, isNotNull);
      final file = File(openedPath!);
      expect(file.existsSync(), isTrue);
      expect(file.uri.pathSegments.last, 'invoice-vip_pro.pdf');
      expect(ascii.decode(file.readAsBytesSync().take(5).toList()), '%PDF-');
    });

    test('openPricingInvoice and openServerDocument reject 301/302/307/308 redirects, 500s, and empty HTML', () async {
      var openerCalled = false;
      openFileOverride = (_) async {
        openerCalled = true;
        return OpenResult(type: ResultType.done, message: 'done');
      };

      for (final status in [301, 302, 307, 308]) {
        mockHandler = (req) async {
          expect(req.followRedirects, isFalse);
          return http.Response('', status, headers: {'location': 'https://evil.com'});
        };
        await expectLater(
          openPricingInvoice(apartments: 10, months: 1, useRef: false),
          throwsA(
            isA<ApiException>()
                .having((e) => e.code, 'code', 'BAD_RESPONSE')
                .having((e) => e.statusCode, 'statusCode', status),
          ),
        );
        await expectLater(
          openServerDocument(ServerDocument.annualReport),
          throwsA(
            isA<ApiException>()
                .having((e) => e.code, 'code', 'BAD_RESPONSE')
                .having((e) => e.statusCode, 'statusCode', status),
          ),
        );
        await expectLater(
          openServerDocument(ServerDocument.apartmentTemplate),
          throwsA(
            isA<ApiException>()
                .having((e) => e.code, 'code', 'BAD_RESPONSE')
                .having((e) => e.statusCode, 'statusCode', status),
          ),
        );
      }

      mockHandler = (req) async => http.Response('error', 500);
      await expectLater(
        openPricingInvoice(apartments: 10, months: 1, useRef: false),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'DOWNLOAD')
              .having((e) => e.statusCode, 'statusCode', 500),
        ),
      );

      mockHandler = (req) async => http.Response('<html><body></body></html>', 200);
      await expectLater(
        openPricingInvoice(apartments: 10, months: 1, useRef: false),
        throwsA(_isBadResponse()),
      );

      expect(openerCalled, isFalse);
    });
  });

  group('All 10 repositories URL encoding, valid contracts, and malformed JSON fuzzing', () {
    test('AnnouncementsRepository supports optional buildingId, URL encoding, and DELETE', () async {
      final calls = <String>[];
      mockHandler = (req) async {
        calls.add('${req.method} ${req.url.path}${req.url.hasQuery ? '?${req.url.query}' : ''}');
        if (req.method == 'GET') {
          return _jsonOk({
            'announcements': [
              {
                'id': 'a1',
                'title': 'Важное',
                'body': 'Текст',
                'isPinned': true,
                'createdAt': '2026-11-15T10:00:00Z',
                'readCount': 3,
                'readByViewer': false,
              }
            ],
          });
        }
        return _jsonOk({'deleted': true});
      };

      final items = await AnnouncementsRepository.instance.list();
      expect(items.length, 1);
      expect(items.first.isPinned, isTrue);

      await AnnouncementsRepository.instance.list(buildingId: 'b 1/2&x=3');
      await AnnouncementsRepository.instance.markRead('a/1?x=2');
      await AnnouncementsRepository.instance.delete('a/1&b=2');

      expect(calls, [
        'GET /api/announcements',
        'GET /api/announcements?buildingId=b+1%2F2%26x%3D3',
        'POST /api/announcements/a%2F1%3Fx%3D2/read',
        'DELETE /api/announcements?id=a%2F1%26b%3D2',
      ]);
    });

    test('Other repositories URL-encode path and query parameters', () async {
      final calls = <String>[];
      mockHandler = (req) async {
        calls.add('${req.method} ${req.url.path}${req.url.hasQuery ? '?${req.url.query}' : ''}');
        if (req.url.path == '/api/apartments') return _jsonOk({'apartments': []});
        if (req.url.path == '/api/osi/search') return _jsonOk({'results': []});
        if (req.url.path == '/api/polls') return _jsonOk({'polls': []});
        if (req.url.path == '/api/analytics/chairman') {
          return _jsonOk({
            'requests': {'total': 0, 'resolved': 0, 'inProgress': 0, 'received': 0, 'byCategory': {}},
            'finance': {'totalCharged': 0, 'totalPaid': 0, 'totalDebt': 0, 'apartmentsWithDebt': 0, 'apartmentsTotal': 0, 'progressPct': 0},
            'polls': {'active': 0},
          });
        }
        if (req.url.path.startsWith('/api/requests/') && req.method == 'GET') {
          return _jsonOk({
            'request': {
              'id': 'r1',
              'authorUserId': 'u1',
              'category': 'OTHER',
              'text': 'ok',
              'status': 'RECEIVED',
              'createdAt': '2026-11-15T10:00:00Z',
              'updatedAt': '2026-11-15T10:00:00Z',
            },
          });
        }
        return _jsonOk({});
      };

      await OsiRepository.instance.listApartments('b/1&x=2');
      await OsiRepository.instance.searchOsi('оси №1/2');
      await OsiRepository.instance.cancelJoinRequest('jr/1?x=2');
      await OsiRepository.instance.resolveJoinRequest('jr/2#h');
      await RequestsRepository.instance.setStatus('r/1?a=b', 'IN_PROGRESS');
      await RequestsRepository.instance.get('r/1?a=b');
      await RequestsRepository.instance.addMessage('r/1?a=b', 'hi');
      await PollsRepository.instance.list(buildingId: 'b/1&x=2');
      await AnalyticsRepository.instance.getChairmanAnalytics(period: 'month&x=1');

      expect(calls, [
        'GET /api/apartments?buildingId=b%2F1%26x%3D2',
        'GET /api/osi/search?q=%D0%BE%D1%81%D0%B8+%E2%84%961%2F2',
        'DELETE /api/osi/join-request/jr%2F1%3Fx%3D2',
        'POST /api/osi/join-requests/jr%2F2%23h/resolve',
        'POST /api/requests/r%2F1%3Fa%3Db/status',
        'GET /api/requests/r%2F1%3Fa%3Db',
        'POST /api/requests/r%2F1%3Fa%3Db/messages',
        'GET /api/polls?buildingId=b%2F1%26x%3D2',
        'GET /api/analytics/chairman?period=month%26x%3D1',
      ]);
    });

    test('Valid payloads parse cleanly across all repositories', () async {
      mockHandler = (req) async {
        switch (req.url.path) {
          case '/api/buildings':
            return _jsonOk({
              'buildings': [
                {'id': 'b1', 'address': 'ул. Абая 1', 'apartmentsCount': 24}
              ],
            });
          case '/api/apartments':
            return _jsonOk({
              'apartments': [
                {
                  'id': 'apt1',
                  'number': '12',
                  'area': '64.5',
                  'rooms': '2',
                  'occupants': [
                    {
                      'id': 'o1',
                      'fullName': 'Алибек',
                      'phone': '+77001112233',
                      'user': {'email': 'a@fixly.kz'},
                    }
                  ],
                }
              ],
            });
          case '/api/finance/resident':
            return _jsonOk({
              'balances': {
                'MAINTENANCE': {'charged': 10000, 'paid': 4000, 'debt': 6000},
                'TARGETED': {'charged': 0, 'paid': 0, 'debt': 0},
                'CAPITAL_REPAIR': {'charged': 500, 'paid': 500, 'debt': 0},
              },
              'charges': [
                {
                  'id': 'c1',
                  'period': '2026-11-01T00:00:00Z',
                  'amount': '6000.50',
                  'dueDate': '2026-11-25T00:00:00Z',
                  'status': 'UNPAID',
                  'tariff': {'category': 'MAINTENANCE'},
                }
              ],
              'payments': [
                {
                  'id': 'p1',
                  'amount': '4000.00',
                  'paidAt': '2026-11-10T12:00:00Z',
                  'method': 'test_qr',
                }
              ],
            });
          case '/api/documents':
            return _jsonOk({
              'documents': [
                {
                  'id': 'd1',
                  'title': 'Устав',
                  'category': 'CHARTER',
                  'fileUrl': '/uploads/charter.pdf',
                  'fileSize': 2048,
                  'createdAt': '2026-11-01T00:00:00Z',
                }
              ],
            });
          case '/api/notifications':
            return _jsonOk({
              'notifications': [
                {
                  'id': 'n1',
                  'type': 'INFO',
                  'title': 'Новость',
                  'body': 'Текст',
                  'readAt': null,
                  'createdAt': '2026-11-15T09:00:00Z',
                }
              ],
              'unread': 1,
            });
          case '/api/payments/checkout':
            return _jsonOk({
              'success': true,
              'gatewayRef': 'GW-1',
              'amount': 6000.5,
            });
          case '/api/info':
            return _jsonOk({
              'items': [
                {
                  'id': 'i1',
                  'type': 'TRASH_SCHEDULE',
                  'title': 'Вывоз',
                  'content': 'Ежедневно',
                }
              ],
            });
          default:
            return _jsonOk({});
        }
      };

      final buildings = await OsiRepository.instance.listBuildings();
      expect(buildings.single.apartmentsCount, 24);

      final apartments = await OsiRepository.instance.listApartments('b1');
      expect(apartments.single.area, 64.5);
      expect(apartments.single.rooms, 2);
      expect(apartments.single.occupants.single.email, 'a@fixly.kz');

      final finance = await FinanceRepository.instance.get();
      expect(finance.balances!.totalDebt, 6000);
      expect(finance.charges.single.amount, 6000.5);
      expect(finance.payments.single.amount, 4000.0);

      final docs = await DocumentsRepository.instance.fetchDocuments();
      expect(docs.single.isPublic, isTrue);

      final notifs = await NotificationsRepository.instance.list();
      expect(notifs.unread, 1);

      final checkout = await PaymentsRepository.instance.checkout(method: 'test_card');
      expect(checkout.success, isTrue);
      expect(checkout.alreadyPaid, isFalse);

      final info = await InfoRepository.instance.list();
      expect(info.single.title, 'Вывоз');
    });

    test('Fuzzes all 10 repositories with malformed/null/wrong-type JSON -> throws ApiException BAD_RESPONSE', () async {
      Future<void> fuzzPayloads(
        List<Object?> payloads,
        Future<Object?> Function() call,
        String label,
      ) async {
        for (var i = 0; i < payloads.length; i++) {
          mockHandler = (_) async => _jsonOk(payloads[i]);
          await expectLater(
            call(),
            throwsA(_isBadResponse()),
            reason: '$label failed for payload #$i: ${payloads[i]}',
          );
        }
      }

      const commonEnvelopePayloads = <Object?>[null, 'str', 123, <Object?>[], <String, dynamic>{}];

      // 1. OsiRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'activeOsiId': null},
          {'activeOsiId': 123},
          {'activeOsiId': ''},
        ],
        () => OsiRepository.instance.createOsi(name: 'ОСИ'),
        'OsiRepository.createOsi',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'building': 'bad'},
          {'building': {'id': 1, 'address': 'a'}},
          {'building': {'id': 'b1', 'address': null}},
          {'building': {'id': 'b1', 'address': 'a', 'apartmentsCount': '10'}},
          {'building': {'id': 'b1', 'address': 'a', 'apartmentsCount': 1.5}},
        ],
        () => OsiRepository.instance.createBuilding(address: 'Дом 1'),
        'OsiRepository.createBuilding',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'buildings': 'bad'},
          {'buildings': [null]},
          {'buildings': [{'id': 'b1'}]},
        ],
        () => OsiRepository.instance.listBuildings(),
        'OsiRepository.listBuildings',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'apartments': 'bad'},
          {'apartments': [{'id': 'a1', 'number': '1', 'area': 'not-a-number'}]},
          {'apartments': [{'id': 'a1', 'number': '1', 'rooms': 'abc'}]},
          {'apartments': [{'id': 'a1', 'number': '1', 'occupants': 'bad'}]},
          {'apartments': [{'id': 'a1', 'number': '1', 'occupants': [{'id': 'o1', 'fullName': 99}]}]},
        ],
        () => OsiRepository.instance.listApartments('b1'),
        'OsiRepository.listApartments',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'apartment': null},
          {'apartment': {'id': 'a1', 'number': 12}},
        ],
        () => OsiRepository.instance.createApartment(buildingId: 'b1', number: '12'),
        'OsiRepository.createApartment',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'results': 'bad'},
          {'results': [{'id': 'o1', 'name': null}]},
        ],
        () => OsiRepository.instance.searchOsi('test'),
        'OsiRepository.searchOsi',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'requests': 'bad'},
          {'requests': [{'id': 'jr1', 'osi': 'bad'}]},
          {'requests': [{'id': 'jr1', 'osi': {'name': null}}]},
        ],
        () => OsiRepository.instance.myJoinRequests(),
        'OsiRepository.myJoinRequests',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'request': null},
          {'request': {'id': 42}},
        ],
        () => OsiRepository.instance.submitJoinRequest(osiId: 'o1'),
        'OsiRepository.submitJoinRequest',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'requests': [null]},
          {'requests': [{'id': 'jr1', 'user': 'bad'}]},
          {'requests': [{'id': 'jr1', 'user': {'email': 123}}]},
        ],
        () => OsiRepository.instance.listOsiJoinRequests(),
        'OsiRepository.listOsiJoinRequests',
      );

      // 2. RequestsRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'requests': 'bad'},
          {'requests': [null]},
          {
            'requests': [
              {
                'id': 'r1',
                'authorUserId': 'u1',
                'category': 'OTHER',
                'text': 'ok',
                'photoUrls': [123],
                'status': 'RECEIVED',
                'createdAt': '2026-11-15T10:00:00Z',
                'updatedAt': '2026-11-15T10:00:00Z',
              }
            ]
          },
          {
            'requests': [
              {
                'id': 'r1',
                'authorUserId': 'u1',
                'category': 'OTHER',
                'text': 'ok',
                'status': 'RECEIVED',
                'createdAt': 'bad-date',
                'updatedAt': '2026-11-15T10:00:00Z',
              }
            ]
          },
        ],
        () => RequestsRepository.instance.listMine(),
        'RequestsRepository.listMine',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'requests': 'bad'},
          {
            'requests': [
              {
                'id': 'r1',
                'authorUserId': 'u1',
                'category': 'OTHER',
                'text': 'ok',
                'status': 'RECEIVED',
                'createdAt': '2026-11-15T10:00:00Z',
                'updatedAt': '2026-11-15T10:00:00Z',
                'messages': ['bad-msg'],
              }
            ]
          },
        ],
        () => RequestsRepository.instance.listBuilding(),
        'RequestsRepository.listBuilding',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'request': 'bad'},
          {'request': {'id': 'r1'}},
        ],
        () => RequestsRepository.instance.get('r1'),
        'RequestsRepository.get',
      );
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'request': null},
          {'request': {'id': ''}},
        ],
        () => RequestsRepository.instance.create(category: 'OTHER', text: 'help'),
        'RequestsRepository.create',
      );

      // 3. FinanceRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'balances': 'bad', 'charges': [], 'payments': []},
          {
            'balances': {'MAINTENANCE': 'bad', 'TARGETED': {}, 'CAPITAL_REPAIR': {}},
            'charges': [],
            'payments': [],
          },
          {
            'balances': {
              'MAINTENANCE': {'charged': '100', 'paid': 0, 'debt': 100},
              'TARGETED': {'charged': 0, 'paid': 0, 'debt': 0},
              'CAPITAL_REPAIR': {'charged': 0, 'paid': 0, 'debt': 0},
            },
            'charges': [],
            'payments': [],
          },
          {'balances': null, 'charges': 'bad', 'payments': []},
          {
            'balances': null,
            'charges': [
              {
                'id': 'c1',
                'period': '2026-11-01T00:00:00Z',
                'amount': 'not-a-decimal',
                'dueDate': '2026-11-25T00:00:00Z',
                'status': 'UNPAID',
                'tariff': {'category': 'MAINTENANCE'},
              }
            ],
            'payments': [],
          },
          {
            'balances': null,
            'charges': [],
            'payments': [
              {
                'id': 'p1',
                'amount': 'NaN',
                'paidAt': '2026-11-01T00:00:00Z',
              }
            ],
          },
        ],
        () => FinanceRepository.instance.get(),
        'FinanceRepository.get',
      );

      // 4. PollsRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'polls': 'bad'},
          {'polls': [null]},
          {
            'polls': [
              {'id': 'p1', 'question': 123, 'options': []}
            ]
          },
          {
            'polls': [
              {
                'id': 'p1',
                'question': 'Q?',
                'deadline': 'not-a-date',
                'options': [],
              }
            ]
          },
          {
            'polls': [
              {
                'id': 'p1',
                'question': 'Q?',
                'closed': 'yes',
                'options': [],
              }
            ]
          },
          {
            'polls': [
              {
                'id': 'p1',
                'question': 'Q?',
                'myOptionId': 42,
                'options': [],
              }
            ]
          },
          {
            'polls': [
              {
                'id': 'p1',
                'question': 'Q?',
                'options': [
                  {'id': 'o1', 'label': 'Yes', 'votes': 'bad'}
                ],
              }
            ]
          },
        ],
        () => PollsRepository.instance.list(),
        'PollsRepository.list',
      );

      // 5. AnalyticsRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'requests': 'bad', 'finance': {}, 'polls': {}},
          {
            'requests': {'byCategory': {'PLUMBING': 'oops'}},
            'finance': {},
            'polls': {},
          },
          {
            'requests': {'total': '10'},
            'finance': {},
            'polls': {},
          },
          {
            'requests': {},
            'finance': {'totalPaid': 'bad'},
            'polls': {},
          },
          {
            'requests': {},
            'finance': {},
            'polls': {'active': 1.5},
          },
        ],
        () => AnalyticsRepository.instance.getChairmanAnalytics(),
        'AnalyticsRepository.getChairmanAnalytics',
      );

      // 6. AnnouncementsRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'announcements': 'bad'},
          {'announcements': [null]},
          {
            'announcements': [
              {
                'id': 'a1',
                'title': 'T',
                'body': 'B',
                'isPinned': 'true',
                'createdAt': '2026-11-15T10:00:00Z',
                'readCount': 0,
                'readByViewer': false,
              }
            ]
          },
          {
            'announcements': [
              {
                'id': 'a1',
                'title': 'T',
                'body': 'B',
                'isPinned': true,
                'createdAt': 'bad-date',
                'readCount': 0,
                'readByViewer': false,
              }
            ]
          },
        ],
        () => AnnouncementsRepository.instance.list(),
        'AnnouncementsRepository.list',
      );

      // 7. DocumentsRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'documents': 'bad'},
          {'documents': ['bad']},
          {
            'documents': [
              {
                'id': 'd1',
                'title': 'Doc',
                'category': 'CHARTER',
                'fileUrl': '/uploads/a.pdf',
                'fileSize': '1024',
                'createdAt': '2026-11-15T10:00:00Z',
              }
            ]
          },
          {
            'documents': [
              {
                'id': 'd1',
                'title': 'Doc',
                'category': 'CHARTER',
                'fileUrl': null,
                'createdAt': '2026-11-15T10:00:00Z',
              }
            ]
          },
        ],
        () => DocumentsRepository.instance.fetchDocuments(),
        'DocumentsRepository.fetchDocuments',
      );

      // 8. NotificationsRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'notifications': [], 'unread': 'bad'},
          {'notifications': 'bad', 'unread': 0},
          {
            'notifications': [
              {
                'id': 'n1',
                'type': 'INFO',
                'title': 'T',
                'body': 'B',
                'readAt': 123,
                'createdAt': '2026-11-15T10:00:00Z',
              }
            ],
            'unread': 1,
          },
          {
            'notifications': [
              {
                'id': 'n1',
                'type': 'INFO',
                'title': 'T',
                'body': 'B',
                'createdAt': 'bad-date',
              }
            ],
            'unread': 1,
          },
        ],
        () => NotificationsRepository.instance.list(),
        'NotificationsRepository.list',
      );

      // 9. PaymentsRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'success': 'true'},
          {'success': true, 'alreadyPaid': 1},
          {'success': true, 'gatewayRef': 123},
          {'success': true, 'amount': '5000'},
        ],
        () => PaymentsRepository.instance.checkout(method: 'test_card'),
        'PaymentsRepository.checkout',
      );

      // 10. InfoRepository
      await fuzzPayloads(
        [
          ...commonEnvelopePayloads,
          {'items': 'bad'},
          {'items': [null]},
          {
            'items': [
              {'id': 'i1', 'type': 'OTHER', 'title': 'T', 'content': 42}
            ]
          },
        ],
        () => InfoRepository.instance.list(),
        'InfoRepository.list',
      );
    });
  });

  group('AppLocalizations.translateUserContent', () {
    test(
      'posts to /api/translate with targetLang and gracefully falls back on malformed/error payloads',
      () async {
        final prevLang = appLanguage.value;
        addTearDown(() => appLanguage.value = prevLang);
        appLanguage.value = 'en';

        late Uri seenUri;
        late Map<String, dynamic> seenBody;
        String? seenAuth;
        mockHandler = (req) async {
          seenUri = req.url;
          seenAuth = req.headers['authorization'];
          seenBody = jsonDecode(req.body) as Map<String, dynamic>;
          return _jsonOk({'translatedText': 'Water shutdown at 10:00'});
        };

        final okResult = await AppLocalizations.translateUserContent(
          'Отключение воды в 10:00',
        );
        expect(seenUri.path, '/api/translate');
        expect(seenAuth, 'Bearer fixture');
        expect(seenBody, {
          'text': 'Отключение воды в 10:00',
          'targetLang': 'en',
        });
        expect(okResult, 'Water shutdown at 10:00');

        // Malformed / wrong-type / empty / 500 payloads fall back to original text.
        for (final handler in <HttpHandler>[
          (_) async => _jsonOk('not-a-map'),
          (_) async => _jsonOk({'translatedText': 123}),
          (_) async => _jsonOk({'translatedText': ''}),
          (_) async => _jsonOk({'other': 'value'}),
          (_) async => http.Response.bytes(
                utf8.encode(jsonEncode({
                  'error': {'code': 'ERROR', 'message': 'fail'}
                })),
                500,
                headers: const {
                  'content-type': 'application/json; charset=utf-8'
                },
              ),
        ]) {
          mockHandler = handler;
          final fallback = await AppLocalizations.translateUserContent('Исходный текст');
          expect(fallback, 'Исходный текст');
        }

        // Whitespace-only input returns untouched without calling API.
        var called = false;
        mockHandler = (_) async {
          called = true;
          return _jsonOk({'translatedText': 'should not be called'});
        };
        expect(await AppLocalizations.translateUserContent('   '), '   ');
        expect(called, isFalse);
      },
    );
  });
}
