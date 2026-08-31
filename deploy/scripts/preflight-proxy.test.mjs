import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateProxyConfig } from "./preflight-proxy-config.mjs";
import { validateProxyRanges } from "./preflight-proxy-ranges.mjs";

test("accepts the exact proxy config and lab range", () => {
  assert.deepEqual(validateProxyConfig(readFileSync("deploy/proxy/nginx.conf", "utf8")), { upstreamCount: 2 });
  assert.deepEqual(validateProxyRanges(readFileSync("deploy/proxy/cloudflare-ranges.lab.conf", "utf8"), { allowLoopbackLab: true }), { rangeCount: 1 });
});

test("rejects raw forwarded authority and broad ranges", () => {
  assert.throws(() => validateProxyConfig(readFileSync("deploy/proxy/nginx.conf", "utf8").replace('proxy_set_header X-Forwarded-For "";', "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;")), /refused/u);
  assert.throws(() => validateProxyRanges("set_real_ip_from 0.0.0.0/0;\nreal_ip_header X-Forwarded-For;\nreal_ip_recursive off;\n"), /refused/u);
});
