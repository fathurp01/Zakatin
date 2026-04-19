"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.createApp = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const api_1 = __importDefault(require("./routes/api"));
const createApp = () => {
    const app = (0, express_1.default)();
    app.disable("x-powered-by");
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use("/api", api_1.default);
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            message: "Endpoint tidak ditemukan.",
        });
    });
    app.use((err, _req, res, _next) => {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan internal server.",
        });
    });
    return app;
};
exports.createApp = createApp;
exports.app = (0, exports.createApp)();
