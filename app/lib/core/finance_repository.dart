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
        charged: ApiJson.asDouble(json['charged']),
        paid: ApiJson.asDouble(json['paid']),
        debt: ApiJson.asDouble(json['debt']),
      );
}

class ResidentBalances {
  final BucketBalance maintenance;
  final BucketBalance targeted;
  final BucketBalance capitalRepair;
  ResidentBalances({required this.maintenance, required this.targeted, required this.capitalRepair});

  double get totalDebt => maintenance.debt + targeted.debt + capitalRepair.debt;

  factory ResidentBalances.fromJson(Map<String, dynamic> json) => ResidentBalances(
        maintenance: BucketBalance.fromJson(ApiJson.asMap(json['MAINTENANCE'])),
        targeted: BucketBalance.fromJson(ApiJson.asMap(json['TARGETED'])),
        capitalRepair: BucketBalance.fromJson(ApiJson.asMap(json['CAPITAL_REPAIR'])),
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

  factory Charge.fromJson(Map<String, dynamic> json) {
    final tariff = ApiJson.asMap(json['tariff']);
    return Charge(
      id: ApiJson.asNonEmptyString(json['id']),
      period: ApiJson.asDateTime(json['period']),
      amount: ApiJson.asDouble(json['amount'], allowString: true),
      dueDate: ApiJson.asDateTime(json['dueDate']),
      status: ApiJson.asString(json['status']),
      tariffCategory: ApiJson.asString(tariff['category']),
    );
  }
}

class Payment {
  final String id;
  final double amount;
  final DateTime paidAt;
  final String? method;

  Payment({required this.id, required this.amount, required this.paidAt, this.method});

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
        id: ApiJson.asNonEmptyString(json['id']),
        amount: ApiJson.asDouble(json['amount'], allowString: true),
        paidAt: ApiJson.asDateTime(json['paidAt']),
        method: ApiJson.asNullableString(json['method']),
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
    final data = ApiJson.asMap(await _api.get('/api/finance/resident'));
    final rawBalances = ApiJson.asNullableMap(data['balances']);
    return ResidentFinance(
      balances: rawBalances != null ? ResidentBalances.fromJson(rawBalances) : null,
      charges: ApiJson.asMapList(data['charges']).map(Charge.fromJson).toList(),
      payments: ApiJson.asMapList(data['payments']).map(Payment.fromJson).toList(),
    );
  }
}
