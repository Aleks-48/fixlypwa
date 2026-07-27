import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

class DefectScannerScreen extends StatefulWidget {
  const DefectScannerScreen({super.key});

  @override
  State<DefectScannerScreen> createState() => _DefectScannerScreenState();
}

class _DefectScannerScreenState extends State<DefectScannerScreen> {
  bool _isAnalyzing = false;
  String? _analysisResult;
  bool _hasPhoto = false;

  void _simulateScan() {
    setState(() {
      _hasPhoto = true;
      _isAnalyzing = true;
      _analysisResult = null;
    });

    // Симуляция анализа AI (3 секунды)
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          _analysisResult = 'Обнаружен дефект: Протечка трубы водоснабжения.\nРекомендуемая категория: Сантехника.';
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
        title: Text('Сканер дефектов', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          children: [
            // Область просмотра камеры / фото
            Expanded(
              flex: 3,
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black, // Заглушка для камеры
                  borderRadius: BorderRadius.circular(AppDimens.radiusLg),
                  border: Border.all(color: c.cardBorder, width: 2),
                ),
                child: _hasPhoto 
                  ? Icon(LucideIcons.image, size: 80, color: c.surfaceVariant) // Симуляция сделанного фото
                  : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.camera, size: 64, color: c.textTertiary),
                        const SizedBox(height: AppDimens.spaceSm),
                        Text('Наведите камеру на поломку', style: TextStyle(color: c.textTertiary)),
                      ],
                    ),
                  ),
              ),
            ),
            const SizedBox(height: AppDimens.spaceLg),
            
            // Результаты анализа
            Expanded(
              flex: 2,
              child: _buildAnalysisResult(c),
            ),
            
            // Кнопка действия
            const SizedBox(height: AppDimens.spaceMd),
            _buildActionButton(c),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalysisResult(AppColors c) {
    if (_isAnalyzing) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: AppDimens.spaceMd),
            Text('AI Fixly анализирует фото...', style: TextStyle(color: c.textSecondary)),
          ],
        ),
      );
    }

    if (_analysisResult != null) {
      return Container(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          border: Border.all(color: c.primary.withOpacity(0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(LucideIcons.brainCircuit, color: c.primary, size: 20),
                const SizedBox(width: 8),
                Text('Результат анализа AI', style: TextStyle(color: c.primary, fontWeight: AppTypography.bold)),
              ],
            ),
            const SizedBox(height: AppDimens.spaceSm),
            Text(_analysisResult!, style: TextStyle(color: c.textPrimary, fontSize: 15)),
          ],
        ),
      );
    }

    return Center(
      child: Text(
        'Сделайте фото для автоматического определения проблемы',
        textAlign: TextAlign.center,
        style: TextStyle(color: c.textTertiary),
      ),
    );
  }

  Widget _buildActionButton(AppColors c) {
    if (_analysisResult != null) {
      return SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton.icon(
          onPressed: () {
            // TODO: Переход на экран создания заявки с предзаполненными данными
            Navigator.pop(context);
          },
icon: const Icon(
  LucideIcons.clipboardList, 
  color: Colors.white,
),
          label: const Text('Создать заявку на основе анализа', style: TextStyle(color: Colors.white)),
          style: ElevatedButton.styleFrom(backgroundColor: c.primary),
        ),
      );
    }

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton.icon(
        onPressed: _isAnalyzing ? null : _simulateScan,
        icon: const Icon(LucideIcons.aperture, color: Colors.white),
        label: const Text('Сделать фото и сканировать', style: TextStyle(color: Colors.white)),
        style: ElevatedButton.styleFrom(backgroundColor: c.primary),
      ),
    );
  }
}