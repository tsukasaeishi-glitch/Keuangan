# FinZ — Smart Finance Tracker

FinZ adalah finance tracker responsif dengan light/dark mode, login, saldo bulanan, top-up, catatan belanja konsumsi dan non-konsumsi, nama toko, prediksi restock, dan wishlist cooldown.

## Jalankan lokal

Persyaratan: Node.js 20 atau lebih baru.

```bash
npm install
npm start
```

Buka [http://localhost:3000](http://localhost:3000). Server lokal menyimpan data di `data/db.json`. Untuk mengganti port di PowerShell, gunakan `$env:PORT=4000; npm start`.

## Deploy ke Netlify

Repositori ini sudah disiapkan sebagai situs statis plus Netlify Function, dengan Netlify Database (Postgres) untuk akun dan data aplikasi. Folder `public/` menjadi direktori publik, route `/api/*` diarahkan ke function, dan skema database dibuat dari migration yang ada di `netlify/database/migrations/`.

1. Simpan project ke GitHub atau GitLab dan push ke repository.
2. Di Netlify, pilih **Add new site → Import an existing project**, lalu hubungkan repository tersebut.
3. Biarkan Netlify membaca `netlify.toml`. Build command tidak diperlukan; direktori publish adalah `public` dan function berada di `netlify/functions`.
4. Pastikan paket `@netlify/database` tetap ada di `package.json`. Netlify menggunakan paket itu untuk menyediakan Database; deploy pertama menerapkan migration tabel FinZ.
5. Jalankan deploy. Setelah status deploy berhasil, buka URL HTTPS situs dan coba registrasi, logout, lalu login lagi.

Untuk mengembangkan secara lokal dengan function Netlify, jalankan `npm run dev:netlify`. Netlify CLI dapat meminta login dan menghubungkan folder ini ke situs Netlify. Mode lokal biasa (`npm start`) tetap memakai file `data/db.json`; data lokal dan data Netlify tersimpan terpisah. Lihat [panduan Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/) jika ingin mengelola database dan migration dari dashboard/CLI.

## Pasang di Android dan iPhone

FinZ dapat dipasang dari URL Netlify sebagai **PWA** setelah situs live dengan HTTPS. Ini membuat ikon aplikasi di layar utama, tetapi bukan file APK/IPA dan bukan publikasi ke Play Store/App Store.

- **Android:** buka URL situs di Chrome, pilih menu browser, lalu **Install app** atau **Add to Home screen**.
- **iPhone:** buka URL di Safari, ketuk **Bagikan → Tambahkan ke Layar Utama → Tambah**.

## Fitur

- Registrasi/login email dan password; password di-hash dengan scrypt, sesi memakai cookie HttpOnly yang tersimpan sebagai hash di database.
- Profil dengan username dan upload foto yang dapat dipreview.
- Saldo awal per bulan dan top-up kapan saja; saldo terhitung dari dana awal + top-up - pengeluaran.
- Pengeluaran konsumsi dengan merek, netto, estimasi durasi, cost per day, dan prediksi tanggal restock.
- Pengeluaran non-konsumsi dengan kategori; semua pengeluaran meminta nama toko/tempat pembelian.
- Transaksi menyimpan timestamp lengkap, tanggal, hari, dan waktu.
- Vibe Check finansial, breakdown konsumsi/non-konsumsi, tema light/dark, serta layout mobile/desktop.
- Wishlist dengan cooldown 48 jam; tandai pembelian akan mencatat transaksi dan nama tokonya.
- PWA dengan manifest, ikon Android/iPhone, dan cache shell antarmuka.

Google OAuth yang disebut dalam PRD belum diaktifkan karena proyek ini belum memiliki OAuth client yang dikonfigurasi.
