FROM nginx:1.27-alpine

# openssl — для генерации self-signed сертификата при локальном запуске.
RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf
# Убираем стоковый default.conf (welcome-страница на :80), иначе он перехватывает HTTP до
# нашего 301-редиректа на HTTPS.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY app.conf /etc/nginx/conf.d/app.conf
# Скрипт официального образа nginx выполняет всё из /docker-entrypoint.d/*.sh перед стартом.
COPY 40-selfsigned.sh /docker-entrypoint.d/40-selfsigned.sh
RUN chmod +x /docker-entrypoint.d/40-selfsigned.sh
