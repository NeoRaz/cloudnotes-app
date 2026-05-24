# ===========================
# Stage 1: Composer Dependencies
# ===========================
FROM composer:2 AS vendor
WORKDIR /app

# Copy composer files first
COPY composer.json composer.lock ./

# Copy the rest of the app (needed for autoload files like helpers.php)
COPY . .

# Install PHP dependencies (no dev for production)
RUN composer install --no-dev --optimize-autoloader --ignore-platform-reqs


# ===========================
# Stage 2: PHP Application
# ===========================
FROM php:8.4-fpm
WORKDIR /var/www/html

# Install PHP extensions and utilities
RUN apt-get update && apt-get install -y \
    git unzip libpq-dev libzip-dev zip curl netcat-openbsd redis-tools \
    && docker-php-ext-install pdo pdo_mysql \
    && docker-php-ext-install pdo_pgsql \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

# Increase PHP upload limits
RUN echo "upload_max_filesize = 100M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

# Copy vendor from composer stage
COPY --from=vendor /app/vendor ./vendor

# Copy application source
COPY . .

# 🧹 Remove cached bootstrap files
RUN rm -rf bootstrap/cache/*.php

# Fix Laravel permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Default command
CMD ["php-fpm"]
