import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

class LegallyBindingPoll {
  final String id;
  final String title;
  final String description;
  final double quorumTarget;
  final double currentQuorum;
  final String deadline;
  final List<String> options;
  int? selectedOptionIndex;
  bool isSigned;

  LegallyBindingPoll({
    required this.id,
    required this.title,
    required this.description,
    required this.quorumTarget,
    required this.currentQuorum,
    required this.deadline,
    required this.options,
    this.selectedOptionIndex,
    this.isSigned = false,
  });
}

class VotingScreen extends StatefulWidget {
  const VotingScreen({super.key});

  @override
  State<VotingScreen> createState() => _VotingScreenState();
}

class _VotingScreenState extends State<VotingScreen> {
  final List<LegallyBindingPoll> _polls = [
    LegallyBindingPoll(
      id: '1',
      title: 'Утверждение сметы доходов и расходов на 2026–2027 гг.',
      description: 'Голосование по утверждению годового финансового плана, размеру взносов на управление и капремонт.',
      quorumTarget: 51.0,
      currentQuorum: 58.4,
      deadline: '10 августа 2026',
      options: [
        'За утверждение сметы',
        'Против',
        'Воздерживаюсь',
      ],
    ),
    LegallyBindingPoll(
      id: '2',
      title: 'Выбор подрядной организации для ремонта фасада',
      description: 'Выбор между ТОО «СтройСервис» и ТОО «КазФасад» по итогам тендера.',
      quorumTarget: 67.0,
      currentQuorum: 42.1,
      deadline: '15 августа 2026',
      options: [
        'ТОО «СтройСервис»',
        'ТОО «КазФасад»',
        'Против всех вариантов',
      ],
    ),
  ];

  void _showEdsSigningSheet(LegallyBindingPoll poll) {
    if (poll.selectedOptionIndex == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Пожалуйста, выберите вариант ответа')),
      );
      return;
    }

    final c = AppColors.of(context);
    final smsController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: AppDimens.spaceLg,
            right: AppDimens.spaceLg,
            top: AppDimens.spaceLg,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppDimens.spaceLg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(LucideIcons.shieldCheck, color: c.success, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Подписание ЭЦП',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 18,
                      fontWeight: AppTypography.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppDimens.spaceSm),
              Text(
                'Ваш голос будет заверен цифровой подписью (ЭЦП/SMS-код) и зафиксирован в протоколе решения собственников.',
                style: TextStyle(color: c.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: AppDimens.spaceMd),
              Container(
                padding: const EdgeInsets.all(AppDimens.spaceSm),
                decoration: BoxDecoration(
                  color: c.surfaceVariant,
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                ),
                child: Row(
                  children: [
                    Icon(LucideIcons.fileCheck, color: c.primary, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Выбран ответ: "${poll.options[poll.selectedOptionIndex!]}"',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontWeight: AppTypography.semibold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppDimens.spaceMd),
              TextField(
                controller: smsController,
                keyboardType: TextInputType.number,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Код подтверждения из SMS / ЭЦП',
                  labelStyle: TextStyle(color: c.textTertiary),
                  prefixIcon: Icon(LucideIcons.lock, color: c.primary, size: 18),
                  filled: true,
                  fillColor: c.surfaceVariant,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: AppDimens.spaceLg),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    setState(() {
                      poll.isSigned = true;
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Голос успешно подписан ЭЦП и зарегистрирован!')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: c.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    ),
                  ),
                  child: const Text(
                    'Подписать и отправить',
                    style: TextStyle(color: Colors.white, fontWeight: AppTypography.bold),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Юридические голосования', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        itemCount: _polls.length,
        itemBuilder: (context, index) {
          final poll = _polls[index];
          final isQuorumReached = poll.currentQuorum >= poll.quorumTarget;

          return Container(
            margin: const EdgeInsets.only(bottom: AppDimens.spaceLg),
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: c.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.shieldCheck, color: c.primary, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            'Закон НПА § 42',
                            style: TextStyle(
                              color: c.primary,
                              fontSize: 11,
                              fontWeight: AppTypography.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        Icon(LucideIcons.clock, color: c.textTertiary, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          'До ${poll.deadline}',
                          style: TextStyle(color: c.textTertiary, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: AppDimens.spaceSm),

                Text(
                  poll.title,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 16,
                    fontWeight: AppTypography.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  poll.description,
                  style: TextStyle(color: c.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: AppDimens.spaceMd),

                // Индикатор кворума
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: c.surfaceVariant,
                    borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(LucideIcons.users, color: c.textSecondary, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                'Кворум (порог ${poll.quorumTarget.toStringAsFixed(0)}%)',
                                style: TextStyle(color: c.textSecondary, fontSize: 12),
                              ),
                            ],
                          ),
                          Text(
                            '${poll.currentQuorum.toStringAsFixed(1)}%',
                            style: TextStyle(
                              color: isQuorumReached ? c.success : c.warning,
                              fontWeight: AppTypography.bold,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: (poll.currentQuorum / 100).clamp(0.0, 1.0),
                          backgroundColor: c.cardBorder,
                          color: isQuorumReached ? c.success : c.warning,
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppDimens.spaceMd),

                // Варианты ответов
                Column(
                  children: List.generate(poll.options.length, (optIndex) {
                    final isSelected = poll.selectedOptionIndex == optIndex;
                    return InkWell(
                      onTap: poll.isSigned
                          ? null
                          : () {
                              setState(() {
                                poll.selectedOptionIndex = optIndex;
                              });
                            },
                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? c.primary.withOpacity(0.08) : c.card,
                          borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                          border: Border.all(
                            color: isSelected ? c.primary : c.cardBorder,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Radio<int>(
                              value: optIndex,
                              groupValue: poll.selectedOptionIndex,
                              activeColor: c.primary,
                              onChanged: poll.isSigned
                                  ? null
                                  : (val) {
                                      setState(() {
                                        poll.selectedOptionIndex = val;
                                      });
                                    },
                            ),
                            Expanded(
                              child: Text(
                                poll.options[optIndex],
                                style: TextStyle(
                                  color: c.textPrimary,
                                  fontWeight: isSelected ? AppTypography.semibold : AppTypography.regular,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),

                const SizedBox(height: AppDimens.spaceSm),

                // Кнопка подписания ЭЦП
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: poll.isSigned
                      ? Container(
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: c.success.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                            border: Border.all(color: c.success.withOpacity(0.3)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.check, color: c.success, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Голос заверен ЭЦП',
                                style: TextStyle(
                                  color: c.success,
                                  fontWeight: AppTypography.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ElevatedButton.icon(
                          onPressed: () => _showEdsSigningSheet(poll),
                          icon: const Icon(LucideIcons.fileCheck, color: Colors.white, size: 18),
                          label: const Text(
                            'Проголосовать и подписать ЭЦП',
                            style: TextStyle(color: Colors.white, fontWeight: AppTypography.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: c.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                            ),
                          ),
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}