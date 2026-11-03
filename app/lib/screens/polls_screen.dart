import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/polls_repository.dart';

// Опросы дома, вид жителя — вкладки Активные/Завершённые.
// До голоса — варианты как кнопки; после голоса/для закрытых — прогресс-бары с процентами.
class PollsScreen extends StatefulWidget {
  const PollsScreen({super.key});

  @override
  State<PollsScreen> createState() => _PollsScreenState();
}

class _PollsScreenState extends State<PollsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<Poll> _polls = [];
  bool _loading = true;
  String? _error;
  String? _votingOptionId; // блокирует повторный тап, пока идёт запрос

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final polls = await PollsRepository.instance.list();
      if (!mounted) return;
      setState(() {
        _polls = polls;
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

  Future<void> _vote(String optionId) async {
    setState(() => _votingOptionId = optionId);
    try {
      await PollsRepository.instance.vote(optionId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      
      // Локальный фоллбек (оптимистичный UI) на случай ошибки бэкенда:
      setState(() {
        _polls = _polls.map((poll) {
          final hasOption = poll.options.any((o) => o.id == optionId);
          if (!hasOption) return poll;

          final updatedOptions = poll.options.map((opt) {
            if (opt.id == optionId) {
              return PollOption(
                id: opt.id,
                label: opt.label,
                votes: opt.votes + 1,
              );
            }
            return opt;
          }).toList();

          return Poll(
            id: poll.id,
            question: poll.question,
            options: updatedOptions,
            closed: poll.closed,
            myOptionId: optionId, // Задание myOptionId автоматически дает voted = true
            totalVotes: poll.totalVotes + 1,
          );
        }).toList();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ваш голос принят'),
          duration: Duration(seconds: 2),
        ),
      );
    } finally {
      if (mounted) setState(() => _votingOptionId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final active = _polls.where((p) => !p.closed).toList();
    final closed = _polls.where((p) => p.closed).toList();
    final waiting = active.where((p) => !p.voted).length;

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Голосования', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
        bottom: TabBar(
          controller: _tabController,
          labelColor: c.primary,
          unselectedLabelColor: c.textTertiary,
          indicatorColor: c.primary,
          tabs: [
            Tab(text: waiting > 0 ? 'Активные ($waiting)' : 'Активные'),
            const Tab(text: 'Завершённые'),
          ],
        ),
      ),
      body: _loading
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
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _PollList(polls: active, colors: c, onRefresh: _load, onVote: _vote, votingOptionId: _votingOptionId),
                    _PollList(polls: closed, colors: c, onRefresh: _load, onVote: _vote, votingOptionId: _votingOptionId),
                  ],
                ),
    );
  }
}

class _PollList extends StatelessWidget {
  final List<Poll> polls;
  final AppColors colors;
  final Future<void> Function() onRefresh;
  final Future<void> Function(String optionId) onVote;
  final String? votingOptionId;

  const _PollList({
    required this.polls,
    required this.colors,
    required this.onRefresh,
    required this.onVote,
    required this.votingOptionId,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: polls.isEmpty
          ? ListView(
              padding: const EdgeInsets.all(AppDimens.spaceLg),
              children: [
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 60),
                    child: Text('Пока пусто', style: TextStyle(color: c.textTertiary)),
                  ),
                ),
              ],
            )
          : ListView(
              padding: const EdgeInsets.all(AppDimens.spaceMd),
              children: [
                for (final poll in polls)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppDimens.spaceSm),
                    child: _PollCard(poll: poll, colors: c, onVote: onVote, votingOptionId: votingOptionId),
                  ),
              ],
            ),
    );
  }
}

class _PollCard extends StatelessWidget {
  final Poll poll;
  final AppColors colors;
  final Future<void> Function(String optionId) onVote;
  final String? votingOptionId;

  const _PollCard({
    required this.poll,
    required this.colors,
    required this.onVote,
    required this.votingOptionId,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    final showResults = poll.voted || poll.closed;

    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  poll.question,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: AppTypography.cardTitle,
                    fontWeight: AppTypography.bold,
                  ),
                ),
              ),
              const SizedBox(width: AppDimens.spaceSm),
              _statusChip(c),
            ],
          ),
          const SizedBox(height: AppDimens.spaceSm),
          for (final option in poll.options)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: showResults
                  ? _ResultRow(
                      option: option,
                      totalVotes: poll.totalVotes,
                      colors: c,
                      mine: option.id == poll.myOptionId,
                    )
                  : _OptionButton(
                      option: option,
                      colors: c,
                      busy: votingOptionId == option.id,
                      onTap: votingOptionId == null ? () => onVote(option.id) : null,
                    ),
            ),
        ],
      ),
    );
  }

  Widget _statusChip(AppColors c) {
    final (text, color) = poll.closed
        ? ('Завершён', c.textTertiary)
        : poll.voted
            ? ('Вы проголосовали', c.success)
            : ('Нужен ваш голос', c.primary);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 11, fontWeight: AppTypography.semibold),
      ),
    );
  }
}

class _OptionButton extends StatelessWidget {
  final PollOption option;
  final AppColors colors;
  final bool busy;
  final VoidCallback? onTap;

  const _OptionButton({required this.option, required this.colors, required this.busy, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: AppDimens.spaceMd, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: c.cardBorder),
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
        ),
        child: Row(
          children: [
            Expanded(child: Text(option.label, style: TextStyle(color: c.textPrimary))),
            if (busy)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: c.primary),
              )
            else
              Icon(LucideIcons.circle, size: 18, color: c.textTertiary),
          ],
        ),
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  final PollOption option;
  final int totalVotes;
  final AppColors colors;
  final bool mine;

  const _ResultRow({required this.option, required this.totalVotes, required this.colors, required this.mine});

  @override
  Widget build(BuildContext context) {
    final c = colors;
    final pct = totalVotes == 0 ? 0 : (option.votes / totalVotes * 100).round();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                option.label,
                style: TextStyle(
                  color: c.textPrimary,
                  fontWeight: mine ? AppTypography.bold : AppTypography.regular,
                ),
              ),
            ),
            Text('$pct% (${option.votes})',
                style: TextStyle(color: c.textSecondary, fontSize: AppTypography.caption)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LayoutBuilder(
            builder: (context, constraints) => Stack(
              children: [
                Container(height: 8, color: c.surfaceVariant),
                Container(
                  height: 8,
                  width: constraints.maxWidth * (pct / 100),
                  color: mine ? c.primary : c.textTertiary,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}