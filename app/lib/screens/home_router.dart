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

  @override
  void initState() {
    super.initState();
    PushRepository.instance.register();
    if (widget.user.activeRole == null) _loadMaster();
  }

  Future<void> _loadMaster() async {
    setState(() => _loadingMaster = true);
    try {
      final master = await MasterRepository.instance.me();
      if (!mounted) return;
      setState(() {
        _master = master;
        _loadingMaster = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingMaster = false);
    }
  }

  Future<void> _becomeMaster(BuildContext context) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MasterApplicationScreen(prefillFullName: widget.user.fullName),
      ),
    );
    if (mounted) _loadMaster();
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.user.activeRole;
    if (role == 'RESIDENT') return ResidentHomeShell(user: widget.user);
    if (role == 'CHAIRMAN' || role == 'SUPERADMIN') return ChairmanHomeShell(user: widget.user);

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
