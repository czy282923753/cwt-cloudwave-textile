import { createHash } from "node:crypto";

import { env } from "@/config/env";

export function assertRequestLength(
  request: Request,
  maximumBytes: number,
  options: { required?: boolean; exact?: number } = {},
): number | null {
  const raw = request.headers.get("content-length");
  if (!raw) {
    if (options.required) throw new Error("Content-Length is required.");
    return null;
  }
  if (!/^\d+$/.test(raw)) throw new Error("Content-Length is invalid.");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > maximumBytes) {
    throw new Error("Request exceeds the configured size limit.");
  }
  if (options.exact !== undefined && value !== options.exact) {
    throw new Error("Content-Length does not match the Upload Intent.");
  }
  return value;
}

export function trustedClientAddress(request: Request): string | null {
  if (env.TRUSTED_PROXY_MODE === "cloudflare") {
    return request.headers.get("cf-connecting-ip")?.trim() || null;
  }
  if (env.TRUSTED_PROXY_MODE === "vercel") {
    return request.headers.get("x-real-ip")?.trim() || null;
  }
  return null;
}

export function preBodyRateLimitKeys(request: Request): string[] {
  const session = request.headers.get("x-cwt-upload-session")?.trim() || "missing";
  const trustedAddress = trustedClientAddress(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 160) || "unknown";
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  return [
    "global:public-upload",
    `session:${digest(session)}`,
    trustedAddress
      ? `trusted-ip:${digest(trustedAddress)}`
      : `no-trusted-ip:${digest(userAgent)}`,
  ];
}
