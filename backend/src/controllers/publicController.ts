import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface CekKodeUnikParams {
  kode_unik?: string;
}

interface GetMasjidListQuery {
  search?: string;
}

export const getMasjidListWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search } = req.query as GetMasjidListQuery;
    const normalizedSearch = search?.trim().toLowerCase();

    const wilayahRwList = await client.wilayahRW.findMany({
      select: {
        id: true,
        nama_kompleks: true,
        no_rw: true,
      },
      orderBy: [{ nama_kompleks: "asc" }, { no_rw: "asc" }],
    });

    const masjidList = await client.masjid.findMany({
      select: {
        id: true,
        nama_masjid: true,
        alamat: true,
        blok_wilayah_id: true,
        blok_wilayah: {
          select: {
            id: true,
            nama_blok: true,
            wilayah_rw: {
              select: {
                id: true,
                nama_kompleks: true,
                no_rw: true,
              },
            },
          },
        },
      },
      orderBy: [{ nama_masjid: "asc" }],
    });

    const filteredMasjid = normalizedSearch
      ? masjidList.filter((item) => {
          const searchTarget = [
            item.nama_masjid,
            item.alamat,
            item.blok_wilayah.nama_blok,
            item.blok_wilayah.wilayah_rw.nama_kompleks,
            item.blok_wilayah.wilayah_rw.no_rw,
          ]
            .join(" ")
            .toLowerCase();

          return searchTarget.includes(normalizedSearch);
        })
      : masjidList;

    const visibleRwIds = new Set(
      filteredMasjid.map((item) => item.blok_wilayah.wilayah_rw.id)
    );

    const wilayahRw = normalizedSearch
      ? wilayahRwList.filter((item) => visibleRwIds.has(item.id))
      : wilayahRwList;

    res.status(200).json({
      success: true,
      message: "Daftar RW dan masjid berhasil diambil.",
      data: {
        wilayah_rw: wilayahRw,
        masjid: filteredMasjid.map((item) => ({
          id: item.id,
          nama_masjid: item.nama_masjid,
          alamat: item.alamat,
          blok_wilayah_id: item.blok_wilayah_id,
          nama_blok: item.blok_wilayah.nama_blok,
          wilayah_rw_id: item.blok_wilayah.wilayah_rw.id,
          nama_kompleks: item.blok_wilayah.wilayah_rw.nama_kompleks,
          no_rw: item.blok_wilayah.wilayah_rw.no_rw,
        })),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil daftar masjid.",
    });
  }
};

export const cekKodeUnikWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { kode_unik } = req.params as CekKodeUnikParams;

    if (!kode_unik || !kode_unik.trim()) {
      res.status(400).json({
        success: false,
        message: "Parameter kode_unik wajib diisi.",
      });
      return;
    }

    const normalizedKode = kode_unik.trim();

    const iuran = await client.iuranWarga.findUnique({
      where: { kode_unik: normalizedKode },
      select: {
        id: true,
        warga_id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        status: true,
        kode_unik: true,
        tanggal_bayar: true,
      },
    });

    if (iuran) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada iuran_warga.",
        data: {
          sumber: "iuran_warga",
          detail: iuran,
        },
      });
      return;
    }

    const kas = await client.kasRW.findUnique({
      where: { kode_unik: normalizedKode },
      select: {
        id: true,
        wilayah_rw_id: true,
        jenis_transaksi: true,
        tanggal: true,
        keterangan: true,
        nominal: true,
        bukti_url: true,
        kode_unik: true,
      },
    });

    if (kas) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada kas_rw.",
        data: {
          sumber: "kas_rw",
          detail: kas,
        },
      });
      return;
    }

    const zis = await client.transaksiZis.findUnique({
      where: { kode_unik: normalizedKode },
      select: {
        id: true,
        masjid_id: true,
        kode_unik: true,
        nama_kk: true,
        alamat_muzaqi: true,
        jumlah_jiwa: true,
        jenis_bayar: true,
        nominal_zakat: true,
        nominal_infaq: true,
        total_beras_kg: true,
        waktu_transaksi: true,
      },
    });

    if (zis) {
      res.status(200).json({
        success: true,
        message: "Data ditemukan pada transaksi_zis.",
        data: {
          sumber: "transaksi_zis",
          detail: zis,
        },
      });
      return;
    }

    res.status(404).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat melakukan pengecekan kode unik.",
    });
  }
};

export const cekKodeUnik = async (req: Request, res: Response): Promise<void> => {
  return cekKodeUnikWithClient(prisma, req, res);
};

export const getMasjidList = async (req: Request, res: Response): Promise<void> => {
  return getMasjidListWithClient(prisma, req, res);
};
