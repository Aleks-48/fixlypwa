import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_core/firebase_core.dart';
import 'dart:io';
import 'dart:async';
import 'api_client.dart';

/// Полный жизненный цикл FCM-токена (REQ-127/128, ADR-0012 §5).
/// register() — после входа (HomeRouter.initState), unregister() — перед логаутом.
class PushRepository {
  PushRepository._();
  static final PushRepository instance = PushRepository._();

  String? _registeredToken;
  StreamSubscription<String>? _refreshSub;

  Timer? retry;
  int generation = 0;

  Future<void> register() async {
    if (Firebase.apps.isEmpty) return;
    final current = ++generation;
    retry?.cancel();
    await _refreshSub?.cancel();
    if (current != generation) return;
    final messaging = FirebaseMessaging.instance;
    try {
      final permission = await messaging.requestPermission();
      if (permission.authorizationStatus == AuthorizationStatus.denied ||
          current != generation) {
        return;
      }
      _refreshSub = messaging.onTokenRefresh.listen((_) {
        if (generation == current) register();
      });
      if (Platform.isIOS && await messaging.getAPNSToken() == null) {
        if (generation == current) {
          retry = Timer(const Duration(seconds: 20), register);
        }
        return;
      }
      final token = await messaging.getToken();
      if (current != generation || token == null || token == _registeredToken) {
        return;
      }
      await _send(token);
      if (current == generation) _registeredToken = token;
    } catch (_) {
      if (generation == current) {
        retry = Timer(const Duration(seconds: 30), register);
      }
    }
  }

  Future<void> unregister() async {
    generation++;
    retry?.cancel();
    await _refreshSub?.cancel();
    _refreshSub = null;
    final token = _registeredToken;
    _registeredToken = null;
    if (Firebase.apps.isEmpty) return;
    try {
      if (token != null) {
        await ApiClient.instance
            .delete('/api/push/fcm-token', body: {'token': token});
      }
    } catch (_) {}
    try {
      await FirebaseMessaging.instance
          .deleteToken()
          .timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  Future<void> _send(String token) async {
    await ApiClient.instance
        .post('/api/push/fcm-token', body: {'token': token});
  }
}
