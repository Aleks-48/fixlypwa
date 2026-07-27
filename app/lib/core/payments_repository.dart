import 'api_client.dart';

// Онлайн-оплата, демо-режим (срез 23, ADR-0010, payments-online.md). ⚠️ Асимметрия JSON:
// в отличие от finance_repository.dart (charges/payments — Decimal→строка), amount в ответе
// checkout — обычное JS-число (сервер суммирует его сам, не через Prisma Decimal.toJSON()).
// Сервер пересчитывает долг САМ — expectedAmount только для UX-сверки, не для списания.

class CheckoutResult {
  final bool success;
  final bool alreadyPaid;
  final String? gatewayRef;
  final double? amount;

  CheckoutResult({
    required this.success,
    required this.alreadyPaid,
    this.gatewayRef,
    this.amount,
  });

  factory CheckoutResult.fromJson(Map<String, dynamic> json) => CheckoutResult(
        success: json['success'] as bool,
        alreadyPaid: json['alreadyPaid'] as bool? ?? false,
        gatewayRef: json['gatewayRef'] as String?,
        amount: (json['amount'] as num?)?.toDouble(),
      );
}

class PaymentsRepository {
  PaymentsRepository._();
  static final PaymentsRepository instance = PaymentsRepository._();

  final _api = ApiClient.instance;

  // method: 'test_card' | 'test_qr' — чисто косметический выбор, не влияет на логику сервера.
  // Ошибки (нет счёта/сумма изменилась/имитация отказа 5%) приходят как ApiException — тот же
  // текст, что показывает сайт, отдельно парсить не нужно.
  Future<CheckoutResult> checkout({required String method, double? expectedAmount}) async {
    final data = await _api.post('/api/payments/checkout', body: {
      'method': method,
      if (expectedAmount != null) 'expectedAmount': expectedAmount,
    }) as Map<String, dynamic>;
    return CheckoutResult.fromJson(data);
  }
}
