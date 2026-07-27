import 'api_client.dart';

// Опросы дома, lite-версия (срез 23, features.md §C). Контракт сверен с web/src/lib/polls/
// service.ts: POST /api/polls и POST /api/polls/vote возвращают ОБРЕЗАННЫЕ объекты
// ({poll:{id,question}} / {voted:true}) — актуальные счётчики только через повторный list().

class PollOption {
  final String id;
  final String label;
  final int votes;

  PollOption({required this.id, required this.label, required this.votes});

  factory PollOption.fromJson(Map<String, dynamic> json) => PollOption(
        id: json['id'] as String,
        label: json['label'] as String,
        votes: json['votes'] as int,
      );
}

class Poll {
  final String id;
  final String question;
  final DateTime? deadline;
  final bool closed;
  final int totalVotes;
  final String? myOptionId;
  final List<PollOption> options;

  Poll({
    required this.id,
    required this.question,
    this.deadline,
    required this.closed,
    required this.totalVotes,
    this.myOptionId,
    required this.options,
  });

  bool get voted => myOptionId != null;

  factory Poll.fromJson(Map<String, dynamic> json) => Poll(
        id: json['id'] as String,
        question: json['question'] as String,
        deadline: json['deadline'] != null ? DateTime.parse(json['deadline'] as String) : null,
        closed: json['closed'] as bool,
        totalVotes: json['totalVotes'] as int,
        myOptionId: json['myOptionId'] as String?,
        options: ((json['options'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(PollOption.fromJson)
            .toList(),
      );
}

class PollsRepository {
  PollsRepository._();
  static final PollsRepository instance = PollsRepository._();

  final _api = ApiClient.instance;

  // buildingId обязателен для председателя (у него нет Occupant, сервер не сможет вывести
  // дом сам); житель может не передавать — сервер найдёт дом через его квартиру.
  Future<List<Poll>> list({String? buildingId}) async {
    final path = buildingId != null ? '/api/polls?buildingId=$buildingId' : '/api/polls';
    final data = await _api.get(path) as Map<String, dynamic>;
    return ((data['polls'] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(Poll.fromJson)
        .toList();
  }

  // 1 голос на пользователя на ОПРОС (не на вариант) — повторный вызов переголосует.
  Future<void> vote(String optionId) async {
    await _api.post('/api/polls/vote', body: {'optionId': optionId});
  }

  Future<void> create({
    required String buildingId,
    required String question,
    required List<String> options,
    DateTime? deadline,
  }) async {
    await _api.post('/api/polls', body: {
      'buildingId': buildingId,
      'question': question,
      'options': options,
      if (deadline != null) 'deadline': deadline.toIso8601String(),
    });
  }
}
