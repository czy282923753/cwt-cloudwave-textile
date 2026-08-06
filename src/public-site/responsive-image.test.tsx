import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PublicAsset } from "./data";
import { publicAssetSrcSet, ResponsivePublicImage } from "./responsive-image";

const asset: PublicAsset = {
  id: "10000000-0000-4000-8000-000000000001",
  url: "/api/public-assets/10000000-0000-4000-8000-000000000001/",
  alt: "TEST responsive public fabric",
  caption: null,
  width: 1600,
  height: 1200,
  variants: [
    { format: "webp", url: "/api/public-assets/10000000-0000-4000-8000-000000000001/?variant=960w-webp", width: 960, height: 720 },
    { format: "avif", url: "/api/public-assets/10000000-0000-4000-8000-000000000001/?variant=480w-avif", width: 480, height: 360 },
    { format: "webp", url: "/api/public-assets/10000000-0000-4000-8000-000000000001/?variant=480w-webp", width: 480, height: 360 },
  ],
};

describe("responsive Public Asset rendering", () => {
  it("builds stable application-controlled srcset candidates", () => {
    expect(publicAssetSrcSet(asset, "webp")).toBe(
      "/api/public-assets/10000000-0000-4000-8000-000000000001/?variant=480w-webp 480w, /api/public-assets/10000000-0000-4000-8000-000000000001/?variant=960w-webp 960w",
    );
    expect(publicAssetSrcSet(asset, "avif")).toContain("variant=480w-avif 480w");
  });

  it("renders AVIF/WebP sources, sizes, and one high-priority image", () => {
    const html = renderToStaticMarkup(
      <ResponsivePublicImage
        asset={asset}
        className="object-cover"
        fill
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
      />,
    );
    expect(html).toContain("<picture>");
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('type="image/webp"');
    expect(html).toContain('sizes="(max-width: 768px) 100vw, 50vw"');
    expect(html).toContain('fetchPriority="high"');
    expect((html.match(/<img/g) ?? [])).toHaveLength(1);
    expect(html).not.toContain("objectKey");
  });
});
