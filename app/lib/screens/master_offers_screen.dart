import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/market_repository.dart';

// Мои отклики (REQ-065, REQ-150, срез 25) — зеркалит вкладку «Мои отклики» на сайте
// (web/src/app/master/page.tsx). Это же и есть «история» откликов мастера — не денежный
// доход (аналога income_screen из старого fixly в бэкенде нет, marketplace.md §6): раскрытия
// контакта жителя после ACCEPTED сервер пока не отдаёт ни на сайте, ни здесь — известный
// пробел модуля M4, не задача этого среза.
class MasterOffersScreen extends StatefulWidget {
  const MasterOffersScreen({super.key});

  @override
  State<MasterOffersScreen> createState() => _MasterOffersScreenState();
}

class _MasterOffersScreenState extends State<MasterOffersScreen> {
  List<MarketOffer> _offers = [];
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
      final offers = await MarketRepository.instance.listMyOffers();
      if (!mounted) return;
      setState(() {
        _offers = offers;
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

  Future<void> _withdraw(MarketOffer o) async {
    try {
      await MarketRepository.instance.withdraw(o.id);
      if (mounted) _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
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
        title: Text('Мои отклики · ${_offers.length}', style: TextStyle(color: c.textPrimary)),
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
                : _offers.isEmpty
                    ? Center(
                        child: Text('Вы пока не откликались на заказы',
                            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _offers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final o = _offers[i];
                          return Container(
                            padding: const EdgeInsets.all(AppDimens.spaceMd),
                            decoration: BoxDecoration(
                              color: c.card,
                              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                              border: Border.all(color: c.cardBorder),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(o.listing?.title ?? 'Заказ закрыт',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                              color: c.textPrimary, fontWeight: AppTypography.semibold)),
                                      const SizedBox(height: 4),
                                      Text(marketOfferStatusLabels[o.status] ?? o.status,
                                          style:
                                              TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                                      if (o.price != null) ...[
                                        const SizedBox(height: 4),
                                        Text('≈ ${o.price} ₸',
                                            style: TextStyle(
                                                color: c.textSecondary, fontSize: AppTypography.caption)),
                                      ],
                                    ],
                                  ),
                                ),
                                if (o.status == 'OFFERED')
                                  TextButton(
                                    onPressed: () => _withdraw(o),
                                    child: Text('Отозвать', style: TextStyle(color: c.danger)),
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
