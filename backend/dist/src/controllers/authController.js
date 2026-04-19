"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvePengurus = exports.approvePengurusWithClient = exports.login = exports.loginWithClient = exports.register = exports.registerWithClient = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const SALT_ROUNDS = 10;
const createToken = (user) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("JWT_SECRET belum dikonfigurasi.");
    }
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        wilayah_rw_id: user.wilayah_rw_id,
        masjid_ids: user.masjid_ids,
    }, jwtSecret, { expiresIn: "1d" });
};
const registerWithClient = async (client, req, res) => {
    try {
        const { nama, email, password, no_hp, role, blok_wilayah_id, masjid_id } = req.body;
        if (!nama || !email || !password || !no_hp || !role) {
            res.status(400).json({
                success: false,
                message: "Field nama, email, password, no_hp, dan role wajib diisi.",
            });
            return;
        }
        if (role !== client_1.Role.RW && role !== client_1.Role.PENGURUS_MASJID) {
            res.status(400).json({
                success: false,
                message: "Role tidak valid. Gunakan RW atau PENGURUS_MASJID.",
            });
            return;
        }
        if (role === client_1.Role.PENGURUS_MASJID && !masjid_id) {
            res.status(400).json({
                success: false,
                message: "masjid_id wajib diisi untuk role PENGURUS_MASJID.",
            });
            return;
        }
        const existingUser = await client.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: "Email sudah terdaftar.",
            });
            return;
        }
        if (role === client_1.Role.PENGURUS_MASJID && masjid_id) {
            const masjid = await client.masjid.findUnique({
                where: { id: masjid_id },
                select: { id: true },
            });
            if (!masjid) {
                res.status(404).json({
                    success: false,
                    message: "Masjid tidak ditemukan.",
                });
                return;
            }
        }
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const initialStatus = role === client_1.Role.RW ? client_1.StatusAkun.APPROVED : client_1.StatusAkun.PENDING;
        const createdUser = await client.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    nama,
                    email,
                    password: hashedPassword,
                    no_hp,
                    role,
                    blok_wilayah_id,
                    status_akun: initialStatus,
                },
            });
            if (role === client_1.Role.PENGURUS_MASJID && masjid_id) {
                await tx.pengurusMasjid.create({
                    data: {
                        user_id: user.id,
                        masjid_id,
                    },
                });
            }
            return user;
        });
        res.status(201).json({
            success: true,
            message: "Registrasi berhasil.",
            data: {
                id: createdUser.id,
                nama: createdUser.nama,
                email: createdUser.email,
                role: createdUser.role,
                status_akun: createdUser.status_akun,
            },
        });
    }
    catch (error) {
        const isPrismaError = error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002";
        res.status(isPrismaError ? 409 : 500).json({
            success: false,
            message: isPrismaError
                ? "Data unik sudah digunakan."
                : "Terjadi kesalahan saat registrasi.",
        });
    }
};
exports.registerWithClient = registerWithClient;
const register = async (req, res) => {
    return (0, exports.registerWithClient)(prisma_1.prisma, req, res);
};
exports.register = register;
const loginWithClient = async (client, req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email dan password wajib diisi.",
            });
            return;
        }
        const user = await client.user.findUnique({
            where: { email },
            select: {
                id: true,
                nama: true,
                email: true,
                password: true,
                role: true,
                status_akun: true,
            },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Email atau password salah.",
            });
            return;
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Email atau password salah.",
            });
            return;
        }
        if (user.role === client_1.Role.PENGURUS_MASJID &&
            user.status_akun === client_1.StatusAkun.PENDING) {
            res.status(403).json({
                success: false,
                message: "Akun pengurus masjid masih menunggu persetujuan RW.",
            });
            return;
        }
        if (user.role === client_1.Role.PENGURUS_MASJID &&
            user.status_akun === client_1.StatusAkun.REJECTED) {
            res.status(403).json({
                success: false,
                message: "Akun pengurus masjid ditolak.",
            });
            return;
        }
        let wilayahRwId;
        let masjidIds;
        if (user.role === client_1.Role.RW) {
            const wilayah = await client.wilayahRW.findUnique({
                where: { user_id: user.id },
                select: { id: true },
            });
            wilayahRwId = wilayah?.id;
        }
        if (user.role === client_1.Role.PENGURUS_MASJID) {
            const pengurusMasjid = await client.pengurusMasjid.findMany({
                where: { user_id: user.id },
                select: { masjid_id: true },
            });
            masjidIds = pengurusMasjid.map((item) => item.masjid_id);
        }
        const tokenWithTenantContext = createToken({
            id: user.id,
            email: user.email,
            role: user.role,
            wilayah_rw_id: wilayahRwId,
            masjid_ids: masjidIds,
        });
        res.status(200).json({
            success: true,
            message: "Login berhasil.",
            data: {
                token: tokenWithTenantContext,
                user: {
                    id: user.id,
                    nama: user.nama,
                    email: user.email,
                    role: user.role,
                    status_akun: user.status_akun,
                    wilayah_rw_id: wilayahRwId,
                    masjid_ids: masjidIds ?? [],
                },
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat login.",
        });
    }
};
exports.loginWithClient = loginWithClient;
const login = async (req, res) => {
    return (0, exports.loginWithClient)(prisma_1.prisma, req, res);
};
exports.login = login;
const approvePengurusWithClient = async (client, req, res) => {
    try {
        if (!req.user || req.user.role !== client_1.Role.RW) {
            res.status(403).json({
                success: false,
                message: "Hanya role RW yang boleh melakukan approval pengurus.",
            });
            return;
        }
        const { user_id, status_akun, alasan_penolakan } = req.body;
        const rwWilayah = await client.wilayahRW.findUnique({
            where: { user_id: req.user.id },
            select: { id: true },
        });
        if (!rwWilayah) {
            res.status(403).json({
                success: false,
                message: "Data wilayah RW untuk user login tidak ditemukan.",
            });
            return;
        }
        if (!user_id || !status_akun) {
            res.status(400).json({
                success: false,
                message: "user_id dan status_akun wajib diisi.",
            });
            return;
        }
        if (status_akun !== "APPROVED" && status_akun !== "REJECTED") {
            res.status(400).json({
                success: false,
                message: "status_akun hanya boleh APPROVED atau REJECTED.",
            });
            return;
        }
        if (status_akun === "REJECTED" && !alasan_penolakan?.trim()) {
            res.status(400).json({
                success: false,
                message: "alasan_penolakan wajib diisi saat menolak pengurus.",
            });
            return;
        }
        const targetUser = await client.user.findUnique({
            where: { id: user_id },
            select: {
                id: true,
                nama: true,
                email: true,
                role: true,
                status_akun: true,
            },
        });
        if (!targetUser) {
            res.status(404).json({
                success: false,
                message: "User pengurus tidak ditemukan.",
            });
            return;
        }
        if (targetUser.role !== client_1.Role.PENGURUS_MASJID) {
            res.status(400).json({
                success: false,
                message: "User yang diproses harus role PENGURUS_MASJID.",
            });
            return;
        }
        if (targetUser.status_akun !== client_1.StatusAkun.PENDING) {
            res.status(400).json({
                success: false,
                message: "Approval hanya bisa dilakukan untuk user dengan status PENDING.",
            });
            return;
        }
        const targetPengurus = await client.pengurusMasjid.findFirst({
            where: { user_id },
            select: {
                masjid: {
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
        if (!targetPengurus) {
            res.status(404).json({
                success: false,
                message: "Relasi pengurus masjid tidak ditemukan.",
            });
            return;
        }
        if (targetPengurus.masjid.blok_wilayah.wilayah_rw_id !== rwWilayah.id) {
            res.status(403).json({
                success: false,
                message: "Akses ditolak. Anda hanya dapat memproses pengurus masjid di wilayah RW Anda.",
            });
            return;
        }
        const updatedUser = await client.user.update({
            where: { id: user_id },
            data: {
                status_akun,
                alasan_penolakan: status_akun === "REJECTED" ? alasan_penolakan?.trim() : null,
            },
            select: {
                id: true,
                nama: true,
                email: true,
                role: true,
                status_akun: true,
                alasan_penolakan: true,
            },
        });
        res.status(200).json({
            success: true,
            message: status_akun === "APPROVED"
                ? "Pengurus masjid berhasil di-approve."
                : "Pengurus masjid berhasil di-reject.",
            data: updatedUser,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat memproses approval pengurus.",
        });
    }
};
exports.approvePengurusWithClient = approvePengurusWithClient;
const approvePengurus = async (req, res) => {
    return (0, exports.approvePengurusWithClient)(prisma_1.prisma, req, res);
};
exports.approvePengurus = approvePengurus;
