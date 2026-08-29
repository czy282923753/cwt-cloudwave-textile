import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("S5-F5 Email Template Admin composition", () => {
  it("keeps the page on accepted Domain reads and excludes customer-record and envelope authority", async () => {
    const page = await readFile("src/app/admin/email-templates/page.tsx", "utf8");
    expect(page).toContain("getEmailTemplateAdminProjection");
    expect(page).toContain("previewSyntheticEmailTemplate");
    expect(page).toContain("SYNTHETIC_TEMPLATE_CONTEXT_ID");
    expect(page).toContain("TEMPLATE_TEST_RECIPIENT");
    expect(page).not.toContain("@/db/schema");
    expect(page).not.toMatch(/\.(insert|update|delete)\s*\(/);
    expect(page).not.toMatch(/getAdminInquiry|listAdminInquiries|Contact|Organization|private Asset|SMTP_HOST/);
    expect(page).not.toMatch(/name=["'](?:recipient|to|cc|bcc|from|replyTo)["']/);
  });

  it("exposes one role-filtered noindex namespace without adding another Admin framework", async () => {
    const [home, layout, provider, namespaceLayout] = await Promise.all([
      readFile("src/app/admin/page.tsx", "utf8"),
      readFile("src/app/admin/layout.tsx", "utf8"),
      readFile("src/admin/refine/refine-admin-provider.tsx", "utf8"),
      readFile("src/app/admin/email-templates/layout.tsx", "utf8"),
    ]);
    expect(home).toContain('["Email Templates", "/admin/email-templates/", "content.read", "email_template"]');
    expect(layout).toContain('"email_template"');
    expect(provider).toContain('{ name: "email-templates", list: "/admin/email-templates", editorialResource: "email_template" }');
    expect(namespaceLayout).toContain("robots: { index: false, follow: false }");
    expect(provider.match(/<Refine\b/g)).toHaveLength(1);
  });

  it("uses the shared governed form for every mutation and keeps rollback explicitly copy-based", async () => {
    const page = await readFile("src/app/admin/email-templates/page.tsx", "utf8");
    expect(page.match(/<AdminActionForm\b/g)?.length).toBeGreaterThanOrEqual(6);
    expect(page).toContain("Rollback as new copy");
    expect(page).toContain("Fixed-Synthetic Preview");
    expect(page).toContain("Running one capture-only test");
    expect(page).not.toMatch(/<form\b/);
  });

  it("keeps one shared Preview with unique kind naming and zero-minimum wrapping containment", async () => {
    const [page, browserEvidence] = await Promise.all([
      readFile("src/app/admin/email-templates/page.tsx", "utf8"),
      readFile("tests/e2e/email-templates.spec.ts", "utf8"),
    ]);
    expect(page).toContain('aria-label={`${kindLabels[kind]} Synthetic Preview`}');
    expect(page).toContain("<TemplatePreview kind={kind} preview={preview} />");
    expect(page.match(/function TemplatePreview\b/g)).toHaveLength(1);
    expect(page).toContain("grid-cols-[minmax(0,1fr)]");
    expect(page).toContain("[overflow-wrap:anywhere]");
    expect(page).toContain('className="mt-2 break-all font-mono text-xs text-slate-400"');
    expect(page).not.toContain('className="mt-2 break-all font-mono text-xs text-slate-500"');
    expect(page).not.toMatch(/overflow-x-hidden|overflow-hidden|text-ellipsis|truncate/);
    expect(browserEvidence).toContain("expect(accessibility.violations).toEqual([])");
    expect(browserEvidence).not.toContain("accessibility.violations.filter");
    expect(browserEvidence).toContain("visualViewportWidth");
    expect(browserEvidence).toContain("LONG_UNBROKEN_TOKEN");
  });
});
