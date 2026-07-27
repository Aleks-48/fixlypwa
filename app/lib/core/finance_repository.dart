import 'api_client.dart';

// Начисления/платежи жителя (mobile-app.md §4, срез 22, read-only — демо-оплата ADR-0010
// в срезе 23). ⚠️ Асимметрия JSON, проверена curl'ом против живого сервера: balances.*
// сериализуются как ЧИСЛА (fixlypwa/src/lib/finance/service.ts делает Number(...) явно), а
// charges[].amount/payments[].amount — как СТРОКИ (Prisma Decimal.toJSON()). Парсить по-разному.

class BucketBalance {
  final double charged;
  final double paid;
  final double debt;
  BucketBalance({required this.charged, required this.paid, required this.debt});

  factory BucketBalance.fromJson(Map<String, dynamic> json) => BucketBalance(
        charged: (json['charged'] as num).toDouble(),
        paid: (json['paid'] as num).toDouble(),
        debt: (json['debt'] as num).toDouble(),
      );
}

class ResidentBalances {
  final BucketBalance maintenance;
  final BucketBalance targeted;
  final BucketBalance capitalRepair;
  ResidentBalances({required this.maintenance, required this.targeted, required this.capitalRepair});

  double get totalDebt => maintenance.debt + targeted.debt + capitalRepair.debt;

  factory ResidentBalances.fromJson(Map<String, dynamic> json) => ResidentBalances(
        maintenance: BucketBalance.fromJson(json['MAINTENANCE'] as Map<String, dynamic>),
        targeted: BucketBalance.fromJson(json['TARGETED'] as Map<String, dynamic>),
        capitalRepair: BucketBalance.fromJson(json['CAPITAL_REPAIR'] as Map<String, dynamic>),
      );
}

class Charge {
  final String id;
  final DateTime period;
  final double amount;
  final DateTime dueDate;
  final String status;
  final String tariffCategory;

  Charge({
    required this.id,
    required this.period,
    required this.amount,
    required this.dueDate,
    required this.status,
    required this.tariffCategory,
  });

  factory Charge.fromJson(Map<String, dynamic> json) => Charge(
        id: json['id'] as String,
        period: DateTime.parse(json['period'] as String),
        amount: double.parse(json['amount'] as String),
        dueDate: DateTime.parse(json['dueDate'] as String),
        status: json['status'] as String,
        tariffCategory: (json['tariff'] as Map<String, dynamic>)['category'] as String,
      );
}

class Payment {
  final String id;
  final double amount;
  final DateTime paidAt;
  final String? method;

  Payment({required this.id, required this.amount, required this.paidAt, this.method});

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
        id: json['id'] as String,
        amount: double.parse(json['amount'] as String),
        paidAt: DateTime.parse(json['paidAt'] as String),
        method: json['method'] as String?,
      );
}

const Map<String, String> tariffCategoryLabels = {
  'MAINTENANCE': 'Содержание дома',
  'TARGETED': 'Целевой взнос',
  'CAPITAL_REPAIR': 'Капремонт',
};

class ResidentFinance {
  final ResidentBalances? balances; // null — нет лицевого счёта (начисления ещё не заведены)
  final List<Charge> charges;
  final List<Payment> payments;
  ResidentFinance({this.balances, required this.charges, required this.payments});
}

class FinanceRepository {
  FinanceRepository._();
  static final FinanceRepository instance = FinanceRepository._();

  final _api = ApiClient.instance;

  Future<ResidentFinance> get() async {
    final data = await _api.get('/api/finance/resident') as Map<String, dynamic>;
    final rawBalances = data['balances'] as Map<String, dynamic>?;
    return ResidentFinance(
      balances: rawBalances != null ? ResidentBalances.fromJson(rawBalances) : null,
      charges: (data['charges'] as List).cast<Map<String, dynamic>>().map(Charge.fromJson).toList(),
      payments:
          (data['payments'] as List).cast<Map<String, dynamic>>().map(Payment.fromJson).toList(),
    );
  }
}
