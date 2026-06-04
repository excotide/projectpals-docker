# ProjectPals — Flows & State Machine

> Inilah "flow" yang sebelumnya hanya ada di kepala / tersebar di kode React.
> Diekstrak dari `frontend/src/App.tsx`, `RoomDetailRouter.tsx`, `hooks/useRooms.ts`,
> `hooks/useAuth.ts`, dan `API.md`. Baca ini SEBELUM mengerjakan layar room/team.

---

## 0. Auth gate (route guard)

Semua route kecuali landing/login/register butuh token.

```
ada token di secure storage?
  ├─ tidak → redirect /login
  └─ ya    → lanjut. (kalau request balas 401 → hapus token, ke /login)
```

- `GET /api/auth/me` dipakai untuk memuat user aktif (hanya kalau token ada).
- Login sukses → simpan `token`, lalu (opsional) daftarkan FCM token (`POST /api/fcm/token`).
- Logout → `unregister FCM` dulu (token masih valid), lalu `POST /api/auth/logout`, lalu hapus token.

---

## 1. Room lifecycle — STATE MACHINE inti

Status room: `open → matching → ongoing → (closed)`.

```
            owner buat room
                  │
                  ▼
   ┌────────────────────────────┐
   │           OPEN             │  menerima member; owner bisa edit & kick
   │  member join via room_code │
   └──────────────┬─────────────┘
                  │ owner POST /rooms/{code}/match
                  │ (syarat matching terpenuhi — lihat §1.1)
                  ▼
   ┌────────────────────────────┐
   │      MATCHING / ONGOING    │  team sudah terbentuk
   │  semua orang lihat team    │  leader kelola proyek+target
   └──────────────┬─────────────┘
                  │ tiap leader POST /teams/{team}/finish
                  ▼
   ┌────────────────────────────┐
   │      FINISHED (per team)   │  fase feedback antar member
   │  team finished_at terisi   │  → muncul di /history
   └────────────────────────────┘
```

> Catatan: backend punya status `closed` juga, tapi flow user utama berputar di
> `open → matching → ongoing`. "Finished" adalah kondisi per-**team** (`finished_at`),
> bukan status room.

### 1.1 Syarat agar matching boleh jalan (validasi backend, tampilkan di UI)
Dari `algorithm.md` / `MatchingController`. Owner sebaiknya dicegah menekan "Match" jika belum:
- room milik owner & status = `open`
- minimal **2** anggota
- jumlah role ≥ 1 dan jumlah team (`number_of_groups`) ≥ 1
- `max_per_group` ≥ jumlah role
- jumlah anggota ≥ (jumlah team × jumlah role)  ← agar tiap role tercover di tiap team

Kalau gagal, backend balas `422`. Tampilkan pesannya.

---

## 2. Routing & redirect logic (PENTING — sumber "amburadul")

Saat user membuka detail sebuah room (`/rooms/{roomCode}`), tujuan layar **bergantung pada
role + status**. Ini logika dari `RoomDetailRouter.tsx` — replikasikan persis:

```
GET /api/rooms/{roomCode}  → { room, access:{ is_owner, is_member } }

if access.is_owner            → layar DetailOwnerRoom
else if room.status==ongoing  → redirect ke /rooms/{roomCode}/matched (MatchedRoomOverview)
else                          → layar DetailMemberRoom
```

Artinya:
- **Owner** selalu lihat panel owner (kelola room / lihat hasil match), apa pun statusnya.
- **Member** di room `open` → lihat info room & edit role/waktu sendiri.
- **Member** di room `ongoing` → langsung diarahkan ke tampilan team.

---

## 3. Peta layar ↔ endpoint ↔ aksi

Padanan 1:1 dengan `frontend/src/pages/`. Kolom "Hook React" menunjuk fungsi di
`hooks/useRooms.ts` / `useAuth.ts` agar mudah dilacak.

### Auth & shell
| Layar (Flutter) | Page React | Endpoint utama | Hook React |
|---|---|---|---|
| LandingScreen | `landing/LandingPage` | — | — |
| AuthScreen (login/register) | `auth/AuthPage` | `POST /auth/login`, `POST /auth/register` | `useLogin`, `useRegister` |
| DashboardScreen | `dashboard/Dashboard` | `GET /auth/me`, `GET /rooms/my-rooms` | `useCurrentUser`, `useMyRooms` |
| ProfileScreen | `profile/ProfilePage` | `GET /me/feedback-summary` | `useMyFeedbackSummary` |
| HistoryScreen | `history/HistoryPage` | `GET /history/teams` | `useTeamHistory` |

