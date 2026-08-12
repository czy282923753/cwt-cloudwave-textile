import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDeepSeekTextProviderV1, DEEPSEEK_TEXT_ENDPOINT_V1 } from "./deepseek-text-adapter";

const credential = "synthetic-loopback-credential";
const expectedHeaders = [
  "accept",
  "accept-encoding",
  "accept-language",
  "authorization",
  "connection",
  "content-length",
  "content-type",
  "host",
  "sec-fetch-mode",
  "user-agent",
].sort();

function fixtureRequest() {
  return {
    version: 1 as const,
    instructions: "Return one synthetic JSON object.",
    input: "",
    responseFormat: { kind: "json_object" as const, schemaId: "synthetic.output", schemaVersion: 1 },
    maxOutputTokens: 64,
  };
}

async function listen(handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Loopback address unavailable.");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function prepared(fetchImplementation: typeof fetch) {
  const provider = createDeepSeekTextProviderV1({
    fetchImplementation,
    credentialReader: () => credential,
  });
  const result = provider.prepareTextDispatch({
    model: "deepseek-v4-flash",
    parameters: {},
    request: fixtureRequest(),
  });
  if (!result.ok) throw new Error("Loopback preparation failed.");
  return result.value;
}

describe("Node 24 built-in fetch DeepSeek semantics", () => {
  it("runs only on the exact reviewed runtime tuple", () => {
    expect({
      node: process.versions.node,
      v8: process.versions.v8,
      icu: process.versions.icu,
      unicode: process.versions.unicode,
      cldr: process.versions.cldr,
      platform: process.platform,
      arch: process.arch,
    }).toEqual({
      node: "24.14.0",
      v8: "13.6.233.17-node.41",
      icu: "78.2",
      unicode: "17.0",
      cldr: "48.0",
      platform: "darwin",
      arch: "arm64",
    });
  });

  it("uses manual redirect without touching the destination", async () => {
    let destinationHits = 0;
    const { server, baseUrl } = await listen((request, response) => {
      if (request.url === "/destination") {
        destinationHits += 1;
        response.writeHead(200, { "content-type": "application/json" });
        response.end("{}");
        return;
      }
      response.writeHead(302, { Location: `${baseUrl}/destination` });
      response.end("redirect body must not be parsed");
    });
    try {
      const dispatch = prepared(async (url, init) => {
        expect(url).toBe(DEEPSEEK_TEXT_ENDPOINT_V1);
        return fetch(`${baseUrl}/redirect`, init);
      });
      const result = await dispatch.execute({ signal: new AbortController().signal });
      expect(result).toMatchObject({
        kind: "failure",
        httpStatus: 302,
        retryClass: "not_retryable",
      });
      expect(destinationHits).toBe(0);
    } finally {
      server.close();
      await once(server, "close");
    }
  });

  it("emits the exact Node header-name multiset and only three application headers", async () => {
    let capturedNames: string[] = [];
    let capturedAuthorization = "";
    const { server, baseUrl } = await listen((request, response) => {
      capturedNames = request.rawHeaders.filter((_, index) => index % 2 === 0)
        .map((name) => name.toLowerCase()).sort();
      capturedAuthorization = request.headers.authorization ?? "";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        id: "synthetic_loopback_request",
        model: "deepseek-v4-flash",
        choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "{}" } }],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2,
          prompt_cache_hit_tokens: 0,
          prompt_cache_miss_tokens: 1,
        },
      }));
    });
    try {
      const dispatch = prepared(async (url, init) => {
        expect(url).toBe(DEEPSEEK_TEXT_ENDPOINT_V1);
        expect(Object.keys(init?.headers ?? {}).map((name) => name.toLowerCase()).sort())
          .toEqual(["accept", "authorization", "content-type"]);
        return fetch(`${baseUrl}/success`, init);
      });
      expect(await dispatch.execute({ signal: new AbortController().signal }))
        .toMatchObject({ kind: "success" });
      expect(capturedNames).toEqual(expectedHeaders);
      expect(capturedAuthorization).toBe(`Bearer ${credential}`);
      expect(capturedNames.filter((name) => name === "authorization")).toHaveLength(1);
      expect(capturedNames.some((name) => name === "cookie" || name === "forwarded" ||
        name.startsWith("x-forwarded-") || name === "traceparent" || name === "baggage" ||
        name === "proxy-authorization" || name === "x-api-key")).toBe(false);
    } finally {
      server.close();
      await once(server, "close");
    }
  });

  it("classifies an unreachable loopback socket as transient transport", async () => {
    const { server, baseUrl } = await listen((_request, response) => response.end());
    server.close();
    await once(server, "close");
    const dispatch = prepared(async (_url, init) => fetch(baseUrl, init));
    expect(await dispatch.execute({ signal: new AbortController().signal })).toMatchObject({
      kind: "failure",
      failureCode: "transport",
      retryClass: "same_provider_transient",
    });
  });
});
