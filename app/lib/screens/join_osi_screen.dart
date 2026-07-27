import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/home_router.dart';

// Самообслуживание жителя (REQ-151/154, docs/specs/osi-join-request.md) — портировано с веба
// (web/src/app/app/_components/JoinOsiCard.tsx): вместо инструкции «сообщите председателю
// телефон/email» — поиск своей ОСИ и заявка на подключение. Привязку к квартире делает
// председатель (REQ-013/153, addResident) — этот экран только заявляет о намерении.
class JoinOsiScreen extends StatefulWidget {
  final VoidCallback? onBecomeMaster;
  const JoinOsiScreen({super.key, this.onBecomeMaster});

  @override
  State<JoinOsiScreen> createState() => _JoinOsiScreenState();
}

class _JoinOsiScreenState extends State<JoinOsiScreen> {
  bool _loading = true;
  List<MyJoinRequest> _myRequests = [];

  final _queryCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  List<OsiSearchResult> _results = [];
  OsiSearchResult? _selected;
  bool _searching = false;
  bool _submitting = false;
  String? _error;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _queryCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final requests = await OsiRepository.instance.myJoinRequests();
      if (mounted) setState(() => _myRequests = requests);
    } catch (_) {
      // молча — экран просто покажет поиск, как для совсем нового пользователя
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Житель должен УЗНАТЬ о привязке (review 2026-07-22): раньше после «Обработано» у
  // председателя карточка заявки у жителя просто пропадала (заявка больше не PENDING), а
  // экран не перепроверял, появилась ли роль — pull-to-refresh здесь перечитывает профиль
  // ПЕРЕД заявками; если председатель уже привязал квартиру, сразу ведём в HomeRouter вместо
  // повторного показа пустого поиска (и риска повторной заявки).
  Future<void> _checkStatus() async {
    try {
      final user = await AuthRepository.instance.me();
      if (user != null && user.activeRole != null) {
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => HomeRouter(user: user)),
            (_) => false,
          );
        }
        return;
      }
    } catch (_) {
      // сеть недоступна — остаёмся на экране, ниже всё равно обновим список заявок
    }
    await _load();
  }

  // Debounce поиска (300мс), как на веб-аналоге — не долбим API на каждое нажатие.
  void _onQueryChanged(String v) {
    setState(() => _selected = null);
    _debounce?.cancel();
    if (v.trim().length < 2) {
      setState(() => _results = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _runSearch(v.trim()));
  }

  Future<void> _runSearch(String q) async {
    setState(() => _searching = true);
    try {
      final results = await OsiRepository.instance.searchOsi(q);
      if (mounted) setState(() => _results = results);
    } catch (_) {
      if (mounted) setState(() => _results = []);
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _submit() async {
    final selected = _selected;
    if (selected == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final note = _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim();
      final id = await OsiRepository.instance.submitJoinRequest(osiId: selected.id, note: note);
      if (mounted) {
        setState(() {
          _myRequests = [
            MyJoinRequest(
              id: id,
              note: note,
              osiName: selected.name,
              osiAddress: selected.address,
            ),
            ..._myRequests,
          ];
          _selected = null;
          _queryCtrl.clear();
          _noteCtrl.clear();
          _results = [];
        });
      }
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await OsiRepository.instance.cancelJoinRequest(id);
      if (mounted) setState(() => _myRequests.removeWhere((r) => r.id == id));
    } catch (err) {
      if (mounted) setState(() => _error = err.toString());
    }
  }

  Future<void> _logout() async {
    await AuthRepository.instance.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('Fixly'),
        actions: [
          IconButton(icon: Icon(Icons.logout, color: c.textPrimary), onPressed: _logout),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: c.primary))
          : RefreshIndicator(
              onRefresh: _checkStatus,
              child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Вы житель? Найдите свою ОСИ',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: AppTypography.sectionTitle,
                      fontWeight: AppTypography.bold,
                    ),
                  ),
                  const SizedBox(height: AppDimens.spaceMd),
                  if (_myRequests.isNotEmpty) ...[
                    ..._myRequests
                        .map((r) => _PendingCard(request: r, onCancel: () => _cancel(r.id))),
                    Center(
                      child: TextButton(
                        onPressed: _checkStatus,
                        child: const Text('Проверить статус'),
                      ),
                    ),
                  ] else ...[
                    Text(
                      'Найдите ОСИ вашего дома по названию или адресу и отправьте заявку — '
                      'председатель увидит её и подключит вас к вашей квартире.',
                      style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body),
                    ),
                    const SizedBox(height: AppDimens.spaceMd),
                    TextField(
                      controller: _queryCtrl,
                      onChanged: _onQueryChanged,
                      decoration: InputDecoration(
                        hintText: 'Название или адрес ОСИ',
                        prefixIcon: Icon(LucideIcons.search, color: c.textTertiary, size: 20),
                      ),
                    ),
                    if (_searching)
                      Padding(
                        padding: const EdgeInsets.only(top: AppDimens.spaceSm),
                        child: Text('Ищем…',
                            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                      ),
                    if (_results.isNotEmpty && _selected == null) ...[
                      const SizedBox(height: AppDimens.spaceSm),
                      for (final r in _results)
                        AppCard(
                          margin: const EdgeInsets.only(bottom: AppDimens.spaceXs),
                          onTap: () => setState(() {
                            _selected = r;
                            _results = [];
                          }),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                r.name,
                                style: TextStyle(
                                  color: c.textPrimary,
                                  fontSize: AppTypography.body,
                                  fontWeight: AppTypography.semibold,
                                ),
                              ),
                              if (r.address != null)
                                Text(r.address!,
                                    style:
                                        TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                            ],
                          ),
                        ),
                    ],
                    if (!_searching &&
                        _queryCtrl.text.trim().length >= 2 &&
                        _results.isEmpty &&
                        _selected == null)
                      Padding(
                        padding: const EdgeInsets.only(top: AppDimens.spaceSm),
                        child: Text('Ничего не нашли — проверьте название.',
                            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                      ),
                    if (_selected != null) ...[
                      const SizedBox(height: AppDimens.spaceMd),
                      AppCard(
                        borderColor: c.primary.withOpacity(0.4),
                        backgroundColor: c.primary.withOpacity(0.06),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selected!.name,
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: AppTypography.body,
                                fontWeight: AppTypography.semibold,
                              ),
                            ),
                            if (_selected!.address != null)
                              Text(_selected!.address!,
                                  style:
                                      TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                            const SizedBox(height: AppDimens.spaceSm),
                            TextField(
                              controller: _noteCtrl,
                              decoration: const InputDecoration(
                                hintText: 'Дом/квартира (необязательно) — напр. Абая 1, кв. 5',
                              ),
                            ),
                            const SizedBox(height: AppDimens.spaceSm),
                            Row(
                              children: [
                                Expanded(
                                  child: AppButton(
                                    label: _submitting ? 'Отправляем…' : 'Отправить заявку',
                                    icon: LucideIcons.send,
                                    isLoading: _submitting,
                                    onPressed: _submit,
                                  ),
                                ),
                                const SizedBox(width: AppDimens.spaceSm),
                                OutlinedButton(
                                  onPressed: () => setState(() => _selected = null),
                                  child: const Text('Отмена'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: AppDimens.spaceSm),
                      Text(_error!, style: TextStyle(color: c.danger, fontSize: AppTypography.caption)),
                    ],
                  ],
                  if (widget.onBecomeMaster != null) ...[
                    const SizedBox(height: AppDimens.spaceLg),
                    OutlinedButton.icon(
                      onPressed: widget.onBecomeMaster,
                      icon: Icon(LucideIcons.wrench, color: c.primary),
                      label: Text('Стать мастером', style: TextStyle(color: c.primary)),
                    ),
                  ],
                ],
              ),
            ),
          ),
    );
  }
}

class _PendingCard extends StatelessWidget {
  final MyJoinRequest request;
  final VoidCallback onCancel;
  const _PendingCard({required this.request, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return AppCard(
      margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            request.osiName,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: AppTypography.body,
              fontWeight: AppTypography.semibold,
            ),
          ),
          if (request.osiAddress != null)
            Text(request.osiAddress!,
                style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
          if (request.note != null) ...[
            const SizedBox(height: AppDimens.spaceXs),
            Text('Ваша пометка: ${request.note}',
                style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body)),
          ],
          const SizedBox(height: AppDimens.spaceXs),
          Text(
            'Заявка отправлена, ожидайте — председатель подключит вас к квартире.',
            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
          ),
          const SizedBox(height: AppDimens.spaceSm),
          TextButton.icon(
            onPressed: onCancel,
            icon: Icon(LucideIcons.x, size: 16, color: c.textTertiary),
            label: Text('Отменить заявку', style: TextStyle(color: c.textTertiary)),
          ),
        ],
      ),
    );
  }
}
