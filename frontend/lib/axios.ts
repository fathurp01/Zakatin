import axios, { AxiosError } from "axios";
import { AUTH_STORAGE_KEY } from "@/lib/auth";

export type FieldErrors = Record<string, string>;

export interface ApiClientError {
  message: string;
  status?: number;
  fieldErrors: FieldErrors;
  raw: unknown;
}

interface ValidationIssue {
  field?: string;
  message?: string;
}

interface ErrorEnvelope {
  message?: string;
  errors?: ValidationIssue[];
}

const readTokenFromStorage = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { token?: string };
    return typeof parsed.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
};

const mapValidationErrors = (issues: ValidationIssue[] | undefined): FieldErrors => {
  if (!issues || !Array.isArray(issues)) {
    return {};
  }

  return issues.reduce<FieldErrors>((accumulator, issue) => {
    if (!issue || typeof issue.field !== "string" || typeof issue.message !== "string") {
      return accumulator;
    }

    if (!(issue.field in accumulator)) {
      accumulator[issue.field] = issue.message;
    }

    return accumulator;
  }, {});
};

const normalizeApiError = (error: unknown): ApiClientError => {
  if (!axios.isAxiosError(error)) {
    return {
      message: "Terjadi kesalahan tidak terduga.",
      fieldErrors: {},
      raw: error,
    };
  }

  const axiosError = error as AxiosError<ErrorEnvelope>;
  const status = axiosError.response?.status;
  const payload = axiosError.response?.data;

  const fieldErrors = status === 400 ? mapValidationErrors(payload?.errors) : {};

  return {
    message: payload?.message || axiosError.message || "Terjadi kesalahan saat menghubungi server.",
    status,
    fieldErrors,
    raw: error,
  };
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = readTokenFromStorage();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error))
);

export const getApiError = (error: unknown): ApiClientError => {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    "fieldErrors" in error &&
    "raw" in error
  ) {
    return error as ApiClientError;
  }

  return normalizeApiError(error);
};
