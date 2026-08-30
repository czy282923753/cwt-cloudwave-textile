import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getAdminContent,
  getAdminProduct,
  getAdminStaticPage,
  listAdminContents,
  listAdminProducts,
} from "./data";
import { canAccessEditorialResource } from "./preview-policy";
import { createProductDraft } from "@/catalog/product-service";
import { createContentDraft } from "@/content/content-service";
import { saveStaticPageConfigDraft } from "@/content/static-page-settings";
import { DEFAULT_STATIC_PAGE_CONFIGS } from "@/content/static-page-projection";
import { createTestDatabase } from "@/test/database";

const recordId = "10000000-0000-4000-8000-000000000001";

describe("complete editorial resource access boundary", () => {
  it("keeps the seven-actor resource matrix independent from coarse read capabilities", () => {
    const expected = {
      admin: ["product", "content", "static_page"],
      product_editor: ["product"],
      content_editor: ["content", "static_page"],
      reviewer_publisher: ["product", "content", "static_page"],
      sales: [],
      analyst: [],
    } as const;
    for (const [role, allowed] of Object.entries(expected)) {
      for (const resource of ["product", "content", "static_page"] as const) {
        expect(canAccessEditorialResource(
          role as keyof typeof expected,
          resource,
          "manage",
        )).toBe((allowed as readonly string[]).includes(resource));
      }
    }
  });

  it("authorizes list and detail queries before touching editorial records", async () => {
    await expect(listAdminProducts("sales")).rejects.toThrow(/permission/);
    await expect(listAdminProducts("content_editor")).rejects.toThrow(/permission/);
    await expect(getAdminProduct(recordId, "analyst")).rejects.toThrow(/permission/);
    await expect(listAdminContents("sales")).rejects.toThrow(/permission/);
    await expect(listAdminContents("product_editor")).rejects.toThrow(/permission/);
    await expect(getAdminContent(recordId, "analyst")).rejects.toThrow(/permission/);
    await expect(getAdminStaticPage("home", "sales")).rejects.toThrow(/permission/);
    await expect(getAdminStaticPage("about", "product_editor")).rejects.toThrow(/permission/);
  });

  it("denies direct create and static mutation service calls at the same policy", async () => {
    const connection = await createTestDatabase();
    const sales = { userId: crypto.randomUUID(), role: "sales" as const };
    await expect(createProductDraft(connection.db, sales, {
      name: "TEST forbidden Product",
      primaryTaxonomyTermId: crypto.randomUUID(),
      assetIds: [crypto.randomUUID()],
    })).rejects.toThrow(/permission/);
    await expect(createContentDraft(connection.db, sales, {
      channel: "fabric_knowledge",
      type: "article",
      authorId: crypto.randomUUID(),
      title: "TEST forbidden Content",
      body: "TEST forbidden body",
    })).rejects.toThrow(/permission/);
    await expect(saveStaticPageConfigDraft(
      connection.db,
      sales,
      DEFAULT_STATIC_PAGE_CONFIGS.home,
    )).rejects.toThrow(/permission/);
    await connection.close();
  });
});
