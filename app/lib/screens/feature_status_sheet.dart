import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/feature_catalog.dart';

// Заглушка для пунктов каталога функций (REQ-140..142), которые ещё не готовы здесь (🔜) или
// доступны только на сайте (🌐) — REQ-141: не «мёртвая» кнопка, а 1–2 фразы, что будет и что
// работает уже сейчас. Готовые (✅) пункты каталога — просто строки без onTap, сюда не попадают.
void showFeatureStatusSheet(BuildContext context, FeatureCatalogItem item, FeatureStatus status) {
  final c = AppColors.of(context);
  final isSiteOnly = status == FeatureStatus.siteOnly;

  showModalBottomSheet(
    context: context,
    backgroundColor: c.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
    ),
    builder: (_) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: (isSiteOnly ? c.primary : c.warning).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                  ),
                  child: Icon(
                    isSiteOnly ? LucideIcons.globe : LucideIcons.clock,
                    color: isSiteOnly ? c.primary : c.warning,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppDimens.spaceSm),
                Expanded(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: AppTypography.cardTitle,
                      fontWeight: AppTypography.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppDimens.spaceMd),
            Text(
              isSiteOnly ? 'На сайте' : 'Скоро${item.srez != null ? " · срез ${item.srez}" : ""}',
              style: TextStyle(
                color: isSiteOnly ? c.primary : c.warning,
                fontSize: AppTypography.caption,
                fontWeight: AppTypography.semibold,
              ),
            ),
            const SizedBox(height: AppDimens.spaceSm),
            Text(
              item.note ??
                  (isSiteOnly
                      ? 'Эта функция пока доступна только в кабинете на сайте — войдите там тем же аккаунтом.'
                      : 'Функция в разработке.'),
              style: TextStyle(color: c.textSecondary, fontSize: AppTypography.body, height: 1.4),
            ),
            const SizedBox(height: AppDimens.spaceLg),
            SizedBox(
              width: double.infinity,
              height: AppDimens.primaryTapTarget,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(side: BorderSide(color: c.cardBorder)),
                child: Text('Понятно',
                    style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.semibold)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
