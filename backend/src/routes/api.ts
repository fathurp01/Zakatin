import { Router } from "express";
import { approvePengurus, login, register } from "../controllers/authController";
import {
  bayarIuran,
  createKasRW,
  createWarga,
  getIuranWarga,
} from "../controllers/rwController";
import {
  createTransaksiZis,
  getDashboardZis,
} from "../controllers/zisController";
import { cekKodeUnik, getMasjidList } from "../controllers/publicController";
import {
  checkApproval,
  checkRole,
  verifyToken,
} from "../middlewares/authMiddleware";
import {
  authRateLimit,
  publicRateLimit,
  rwActionRateLimit,
  zisActionRateLimit,
} from "../middlewares/rateLimit";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validateRequest";
import {
  approvePengurusSchema,
  bayarIuranSchema,
  cekKodeUnikParamsSchema,
  createKasRWSchema,
  createTransaksiZisSchema,
  createWargaSchema,
  getDashboardZisQuerySchema,
  getIuranWargaQuerySchema,
  loginSchema,
  masjidListQuerySchema,
  registerSchema,
} from "../validation/schemas";

const router = Router();

router.post("/auth/register", authRateLimit, validateBody(registerSchema), register);
router.post("/auth/login", authRateLimit, validateBody(loginSchema), login);
router.patch(
  "/auth/approve-pengurus",
  authRateLimit,
  verifyToken,
  checkRole(["RW"]),
  checkApproval,
  validateBody(approvePengurusSchema),
  approvePengurus
);

router.post(
  "/rw/warga",
  rwActionRateLimit,
  verifyToken,
  checkRole(["RW"]),
  checkApproval,
  validateBody(createWargaSchema),
  createWarga
);
router.get(
  "/rw/iuran-warga",
  rwActionRateLimit,
  verifyToken,
  checkRole(["RW"]),
  checkApproval,
  validateQuery(getIuranWargaQuerySchema),
  getIuranWarga
);
router.patch(
  "/rw/bayar-iuran",
  rwActionRateLimit,
  verifyToken,
  checkRole(["RW"]),
  checkApproval,
  validateBody(bayarIuranSchema),
  bayarIuran
);
router.post(
  "/rw/kas",
  rwActionRateLimit,
  verifyToken,
  checkRole(["RW"]),
  checkApproval,
  validateBody(createKasRWSchema),
  createKasRW
);

router.post(
  "/zis/transaksi",
  zisActionRateLimit,
  verifyToken,
  checkRole(["PENGURUS_MASJID"]),
  checkApproval,
  validateBody(createTransaksiZisSchema),
  createTransaksiZis
);
router.get(
  "/zis/dashboard",
  zisActionRateLimit,
  verifyToken,
  checkRole(["PENGURUS_MASJID"]),
  checkApproval,
  validateQuery(getDashboardZisQuerySchema),
  getDashboardZis
);

router.get(
  "/public/masjid-list",
  publicRateLimit,
  validateQuery(masjidListQuerySchema),
  getMasjidList
);

router.get(
  "/public/cek-kode/:kode_unik",
  publicRateLimit,
  validateParams(cekKodeUnikParamsSchema),
  cekKodeUnik
);

export default router;
