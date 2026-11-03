import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:async';
import 'api_client.dart';

/// Полный жизненный цикл FCM-токена (REQ-127/128, ADR-0012 §5).
/// register() — после входа (HomeRouter.initState), unregister() — перед логаутом.
class PushRepository {
  PushRepository._();
  static final PushRepository instance = PushRepository._();

  String? _registeredToken;
  StreamSubscription<String>? _refreshSub;

  Future<void> register() async {
    if (dotenv.env['ENABLE_PUSH'] == 'false') return;
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    final token = await messaging.getToken();
    if (token != null && token != _registeredToken) {
      await _send(token);
      _registeredToken = token;
    }

    _refreshSub?.cancel();
    _refreshSub = messaging.onTokenRefresh.listen((t) async {
      if (t != _registeredToken) {
        await _send(t);
        _registeredToken = t;
      }
    });
  }

  Future<void> unregister() async {
    _refreshSub?.cancel();
    _refreshSub = null;
    final token = _registeredToken;
    _registeredToken = null;
    if (token == null) return;
    try {
      await ApiClient.instance.delete('/api/push/fcm-token', body: {'token': token});
    } catch (_) {}
  }

  Future<void> _send(String token) async {
    try {
      await ApiClient.instance.post('/api/push/fcm-token', body: {'token': token});
    } catch (_) {}
  }
}
