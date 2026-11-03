import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'api_client.dart';

// ACCEPT-002: session headers must only be sent to our own backend.
Uri protectedFileUri(String url) {
  final base = Uri.parse(ApiClient.instance.baseUrl);
  final uri = base.resolve(url);
  if (uri.origin != base.origin || !uri.path.startsWith('/uploads/')) {
    throw const FormatException('Недопустимый адрес вложения');
  }
  return uri;
}

Future<void> openProtectedFile(String url) async {
  final uri = protectedFileUri(url);
  final client = http.Client();
  try {
    final request = http.Request('GET', uri)..followRedirects = false;
    request.headers.addAll(await ApiClient.instance.authHeaders());
    final response = await client.send(request).timeout(const Duration(seconds: 30));
    if (response.statusCode != 200) throw Exception('Файл недоступен (${response.statusCode})');
    final bytes = <int>[];
    await for (final chunk in response.stream.timeout(const Duration(seconds: 30))) {
      if (bytes.length + chunk.length > 15 * 1024 * 1024) throw Exception('Файл слишком большой');
      bytes.addAll(chunk);
    }
    final dir = await getTemporaryDirectory();
    final name = uri.pathSegments.last;
    if (!RegExp(r'^[\w.-]+$').hasMatch(name)) throw const FormatException('Недопустимое имя');
    final file = await File('${dir.path}/$name').writeAsBytes(bytes, flush: true);
    final result = await OpenFilex.open(file.path);
    if (result.type != ResultType.done) throw Exception(result.message);
  } finally { client.close(); }
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
