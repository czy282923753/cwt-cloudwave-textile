import { env } from "@/config/env";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
  if (origin !== expected) throw new Error("Request origin is not allowed.");
}
