#!/bin/sh
# Генерирует self-signed сертификат для локального HTTPS, если его ещё нет в томе.
# В проде этот файл заменяется реальным сертификатом Let's Encrypt (README).
set -e

CERT_DIR=/etc/nginx/certs
CRT="$CERT_DIR/self.crt"
KEY="$CERT_DIR/self.key"

mkdir -p "$CERT_DIR"

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "nginx: генерирую self-signed сертификат (локальный HTTPS)…"
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$KEY" -out "$CRT" \
    -days 365 \
    -subj "/C=KZ/ST=Akmola/L=Kokshetau/O=OSI/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi
