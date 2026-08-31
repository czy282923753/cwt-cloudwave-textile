import { runApplicationReadiness } from "@/operations/readiness-runtime";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const result = await runApplicationReadiness();
  return Response.json(result, {
    status: result.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
