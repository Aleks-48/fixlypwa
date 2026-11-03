import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/master_repository.dart';
import 'package:fixly_app/core/request_labels.dart';
import 'package:fixly_app/screens/login_page.dart';
import 'package:fixly_app/screens/legal_docs_sheet.dart';

// Анкета мастера (REQ-068, onboarding-unified.md §0 вопрос 5: карточка есть → анкета →
// модерация). Одобрение — вручную суперадмином на сайте (/admin/masters, ADR-0008) — витрина
// заказов (срез 25) недоступна до APPROVED.
class MasterApplicationScreen extends StatefulWidget {
  final String? prefillFullName;
  const MasterApplicationScreen({super.key, this.prefillFullName});

  @override
  State<MasterApplicationScreen> createState() => _MasterApplicationScreenState();
}

class _MasterApplicationScreenState extends State<MasterApplicationScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullNameCtrl;
  final _cityCtrl = TextEditingController(text: 'Кокшетау');
  final _bioCtrl = TextEditingController();
  final Set<String> _categories = {};

  bool _isLoading = false;
  String? _error;
  String? _submittedStatus; // не null → показываем экран «на проверке»

  @override
  void initState() {
    super.initState();
    _fullNameCtrl = TextEditingController(text: widget.prefillFullName ?? '');
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _cityCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_categories.isEmpty) {
      setState(() => _error = 'Выберите хотя бы одну категорию');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final app = await MasterRepository.instance.register(
        fullName: _fullNameCtrl.text.trim(),
        city: _cityCtrl.text.trim(),
        categories: _categories.toList(),
        bio: _bioCtrl.text.trim().isEmpty ? null : _bioCtrl.text.trim(),
      );
      if (mounted) setState(() => _submittedStatus = app.status);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Ошибка подключения');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _logout() async {
    await AuthRepository.instance.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
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
        automaticallyImplyLeading: false,
        title: Text('Анкета мастера', style: TextStyle(color: c.textPrimary)),
        actions: [
          IconButton(icon: Icon(Icons.logout, color: c.textPrimary), onPressed: _logout),
        ],
      ),
      body: SafeArea(
        child: _submittedStatus != null ? _pendingState(c) : _form(c),
      ),
    );
  }

  Widget _pendingState(AppColors c) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.clock, size: 48, color: c.warning),
            const SizedBox(height: AppDimens.spaceMd),
            Text('Анкета на проверке',
                textAlign: TextAlign.center,
                style: TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: AppTypography.bold)),
            const SizedBox(height: AppDimens.spaceSm),
            Text(
              'Модератор проверит анкету и одобрит доступ к заказам вашего города. '
              'Обычно это занимает немного времени.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _form(AppColors c) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimens.spaceLg),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Расскажите о себе',
                style: TextStyle(color: c.textPrimary, fontSize: 24, fontWeight: AppTypography.extraBold)),
            const SizedBox(height: AppDimens.spaceSm),
            Text('Анкету проверит модератор перед тем, как откроется лента заказов',
                style: TextStyle(color: c.textSecondary)),
            const SizedBox(height: AppDimens.spaceLg),
            _field(c, controller: _fullNameCtrl, label: 'ФИО', icon: LucideIcons.user,
                validator: (v) => (v?.trim().length ?? 0) < 2 ? 'Укажите ФИО' : null),
            const SizedBox(height: AppDimens.spaceSm),
            _field(c, controller: _cityCtrl, label: 'Город', icon: LucideIcons.mapPin,
                validator: (v) => (v?.trim().length ?? 0) < 2 ? 'Укажите город' : null),
            const SizedBox(height: AppDimens.spaceMd),
            Text('Категории работ', style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.semibold)),
            const SizedBox(height: AppDimens.spaceSm),
            Wrap(
              spacing: AppDimens.spaceSm,
              runSpacing: AppDimens.spaceSm,
              children: requestCategoryOrder.map((cat) {
                final selected = _categories.contains(cat);
                return FilterChip(
                  label: Text(requestCategoryLabels[cat] ?? cat),
                  selected: selected,
                  onSelected: (v) => setState(() => v ? _categories.add(cat) : _categories.remove(cat)),
                  selectedColor: c.primary,
                  backgroundColor: c.surfaceVariant,
                  labelStyle: TextStyle(color: selected ? Colors.white : c.textSecondary),
                  side: BorderSide(color: selected ? c.primary : c.cardBorder),
                );
              }).toList(),
            ),
            const SizedBox(height: AppDimens.spaceMd),
            _field(c, controller: _bioCtrl, label: 'О себе (опционально)', icon: LucideIcons.info, maxLines: 3),
            const SizedBox(height: AppDimens.spaceMd),

            // Юридическое согласие мастера
            GestureDetector(
              onTap: () => LegalDocsSheet.show(context, initialTab: LegalDocTab.master),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  border: Border.all(color: c.cardBorder),
                ),
                child: Row(
                  children: [
                    Icon(LucideIcons.shieldCheck, color: c.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          text: 'Подавая анкету, вы принимаете ',
                          style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.3),
                          children: [
                            TextSpan(
                              text: 'Оферту мастера (3%)',
                              style: TextStyle(color: c.primary, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                            ),
                            const TextSpan(text: ' и '),
                            TextSpan(
                              text: 'Техрегламент',
                              style: TextStyle(color: c.primary, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                            ),
                            const TextSpan(text: '.'),
                          ],
                        ),
                      ),
                    ),
                    Icon(Icons.chevron_right, color: c.textTertiary, size: 18),
                  ],
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: AppDimens.spaceSm),
              Text(_error!, style: TextStyle(color: c.danger)),
            ],
            const SizedBox(height: AppDimens.spaceLg),
            SizedBox(
              width: double.infinity,
              height: AppDimens.primaryTapTarget,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: c.primary,
                  disabledBackgroundColor: c.primary.withOpacity(0.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 22, height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : const Text('Отправить анкету',
                        style: TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(AppColors c, {
    required TextEditingController controller,
    required String label,
    required IconData icon,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: TextStyle(color: c.textPrimary),
      cursorColor: c.primary,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: c.textTertiary),
        prefixIcon: Icon(icon, color: c.primary, size: 19),
        filled: true,
        fillColor: c.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          borderSide: BorderSide(color: c.cardBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          borderSide: BorderSide(color: c.cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
          borderSide: BorderSide(color: c.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
