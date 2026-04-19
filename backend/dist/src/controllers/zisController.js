"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardZis = exports.getDashboardZisWithClient = exports.createTransaksiZis = exports.createTransaksiZisWithClient = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const generateKodeUnikZis = () => {
    const year = new Date().getFullYear();
    return `ZIS-${year}-${(0, crypto_1.randomUUID)().toUpperCase()}`;
};
const toNonNegativeNumber = (value, fallback = 0) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return NaN;
    }
    return parsed;
};
const toPositiveInteger = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return NaN;
    }
    return parsed;
};
const decimalToNumber = (value) => {
    if (!value) {
        return 0;
    }
    return Number(value);
};
const roundTo2 = (value) => {
    return Math.round(value * 100) / 100;
};
const getAuthorizedMasjidId = async (client, req, requestedMasjidId) => {
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
const calculateDistribution = (pengaturan, totalValue) => {
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
const createTransaksiZisWithClient = async (client, req, res) => {
    try {
        const { masjid_id, nama_kk, alamat_muzaqi, jumlah_jiwa, jenis_bayar, nominal_zakat, nominal_infaq, total_beras_kg, } = req.body;
        if (!masjid_id || !nama_kk || !alamat_muzaqi || !jumlah_jiwa || !jenis_bayar) {
            res.status(400).json({
                success: false,
                message: "masjid_id, nama_kk, alamat_muzaqi, jumlah_jiwa, dan jenis_bayar wajib diisi.",
            });
            return;
        }
        if (jenis_bayar !== client_1.JenisBayar.UANG && jenis_bayar !== client_1.JenisBayar.BERAS) {
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
        if (Number.isNaN(nominalZakat) ||
            Number.isNaN(nominalInfaq) ||
            Number.isNaN(totalBeras)) {
            res.status(400).json({
                success: false,
                message: "nominal_zakat, nominal_infaq, dan total_beras_kg harus angka >= 0.",
            });
            return;
        }
        if (jenis_bayar === client_1.JenisBayar.UANG && nominalZakat + nominalInfaq <= 0) {
            res.status(400).json({
                success: false,
                message: "Untuk jenis UANG, nominal_zakat atau nominal_infaq harus lebih dari 0.",
            });
            return;
        }
        if (jenis_bayar === client_1.JenisBayar.BERAS && totalBeras <= 0) {
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
                message: "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
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
                nominal_zakat: new client_1.Prisma.Decimal(nominalZakat),
                nominal_infaq: new client_1.Prisma.Decimal(nominalInfaq),
                total_beras_kg: new client_1.Prisma.Decimal(totalBeras),
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat membuat transaksi ZIS.",
        });
    }
};
exports.createTransaksiZisWithClient = createTransaksiZisWithClient;
const createTransaksiZis = async (req, res) => {
    return (0, exports.createTransaksiZisWithClient)(prisma_1.prisma, req, res);
};
exports.createTransaksiZis = createTransaksiZis;
const getDashboardZisWithClient = async (client, req, res) => {
    try {
        const { masjid_id } = req.query;
        const authorizedMasjidId = await getAuthorizedMasjidId(client, req, masjid_id);
        if (!authorizedMasjidId) {
            res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke masjid ini atau belum terdaftar sebagai pengurus masjid.",
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil dashboard ZIS.",
        });
    }
};
exports.getDashboardZisWithClient = getDashboardZisWithClient;
const getDashboardZis = async (req, res) => {
    return (0, exports.getDashboardZisWithClient)(prisma_1.prisma, req, res);
};
exports.getDashboardZis = getDashboardZis;
