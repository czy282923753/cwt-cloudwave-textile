import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DEEPSEEK_CHAT_COMPLETION_SOURCE_URL_V1,
  DEEPSEEK_PRICING_SOURCE_URL_V1,
  runDeepSeekOfficialSourcePreflightV1,
  type DeepSeekOfficialSourcePreflightTestSeamsV1,
} from "./deepseek-official-source-preflight";

const pricingBytes = "synthetic pricing facts";
const chatBytes = "synthetic chat facts";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const contracts: NonNullable<DeepSeekOfficialSourcePreflightTestSeamsV1["contracts"]> = [{
  url: DEEPSEEK_PRICING_SOURCE_URL_V1,
  maximumBytes: 65_536,
  expectedHash: hash(pricingBytes),
  verifyFacts: (text) => text === pricingBytes,
}, {
  url: DEEPSEEK_CHAT_COMPLETION_SOURCE_URL_V1,
  maximumBytes: 262_144,
  expectedHash: hash(chatBytes),
  verifyFacts: (text) => text === chatBytes,
}];

describe("DeepSeek official source preflight V1", () => {
  it("performs exactly two ordered manual-redirect GETs", async () => {
    const observed: string[] = [];
    const fetchImplementation = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      observed.push(String(url));
      expect(init).toMatchObject({ method: "GET", redirect: "manual" });
      return new Response(observed.length === 1 ? pricingBytes : chatBytes, { status: 200 });
    });
    const result = await runDeepSeekOfficialSourcePreflightV1({
      fetchImplementation,
      contracts,
      now: () => new Date("2026-08-12T16:38:29.000Z"),
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "PASS",
        retrieved_at: "2026-08-12T16:38:29.000Z",
        counters: {
          official_pricing_get: 1,
          official_chat_completion_schema_get: 1,
          official_source_get_total: 2,
          billable_post: 0,
        },
      },
    });
    expect(observed).toEqual([
      DEEPSEEK_PRICING_SOURCE_URL_V1,
      DEEPSEEK_CHAT_COMPLETION_SOURCE_URL_V1,
    ]);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("stops after a pricing mismatch with counts 1/0/1/0", async () => {
    const fetchImplementation = vi.fn(async () => new Response("changed", { status: 200 }));
    const result = await runDeepSeekOfficialSourcePreflightV1({ fetchImplementation, contracts });
    expect(result).toEqual({
      ok: false,
      code: "official_source_hash_mismatch",
      counters: {
        official_pricing_get: 1,
        official_chat_completion_schema_get: 0,
        official_source_get_total: 1,
        billable_post: 0,
      },
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("stops after a Chat Completion mismatch with counts 1/1/2/0", async () => {
    const fetchImplementation = vi.fn(async () => new Response(
      fetchImplementation.mock.calls.length === 1 ? pricingBytes : "changed",
      { status: 200 },
    ));
    const result = await runDeepSeekOfficialSourcePreflightV1({ fetchImplementation, contracts });
    expect(result).toMatchObject({
      ok: false,
      code: "official_source_hash_mismatch",
      counters: {
        official_pricing_get: 1,
        official_chat_completion_schema_get: 1,
        official_source_get_total: 2,
        billable_post: 0,
      },
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("rejects redirect by status before Location or body access", async () => {
    let locationReads = 0;
    let bodyReads = 0;
    const redirect = {
      status: 302,
      get headers() {
        locationReads += 1;
        throw new Error("Location must not be read");
      },
      get body() {
        bodyReads += 1;
        throw new Error("Body must not be read");
      },
    } as unknown as Response;
    const result = await runDeepSeekOfficialSourcePreflightV1({
      fetchImplementation: async () => redirect,
      contracts,
    });
    expect(result).toMatchObject({ ok: false, code: "official_source_redirect_rejected" });
    expect(locationReads).toBe(0);
    expect(bodyReads).toBe(0);
  });

  it("rejects caps, invalid UTF-8 and transport without retry", async () => {
    const tooLargeContracts: typeof contracts = [{ ...contracts[0], maximumBytes: 2 }, contracts[1]];
    const tooLargeFetch = vi.fn(async () => new Response(pricingBytes));
    expect(await runDeepSeekOfficialSourcePreflightV1({
      fetchImplementation: tooLargeFetch,
      contracts: tooLargeContracts,
    })).toMatchObject({ ok: false, code: "official_source_too_large" });
    expect(tooLargeFetch).toHaveBeenCalledTimes(1);

    const invalidUtf8Contracts: typeof contracts = [{
      ...contracts[0],
      expectedHash: createHash("sha256").update(new Uint8Array([0xff])).digest("hex"),
    }, contracts[1]];
    expect(await runDeepSeekOfficialSourcePreflightV1({
      fetchImplementation: async () => new Response(new Uint8Array([0xff])),
      contracts: invalidUtf8Contracts,
    })).toMatchObject({ ok: false, code: "official_source_utf8_invalid" });

    const transport = vi.fn(async () => { throw new TypeError("synthetic transport"); });
    expect(await runDeepSeekOfficialSourcePreflightV1({
      fetchImplementation: transport,
      contracts,
    })).toMatchObject({ ok: false, code: "official_source_transport_failed" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
