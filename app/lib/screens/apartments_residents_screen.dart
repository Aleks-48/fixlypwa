import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/osi_repository.dart';

// Дома и жители (REQ-137/143 §8: онбординг председателя доводится до «добавления жителей»,
// но это ПОСТОЯННАЯ функция, не разовый шаг визарда — председатель возвращается сюда всегда).
class ApartmentsResidentsScreen extends StatefulWidget {
  const ApartmentsResidentsScreen({super.key});

  @override
  State<ApartmentsResidentsScreen> createState() => _ApartmentsResidentsScreenState();
}

class _ApartmentsResidentsScreenState extends State<ApartmentsResidentsScreen> {
  List<Building> _buildings = [];
  Building? _selected;
  List<Apartment> _apartments = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBuildings();
  }

  Future<void> _loadBuildings() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final buildings = await OsiRepository.instance.listBuildings();
      if (!mounted) return;
      setState(() {
        _buildings = buildings;
        _selected = buildings.isNotEmpty ? buildings.first : null;
        _loading = false;
      });
      if (_selected != null) await _loadApartments();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadApartments() async {
    if (_selected == null) return;
    try {
      final apartments = await OsiRepository.instance.listApartments(_selected!.id);
      if (mounted) setState(() => _apartments = apartments);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _addBuilding() async {
    final c = AppColors.of(context);
    final addressCtrl = TextEditingController();
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (_) => _SimpleFormSheet(
        title: 'Новый дом',
        fields: [_SheetField('Адрес', addressCtrl, LucideIcons.home)],
        submitLabel: 'Добавить',
        onSubmit: () => OsiRepository.instance.createBuilding(address: addressCtrl.text.trim()),
        validate: () => addressCtrl.text.trim().length >= 3 ? null : 'Укажите адрес',
      ),
    );
    if (added == true) await _loadBuildings();
  }

  Future<void> _addApartment() async {
    if (_selected == null) return;
    final c = AppColors.of(context);
    final numberCtrl = TextEditingController();
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (_) => _SimpleFormSheet(
        title: 'Новая квартира',
        fields: [_SheetField('Номер квартиры', numberCtrl, LucideIcons.doorOpen)],
        submitLabel: 'Добавить',
        onSubmit: () =>
            OsiRepository.instance.createApartment(buildingId: _selected!.id, number: numberCtrl.text.trim()),
        validate: () => numberCtrl.text.trim().isEmpty ? 'Укажите номер' : null,
      ),
    );
    if (added == true) await _loadApartments();
  }

  Future<void> _addResident(Apartment apt) async {
    final c = AppColors.of(context);
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (_) => _SimpleFormSheet(
        title: 'Житель кв. ${apt.number}',
        fields: [
          _SheetField('ФИО', nameCtrl, LucideIcons.user),
          _SheetField('Телефон', phoneCtrl, LucideIcons.phone),
          _SheetField('Email', emailCtrl, LucideIcons.atSign),
        ],
        submitLabel: 'Добавить жителя',
        onSubmit: () => OsiRepository.instance.addResident(
          apartmentId: apt.id,
          fullName: nameCtrl.text.trim(),
          phone: phoneCtrl.text.trim().isEmpty ? null : phoneCtrl.text.trim(),
          email: emailCtrl.text.trim().isEmpty ? null : emailCtrl.text.trim(),
        ),
        validate: () {
          if (nameCtrl.text.trim().length < 2) return 'Укажите ФИО';
          if (phoneCtrl.text.trim().isEmpty && emailCtrl.text.trim().isEmpty) {
            return 'Укажите телефон или email';
          }
          return null;
        },
      ),
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Житель добавлен')));
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
        title: Text('Дома и жители', style: TextStyle(color: c.textPrimary)),
        iconTheme: IconThemeData(color: c.textPrimary),
      ),
      body: _loading
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
                        OutlinedButton(onPressed: _loadBuildings, child: const Text('Повторить')),
                      ],
                    ),
                  ),
                )
              : _buildings.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(AppDimens.spaceLg),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Домов пока нет', style: TextStyle(color: c.textTertiary)),
                            const SizedBox(height: AppDimens.spaceMd),
                            ElevatedButton(
                              onPressed: _addBuilding,
                              style: ElevatedButton.styleFrom(backgroundColor: c.primary),
                              child: const Text('Добавить дом', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      ),
                    )
                  : Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceMd),
                          child: Row(
                            children: [
                              Expanded(
                                child: DropdownButtonFormField<Building>(
                                  initialValue: _selected,
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: c.surfaceVariant,
                                    contentPadding:
                                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                        borderSide: BorderSide.none),
                                  ),
                                  items: _buildings
                                      .map((b) => DropdownMenuItem(value: b, child: Text(b.address)))
                                      .toList(),
                                  onChanged: (b) async {
                                    setState(() {
                                      _selected = b;
                                      _apartments = [];
                                    });
                                    await _loadApartments();
                                  },
                                ),
                              ),
                              IconButton(
                                onPressed: _addBuilding,
                                icon: Icon(Icons.add_business, color: c.primary),
                                tooltip: 'Добавить дом',
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: RefreshIndicator(
                            onRefresh: _loadApartments,
                            child: _apartments.isEmpty
                                ? Center(
                                    child: Text('Квартир пока нет',
                                        style: TextStyle(color: c.textTertiary)),
                                  )
                                : ListView.separated(
                                    padding: const EdgeInsets.fromLTRB(
                                        AppDimens.spaceMd, 0, AppDimens.spaceMd, 80),
                                    itemCount: _apartments.length,
                                    separatorBuilder: (_, __) => const SizedBox(height: AppDimens.spaceSm),
                                    itemBuilder: (_, i) {
                                      final apt = _apartments[i];
                                      return Container(
                                        padding: const EdgeInsets.all(AppDimens.spaceMd),
                                        decoration: BoxDecoration(
                                          color: c.card,
                                          borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                          border: Border.all(color: c.cardBorder),
                                        ),
                                        child: Row(
                                          children: [
                                            Icon(LucideIcons.doorOpen, color: c.primary),
                                            const SizedBox(width: AppDimens.spaceSm),
                                            Expanded(
                                              child: Text('Квартира ${apt.number}',
                                                  style: TextStyle(color: c.textPrimary)),
                                            ),
                                            TextButton.icon(
                                              onPressed: () => _addResident(apt),
                                              icon: Icon(LucideIcons.userPlus, size: 16, color: c.primary),
                                              label: Text('Житель', style: TextStyle(color: c.primary)),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                          ),
                        ),
                      ],
                    ),
      floatingActionButton: _buildings.isNotEmpty
          ? FloatingActionButton(
              onPressed: _addApartment,
              backgroundColor: c.primary,
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }
}

class _SheetField {
  final String label;
  final TextEditingController controller;
  final IconData icon;
  _SheetField(this.label, this.controller, this.icon);
}

class _SimpleFormSheet extends StatefulWidget {
  final String title;
  final List<_SheetField> fields;
  final String submitLabel;
  final Future<void> Function() onSubmit;
  final String? Function() validate;

  const _SimpleFormSheet({
    required this.title,
    required this.fields,
    required this.submitLabel,
    required this.onSubmit,
    required this.validate,
  });

  @override
  State<_SimpleFormSheet> createState() => _SimpleFormSheetState();
}

class _SimpleFormSheetState extends State<_SimpleFormSheet> {
  bool _isLoading = false;
  String? _error;

  Future<void> _submit() async {
    final validationError = widget.validate();
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await widget.onSubmit();
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Не удалось сохранить');
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
          Text(widget.title,
              style: TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: AppTypography.bold)),
          const SizedBox(height: AppDimens.spaceMd),
          for (final f in widget.fields) ...[
            TextField(
              controller: f.controller,
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                labelText: f.label,
                labelStyle: TextStyle(color: c.textTertiary),
                prefixIcon: Icon(f.icon, color: c.primary, size: 19),
                filled: true,
                fillColor: c.surfaceVariant,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: AppDimens.spaceSm),
          ],
          if (_error != null) ...[
            Text(_error!, style: TextStyle(color: c.danger)),
            const SizedBox(height: AppDimens.spaceSm),
          ],
          SizedBox(
            width: double.infinity,
            height: AppDimens.primaryTapTarget,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: c.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusMd)),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 22, height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : Text(widget.submitLabel,
                      style: const TextStyle(color: Colors.white, fontWeight: AppTypography.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
