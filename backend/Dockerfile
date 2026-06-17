FROM php:8.2-fpm-alpine

# System dependencies
RUN apk add --no-cache \
    nginx \
    curl \
    git \
    libpng-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libxml2-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    sqlite \
    sqlite-dev \
    mysql-client

# PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_sqlite \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        xml \
        zip \
        fileinfo \
        intl

# PHP config: increase memory & execution time for Excel export
RUN printf "[PHP]\nmemory_limit = 256M\nmax_execution_time = 120\nupload_max_filesize = 50M\npost_max_size = 50M\n" \
    > /usr/local/etc/php/conf.d/app.ini

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install dependencies first (layer cache)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

COPY . .

# Post-install scripts
RUN composer dump-autoload --optimize --no-dev

# Permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache \
    && chmod +x /var/www/html/deploy.sh

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["/var/www/html/deploy.sh"]
