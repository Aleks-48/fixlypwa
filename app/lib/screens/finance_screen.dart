import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/finance_repository.dart';
import 'package:fixly_app/core/payments_repository.dart';

// Начисления/платежи жителя (mobile-app.md §4, срез 22) — read-only + демо-оплата (срез 23,
// ADR-0010, тот же флоу, что PayOnlineButton.tsx на сайте: шторка → выбор способа → сервер
// сам пересчитывает долг, expectedAmount — только для UX-сверки).
class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

String _money(double n) =>
    '₸ ${n.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ' ')}';

class _FinanceScreenState extends State<FinanceScreen> {
  ResidentFinance? _data;
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
      final data = await FinanceRepository.instance.get();
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
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
        title: Text('Финансы', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppDimens.spaceLg),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!, style: TextStyle(color: c.danger), textAlign: TextAlign.center),
                          const SizedBox(height: AppDimens.spaceMd),
                          OutlinedButton(onPressed: _load, child: const Text('Повторить')),
                        ],
                      ),
                    ),
                  )
                : _data?.balances == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceLg),
                          child: Text(
                            'По вашей квартире пока нет лицевого счёта — начисления появятся '
                            'после их формирования председателем.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body),
                          ),
                        ),
                      )
                    : _Content(data: _data!, colors: c, onPaid: _load),
      ),
    );
  }
}

class _Content extends StatelessWidget {
  final ResidentFinance data;
  final AppColors colors;
  final VoidCallback onPaid;
  const _Content({required this.data, required this.colors, required this.onPaid});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    final totalDebt = data.balances!.totalDebt;
    final lastPeriod = data.charges.isNotEmpty ? data.charges.first.period : null;
    final lastCharges =
        lastPeriod == null ? <Charge>[] : data.charges.where((ch) => ch.period == lastPeriod).toList();

    return ListView(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      children: [
        // Карточка долга — заливка primary, как на сайте (Card bg-primary).
        Container(
          padding: const EdgeInsets.all(AppDimens.spaceLg),
          decoration: BoxDecoration(
            color: c.primary,
            borderRadius: BorderRadius.circular(AppDimens.radiusLg),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('К оплате', style: TextStyle(color: Colors.white70, fontSize: AppTypography.body)),
              const SizedBox(height: 4),
              Text(_money(totalDebt),
                  style: const TextStyle(
                      color: Colors.white, fontSize: 34, fontWeight: AppTypography.extraBold)),
              const SizedBox(height: 4),
              Text(
                totalDebt > 0 ? 'Текущая задолженность по квартире' : 'Задолженности нет',
                style: const TextStyle(color: Colors.white70, fontSize: AppTypography.caption),
              ),
              if (totalDebt > 0) ...[
                const SizedBox(height: AppDimens.spaceMd),
                SizedBox(
                  width: double.infinity,
                  height: AppDimens.primaryTapTarget,
                  child: ElevatedButton(
                    onPressed: () => _openPaySheet(context, totalDebt),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                    ),
                    child: Text('Оплатить онлайн',
                        style: TextStyle(color: c.primary, fontWeight: AppTypography.bold)),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppDimens.spaceMd),

        // Начисления последнего периода.
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
              Text(
                lastPeriod != null
                    ? 'Начисления · ${DateFormat('LLLL yyyy', 'ru').format(lastPeriod)}'
                    : 'Начисления',
                style: TextStyle(
                    color: c.textPrimary,
                    fontSize: AppTypography.cardTitle,
                    fontWeight: AppTypography.bold),
              ),
              const SizedBox(height: AppDimens.spaceSm),
              if (lastCharges.isEmpty)
                Text('Начислений пока нет.', style: TextStyle(color: c.textTertiary))
              else ...[
                for (final ch in lastCharges)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(tariffCategoryLabels[ch.tariffCategory] ?? ch.tariffCategory,
                            style: TextStyle(color: c.textSecondary)),
                        Text(_money(ch.amount),
                            style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.semibold)),
                      ],
                    ),
                  ),
                Divider(color: c.divider),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Итого',
                        style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.bold)),
                    Text(
                      _money(lastCharges.fold<double>(0, (s, ch) => s + ch.amount)),
                      style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.extraBold),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppDimens.spaceMd),

        // История платежей.
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
              Text('История платежей',
                  style: TextStyle(
                      color: c.textPrimary,
                      fontSize: AppTypography.cardTitle,
                      fontWeight: AppTypography.bold)),
              const SizedBox(height: AppDimens.spaceSm),
              if (data.payments.isEmpty)
                Text('Платежей пока нет.', style: TextStyle(color: c.textTertiary))
              else
                for (final p in data.payments)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration:
                              BoxDecoration(color: c.success.withOpacity(0.12), shape: BoxShape.circle),
                          child: Icon(LucideIcons.check, size: 16, color: c.success),
                        ),
                        const SizedBox(width: AppDimens.spaceSm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(DateFormat('d MMMM yyyy', 'ru').format(p.paidAt),
                                  style: TextStyle(
                                      color: c.textPrimary, fontWeight: AppTypography.semibold)),
                              Text(p.method ?? 'оплата',
                                  style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                            ],
                          ),
                        ),
                        Text(_money(p.amount),
                            style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.bold)),
                      ],
                    ),
                  ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _openPaySheet(BuildContext context, double amount) async {
    final paid = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.of(context).card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (_) => _PayOnlineSheet(amount: amount),
    );
    if (paid == true) onPaid();
  }
}

