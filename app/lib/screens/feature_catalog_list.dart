import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/feature_catalog.dart';
import 'package:fixly_app/screens/feature_status_sheet.dart';

// Каталог функций целиком (REQ-140, docs/specs/onboarding-unified.md §2) — используется и в
// «Ещё» председателя (chairman_home_shell.dart), и в «Профиле» жителя (resident_home_shell.dart).
// ✅-пункты — статичные строки без onTap (это уже свои вкладки/экраны, дублировать переход
// незачем); 🔜/🌐-пункты тап открывает объяснение (REQ-141) — не «мёртвая» кнопка.
class FeatureCatalogSection extends StatelessWidget {
  final bool isChairman;
  const FeatureCatalogSection({super.key, required this.isChairman});

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final entries = featureCatalogFor(isChairman: isChairman);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Text(
            'Все функции',
            style: TextStyle(
              color: c.textPrimary,
              fontSize: AppTypography.sectionTitle,
              fontWeight: AppTypography.bold,
            ),
          ),
        ),
        const SizedBox(height: AppDimens.spaceSm),
        Container(
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
            border: Border.all(color: c.cardBorder),
          ),
          child: Column(
            children: [
              for (var i = 0; i < entries.length; i++)
                _row(context, c, entries[i], isLast: i == entries.length - 1),
            ],
          ),
        ),
      ],
    );
  }

  Widget _row(BuildContext context, AppColors c, FeatureCatalogEntry entry, {required bool isLast}) {
    final tappable = entry.status != FeatureStatus.done;
    final row = Container(
      padding: const EdgeInsets.symmetric(horizontal: AppDimens.spaceMd, vertical: 12),
      decoration: BoxDecoration(
        border: isLast ? null : Border(bottom: BorderSide(color: c.cardBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              entry.item.label,
              style: TextStyle(color: c.textPrimary, fontSize: AppTypography.body),
            ),
          ),
          const SizedBox(width: AppDimens.spaceSm),
          _badge(c, entry.status, entry.item.srez),
          if (tappable) ...[
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, size: 16, color: c.textTertiary),
          ],
        ],
      ),
    );

    if (!tappable) return row;
    return InkWell(
      onTap: () => showFeatureStatusSheet(context, entry.item, entry.status),
      child: row,
    );
  }

  Widget _badge(AppColors c, FeatureStatus status, String? srez) {
    switch (status) {
      case FeatureStatus.done:
        return Icon(LucideIcons.checkCircle2, size: 17, color: c.success);
      case FeatureStatus.soon:
        return _pill(c.warning, srez != null ? 'скоро · срез $srez' : 'скоро');
      case FeatureStatus.siteOnly:
        return _pill(c.primary, 'на сайте');
      case FeatureStatus.hidden:
        return const SizedBox.shrink();
    }
  }

  Widget _pill(Color color, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 11, fontWeight: AppTypography.semibold),
      ),
    );
  }
}
