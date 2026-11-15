import 'dart:convert';
import 'dart:io';

import 'main.dart' as fixly;

// Only the local iPhone build adds the Mac server's certificate authority.
Future<void> main() async {
  const certificate = String.fromEnvironment('FIXLY_LAN_CA_DER');
  final context = SecurityContext.defaultContext;
  try {
    context.setTrustedCertificatesBytes(base64Decode(certificate));
  } on TlsException {
    const pem = '-----BEGIN CERTIFICATE-----\n$certificate\n-----END CERTIFICATE-----\n';
    context.setTrustedCertificatesBytes(ascii.encode(pem));
  }
  fixly.main();
}
