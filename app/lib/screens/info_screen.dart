import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/info_repository.dart';

// Инфо-раздел дома (mobile-app.md §4, срез 22) — read-only: вывоз мусора, аварийные службы,
// реквизиты, контакты председателя. Наполняет председатель на сайте.
class InfoScreen extends StatefulWidget {
  const InfoScreen({super.key});

  @override
  State<InfoScreen> createState() => _InfoScreenState();
}

const Map<String, IconData> _typeIcons = {
  'TRASH_SCHEDULE': LucideIcons.trash2,
  'EMERGENCY_CONTACTS': LucideIcons.phoneCall,
  'PAYMENT_DETAILS': LucideIcons.creditCard,
  'CHAIRMAN_CONTACTS': LucideIcons.user,
  'OTHER': LucideIcons.info,
};

class _InfoScreenState extends State<InfoScreen> {
  List<InfoItem> _items = [];
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
      final items = await InfoRepository.instance.list();
      if (!mounted) return;
      setState(() {
        _items = items;
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

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Инфо о доме', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
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
                : _items.isEmpty
                    ? Center(
                        child: Text('Раздел пока пуст',
                            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final item = _items[i];
                          return Container(
                            padding: const EdgeInsets.all(AppDimens.spaceMd),
                            decoration: BoxDecoration(
                              color: c.card,
                              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                              border: Border.all(color: c.cardBorder),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: c.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                                  ),
                                  child: Icon(_typeIcons[item.type] ?? LucideIcons.info,
                                      color: c.primary, size: 20),
                                ),
                                const SizedBox(width: AppDimens.spaceSm),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item.title,
                                          style: TextStyle(
                                              color: c.textPrimary,
                                              fontSize: AppTypography.cardTitle,
                                              fontWeight: AppTypography.semibold)),
                                      const SizedBox(height: 4),
                                      Text(item.content,
                                          style: TextStyle(
                                              color: c.textSecondary, fontSize: AppTypography.body)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
