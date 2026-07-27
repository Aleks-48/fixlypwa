import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/events_repository.dart';

// Заявка + тред (mobile-app.md §4, срез 22) — REQ-003: переписка автора заявки и председателя.
// Живой тред (срез 24, REQ-133): подписка на SSE-события этой заявки — сообщение собеседника
// появляется без ручного обновления; кнопка обновления и авто-подгрузка после отправки остаются
// как резерв на случай разрыва SSE-соединения.
class RequestThreadScreen extends StatefulWidget {
  final String requestId;
  const RequestThreadScreen({super.key, required this.requestId});

  @override
  State<RequestThreadScreen> createState() => _RequestThreadScreenState();
}

const Map<String, Color Function(AppColors)> _statusColor = {
  'RECEIVED': _grey,
  'IN_PROGRESS': _warn,
  'RESOLVED': _ok,
};
Color _grey(AppColors c) => c.textTertiary;
Color _warn(AppColors c) => c.warning;
Color _ok(AppColors c) => c.success;

class _RequestThreadScreenState extends State<RequestThreadScreen> {
  ServiceRequest? _request;
  bool _loading = true;
  String? _error;
  String? _myUserId;
  final _msgCtrl = TextEditingController();
  bool _sending = false;
  StreamSubscription<SseEvent>? _sub;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = EventsRepository.instance.stream.listen((e) {
      if (e.entityType == 'request' && e.entityId == widget.requestId) {
        _debounce?.cancel();
        _debounce = Timer(const Duration(milliseconds: 500), _load);
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _sub?.cancel();
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        RequestsRepository.instance.get(widget.requestId),
        AuthRepository.instance.me(),
      ]);
      if (!mounted) return;
      setState(() {
        _request = results[0] as ServiceRequest;
        _myUserId = (results[1] as AuthUser?)?.id;
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

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await RequestsRepository.instance.addMessage(widget.requestId, text);
      _msgCtrl.clear();
      await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
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
        title: Text(
          _request != null ? (requestCategoryLabels[_request!.category] ?? _request!.category) : 'Заявка',
          style: TextStyle(color: c.textPrimary),
        ),
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          IconButton(icon: Icon(Icons.refresh, color: c.textPrimary), onPressed: _load),
        ],
      ),
      body: _loading
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
              : Column(
                  children: [
                    _StatusBar(request: _request!, colors: c),
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        children: [
                          Container(
                            padding: const EdgeInsets.all(AppDimens.spaceMd),
                            decoration: BoxDecoration(
                              color: c.card,
                              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                              border: Border.all(color: c.cardBorder),
                            ),
                            child: Text(_request!.text, style: TextStyle(color: c.textPrimary)),
                          ),
                          const SizedBox(height: AppDimens.spaceMd),
                          for (final m in _request!.messages)
                            _MessageBubble(
                              message: m,
                              isMine: m.authorUserId == _myUserId,
                              colors: c,
                            ),
                        ],
                      ),
                    ),
                    _Composer(controller: _msgCtrl, sending: _sending, onSend: _send, colors: c),
                  ],
                ),
    );
  }
}

class _StatusBar extends StatelessWidget {
  final ServiceRequest request;
  final AppColors colors;
  const _StatusBar({required this.request, required this.colors});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    final color = (_statusColor[request.status] ?? _grey)(c);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: AppDimens.spaceMd, vertical: AppDimens.spaceSm),
      color: color.withOpacity(0.1),
      child: Row(
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(requestStatusLabels[request.status] ?? request.status,
              style: TextStyle(color: color, fontWeight: AppTypography.semibold)),
          const Spacer(),
          Text(DateFormat('d MMMM', 'ru').format(request.createdAt.toLocal()),
              style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final RequestMessage message;
  final bool isMine;
  final AppColors colors;
  const _MessageBubble({required this.message, required this.isMine, required this.colors});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
        padding: const EdgeInsets.symmetric(horizontal: AppDimens.spaceMd, vertical: 10),
        constraints: const BoxConstraints(maxWidth: 280),
        decoration: BoxDecoration(
          color: isMine ? c.primary : c.surfaceVariant,
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message.text, style: TextStyle(color: isMine ? Colors.white : c.textPrimary)),
            const SizedBox(height: 4),
            Text(
              DateFormat('HH:mm').format(message.createdAt.toLocal()),
              style: TextStyle(
                color: isMine ? Colors.white70 : c.textTertiary,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final AppColors colors;
  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(AppDimens.spaceSm),
        decoration: BoxDecoration(color: c.card, border: Border(top: BorderSide(color: c.divider))),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Сообщение…',
                  hintStyle: TextStyle(color: c.textTertiary),
                  filled: true,
                  fillColor: c.surfaceVariant,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppDimens.spaceSm),
            IconButton(
              onPressed: sending ? null : onSend,
              icon: sending
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: c.primary),
                    )
                  : Icon(Icons.send, color: c.primary),
            ),
          ],
        ),
      ),
    );
  }
}
