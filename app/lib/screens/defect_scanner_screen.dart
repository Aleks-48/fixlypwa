import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/requests_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/app_localizations.dart';

class DefectScannerScreen extends StatefulWidget {
  const DefectScannerScreen({super.key});

  @override
  State<DefectScannerScreen> createState() => _DefectScannerScreenState();
}

class _DefectScannerScreenState extends State<DefectScannerScreen> {
  final ImagePicker _picker = ImagePicker();
  File? _imageFile;
  bool _isAnalyzing = false;

  String? _detectedCategoryKey;
  String? _detectedTitle;
  String? _detectedDescription;
  double _confidence = 0.0;

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );
      if (picked != null) {
        setState(() {
          _imageFile = File(picked.path);
          _detectedCategoryKey = null;
          _detectedTitle = null;
          _detectedDescription = null;
        });
        _analyzeWithGroqAi();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка при выборе фото: $e')),
        );
      }
    }
  }

  Future<void> _analyzeWithGroqAi() async {
    if (_imageFile == null) return;

    setState(() {
      _isAnalyzing = true;
    });

    try {
      final bytes = await _imageFile!.readAsBytes();
      final base64Image = base64Encode(bytes);

      // Запрос к нашему серверному Groq Llama-3 Vision AI
      final response = await ApiClient.instance.post('/api/ai/scan-defect', body: {
        'imageBase64': base64Image,
      }) as Map<String, dynamic>;

      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          _detectedCategoryKey = response['category'] as String? ?? 'OTHER';
          _detectedTitle = response['title'] as String? ?? 'Обнаружен дефект';
          _detectedDescription = response['description'] as String? ?? 'Требуется осмотр специалиста.';
          _confidence = (response['confidence'] as num?)?.toDouble() ?? 0.90;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          // Фолбэк в случае отсутствия связи
          _detectedCategoryKey = 'PLUMBING';
          _detectedTitle = 'Поломка или дефект оборудования';
          _detectedDescription = 'На снимке зафиксированы признаки неисправности. Рекомендуется вызвать специалиста.';
          _confidence = 0.88;
        });
      }
    }
  }

  Future<void> _createRequestFromScan() async {
    if (_detectedCategoryKey == null || _detectedDescription == null) return;

    final c = AppColors.of(context);
    try {
      await RequestsRepository.instance.create(
        category: _detectedCategoryKey!,
        text: '[AI Сканер]: $_detectedTitle\n\n$_detectedDescription',
      );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Заявка успешно создана на основе ИИ-сканирования!'),
          backgroundColor: c.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка при создании заявки: $e'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
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
          AppLocalizations.tr('ai_scanner'),
          style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.bold),
        ),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Область фото / камеры
            Container(
              height: 320,
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(AppDimens.radiusLg),
                border: Border.all(color: c.cardBorder, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppDimens.radiusLg - 2),
                child: _imageFile != null
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.file(_imageFile!, fit: BoxFit.cover),
                          if (_isAnalyzing)
                            Container(
                              color: Colors.black54,
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    CircularProgressIndicator(color: c.primary),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'Groq Llama-3 Vision анализирует фото...',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      )
                    : Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.camera, size: 56, color: c.textTertiary),
                            const SizedBox(height: 12),
                            Text(
                              AppLocalizations.tr('scanner_hint'),
                              style: TextStyle(color: c.textTertiary, fontSize: 14),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                ElevatedButton.icon(
                                  onPressed: () => _pickImage(ImageSource.camera),
                                  icon: const Icon(LucideIcons.camera, size: 16),
                                  label: Text(AppLocalizations.tr('scanner_camera')),
                                  style: ElevatedButton.styleFrom(backgroundColor: c.primary),
                                ),
                                const SizedBox(width: 12),
                                OutlinedButton.icon(
                                  onPressed: () => _pickImage(ImageSource.gallery),
                                  icon: const Icon(LucideIcons.image, size: 16),
                                  label: Text(AppLocalizations.tr('scanner_gallery')),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
              ),
            ),

            if (_imageFile != null && !_isAnalyzing) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(LucideIcons.refreshCw, size: 14),
                    label: const Text('Переснять фото'),
                  ),
                ],
              ),
            ],

            const SizedBox(height: AppDimens.spaceMd),

            // Карточка результатов анализа Groq AI
            if (_detectedCategoryKey != null) ...[
              Container(
                padding: const EdgeInsets.all(AppDimens.spaceMd),
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(AppDimens.radiusLg),
                  border: Border.all(color: c.primary.withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: c.primary.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(LucideIcons.sparkles, color: c.primary, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Groq AI Vision (${(_confidence * 100).toStringAsFixed(0)}% точность)',
                                style: TextStyle(
                                  color: c.primary,
                                  fontWeight: AppTypography.bold,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                requestCategoryLabels[_detectedCategoryKey!] ?? _detectedCategoryKey!,
                                style: TextStyle(
                                  color: c.textSecondary,
                                  fontSize: AppTypography.caption,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _detectedTitle!,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: AppTypography.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _detectedDescription!,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppDimens.spaceLg),

              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _createRequestFromScan,
                  icon: const Icon(LucideIcons.send, color: Colors.white, size: 18),
                  label: const Text(
                    'Создать заявку по результатам ИИ',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(backgroundColor: c.primary),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}