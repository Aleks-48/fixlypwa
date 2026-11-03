import 'package:flutter/material.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/market_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/core/events_repository.dart';
import 'dart:async';

// Лента заказов города мастера (REQ-064, REQ-149, срез 25) — зеркалит вкладку «Заказы»
// web/src/app/master/page.tsx. Пока без SSE (срез 24): маркетплейс не входит в текущий
// набор триггеров notify() на сервере — то же самое ограничение уже у веб-версии.
class MasterListingsScreen extends StatefulWidget {
  const MasterListingsScreen({super.key});

  @override
  State<MasterListingsScreen> createState() => _MasterListingsScreenState();
}

class _MasterListingsScreenState extends State<MasterListingsScreen> {
  List<MarketListing> _listings = [];
  Map<String, MarketOffer> _myOfferByListingId = {};
  bool _loading = true;
  String? _error;

  StreamSubscription<SseEvent>? _sseSub;

  @override
  void initState() {
    super.initState();
    _load();
    EventsRepository.instance.connect();
    _sseSub = EventsRepository.instance.stream.listen((event) {
      if (event.type == 'MARKET_LISTING_CREATED' && mounted) {
        _load();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚡ Поступил новый заказ в вашем городе!'),
            duration: Duration(seconds: 3),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _sseSub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        MarketRepository.instance.listListings(),
        MarketRepository.instance.listMyOffers(),
      ]);
      if (!mounted) return;
      final offers = results[1] as List<MarketOffer>;
      setState(() {
        _listings = results[0] as List<MarketListing>;
        _myOfferByListingId = {for (final o in offers) o.listingId: o};
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

  Future<void> _respond(MarketListing listing) async {
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.of(context).card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (_) => _RespondSheet(listing: listing),
    );
    if (sent == true && mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        elevation: 0,
        title: Text('Заказы · ${_listings.length}', style: TextStyle(color: c.textPrimary)),
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
                : _listings.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceLg),
                          child: Text(
                            'Пока нет заказов в вашем городе — загляните позже',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _listings.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final l = _listings[i];
                          final mine = _myOfferByListingId[l.id];
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
                                Text(l.title,
                                    style:
                                        TextStyle(color: c.textPrimary, fontWeight: AppTypography.semibold)),
                                const SizedBox(height: 4),
                                Text(
                                  '${l.buildingLabel} · ${requestCategoryLabels[l.category] ?? l.category}',
                                  style: TextStyle(color: c.textTertiary, fontSize: AppTypography.caption),
                                ),
                                const SizedBox(height: AppDimens.spaceSm),
                                Text(l.description,
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: c.textSecondary)),
                                const SizedBox(height: AppDimens.spaceSm),
                                if (mine != null)
                                  Text(
                                    marketOfferStatusLabels[mine.status] ?? mine.status,
                                    style: TextStyle(
                                        color: c.textTertiary,
                                        fontWeight: AppTypography.semibold,
                                        fontSize: AppTypography.caption),
                                  )
                                else
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: OutlinedButton(
                                      onPressed: () => _respond(l),
                                      style: OutlinedButton.styleFrom(side: BorderSide(color: c.primary)),
                                      child: Text('Откликнуться', style: TextStyle(color: c.primary)),
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

class _RespondSheet extends StatefulWidget {
  final MarketListing listing;
  const _RespondSheet({required this.listing});

  @override
  State<_RespondSheet> createState() => _RespondSheetState();
}

class _RespondSheetState extends State<_RespondSheet> {
  final _msgCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _msgCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = _msgCtrl.text.trim();
    if (message.isEmpty) {
      setState(() => _error = 'Напишите сообщение');
      return;
    }
    double? price;
    final priceText = _priceCtrl.text.trim();
    if (priceText.isNotEmpty) {
      price = double.tryParse(priceText.replaceAll(',', '.'));
      if (price == null || price <= 0 || !price.isFinite) {
        setState(() => _error = 'Некорректная цена');
        return;
      }
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await MarketRepository.instance.respond(widget.listing.id, message: message, price: price);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.listing.title,
              style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: AppTypography.bold)),
          const SizedBox(height: AppDimens.spaceMd),
          TextField(
            controller: _msgCtrl,
            maxLines: 3,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              labelText: 'Сообщение',
              filled: true,
              fillColor: c.surfaceVariant,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: AppDimens.spaceSm),
          TextField(
            controller: _priceCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              labelText: 'Ориентировочная цена, ₸ (опционально)',
              filled: true,
              fillColor: c.surfaceVariant,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd), borderSide: BorderSide.none),
            ),
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
              onPressed: _sending ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: c.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
              ),
              child: _sending
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : const Text('Откликнуться',
                      style: TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
