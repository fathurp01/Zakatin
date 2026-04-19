"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cekKodeUnik = exports.cekKodeUnikWithClient = void 0;
const prisma_1 = require("../lib/prisma");
const cekKodeUnikWithClient = async (client, req, res) => {
    try {
        const { kode_unik } = req.params;
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat melakukan pengecekan kode unik.",
        });
    }
};
exports.cekKodeUnikWithClient = cekKodeUnikWithClient;
const cekKodeUnik = async (req, res) => {
    return (0, exports.cekKodeUnikWithClient)(prisma_1.prisma, req, res);
};
exports.cekKodeUnik = cekKodeUnik;
