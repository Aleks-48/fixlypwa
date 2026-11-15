import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'api_client.dart';

@visibleForTesting
Future<OpenResult> Function(String path)? openProtectedFileOverride;

@visibleForTesting
Future<Directory> Function()? protectedTempDirOverride;

// ACCEPT-002: session headers must only be sent to our own backend.
Uri protectedFileUri(String url) {
  final lower = url.toLowerCase();
  if (url.isEmpty ||
      url.contains('\\') ||
      lower.contains('%2e') ||
      lower.contains('%2f') ||
      lower.contains('%5c')) {
    throw const FormatException('Недопустимый адрес вложения');
  }
  final rawPathPart = url
      .replaceFirst(RegExp(r'^(?:[a-zA-Z][a-zA-Z0-9+.-]*:)?//[^/?#]*'), '')
      .split(RegExp(r'[?#]'))
      .first;
  final rawParsed = Uri.tryParse(url);
  if (rawParsed == null ||
      rawParsed.userInfo.isNotEmpty ||
      RegExp(r'^(?:[a-zA-Z][a-zA-Z0-9+.-]*:)?//[^/?#]*@').hasMatch(url) ||
      rawPathPart.split('/').any((seg) => seg == '.' || seg == '..')) {
    throw const FormatException('Недопустимый адрес вложения');
  }

  final base = Uri.parse(ApiClient.instance.baseUrl);
  final uri = base.resolve(url);
  if ((uri.scheme != 'http' && uri.scheme != 'https') ||
      uri.userInfo.isNotEmpty ||
      uri.origin != base.origin ||
      uri.hasQuery ||
      uri.hasFragment ||
      uri.fragment.isNotEmpty) {
    throw const FormatException('Недопустимый адрес вложения');
  }
  final segments = uri.pathSegments;
  if (segments.length < 2 || segments.first != 'uploads') {
    throw const FormatException('Недопустимый адрес вложения');
  }
  final segmentRe = RegExp(r'^[\w.-]+$');
  for (final seg in segments.skip(1)) {
    if (!segmentRe.hasMatch(seg) ||
        seg == '.' ||
        seg == '..' ||
        seg.startsWith('.')) {
      throw const FormatException('Недопустимый адрес вложения');
    }
  }
  return uri;
}

Future<void> openProtectedFile(String url) async {
  final uri = protectedFileUri(url);
  final request = http.Request('GET', uri)..followRedirects = false;
  request.headers.addAll(await ApiClient.instance.authHeaders());
  final response = await ApiClient.instance
      .sendRaw(request, timeout: const Duration(seconds: 30));
  if (response.statusCode >= 300 && response.statusCode < 400) {
    throw ApiException(
      'BAD_RESPONSE',
      'Недопустимое перенаправление (${response.statusCode})',
      response.statusCode,
    );
  }
  if (response.statusCode != 200) {
    throw Exception('Файл недоступен (${response.statusCode})');
  }
  final bytes = <int>[];
  await for (final chunk
      in response.stream.timeout(const Duration(seconds: 30))) {
    if (bytes.length + chunk.length > 15 * 1024 * 1024) {
      throw Exception('Файл слишком большой');
    }
    bytes.addAll(chunk);
  }
  final baseDir = protectedTempDirOverride != null
      ? await protectedTempDirOverride!()
      : await getTemporaryDirectory();
  final dir = await baseDir.createTemp('fixly-');
  final name = uri.pathSegments.last;
  if (!RegExp(r'^[\w.-]+$').hasMatch(name) ||
      name == '.' ||
      name == '..' ||
      name.startsWith('.')) {
    throw const FormatException('Недопустимое имя');
  }
  final file = await File('${dir.path}/$name').writeAsBytes(bytes, flush: true);
  final result = openProtectedFileOverride != null
      ? await openProtectedFileOverride!(file.path)
      : await OpenFilex.open(file.path);
  if (result.type != ResultType.done) throw Exception(result.message);
}

class ProtectedImage extends StatelessWidget {
  final String url;
  final Widget placeholder;
  const ProtectedImage({super.key, required this.url, required this.placeholder});
  @override
  Widget build(BuildContext context) {
    Uri uri;
    try { uri = protectedFileUri(url); } catch (_) { return placeholder; }
    return FutureBuilder<Map<String, String>>(
      future: ApiClient.instance.authHeaders(),
      builder: (context, snapshot) => snapshot.hasData
        ? Image.network(uri.toString(), headers: snapshot.data, fit: BoxFit.cover,
            width: double.infinity, errorBuilder: (_, __, ___) => placeholder)
        : placeholder,
    );
  }
}
