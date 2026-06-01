# Algorithm Notes

Dokumen ini menjelaskan dua algoritma utama di ProjectPals: matching tim dan normalisasi role.

## 1) Algoritma Matching Tim

Implementasi utama:
- backend/app/Services/TeamFormation/TeamFormationService.php
- backend/app/Services/TeamFormation/ProfileClusterService.php
- backend/app/Services/TeamFormation/RoleAssignmentService.php
- backend/app/Services/TeamFormation/ScoringService.php
- backend/app/Http/Controllers/Api/MatchingController.php

### 1.1 Prasyarat Matching
Matching hanya berjalan bila kondisi berikut terpenuhi (MatchingController):
- room milik owner dan status room = open
- minimal 2 anggota
- jumlah role >= 1 dan jumlah team >= 1
- max_per_group >= jumlah role
- jumlah anggota >= (jumlah team x jumlah role) agar semua role ter-cover di tiap team

### 1.2 Fase 1: Profile Clustering
Tujuan: mengelompokkan member  ke K team berdasarkan kemiripan profil.
Profil = Productivity Windows + Work Environment.

Langkah:
1) Urutkan member secara deterministik berdasarkan id.
2) Hitung target ukuran tiap team: seimbang semaksimal mungkin, dibatasi max_per_group.
3) Pilih K seed (farthest-point seeding):
   - Seed pertama = member index 0.
   - Seed berikutnya = member dengan nilai kemiripan maksimum terendah terhadap seed yang sudah dipilih.
   - Jika member < K, seed terakhir diulang (cluster kosong tetap mungkin).
4) Assign sisa member ke cluster yang paling mirip (avg similarity terbesar) dan belum penuh.
   - Jika semua cluster penuh karena pembulatan, masuk ke cluster dengan ukuran terkecil.

Definisi similarity:
- setSim = Jaccard similarity antara dua set nilai
- Jika salah satu set mengandung "flexible", similarity = 1.0
- Jika kedua set kosong, similarity = 1.0
- profileSim = 0.5 * setSim(windows) + 0.5 * setSim(environments)

### 1.3 Fase 2: Role Assignment
Tujuan: setiap team men-cover semua role minimal 1x, lalu sisa member mengambil role terbaik.

Skor role (roleScore):
- roleAffinity(member, role):
  - primary_role = 1.0
  - backup_roles berurutan: 0.5, 0.4, 0.3, ... minimum 0.1
  - selain itu = 0.0
- reputation(member, role): rata-rata rating cross-room (0..1) dihitung dari feedback
- roleScore = roleAffinity + 0.3 * reputation

Langkah:
1) Precompute skor semua (member, role).
2) Coverage pass: urutkan role dari yang paling langka (jumlah member dengan skor > 0 paling sedikit).
   - Tie-break: urutan role di room.
   - Untuk tiap role, pilih member unassigned dengan skor tertinggi (tie-break id paling kecil).
3) Sisa member memilih role dengan skor tertinggi (duplikasi diizinkan).

### 1.4 Pemilihan Leader
Sesudah team terbentuk, leader dipilih per team (MatchingController):
- Utamakan member yang assigned_role == primary_role.
- Jika tidak ada, pakai semua member.
- Pilih skor terbesar sebagai leader.

### 1.5 Output Matching
- teams berisi member_id, assigned_role, dan score
- score_matrix untuk debugging (member_id x role)
- meta berisi parameter matching

Catatan: Ada implementasi alternatif SnakeDraftService, namun endpoint matching saat ini memakai TeamFormationService.

## 2) Algoritma Role Normalizer

Implementasi utama:
- backend/app/Services/RoleNormalizer.php

Tujuan: menormalkan input role bebas menjadi nama role canonical.

### 2.1 Proses Normalisasi
1) Clean input: trim + lowercase.
2) Fuzzy lookup ke CanonicalRole (token_sort_ratio >= 80):
   - token_sort_ratio: token diurutkan lalu dibandingkan dengan similar_text().
3) Jika tidak ada match, fallback AI (Groq) untuk menghasilkan role canonical.
4) Output AI disanitasi:
   - ambil baris pertama
   - jika format "x -> y" atau "x: y", ambil sisi kanan
   - lowercase, hapus karakter non alnum/spasi/hyphen
   - collapse spasi dan ambil maksimal 3 kata
5) Jika AI gagal, gunakan hasil clean input.
6) Jika mode persist aktif, role canonical baru disimpan ke tabel CanonicalRole.

### 2.2 Mode Preview vs Persist
- preview(): normalisasi read-only (tidak menulis ke database)
- normalize(): normalisasi untuk penyimpanan (menulis canonical role baru bila perlu)

### 2.3 Ringkas Alur
- Input role -> clean -> fuzzy match
- Jika gagal -> AI -> sanitize -> fuzzy match ulang -> simpan bila perlu
- Keluaran: role canonical yang stabil dan konsisten
