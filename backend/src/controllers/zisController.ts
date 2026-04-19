import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { JenisBayar, PengaturanZis, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateTransaksiZisBody {
  masjid_id?: string;
  nama_kk?: string;
  alamat_muzaqi?: string;
  jumlah_jiwa?: number | string;
  jenis_bayar?: JenisBayar;
  nominal_zakat?: number | string;
  nominal_infaq?: number | string;
  total_beras_kg?: number | string;
}

interface GetDashboardZisQuery {
  masjid_id?: string;
}

const generateKodeUnikZis = (): string => {
  const year = new Date().getFullYear();
  return `ZIS-${year}-${randomUUID().toUpperCase()}`;
};

const toNonNegativeNumber = (
  value: number | string | undefined,
  fallback = 0
): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return NaN;
  }

  return parsed;
};

const toPositiveInteger = (value: number | string | undefined): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return NaN;
  }
  return parsed;
};

const decimalToNumber = (value: Prisma.Decimal | null): number => {
  if (!value) {
    return 0;
  }
  return Number(value);
};

const roundTo2 = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const getAuthorizedMasjidId = async (
  client: typeof prisma,
  req: Request,
  requestedMasjidId?: string
): Promise<string | null> => {
  if (!req.user?.id) {
    return null;
  }

  if (requestedMasjidId) {
    const relation = await client.pengurusMasjid.findFirst({
      where: {
        user_id: req.user.id,
        masjid_id: requestedMasjidId,
      },
      select: {
        masjid_id: true,
      },
    });

    return relation?.masjid_id ?? null;
  }

  const firstRelation = await client.pengurusMasjid.findFirst({
    where: { user_id: req.user.id },
    select: { masjid_id: true },
    orderBy: { id: "asc" },
  });

  return firstRelation?.masjid_id ?? null;
};

const calculateDistribution = (
  pengaturan: Pick<
    PengaturanZis,
    "persen_fakir" | "persen_amil" | "persen_fisabilillah" | "persen_lainnya"
  >,
  totalValue: number
) => {
  const fakir = (pengaturan.persen_fakir / 100) * totalValue;
  const amil = (pengaturan.persen_amil / 100) * totalValue;
  const fisabilillah = (pengaturan.persen_fisabilillah / 100) * totalValue;
  const lainnya = (pengaturan.persen_lainnya / 100) * totalValue;

  return {
    fakir: roundTo2(fakir),
    amil: roundTo2(amil),
    fisabilillah: roundTo2(fisabilillah),
    lainnya: roundTo2(lainnya),
  };
};

export const createTransaksiZisWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      masjid_id,
      nama_kk,
      alamat_muzaqi,
      jumlah_jiwa,
      jenis_bayar,
      nominal_zakat,
      nominal_infaq,
      total_beras_kg,
    } = req.body as CreateTransaksiZisBody;

    if (!masjid_id || !nama_kk || !alamat_muzaqi || !jumlah_jiwa || !jenis_bayar) {
      res.status(400).json({
        success: false,
        message:
          "masjid_id, nama_kk, alamat_muzaqi, jumlah_jiwa, dan jenis_bayar wajib diisi.",
      });
      return;
    }

    if (jenis_bayar !== JenisBayar.UANG && jenis_bayar !== JenisBayar.BERAS) {
      res.status(400).json({
        success: false,
        message: "jenis_bayar hanya boleh UANG atau BERAS.",
      });
      return;
    }

    const jumlahJiwaInt = toPositiveInteger(jumlah_jiwa);
    if (Number.isNaN(jumlahJiwaInt)) {
      res.status(400).json({
        success: false,
        message: "jumlah_jiwa harus berupa bilangan bulat lebih dari 0.",
      });
      return;
    }

    const nominalZakat = toNonNegativeNumber(nominal_zakat);
    const nominalInfaq = toNonNegativeNumber(nominal_infaq);
    const totalBeras = toNonNegativeNumber(total_beras_kg);

    if (
      Number.isNaN(nominalZakat) ||
      Number.isNaN(nominalInfaq) ||
      Number.isNaN(totalBeras)
    ) {
      res.status(400).json({
        success: false,
        message: "nominal_zakat, nominal_infaq, dan total_beras_kg harus angka >= 0.",
      });
      return;
    }

    if (jenis_bayar === JenisBayar.UANG && nominalZakat + nominalInfaq <= 0) {
      res.status(400).json({
        success: false,
        message: "Untuk jenis UANG, nominal_zakat atau nominal_infaq harus lebih dari 0.",
      });
      return;
    }

    if (jenis_bayar === JenisBayar.BERAS && totalBeras <= 0) {
      res.status(400).json({
        success: false,
        message: "Untuk jenis BERAS, total_beras_kg harus lebih dari 0.",
      });
      return;
    }

    const authorizedMasjidId = await getAuthorizedMasjidId(client, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
      });
      return;
    }

    const transaksi = await client.transaksiZis.create({
      data: {
        masjid_id: authorizedMasjidId,
        kode_unik: generateKodeUnikZis(),
        nama_kk,
        alamat_muzaqi,
        jumlah_jiwa: jumlahJiwaInt,
        jenis_bayar,
        nominal_zakat: new Prisma.Decimal(nominalZakat),
        nominal_infaq: new Prisma.Decimal(nominalInfaq),
        total_beras_kg: new Prisma.Decimal(totalBeras),
      },
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

    res.status(201).json({
      success: true,
      message: "Transaksi ZIS berhasil ditambahkan.",
      data: transaksi,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat transaksi ZIS.",
    });
  }
};

