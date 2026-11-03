import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/core/polls_repository.dart';

// Опросы дома — председатель (срез 23, REQ-143). Список с результатами (без голосования —
// председатель всегда видит проценты, как showResults на сайте) + создание. MVP: берём ПЕРВЫЙ
// дом ОСИ (тот же паттерн, что chairman_announcements_screen.dart из R2 — выбор дома при
// нескольких вне объёма, отмечено в build-plan-3). Deadline в форме не выставляется — как и
// на сайте (PollForm.tsx), хотя API его принимает.
class ChairmanPollsScreen extends StatefulWidget {
  const ChairmanPollsScreen({super.key});

  @override
  State<ChairmanPollsScreen> createState() => _ChairmanPollsScreenState();
}

class _ChairmanPollsScreenState extends State<ChairmanPollsScreen> {
  List<Poll> _polls = [];
  String? _buildingId;
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
      final buildings = await OsiRepository.instance.listBuildings();
      final buildingId = buildings.isNotEmpty ? buildings.first.id : null;
      final polls = buildingId != null
          ? await PollsRepository.instance.list(buildingId: buildingId)
          : <Poll>[];
      if (!mounted) return;
      setState(() {
        _buildingId = buildingId;
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

  Future<void> _openCreate() async {
    if (_buildingId == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Сначала добавьте дом')));
      return;
    }
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.of(context).card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (_) => _CreatePollSheet(buildingId: _buildingId!),
    );
    if (created == true && mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Голосования', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'create_poll_fab',
        onPressed: _openCreate,
        backgroundColor: c.primary,
        child: const Icon(Icons.add, color: Colors.white),
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
                : _polls.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceLg),
                          child: Text('Опросов пока нет — нажмите «+», чтобы создать первый',
                              textAlign: TextAlign.center, style: TextStyle(color: c.textTertiary)),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(
                            AppDimens.spaceMd, AppDimens.spaceMd, AppDimens.spaceMd, 80),
                        children: [
                          for (final poll in _polls)
                            Padding(
                              padding: const EdgeInsets.only(bottom: AppDimens.spaceSm),
                              child: _ResultCard(poll: poll, colors: c),
                            ),
                        ],
                      ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final Poll poll;
  final AppColors colors;
  const _ResultCard({required this.poll, required this.colors});

  @override
  Widget build(BuildContext context) {
    final c = colors;
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
            children: [
              Expanded(
                child: Text(poll.question,
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: AppTypography.cardTitle,
                        fontWeight: AppTypography.bold)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (poll.closed ? c.textTertiary : c.success).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  poll.closed ? 'Завершён' : 'Активен',
                  style: TextStyle(
                      color: poll.closed ? c.textTertiary : c.success,
                      fontSize: 11,
                      fontWeight: AppTypography.semibold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text('Голосов: ${poll.totalVotes}',
              style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
          const SizedBox(height: AppDimens.spaceSm),
          for (final option in poll.options)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _bar(c, option, poll.totalVotes),
            ),
        ],
      ),
    );
  }

  Widget _bar(AppColors c, PollOption option, int totalVotes) {
    final pct = totalVotes == 0 ? 0 : (option.votes / totalVotes * 100).round();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(option.label, style: TextStyle(color: c.textPrimary))),
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
                Container(height: 8, width: constraints.maxWidth * (pct / 100), color: c.primary),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _CreatePollSheet extends StatefulWidget {
  final String buildingId;
  const _CreatePollSheet({required this.buildingId});

  @override
  State<_CreatePollSheet> createState() => _CreatePollSheetState();
}

class _CreatePollSheetState extends State<_CreatePollSheet> {
  final _questionCtrl = TextEditingController();
  final List<TextEditingController> _optionCtrls = [
    TextEditingController(text: 'Да'),
    TextEditingController(text: 'Нет'),
  ];
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _questionCtrl.dispose();
    for (final ctrl in _optionCtrls) {
      ctrl.dispose();
    }
    super.dispose();
  }

  void _addOption() {
    if (_optionCtrls.length >= 6) return;
    setState(() => _optionCtrls.add(TextEditingController()));
  }

  void _removeOption(int index) {
    if (_optionCtrls.length <= 2) return;
    setState(() => _optionCtrls.removeAt(index).dispose());
  }

  Future<void> _submit() async {
    final question = _questionCtrl.text.trim();
    final options = _optionCtrls.map((c) => c.text.trim()).where((s) => s.isNotEmpty).toList();
    if (question.length < 3) {
      setState(() => _error = 'Вопрос — минимум 3 символа');
      return;
    }
    if (options.length < 2) {
      setState(() => _error = 'Нужно минимум 2 варианта ответа');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await PollsRepository.instance.create(
        buildingId: widget.buildingId,
        question: question,
        options: options,
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Не удалось создать опрос');
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Новый опрос',
                style: TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: AppTypography.bold)),
            const SizedBox(height: AppDimens.spaceMd),
            TextField(
              controller: _questionCtrl,
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                hintText: 'Вопрос',
                hintStyle: TextStyle(color: c.textTertiary),
                filled: true,
                fillColor: c.surfaceVariant,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: AppDimens.spaceSm),
            for (var i = 0; i < _optionCtrls.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _optionCtrls[i],
                        style: TextStyle(color: c.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'Вариант ${i + 1}',
                          hintStyle: TextStyle(color: c.textTertiary),
                          filled: true,
                          fillColor: c.surfaceVariant,
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                              borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                    if (_optionCtrls.length > 2)
                      IconButton(
                        onPressed: () => _removeOption(i),
                        icon: Icon(Icons.close, color: c.textTertiary, size: 18),
                      ),
                  ],
                ),
              ),
            if (_optionCtrls.length < 6)
              TextButton.icon(
                onPressed: _addOption,
                icon: Icon(Icons.add, color: c.primary, size: 18),
                label: Text('Вариант', style: TextStyle(color: c.primary)),
                style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft),
              ),
            if (_error != null) ...[
              const SizedBox(height: AppDimens.spaceSm),
              Text(_error!, style: TextStyle(color: c.danger)),
            ],
            const SizedBox(height: AppDimens.spaceMd),
            SizedBox(
              width: double.infinity,
              height: AppDimens.primaryTapTarget,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: c.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 22, height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : const Text('Создать опрос',
                        style: TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
