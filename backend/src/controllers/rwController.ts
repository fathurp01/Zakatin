import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { JenisTransaksi, Prisma, StatusIuran } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateWargaBody {
  blok_wilayah_id?: string;
  nama_kk?: string;
  tarif_iuran_bulanan?: number | string;
}

interface GetIuranWargaQuery {
  blok_wilayah_id?: string;
  tahun?: string;
}

interface BayarIuranBody {
  iuran_id?: string;
}

interface CreateKasRWBody {
  wilayah_rw_id?: string;
  jenis_transaksi?: JenisTransaksi;
  tanggal?: string;
  keterangan?: string;
  nominal?: number | string;
  bukti_url?: string;
}

const generateKodeUnik = (prefix: "IUR" | "KAS"): string => {
  const year = new Date().getFullYear();
  const uuid = randomUUID().toUpperCase();
  return `${prefix}-${year}-${uuid}`;
};

const parsePositiveNumber = (
  value: number | string | undefined
): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const getRwWilayahByUserId = async (userId: string) => {
  return prisma.wilayahRW.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
};

export const createWargaWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { blok_wilayah_id, nama_kk, tarif_iuran_bulanan } =
      req.body as CreateWargaBody;

    const nominalIuran = parsePositiveNumber(tarif_iuran_bulanan);

    if (!blok_wilayah_id || !nama_kk || nominalIuran === null) {
      res.status(400).json({
        success: false,
        message:
          "blok_wilayah_id, nama_kk, dan tarif_iuran_bulanan (angka > 0) wajib diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const rwWilayah = await client.wilayahRW.findUnique({
      where: { user_id: req.user.id },
      select: { id: true },
    });
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const blok = await client.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { id: true, wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Blok wilayah ini tidak berada di RW Anda.",
      });
      return;
    }

    const currentYear = new Date().getFullYear();

    const result = await client.$transaction(async (tx) => {
      const warga = await tx.warga.create({
        data: {
          blok_wilayah_id,
          nama_kk,
          tarif_iuran_bulanan: new Prisma.Decimal(nominalIuran),
        },
      });

      await tx.iuranWarga.createMany({
        data: Array.from({ length: 12 }, (_, idx) => ({
          warga_id: warga.id,
          bulan: idx + 1,
          tahun: currentYear,
          nominal: new Prisma.Decimal(nominalIuran),
          status: StatusIuran.BELUM,
        })),
      });

      return warga;
    });

    res.status(201).json({
      success: true,
      message:
        "Warga berhasil ditambahkan dan 12 data iuran tahun berjalan berhasil dibuat.",
      data: {
        id: result.id,
        nama_kk: result.nama_kk,
        blok_wilayah_id: result.blok_wilayah_id,
        tarif_iuran_bulanan: result.tarif_iuran_bulanan,
        tahun_iuran_awal: currentYear,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan warga.",
    });
  }
};

export const createWarga = async (req: Request, res: Response): Promise<void> => {
  return createWargaWithClient(prisma, req, res);
};

export const getIuranWarga = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { blok_wilayah_id, tahun } = req.query as GetIuranWargaQuery;

    if (!blok_wilayah_id) {
      res.status(400).json({
        success: false,
        message: "blok_wilayah_id wajib diisi pada query parameter.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const blok = await prisma.blokWilayah.findUnique({
      where: { id: blok_wilayah_id },
      select: { id: true, wilayah_rw_id: true },
    });

    if (!blok) {
      res.status(404).json({
        success: false,
        message: "Blok wilayah tidak ditemukan.",
      });
      return;
    }

    if (blok.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Blok wilayah ini tidak berada di RW Anda.",
      });
      return;
    }

    const tahunInt = tahun ? Number(tahun) : new Date().getFullYear();
    if (!Number.isInteger(tahunInt) || tahunInt < 2000 || tahunInt > 3000) {
      res.status(400).json({
        success: false,
        message: "Parameter tahun tidak valid.",
      });
      return;
    }

    const wargaList = await prisma.warga.findMany({
      where: { blok_wilayah_id },
      select: {
        id: true,
        nama_kk: true,
        tarif_iuran_bulanan: true,
        iuran_warga: {
          where: { tahun: tahunInt },
          select: {
            id: true,
            bulan: true,
            tahun: true,
            nominal: true,
            status: true,
            kode_unik: true,
            tanggal_bayar: true,
          },
          orderBy: { bulan: "asc" },
        },
      },
      orderBy: { nama_kk: "asc" },
    });

    const data = wargaList.map((warga) => {
      const iuranByMonth = new Map(
        warga.iuran_warga.map((item) => [item.bulan, item])
      );

      const iuran12Bulan = Array.from({ length: 12 }, (_, idx) => {
        const bulan = idx + 1;
        const found = iuranByMonth.get(bulan);

        if (found) {
          return found;
        }

        return {
          id: null,
          bulan,
          tahun: tahunInt,
          nominal: warga.tarif_iuran_bulanan,
          status: StatusIuran.BELUM,
          kode_unik: null,
          tanggal_bayar: null,
        };
      });

      return {
        id: warga.id,
        nama_kk: warga.nama_kk,
        tarif_iuran_bulanan: warga.tarif_iuran_bulanan,
        iuran: iuran12Bulan,
      };
    });

    res.status(200).json({
      success: true,
      message: "Data iuran warga berhasil diambil.",
      data: {
        blok_wilayah_id,
        tahun: tahunInt,
        warga: data,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data iuran warga.",
    });
  }
};

