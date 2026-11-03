import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/core/app_localizations.dart';
import 'package:fixly_app/core/osi_repository.dart';
import 'package:url_launcher/url_launcher.dart';

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

  void _showApartmentDetails(Apartment apt) {
    final c = AppColors.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(AppDimens.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(LucideIcons.doorOpen, color: c.primary, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '${AppLocalizations.tr('apartment_details_title')}${apt.number}',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: AppTypography.sectionTitle,
                      fontWeight: AppTypography.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppDimens.spaceMd),
            const Divider(height: 1),
            const SizedBox(height: AppDimens.spaceSm),
            _detailRow(c, LucideIcons.maximize2, AppLocalizations.tr('area_label'), apt.area != null ? '${apt.area} ${AppLocalizations.tr('sq_meters')}' : AppLocalizations.tr('not_specified')),
            _detailRow(c, LucideIcons.layoutGrid, AppLocalizations.tr('rooms_label'), apt.rooms != null ? '${apt.rooms}' : AppLocalizations.tr('not_specified')),
            const SizedBox(height: AppDimens.spaceSm),
            const Divider(height: 1),
            const SizedBox(height: AppDimens.spaceSm),
            Text(AppLocalizations.tr('owners_residents_label'), style: TextStyle(color: c.textSecondary, fontWeight: AppTypography.semibold, fontSize: 13)),
            const SizedBox(height: 6),
            if (apt.occupants.isEmpty)
              Text(AppLocalizations.tr('owner_not_assigned'), style: TextStyle(color: c.textTertiary, fontSize: 13))
            else
              ...apt.occupants.map(
                (occ) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(LucideIcons.user, size: 16, color: c.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          occ.fullName,
                          style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.bold, fontSize: 14),
                        ),
                      ),
                      if (occ.phone != null)
                        Text(
                          occ.phone!,
                          style: TextStyle(color: c.textSecondary, fontSize: 13),
                        ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: AppDimens.spaceLg),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(AppColors c, IconData icon, String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: c.textTertiary),
          const SizedBox(width: 10),
          Text(title, style: TextStyle(color: c.textSecondary, fontSize: 14)),
          const Spacer(),
          Text(value, style: TextStyle(color: c.textPrimary, fontWeight: AppTypography.bold, fontSize: 14)),
        ],
      ),
    );
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

  // ─── CSV-импорт (массовый ввод) ───────────────────────────────────────────────
  //
  // Формат строки: номер,ФИО,площадь_кв,телефон
  // Пример:  1,Иванов Иван Иванович,45.5,+77001234567
  //          2,Петрова Мария,62.0
  //          3,,50.0          (только площадь, без собственника)

  Future<void> _showImportDialog() async {
    if (_selected == null) return;
    final c = AppColors.of(context);
    final ctrl = TextEditingController();
    bool loading = false;
    String? result;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
            left: AppDimens.spaceMd,
            right: AppDimens.spaceMd,
            top: AppDimens.spaceMd,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppDimens.spaceLg,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Icon(LucideIcons.fileSpreadsheet, color: c.primary, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Импорт квартир из списка',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: AppTypography.sectionTitle,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(AppDimens.spaceSm),
                  decoration: BoxDecoration(
                    color: c.primary.withValues(alpha: 0.07),
                    borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Формат: номер,ФИО,площадь_м²,телефон\n'
                        'Пример:\n'
                        '1,Иванов Иван Иванович,45.5,+77001234567\n'
                        '2,Петрова Мария,62\n'
                        '3,,50.0',
                        style: TextStyle(
                          color: c.primary,
                          fontSize: 11,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () async {
                          final uri = Uri.parse('${ApiClient.instance.baseUrl}/api/apartments/template');
                          if (await canLaunchUrl(uri)) {
                            launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                        },
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.download, size: 12, color: c.primary),
                            const SizedBox(width: 4),
                            Text(
                              'Скачать файл-шаблон (.csv)',
                              style: TextStyle(
                                color: c.primary,
                                fontSize: 11,
                                fontWeight: AppTypography.bold,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppDimens.spaceMd),
                TextField(
                  controller: ctrl,
                  maxLines: 10,
                  autofocus: true,
                  style: TextStyle(color: c.textPrimary, fontSize: 13, fontFamily: 'monospace'),
                  decoration: InputDecoration(
                    hintText: '1,Иванов И.И.,45.5,+77001234567\n2,Петрова М.М.,62.0\n...',
                    hintStyle: TextStyle(color: c.textTertiary, fontSize: 12),
                    filled: true,
                    fillColor: c.surfaceVariant,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                if (result != null) ...[  
                  const SizedBox(height: AppDimens.spaceSm),
                  Container(
                    padding: const EdgeInsets.all(AppDimens.spaceSm),
                    decoration: BoxDecoration(
                      color: c.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                    ),
                    child: Row(
                      children: [
                        Icon(LucideIcons.checkCircle, size: 14, color: c.success),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            result!,
                            style: TextStyle(color: c.success, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppDimens.spaceMd),
                SizedBox(
                  width: double.infinity,
                  height: AppDimens.primaryTapTarget,
                  child: ElevatedButton.icon(
                    onPressed: loading
                        ? null
                        : () async {
                            final text = ctrl.text.trim();
                            if (text.isEmpty) return;
                            setS(() => loading = true);
                            final res = await _parseAndImport(text);
                            setS(() {
                              loading = false;
                              result = res;
                            });
                            await _loadApartments();
                          },
                    icon: loading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(LucideIcons.upload, size: 16),
                    label: Text(loading ? 'Импорт...' : 'Импортировать'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: c.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<String> _parseAndImport(String csvText) async {
    if (_selected == null) return 'Нет выбранного дома';
    final lines = csvText.split('\n').where((l) => l.trim().isNotEmpty).toList();
    final rows = <Map<String, dynamic>>[];

    for (final line in lines) {
      final parts = line.split(',').map((p) => p.trim()).toList();
      if (parts.isEmpty || parts[0].isEmpty) continue;
      final row = <String, dynamic>{'number': parts[0]};
      if (parts.length > 1 && parts[1].isNotEmpty) row['ownerName'] = parts[1];
      if (parts.length > 2 && parts[2].isNotEmpty) {
        final area = double.tryParse(parts[2]);
        if (area != null) row['area'] = area;
      }
      if (parts.length > 3 && parts[3].isNotEmpty) row['ownerPhone'] = parts[3];
      rows.add(row);
    }

    if (rows.isEmpty) return 'Нет данных для импорта';

    try {
      final res = await ApiClient.instance.post('/api/apartments/import', body: {
        'buildingId': _selected!.id,
        'rows': rows,
      }) as Map<String, dynamic>;
      return res['message'] as String? ?? 'Импорт завершён';
    } catch (e) {
      return 'Ошибка: $e';
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
        actions: [
          if (_selected != null)
            IconButton(
              icon: Icon(LucideIcons.fileSpreadsheet, color: c.primary),
              tooltip: 'Импорт из списка',
              onPressed: _showImportDialog,
            ),
        ],
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
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: c.danger.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(LucideIcons.wifiOff, size: 28, color: c.danger),
                        ),
                        const SizedBox(height: AppDimens.spaceMd),
                        Text(
                          'Не удалось загрузить данные',
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: AppTypography.sectionTitle,
                            fontWeight: AppTypography.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Проверьте подключение к интернету и попробуйте снова.',
                          style: TextStyle(color: c.textSecondary, fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppDimens.spaceLg),
                        ElevatedButton.icon(
                          onPressed: _loadBuildings,
                          icon: const Icon(LucideIcons.refreshCw, size: 16),
                          label: const Text('Повторить попытку'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: c.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                            ),
                          ),
                        ),
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
                                      return InkWell(
                                        onTap: () => _showApartmentDetails(apt),
                                        borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                        child: Container(
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
                                                  Icon(LucideIcons.doorOpen, color: c.primary),
                                                  const SizedBox(width: AppDimens.spaceSm),
                                                  Expanded(
                                                    child: Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Text('Квартира ${apt.number}',
                                                            maxLines: 1,
                                                            overflow: TextOverflow.ellipsis,
                                                            style: TextStyle(
                                                              color: c.textPrimary,
                                                              fontWeight: AppTypography.bold,
                                                              fontSize: 16,
                                                            )),
                                                        if (apt.area != null || apt.rooms != null) ...[
                                                          const SizedBox(height: 2),
                                                          Text(
                                                            '${apt.area != null ? "${apt.area} ${AppLocalizations.tr('sq_meters')}" : ""}${apt.area != null && apt.rooms != null ? " • " : ""}${apt.rooms != null ? "${apt.rooms} ${AppLocalizations.tr('rooms_short')}" : ""}',
                                                            maxLines: 1,
                                                            overflow: TextOverflow.ellipsis,
                                                            style: TextStyle(
                                                              color: c.primary,
                                                              fontSize: 12,
                                                              fontWeight: AppTypography.medium,
                                                            ),
                                                          ),
                                                        ],
                                                      ],
                                                    ),
                                                  ),
                                                  TextButton.icon(
                                                    onPressed: () => _addResident(apt),
                                                    icon: Icon(LucideIcons.userPlus, size: 16, color: c.primary),
                                                    label: Text('Житель', style: TextStyle(color: c.primary)),
                                                  ),
                                                ],
                                              ),
                                              if (apt.occupants.isNotEmpty) ...[
                                                const SizedBox(height: 6),
                                                const Divider(height: 12),
                                                ...apt.occupants.map((occ) => Padding(
                                                      padding: const EdgeInsets.symmetric(vertical: 3),
                                                      child: Row(
                                                        children: [
                                                          Icon(LucideIcons.user, size: 15, color: c.textSecondary),
                                                          const SizedBox(width: 8),
                                                          Expanded(
                                                            child: Text(
                                                              occ.phone != null ? '${occ.fullName} (${occ.phone})' : occ.fullName,
                                                              maxLines: 1,
                                                              overflow: TextOverflow.ellipsis,
                                                              style: TextStyle(
                                                                color: c.textPrimary,
                                                                fontWeight: AppTypography.semibold,
                                                                fontSize: 14,
                                                              ),
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                    )),
                                              ] else ...[
                                                const SizedBox(height: 4),
                                                Text(
                                                  AppLocalizations.tr('owner_not_assigned'),
                                                  style: TextStyle(color: c.textTertiary, fontSize: 12),
                                                ),
                                              ],
                                            ],
                                          ),
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
              heroTag: 'add_apartment_fab',
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
