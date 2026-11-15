import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/notifications_repository.dart';
import 'package:fixly_app/core/events_repository.dart';

// Центр уведомлений жителя (REQ-100, срез 22). Только чтение + отметка прочитанным —
// уведомления создаёт сервер по триггерам (объявление/заявка/сообщение). Каждое SSE-событие
// (срез 24) соответствует ровно одной новой Notification — слушаем весь поток без фильтра
// по entityType, в отличие от списков заявок/объявлений.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> _items = [];
  bool _loading = true;
  String? _error;
  int _loadSeq = 0;
  bool _markingAll = false;
  final Set<String> _markingIds = {};
  StreamSubscription<SseEvent>? _sub;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = EventsRepository.instance.stream.listen((_) {
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 500), _load);
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
      final page = await NotificationsRepository.instance.list();
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _items = page.notifications;
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

  Future<void> _markAllRead() async {
    if (_markingAll) return;
    setState(() => _markingAll = true);
    try {
      await NotificationsRepository.instance.markRead();
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Не удалось отметить прочитанным: $e'),
          backgroundColor: AppColors.of(context).danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _markingAll = false);
    }
  }

  Future<void> _onTapItem(AppNotification n) async {
    if (n.isRead || _markingIds.contains(n.id)) return;
    setState(() => _markingIds.add(n.id));
    try {
      await NotificationsRepository.instance.markRead(id: n.id);
      if (!mounted) return;
      setState(() {
        final idx = _items.indexWhere((x) => x.id == n.id);
        if (idx != -1) {
          final current = _items[idx];
          _items[idx] = AppNotification(
            id: current.id,
            type: current.type,
            title: current.title,
            body: current.body,
            entityType: current.entityType,
            entityId: current.entityId,
            readAt: DateTime.now(),
            createdAt: current.createdAt,
          );
        }
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Не удалось отметить прочитанным: $e'),
          backgroundColor: AppColors.of(context).danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _markingIds.remove(n.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final hasUnread = _items.any((n) => !n.isRead);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text(
          'Уведомления',
          style: TextStyle(color: c.textPrimary),
          overflow: TextOverflow.ellipsis,
        ),
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: _markingAll ? null : _markAllRead,
              child: Text('Прочитать всё', style: TextStyle(color: c.primary)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _ErrorState(message: _error!, onRetry: _load)
                : _items.isEmpty
                    ? _EmptyState(color: c)
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) => _NotificationTile(
                          notification: _items[i],
                          onTap: () => _onTapItem(_items[i]),
                        ),
                      ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;
  const _NotificationTile({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final n = notification;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
      child: Container(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        decoration: BoxDecoration(
          color: n.isRead ? c.card : c.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          border: Border.all(color: c.cardBorder),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!n.isRead)
              Container(
                margin: const EdgeInsets.only(top: 6, right: AppDimens.spaceSm),
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle),
              )
            else
              const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    n.title,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: AppTypography.cardTitle,
                      fontWeight: n.isRead ? AppTypography.regular : AppTypography.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(n.body,
                      style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body)),
                  const SizedBox(height: 6),
                  Text(
                    DateFormat('d MMMM, HH:mm', 'ru').format(n.createdAt.toLocal()),
                    style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final AppColors color;
  const _EmptyState({required this.color});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (_, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppDimens.spaceLg),
                child: Text(
                  'Пока нет уведомлений',
                  style: TextStyle(color: color.textTertiary, fontSize: AppTypography.body),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return LayoutBuilder(
      builder: (_, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppDimens.spaceLg),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(message, style: TextStyle(color: c.danger), textAlign: TextAlign.center),
                    const SizedBox(height: AppDimens.spaceMd),
                    OutlinedButton(onPressed: onRetry, child: const Text('Повторить')),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
