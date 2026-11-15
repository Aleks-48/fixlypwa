import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/announcements_repository.dart';
import 'package:fixly_app/core/events_repository.dart';

// Объявления дома (mobile-app.md §4, срез 22) — read-only на мобильном: публикует председатель
// на сайте (REQ-121). Отметка «прочитано» ставится при открытии карточки. Живые обновления
// вместо поллинга — срез 24, REQ-133.
class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  List<Announcement> _items = [];
  bool _loading = true;
  String? _error;
  int _loadSeq = 0;
  bool _openingSheet = false;
  StreamSubscription<SseEvent>? _sub;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = EventsRepository.instance.stream.listen((e) {
      if (e.entityType == 'announcement') {
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
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await AnnouncementsRepository.instance.list();
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _error = e is ApiException ? e.message : e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _open(Announcement a) async {
    if (_openingSheet) return;
    _openingSheet = true;
    Future<void>? markReadFuture;
    if (!a.readByViewer) {
      // Best-effort — не блокируем открытие карточки, если сеть подвела.
      markReadFuture = AnnouncementsRepository.instance.markRead(a.id).catchError((_) {});
    }
    final c = AppColors.of(context);
    try {
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: c.card,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
        ),
        builder: (_) => SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimens.spaceLg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (a.isPinned)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppDimens.spaceSm),
                  child: Row(
                    children: [
                      Icon(LucideIcons.pin, size: 14, color: c.secondary),
                      const SizedBox(width: 4),
                      Text('Закреплено',
                          style: TextStyle(
                              color: c.secondary,
                              fontSize: AppTypography.caption,
                              fontWeight: AppTypography.semibold)),
                    ],
                  ),
                ),
              Text(a.title,
                  style: TextStyle(
                      color: c.textPrimary,
                      fontSize: AppTypography.screenTitle,
                      fontWeight: AppTypography.bold)),
              const SizedBox(height: AppDimens.spaceSm),
              Text(DateFormat('d MMMM yyyy, HH:mm', 'ru').format(a.createdAt.toLocal()),
                  style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
              const SizedBox(height: AppDimens.spaceMd),
              Text(a.body, style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body)),
              const SizedBox(height: AppDimens.spaceLg),
            ],
          ),
        ),
      );
      if (markReadFuture != null) await markReadFuture;
      if (mounted) _load(); // подтянуть актуальный readByViewer
    } finally {
      _openingSheet = false;
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
        title: Text('Объявления', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? LayoutBuilder(
                    builder: (context, constraints) => SingleChildScrollView(
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
                        builder: (context, constraints) => SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(minHeight: constraints.maxHeight),
                            child: Center(
                              child: Text('Объявлений пока нет',
                                  style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body)),
                            ),
                          ),
                        ),
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final a = _items[i];
                          return InkWell(
                            onTap: () => _open(a),
                            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                            child: Container(
                              padding: const EdgeInsets.all(AppDimens.spaceMd),
                              decoration: BoxDecoration(
                                color: c.card,
                                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                border: Border.all(
                                  color: a.isPinned ? c.secondary.withValues(alpha: 0.5) : c.cardBorder,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      if (a.isPinned) ...[
                                        Icon(LucideIcons.pin, size: 14, color: c.secondary),
                                        const SizedBox(width: 6),
                                      ],
                                      Expanded(
                                        child: Text(
                                          a.title,
                                          style: TextStyle(
                                            color: c.textPrimary,
                                            fontSize: AppTypography.cardTitle,
                                            fontWeight: a.readByViewer
                                                ? AppTypography.regular
                                                : AppTypography.bold,
                                          ),
                                        ),
                                      ),
                                      if (!a.readByViewer) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration:
                                              BoxDecoration(color: c.primary, shape: BoxShape.circle),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    a.body,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    DateFormat('d MMMM, HH:mm', 'ru').format(a.createdAt.toLocal()),
                                    style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
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
