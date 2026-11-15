import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/mobile_exports.dart';
import '../core/api_client.dart';

class PdfReceiptsScreen extends StatefulWidget {
  const PdfReceiptsScreen({super.key});
  @override
  State<PdfReceiptsScreen> createState() => _PdfReceiptsScreenState();
}

class _PdfReceiptsScreenState extends State<PdfReceiptsScreen> {
  Future<Map<String, dynamic>> _load() async {
    final res = await ApiClient.instance.get('/api/payments/receipt', field: 'receipt');
    if (res is! Map<String, dynamic>) {
      throw ApiException('BAD_RESPONSE', 'Некорректные данные квитанции', 500);
    }
    return res;
  }

  late Future<Map<String, dynamic>> receipt = _load();
  bool exporting = false;

  List<String> lines(Map<String, dynamic> r) {
    final osi = r['osi'] is Map<String, dynamic>
        ? r['osi'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final building = r['building'] is Map<String, dynamic>
        ? r['building'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final apartment = r['apartment'] is Map<String, dynamic>
        ? r['apartment'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final currency = NumberFormat.currency(locale: 'ru', symbol: '₸');
    String amount(dynamic value) {
      final n = value is num ? value : (num.tryParse(value?.toString() ?? '') ?? 0);
      return currency.format(n);
    }
    final charges = (r['charges'] as List? ?? const []).whereType<Map<String, dynamic>>();
    final balances = (r['balances'] as List? ?? const []).whereType<Map<String, dynamic>>();
    return [
      'Квитанция за ${r['period'] ?? '—'}',
      '${osi['name'] ?? '—'}',
      '${building['address'] ?? '—'}, кв. ${apartment['number'] ?? '—'}',
      'Лицевой счёт ${apartment['accountNumber'] ?? '—'}',
      '${apartment['residentName'] ?? '—'}',
      if (osi['bin'] != null) 'БИН: ${osi['bin']}',
      if (osi['ibanCurrent'] != null) 'Текущий счёт: ${osi['ibanCurrent']}',
      if (osi['ibanSavings'] != null) 'Сберегательный счёт: ${osi['ibanSavings']}',
      'Входящее сальдо: ${amount(r['previousBalance'])}',
      for (final item in charges) '${item['title'] ?? 'Начисление'}: ${amount(item['amount'])}',
      'Начислено: ${amount(r['totalCharged'])}',
      'Оплачено за период: ${amount(r['paidInPeriod'])}',
      for (final item in balances)
        '${item['title'] ?? 'Баланс'}: долг ${amount(item['debt'])}, переплата ${amount(item['credit'])}',
      'К оплате: ${amount(r['totalDue'])}',
    ];
  }

  Future<void> export(List<String> rows) async {
    if (exporting) return;
    setState(() => exporting = true);
    try {
      await openPdf(rows, 'receipt');
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Не удалось открыть PDF')));
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Квитанция')),
    body: FutureBuilder<Map<String, dynamic>>(future: receipt, builder: (context, state) {
      if (state.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
      if (!state.hasData) {
        final error = state.error;
        return Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  error is ApiException && error.statusCode == 404
                      ? 'Для вашего лицевого счёта пока нет квитанции'
                      : 'Не удалось загрузить квитанцию',
                  textAlign: TextAlign.center,
                ),
                TextButton(onPressed: () => setState(() { receipt = _load(); }), child: const Text('Обновить')),
              ],
            ),
          ),
        );
      }
      final rows = lines(state.requireData);
      return ListView(padding: const EdgeInsets.all(20), children: [
        for (final row in rows) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(row)),
        FilledButton(onPressed: exporting ? null : () => export(rows), child: const Text('Открыть PDF')),
      ]);
    }),
  );
}
