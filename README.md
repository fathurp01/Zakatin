# Zakat & Infaq Management System (MVP)

MVP aplikasi pengelolaan Zakat dan Infaq berbasis:
- Backend: Express.js (`server.js`)
- Database: PostgreSQL (`pg`)
- Frontend: Vanilla HTML/CSS/JS (`index.html`)

Project ini sengaja dibuat sederhana untuk kebutuhan cepat:
- Tanpa authentication
- Tanpa role user
- Struktur file minimal

## Fitur

- `GET /api/transaksi`: ambil semua data transaksi
- `POST /api/transaksi`: simpan transaksi baru + hitung otomatis `nominal_zakat`
- `DELETE /api/transaksi/:id`: hapus transaksi
- `GET /api/rekap`: rekap total dan distribusi dana
- Proteksi admin dengan token (`ADMIN_TOKEN`)
- Cetak kwitansi per transaksi dengan nomor otomatis `KH-YYYY-XXXX`
- Export print rekap muzaqi (tanpa infaq, untuk laporan kelurahan)
- Export print rekap distribusi zakat (uang & beras)
- Halaman monitor warga (read-only) di `/monitor.html` untuk dibagikan (misal ke grup WA)

### Rule Perhitungan Zakat

- Jika `jenis_bayar = Beras`: `nominal_zakat = jumlah_jiwa * 2.5` (kg)
- Jika `jenis_bayar = Uang`: `nominal_zakat = jumlah_jiwa * 40000` (Rupiah)

### Rule Distribusi Rekap

- Fakir Miskin: 62.5%
- Amil: 8%
- Fisabilillah: 11%
- Lainnya: 18.5%

## Struktur File

- `server.js` -> backend Express + API + business logic
- `index.html` -> frontend dashboard/form/table
- `schema.sql` -> SQL schema PostgreSQL
- `.env.example` -> template environment variable

## Setup Lokal

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari `.env.example`, lalu isi sesuai PostgreSQL lokal:

```env
PORT=3000
ADMIN_TOKEN=replace_with_secure_admin_token
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=zakat_db
```

3. Buat database `zakat_db` di PostgreSQL.

4. Jalankan isi `schema.sql` ke database `zakat_db` (via pgAdmin Query Tool atau `psql`).

5. Jalankan aplikasi:

```bash
npm start
```

6. Akses:
- App Admin (butuh token): `http://localhost:3000/?key=YOUR_ADMIN_TOKEN`
- Monitor Warga (publik/read-only): `http://localhost:3000/monitor.html`
- API Rekap: `http://localhost:3000/api/rekap`

## Endpoint Monitor Publik

- `GET /api/public/transaksi`
- `GET /api/public/rekap`

Endpoint publik hanya read-only untuk kebutuhan halaman monitor warga.

## Contoh Payload POST

`POST /api/transaksi`

```json
{
  "nama_kk": "Bapak Ahmad",
  "alamat_muzaqi": "Jl. Melati No. 10",
  "jumlah_jiwa": 4,
  "jenis_bayar": "Uang",
  "nominal_infaq": 50000
}
```

## Catatan Upload ke GitHub

- File `.env` sudah di-ignore dan tidak ikut ter-upload.
- Gunakan `.env.example` untuk membagikan contoh konfigurasi.
- Pastikan password/database credential asli tidak ditaruh di file lain.

## Deploy ke Vercel

Project ini sudah disiapkan agar bisa jalan di Vercel dengan entrypoint serverless `api/index.js`.

### 1) Push ke GitHub

Pastikan seluruh perubahan terbaru sudah ter-push ke repository GitHub.

### 2) Import Project ke Vercel

1. Buka dashboard Vercel.
2. Klik **Add New -> Project**.
3. Pilih repository ini.
4. Framework preset biarkan **Other**.

### 3) Set Environment Variables di Vercel

Tambahkan variabel berikut pada menu **Settings -> Environment Variables**:

- `DATABASE_URL`
- `PGSSLMODE` dengan nilai `require`
- `ADMIN_TOKEN`

Opsional (tidak wajib di Vercel):
- `PORT`

### 4) Deploy

Klik **Deploy**. Jika sukses, Vercel akan memberi URL production.

### 5) Akses Aplikasi

- Admin: `https://domain-kamu.vercel.app/?key=ADMIN_TOKEN_KAMU`
- Monitor publik: `https://domain-kamu.vercel.app/monitor.html`

### 6) Redeploy setelah update

Setiap push baru ke branch yang terhubung akan otomatis memicu deploy ulang.
