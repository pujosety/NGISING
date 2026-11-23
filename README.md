# Ngising — Pelacak Antrean Toilet Kantor Real-Time

Aplikasi manajemen antrean dan pelacakan **1 toilet kantor** secara real-time dengan dukungan akun karyawan, mode **Buku Tamu**, kuota harian maksimal **10x/hari**, leaderboard mingguan, dan **Admin Panel**.

## Menjalankan di Wasmer (Node.js + MySQL)

Agar backend (`server.ts`) berjalan dan terhubung ke database MySQL Wasmer:

1. Di **Build and Deployment -> Build settings** Wasmer, pastikan **Framework preset** bukan `node-static`, melainkan server Node.js/Express (atau custom non-static):
   - **Install command**: `npm install`
   - **Build command**: `npm run build`
   - **Start command**: `npm start` *(atau `npm run start:tsx` jika Node runtime di bawah v22.18)*
2. Hubungkan Managed MySQL Database Wasmer ke app sehingga environment variable berikut otomatis tersedia:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
3. *(Opsional)* Import skema & data awal dari `database/ngising.sql` via Wasmer DB Explorer (Adminer). Jika belum di-import, server otomatis membuat tabel dan akun admin bawaan saat pertama kali dijalankan.
4. Verifikasi setelah deploy dengan membuka `/api/health` — respons normal adalah `{"ok":true,"database":"mysql"}`.

## Akun Admin Bawaan

- **Nama**: `pujo`
- **Password**: `Sukangising`
