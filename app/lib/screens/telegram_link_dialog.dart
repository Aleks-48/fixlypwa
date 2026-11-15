import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

Future<void> showTelegramLinkDialog(
  BuildContext context,
  String? username,
  String language,
) async {
  final name = username?.trim().replaceFirst(RegExp(r'^@'), '') ?? '';
  final valid = RegExp(r'^[A-Za-z0-9_]{5,32}$').hasMatch(name);
  final (message, open, back) = switch (language) {
    'en' => (
        'Open the bot, tap Start and share your phone number. Return here and request a code again.',
        'Open Telegram',
        'Back'
      ),
    'kk' => (
        'Ботты ашып, «Бастау» түймесін басыңыз және телефон нөміріңізбен бөлісіңіз. Содан кейін кодты қайта сұраңыз.',
        'Telegram ашу',
        'Артқа'
      ),
    _ => (
        'Откройте бота, нажмите «Начать» и поделитесь своим номером. Затем вернитесь и снова запросите код.',
        'Открыть Telegram',
        'Назад'
      ),
  };
  await showDialog<void>(
    context: context,
    builder: (dialog) => AlertDialog(
      title: Text(valid ? '@$name' : 'Telegram'),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialog), child: Text(back)),
        if (valid)
          TextButton(
            onPressed: () async {
              await launchUrl(Uri.https('t.me', '/$name'),
                  mode: LaunchMode.externalApplication);
            },
            child: Text(open),
          ),
      ],
    ),
  );
}
