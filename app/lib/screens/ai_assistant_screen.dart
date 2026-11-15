import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/api_client.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

// Модель сообщения чата
class AiMessage {
  final String text;
  final bool isUser;
  final DateTime time;

  AiMessage({required this.text, required this.isUser, required this.time});
}

class AiAssistantScreen extends StatefulWidget {
  const AiAssistantScreen({super.key});

  @override
  State<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends State<AiAssistantScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<AiMessage> _messages = [
    AiMessage(
      text: 'Привет! Я AI-помощник Fixly. Опишите поломку, и я помогу составить заявку или дам совет.',
      isUser: false,
      time: DateTime.now().subtract(const Duration(minutes: 1)),
    ),
  ];
  bool _isTyping = false;

  final _client = http.Client();
  String? _conversation;

  @override
  void dispose() {
    _client.close();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    final text = _controller.text.trim();
    if (_isTyping || text.isEmpty) return;
    setState(() {
      _messages.insert(0, AiMessage(text: text, isUser: true, time: DateTime.now()));
      _isTyping = true;
    });
    _controller.clear();
    try {
      final api = ApiClient.instance;
      final request = http.Request('POST', Uri.parse('${api.baseUrl}/api/assistant/chat'))
        ..followRedirects = false
        ..headers.addAll(await api.authHeaders())
        ..headers['Content-Type'] = 'application/json'
        ..body = jsonEncode({'message': text, if (_conversation != null) 'conversationId': _conversation});
      final res = await _client.send(request).timeout(const Duration(seconds: 30));
      final lines = res.stream.transform(utf8.decoder).timeout(const Duration(seconds: 60));
      if (res.statusCode != 200) {
        final raw = await lines.join();
        String message = 'Ассистент недоступен';
        try {
          final decoded = jsonDecode(raw);
          if (decoded is Map<String, dynamic>) {
            final err = decoded['error'];
            if (err is String && err.isNotEmpty) {
              message = err;
            } else if (err is Map && err['message'] != null) {
              message = err['message'].toString();
            } else if (decoded['message'] is String && (decoded['message'] as String).isNotEmpty) {
              message = decoded['message'] as String;
            }
          }
        } catch (_) {}
        throw ApiException('CHAT', message, res.statusCode);
      }
      String event = '';
      final answer = StringBuffer();
      bool insertedBotMessage = false;
      bool done = false;
      await for (final line in lines.transform(const LineSplitter())) {
        if (!mounted) return;
        if (line.startsWith('event:')) {
          event = line.substring(6).trim();
          continue;
        }
        if (!line.startsWith('data:')) continue;
        final payload = line.substring(5).trim();
        if (payload.isEmpty) continue;
        dynamic decoded;
        try {
          decoded = jsonDecode(payload);
        } catch (_) {
          continue;
        }
        if (decoded is! Map<String, dynamic>) continue;
        if (event == 'error') {
          throw ApiException('CHAT', decoded['message']?.toString() ?? 'Ошибка ассистента', 0);
        }
        if (event == 'text') {
          final chunk = decoded['text']?.toString() ?? '';
          answer.write(chunk);
          final message = AiMessage(text: answer.toString(), isUser: false, time: DateTime.now());
          setState(() {
            if (!insertedBotMessage) {
              _messages.insert(0, message);
              insertedBotMessage = true;
            } else {
              _messages[0] = message;
            }
          });
        }
        if (event == 'done') {
          _conversation = decoded['conversationId']?.toString() ?? _conversation;
          done = true;
        }
      }
      if (!done) throw ApiException('CHAT', 'Соединение с ассистентом прервано', 0);
    } catch (e) {
      if (mounted) {
        if (_controller.text.isEmpty) _controller.text = text;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e is ApiException ? e.message : 'Не удалось получить ответ ассистента'),
        ));
      }
    } finally { if (mounted) setState(() => _isTyping = false); }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: c.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(LucideIcons.bot, color: c.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text('AI-помощник', overflow: TextOverflow.ellipsis, style: TextStyle(color: c.textPrimary)),
            ),
          ],
        ),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: Column(
        children: [
          // Список сообщений
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              reverse: true, // Чат растет снизу вверх
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                return _buildMessageBubble(_messages[index], c);
              },
            ),
          ),
          
          if (_isTyping) _buildTypingIndicator(c),

          // Поле ввода
          _buildInputArea(c),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(AiMessage message, AppColors c) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppDimens.spaceSm),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: message.isUser ? c.primary : c.card,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(message.isUser ? 16 : 4),
            bottomRight: Radius.circular(message.isUser ? 4 : 16),
          ),
          border: message.isUser ? null : Border.all(color: c.cardBorder),
        ),
        child: Text(
          message.text,
          style: TextStyle(
            color: message.isUser ? Colors.white : c.textPrimary,
            fontSize: 15,
          ),
        ),
      ),
    );
  }

  Widget _buildTypingIndicator(AppColors c) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: AppDimens.spaceMd, bottom: AppDimens.spaceSm),
        child: Text(
          'Fixly Bot печатает...',
          style: TextStyle(color: c.textTertiary, fontSize: 12, fontStyle: FontStyle.italic),
        ),
      ),
    );
  }

  Widget _buildInputArea(AppColors c) {
    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceSm),
      decoration: BoxDecoration(
        color: c.card,
        border: Border(top: BorderSide(color: c.cardBorder)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                maxLength: 2000,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Опишите проблему...',
                  hintStyle: TextStyle(color: c.textTertiary),
                  filled: true,
                  fillColor: c.surfaceVariant,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                onSubmitted: (_) => _handleSend(),
              ),
            ),
            const SizedBox(width: 8),
            FloatingActionButton.small(
              heroTag: 'send_ai_msg',
              onPressed: _isTyping ? null : _handleSend,
              backgroundColor: c.primary,
              elevation: 0,
              child: _isTyping
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(
                      Icons.send,
                      size: 18,
                      color: Colors.white,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}