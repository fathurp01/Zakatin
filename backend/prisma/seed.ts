import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding data...');

  // Hapus semua data yang ada terlebih dahulu (urutan penting karena foreign key)
  await prisma.pengaturanZis.deleteMany();
  await prisma.transaksiZis.deleteMany();
  await prisma.pengurusMasjid.deleteMany();
  await prisma.masjid.deleteMany();
  await prisma.iuranWarga.deleteMany();
  await prisma.warga.deleteMany();
  await prisma.kasRW.deleteMany();
  await prisma.blokWilayah.deleteMany();
  await prisma.wilayahRW.deleteMany();
  await prisma.user.deleteMany();

  // Create hash password
  const passwordHashRW = await bcrypt.hash('rw123', 10);
  const passwordHashMasjid = await bcrypt.hash('masjid123', 10);

  // 1. Create User RW & Wilayah RW
  const userRW = await prisma.user.create({
    data: {
      nama: 'Ketua RW 01',
      email: 'rw@rwmanage.com',
      password: passwordHashRW,
      no_hp: '081234567890',
      role: 'RW',
      status_akun: 'APPROVED',
      wilayah_rw: {
        create: {
          nama_kompleks: 'Kompleks Sukamaju',
          no_rw: '01',
        },
      },
    },
    include: {
      wilayah_rw: true,
    },
  });

  const wilayahRwId = userRW.wilayah_rw!.id;

  // 2. Create Blok Wilayah
  const blokA = await prisma.blokWilayah.create({
    data: {
      wilayah_rw_id: wilayahRwId,
      nama_blok: 'Blok A',
      no_rt: '001',
    },
  });

  const blokB = await prisma.blokWilayah.create({
    data: {
      wilayah_rw_id: wilayahRwId,
      nama_blok: 'Blok B',
      no_rt: '002',
    },
  });

  // 3. Update User RW with Blok (optional, we set it to blokA)
  await prisma.user.update({
    where: { id: userRW.id },
    data: { blok_wilayah_id: blokA.id },
  });

  // 4. Create User Pengurus Masjid & Masjid
  const userMasjid = await prisma.user.create({
    data: {
      nama: 'Ustadz Ahmad',
      email: 'masjid@rwmanage.com',
      password: passwordHashMasjid,
      no_hp: '081234567891',
      role: 'PENGURUS_MASJID',
      status_akun: 'APPROVED',
      blok_wilayah_id: blokA.id,
    },
  });

  const masjid = await prisma.masjid.create({
    data: {
      blok_wilayah_id: blokA.id,
      nama_masjid: 'Masjid Jami Al-Ikhlas',
      alamat: 'Jl. Pemuda No. 1 Kompleks Sukamaju, Blok A',
    },
  });

  await prisma.pengurusMasjid.create({
    data: {
      user_id: userMasjid.id,
      masjid_id: masjid.id,
    },
  });

  // Pengaturan ZIS
  await prisma.pengaturanZis.create({
    data: {
      masjid_id: masjid.id,
      harga_beras_per_kg: 15000,
      persen_fakir: 62.5,
      persen_amil: 8.0,
      persen_fisabilillah: 11.0,
      persen_lainnya: 18.5,
    },
  });

  // 5. Create Warga & Iuran
  const tarifIuran = 50000;
  
  // Warga 1
  const warga1 = await prisma.warga.create({
    data: {
      blok_wilayah_id: blokA.id,
      nama_kk: 'Budi Santoso',
      tarif_iuran_bulanan: tarifIuran,
    },
  });

  // Iuran Warga 1
  await prisma.iuranWarga.create({
    data: {
      warga_id: warga1.id,
      bulan: 1,
      tahun: 2026,
      nominal: tarifIuran,
      status: 'LUNAS',
      kode_unik: 'IUR-2026-01-BS1',
      tanggal_bayar: new Date('2026-01-05T10:00:00Z'),
    },
  });

  await prisma.iuranWarga.create({
    data: {
      warga_id: warga1.id,
      bulan: 2,
      tahun: 2026,
      nominal: tarifIuran,
      status: 'BELUM',
    },
  });

  // Warga 2
  const warga2 = await prisma.warga.create({
    data: {
      blok_wilayah_id: blokB.id,
      nama_kk: 'Siti Aminah',
      tarif_iuran_bulanan: tarifIuran,
    },
  });

  // Iuran Warga 2
  await prisma.iuranWarga.create({
    data: {
      warga_id: warga2.id,
      bulan: 1,
      tahun: 2026,
      nominal: tarifIuran,
      status: 'LUNAS',
      kode_unik: 'IUR-2026-01-SA1',
      tanggal_bayar: new Date('2026-01-10T09:00:00Z'),
    },
  });

  // 6. Create Kas RW
  await prisma.kasRW.create({
    data: {
      wilayah_rw_id: wilayahRwId,
      jenis_transaksi: 'MASUK',
      tanggal: new Date('2026-01-05T10:30:00Z'),
      keterangan: 'Iuran awal tahun dari Blok A',
      nominal: 150000,
      kode_unik: 'KAS-2026-M-01',
    },
  });

  await prisma.kasRW.create({
    data: {
      wilayah_rw_id: wilayahRwId,
      jenis_transaksi: 'KELUAR',
      tanggal: new Date('2026-01-15T08:00:00Z'),
      keterangan: 'Biaya kebersihan dan sampah Januari',
      nominal: 75000,
      kode_unik: 'KAS-2026-K-01',
    },
  });

  // 7. Create Transaksi ZIS
  await prisma.transaksiZis.create({
    data: {
      masjid_id: masjid.id,
      kode_unik: 'ZIS-2026-01-01',
      nama_kk: 'Andi Setiawan',
      alamat_muzaqi: 'Blok A3 No. 4',
      jumlah_jiwa: 4,
      jenis_bayar: 'UANG',
      nominal_zakat: 150000,
      nominal_infaq: 50000,
      waktu_transaksi: new Date('2026-03-10T14:00:00Z'),
    },
  });

  await prisma.transaksiZis.create({
    data: {
      masjid_id: masjid.id,
      kode_unik: 'ZIS-2026-01-02',
      nama_kk: 'Ridwan Kamil',
      alamat_muzaqi: 'Blok B1 No. 2',
      jumlah_jiwa: 3,
      jenis_bayar: 'BERAS',
      total_beras_kg: 7.5,
      nominal_infaq: 20000,
      waktu_transaksi: new Date('2026-03-12T16:30:00Z'),
    },
  });

  console.log('Seeding selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
