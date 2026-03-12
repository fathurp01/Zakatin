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
- App: `http://localhost:3000`
- API Rekap: `http://localhost:3000/api/rekap`

## Contoh Payload POST

`POST /api/transaksi`

```json
{
  "nama_kk": "Bapak Ahmad",
  "jumlah_jiwa": 4,
  "jenis_bayar": "Uang",
  "nominal_infaq": 50000
}
```

## Catatan Upload ke GitHub

- File `.env` sudah di-ignore dan tidak ikut ter-upload.
- Gunakan `.env.example` untuk membagikan contoh konfigurasi.
- Pastikan password/database credential asli tidak ditaruh di file lain.
