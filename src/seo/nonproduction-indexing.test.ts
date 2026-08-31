import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("next/font/local", () => ({
  default: (options: { variable: string }) => ({ variable: options.variable }),
}));

import { generateMetadata } from "@/app/layout";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { publicIndexingAllowed } from "@/config/env";
import { applyRuntimeResponsePolicy } from "@/proxy";

describe("non-production indexing safety", () => {
  it("keeps robots, Metadata, Sitemap, and HTTP headers consistently noindex", async () => {
    expect(publicIndexingAllowed()).toBe(false);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(generateMetadata().robots).toMatchObject({ index: false, follow: false });
    await expect(sitemap()).resolves.toEqual([]);
    expect(applyRuntimeResponsePolicy(NextResponse.next()).headers.get("x-robots-tag"))
      .toBe("noindex, nofollow, noarchive");
  });
});
