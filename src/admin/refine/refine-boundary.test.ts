import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("Refine boundary", () => {
  it("is imported only from the admin surface", async () => {
    const rootLayout = await readFile("src/app/layout.tsx", "utf8");
    const publicPage = await readFile("src/app/page.tsx", "utf8");
    const adminLayout = await readFile("src/app/admin/layout.tsx", "utf8");

    expect(rootLayout).not.toContain("@refinedev");
    expect(publicPage).not.toContain("@refinedev");
    expect(adminLayout).toContain("RefineAdminProvider");
  });
});
