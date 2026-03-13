require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function isValidDateString(value) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(value) && !Number.isNaN(Date.parse(value));
}

function parseDateRange(req, res) {
  const { start_date: startDate, end_date: endDate } = req.query;

  if (startDate && !isValidDateString(startDate)) {
    res.status(400).json({ message: 'start_date tidak valid. Gunakan format YYYY-MM-DD.' });
    return null;
  }

  if (endDate && !isValidDateString(endDate)) {
    res.status(400).json({ message: 'end_date tidak valid. Gunakan format YYYY-MM-DD.' });
    return null;
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    res.status(400).json({ message: 'start_date tidak boleh lebih besar dari end_date.' });
    return null;
  }

  return { startDate, endDate };
}

function buildDateFilter(startDate, endDate) {
  const whereClause = [];
  const values = [];

  if (startDate) {
    values.push(startDate);
    whereClause.push(`created_at >= $${values.length}::date`);
  }

  if (endDate) {
    values.push(endDate);
    whereClause.push(`created_at < ($${values.length}::date + interval '1 day')`);
  }

  const whereSql = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
  return { whereSql, values };
}

async function queryTransaksiByDate(startDate, endDate) {
  const { whereSql, values } = buildDateFilter(startDate, endDate);
  const query = `
    SELECT id, nama_kk, alamat_muzaqi, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq, created_at
    FROM transaksi_zis
    ${whereSql}
    ORDER BY created_at DESC, id DESC
  `;
  const { rows } = await pool.query(query, values);
  return rows;
}

async function queryRekapByDate(startDate, endDate) {
  const { whereSql, values } = buildDateFilter(startDate, endDate);
  const query = `
    SELECT
      COUNT(*)::int AS total_kk,
      COALESCE(SUM(jumlah_jiwa), 0)::int AS total_jiwa,
      COALESCE(SUM(CASE WHEN jenis_bayar = 'Beras' THEN nominal_zakat ELSE 0 END), 0)::numeric AS total_beras,
      COALESCE(SUM(CASE WHEN jenis_bayar = 'Uang' THEN nominal_zakat ELSE 0 END), 0)::numeric AS total_uang_zakat,
      COALESCE(SUM(nominal_infaq), 0)::numeric AS total_infaq
    FROM transaksi_zis
    ${whereSql}
  `;
  const { rows } = await pool.query(query, values);
  return rows[0];
}

function extractAdminToken(req) {
  const tokenFromHeader = req.get('x-admin-token');
  const tokenFromQuery = req.query.key;
  return tokenFromHeader || tokenFromQuery || '';
}

function ensureAdminTokenConfigured(res) {
  if (ADMIN_TOKEN) {
    return true;
  }

  res.status(500).json({ message: 'ADMIN_TOKEN belum dikonfigurasi di environment.' });
  return false;
}

function requireAdminApi(req, res, next) {
  if (!ensureAdminTokenConfigured(res)) {
    return;
  }

  const token = extractAdminToken(req);
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ message: 'Akses admin ditolak. Token tidak valid.' });
  }

  next();
}

function requireAdminPage(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res
      .status(500)
      .send('ADMIN_TOKEN belum diset. Tambahkan ADMIN_TOKEN pada file .env terlebih dahulu.');
  }

  const token = extractAdminToken(req);
  if (token !== ADMIN_TOKEN) {
    return res
      .status(403)
      .send('Akses admin ditolak. Gunakan link admin dengan token valid, contoh: /?key=TOKEN_ANDA');
  }

  next();
}

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
let initPromise;

async function ensureSchemaCompatibility() {
  await pool.query(`
    ALTER TABLE transaksi_zis
    ADD COLUMN IF NOT EXISTS alamat_muzaqi VARCHAR(255) NOT NULL DEFAULT '-'
  `);
}

async function initApp() {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureSchemaCompatibility();
      await pool.query('SELECT 1');
    })();
  }

  return initPromise;
}

app.use(express.json());

function hitungNominalZakat(jumlahJiwa, jenisBayar) {
  if (jenisBayar === 'Beras') {
    return jumlahJiwa * 2.5;
  }
  if (jenisBayar === 'Uang') {
    return jumlahJiwa * 42500;
  }
  throw new Error("jenis_bayar harus 'Uang' atau 'Beras'");
}

app.get('/api/public/transaksi', async (req, res) => {
  try {
    const dateRange = parseDateRange(req, res);
    if (!dateRange) return;

    const rows = await queryTransaksiByDate(dateRange.startDate, dateRange.endDate);
    res.json(rows);
  } catch (error) {
    console.error('GET /api/public/transaksi error:', error);
    res.status(500).json({ message: 'Gagal mengambil data transaksi.' });
  }
});

app.get('/api/transaksi', requireAdminApi, async (req, res) => {
  try {
    const dateRange = parseDateRange(req, res);
    if (!dateRange) return;

    const rows = await queryTransaksiByDate(dateRange.startDate, dateRange.endDate);
    res.json(rows);
  } catch (error) {
    console.error('GET /api/transaksi error:', error);
    res.status(500).json({ message: 'Gagal mengambil data transaksi.' });
  }
});

