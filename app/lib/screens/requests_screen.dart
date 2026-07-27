import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'package:fixly_app/screens/create_request_screen.dart';
import 'package:fixly_app/screens/request_thread_screen.dart';

// Мои заявки (mobile-app.md §4, срез 22; живые обновления вместо поллинга — срез 24, REQ-133).
class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  List<ServiceRequest> _items = [];
  bool _loading = true;
  String? _error;
  StreamSubscription<SseEvent>? _sub;
  Timer? _debounce;

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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await RequestsRepository.instance.listMine();
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _createNew() async {
    final id = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
    );
    if (id != null && mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Мои заявки', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createNew,
        backgroundColor: c.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
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
                  )
                : _items.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceLg),
                          child: Text(
                            'Заявок пока нет — нажмите «+», чтобы создать первую',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(
                            AppDimens.spaceMd, AppDimens.spaceMd, AppDimens.spaceMd, 80),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final r = _items[i];
                          final color = r.status == 'RESOLVED'
                              ? c.success
                              : r.status == 'IN_PROGRESS'
                                  ? c.warning
                                  : c.textTertiary;
                          return InkWell(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => RequestThreadScreen(requestId: r.id),
                                ),
                              );
                              if (mounted) _load();
                            },
                            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                            child: Container(
                              padding: const EdgeInsets.all(AppDimens.spaceMd),
                              decoration: BoxDecoration(
                                color: c.card,
                                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                border: Border.all(color: c.cardBorder),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(requestCategoryLabels[r.category] ?? r.category,
                                            style: TextStyle(
                                                color: c.textPrimary,
                                                fontSize: AppTypography.cardTitle,
                                                fontWeight: AppTypography.semibold)),
                                        const SizedBox(height: 4),
                                        Text(r.text,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(color: c.textSecondary)),
                                        const SizedBox(height: 4),
                                        Text(
                                          DateFormat('d MMMM', 'ru').format(r.createdAt.toLocal()),
                                          style:
                                              TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: color.withOpacity(0.12),
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
                          );
                        },
                      ),
      ),
    );
  }
}
