"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateBody = void 0;
const formatIssues = (issues) => {
    return issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.map(String).join(".") : "_root",
        message: issue.message,
    }));
};
const validateBody = (schema) => {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validasi body gagal.",
                errors: formatIssues(parsed.error.issues),
            });
            return;
        }
        req.body = parsed.data;
        next();
    };
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validasi query gagal.",
                errors: formatIssues(parsed.error.issues),
            });
            return;
        }
        req.query = parsed.data;
        next();
    };
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.params);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validasi parameter gagal.",
                errors: formatIssues(parsed.error.issues),
            });
            return;
        }
        req.params = parsed.data;
        next();
    };
};
exports.validateParams = validateParams;
