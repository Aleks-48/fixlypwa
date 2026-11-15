import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/screens/request_thread_screen.dart';

// Заявки дома (REQ-143/144, срез R2) — все заявки ОСИ (GET ?scope=building), председатель
// меняет статус прямо из списка (тред открывается тем же RequestThreadScreen, что у жителя —
// сервер уже разрешает читать/писать в тред и жителю-автору, и председателю, REQ-003).
// Живые обновления вместо поллинга — срез 24, REQ-133.
class ChairmanRequestsScreen extends StatefulWidget {
  const ChairmanRequestsScreen({super.key});

  @override
  State<ChairmanRequestsScreen> createState() => _ChairmanRequestsScreenState();
}

const List<String> _statusOrder = ['RECEIVED', 'IN_PROGRESS', 'RESOLVED'];

class _ChairmanRequestsScreenState extends State<ChairmanRequestsScreen> {
  List<ServiceRequest> _items = [];
  bool _loading = true;
  String? _error;
  StreamSubscription<SseEvent>? _sub;
  Timer? _debounce;
  final Set<String> _updatingIds = {};
  int _loadSeq = 0;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = EventsRepository.instance.stream.listen((e) {
      if (e.entityType == 'request') {
        _debounce?.cancel();
        _debounce = Timer(const Duration(milliseconds: 500), _load);
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final seq = ++_loadSeq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await RequestsRepository.instance.listBuilding();
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _advanceStatus(ServiceRequest r) async {
    if (_updatingIds.contains(r.id)) return;
    final idx = _statusOrder.indexOf(r.status);
    if (idx < 0 || idx >= _statusOrder.length - 1) return; // уже RESOLVED
    setState(() => _updatingIds.add(r.id));
    try {
      await RequestsRepository.instance.setStatus(r.id, _statusOrder[idx + 1]);
      if (mounted) await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text(e.message), backgroundColor: AppColors.of(context).danger),
          );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: AppColors.of(context).danger),
          );
      }
    } finally {
      if (mounted) setState(() => _updatingIds.remove(r.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Заявки дома', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? LayoutBuilder(
                    builder: (_, constraints) => SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: constraints.maxHeight),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.all(AppDimens.spaceLg),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_error!, style: TextStyle(color: c.danger), textAlign: TextAlign.center),
                                const SizedBox(height: AppDimens.spaceMd),
                                OutlinedButton(onPressed: _load, child: const Text('Повторить')),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  )
                : _items.isEmpty
                    ? LayoutBuilder(
                        builder: (_, constraints) => SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: SizedBox(
                            height: constraints.maxHeight,
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.all(AppDimens.spaceLg),
                                child: Text('Заявок пока нет',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body)),
                              ),
                            ),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final r = _items[i];
                          final isUpdating = _updatingIds.contains(r.id);
                          final color = r.status == 'RESOLVED'
                              ? c.success
                              : r.status == 'IN_PROGRESS'
                                  ? c.warning
                                  : c.textTertiary;
                          final canAdvance = _statusOrder.indexOf(r.status) < _statusOrder.length - 1;
                          return Container(
                            padding: const EdgeInsets.all(AppDimens.spaceMd),
                            decoration: BoxDecoration(
                              color: c.card,
                              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                              border: Border.all(color: c.cardBorder),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                InkWell(
                                  onTap: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => RequestThreadScreen(requestId: r.id),
                                      ),
                                    );
                                    if (mounted) _load();
                                  },
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(requestCategoryLabels[r.category] ?? r.category,
                                                style: TextStyle(
                                                    color: c.textPrimary,
                                                    fontWeight: AppTypography.semibold)),
                                            const SizedBox(height: 4),
                                            Text(r.text,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(color: c.textSecondary)),
                                            const SizedBox(height: 4),
                                            Text(
                                              DateFormat('d MMMM', 'ru').format(r.createdAt.toLocal()),
                                              style: TextStyle(
                                                  color: c.textTertiary, fontSize: AppTypography.caption),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                        decoration: BoxDecoration(
                                          color: color.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          requestStatusLabels[r.status] ?? r.status,
                                          style: TextStyle(
                                              color: color,
                                              fontSize: AppTypography.caption,
                                              fontWeight: AppTypography.semibold),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (canAdvance) ...[
                                  const SizedBox(height: AppDimens.spaceSm),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: OutlinedButton(
                                      onPressed: isUpdating ? null : () => _advanceStatus(r),
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: c.primary)),
                                      child: Text(
                                        isUpdating
                                            ? 'Сохранение...'
                                            : (r.status == 'RECEIVED' ? 'Взять в работу' : 'Отметить решённой'),
                                        style: TextStyle(color: c.primary),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
