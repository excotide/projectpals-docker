# flutter-docs — paket konteks untuk app Flutter ProjectPals

Tujuan folder ini: **menghentikan kebiasaan mengajari Claude Code flow dari nol setiap sesi.**
Drop file-file ini ke repo Flutter, dan Claude di sana langsung paham flow tanpa diajari ulang.

## Isi

| File | Fungsi | Taruh di mana (repo Flutter) |
|------|--------|------------------------------|
| `CLAUDE.md` | Memory project — di-load otomatis tiap sesi. Arsitektur (Bloc), aturan keras, layering. | **root repo Flutter** (jadi `CLAUDE.md`) |
| `FLOWS.md` | State machine room + peta layar↔endpoint↔role. Inti "flow". | root repo Flutter |
| `API.md` | Kontrak API lengkap (copy dari repo backend ini). | root repo Flutter |

## Cara pakai

1. Salin ketiga file ke root repo Flutter-mu:
   ```
   cp flutter-docs/CLAUDE.md   <repo-flutter>/CLAUDE.md
   cp flutter-docs/FLOWS.md    <repo-flutter>/FLOWS.md
   cp API.md                   <repo-flutter>/API.md
   ```
2. Sesuaikan bagian yang ditandai di `CLAUDE.md` (mis. nama package state-management kalau
   ternyata bukan `flutter_bloc`, struktur folder kalau sudah terlanjur beda).
3. Mulai kerja per-fitur dengan prompt yang menunjuk reference. Contoh prompt bagus:

   > "Implementasikan flow **Join Room**. Reference: `FLOWS.md §5` + page React
   > `frontend/src/pages/rooms/JoinRoom.tsx` + endpoint `GET /rooms/{code}/join-preview`
   > dan `POST /rooms/join` di `API.md`. Ikuti pola ApiClient & Bloc di `CLAUDE.md`."

## Urutan implementasi yang disarankan (vertical slice)

Bangun pondasi dulu, baru fitur dari yang paling sederhana ke kompleks:

1. **Pondasi**: `ApiClient` (+ unwrap `data`, lihat CLAUDE §ATURAN 1), `ApiException`,
   `TokenStorage`, theme dari `design.md`.
2. **Auth**: login/register/me/logout + route guard (`FLOWS §0`).
3. **Dashboard + MyRooms**: list room (`GET /rooms/my-rooms`).
4. **Create Room**.
5. **Join Room** (2 langkah, `FLOWS §5`).
6. **Room detail router** (`FLOWS §2`) → Owner vs Member.
7. **Matching** (owner, syarat `FLOWS §1.1`).
8. **Matched overview + Team** (targets, leader actions).
9. **Finish + Feedback**.
10. **History + Profile**.

Tiap langkah = satu slice utuh (model → repository → bloc → wiring UI), diverifikasi
`flutter analyze` sebelum lanjut.

## Kenapa ini menyelesaikan masalahmu

- "Harus mengajari Claude flow lagi" → flow sekarang tertulis di `FLOWS.md` (state machine +
  peta layar↔endpoint↔role), dan `CLAUDE.md` ke-load otomatis. Konteks jadi persisten.
- "Flow logic amburadul" → ada satu sumber kebenaran: redirect logic (`§2`), matriks izin
  (`§4`), dan syarat matching (`§1.1`) tidak lagi ditebak.
- Reference selalu tersedia: kalau Claude ragu, ada page React yang sudah jalan untuk ditiru.
