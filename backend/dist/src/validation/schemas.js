"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cekKodeUnikParamsSchema = exports.getDashboardZisQuerySchema = exports.createTransaksiZisSchema = exports.createKasRWSchema = exports.bayarIuranSchema = exports.getIuranWargaQuerySchema = exports.createWargaSchema = exports.approvePengurusSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const uuidSchema = zod_1.z.string().uuid();
exports.registerSchema = zod_1.z
    .object({
    nama: zod_1.z.string().trim().min(3).max(120),
    email: zod_1.z.string().trim().email().transform((value) => value.toLowerCase()),
    password: zod_1.z.string().min(8).max(128),
    no_hp: zod_1.z.string().trim().min(8).max(20),
    role: zod_1.z.enum(["RW", "PENGURUS_MASJID"]),
    blok_wilayah_id: uuidSchema.optional(),
    masjid_id: uuidSchema.optional(),
})
    .superRefine((value, ctx) => {
    if (value.role === "PENGURUS_MASJID" && !value.masjid_id) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["masjid_id"],
            message: "masjid_id wajib diisi untuk role PENGURUS_MASJID.",
        });
    }
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().transform((value) => value.toLowerCase()),
    password: zod_1.z.string().min(1).max(128),
});
exports.approvePengurusSchema = zod_1.z
    .object({
    user_id: uuidSchema,
    status_akun: zod_1.z.enum(["APPROVED", "REJECTED"]),
    alasan_penolakan: zod_1.z.string().trim().max(500).optional(),
})
    .superRefine((value, ctx) => {
    if (value.status_akun === "REJECTED" && !value.alasan_penolakan) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["alasan_penolakan"],
            message: "alasan_penolakan wajib diisi saat menolak pengurus.",
        });
    }
});
exports.createWargaSchema = zod_1.z.object({
    blok_wilayah_id: uuidSchema,
    nama_kk: zod_1.z.string().trim().min(2).max(150),
    tarif_iuran_bulanan: zod_1.z.coerce.number().positive(),
});
exports.getIuranWargaQuerySchema = zod_1.z.object({
    blok_wilayah_id: uuidSchema,
    tahun: zod_1.z.coerce.number().int().min(2000).max(3000).optional(),
});
exports.bayarIuranSchema = zod_1.z.object({
    iuran_id: uuidSchema,
});
exports.createKasRWSchema = zod_1.z.object({
    wilayah_rw_id: uuidSchema,
    jenis_transaksi: zod_1.z.enum(["MASUK", "KELUAR"]),
    tanggal: zod_1.z.string().datetime().optional(),
    keterangan: zod_1.z.string().trim().min(1).max(5000),
    nominal: zod_1.z.coerce.number().positive(),
    bukti_url: zod_1.z.string().trim().url().optional(),
});
exports.createTransaksiZisSchema = zod_1.z
    .object({
    masjid_id: uuidSchema,
    nama_kk: zod_1.z.string().trim().min(2).max(150),
    alamat_muzaqi: zod_1.z.string().trim().min(3).max(1000),
    jumlah_jiwa: zod_1.z.coerce.number().int().positive(),
    jenis_bayar: zod_1.z.enum(["UANG", "BERAS"]),
    nominal_zakat: zod_1.z.coerce.number().min(0).optional(),
    nominal_infaq: zod_1.z.coerce.number().min(0).optional(),
    total_beras_kg: zod_1.z.coerce.number().min(0).optional(),
})
    .superRefine((value, ctx) => {
    const nominalZakat = value.nominal_zakat ?? 0;
    const nominalInfaq = value.nominal_infaq ?? 0;
    const totalBeras = value.total_beras_kg ?? 0;
    if (value.jenis_bayar === "UANG" && nominalZakat + nominalInfaq <= 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["nominal_zakat"],
            message: "Untuk jenis UANG, nominal_zakat atau nominal_infaq harus lebih dari 0.",
        });
    }
    if (value.jenis_bayar === "BERAS" && totalBeras <= 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["total_beras_kg"],
            message: "Untuk jenis BERAS, total_beras_kg harus lebih dari 0.",
        });
    }
});
exports.getDashboardZisQuerySchema = zod_1.z.object({
    masjid_id: uuidSchema.optional(),
});
exports.cekKodeUnikParamsSchema = zod_1.z.object({
    kode_unik: zod_1.z.string().trim().min(1).max(100),
});
