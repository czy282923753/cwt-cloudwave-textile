import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { resolve } from "node:path";

export function validateProxyRanges(source, { allowLoopbackLab = false } = {}) {
  const lines = source.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("Proxy ranges refused: empty source range file.");
  if (!lines.includes("real_ip_header X-Forwarded-For;") || !lines.includes("real_ip_recursive off;")) {
    throw new Error("Proxy ranges refused: trusted-header policy drifted.");
  }
  const ranges = lines.filter((line) => line.startsWith("set_real_ip_from "));
  if (ranges.length === 0 || lines.length !== ranges.length + 2) throw new Error("Proxy ranges refused: unexpected directive.");
  for (const line of ranges) {
    const match = line.match(/^set_real_ip_from ([0-9a-fA-F:.]+)\/(\d{1,3});$/u);
    if (!match || !isIP(match[1])) throw new Error("Proxy ranges refused: invalid directive.");
    const bits = Number(match[2]); const maximum = isIP(match[1]) === 4 ? 32 : 128;
    if (bits < 8 || bits > maximum) throw new Error("Proxy ranges refused: overly broad or invalid range.");
    if (!allowLoopbackLab && (match[1] === "127.0.0.1" || match[1] === "::1")) throw new Error("Proxy ranges refused: loopback is lab-only.");
  }
  return { rangeCount: ranges.length };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const path = process.argv[2];
  if (!path || process.argv.length > 4 || (process.argv[3] && process.argv[3] !== "--lab")) throw new Error("Usage: preflight-proxy-ranges.mjs <path> [--lab]");
  process.stdout.write(`${JSON.stringify({ ok: true, ...validateProxyRanges(readFileSync(resolve(path), "utf8"), { allowLoopbackLab: process.argv[3] === "--lab" }) })}\n`);
}
