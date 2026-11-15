import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'notifications_screen.dart';
import 'dart:async';
import '../core/api_client.dart';
import 'master_call_screen.dart';
import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/core/push_repository.dart';
import 'package:fixly_app/screens/resident_home_shell.dart';
import 'package:fixly_app/screens/chairman_home_shell.dart';
import 'package:fixly_app/screens/master_home_shell.dart';
import 'package:fixly_app/screens/master_status_screen.dart';
import 'package:fixly_app/screens/master_application_screen.dart';
import 'package:fixly_app/screens/join_osi_screen.dart';

// Роутер по роли (mobile-app.md REQ-120, ревизия REQ-121/143 — срез R2): RESIDENT и
// CHAIRMAN/SUPERADMIN (роль в конкретной ОСИ — саппорт-доступ, backend везде проверяет их
// вместе, hasRole(..., "CHAIRMAN", "SUPERADMIN")) получают полноценные оболочки. Управление
// (финансы/отчёты/импорт) у председателя остаётся на сайте (REQ-145) — приложение даёт
// оперативные функции.
//
// Master (ADR-0009, срез 25) — identity ВНЕ тенантов, не UserOsiRole: пользователь может быть
// одновременно резидентом/председателем и мастером. Здесь проверяется только для role-less
// пользователя (activeRole == null) — это основной случай мастера (внешний специалист без
// привязки к ОСИ, marketplace.md). Резидент/председатель, который ОДНОВРЕМЕННО одобренный
// мастер, сейчас не получает отдельного входа in MasterHomeShell из своей оболочки — известное
// ограничение объёма (маркетплейс проектировался для внешних мастеров, не жителей дома).
class HomeRouter extends StatefulWidget {
  final AuthUser user;
  const HomeRouter({super.key, required this.user});

  @override
  State<HomeRouter> createState() => _HomeRouterState();
}

class _HomeRouterState extends State<HomeRouter> {
  bool _loadingMaster = false;
  MasterProfile? _master;
  Timer? _calls;
  StreamSubscription<RemoteMessage>? _opened;
  bool _checkingCalls = false;
  int _masterLoadSeq = 0;
  bool _navigatingToMaster = false;

  bool get _usesOsiShell {
    final role = widget.user.activeRole;
    return role == 'RESIDENT' || role == 'CHAIRMAN' || role == 'SUPERADMIN';
  }

  Future<void> openNotification(RemoteMessage msg) async {
    if (!mounted) return;
    if (msg.data['type'] == 'VIDEO_CALL') {
      await checkCalls();
    } else {
      await Navigator.push(context,
          MaterialPageRoute(builder: (_) => const NotificationsScreen()));
    }
  }

