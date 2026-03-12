-- PostgreSQL schema for Zakat & Infaq Management System MVP

CREATE TABLE IF NOT EXISTS transaksi_zis (
    id SERIAL PRIMARY KEY,
    nama_kk VARCHAR(150) NOT NULL,
    jumlah_jiwa INTEGER NOT NULL CHECK (jumlah_jiwa > 0),
    jenis_bayar VARCHAR(10) NOT NULL CHECK (jenis_bayar IN ('Uang', 'Beras')),
    nominal_zakat NUMERIC(14,2) NOT NULL CHECK (nominal_zakat >= 0),
    nominal_infaq NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (nominal_infaq >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Optional indexes for faster read on common operations
CREATE INDEX IF NOT EXISTS idx_transaksi_zis_created_at ON transaksi_zis (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_zis_jenis_bayar ON transaksi_zis (jenis_bayar);