// Шторка демо-оплаты (ADR-0010) — по образцу PayOnlineButton.tsx: предупреждение о демо-режиме,
// выбор способа (косметический, не влияет на логику сервера), сумма пересчитывается сервером.
// router.refresh() на сайте ↔ onPaid() здесь — вызывается ТОЛЬКО при успехе (не обнуляем долг
// на экране раньше, чем пользователь увидит галочку).
class _PayOnlineSheet extends StatefulWidget {
  final double amount;
  const _PayOnlineSheet({required this.amount});

  @override
  State<_PayOnlineSheet> createState() => _PayOnlineSheetState();
}

class _PayOnlineSheetState extends State<_PayOnlineSheet> {
  String _method = 'test_card';
  bool _busy = false;
  CheckoutResult? _result;
  String? _error;

  // Данные тестовой карты
  String _cardNumber = "4400 4301 2345 6789";
  String _cardExpiry = "12/28";
  String _cardCvc = "777";

  Future<void> _pay() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Имитация времени процессинга банка
      await Future.delayed(const Duration(milliseconds: 1200));

      final result = await PaymentsRepository.instance
          .checkout(method: _method, expectedAmount: widget.amount);
      if (!mounted) return;
      setState(() {
        _result = result;
        _busy = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _busy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Не удалось выполнить оплату';
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: AppDimens.spaceLg,
        right: AppDimens.spaceLg,
        top: AppDimens.spaceLg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppDimens.spaceLg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_result != null) ...[
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(color: c.success.withOpacity(0.15), shape: BoxShape.circle),
                  child: Icon(LucideIcons.check, color: c.success, size: 26),
                ),
                const SizedBox(width: AppDimens.spaceSm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _result!.alreadyPaid ? 'Задолженности уже нет' : 'Оплата прошла успешно!',
                        style: TextStyle(
                            color: c.textPrimary, fontSize: 18, fontWeight: AppTypography.bold),
                      ),
                      if (!_result!.alreadyPaid && _result!.amount != null)
                        Text(_money(_result!.amount!),
                            style: TextStyle(
                                color: c.success, fontSize: 20, fontWeight: AppTypography.extraBold)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppDimens.spaceMd),
            Container(
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                border: Border.all(color: c.cardBorder),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Чек:', style: TextStyle(color: c.textSecondary, fontSize: 12)),
                      Text(_result!.gatewayRef ?? 'FIX-APP-7721', style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Способ:', style: TextStyle(color: c.textSecondary, fontSize: 12)),
                      Text(_method == 'test_qr' ? 'Kaspi QR' : 'Банковская карта', style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimens.spaceLg),
            SizedBox(
              width: double.infinity,
              height: AppDimens.primaryTapTarget,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: c.success,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                ),
                child: const Text('Закрыть чек', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Оплата онлайн',
                    style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: AppTypography.bold)),
                Text(_money(widget.amount),
                    style: TextStyle(color: c.success, fontSize: 18, fontWeight: AppTypography.extraBold)),
              ],
            ),
            const SizedBox(height: AppDimens.spaceMd),
            Row(
              children: [
                Expanded(
                  child: _MethodButton(
                    label: 'Картой',
                    icon: LucideIcons.creditCard,
                    selected: _method == 'test_card',
                    colors: c,
                    onTap: () => setState(() => _method = 'test_card'),
                  ),
                ),
                const SizedBox(width: AppDimens.spaceSm),
                Expanded(
                  child: _MethodButton(
                    label: 'Kaspi QR',
                    icon: LucideIcons.qrCode,
                    selected: _method == 'test_qr',
                    colors: c,
                    onTap: () => setState(() => _method = 'test_qr'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppDimens.spaceMd),
            if (_method == 'test_card') ...[
              Container(
                padding: const EdgeInsets.all(AppDimens.spaceMd),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('FIXLY PLATINUM', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
                        Text('VISA / MC', style: TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(_cardNumber, style: const TextStyle(color: Colors.white, fontSize: 16, letterSpacing: 2, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('EXP: $_cardExpiry', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        Text('CVC: $_cardCvc', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(AppDimens.spaceMd),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  border: Border.all(color: Colors.red.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                      child: const Icon(LucideIcons.qrCode, size: 64, color: Colors.red),
                    ),
                    const SizedBox(height: 8),
                    const Text('Отсканируйте Kaspi QR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: AppDimens.spaceSm),
              Text(_error!, style: TextStyle(color: c.danger)),
            ],
            const SizedBox(height: AppDimens.spaceLg),
            SizedBox(
              width: double.infinity,
              height: AppDimens.primaryTapTarget,
              child: ElevatedButton(
                onPressed: _busy ? null : _pay,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _method == 'test_qr' ? Colors.red.shade700 : c.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                ),
                child: _busy
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                          SizedBox(width: 10),
                          Text('Проведение оплаты...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ],
                      )
                    : Text('Оплатить ${_money(widget.amount)}',
                        style: const TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MethodButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final AppColors colors;
  final VoidCallback onTap;

  const _MethodButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.colors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? c.primary.withOpacity(0.1) : c.surfaceVariant,
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          border: Border.all(color: selected ? c.primary : c.cardBorder),
        ),
        child: Column(
          children: [
            Icon(icon, color: selected ? c.primary : c.textTertiary, size: 20),
            const SizedBox(height: 4),
            Text(label,
                style: TextStyle(
                    color: selected ? c.primary : c.textSecondary,
                    fontSize: AppTypography.caption,
                    fontWeight: selected ? AppTypography.semibold : AppTypography.regular)),
          ],
        ),
      ),
    );
  }
}
