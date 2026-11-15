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
  final Set<String> _withdrawingIds = {};
  bool _loading = true;
  int _loadSeq = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final seq = ++_loadSeq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final offers = await MarketRepository.instance.listMyOffers();
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _offers = offers;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || seq != _loadSeq) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _withdraw(MarketOffer o) async {
    if (_withdrawingIds.contains(o.id)) return;
    setState(() => _withdrawingIds.add(o.id));
    try {
      await MarketRepository.instance.withdraw(o.id);
      if (mounted) await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Не удалось отозвать отклик')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _withdrawingIds.remove(o.id));
      }
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
                ? LayoutBuilder(
                    builder: (context, constraints) => SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: constraints.maxHeight),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.all(AppDimens.spaceLg),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_error!,
                                    style: TextStyle(color: c.danger),
                                    textAlign: TextAlign.center),
                                const SizedBox(height: AppDimens.spaceMd),
                                OutlinedButton(
                                    onPressed: _load,
                                    child: const Text('Повторить')),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  )
                : _offers.isEmpty
                    ? LayoutBuilder(
                        builder: (context, constraints) => SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(minHeight: constraints.maxHeight),
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.all(AppDimens.spaceLg),
                                child: Text(
                                  'Вы пока не откликались на заказы',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      color: c.textTertiary,
                                      fontSize: AppTypography.body),
                                ),
                              ),
                            ),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _offers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final o = _offers[i];
                          final withdrawing = _withdrawingIds.contains(o.id);
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
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style:
                                              TextStyle(color: c.textTertiary, fontSize: AppTypography.caption)),
                                      if (o.price != null) ...[
                                        const SizedBox(height: 4),
                                        Text('≈ ${o.price} ₸',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                                color: c.textSecondary, fontSize: AppTypography.caption)),
                                      ],
                                    ],
                                  ),
                                ),
                                if (o.status == 'OFFERED')
                                  TextButton(
                                    onPressed: withdrawing ? null : () => _withdraw(o),
                                    child: withdrawing
                                        ? SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: c.danger,
                                            ),
                                          )
                                        : Text('Отозвать', style: TextStyle(color: c.danger)),
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