export const createTransaksiZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  return createTransaksiZisWithClient(prisma, req, res);
};

export const getDashboardZisWithClient = async (
  client: typeof prisma,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { masjid_id } = req.query as GetDashboardZisQuery;

    const authorizedMasjidId = await getAuthorizedMasjidId(client, req, masjid_id);
    if (!authorizedMasjidId) {
      res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
      });
      return;
    }

    const pengaturan = await client.pengaturanZis.findUnique({
      where: { masjid_id: authorizedMasjidId },
      select: {
        id: true,
        masjid_id: true,
        persen_fakir: true,
        persen_amil: true,
        persen_fisabilillah: true,
        persen_lainnya: true,
        harga_beras_per_kg: true,
        is_harga_auto_api: true,
      },
    });

    if (!pengaturan) {
      res.status(404).json({
        success: false,
        message: "Pengaturan ZIS untuk masjid ini belum tersedia.",
      });
      return;
    }

    const aggregate = await client.transaksiZis.aggregate({
      where: { masjid_id: authorizedMasjidId },
      _sum: {
        total_beras_kg: true,
        nominal_zakat: true,
        nominal_infaq: true,
      },
    });

    const totalBeras = roundTo2(decimalToNumber(aggregate._sum.total_beras_kg));
    const totalUangZakat = roundTo2(decimalToNumber(aggregate._sum.nominal_zakat));
    const totalInfaq = roundTo2(decimalToNumber(aggregate._sum.nominal_infaq));

    const distribusiUang = calculateDistribution(pengaturan, totalUangZakat);
    const distribusiBerasKg = calculateDistribution(pengaturan, totalBeras);

    res.status(200).json({
      success: true,
      message: "Dashboard ZIS berhasil diambil.",
      data: {
        masjid_id: authorizedMasjidId,
        pengaturan_zis: pengaturan,
        total_beras: totalBeras,
        total_uang_zakat: totalUangZakat,
        total_infaq: totalInfaq,
        distribusi_uang_zakat: {
          persen: {
            fakir: pengaturan.persen_fakir,
            amil: pengaturan.persen_amil,
            fisabilillah: pengaturan.persen_fisabilillah,
            lainnya: pengaturan.persen_lainnya,
          },
          nominal: distribusiUang,
        },
        distribusi_beras_kg: {
          persen: {
            fakir: pengaturan.persen_fakir,
            amil: pengaturan.persen_amil,
            fisabilillah: pengaturan.persen_fisabilillah,
            lainnya: pengaturan.persen_lainnya,
          },
          nominal_kg: distribusiBerasKg,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil dashboard ZIS.",
    });
  }
};

export const getDashboardZis = async (
  req: Request,
  res: Response
): Promise<void> => {
  return getDashboardZisWithClient(prisma, req, res);
};
