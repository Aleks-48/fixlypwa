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

  factory RequestsStats.fromJson(Map<String, dynamic> json) => RequestsStats(
        total: (json['total'] as num?)?.toInt() ?? 0,
        resolved: (json['resolved'] as num?)?.toInt() ?? 0,
        inProgress: (json['inProgress'] as num?)?.toInt() ?? 0,
        received: (json['received'] as num?)?.toInt() ?? 0,
        byCategory: ((json['byCategory'] as Map<String, dynamic>?) ?? {})
            .map((k, v) => MapEntry(k, (v as num).toInt())),
      );
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
        totalCharged: (json['totalCharged'] as num?)?.toDouble() ?? 0,
        totalPaid: (json['totalPaid'] as num?)?.toDouble() ?? 0,
        totalDebt: (json['totalDebt'] as num?)?.toDouble() ?? 0,
        apartmentsWithDebt: (json['apartmentsWithDebt'] as num?)?.toInt() ?? 0,
        apartmentsTotal: (json['apartmentsTotal'] as num?)?.toInt() ?? 0,
        progressPct: (json['progressPct'] as num?)?.toInt() ?? 0,
      );
}

class PollsStats {
  final int active;

  PollsStats({required this.active});

  factory PollsStats.fromJson(Map<String, dynamic> json) =>
      PollsStats(active: (json['active'] as num?)?.toInt() ?? 0);
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

  factory ChairmanAnalytics.fromJson(Map<String, dynamic> json) => ChairmanAnalytics(
        requests: RequestsStats.fromJson(
            (json['requests'] as Map<String, dynamic>?) ?? {}),
        finance: FinanceStats.fromJson(
            (json['finance'] as Map<String, dynamic>?) ?? {}),
        polls: PollsStats.fromJson(
            (json['polls'] as Map<String, dynamic>?) ?? {}),
      );
}

class AnalyticsRepository {
  AnalyticsRepository._();
  static final AnalyticsRepository instance = AnalyticsRepository._();

  final _api = ApiClient.instance;

  // period: 'month' | 'quarter' | 'year'
  Future<ChairmanAnalytics> getChairmanAnalytics({String period = 'month'}) async {
    final data =
        await _api.get('/api/analytics/chairman?period=$period') as Map<String, dynamic>;
    return ChairmanAnalytics.fromJson(data);
  }
}
