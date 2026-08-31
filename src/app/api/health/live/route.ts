import { processLiveness } from "@/operations/health";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(processLiveness(), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
