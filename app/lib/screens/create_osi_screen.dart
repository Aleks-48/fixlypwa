import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/auth_repository.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:fixly_app/screens/home_router.dart';

// Онбординг председателя (onboarding-unified.md §0 вопрос 8, REQ-137/143): ОСИ → дом.
// Создатель автоматически становится CHAIRMAN (Q-051, POST /api/osi). Квартиры и жители
// добавляются ПОСЛЕ, из chairman_home_shell (постоянная функция управления, не разовый шаг
// визарда) — так председатель может вернуться и добавлять жителей когда угодно, а не только
// один раз при регистрации.
class CreateOsiScreen extends StatefulWidget {
  const CreateOsiScreen({super.key});

  @override
  State<CreateOsiScreen> createState() => _CreateOsiScreenState();
}

enum _Step { osi, building }

class _CreateOsiScreenState extends State<CreateOsiScreen> {
  _Step _step = _Step.osi;
  final _osiFormKey = GlobalKey<FormState>();
  final _buildingFormKey = GlobalKey<FormState>();

  final _nameCtrl = TextEditingController();
  final _binCtrl = TextEditingController();
  final _addressCtrl = TextEditingController(); // адрес ОСИ (опц.)
  final _buildingAddressCtrl = TextEditingController();

  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _binCtrl.dispose();
    _addressCtrl.dispose();
    _buildingAddressCtrl.dispose();
    super.dispose();
  }

  Future<void> _createOsi() async {
    if (!(_osiFormKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await OsiRepository.instance.createOsi(
        name: _nameCtrl.text.trim(),
        bin: _binCtrl.text.trim().isEmpty ? null : _binCtrl.text.trim(),
        address: _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
      );
      if (mounted) setState(() => _step = _Step.building);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Ошибка подключения');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _createBuildingAndFinish() async {
    if (!(_buildingFormKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await OsiRepository.instance.createBuilding(address: _buildingAddressCtrl.text.trim());
      await _goToShell();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Ошибка подключения');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Дом можно добавить и позже из «Ещё» → «Дома и жители» — не блокируем председателя, если
  // адрес дома под рукой не набирается прямо сейчас.
  Future<void> _skipBuilding() => _goToShell();

  Future<void> _goToShell() async {
    // ОСИ создана — activeOsiId/роль CHAIRMAN появились на сервере; перечитываем профиль,
    // чтобы HomeRouter увидел актуальную роль (тот AuthUser, что был до этого экрана, ещё
    // с пустыми roles).
    final user = await AuthRepository.instance.me();
    if (!mounted || user == null) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => HomeRouter(user: user)),
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
        title: Text('Создание ОСИ', style: TextStyle(color: c.textPrimary)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimens.spaceLg),
          child: _step == _Step.osi ? _osiStep(c) : _buildingStep(c),
        ),
      ),
    );
  }

  Widget _osiStep(AppColors c) {
    return Form(
      key: _osiFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _stepHeader(c, step: 1, total: 2, title: 'Данные ОСИ',
              subtitle: 'Объединение собственников имущества — единица управления домом'),
          const SizedBox(height: AppDimens.spaceLg),
          _field(c, controller: _nameCtrl, label: 'Название ОСИ', icon: LucideIcons.building2,
              validator: (v) => (v?.trim().length ?? 0) < 2 ? 'Укажите название' : null),
          const SizedBox(height: AppDimens.spaceSm),
          _field(c, controller: _binCtrl, label: 'БИН (опционально)', icon: LucideIcons.hash,
              keyboard: TextInputType.number,
              validator: (v) {
                final s = v?.trim() ?? '';
                if (s.isEmpty) return null;
                if (!RegExp(r'^\d{12}$').hasMatch(s)) return 'БИН — 12 цифр';
                return null;
              }),
          const SizedBox(height: AppDimens.spaceSm),
          _field(c, controller: _addressCtrl, label: 'Юридический адрес (опционально)',
              icon: LucideIcons.mapPin),
          if (_error != null) ...[
            const SizedBox(height: AppDimens.spaceSm),
            Text(_error!, style: TextStyle(color: c.danger)),
          ],
          const SizedBox(height: AppDimens.spaceLg),
          _primaryButton(c, label: 'Далее', onPressed: _isLoading ? null : _createOsi),
        ],
      ),
    );
  }

  Widget _buildingStep(AppColors c) {
    return Form(
      key: _buildingFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _stepHeader(c, step: 2, total: 2, title: 'Добавьте дом',
              subtitle: 'Квартиры и жителей добавите после — в разделе «Дома и жители»'),
          const SizedBox(height: AppDimens.spaceLg),
          _field(c, controller: _buildingAddressCtrl, label: 'Адрес дома', icon: LucideIcons.home,
              validator: (v) => (v?.trim().length ?? 0) < 3 ? 'Укажите адрес' : null),
          if (_error != null) ...[
            const SizedBox(height: AppDimens.spaceSm),
            Text(_error!, style: TextStyle(color: c.danger)),
          ],
          const SizedBox(height: AppDimens.spaceLg),
          _primaryButton(c, label: 'Готово', onPressed: _isLoading ? null : _createBuildingAndFinish),
          const SizedBox(height: AppDimens.spaceSm),
          Center(
            child: TextButton(
              onPressed: _isLoading ? null : _skipBuilding,
              child: Text('Добавить дом позже', style: TextStyle(color: c.textSecondary)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepHeader(AppColors c,
      {required int step, required int total, required String title, required String subtitle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Шаг $step из $total',
            style: TextStyle(color: c.primary, fontSize: AppTypography.caption, fontWeight: AppTypography.semibold)),
        const SizedBox(height: 6),
        Text(title, style: TextStyle(color: c.textPrimary, fontSize: 24, fontWeight: AppTypography.extraBold)),
        const SizedBox(height: 6),
        Text(subtitle, style: TextStyle(color: c.textSecondary)),
      ],
    );
  }

  Widget _primaryButton(AppColors c, {required String label, required VoidCallback? onPressed}) {
    return SizedBox(
      width: double.infinity,
      height: AppDimens.primaryTapTarget,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: c.primary,
          disabledBackgroundColor: c.primary.withOpacity(0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 22, height: 22,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
            : Text(label, style: const TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
      ),
    );
  }

  Widget _field(AppColors c, {
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboard = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
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
