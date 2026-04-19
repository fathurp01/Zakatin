"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zisActionRateLimit = exports.rwActionRateLimit = exports.publicRateLimit = exports.authRateLimit = exports.createLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const createLimiter = (windowMs, limit, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message,
        },
    });
};
exports.createLimiter = createLimiter;
exports.authRateLimit = (0, exports.createLimiter)(15 * 60 * 1000, 10, "Terlalu banyak percobaan autentikasi. Coba lagi nanti.");
exports.publicRateLimit = (0, exports.createLimiter)(15 * 60 * 1000, 60, "Terlalu banyak permintaan publik. Coba lagi nanti.");
exports.rwActionRateLimit = (0, exports.createLimiter)(15 * 60 * 1000, 120, "Terlalu banyak aksi RW. Coba lagi nanti.");
exports.zisActionRateLimit = (0, exports.createLimiter)(15 * 60 * 1000, 120, "Terlalu banyak aksi ZIS. Coba lagi nanti.");
