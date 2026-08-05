import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseBlockDocument } from "./blocks";
import { BlockRenderer } from "./block-renderer";

describe("controlled Block renderer", () => {
  it("renders every approved Block through controlled semantic components", () => {
    const productId = "10000000-0000-4000-8000-000000000001";
    const contentId = "10000000-0000-4000-8000-000000000002";
    const document = parseBlockDocument({
      version: 1,
      blocks: [
        { id: "h", type: "heading", level: 2, text: "Heading" },
        { id: "p", type: "paragraph", text: "Paragraph <safe>" },
        { id: "i", type: "image", mediaKey: "image-one" },
        { id: "g", type: "gallery", mediaKeys: ["image-one", "image-two"] },
        { id: "s", type: "specification_table", rows: [{ label: "Label", value: "Value" }] },
        { id: "c", type: "comparison_table", columns: ["A", "B"], rows: [{ label: "Row", cells: ["One", "Two"] }] },
        { id: "f", type: "feature_list", items: ["Feature"] },
        { id: "b", type: "bullet_list", items: ["Bullet"] },
        { id: "co", type: "callout", title: "Callout", text: "Callout body" },
        { id: "q", type: "quote", text: "Quote", attribution: "Synthetic source" },
        { id: "faq", type: "faq", items: [{ question: "Question?", answer: "Answer." }] },
        { id: "rp", type: "related_products", productIds: [productId] },
        { id: "ra", type: "related_articles", contentIds: [contentId] },
        { id: "cta", type: "cta", label: "Get a Quote", href: "/get-quote/" },
        { id: "d", type: "divider" },
      ],
    }, "content");
    const markup = renderToStaticMarkup(<BlockRenderer
      document={document}
      media={{
        "image-one": { id: "image-one", url: "/api/public-assets/image-one/", alt: "Synthetic one", caption: "One" },
        "image-two": { id: "image-two", url: "/api/public-assets/image-two/", alt: "Synthetic two", caption: null },
      }}
      relatedProducts={{ [productId]: { id: productId, href: "/products/synthetic/", label: "Synthetic Product" } }}
      relatedArticles={{ [contentId]: { id: contentId, href: "/fabric-knowledge/synthetic/", label: "Synthetic Article" } }}
    />);
    for (const text of [
      "Heading", "Paragraph", "Synthetic one", "Specifications", "Feature", "Bullet",
      "Callout", "Quote", "Question?", "Synthetic Product", "Synthetic Article", "Get a Quote",
    ]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain("&lt;safe&gt;");
    expect(markup).not.toContain("<script");
    expect(markup).toContain("<hr");
  });
});
