import { describe, expect, it } from "vitest";

import {
  blockDocumentPlainText,
  legacyTextToBlockDocument,
  parseBlockDocument,
  referencedMediaKeys,
} from "./blocks";

describe("versioned editorial Block documents", () => {
  it("converts legacy text deterministically without inventing content", () => {
    expect(legacyTextToBlockDocument("Approved\nlegacy copy.")).toEqual({
      version: 1,
      blocks: [{
        id: "legacy-paragraph-1",
        type: "paragraph",
        text: "Approved\nlegacy copy.",
      }],
    });
    expect(legacyTextToBlockDocument("  ")).toEqual({ version: 1, blocks: [] });
  });

  it("accepts the complete allowlisted V1 set and extracts plain text", () => {
    const document = parseBlockDocument({
      version: 1,
      blocks: [
        { id: "heading", type: "heading", level: 2, text: "Heading" },
        { id: "paragraph", type: "paragraph", text: "Body" },
        { id: "image", type: "image", mediaKey: "detail-one" },
        { id: "gallery", type: "gallery", mediaKeys: ["gallery-one", "gallery-two"] },
        { id: "specs", type: "specification_table", rows: [{ label: "Use", value: "Example" }] },
        { id: "compare", type: "comparison_table", columns: ["A", "B"], rows: [{ label: "Row", cells: ["One", "Two"] }] },
        { id: "features", type: "feature_list", items: ["Feature"] },
        { id: "bullets", type: "bullet_list", items: ["Bullet"] },
        { id: "callout", type: "callout", title: "Note", text: "Callout" },
        { id: "quote", type: "quote", text: "Quote", attribution: "Source" },
        { id: "faq", type: "faq", items: [{ question: "Question?", answer: "Answer." }] },
        { id: "products", type: "related_products", productIds: ["10000000-0000-4000-8000-000000000001"] },
        { id: "articles", type: "related_articles", contentIds: ["10000000-0000-4000-8000-000000000002"] },
        { id: "cta", type: "cta", label: "Get a Quote", href: "/get-quote/" },
        { id: "divider", type: "divider" },
      ],
    }, "content");
    expect(blockDocumentPlainText(document)).toContain("Heading\nBody");
    expect(referencedMediaKeys(document)).toEqual([
      "detail-one",
      "gallery-one",
      "gallery-two",
    ]);
  });

  it("fails closed for unknown versions, unknown fields, unsafe links, and duplicate IDs", () => {
    expect(() => parseBlockDocument({ version: 2, blocks: [] }, "content")).toThrow();
    expect(() => parseBlockDocument({ version: 1, blocks: [{ id: "x", type: "raw_html", html: "<b>x</b>" }] }, "content")).toThrow();
    expect(() => parseBlockDocument({ version: 1, blocks: [{ id: "x", type: "paragraph", text: "Safe", style: "position:fixed" }] }, "content")).toThrow();
    expect(() => parseBlockDocument({ version: 1, blocks: [{ id: "x", type: "cta", label: "Unsafe", href: "javascript:alert(1)" }] }, "content")).toThrow();
    expect(() => parseBlockDocument({ version: 1, blocks: [{ id: "x", type: "divider" }, { id: "x", type: "divider" }] }, "content")).toThrow();
  });

  it("keeps Product factual specifications outside narrative Blocks", () => {
    expect(() => parseBlockDocument({
      version: 1,
      blocks: [{ id: "facts", type: "specification_table", rows: [{ label: "GSM", value: "180" }] }],
    }, "product")).toThrow(/relational fields/);
  });
});
