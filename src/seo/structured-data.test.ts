import { describe, expect, it } from "vitest";

import {
  articleAuthorStructuredData,
  productStructuredData,
  taxonomyBreadcrumbStructuredData,
} from "./structured-data";

describe("public structured-data evidence boundaries", () => {
  it("omits an unverified Product brand", () => {
    const schema = productStructuredData({
      name: "TEST Evidence-bound Product",
      description: undefined,
      path: "/products/test-evidence-bound/",
      specifications: [],
      faqs: [],
    }, "https://cwtextile.com");
    const product = schema["@graph"][0];
    expect(product).toMatchObject({ "@type": "Product", name: "TEST Evidence-bound Product" });
    expect(product).not.toHaveProperty("brand");
  });

  it("uses Person or Organization from the approved Author record", () => {
    expect(articleAuthorStructuredData("TEST Person", false)).toEqual({
      "@type": "Person",
      name: "TEST Person",
    });
    expect(articleAuthorStructuredData("TEST Organization", true)).toEqual({
      "@type": "Organization",
      name: "TEST Organization",
    });
  });

  it("omits the nonexistent Fabric Types hub from Taxonomy breadcrumbs", () => {
    const breadcrumb = taxonomyBreadcrumbStructuredData(
      "TEST Linen",
      "/fabric-types/test-linen/",
      "https://cwtextile.com",
    );
    expect(breadcrumb.itemListElement).toHaveLength(2);
    expect(JSON.stringify(breadcrumb)).not.toContain("/fabric-types/\"");
    expect(breadcrumb.itemListElement[1]).toMatchObject({
      position: 2,
      item: "https://cwtextile.com/fabric-types/test-linen/",
    });
  });
});
