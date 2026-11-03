import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

// ─── Models ──────────────────────────────────────────────────────────────────

class _Plan {
  final String id;
  final String nameKey;
  final IconData icon;
  final int price;
  final int? refPrice;
  final bool hasRef;
  final Color Function(AppColors) color;
  final Color Function(AppColors) bgColor;
  final List<String> featuresKeys;
  final String? badgeKey;
  final String noteKey;

  const _Plan({
    required this.id,
    required this.nameKey,
    required this.icon,
    required this.price,
    this.refPrice,
    this.hasRef = false,
    required this.color,
    required this.bgColor,
    required this.featuresKeys,
    this.badgeKey,
    required this.noteKey,
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

class PricingScreen extends StatefulWidget {
  const PricingScreen({super.key});

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen>
    with TickerProviderStateMixin {
  int _apartments = 50;
  int _months = 1;
  bool _useRef = false;

  // Реальные данные из БД
  bool _loadingApts = true;
  bool _aptVerified = false; // true = загружено из БД, счётчик заблокирован
  String? _verifiedBuildingAddress;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  final List<_Plan> _plans = [
    _Plan(
      id: 'standard',
      nameKey: 'pricing_plan_standard',
      icon: LucideIcons.star,
      price: 120,
      refPrice: 50,
      hasRef: true,
      color: (c) => c.primary,
      bgColor: (c) => c.primary.withValues(alpha: 0.08),
      featuresKeys: [
        'pricing_feat_announcements',
        'pricing_feat_requests',
        'pricing_feat_polls',
        'pricing_feat_finance',
        'pricing_feat_3months',
      ],
      noteKey: 'pricing_note_standard',
    ),
    _Plan(
      id: 'vip',
      nameKey: 'pricing_plan_vip',
      icon: LucideIcons.zap,
      price: 140,
      hasRef: false,
      color: (c) => const Color(0xFFD97706),
      bgColor: (c) => const Color(0xFFD97706).withValues(alpha: 0.08),
      featuresKeys: [
        'pricing_feat_all_standard',
        'pricing_feat_support',
        'pricing_feat_ai',
        'pricing_feat_analytics',
        'pricing_feat_reports',
      ],
      badgeKey: 'pricing_badge_popular',
      noteKey: 'pricing_note_contract',
    ),
    _Plan(
      id: 'max',
      nameKey: 'pricing_plan_max',
      icon: LucideIcons.crown,
      price: 160,
      hasRef: false,
      color: (c) => const Color(0xFF7C3AED),
      bgColor: (c) => const Color(0xFF7C3AED).withValues(alpha: 0.08),
      featuresKeys: [
        'pricing_feat_all_vip',
        'pricing_feat_manager',
        'pricing_feat_api',
        'pricing_feat_brand',
        'pricing_feat_sla',
      ],
      badgeKey: 'pricing_badge_all',
      noteKey: 'pricing_note_contract',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
    _loadRealApartmentCount();
  }

  /// Загружает реальное количество квартир из БД.
  /// Председатель не сможет занизить цифру — поле блокируется.
  Future<void> _loadRealApartmentCount() async {
    try {
      final buildings = await OsiRepository.instance.listBuildings();
      if (buildings.isEmpty || !mounted) {
        setState(() => _loadingApts = false);
        return;
      }
      // Считаем сумму квартир по всем домам председателя
      int totalApts = 0;
      String? firstAddress = buildings.first.address;
      for (final b in buildings) {
        final apts = await OsiRepository.instance.listApartments(b.id);
        totalApts += apts.length;
      }
      if (!mounted) return;
      setState(() {
        _apartments = totalApts > 0 ? totalApts : 1;
        _aptVerified = totalApts > 0;
        _verifiedBuildingAddress = buildings.length == 1 ? firstAddress : null;
        _loadingApts = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingApts = false);
    }
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  int _total(int price, bool hasRef) {
    final effectivePrice = (hasRef && _useRef) ? 50 : price;
    return effectivePrice * _apartments * _months;
  }

  String _fmt(int amount) =>
      '${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} ₸';

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        leading: IconButton(
          icon: Icon(LucideIcons.arrowLeft, color: c.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          AppLocalizations.tr('pricing_title'),
          style: TextStyle(
            color: c.textPrimary,
            fontSize: AppTypography.screenTitle,
            fontWeight: AppTypography.bold,
          ),
        ),
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: ListView(
          padding: const EdgeInsets.all(AppDimens.spaceMd),
          children: [
            // Subtitle
            Text(
              AppLocalizations.tr('pricing_subtitle'),
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: AppDimens.spaceLg),

            // Calculator card
            _buildCalculator(c),
            const SizedBox(height: AppDimens.spaceLg),

            // Plan cards
            ..._plans.map((plan) => _buildPlanCard(c, plan)),

            const SizedBox(height: AppDimens.spaceLg),

            // Услуга «Внесение данных»
            _buildDataEntryService(c),
            const SizedBox(height: AppDimens.spaceLg),

            // CTA
            _buildCTA(c),
            const SizedBox(height: AppDimens.spaceMd),
          ],
        ),
      ),
    );
  }

  // ─── Calculator ─────────────────────────────────────────────────────────────

  Widget _buildCalculator(AppColors c) {
    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceMd),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(LucideIcons.calculator, size: 18, color: c.primary),
              const SizedBox(width: 8),
              Text(
                AppLocalizations.tr('pricing_calculator'),
                style: TextStyle(
                  color: c.textPrimary,
                  fontWeight: AppTypography.semibold,
                  fontSize: 15,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppDimens.spaceMd),

          // Apartments counter
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          AppLocalizations.tr('pricing_apartments_count'),
                          style: TextStyle(color: c.textSecondary, fontSize: 12),
                        ),
                        if (_aptVerified) ...[  
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: c.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.shieldCheck, size: 10, color: c.success),
                                const SizedBox(width: 3),
                                Text(
                                  AppLocalizations.tr('pricing_verified'),
                                  style: TextStyle(
                                    color: c.success,
                                    fontSize: 10,
                                    fontWeight: AppTypography.semibold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (_verifiedBuildingAddress != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          _verifiedBuildingAddress!,
                          maxLines: 1,
                          style: TextStyle(color: c.textSecondary, fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              // Кнопка «минус» — заблокирована если данные из БД
              _counterBtn(
                c,
                LucideIcons.minus,
                (_aptVerified || _loadingApts)
                    ? null
                    : () { if (_apartments > 1) setState(() => _apartments--); },
                locked: _aptVerified,
              ),
              Expanded(
                child: Center(
                  child: _loadingApts
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: c.primary,
                          ),
                        )
                      : Column(
                          children: [
                            Text(
                              '$_apartments',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: AppTypography.bold,
                                color: _aptVerified ? c.success : c.textPrimary,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              // Кнопка «плюс» — заблокирована если данные из БД
              _counterBtn(
                c,
                LucideIcons.plus,
                (_aptVerified || _loadingApts)
                    ? null
                    : () { setState(() => _apartments++); },
                locked: _aptVerified,
              ),
            ],
          ),

          // Подсказка если данные верифицированы
          if (_aptVerified)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  Icon(LucideIcons.info, size: 12, color: c.textSecondary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      AppLocalizations.tr('pricing_verified_hint'),
                      style: TextStyle(color: c.textSecondary, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),

          // Кнопка генерации счета на оплату
          const SizedBox(height: AppDimens.spaceMd),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final url = '${ApiClient.instance.baseUrl}/api/pricing/invoice?plan=standard&apartments=$_apartments&months=$_months&useRef=$_useRef';
                final uri = Uri.parse(url);
                if (await canLaunchUrl(uri)) {
                  launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              icon: Icon(LucideIcons.fileText, size: 16, color: c.primary),
              label: Text(
                'Сформировать счет на оплату (PDF)',
                style: TextStyle(color: c.primary, fontSize: 13, fontWeight: AppTypography.semibold),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: c.primary),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),

          const SizedBox(height: AppDimens.spaceMd),

          // Months
          Text(
            AppLocalizations.tr('pricing_months'),
            style: TextStyle(color: c.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Row(
            children: [1, 2, 3].map((m) {
              final selected = _months == m;
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _months = m),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: EdgeInsets.only(right: m < 3 ? 8 : 0),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: selected ? c.primary : c.surface,
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                      border: Border.all(
                        color: selected ? c.primary : c.cardBorder,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        '$m мес.',
                        style: TextStyle(
                          color: selected ? Colors.white : c.textPrimary,
                          fontWeight: AppTypography.semibold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: AppDimens.spaceMd),

          // Referral toggle
          GestureDetector(
            onTap: () => setState(() => _useRef = !_useRef),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 44,
                  height: 24,
                  decoration: BoxDecoration(
                    color: _useRef ? c.primary : c.cardBorder,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 200),
                    alignment: _useRef ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      width: 20,
                      height: 20,
                      margin: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: TextStyle(color: c.textPrimary, fontSize: 13),
                      children: [
                        TextSpan(text: AppLocalizations.tr('pricing_ref_toggle')),
                        TextSpan(
                          text: ' (Стандарт: 50 ₸/кв)',
                          style: TextStyle(color: c.primary, fontWeight: AppTypography.semibold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppDimens.spaceMd),

          // Results row
          Row(
            children: _plans.map((p) {
              final planColor = p.color(AppColors.of(context));
              final planBg = p.bgColor(AppColors.of(context));
              return Expanded(
                child: Container(
                  margin: EdgeInsets.only(right: p.id != 'max' ? 6 : 0),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                  decoration: BoxDecoration(
                    color: planBg,
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    border: Border.all(color: planColor.withValues(alpha: 0.25)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppLocalizations.tr(p.nameKey),
                        style: TextStyle(
                          color: planColor,
                          fontSize: 10,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _fmt(_total(p.price, p.hasRef)),
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 13,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _counterBtn(AppColors c, IconData icon, VoidCallback? onTap, {bool locked = false}) {
    final disabled = onTap == null;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: locked ? c.success.withValues(alpha: 0.06) : (disabled ? c.surface.withValues(alpha: 0.5) : c.surface),
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          border: Border.all(
            color: locked ? c.success.withValues(alpha: 0.3) : (disabled ? c.cardBorder.withValues(alpha: 0.5) : c.cardBorder),
          ),
        ),
        child: Icon(
          locked ? LucideIcons.lock : icon,
          size: 14,
          color: locked ? c.success.withValues(alpha: 0.5) : (disabled ? c.textTertiary : c.primary),
        ),
      ),
    );
  }

  // ─── Plan Card ───────────────────────────────────────────────────────────────

  Widget _buildPlanCard(AppColors c, _Plan plan) {
    final planColor = plan.color(c);
    final planBg = plan.bgColor(c);

    return Container(
      margin: const EdgeInsets.only(bottom: AppDimens.spaceMd),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: planColor.withValues(alpha: 0.3)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Badge
          if (plan.badgeKey != null)
            Positioned(
              top: -12,
              left: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: planBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: planColor.withValues(alpha: 0.4)),
                ),
                child: Text(
                  AppLocalizations.tr(plan.badgeKey!),
                  style: TextStyle(
                    color: planColor,
                    fontSize: 11,
                    fontWeight: AppTypography.bold,
                  ),
                ),
              ),
            ),

          Padding(
            padding: EdgeInsets.fromLTRB(
              AppDimens.spaceMd,
              plan.badgeKey != null ? AppDimens.spaceLg : AppDimens.spaceMd,
              AppDimens.spaceMd,
              AppDimens.spaceMd,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: planBg,
                        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                      ),
                      child: Icon(plan.icon, size: 20, color: planColor),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppLocalizations.tr(plan.nameKey),
                            style: TextStyle(
                              color: c.textPrimary,
                              fontWeight: AppTypography.bold,
                              fontSize: AppTypography.sectionTitle,
                            ),
                          ),
                          Text(
                            AppLocalizations.tr(plan.noteKey),
                            style: TextStyle(color: c.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '${plan.price}',
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 24,
                                fontWeight: AppTypography.bold,
                              ),
                            ),
                            Text(
                              ' ₸',
                              style: TextStyle(
                                color: c.textSecondary,
                                fontSize: 14,
                                fontWeight: AppTypography.semibold,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          AppLocalizations.tr('pricing_per_apt'),
                          style: TextStyle(color: c.textSecondary, fontSize: 11),
                        ),
                        if (plan.hasRef)
                          Text(
                            '${AppLocalizations.tr("pricing_ref_label")}: 50 ₸',
                            style: TextStyle(
                              color: planColor,
                              fontSize: 11,
                              fontWeight: AppTypography.semibold,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: AppDimens.spaceMd),
                Divider(height: 1, color: c.cardBorder),
                const SizedBox(height: AppDimens.spaceSm),

                // Features
                ...plan.featuresKeys.map((key) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        children: [
                          Icon(LucideIcons.check, size: 14, color: planColor),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              AppLocalizations.tr(key),
                              style: TextStyle(color: c.textPrimary, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    )),

                // Referral info
                if (plan.hasRef) ...[
                  const SizedBox(height: AppDimens.spaceSm),
                  Container(
                    padding: const EdgeInsets.all(AppDimens.spaceSm),
                    decoration: BoxDecoration(
                      color: c.primary.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                      border: Border.all(color: c.primary.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '🎁 ${AppLocalizations.tr("pricing_ref_promo_title")}',
                          style: TextStyle(
                            color: c.primary,
                            fontWeight: AppTypography.semibold,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          AppLocalizations.tr('pricing_ref_promo_desc'),
                          style: TextStyle(color: c.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── CTA ─────────────────────────────────────────────────────────────────────

  // ─── Услуга «Внесение данных» ────────────────────────────────────────────────

  Widget _buildDataEntryService(AppColors c) {
    const serviceColor = Color(0xFF0D9488); // teal-600

    return Container(
      decoration: BoxDecoration(
        color: serviceColor.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: serviceColor.withValues(alpha: 0.3)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: serviceColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  ),
                  child: const Icon(LucideIcons.database, size: 18, color: serviceColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            AppLocalizations.tr('pricing_service_title'),
                            style: TextStyle(
                              color: c.textPrimary,
                              fontWeight: AppTypography.bold,
                              fontSize: AppTypography.sectionTitle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: serviceColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: serviceColor.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              AppLocalizations.tr('pricing_service_badge'),
                              style: const TextStyle(
                                color: serviceColor,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        AppLocalizations.tr('pricing_service_note'),
                        style: TextStyle(color: c.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppDimens.spaceSm),
            Text(
              AppLocalizations.tr('pricing_service_desc'),
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: AppDimens.spaceSm),

            // Чеклист входящего
            ...[
              'pricing_service_feat1',
              'pricing_service_feat2',
              'pricing_service_feat3',
              'pricing_service_feat4',
            ].map((key) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  const Icon(LucideIcons.check, size: 13, color: serviceColor),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      AppLocalizations.tr(key),
                      style: TextStyle(color: c.textPrimary, fontSize: 13),
                    ),
                  ),
                ],
              ),
            )),

            const SizedBox(height: AppDimens.spaceMd),
            Divider(height: 1, color: serviceColor.withValues(alpha: 0.2)),
            const SizedBox(height: AppDimens.spaceMd),

            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: AppLocalizations.tr('pricing_service_from'),
                              style: TextStyle(color: c.textSecondary, fontSize: 12),
                            ),
                            TextSpan(
                              text: ' 2 500 ₸',
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 22,
                                fontWeight: AppTypography.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        AppLocalizations.tr('pricing_service_price_note'),
                        style: TextStyle(color: c.textSecondary, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final uri = Uri.parse('https://t.me/fixlyosibot?start=data_entry');
                    if (await canLaunchUrl(uri)) {
                      launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: serviceColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  child: Text(
                    AppLocalizations.tr('pricing_service_btn'),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCTA(AppColors c) {
    return Container(
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(AppDimens.radiusLg),
        border: Border.all(color: c.cardBorder),
      ),
      child: Column(
        children: [
          Text(
            AppLocalizations.tr('pricing_cta_title'),
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: AppTypography.bold,
              fontSize: AppTypography.sectionTitle,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            AppLocalizations.tr('pricing_cta_subtitle'),
            style: TextStyle(color: c.textSecondary, fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppDimens.spaceMd),
          SizedBox(
            width: double.infinity,
            height: AppDimens.primaryTapTarget,
            child: ElevatedButton.icon(
              onPressed: () async {
                final uri = Uri.parse('https://t.me/fixlyosibot');
                if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
              },
              icon: const Icon(LucideIcons.messageCircle, size: 18),
              label: Text(AppLocalizations.tr('pricing_cta_btn')),
              style: ElevatedButton.styleFrom(
                backgroundColor: c.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