app.post('/api/transaksi', requireAdminApi, async (req, res) => {
  try {
    const { nama_kk, alamat_muzaqi, jumlah_jiwa, jenis_bayar, nominal_infaq } = req.body;

    if (!nama_kk || typeof nama_kk !== 'string') {
      return res.status(400).json({ message: 'nama_kk wajib diisi.' });
    }

    if (!alamat_muzaqi || typeof alamat_muzaqi !== 'string' || !alamat_muzaqi.trim()) {
      return res.status(400).json({ message: 'alamat_muzaqi wajib diisi.' });
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
      INSERT INTO transaksi_zis (nama_kk, alamat_muzaqi, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nama_kk, alamat_muzaqi, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq, created_at
    `;

    const values = [nama_kk.trim(), alamat_muzaqi.trim(), jumlahJiwaNum, jenis_bayar, nominalZakat, infaqNum];
    const { rows } = await pool.query(insertQuery, values);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('POST /api/transaksi error:', error);
    res.status(500).json({ message: 'Gagal menyimpan transaksi.' });
  }
});

app.put('/api/transaksi/:id', requireAdminApi, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id tidak valid.' });
    }

    const { nama_kk, alamat_muzaqi, jumlah_jiwa, jenis_bayar, nominal_infaq } = req.body;

    if (!nama_kk || typeof nama_kk !== 'string') {
      return res.status(400).json({ message: 'nama_kk wajib diisi.' });
    }

    if (!alamat_muzaqi || typeof alamat_muzaqi !== 'string' || !alamat_muzaqi.trim()) {
      return res.status(400).json({ message: 'alamat_muzaqi wajib diisi.' });
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
          alamat_muzaqi = $2,
          jumlah_jiwa = $3,
          jenis_bayar = $4,
          nominal_zakat = $5,
          nominal_infaq = $6
      WHERE id = $7
      RETURNING id, nama_kk, alamat_muzaqi, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq, created_at
    `;

    const values = [nama_kk.trim(), alamat_muzaqi.trim(), jumlahJiwaNum, jenis_bayar, nominalZakat, infaqNum, id];
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

app.delete('/api/transaksi/:id', requireAdminApi, async (req, res) => {
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

app.get('/api/public/rekap', async (req, res) => {
  try {
    const dateRange = parseDateRange(req, res);
    if (!dateRange) return;

    const data = await queryRekapByDate(dateRange.startDate, dateRange.endDate);

    const totalDanaDistribusi = Number(data.total_uang_zakat) + Number(data.total_infaq);
    const totalBerasDistribusi = Number(data.total_beras);

    const distribusi = {
      fakir_miskin: Number((totalDanaDistribusi * 0.625).toFixed(2)),
      amil: Number((totalDanaDistribusi * 0.08).toFixed(2)),
      fisabilillah: Number((totalDanaDistribusi * 0.11).toFixed(2)),
      lainnya: Number((totalDanaDistribusi * 0.185).toFixed(2)),
    };

    const distribusiBeras = {
      fakir_miskin: Number((totalBerasDistribusi * 0.625).toFixed(2)),
      amil: Number((totalBerasDistribusi * 0.08).toFixed(2)),
      fisabilillah: Number((totalBerasDistribusi * 0.11).toFixed(2)),
      lainnya: Number((totalBerasDistribusi * 0.185).toFixed(2)),
    };

    res.json({
      total_kk: data.total_kk,
      total_jiwa: data.total_jiwa,
      total_beras: Number(data.total_beras),
      total_uang_zakat: Number(data.total_uang_zakat),
      total_infaq: Number(data.total_infaq),
      total_dana_distribusi: Number(totalDanaDistribusi.toFixed(2)),
      total_beras_distribusi: Number(totalBerasDistribusi.toFixed(2)),
      distribusi,
      distribusi_beras: distribusiBeras,
    });
  } catch (error) {
    console.error('GET /api/public/rekap error:', error);
    res.status(500).json({ message: 'Gagal mengambil data rekap.' });
  }
});

app.get('/api/rekap', requireAdminApi, async (req, res) => {
  try {
    const dateRange = parseDateRange(req, res);
    if (!dateRange) return;

    const data = await queryRekapByDate(dateRange.startDate, dateRange.endDate);

    const totalDanaDistribusi = Number(data.total_uang_zakat) + Number(data.total_infaq);
    const totalBerasDistribusi = Number(data.total_beras);

    const distribusi = {
      fakir_miskin: Number((totalDanaDistribusi * 0.625).toFixed(2)),
      amil: Number((totalDanaDistribusi * 0.08).toFixed(2)),
      fisabilillah: Number((totalDanaDistribusi * 0.11).toFixed(2)),
      lainnya: Number((totalDanaDistribusi * 0.185).toFixed(2)),
    };

    const distribusiBeras = {
      fakir_miskin: Number((totalBerasDistribusi * 0.625).toFixed(2)),
      amil: Number((totalBerasDistribusi * 0.08).toFixed(2)),
      fisabilillah: Number((totalBerasDistribusi * 0.11).toFixed(2)),
      lainnya: Number((totalBerasDistribusi * 0.185).toFixed(2)),
    };

    res.json({
      total_kk: data.total_kk,
      total_jiwa: data.total_jiwa,
      total_beras: Number(data.total_beras),
      total_uang_zakat: Number(data.total_uang_zakat),
      total_infaq: Number(data.total_infaq),
      total_dana_distribusi: Number(totalDanaDistribusi.toFixed(2)),
      total_beras_distribusi: Number(totalBerasDistribusi.toFixed(2)),
      distribusi,
      distribusi_beras: distribusiBeras,
    });
  } catch (error) {
    console.error('GET /api/rekap error:', error);
    res.status(500).json({ message: 'Gagal mengambil data rekap.' });
  }
});

app.get('/', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', requireAdminPage, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

if (require.main === module) {
  app.listen(PORT, async () => {
    try {
      await initApp();
      console.log(`Server berjalan di http://localhost:${PORT}`);
      console.log('Koneksi PostgreSQL berhasil.');
    } catch (error) {
      console.error('Server jalan, tapi gagal koneksi PostgreSQL:', error.message);
    }
  });
}

module.exports = {
  app,
  initApp,
};
