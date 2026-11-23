# Ngising — Pelacak Antrean Toilet Kantor Real-Time

Aplikasi manajemen antrean dan pelacakan **1 toilet kantor** secara real-time dengan dukungan akun karyawan, mode **Buku Tamu**, kuota harian maksimal **10x/hari**, leaderboard mingguan, dan **Admin Panel**.

## Menjalankan di Wasmer (Node.js + MySQL)

Agar backend (`server.ts`) berjalan dan terhubung ke database MySQL Wasmer:

1. **Pastikan struktur folder GitHub benar**:
   - File `package.json`, `server.ts`, dan `Dockerfile` harus berada langsung di **root** repository GitHub (bukan di dalam subfolder seperti `ngising/package.json`).
   - Jika project ada di dalam subfolder GitHub, isi **Root directory** di Wasmer dengan nama subfolder tersebut. Jika sudah di root, **kosongkan** field **Root directory** (jangan isi `/`, `dist`, atau `src`).
2. Di **Build and Deployment -> Build settings** Wasmer:
   - Pastikan **Framework preset** bukan `node-static`: pilih preset **Node.js / Express** (atau **Docker / Dockerfile** jika tersedia; klik **Detect build settings** setelah mengubah preset/root directory).
   - Untuk preset Node.js:
     - **Install command**: `npm install`
     - **Build command**: `npm run build`
     - **Start command**: `npm start` *(atau `npm run start:tsx` jika runtime Node di bawah v22.18)*
   - Jika muncul error `ENOENT: no such file or directory, open '/opt/temp/package.json'`: hampir selalu disebabkan **Root directory** tidak cocok dengan lokasi `package.json` di branch `main` GitHub, atau preset masih memakai mode statis saat perintah custom diisi — pastikan `package.json` ada di root branch `main`, kosongkan **Root directory**, lalu klik **Detect build settings** dan **Save changes** sebelum redeploy.
3. Hubungkan Managed MySQL Database Wasmer ke app sehingga environment variable berikut otomatis tersedia:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
4. *(Opsional)* Import skema & data awal dari `database/ngising.sql` via Wasmer DB Explorer (Adminer). Jika belum di-import, server otomatis membuat tabel dan akun admin bawaan saat pertama kali dijalankan.
5. Verifikasi setelah deploy dengan membuka `/api/health` — respons normal adalah `{"ok":true,"database":"mysql"}`.

## Akun Admin Bawaan

- **Nama**: `pujo`
- **Password**: `Sukangising`
