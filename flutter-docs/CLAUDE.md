# ProjectPals — Flutter App (CLAUDE.md)

> File ini di-load otomatis oleh Claude Code setiap sesi. Isinya = sumber kebenaran
> arsitektur & aturan untuk app Flutter. Jangan menebak flow — semuanya ada di sini,
> di `FLOWS.md`, dan di `API.md`.

## Apa ini

ProjectPals adalah platform kolaborasi tim. User membuat/gabung **room**, owner menjalankan
**smart matching** untuk membentuk **team**, lalu tiap team mengelola **target** per role dan
saling memberi **feedback** di akhir proyek. App Flutter ini adalah **client** dari backend
Laravel yang sudah ada — semua logika bisnis (matching, scoring, normalisasi role) ada di
backend. App ini hanya memanggil API dan menampilkan state.

- **Backend**: Laravel + Sanctum (Bearer token). Kontrak API lengkap ada di `API.md`.
- **Reference implementation flow**: frontend React di repo backend (`frontend/src/`).
  Kalau ragu soal urutan/aturan sebuah flow, React adalah acuan paling akurat.
- **State machine room + peta layar↔endpoint**: lihat `FLOWS.md`. **WAJIB dibaca**
  sebelum mengerjakan layar apa pun yang menyangkut room/team.

## Stack & arsitektur

- **State management: BLoC** (`flutter_bloc`). Satu fitur = satu Bloc/Cubit.
- **HTTP**: `dio` (atau `http`) dibungkus satu `ApiClient`.
- **Token storage**: `flutter_secure_storage` (JANGAN `SharedPreferences` untuk token).
- **Models**: plain Dart class + `fromJson`/`toJson`. Boleh `freezed`/`json_serializable`
  kalau sudah dipakai; ikuti yang sudah ada di repo.
- **Routing**: `go_router` (atau Navigator 2.0). Route guard cek token (lihat FLOWS §Auth gate).

### Layering (mirror dari React)

| React (`frontend/src/`)        | Flutter (`lib/`)                         |
|--------------------------------|------------------------------------------|
| `lib/api.ts` (apiRequest)      | `data/api_client.dart`                   |
| `lib/api.ts` `ApiError`        | `data/api_exception.dart`                |
| `hooks/useAuth`, `useRooms`    | `bloc/<fitur>/<fitur>_bloc.dart`         |
| response `interface`s          | `models/*.dart` (+ `fromJson`)           |
| `pages/*`                      | `screens/*`                              |
| `localStorage('token')`        | `flutter_secure_storage`                 |

Struktur folder yang disarankan:

```
lib/
  data/
    api_client.dart        # satu pintu semua HTTP
    api_exception.dart     # padanan ApiError
    token_storage.dart     # wrapper flutter_secure_storage
  models/                  # Room, RoomDetail, RoomTeam, TeamTarget, Feedback, ...
  repositories/            # AuthRepository, RoomRepository, TeamRepository
  bloc/                    # auth/, rooms/, room_detail/, teams/, targets/, feedback/
  screens/                 # padanan 1:1 dgn pages React (lihat FLOWS)
  widgets/                 # komponen reusable
  theme/                   # token warna dari design.md
```

## ATURAN KERAS (jangan dilanggar)

### 1. Kontrak response Laravel — unwrap "data"
Backend membungkus sebagian besar response dalam `{ "data": ... , "message": ..., "errors": ... }`,
**tapi tidak selalu**. `ApiClient` harus meniru perilaku React `apiRequest` persis:

> Kalau body JSON punya key `data`, ambil `body["data"]`. Kalau **tidak** punya key `data`,
> pakai seluruh body sebagai data.

Konsekuensi penting: endpoint **login/register TIDAK dibungkus `data`** — body-nya
`{ message, token, token_type, user }`. Jadi setelah unwrap, "data" = seluruh objek itu,
dan `token`/`user` diambil dari situ. Jangan berasumsi semua response punya `data`.

### 2. Auth header
Semua request protected kirim header `Authorization: Bearer <token>` dan `Accept: application/json`.
Token diambil dari secure storage. Endpoint publik (`auth=false`): register, login.

### 3. Error handling
HTTP non-2xx → lempar `ApiException(message, statusCode, payload)`.
- `422` → ambil `errors` (map field → list pesan) untuk validasi form.
- `401` → token invalid → logout + ke `/login`.
- `403` → bukan owner/leader yang berwenang (tampilkan pesan, jangan crash).
- `404` → resource tak ada **atau akses ditolak** (backend sengaja menyamarkan).

### 4. Identitas: `user_id` vs `room_member_id`
Ini sumber bug paling sering. Di dalam konteks room/team, member dirujuk dengan
**`room_member_id`**, BUKAN `user.id`. Endpoint kick member, transfer leader, ubah role,
dan feedback semuanya pakai `room_member_id`. Jangan tertukar.

### 5. Role itu string bebas + dinormalisasi backend
`roles` adalah list string (mis. `["Frontend", "Backend", "QA"]`) yang ditentukan owner saat
buat room. Backend menormalkan nama role; ada endpoint preview `POST /api/normalize-role`.
Jangan hardcode daftar role.

### 6. Enum yang valid (dari API.md → Referensi)
- **Room status**: `open` | `matching` | `ongoing` | `closed`
- **Productivity windows**: `morning` | `afternoon` | `evening` | `flexible`
- **Environments**: `private` | `public` | `online` | `flexible`

### 7. Jangan taruh logika bisnis di client
Matching, scoring, penentuan leader, normalisasi role = backend. App hanya POST `/match`
lalu tampilkan hasil dari `GET /teams`. Jangan coba mereplikasi algoritma di Dart.

## Cara kerja yang diharapkan (untuk Claude)

1. **Vertical slice, satu fitur penuh** — model → repository method → bloc → wiring ke UI
   yang sudah ada. Jangan kerjakan setengah-setengah lintas banyak fitur.
2. **Selalu mulai dari reference**: sebut page React + endpoint API.md yang relevan, lalu ikuti.
3. **Konsultasi `FLOWS.md`** untuk tahu layar mana memanggil endpoint apa, dengan role mana,
   pada status room mana.
4. Setelah implementasi, jalankan `flutter analyze` dan pastikan tidak ada error.

## Referensi cepat untuk endpoint
Daftar lengkap + request/response body ada di `API.md`. Peta layar→endpoint ada di `FLOWS.md`.
Base URL & prefix lewat env (`--dart-define=API_URL=...`), default prefix `/api`.
