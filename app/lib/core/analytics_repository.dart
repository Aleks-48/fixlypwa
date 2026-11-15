import 'api_client.dart';

// Аналитика председателя — агрегированные данные за выбранный период
// (месяц/квартал/год). Бэкенд: GET /api/analytics/chairman?period=month|quarter|year.

class RequestsStats {
  final int total;
  final int resolved;
  final int inProgress;
  final int received;
  final Map<String, int> byCategory;

  RequestsStats({
    required this.total,
    required this.resolved,
    required this.inProgress,
    required this.received,
    required this.byCategory,
  });

  factory RequestsStats.fromJson(Map<String, dynamic> json) {
    final rawByCategory = ApiJson.asNullableMap(json['byCategory']) ??
        const <String, dynamic>{};
    return RequestsStats(
      total: ApiJson.asInt(json['total'], defaultValue: 0),
      resolved: ApiJson.asInt(json['resolved'], defaultValue: 0),
      inProgress: ApiJson.asInt(json['inProgress'], defaultValue: 0),
      received: ApiJson.asInt(json['received'], defaultValue: 0),
      byCategory: rawByCategory.map((k, v) => MapEntry(k, ApiJson.asInt(v))),
    );
  }
}

class FinanceStats {
  final double totalCharged;
  final double totalPaid;
  final double totalDebt;
  final int apartmentsWithDebt;
  final int apartmentsTotal;
  final int progressPct;

  FinanceStats({
    required this.totalCharged,
    required this.totalPaid,
    required this.totalDebt,
    required this.apartmentsWithDebt,
    required this.apartmentsTotal,
    required this.progressPct,
  });

  factory FinanceStats.fromJson(Map<String, dynamic> json) => FinanceStats(
        totalCharged:
            ApiJson.asNullableDouble(json['totalCharged']) ?? 0,
        totalPaid: ApiJson.asNullableDouble(json['totalPaid']) ?? 0,
        totalDebt: ApiJson.asNullableDouble(json['totalDebt']) ?? 0,
        apartmentsWithDebt:
            ApiJson.asInt(json['apartmentsWithDebt'], defaultValue: 0),
        apartmentsTotal:
            ApiJson.asInt(json['apartmentsTotal'], defaultValue: 0),
        progressPct: ApiJson.asInt(json['progressPct'], defaultValue: 0),
      );
}

class PollsStats {
  final int active;

  PollsStats({required this.active});

  factory PollsStats.fromJson(Map<String, dynamic> json) =>
      PollsStats(active: ApiJson.asInt(json['active'], defaultValue: 0));
}

class ChairmanAnalytics {
  final RequestsStats requests;
  final FinanceStats finance;
  final PollsStats polls;

  ChairmanAnalytics({
    required this.requests,
    required this.finance,
    required this.polls,
  });

  factory ChairmanAnalytics.fromJson(Map<String, dynamic> json) =>
      ChairmanAnalytics(
        requests: RequestsStats.fromJson(ApiJson.asMap(json['requests'])),
        finance: FinanceStats.fromJson(ApiJson.asMap(json['finance'])),
        polls: PollsStats.fromJson(ApiJson.asMap(json['polls'])),
      );
}

class AnalyticsRepository {
  AnalyticsRepository._();
  static final AnalyticsRepository instance = AnalyticsRepository._();

  final _api = ApiClient.instance;

  // period: 'month' | 'quarter' | 'year'
  Future<ChairmanAnalytics> getChairmanAnalytics({String period = 'month'}) async {
    final data = ApiJson.asMap(
      await _api.get(
        '/api/analytics/chairman?period=${Uri.encodeQueryComponent(period)}',
      ),
    );
    return ChairmanAnalytics.fromJson(data);
  }
}