export const bayarIuran = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iuran_id } = req.body as BayarIuranBody;

    if (!iuran_id) {
      res.status(400).json({
        success: false,
        message: "iuran_id wajib diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const rwWilayah = await getRwWilayahByUserId(req.user.id);
    if (!rwWilayah) {
      res.status(403).json({
        success: false,
        message: "Wilayah RW untuk user login tidak ditemukan.",
      });
      return;
    }

    const existingIuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      select: {
        id: true,
        tahun: true,
        status: true,
        warga: {
          select: {
            blok_wilayah: {
              select: {
                wilayah_rw_id: true,
              },
            },
          },
        },
      },
    });

    if (!existingIuran) {
      res.status(404).json({
        success: false,
        message: "Data iuran tidak ditemukan.",
      });
      return;
    }

    if (existingIuran.warga.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Iuran ini tidak berada di RW Anda.",
      });
      return;
    }

    if (existingIuran.status === StatusIuran.LUNAS) {
      res.status(400).json({
        success: false,
        message: "Iuran sudah berstatus LUNAS.",
      });
      return;
    }

    const updatedIuran = await prisma.iuranWarga.update({
      where: { id: iuran_id },
      data: {
        status: StatusIuran.LUNAS,
        tanggal_bayar: new Date(),
        kode_unik: generateKodeUnik("IUR"),
      },
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

    res.status(200).json({
      success: true,
      message: "Pembayaran iuran berhasil diproses.",
      data: updatedIuran,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses pembayaran iuran.",
    });
  }
};

export const createKasRW = async (req: Request, res: Response): Promise<void> => {
  try {
    const { wilayah_rw_id, jenis_transaksi, tanggal, keterangan, nominal, bukti_url } =
      req.body as CreateKasRWBody;

    const nominalKas = parsePositiveNumber(nominal);

    if (!wilayah_rw_id || !jenis_transaksi || !keterangan || nominalKas === null) {
      res.status(400).json({
        success: false,
        message:
          "wilayah_rw_id, jenis_transaksi, keterangan, dan nominal (angka > 0) wajib diisi.",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    if (
      jenis_transaksi !== JenisTransaksi.MASUK &&
      jenis_transaksi !== JenisTransaksi.KELUAR
    ) {
      res.status(400).json({
        success: false,
        message: "jenis_transaksi hanya boleh MASUK atau KELUAR.",
      });
      return;
    }

    const wilayah = await prisma.wilayahRW.findUnique({
      where: { id: wilayah_rw_id },
      select: { id: true, user_id: true },
    });

    if (!wilayah) {
      res.status(404).json({
        success: false,
        message: "Wilayah RW tidak ditemukan.",
      });
      return;
    }

    if (wilayah.user_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda hanya dapat menambah kas untuk wilayah RW Anda.",
      });
      return;
    }

    let tanggalParsed = new Date();
    if (tanggal) {
      const testDate = new Date(tanggal);
      if (Number.isNaN(testDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "Format tanggal tidak valid.",
        });
        return;
      }
      tanggalParsed = testDate;
    }

    const kas = await prisma.kasRW.create({
      data: {
        wilayah_rw_id,
        jenis_transaksi,
        tanggal: tanggalParsed,
        keterangan,
        nominal: new Prisma.Decimal(nominalKas),
        bukti_url,
        kode_unik: generateKodeUnik("KAS"),
      },
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

    res.status(201).json({
      success: true,
      message: "Data kas RW berhasil ditambahkan.",
      data: kas,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menambahkan kas RW.",
    });
  }
};
