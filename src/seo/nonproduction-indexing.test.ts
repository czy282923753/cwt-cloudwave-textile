import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "test-geist" }),
  Geist_Mono: () => ({ variable: "test-geist-mono" }),
}));

import nextConfig from "../../next.config";
import { metadata } from "@/app/layout";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { publicIndexingAllowed } from "@/config/env";

describe("non-production indexing safety", () => {
  it("keeps robots, Metadata, Sitemap, and HTTP headers consistently noindex", async () => {
    expect(publicIndexingAllowed()).toBe(false);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    await expect(sitemap()).resolves.toEqual([]);
    const headerRules = await nextConfig.headers?.();
    expect(
      headerRules?.[0]?.headers.some(
        (header) =>
          header.key.toLowerCase() === "x-robots-tag" &&
          header.value.includes("noindex"),
      ),
    ).toBe(true);
  });
});
