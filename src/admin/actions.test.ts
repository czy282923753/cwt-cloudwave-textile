import { describe, expect, it, vi } from "vitest";

vi.mock("./actor", () => ({
  currentActor: vi.fn().mockResolvedValue({
    userId: "11111111-1111-4111-8111-111111111111",
    role: "admin",
  }),
}));

import { updateAssetDeclarationAction } from "./actions";

describe("Source Declaration action separation", () => {
  it("rejects a form that attempts to edit and review in the same request", async () => {
    const form = new FormData();
    form.set("assetId", "22222222-2222-4222-8222-222222222222");
    form.set("enabled", "on");
    form.set("rightsStatus", "allowed");
    form.set("markReviewed", "on");
    await expect(updateAssetDeclarationAction(form)).rejects.toThrow(/separate operations/);
  });
});
