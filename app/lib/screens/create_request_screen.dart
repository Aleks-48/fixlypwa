import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/main.dart' show appLanguage;

class CreateRequestScreen extends StatefulWidget {
  final String? photoPath;
  final String? category;
  final String? description;
  const CreateRequestScreen({super.key, this.photoPath, this.category, this.description});

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  late String _category = widget.category ?? requestCategoryOrder.first;
  late String? _photoPath = widget.photoPath;
  String? _uploadedUrl;
  bool _picking = false;

  Future<void> _pick(ImageSource source) async {
    if (_picking || _submitting) return;
    _picking = true;
    try {
      final photo = await ImagePicker().pickImage(source: source, maxWidth: 1600, imageQuality: 85);
      if (mounted && photo != null) {
        setState(() {
          _photoPath = photo.path;
          _uploadedUrl = null;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Не удалось открыть камеру или медиатеку');
    } finally {
      _picking = false;
    }
  }
  late final _textCtrl = TextEditingController(text: widget.description);
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final text = _textCtrl.text.trim();
    if (text.isEmpty) {
      final lang = appLanguage.value;
      setState(() => _error = lang == 'ru'
          ? 'Опишите проблему'
          : (lang == 'en' ? 'Describe the issue' : 'Проблеманы сипаттаңыз'));
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      if (_photoPath != null) _uploadedUrl ??= await ApiClient.instance.uploadPhoto(_photoPath!);
      final id = await RequestsRepository.instance.create(category: _category, text: text,
          photoUrls: _uploadedUrl == null ? null : [_uploadedUrl!]);
      if (mounted) Navigator.pop(context, id);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = AppLocalizations.tr('status_error'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return ValueListenableBuilder<String>(
      valueListenable: appLanguage,
      builder: (context, lang, _) {
        return Scaffold(
          backgroundColor: c.background,
          appBar: AppBar(
            backgroundColor: c.background,
            elevation: 0,
            title: Text(lang == 'ru' ? 'Новая заявка' : 'Жаңа өтінім', style: TextStyle(color: c.textPrimary)),
            iconTheme: IconThemeData(color: c.textPrimary),
          ),
          body: ListView(
            padding: const EdgeInsets.all(AppDimens.spaceMd),
            children: [
              Text(lang == 'ru' ? 'Категория' : 'Санаты',
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
                    label: Text(getRequestCategoryLabel(cat)),
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
              Text(lang == 'ru' ? 'Описание' : 'Сипаттамасы',
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
                  hintText: lang == 'ru' ? 'Опишите проблему подробно' : 'Проблеманы егжей-тегжейлі сипаттаңыз',
                  hintStyle: TextStyle(color: c.textTertiary),
                  filled: true,
                  fillColor: c.surfaceVariant,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              if (_photoPath != null)
                Image.file(
                  File(_photoPath!),
                  height: 140,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              Wrap(children: [
                TextButton.icon(onPressed: _submitting ? null : () => _pick(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library), label: Text(lang == 'ru' ? 'Из галереи' : 'Галереядан')),
                TextButton.icon(onPressed: _submitting ? null : () => _pick(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt), label: Text(lang == 'ru' ? 'Снять фото' : 'Фото түсіру')),
                if (_photoPath != null)
                  IconButton(tooltip: lang == 'ru' ? 'Убрать фото' : 'Фотоны өшіру', icon: const Icon(Icons.close),
                    onPressed: _submitting ? null : () => setState(() { _photoPath = null; _uploadedUrl = null; })),
              ]),
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
                      : Text(AppLocalizations.tr('btn_send'),
                          style: const TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
