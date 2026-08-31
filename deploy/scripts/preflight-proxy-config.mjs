import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function validateProxyConfig(source) {
  const required = [
    "listen 8080;", "listen 8081;", "proxy_pass http://web-production:3000;", "proxy_pass http://web-staging:3000;",
    "proxy_set_header X-CWT-Client-Address $cwt_trusted_client_address;", "proxy_set_header X-Forwarded-For \"\";",
    "proxy_set_header CF-Connecting-IP \"\";", "proxy_set_header True-Client-IP \"\";",
  ];
  for (const token of required) if (!source.includes(token)) throw new Error(`Proxy config refused: missing ${token}`);
  if (/listen\s+(?:80|443)\b/u.test(source) || source.includes("$proxy_add_x_forwarded_for")) throw new Error("Proxy config refused: privilege or forwarding authority drifted.");
  if ((source.match(/proxy_pass /gu) ?? []).length !== 2) throw new Error("Proxy config refused: upstream count drifted.");
  return { upstreamCount: 2 };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const path = process.argv[2] ?? "deploy/proxy/nginx.conf";
  process.stdout.write(`${JSON.stringify({ ok: true, ...validateProxyConfig(readFileSync(resolve(path), "utf8")) })}\n`);
}
