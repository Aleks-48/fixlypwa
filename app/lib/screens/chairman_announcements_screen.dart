import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/announcements_repository.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:url_launcher/url_launcher.dart';

// Объявления дома — председатель (REQ-143). Список + создание + удаление.
// MVP: берём ПЕРВЫЙ дом ОСИ (Q-005 — большинство ОСИ управляют одним домом).
class ChairmanAnnouncementsScreen extends StatefulWidget {
  const ChairmanAnnouncementsScreen({super.key});

  @override
  State<ChairmanAnnouncementsScreen> createState() =>
      _ChairmanAnnouncementsScreenState();
}

class _ChairmanAnnouncementsScreenState
    extends State<ChairmanAnnouncementsScreen> {
  List<Announcement> _items = [];
  String? _buildingId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final buildings = await OsiRepository.instance.listBuildings();
      final items = await AnnouncementsRepository.instance.list();
      if (!mounted) return;
      setState(() {
        _buildingId = buildings.isNotEmpty ? buildings.first.id : null;
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

  Future<void> _openCreate() async {
    if (_buildingId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Сначала добавьте дом')),
      );
      return;
    }
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.of(context).card,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (_) => _CreateAnnouncementSheet(buildingId: _buildingId!),
    );
    if (created == true && mounted) _load();
  }

  Future<void> _deleteAnnouncement(String id) async {
    final c = AppColors.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.card,
        title: Text('Удалить объявление?',
            style: TextStyle(color: c.textPrimary)),
        content: Text(
          'Объявление будет удалено и больше не отобразится у жителей.',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Отмена', style: TextStyle(color: c.textTertiary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Удалить', style: TextStyle(color: c.danger)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await AnnouncementsRepository.instance.delete(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Объявление удалено')),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ошибка удаления: $e')),
      );
    }
  }

  Future<void> _shareAnnouncement(Announcement a) async {
    final text = Uri.encodeComponent(
      '📢 *Уведомление от председателя ОСИ*\n\n'
      '*${a.title}*\n\n'
      '${a.body}\n\n'
      'Подробнее в приложении Fixly.'
    );
    final c = AppColors.of(context);

    await showModalBottomSheet(
      context: context,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Рассылка объявления',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: AppTypography.sectionTitle,
                fontWeight: AppTypography.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Выберите чат для отправки готового текста жителям:',
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: AppDimens.spaceMd),
            ListTile(
              leading: const Icon(LucideIcons.messageSquare, color: Color(0xFF25D366)),
              title: const Text('Поделиться в WhatsApp чат'),
              onTap: () async {
                Navigator.pop(ctx);
                final uri = Uri.parse('https://api.whatsapp.com/send?text=$text');
                if (await canLaunchUrl(uri)) {
                  launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
            ),
            ListTile(
              leading: const Icon(LucideIcons.send, color: Color(0xFF229ED9)),
              title: const Text('Поделиться в Telegram чат'),
              onTap: () async {
                Navigator.pop(ctx);
                final uri = Uri.parse('https://t.me/share/url?url=&text=$text');
                if (await canLaunchUrl(uri)) {
                  launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    // Сортировка: сначала закрепленные, затем по новизне
    final sortedItems = List<Announcement>.from(_items)
      ..sort((a, b) {
        if (a.isPinned != b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        return b.createdAt.compareTo(a.createdAt);
      });

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Объявления', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'create_announcement_fab',
        onPressed: _openCreate,
        backgroundColor: c.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? Center(child: CircularProgressIndicator(color: c.primary))
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppDimens.spaceLg),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!,
                              style: TextStyle(color: c.danger),
                              textAlign: TextAlign.center),
                          const SizedBox(height: AppDimens.spaceMd),
                          OutlinedButton(
                              onPressed: _load,
                              child: const Text('Повторить')),
                        ],
                      ),
                    ),
                  )
                : sortedItems.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceLg),
                          child: Text(
                            'Объявлений пока нет — нажмите «+», чтобы опубликовать первое',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: c.textTertiary),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(
                          AppDimens.spaceMd,
                          AppDimens.spaceMd,
                          AppDimens.spaceMd,
                          80,
                        ),
                        itemCount: sortedItems.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final a = sortedItems[i];
                          return Container(
                            padding: const EdgeInsets.all(AppDimens.spaceMd),
                            decoration: BoxDecoration(
                              color: c.card,
                              borderRadius:
                                  BorderRadius.circular(AppDimens.radiusMd),
                              border: Border.all(
                                color: a.isPinned
                                    ? c.secondary.withOpacity(0.5)
                                    : c.cardBorder,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    if (a.isPinned) ...[
                                      Icon(LucideIcons.pin,
                                          size: 14, color: c.secondary),
                                      const SizedBox(width: 6),
                                    ],
                                    Expanded(
                                      child: Text(
                                        a.title,
                                        style: TextStyle(
                                          color: c.textPrimary,
                                          fontWeight: AppTypography.semibold,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      'прочитали: ${a.readCount}',
                                      style: TextStyle(
                                        color: c.textTertiary,
                                        fontSize: AppTypography.caption,
                                      ),
                                    ),
                                    PopupMenuButton<String>(
                                      icon: Icon(LucideIcons.moreVertical,
                                          size: 16, color: c.textTertiary),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(),
                                      onSelected: (val) {
                                        if (val == 'delete') {
                                          _deleteAnnouncement(a.id);
                                        } else if (val == 'share') {
                                          _shareAnnouncement(a);
                                        }
                                      },
                                      itemBuilder: (_) => [
                                        PopupMenuItem(
                                          value: 'share',
                                          child: Row(
                                            children: [
                                              Icon(LucideIcons.share2,
                                                  size: 16, color: c.textPrimary),
                                              const SizedBox(width: 8),
                                              Text('Разослать',
                                                  style: TextStyle(
                                                      color: c.textPrimary)),
                                            ],
                                          ),
                                        ),
                                        PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(LucideIcons.trash2,
                                                  size: 16, color: c.danger),
                                              const SizedBox(width: 8),
                                              Text('Удалить',
                                                  style: TextStyle(
                                                      color: c.danger)),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  a.body,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: c.textSecondary),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  DateFormat('d MMMM, HH:mm', 'ru')
                                      .format(a.createdAt.toLocal()),
                                  style: TextStyle(
                                    color: c.textTertiary,
                                    fontSize: AppTypography.caption,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}

class _CreateAnnouncementSheet extends StatefulWidget {
  final String buildingId;
  const _CreateAnnouncementSheet({required this.buildingId});

  @override
  State<_CreateAnnouncementSheet> createState() =>
      _CreateAnnouncementSheetState();
}

class _CreateAnnouncementSheetState extends State<_CreateAnnouncementSheet> {
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  bool _isPinned = false;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty || _bodyCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Заполните заголовок и текст');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await AnnouncementsRepository.instance.create(
        buildingId: widget.buildingId,
        title: _titleCtrl.text.trim(),
        body: _bodyCtrl.text.trim(),
        isPinned: _isPinned,
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Не удалось опубликовать');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: AppDimens.spaceLg,
        right: AppDimens.spaceLg,
        top: AppDimens.spaceLg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppDimens.spaceLg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Новое объявление',
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 20,
              fontWeight: AppTypography.bold,
            ),
          ),
          const SizedBox(height: AppDimens.spaceMd),
          TextField(
            controller: _titleCtrl,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              hintText: 'Заголовок',
              hintStyle: TextStyle(color: c.textTertiary),
              filled: true,
              fillColor: c.surfaceVariant,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: AppDimens.spaceSm),
          TextField(
            controller: _bodyCtrl,
            maxLines: 4,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              hintText: 'Текст объявления',
              hintStyle: TextStyle(color: c.textTertiary),
              filled: true,
              fillColor: c.surfaceVariant,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: AppDimens.spaceSm),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _isPinned,
            onChanged: (v) => setState(() => _isPinned = v),
            activeColor: c.primary,
            title: Text('Закрепить', style: TextStyle(color: c.textPrimary)),
          ),
          if (_error != null) ...[
            Text(_error!, style: TextStyle(color: c.danger)),
            const SizedBox(height: AppDimens.spaceSm),
          ],
          SizedBox(
            width: double.infinity,
            height: AppDimens.primaryTapTarget,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: c.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Text(
                      'Опубликовать',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: AppTypography.bold,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}