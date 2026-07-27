import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/request_labels.dart';

// Подать заявку (mobile-app.md §4, срез 22) — категория+текст, тот же контракт, что
// POST /api/requests на сайте. Фото — заведено на срез 25 полировки (требует upload-флоу,
// не блокирует базовый текстовый флоу заявки).
class CreateRequestScreen extends StatefulWidget {
  const CreateRequestScreen({super.key});

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  String _category = requestCategoryOrder.first;
  final _textCtrl = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Опишите проблему');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final id = await RequestsRepository.instance.create(category: _category, text: text);
      if (mounted) Navigator.pop(context, id);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Не удалось отправить заявку');
    } finally {
      if (mounted) setState(() => _submitting = false);
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
        title: Text('Новая заявка', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        children: [
          Text('Категория',
              style: TextStyle(
                  color: c.textPrimary,
                  fontSize: AppTypography.cardTitle,
                  fontWeight: AppTypography.semibold)),
          const SizedBox(height: AppDimens.spaceSm),
          Wrap(
            spacing: AppDimens.spaceSm,
            runSpacing: AppDimens.spaceSm,
            children: requestCategoryOrder.map((cat) {
              final selected = cat == _category;
              return ChoiceChip(
                label: Text(requestCategoryLabels[cat] ?? cat),
                selected: selected,
                onSelected: (_) => setState(() => _category = cat),
                selectedColor: c.primary,
                backgroundColor: c.surfaceVariant,
                labelStyle: TextStyle(color: selected ? Colors.white : c.textSecondary),
                side: BorderSide(color: selected ? c.primary : c.cardBorder),
              );
            }).toList(),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          Text('Описание',
              style: TextStyle(
                  color: c.textPrimary,
                  fontSize: AppTypography.cardTitle,
                  fontWeight: AppTypography.semibold)),
          const SizedBox(height: AppDimens.spaceSm),
          TextField(
            controller: _textCtrl,
            maxLines: 5,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              hintText: 'Опишите проблему подробно',
              hintStyle: TextStyle(color: c.textTertiary),
              filled: true,
              fillColor: c.surfaceVariant,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppDimens.spaceSm),
            Text(_error!, style: TextStyle(color: c.danger)),
          ],
          const SizedBox(height: AppDimens.spaceLg),
          SizedBox(
            height: AppDimens.primaryTapTarget,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: c.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    )
                  : const Text('Отправить',
                      style: TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
