import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

class PdfReceiptsScreen extends StatefulWidget {
  const PdfReceiptsScreen({super.key});

  @override
  State<PdfReceiptsScreen> createState() => _PdfReceiptsScreenState();
}

class _PdfReceiptsScreenState extends State<PdfReceiptsScreen> {
  String _selectedPeriod = 'Март 2026';

  final List<String> _periods = [
    'Март 2026',
    'Февраль 2026',
    'Январь 2026',
    'Декабрь 2025',
  ];

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Квитанции и форма №163', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Выбор периода
            DropdownButtonFormField<String>(
              value: _selectedPeriod,
              dropdownColor: c.card,
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                labelText: 'Период начисления',
                labelStyle: TextStyle(color: c.textSecondary),
                filled: true,
                fillColor: c.card,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  borderSide: BorderSide(color: c.cardBorder),
                ),
              ),
              items: _periods.map((period) {
                return DropdownMenuItem(value: period, child: Text(period));
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedPeriod = val);
              },
            ),
            const SizedBox(height: AppDimens.spaceLg),

            // Карточка PDF Квитанции
            Container(
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                border: Border.all(color: c.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Icon(LucideIcons.fileText, color: c.primary, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Единый платёжный документ',
                                style: TextStyle(
                                  color: c.textPrimary,
                                  fontWeight: AppTypography.bold,
                                  fontSize: 14,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: c.success.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Оплачено',
                          style: TextStyle(color: c.success, fontSize: 12, fontWeight: AppTypography.semibold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  _buildReceiptRow('К оплате:', '14 850 ₸', isBold: true, c: c),
                  _buildReceiptRow('Управление и содержание:', '8 200 ₸', c: c),
                  _buildReceiptRow('Накопления на капитальный ремонт:', '3 150 ₸', c: c),
                  _buildReceiptRow('Уборка и благоустройство:', '3 500 ₸', c: c),
                  const SizedBox(height: AppDimens.spaceMd),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Скачивание PDF-квитанции за $_selectedPeriod')),
                        );
                      },
                      icon: Icon(LucideIcons.download, color: c.primary, size: 18),
                      label: Text('Скачать PDF квитанцию', style: TextStyle(color: c.primary)),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: c.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusSm)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppDimens.spaceLg),

            // Карточка Отчёта по форме №163
            Container(
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                border: Border.all(color: c.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(LucideIcons.fileCheck, color: c.primary, size: 22),
                      const SizedBox(width: 8),
                      Text(
                        'Отчёт по форме №163',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontWeight: AppTypography.bold,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Ежемесячный типовой отчёт председателя об управлении объектом кондоминиума.',
                    style: TextStyle(color: c.textSecondary, fontSize: 13),
                  ),
                  const Divider(height: 24),
                  _buildReceiptRow('Поступления за месяц:', '1 240 000 ₸', c: c),
                  _buildReceiptRow('Фактические расходы:', '980 000 ₸', c: c),
                  _buildReceiptRow('Остаток на счёте:', '260 000 ₸', isBold: true, c: c),
                  const SizedBox(height: AppDimens.spaceMd),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Формирование отчёта №163 за $_selectedPeriod')),
                        );
                      },
                      icon: const Icon(LucideIcons.fileText, color: Colors.white, size: 18),
                      label: const Text('Открыть полный отчёт №163', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: c.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusSm)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value, {bool isBold = false, required AppColors c}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isBold ? c.textPrimary : c.textSecondary,
              fontWeight: isBold ? AppTypography.semibold : AppTypography.regular,
              fontSize: 13,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: isBold ? AppTypography.bold : AppTypography.medium,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}