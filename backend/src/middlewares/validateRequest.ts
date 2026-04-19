import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

const formatIssues = (
  issues: ReadonlyArray<{ path: ReadonlyArray<string | number | symbol>; message: string }>
) => {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map(String).join(".") : "_root",
    message: issue.message,
  }));
};

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validasi query gagal.",
        errors: formatIssues(parsed.error.issues),
      });
      return;
    }

    req.query = parsed.data as Request["query"];
    next();
  };
};

export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validasi parameter gagal.",
        errors: formatIssues(parsed.error.issues),
      });
      return;
    }

    req.params = parsed.data as Request["params"];
    next();
  };
};