### Room — fase OPEN
| Layar | Page React | Endpoint | Hook |
|---|---|---|---|
| CreateRoomScreen | `rooms/CreateRoom` | `POST /rooms` | `useCreateRoom` |
| MyRoomsScreen | `rooms/MyRooms` | `GET /rooms/my-rooms` | `useMyRooms` |
| JoinPreviewScreen | `rooms/JoinRoom` | `GET /rooms/{code}/join-preview` (lazy) | `useJoinRoomPreview` |
| JoinRoomScreen | `rooms/JoinRoom` | `POST /rooms/join` | `useJoinRoom` / `useFinalizeJoinRoom` |
| RoomDetailRouter | `rooms/RoomDetailRouter` | `GET /rooms/{code}` | `useRoomByCode` |
| DetailOwnerRoomScreen | `rooms/DetailOwnerRoom` | `GET /rooms/{code}/members`, `PATCH /rooms/{code}`, `DELETE /rooms/{code}/members/{memberId}`, `POST /rooms/{code}/match` | `useRoomMembers`, `useUpdateRoom`, `useRemoveMember`, `useStartMatching` |
| DetailMemberRoomScreen | `rooms/DetailMemberRoom` | `GET /rooms/{code}`, `POST /rooms/{code}/leave` (atau `DELETE /rooms/{code}`) | `useRoomByCode`, `useDeleteOrLeaveRoom` |

### Team — fase ONGOING / FINISHED
| Layar | Page React | Endpoint | Hook |
|---|---|---|---|
| MatchedRoomOverviewScreen | `rooms/MatchedRoomOverview` | `GET /rooms/{code}/teams` | `useRoomTeams` |
| (panel leader) | (idem) | `PATCH /teams/{team}` (proyek), `POST /teams/{team}/transfer-leader`, `PATCH /teams/{team}/members/{rmId}/role` | `useUpdateTeam`, `useTransferLeader`, `useChangeMemberRole` |
| TargetsScreen/section | komponen `teams/` | `GET/POST /teams/{team}/targets`, `PATCH/DELETE /teams/{team}/targets/{target}`, `POST .../toggle` | `useTeamTargets`, `useCreate/Update/DeleteTeamTarget`, `useToggleTeamTarget` |
| FinishScreen/action | komponen `teams/` | `POST /teams/{team}/finish` | `useFinishTeam` |
| FeedbackScreen/section | komponen `teams/` | `GET /teams/{team}/feedbacks/status`, `/given`, `GET /teams/{team}/members/{rmId}/feedbacks`, `POST /teams/{team}/feedbacks` | `useFeedbackStatus`, `useFeedbacksGiven`, `useFeedbacksReceived`, `useGiveFeedback` |

---

## 4. Matriks izin aksi (role × status)

Siapa boleh apa. `403` dari backend = aksi tidak diizinkan untuk role itu.

| Aksi | Siapa | Status room |
|---|---|---|
| Edit room (theme, roles, max, jumlah group) | owner | open |
| Kick member | owner | open |
| Jalankan matching | owner | open (syarat §1.1) |
| Leave room | member | open |
| Lihat team | owner & member | ongoing |
| Edit proyek team (nama, deskripsi, deadline) | **leader** team itu | ongoing |
| CRUD target | **leader** | ongoing |
| Toggle target selesai | leader (anggota? cek backend) | ongoing |
| Transfer leader | leader | ongoing |
| Ubah assigned role member | leader | ongoing |
| Finish team | leader | ongoing |
| Beri feedback | tiap member ke rekan setim | setelah finish |

> "Leader" ditentukan backend saat matching (`is_leader` di `RoomTeamMember`). Bisa dipindah
> via transfer-leader. Owner room ≠ leader team (kecuali kebetulan sama).

---

## 5. Detail join flow (sering bikin bingung)

`JoinRoom` punya 2 langkah:
1. **Preview**: user masukkan `room_code` → `GET /rooms/{code}/join-preview` → balas `roles[]`
   yang tersedia. (Di React ini lazy query, `enabled:false`, dipanggil manual.)
2. **Finalize**: user pilih `primary_role`, `backup_roles[]`, `productivity_windows[]`,
   `environments[]` → `POST /rooms/join` dengan `room_code` + pilihan tsb.

Productivity windows & environments default `flexible`. Lihat enum di CLAUDE.md §6.

---

## 6. Model utama (bentuk data)

Ambil bentuk persis dari `hooks/useRooms.ts` (interface `Room`, `RoomDetail`, `RoomDetailResponse`,
`RoomTeam`, `RoomTeamMember`, `RoomMemberItem`, `TeamRoleTarget`, `TeamFeedback`,
`FeedbackStatusResponse`, `TeamHistoryItem`) dan response body di `API.md`. Catatan kunci:

- `RoomDetailResponse = { room: RoomDetail, access: { is_owner, is_member } }`
- `RoomTeamsResponse = { room, teams: RoomTeam[], unassigned: [] }`
- `RoomTeamMember` memakai **`room_member_id`** + `assigned_role` + `is_leader` + `score`.
- `FeedbackStatusResponse` punya `my_complete`, `my_missing_targets`, `missing_contributors`
  → dipakai untuk tahu apakah user sudah selesai memberi feedback.
