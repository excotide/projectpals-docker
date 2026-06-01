FROM php:8.5-fpm AS base

# ── System dependencies ──────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    git curl unzip zip \
    libzip-dev libpng-dev libonig-dev libxml2-dev \
    libaio1t64 wget \
    && if [ -e /usr/lib/x86_64-linux-gnu/libaio.so.1t64 ] && [ ! -e /usr/lib/x86_64-linux-gnu/libaio.so.1 ]; then ln -s /usr/lib/x86_64-linux-gnu/libaio.so.1t64 /usr/lib/x86_64-linux-gnu/libaio.so.1; fi \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Oracle Instant Client ─────────────────────────────────────────
ENV ORACLE_HOME=/opt/oracle/instantclient_21_15
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_15

RUN mkdir -p /opt/oracle && \
    wget -q https://download.oracle.com/otn_software/linux/instantclient/2115000/instantclient-basic-linux.x64-21.15.0.0.0dbru.zip -O /tmp/ic-basic.zip && \
    wget -q https://download.oracle.com/otn_software/linux/instantclient/2115000/instantclient-sdk-linux.x64-21.15.0.0.0dbru.zip -O /tmp/ic-sdk.zip && \
    unzip -q /tmp/ic-basic.zip -d /opt/oracle && \
    unzip -q /tmp/ic-sdk.zip -d /opt/oracle && \
    rm /tmp/ic-basic.zip /tmp/ic-sdk.zip && \
    echo /opt/oracle/instantclient_21_15 > /etc/ld.so.conf.d/oracle.conf && \
    ldconfig

# ── PHP Extensions ────────────────────────────────────────────────
RUN echo "instantclient,/opt/oracle/instantclient_21_15" | pecl install oci8 && \
    docker-php-ext-enable oci8 && \
    docker-php-ext-install mbstring bcmath exif pcntl gd zip

# ── Composer ──────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/conf.d/performance.ini /usr/local/etc/php/conf.d/99-performance.ini
COPY docker/php-fpm/zz-www.conf /usr/local/etc/php-fpm.d/zz-www.conf

WORKDIR /var/www/html

# ── Production image ──────────────────────────────────────────────
# Bakes the application code + prod dependencies into the image so the EC2
# host can simply pull from ECR (no bind-mount). The dev compose targets the
# `base` stage instead and bind-mounts ./backend over this code.
FROM base AS production

# Install PHP deps first (better layer caching), then copy the rest of the app.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .

RUN composer dump-autoload --optimize --no-dev \
    && composer run-script post-autoload-dump --no-interaction \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache