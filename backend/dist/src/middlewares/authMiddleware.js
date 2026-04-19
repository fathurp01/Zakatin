"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkApproval = exports.checkRole = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const getTokenFromHeader = (authorizationHeader) => {
    if (!authorizationHeader) {
        return null;
    }
    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }
    return token;
};
const parseJwtUser = (decoded) => {
    if (typeof decoded === "string") {
        return null;
    }
    const id = decoded.id;
    const role = decoded.role;
    if (typeof id !== "string") {
        return null;
    }
    if (role !== client_1.Role.RW && role !== client_1.Role.PENGURUS_MASJID) {
        return null;
    }
    const wilayahRwId = typeof decoded.wilayah_rw_id === "string" ? decoded.wilayah_rw_id : undefined;
    const masjidIds = Array.isArray(decoded.masjid_ids)
        ? decoded.masjid_ids.filter((value) => typeof value === "string")
        : undefined;
    return {
        id,
        email: typeof decoded.email === "string" ? decoded.email : undefined,
        role,
        wilayah_rw_id: wilayahRwId,
        masjid_ids: masjidIds,
    };
};
const verifyToken = (req, res, next) => {
    const token = getTokenFromHeader(req.headers.authorization);
    if (!token) {
        res.status(401).json({
            message: "Token tidak ditemukan atau format Authorization tidak valid.",
        });
        return;
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        res.status(500).json({
            message: "Server belum dikonfigurasi dengan JWT_SECRET.",
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = parseJwtUser(decoded);
        if (!user) {
            res.status(401).json({
                message: "Payload token tidak valid.",
            });
            return;
        }
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({
            message: "Token tidak valid atau sudah kedaluwarsa.",
        });
    }
};
exports.verifyToken = verifyToken;
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                message: "Akses ditolak. User belum terautentikasi.",
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                message: "Akses ditolak. Role tidak memiliki izin.",
            });
            return;
        }
        next();
    };
};
exports.checkRole = checkRole;
const checkApproval = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            message: "Akses ditolak. User belum terautentikasi.",
        });
        return;
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { status_akun: true },
        });
        if (!user) {
            res.status(401).json({
                message: "User tidak ditemukan.",
            });
            return;
        }
        if (user.status_akun === client_1.StatusAkun.PENDING) {
            res.status(403).json({
                message: "Akun Anda masih menunggu persetujuan.",
            });
            return;
        }
        if (user.status_akun === client_1.StatusAkun.REJECTED) {
            res.status(403).json({
                message: "Akun Anda ditolak.",
            });
            return;
        }
        next();
    }
    catch {
        res.status(500).json({
            message: "Terjadi kesalahan saat memeriksa status akun.",
        });
    }
};
exports.checkApproval = checkApproval;
