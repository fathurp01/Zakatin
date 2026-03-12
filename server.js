require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

function buildPgConfig() {
  const sslRequired =
    process.env.PGSSLMODE === 'require' ||
    (process.env.DATABASE_URL || '').includes('sslmode=require') ||
    (process.env.PGHOST || '').includes('supabase.co');

  const ssl = sslRequired
    ? {
        rejectUnauthorized: false,
      }
    : false;

  if (process.env.DATABASE_URL) {
    const dbUrl = new URL(process.env.DATABASE_URL);
    dbUrl.searchParams.delete('sslmode');
    dbUrl.searchParams.delete('sslcert');
    dbUrl.searchParams.delete('sslkey');
    dbUrl.searchParams.delete('sslrootcert');

    return {
      connectionString: dbUrl.toString(),
      ssl,
    };
  }

  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'zakat_db',
    ssl,
  };
}

const pool = new Pool(buildPgConfig());

app.use(express.json());
app.use(express.static(__dirname));

function hitungNominalZakat(jumlahJiwa, jenisBayar) {
  if (jenisBayar === 'Beras') {
    return jumlahJiwa * 2.5;
  }
  if (jenisBayar === 'Uang') {
    return jumlahJiwa * 42500;
  }
  throw new Error("jenis_bayar harus 'Uang' atau 'Beras'");
}

app.get('/api/transaksi', async (_req, res) => {
  try {
    const query = `
      SELECT id, nama_kk, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq, created_at
      FROM transaksi_zis
      ORDER BY created_at DESC, id DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('GET /api/transaksi error:', error);
    res.status(500).json({ message: 'Gagal mengambil data transaksi.' });
  }
});

app.post('/api/transaksi', async (req, res) => {
  try {
    const { nama_kk, jumlah_jiwa, jenis_bayar, nominal_infaq } = req.body;

    if (!nama_kk || typeof nama_kk !== 'string') {
      return res.status(400).json({ message: 'nama_kk wajib diisi.' });
    }

    const jumlahJiwaNum = Number(jumlah_jiwa);
    if (!Number.isInteger(jumlahJiwaNum) || jumlahJiwaNum <= 0) {
      return res.status(400).json({ message: 'jumlah_jiwa harus bilangan bulat > 0.' });
    }

    if (jenis_bayar !== 'Uang' && jenis_bayar !== 'Beras') {
      return res.status(400).json({ message: "jenis_bayar harus 'Uang' atau 'Beras'." });
    }

    const infaqNum = nominal_infaq === undefined || nominal_infaq === '' ? 0 : Number(nominal_infaq);
    if (Number.isNaN(infaqNum) || infaqNum < 0) {
      return res.status(400).json({ message: 'nominal_infaq harus angka >= 0.' });
    }

    const nominalZakat = hitungNominalZakat(jumlahJiwaNum, jenis_bayar);

    const insertQuery = `
      INSERT INTO transaksi_zis (nama_kk, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nama_kk, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq, created_at
    `;

    const values = [nama_kk.trim(), jumlahJiwaNum, jenis_bayar, nominalZakat, infaqNum];
    const { rows } = await pool.query(insertQuery, values);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('POST /api/transaksi error:', error);
    res.status(500).json({ message: 'Gagal menyimpan transaksi.' });
  }
});

app.put('/api/transaksi/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id tidak valid.' });
    }

    const { nama_kk, jumlah_jiwa, jenis_bayar, nominal_infaq } = req.body;

    if (!nama_kk || typeof nama_kk !== 'string') {
      return res.status(400).json({ message: 'nama_kk wajib diisi.' });
    }

    const jumlahJiwaNum = Number(jumlah_jiwa);
    if (!Number.isInteger(jumlahJiwaNum) || jumlahJiwaNum <= 0) {
      return res.status(400).json({ message: 'jumlah_jiwa harus bilangan bulat > 0.' });
    }

    if (jenis_bayar !== 'Uang' && jenis_bayar !== 'Beras') {
      return res.status(400).json({ message: "jenis_bayar harus 'Uang' atau 'Beras'." });
    }

    const infaqNum = nominal_infaq === undefined || nominal_infaq === '' ? 0 : Number(nominal_infaq);
    if (Number.isNaN(infaqNum) || infaqNum < 0) {
      return res.status(400).json({ message: 'nominal_infaq harus angka >= 0.' });
    }

    const nominalZakat = hitungNominalZakat(jumlahJiwaNum, jenis_bayar);

    const updateQuery = `
      UPDATE transaksi_zis
      SET nama_kk = $1,
          jumlah_jiwa = $2,
          jenis_bayar = $3,
          nominal_zakat = $4,
          nominal_infaq = $5
      WHERE id = $6
      RETURNING id, nama_kk, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq, created_at
    `;

    const values = [nama_kk.trim(), jumlahJiwaNum, jenis_bayar, nominalZakat, infaqNum, id];
    const { rows, rowCount } = await pool.query(updateQuery, values);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Data transaksi tidak ditemukan.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('PUT /api/transaksi/:id error:', error);
    res.status(500).json({ message: 'Gagal memperbarui transaksi.' });
  }
});

app.delete('/api/transaksi/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id tidak valid.' });
    }

    const { rowCount } = await pool.query('DELETE FROM transaksi_zis WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Data transaksi tidak ditemukan.' });
    }

    res.json({ message: 'Transaksi berhasil dihapus.' });
  } catch (error) {
    console.error('DELETE /api/transaksi/:id error:', error);
    res.status(500).json({ message: 'Gagal menghapus transaksi.' });
  }
});

app.get('/api/rekap', async (_req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*)::int AS total_kk,
        COALESCE(SUM(jumlah_jiwa), 0)::int AS total_jiwa,
        COALESCE(SUM(CASE WHEN jenis_bayar = 'Beras' THEN nominal_zakat ELSE 0 END), 0)::numeric AS total_beras,
        COALESCE(SUM(CASE WHEN jenis_bayar = 'Uang' THEN nominal_zakat ELSE 0 END), 0)::numeric AS total_uang_zakat,
        COALESCE(SUM(nominal_infaq), 0)::numeric AS total_infaq
      FROM transaksi_zis
    `;

    const { rows } = await pool.query(query);
    const data = rows[0];

    const totalDanaDistribusi = Number(data.total_uang_zakat) + Number(data.total_infaq);

    const distribusi = {
      fakir_miskin: Number((totalDanaDistribusi * 0.625).toFixed(2)),
      amil: Number((totalDanaDistribusi * 0.08).toFixed(2)),
      fisabilillah: Number((totalDanaDistribusi * 0.11).toFixed(2)),
      lainnya: Number((totalDanaDistribusi * 0.185).toFixed(2)),
    };

    res.json({
      total_kk: data.total_kk,
      total_jiwa: data.total_jiwa,
      total_beras: Number(data.total_beras),
      total_uang_zakat: Number(data.total_uang_zakat),
      total_infaq: Number(data.total_infaq),
      total_dana_distribusi: Number(totalDanaDistribusi.toFixed(2)),
      distribusi,
    });
  } catch (error) {
    console.error('GET /api/rekap error:', error);
    res.status(500).json({ message: 'Gagal mengambil data rekap.' });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log('Koneksi PostgreSQL berhasil.');
  } catch (error) {
    console.error('Server jalan, tapi gagal koneksi PostgreSQL:', error.message);
  }
});
