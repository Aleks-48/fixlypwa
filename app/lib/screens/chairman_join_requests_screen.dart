import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/osi_repository.dart';

class ChairmanJoinRequestsScreen extends StatefulWidget {
  const ChairmanJoinRequestsScreen({super.key});

  @override
  State<ChairmanJoinRequestsScreen> createState() => _ChairmanJoinRequestsScreenState();
}

class _ChairmanJoinRequestsScreenState extends State<ChairmanJoinRequestsScreen> {
  List<PendingJoinRequest> _requests = [];
  bool _loading = true;
  String? _error;
  final Set<String> _processingIds = {};

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
      final requests = await OsiRepository.instance.listOsiJoinRequests();
      if (!mounted) return;
      setState(() {
        _requests = requests;
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

  Future<void> _resolveRequest(PendingJoinRequest req) async {
    setState(() => _processingIds.add(req.id));
    try {
      await OsiRepository.instance.resolveJoinRequest(req.id);
      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Заявка от ${req.fullName ?? "пользователя"} одобрена'),
          backgroundColor: Colors.green,
        ),
      );
      
      setState(() {
        _requests.removeWhere((item) => item.id == req.id);
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.of(context).danger),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Не удалось обработать заявку')),
      );
    } finally {
      if (mounted) {
        setState(() => _processingIds.remove(req.id));
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
        title: Text('Заявки на вступление', style: TextStyle(color: c.textPrimary)),
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
                : _requests.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceLg),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(LucideIcons.userCheck, size: 48, color: c.textTertiary),
                              const SizedBox(height: AppDimens.spaceMd),
                              Text(
                                'Новых заявок на присоединение нет',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: c.textTertiary, fontSize: AppTypography.body),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                        itemCount: _requests.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                        itemBuilder: (_, i) {
                          final req = _requests[i];
                          final isProcessing = _processingIds.contains(req.id);

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
                                    CircleAvatar(
                                      backgroundColor: c.primary.withOpacity(0.1),
                                      child: Icon(LucideIcons.user, color: c.primary, size: 20),
                                    ),
                                    const SizedBox(width: AppDimens.spaceSm),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            req.fullName ?? 'Не указано',
                                            style: TextStyle(
                                              color: c.textPrimary,
                                              fontSize: AppTypography.cardTitle,
                                              fontWeight: AppTypography.bold,
                                            ),
                                          ),
                                          if (req.phone != null || req.email != null)
                                            Text(
                                              req.phone ?? req.email ?? '',
                                              style: TextStyle(
                                                color: c.textSecondary,
                                                fontSize: AppTypography.caption,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                if (req.note != null && req.note!.isNotEmpty) ...[
                                  const SizedBox(height: AppDimens.spaceSm),
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(AppDimens.spaceSm),
                                    decoration: BoxDecoration(
                                      color: c.surfaceVariant,
                                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                                    ),
                                    child: Text(
                                      'Примечание: ${req.note}',
                                      style: TextStyle(
                                        color: c.textSecondary,
                                        fontSize: AppTypography.body,
                                      ),
                                    ),
                                  ),
                                ],
                                const SizedBox(height: AppDimens.spaceMd),
                                SizedBox(
                                  width: double.infinity,
                                  height: AppDimens.primaryTapTarget,
                                  child: ElevatedButton.icon(
                                    onPressed: isProcessing ? null : () => _resolveRequest(req),
                                    icon: isProcessing
                                        ? const SizedBox(
                                            width: 18,
                                            height: 18,
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Icon(LucideIcons.checkCircle, size: 18, color: Colors.white),
                                    label: Text(
                                      isProcessing ? 'Обработка...' : 'Принять в ОСИ',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: AppTypography.bold,
                                      ),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: c.primary,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                      ),
                                    ),
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