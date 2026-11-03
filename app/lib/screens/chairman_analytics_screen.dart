// lib/screens/chairman_analytics_screen.dart
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/analytics_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/app_localizations.dart';


// =============================================================================
//  Аналитика председателя — реальные данные из /api/analytics/chairman
// =============================================================================

class ChairmanAnalyticsScreen extends StatefulWidget {
  const ChairmanAnalyticsScreen({super.key});

  @override
  State<ChairmanAnalyticsScreen> createState() => _ChairmanAnalyticsScreenState();
}

class _ChairmanAnalyticsScreenState extends State<ChairmanAnalyticsScreen> {
  // month | quarter | year
  String _period = 'month';
  ChairmanAnalytics? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await AnalyticsRepository.instance
          .getChairmanAnalytics(period: _period);
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _selectPeriod(String period) {
    if (_period == period) return;
    setState(() => _period = period);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        title: Text(
          AppLocalizations.tr('chairman_analytics'),
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: AppTypography.bold,
          ),
        ),
        backgroundColor: c.card,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          if (!_loading)
            IconButton(
              icon: Icon(LucideIcons.refreshCw, color: c.textSecondary, size: 18),
              onPressed: _load,
              tooltip: AppLocalizations.tr('btn_refresh'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError(c)
                : _buildContent(c),
      ),
    );
  }

  Widget _buildError(AppColors c) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.alertCircle, color: c.danger, size: 40),
            const SizedBox(height: AppDimens.spaceMd),
            Text(
              AppLocalizations.tr('status_error'),
              style: TextStyle(color: c.danger, fontWeight: AppTypography.bold),
            ),
            const SizedBox(height: AppDimens.spaceSm),
            Text(
              _error ?? '',
              style: TextStyle(color: c.textSecondary, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppDimens.spaceLg),
            ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(LucideIcons.refreshCw, size: 16),
              label: Text(AppLocalizations.tr('btn_retry')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(AppColors c) {
    final d = _data;
    if (d == null) return const SizedBox.shrink();

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildPeriodSelector(c),
          const SizedBox(height: AppDimens.spaceLg),
          _buildSectionHeader(c, AppLocalizations.tr('analytics_finance_section')),
          const SizedBox(height: AppDimens.spaceSm),
          _buildFinanceCard(c, d.finance),
          const SizedBox(height: AppDimens.spaceLg),
          _buildSectionHeader(c, AppLocalizations.tr('analytics_requests_section')),
          const SizedBox(height: AppDimens.spaceSm),
          _buildRequestsGrid(c, d.requests),
          const SizedBox(height: AppDimens.spaceLg),
          if (d.requests.byCategory.isNotEmpty) ...[   
            _buildSectionHeader(c, AppLocalizations.tr('analytics_categories_section')),
            const SizedBox(height: AppDimens.spaceSm),
            _buildCategoriesCard(c, d.requests),
            const SizedBox(height: AppDimens.spaceLg),
          ],
          _buildSectionHeader(c, AppLocalizations.tr('analytics_polls_section')),
          const SizedBox(height: AppDimens.spaceSm),
          _buildPollsCard(c, d.polls),
          const SizedBox(height: AppDimens.spaceXl),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Period selector
  // ---------------------------------------------------------------------------

  Widget _buildPeriodSelector(AppColors c) {
    final periods = [
      ('month', AppLocalizations.tr('analytics_period_month')),
      ('quarter', AppLocalizations.tr('analytics_period_quarter')),
      ('year', AppLocalizations.tr('analytics_period_year')),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Row(
        children: periods.map((pair) {
          final isSelected = _period == pair.$1;
          return Expanded(
            child: GestureDetector(
              onTap: () => _selectPeriod(pair.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? c.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                ),
                alignment: Alignment.center,
                child: Text(
                  pair.$2,
                  style: TextStyle(
                    color: isSelected ? Colors.white : c.textSecondary,
                    fontWeight:
                        isSelected ? AppTypography.bold : AppTypography.medium,
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

  // ---------------------------------------------------------------------------
  // Section header
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Finance card
  // ---------------------------------------------------------------------------

  Widget _buildFinanceCard(AppColors c, FinanceStats f) {
    final pct = f.progressPct / 100.0;
    final pctStr = '${f.progressPct}%';

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
          // Заголовок строки + badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                    ),
                    child:
                        const Icon(LucideIcons.wallet, color: Colors.green, size: 20),
                  ),
                  const SizedBox(width: AppDimens.spaceSm),
                  Text(
                    AppLocalizations.tr('analytics_collection_rate'),
                    style: TextStyle(
                      color: c.textSecondary,
                      fontWeight: AppTypography.medium,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  pctStr,
                  style: const TextStyle(
                    color: Colors.green,
                    fontWeight: AppTypography.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppDimens.spaceLg),
          // Сумма оплаченного
          Text(
            '${_fmt(f.totalPaid)} ₸',
            style: TextStyle(
              fontSize: 26,
              fontWeight: AppTypography.bold,
              color: c.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${AppLocalizations.tr('analytics_of_charged')} ${_fmt(f.totalCharged)} ₸',
            style: TextStyle(fontSize: 13, color: c.textSecondary),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          // Прогресс-бар
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 8,
              backgroundColor: c.cardBorder,
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
            ),
          ),
          const SizedBox(height: AppDimens.spaceLg),
          Divider(height: 1, color: c.cardBorder),
          const SizedBox(height: AppDimens.spaceLg),
          // Долг + квартиры с долгом
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(AppLocalizations.tr('analytics_total_debt'),
                      style: TextStyle(fontSize: 12, color: c.textSecondary)),
                  const SizedBox(height: 2),
                  Text(
                    '${_fmt(f.totalDebt)} ₸',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: AppTypography.bold,
                      color: Colors.redAccent,
                    ),
                  ),
                ],
              ),
              if (f.apartmentsTotal > 0)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(AppLocalizations.tr('analytics_apts_with_debt'),
                        style:
                            TextStyle(fontSize: 12, color: c.textSecondary)),
                    const SizedBox(height: 2),
                    Text(
                      '${f.apartmentsWithDebt} ${AppLocalizations.tr('analytics_of')} ${f.apartmentsTotal}',
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

  // ---------------------------------------------------------------------------
  // Requests grid
  // ---------------------------------------------------------------------------

  Widget _buildRequestsGrid(AppColors c, RequestsStats r) {
    final resolvedPct = r.total > 0
        ? '${(r.resolved / r.total * 100).round()}%'
        : '—';

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                c,
                title: AppLocalizations.tr('analytics_total_requests'),
                value: '${r.total}',
                icon: LucideIcons.clipboardList,
                iconColor: c.primary,
              ),
            ),
            const SizedBox(width: AppDimens.spaceMd),
            Expanded(
              child: _buildMetricTile(
                c,
                title: AppLocalizations.tr('analytics_completed'),
                value: '${r.resolved}',
                subtitle: r.total > 0 ? resolvedPct : null,
                subtitleColor: Colors.green,
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
                title: AppLocalizations.tr('analytics_in_progress'),
                value: '${r.inProgress}',
                icon: LucideIcons.clock,
                iconColor: Colors.orange,
              ),
            ),
            const SizedBox(width: AppDimens.spaceMd),
            Expanded(
              child: _buildMetricTile(
                c,
                title: AppLocalizations.tr('analytics_new_requests'),
                value: '${r.received}',
                icon: LucideIcons.alertCircle,
                iconColor: Colors.redAccent,
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
    Color? subtitleColor,
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
              color: iconColor.withValues(alpha: 0.12),
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
                color: subtitleColor ?? Colors.green,
                fontWeight: AppTypography.medium,
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Categories card
  // ---------------------------------------------------------------------------

  Widget _buildCategoriesCard(AppColors c, RequestsStats r) {
    final total = r.total;
    // Сортируем по убыванию кол-ва
    final sorted = requestCategoryOrder
        .where((cat) => r.byCategory.containsKey(cat))
        .map((cat) => MapEntry(cat, r.byCategory[cat]!))
        .toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    if (sorted.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        children: sorted.map((entry) {
          final pct = total > 0 ? entry.value / total : 0.0;
          final label = getRequestCategoryLabel(entry.key);
          return Padding(
            padding: const EdgeInsets.only(bottom: AppDimens.spaceMd),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: AppTypography.medium,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      '${entry.value} (${(pct * 100).round()}%)',
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
                    valueColor: AlwaysStoppedAnimation<Color>(c.primary),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Polls card
  // ---------------------------------------------------------------------------

  Widget _buildPollsCard(AppColors c, PollsStats p) {
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
              color: Colors.indigo.withValues(alpha: 0.12),
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
                  AppLocalizations.tr('analytics_active_polls'),
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: AppTypography.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  p.active == 0
                      ? AppLocalizations.tr('analytics_no_active_polls')
                      : '${p.active} ${AppLocalizations.tr('analytics_polls_count')}',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.indigo.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '${p.active}',
              style: const TextStyle(
                color: Colors.indigo,
                fontWeight: AppTypography.bold,
                fontSize: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Helper: format large numbers
  // ---------------------------------------------------------------------------

  String _fmt(double v) {
    if (v == 0) return '0';
    if (v >= 1000000) {
      return '${(v / 1000000).toStringAsFixed(1)} млн';
    }
    if (v >= 1000) {
      final s = v.round().toString();
      // Группировка по 3 цифры: 1 280 000
      final buf = StringBuffer();
      final r = s.length % 3;
      for (var i = 0; i < s.length; i++) {
        if (i != 0 && (i - r) % 3 == 0) buf.write(' ');
        buf.write(s[i]);
      }
      return buf.toString();
    }
    return v.round().toString();
  }
}