  Future<void> checkCalls() async {
    if (_checkingCalls ||
        _master?.status != 'APPROVED' ||
        WidgetsBinding.instance.lifecycleState != AppLifecycleState.resumed) {
      return;
    }
    _checkingCalls = true;
    try {
      final res = await ApiClient.instance.get('/api/video-calls');
      final rawCall = res is Map ? res['call'] : null;
      if (!mounted || rawCall is! Map) return;
      final call = Map<String, dynamic>.from(rawCall);
      if (call['incoming'] != true || call['answered'] == true) {
        return;
      }
      final answer = await showDialog<bool>(
          context: context, builder: (ctx) => _IncomingVideoCall(call: call));
      if (!mounted) return;
      if (answer == true) {
        final currentRes = await ApiClient.instance.get('/api/video-calls');
        final rawCurrent = currentRes is Map ? currentRes['call'] : null;
        final current =
            rawCurrent is Map ? Map<String, dynamic>.from(rawCurrent) : null;
        if (current != null &&
            current['id'] != null &&
            current['id'] == call['id'] &&
            mounted) {
          await Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => MasterCallScreen(
                      name: call['name']?.toString() ?? '',
                      incoming: call)));
        }
      } else if (call['id'] != null) {
        await ApiClient.instance.post('/api/video-calls',
            body: {'action': 'end', 'id': call['id']});
      }
    } catch (_) {/* The next foreground poll retries. */} finally {
      _checkingCalls = false;
    }
  }

  @override
  void dispose() {
    _opened?.cancel();
    _calls?.cancel();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    PushRepository.instance.register();
    if (Firebase.apps.isNotEmpty) {
      _opened = FirebaseMessaging.onMessageOpenedApp.listen(openNotification);
      FirebaseMessaging.instance.getInitialMessage().then((msg) {
        if (msg != null && mounted) {
          WidgetsBinding.instance
              .addPostFrameCallback((_) => openNotification(msg));
        }
      }).catchError((_) {});
    }
    if (!_usesOsiShell) {
      _loadMaster();
    }
  }

  @override
  void didUpdateWidget(covariant HomeRouter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_usesOsiShell) {
      _masterLoadSeq++;
      _calls?.cancel();
      _calls = null;
      if (_loadingMaster) {
        setState(() => _loadingMaster = false);
      }
    } else if (oldWidget.user.id != widget.user.id ||
        oldWidget.user.activeRole != widget.user.activeRole) {
      _loadMaster();
    }
  }

  Future<void> _loadMaster() async {
    final seq = ++_masterLoadSeq;
    setState(() => _loadingMaster = true);
    try {
      final master = await MasterRepository.instance.me();
      if (!mounted || seq != _masterLoadSeq || _usesOsiShell) return;
      _calls?.cancel();
      _calls = null;
      if (master?.status == 'APPROVED') {
        _calls = Timer.periodic(const Duration(seconds: 3), (_) => checkCalls());
      }
      setState(() {
        _master = master;
        _loadingMaster = false;
      });
    } catch (_) {
      if (mounted && seq == _masterLoadSeq) {
        setState(() => _loadingMaster = false);
      }
    }
  }

  Future<void> _becomeMaster(BuildContext context) async {
    if (_navigatingToMaster) return;
    _navigatingToMaster = true;
    try {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) =>
              MasterApplicationScreen(prefillFullName: widget.user.fullName),
        ),
      );
      if (mounted && !_usesOsiShell) {
        await _loadMaster();
      }
    } finally {
      _navigatingToMaster = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.user.activeRole;
    if (role == 'RESIDENT') return ResidentHomeShell(user: widget.user);
    if (role == 'CHAIRMAN' || role == 'SUPERADMIN') {
      return ChairmanHomeShell(user: widget.user);
    }

    if (_loadingMaster) {
      final c = AppColors.of(context);
      return Scaffold(
        backgroundColor: c.background,
        body: Center(child: CircularProgressIndicator(color: c.primary)),
      );
    }

    final master = _master;
    if (master != null && master.status == 'APPROVED') {
      return MasterHomeShell(user: widget.user, master: master);
    }
    if (master != null) {
      return MasterStatusScreen(master: master);
    }
    // Житель/председатель без роли (REQ-007/151): поиск ОСИ + заявка на подключение вместо
    // старой инструкции «сообщите председателю телефон/email» — портировано с веба
    // (JoinOsiCard.tsx, docs/specs/osi-join-request.md).
    return JoinOsiScreen(onBecomeMaster: () => _becomeMaster(context));
  }
}

class _IncomingVideoCall extends StatefulWidget {
  final Map<String, dynamic> call;
  const _IncomingVideoCall({required this.call});
  @override
  State<_IncomingVideoCall> createState() => _IncomingVideoCallState();
}

class _IncomingVideoCallState extends State<_IncomingVideoCall> {
  Timer? timer;
  bool pending = false;
  @override
  void initState() {
    super.initState();
    timer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (pending) return;
      pending = true;
      try {
        final res = await ApiClient.instance.get('/api/video-calls');
        final rawCurrent = res is Map ? res['call'] : null;
        final current = rawCurrent is Map ? rawCurrent : null;
        if (mounted &&
            (ModalRoute.of(context)?.isCurrent ?? false) &&
            current?['id'] != widget.call['id']) {
          Navigator.pop(context, false);
        }
      } catch (_) {
      } finally {
        pending = false;
      }
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('Входящий видеозвонок'),
        content: Text(widget.call['name']?.toString() ?? ''),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Отклонить')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Принять')),
        ],
      );
}
