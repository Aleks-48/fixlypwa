import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter/services.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:html/parser.dart' as html;
import 'package:http/http.dart' as http;
import 'api_client.dart';

@visibleForTesting
Future<OpenResult> Function(String path)? openFileOverride;

@visibleForTesting
Future<Directory> Function()? tempDirOverride;

Future<OpenResult> _openFile(String path) =>
    openFileOverride != null ? openFileOverride!(path) : OpenFilex.open(path);

Future<Directory> _tempDir() =>
    tempDirOverride != null ? tempDirOverride!() : getTemporaryDirectory();

String _sanitizeFileName(String name) {
  final sanitized = name
      .replaceAll(RegExp(r'[^\w.-]'), '_')
      .replaceAll('..', '_')
      .replaceAll(RegExp(r'^\.+'), '');
  return sanitized.isEmpty ? 'document' : sanitized;
}

Future<void> openPdf(List<String> rows, String name) async {
  final font =
      pw.Font.ttf(await rootBundle.load('assets/receipt/Roboto-Regular.ttf'));
  final pdf = pw.Document();
  pdf.addPage(pw.MultiPage(
      theme: pw.ThemeData.withFont(base: font),
      build: (_) => rows
          .map((line) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 8),
              child: pw.Text(line)))
          .toList()));
  final dir = await (await _tempDir()).createTemp('fixly-');
  final safeName = _sanitizeFileName(name);
  final file =
      await File('${dir.path}/$safeName.pdf').writeAsBytes(await pdf.save());
  final result = await _openFile(file.path);
  if (result.type != ResultType.done) throw StateError(result.message);
}

enum ServerDocument { annualReport, apartmentTemplate }

Future<http.Response> _fetchAuthorizedDocument(String path) async {
  final api = ApiClient.instance;
  final req = http.Request('GET', Uri.parse('${api.baseUrl}$path'))
    ..followRedirects = false
    ..headers.addAll(await api.authHeaders());
  final streamed = await api.sendRaw(req, timeout: const Duration(seconds: 20));
  final response = await http.Response.fromStream(streamed)
      .timeout(const Duration(seconds: 30));
  if (response.statusCode >= 300 && response.statusCode < 400) {
    throw ApiException(
      'BAD_RESPONSE',
      'Недопустимое перенаправление (${response.statusCode})',
      response.statusCode,
    );
  }
  if (response.statusCode != 200) {
    throw ApiException('DOWNLOAD', 'Документ недоступен', response.statusCode);
  }
  return response;
}

Future<void> openServerDocument(ServerDocument doc) async {
  final report = doc == ServerDocument.annualReport;
  final path = report ? '/api/reports/annual' : '/api/apartments/template';
  final response = await _fetchAuthorizedDocument(path);
  if (report) {
    final body =
        html.parse(utf8.decode(response.bodyBytes, allowMalformed: true)).body;
    final rows = (body?.querySelectorAll(
              '.title,.subtitle,.section-title,.card,tr,p,.signatures',
            ) ??
            const [])
        .map((node) => node.text.replaceAll(RegExp(r'\s+'), ' ').trim())
        .where((s) => s.isNotEmpty)
        .toList();
    if (rows.isEmpty) {
      throw ApiException('BAD_RESPONSE', 'Пустой отчёт', 500);
    }
    await openPdf(['Годовой отчёт', ...rows], 'annual-report');
  } else {
    final dir = await (await _tempDir()).createTemp('fixly-');
    final file = await File('${dir.path}/fixly_apartments_template.csv')
        .writeAsBytes(response.bodyBytes);
    final result = await _openFile(file.path);
    if (result.type != ResultType.done) throw StateError(result.message);
  }
}

Future<void> openPricingInvoice({
  String plan = 'standard',
  required int apartments,
  required int months,
  required bool useRef,
}) async {
  final path =
      '/api/pricing/invoice?plan=${Uri.encodeQueryComponent(plan)}'
      '&apartments=$apartments&months=$months&useRef=$useRef';
  final response = await _fetchAuthorizedDocument(path);
  final body =
      html.parse(utf8.decode(response.bodyBytes, allowMalformed: true)).body;
  final rows =
      (body?.querySelectorAll('.title,.details,.box,tr,.total,.footer') ??
              const [])
          .where((node) =>
              !(node.classes.contains('details') &&
                  node.querySelector('.box') != null))
          .map((node) => node.text.replaceAll(RegExp(r'\s+'), ' ').trim())
          .where((s) => s.isNotEmpty)
          .toList();
  if (rows.isEmpty) {
    throw ApiException('BAD_RESPONSE', 'Пустой счёт на оплату', 500);
  }
  await openPdf(['Счёт на оплату', ...rows], 'invoice-$plan');
}
