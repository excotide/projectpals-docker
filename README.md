# ProjectPals Docker Setup

Panduan ini menjelaskan cara menjalankan seluruh stack ProjectPals menggunakan Docker.

## Services yang berjalan

`docker-compose.yaml` menjalankan 5 service:

- `app`: PHP-FPM (Laravel backend)
- `nginx`: web server untuk Laravel
- `db`: Oracle Free
- `node`: Vite dev server untuk backend Laravel (port 5174)
- `frontend`: React + Vite (port 5173)

## Prasyarat /

- Docker Desktop terpasang dan aktif
- Docker Compose (sudah include di Docker Desktop modern)

## Quick Start (First Run)

### 1) Buat file environment Laravel

Jalankan dari root project:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Lalu ubah konfigurasi database di `backend/.env` agar terhubung ke container Oracle:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=oracle
DB_HOST=db
DB_PORT=1521
DB_DATABASE=FREEPDB1
DB_SERVICE_NAME=FREEPDB1
DB_USERNAME=laravel
DB_PASSWORD=laravel123
```

### 2) Build dan jalankan semua container

```powershell
docker compose up -d --build
```

### 3) Install dependency PHP dan generate app key Laravel

```powershell
docker compose exec app composer install
docker compose exec app php artisan key:generate
```

### 4) Jalankan migration database

```powershell
docker compose exec app php artisan migrate
```

## Akses aplikasi

- Laravel (via Nginx): http://localhost:8000
- Frontend React (Vite): http://localhost:5173
- Backend Vite dev server: http://localhost:5174
- Oracle: localhost:1523

## Pakai Oracle Lokal (di Laptop)

Kalau kamu sudah punya Oracle lokal, backend di container tetap bisa pakai itu.

Atur di `backend/.env`:

```env
DB_CONNECTION=oracle
DB_HOST=host.docker.internal
DB_PORT=1521
DB_DATABASE=FREEPDB1
DB_SERVICE_NAME=FREEPDB1
DB_USERNAME=<user_oracle_kamu>
DB_PASSWORD=<password_oracle_kamu>
DB_CONNECT_TIMEOUT=5
```

Lalu restart app + nginx:

```powershell
docker compose up -d --force-recreate app nginx
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan config:cache
```

Catatan:
- `host.docker.internal` dipakai agar container bisa mengakses Oracle di host Windows.
- Pastikan listener Oracle lokal aktif dan menerima koneksi dari Docker.

## Deploy ke AWS (Ringkas)

Disarankan pakai Amazon RDS for Oracle agar tidak perlu kelola DB server sendiri.

Set environment production:

```env
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=oracle
DB_HOST=<rds-endpoint>
DB_PORT=1521
DB_DATABASE=<service_name_or_sid>
DB_SERVICE_NAME=<service_name>
DB_USERNAME=<db_user>
DB_PASSWORD=<db_password>
DB_CONNECT_TIMEOUT=5
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

Checklist deploy:
- Security Group EC2/ECS/Lambda harus boleh akses RDS Oracle port 1521.
- Jangan expose DB ke public internet kalau tidak perlu.
- Simpan secret di AWS Secrets Manager / SSM Parameter Store.
- Jalankan `php artisan config:cache` saat build/deploy.

## Perintah harian

### Menyalakan service

```powershell
docker compose up -d
```

## Checklist Benchmark Cepat

Gunakan ini setiap selesai restart stack untuk memastikan backend tidak kembali lemot.

1) Jalankan warm-up satu kali:

```powershell
docker compose up -d warmup
```

2) Cek health endpoint 5x:

```powershell
1..5 | ForEach-Object { curl.exe -s -o NUL -w "up code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}`n" http://localhost:8000/up }
```

3) Cek endpoint auth tanpa token 5x (harus 401, bukan 302):

```powershell
1..5 | ForEach-Object { curl.exe -s -o NUL -w "me code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}`n" http://localhost:8000/api/auth/me }
```

Target minimum dev lokal setelah warm-up:
- `/up` dan `/api/auth/me` stabil di bawah ~1 detik.
- Tidak ada status `504` di log nginx.

### Melihat log

```powershell
docker compose logs -f
```

Log service tertentu:

```powershell
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f db
docker compose logs -f frontend
docker compose logs -f node
```

### Masuk ke container app (Laravel)

```powershell
docker compose exec app sh
```

### Menjalankan test Laravel

```powershell
docker compose exec app php artisan test
```

### Mematikan service

```powershell
docker compose down
```

### Mematikan + hapus volume database (reset data)

```powershell
docker compose down -v
```

## Troubleshooting cepat

### Error MissingAppKeyException

Jalankan:

```powershell
docker compose exec app php artisan key:generate
```

### Gagal konek database dari Laravel

Pastikan nilai ini di `backend/.env`:

- `DB_HOST=db`
- `DB_PORT=1521`
- `DB_DATABASE=FREEPDB1`
- `DB_SERVICE_NAME=FREEPDB1`
- `DB_USERNAME=laravel`
- `DB_PASSWORD=laravel123`

Lalu restart service:

```powershell
docker compose restart app nginx db
```

### Port bentrok

Jika port `8000`, `5173`, `5174`, atau `3306` sudah dipakai proses lain, ubah mapping port di `docker-compose.yaml`, lalu jalankan ulang:

```powershell
docker compose up -d --build
```
