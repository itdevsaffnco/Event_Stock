#!/bin/sh
set -e

echo "==> Starting PHP-FPM..."
php-fpm -D

echo "==> Waiting for PHP-FPM..."
sleep 2

echo "==> Creating storage structure..."
mkdir -p storage/framework/sessions \
         storage/framework/views \
         storage/framework/cache/data \
         storage/logs \
         storage/app/public

chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

echo "==> Running migrations..."
php artisan migrate --force

echo "==> Linking storage..."
php artisan storage:link --force

echo "==> Clearing cache..."
php artisan optimize:clear

echo "==> Caching config, routes, views..."
php artisan optimize

echo "==> Starting Nginx..."
exec nginx -g "daemon off;"
