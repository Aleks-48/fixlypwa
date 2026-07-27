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

  void _handleSend() {
    if (_controller.text.trim().isEmpty) return;

    setState(() {
      _messages.insert(0, AiMessage(
        text: _controller.text.trim(),
        isUser: true,
        time: DateTime.now(),
      ));
      _isTyping = true;
    });
    _controller.clear();

    // Симуляция ответа AI через 2 секунды
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _isTyping = false;
          _messages.insert(0, AiMessage(
            text: 'Понял вас. Похоже, проблема в смесителе. Рекомендую перекрыть горячую воду под раковиной и оформить заявку в категории «Сантехника». Помочь составить текст заявки?',
            isUser: false,
            time: DateTime.now(),
          ));
        });
      }
    });
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
                color: c.primary.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(LucideIcons.bot, color: c.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Text('AI-помощник', style: TextStyle(color: c.textPrimary)),
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
              onPressed: _handleSend,
              backgroundColor: c.primary,
              elevation: 0,
              child: const Icon(
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