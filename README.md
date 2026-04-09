# ProjectPals Docker Setup

Panduan ini menjelaskan cara menjalankan seluruh stack ProjectPals menggunakan Docker.

## Services yang berjalan

`docker-compose.yaml` menjalankan 5 service:

- `app`: PHP-FPM (Laravel backend)
- `nginx`: web server untuk Laravel
- `db`: MySQL 8.4
- `node`: Vite dev server untuk backend Laravel (port 5174)
- `frontend`: React + Vite (port 5173)

## Prasyarat

- Docker Desktop terpasang dan aktif
- Docker Compose (sudah include di Docker Desktop modern)

## Quick Start (First Run)

### 1) Buat file environment Laravel

Jalankan dari root project:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Lalu ubah konfigurasi database di `backend/.env` agar terhubung ke container MySQL:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=backend
DB_USERNAME=laravel
DB_PASSWORD=laravel
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
- MySQL: localhost:3306

## Perintah harian

### Menyalakan service

```powershell
docker compose up -d
```

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
- `DB_PORT=3306`
- `DB_DATABASE=backend`
- `DB_USERNAME=laravel`
- `DB_PASSWORD=laravel`

Lalu restart service:

```powershell
docker compose restart app nginx db
```

### Port bentrok

Jika port `8000`, `5173`, `5174`, atau `3306` sudah dipakai proses lain, ubah mapping port di `docker-compose.yaml`, lalu jalankan ulang:

```powershell
docker compose up -d --build
```
