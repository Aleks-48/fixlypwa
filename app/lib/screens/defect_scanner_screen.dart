import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'create_request_screen.dart';
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
  bool _picking = false;
  int _analyzeSeq = 0;

  String? _detectedCategoryKey;
  String? _detectedTitle;
  String? _detectedDescription;
  String? _analyzeError;
  double _confidence = 0.0;

  Future<void> _pickImage(ImageSource source) async {
    if (_picking || _isAnalyzing) return;
    _picking = true;
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );
      if (mounted && picked != null) {
        setState(() {
          _imageFile = File(picked.path);
          _detectedCategoryKey = null;
          _detectedTitle = null;
          _detectedDescription = null;
          _analyzeError = null;
        });
        _analyzeWithGroqAi();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка при выборе фото: $e')),
        );
      }
    } finally {
      _picking = false;
    }
  }

  Future<void> _analyzeWithGroqAi() async {
    if (_imageFile == null || _isAnalyzing) return;
    final seq = ++_analyzeSeq;

    setState(() {
      _isAnalyzing = true;
      _detectedCategoryKey = null;
      _analyzeError = null;
    });

    try {
      final bytes = await _imageFile!.readAsBytes();
      final base64Image = base64Encode(bytes);

      // Запрос к нашему серверному Groq Llama-3 Vision AI
      final rawRes = await ApiClient.instance.post('/api/ai/scan-defect', timeout: const Duration(seconds: 130), body: {
        'imageBase64': base64Image,
      });

      if (!mounted || seq != _analyzeSeq) return;
      if (rawRes is! Map<String, dynamic>) {
        throw ApiException('BAD_RESPONSE', 'Некорректный ответ сервиса анализа', 500);
      }
      final rawConf = rawRes['confidence'];
      final confidence = (rawConf is num
              ? rawConf.toDouble()
              : (double.tryParse(rawConf?.toString() ?? '') ?? 0.0))
          .clamp(0.0, 1.0);

      setState(() {
        _isAnalyzing = false;
        _detectedCategoryKey = rawRes['category']?.toString() ?? 'OTHER';
        _detectedTitle = rawRes['title']?.toString() ?? 'Обнаружен дефект';
        _detectedDescription = rawRes['description']?.toString() ?? 'Требуется осмотр специалиста.';
        _confidence = confidence;
      });
    } on ApiException catch (e) {
      if (!mounted || seq != _analyzeSeq) return;
      setState(() {
        _isAnalyzing = false;
        _detectedCategoryKey = null;
        _analyzeError = e.message;
      });
    } catch (_) {
      if (!mounted || seq != _analyzeSeq) return;
      setState(() {
        _isAnalyzing = false;
        _detectedCategoryKey = null;
        _analyzeError = 'Не удалось распознать дефект. Опишите проблему в заявке или повторите анализ.';
      });
    }
  }

  Future<void> _createRequestFromScan() async {
    final id = await Navigator.push<String>(context, MaterialPageRoute(
      builder: (_) => CreateRequestScreen(photoPath: _imageFile?.path,
          category: _detectedCategoryKey ?? 'OTHER', description: _detectedDescription),
    ));
    if (mounted && id != null) Navigator.pop(context);
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
                          Image.file(
                            _imageFile!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Center(
                              child: Icon(LucideIcons.imageOff, size: 48, color: c.textTertiary),
                            ),
                          ),
                          if (_isAnalyzing)
                            Container(
                              color: Colors.black54,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    CircularProgressIndicator(color: c.primary),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'Groq Llama-3 Vision анализирует фото...',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      )
                    : Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.camera, size: 56, color: c.textTertiary),
                              const SizedBox(height: 12),
                              Text(
                                AppLocalizations.tr('scanner_hint'),
                                textAlign: TextAlign.center,
                                style: TextStyle(color: c.textTertiary, fontSize: 14),
                              ),
                              const SizedBox(height: 16),
                              Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 12,
                                runSpacing: 10,
                                children: [
                                  ElevatedButton.icon(
                                    onPressed: () => _pickImage(ImageSource.camera),
                                    icon: const Icon(LucideIcons.camera, size: 16),
                                    label: Text(AppLocalizations.tr('scanner_camera')),
                                    style: ElevatedButton.styleFrom(backgroundColor: c.primary),
                                  ),
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

            if (_imageFile != null && !_isAnalyzing && _detectedCategoryKey == null) ...[
              Text(
                _analyzeError ?? 'Не удалось распознать дефект. Опишите проблему в заявке или повторите анализ.',
                style: TextStyle(color: _analyzeError != null ? c.danger : c.textPrimary),
              ),
              TextButton(onPressed: _analyzeWithGroqAi, child: const Text('Повторить анализ')),
              ElevatedButton(onPressed: _createRequestFromScan, child: const Text('Заполнить заявку с фото')),
            ],
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
                                'Groq AI Vision (${(_confidence * 100).toStringAsFixed(0)}% уверенность модели)',
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
                    overflow: TextOverflow.ellipsis,
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