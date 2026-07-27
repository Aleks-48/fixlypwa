import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

class ChairmanAnalyticsScreen extends StatefulWidget {
  const ChairmanAnalyticsScreen({super.key});

  @override
  State<ChairmanAnalyticsScreen> createState() => _ChairmanAnalyticsScreenState();
}

class _ChairmanAnalyticsScreenState extends State<ChairmanAnalyticsScreen> {
  String _selectedPeriod = 'За месяц';
  final List<String> _periods = ['За месяц', 'За квартал', 'За год'];

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        title: Text(
          'Аналитика',
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: AppTypography.bold,
          ),
        ),
        backgroundColor: c.card,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Переключатель периода
            _buildPeriodSelector(c),
            const SizedBox(height: AppDimens.spaceLg),

            // Финансовая аналитика
            _buildSectionHeader(c, 'Финансовый срез'),
            const SizedBox(height: AppDimens.spaceSm),
            _buildFinanceCard(c),
            const SizedBox(height: AppDimens.spaceLg),

            // Статистика по заявкам
            _buildSectionHeader(c, 'Заявки и исполнение'),
            const SizedBox(height: AppDimens.spaceSm),
            _buildRequestsGrid(c),
            const SizedBox(height: AppDimens.spaceLg),

            // Категории
            _buildSectionHeader(c, 'Распределение по категориям'),
            const SizedBox(height: AppDimens.spaceSm),
            _buildCategoriesCard(c),
            const SizedBox(height: AppDimens.spaceLg),

            // Голосования
            _buildSectionHeader(c, 'Голосования и кворум'),
            const SizedBox(height: AppDimens.spaceSm),
            _buildVotingCard(c),
            const SizedBox(height: AppDimens.spaceXl),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(AppColors c, String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: AppTypography.sectionTitle,
        fontWeight: AppTypography.bold,
        color: c.textPrimary,
      ),
    );
  }

  Widget _buildPeriodSelector(AppColors c) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Row(
        children: _periods.map((period) {
          final isSelected = _selectedPeriod == period;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedPeriod = period),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? c.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                ),
                alignment: Alignment.center,
                child: Text(
                  period,
                  style: TextStyle(
                    color: isSelected ? Colors.white : c.textSecondary,
                    fontWeight: isSelected ? AppTypography.bold : AppTypography.medium,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFinanceCard(AppColors c) {
    const double collected = 1280000;
    const double totalTarget = 1500000;
    const double progress = collected / totalTarget;

    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                    ),
                    child: const Icon(LucideIcons.wallet, color: Colors.green, size: 20),
                  ),
                  const SizedBox(width: AppDimens.spaceSm),
                  Text(
                    'Сбор целевых взносов',
                    style: TextStyle(
                      color: c.textSecondary,
                      fontWeight: AppTypography.medium,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  '85.3%',
                  style: TextStyle(
                    color: Colors.green,
                    fontWeight: AppTypography.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppDimens.spaceLg),
          Text(
            '1 280 000 ₸',
            style: TextStyle(
              fontSize: 26,
              fontWeight: AppTypography.bold,
              color: c.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'из запланированных 1 500 000 ₸',
            style: TextStyle(fontSize: 13, color: c.textSecondary),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: c.cardBorder,
              color: Colors.green,
            ),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          Divider(height: 1, color: c.cardBorder),
          const SizedBox(height: AppDimens.spaceLg),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Задолженность', style: TextStyle(fontSize: 12, color: c.textSecondary)),
                  const SizedBox(height: 2),
                  const Text(
                    '220 000 ₸',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: AppTypography.bold,
                      color: Colors.redAccent,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('Квартир с долгом', style: TextStyle(fontSize: 12, color: c.textSecondary)),
                  const SizedBox(height: 2),
                  Text(
                    '14 из 120',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: AppTypography.bold,
                      color: c.textPrimary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRequestsGrid(AppColors c) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                c,
                title: 'Всего заявок',
                value: '48',
                icon: LucideIcons.clipboardList,
                iconColor: Colors.blue,
              ),
            ),
            const SizedBox(width: AppDimens.spaceMd),
            Expanded(
              child: _buildMetricTile(
                c,
                title: 'Выполнено',
                value: '42',
                subtitle: '87% вовремя',
                icon: LucideIcons.checkCircle2,
                iconColor: Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppDimens.spaceMd),
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                c,
                title: 'В работе',
                value: '6',
                icon: LucideIcons.clock,
                iconColor: Colors.orange,
              ),
            ),
            const SizedBox(width: AppDimens.spaceMd),
            Expanded(
              child: _buildMetricTile(
                c,
                title: 'Ср. время решения',
                value: '3.2 ч.',
                icon: LucideIcons.timer,
                iconColor: Colors.purple,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricTile(
    AppColors c, {
    required String title,
    required String value,
    String? subtitle,
    required IconData icon,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(AppDimens.radiusSm),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: AppTypography.bold,
              color: c.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: c.textSecondary,
              fontWeight: AppTypography.medium,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: Colors.green,
                fontWeight: AppTypography.medium,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCategoriesCard(AppColors c) {
    final categories = [
      {'name': 'Сантехника и трубы', 'count': 18, 'pct': 0.38},
      {'name': 'Домофон и Электрика', 'count': 14, 'pct': 0.29},
      {'name': 'Уборка территории', 'count': 10, 'pct': 0.21},
      {'name': 'Лифтовое оборудование', 'count': 6, 'pct': 0.12},
    ];

    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        children: categories.map((cat) {
          final double pct = cat['pct'] as double;
          return Padding(
            padding: const EdgeInsets.only(bottom: AppDimens.spaceMd),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      cat['name'] as String,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: AppTypography.medium,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      '${cat['count']} (${(pct * 100).toInt()}%)',
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 12,
                        fontWeight: AppTypography.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 6,
                    backgroundColor: c.cardBorder,
                    color: c.primary,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildVotingCard(AppColors c) {
    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.indigo.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.vote, color: Colors.indigo, size: 22),
          ),
          const SizedBox(width: AppDimens.spaceLg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Участие в голосованиях',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: AppTypography.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Средняя явка собственников — 68%',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}