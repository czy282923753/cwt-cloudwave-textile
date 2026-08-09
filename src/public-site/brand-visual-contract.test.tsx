import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrandWaveMotif } from "./brand-wave-motif";

const root = process.cwd();

function relativeLuminance(hex: string): number {
  const components = hex.slice(1).match(/../g)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const [red = 0, green = 0, blue = 0] = components.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(left: string, right: string): number {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  return (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05);
}

describe("Version B brand visual contract", () => {
  it("keeps the exact Owner-approved official Logo and Logo-only navigation", () => {
    const logo = readFileSync(join(root, "public/CWTLOGO.svg"));
    expect(createHash("sha256").update(logo).digest("hex"))
      .toBe("8ec25400c3dd2e68652de821ea01808e6ba9e03987fa0af173436ee164697ae5");

    const shell = readFileSync(join(root, "src/public-site/shell.tsx"), "utf8");
    expect(shell).toContain('src="/CWTLOGO.svg"');
    expect(shell).toContain('data-navigation-logo-only="true"');
    expect(shell).not.toMatch(/>\s*CloudWave Textile\s*<\/span>/);
    expect(shell).not.toContain(">CW</span>");
  });

  it("keeps Home on the official Logo and groups desktop navigation with its CTA", () => {
    const shell = readFileSync(join(root, "src/public-site/shell.tsx"), "utf8");
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const primaryLinks = shell.match(/const primaryLinks = \[([\s\S]*?)\] as const;/)?.[1];

    expect(primaryLinks).toBeDefined();
    expect(primaryLinks).not.toContain('"Home"');
    expect(shell).toContain('aria-label="CloudWave Textile home"');
    expect(shell).toContain('className="desktop-actions"');
    expect(css).toMatch(/\.desktop-actions\s*\{[^}]*gap:\s*2rem;/s);
  });

  it("uses the frozen palette with accessible normal-text pairings", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8").toLowerCase();
    for (const color of ["#2f6e97", "#04aaa0", "#062e39", "#eaf4f5", "#586b73", "#087b76"]) {
      expect(css).toContain(color);
    }
    expect(contrast("#ffffff", "#087b76")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#062e39", "#04aaa0")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", "#04aaa0")).toBeLessThan(4.5);
  });

  it("renders brand geometry as non-semantic CSS structure", () => {
    const html = renderToStaticMarkup(<BrandWaveMotif compact />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-brand-wave="true"');
    expect(html).not.toContain("<svg");
    expect(html.match(/brand-wave__line/g)).toHaveLength(7);
  });

  it("does not introduce missing-product or missing-fabric media placeholders", () => {
    const publicSources = [
      "src/public-site/product-card.tsx",
      "src/public-site/product-detail-renderer.tsx",
      "src/public-site/static-page-renderer.tsx",
      "src/app/fabric-library/page.tsx",
      "src/app/fabric-library/[slug]/page.tsx",
    ].map((path) => readFileSync(join(root, path), "utf8")).join("\n");
    expect(publicSources).not.toContain("weave-placeholder");
  });
});
