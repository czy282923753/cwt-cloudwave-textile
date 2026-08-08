# Phase 1B Stage 3 Brand Visual Version B Implementation Report

## Status and authority

- Report date: 2026-08-09.
- Implementation branch: `codex/ui-version-b-independent-ee87`.
- Frozen implementation baseline: `ee87a0be9ac6740250dc80c563f9eb4b2e135822`.
- Implementation commit: `f0ea93ecd884f7c2a91288f32a86a39e6e1f92b7`.
- The implementation commit has the single parent `ee87a0be9ac6740250dc80c563f9eb4b2e135822`.
- Owner-selected direction: Version B — Scheme 1 + Selective Scheme 4.
- This report records implementation evidence only. It does not declare Review Passed, Accepted/Frozen, Production Ready, or completion of independent acceptance.

## Fixed design evidence

The implementation used the following frozen design evidence supplied by the Owner:

| Evidence | Source | Verified SHA-256 |
| --- | --- | --- |
| Official CWT Logo | `/Users/calvin/.codex/visualizations/2026/08/06/019fd920-8fac-7fa3-b920-ffac9756de76/brand-final-preview-ee87/CWTLOGO.svg` | `8ec25400c3dd2e68652de821ea01808e6ba9e03987fa0af173436ee164697ae5` |
| Selected design direction | `/Users/calvin/.codex/visualizations/2026/08/06/019fd920-8fac-7fa3-b920-ffac9756de76/brand-final-preview-ee87/DESIGN_DIRECTION_SELECTED.md` | `a8d2c6dc8c3c4413bb31d50de53f7970447ea331332ea91e1ff519cd605105b0` |
| Version B overview | `/Users/calvin/.codex/visualizations/2026/08/06/019fd920-8fac-7fa3-b920-ffac9756de76/brand-final-preview-ee87/version-b-scheme1-plus-scheme4/version-b-overview.png` | `0b958cafa1109c6f81abef2dd54bb34fd2e90cca03d827918ab47c7b4f9e0eb8` |
| Version B page and comparison report | `/Users/calvin/.codex/visualizations/2026/08/06/019fd920-8fac-7fa3-b920-ffac9756de76/brand-final-preview-ee87/version-b-scheme1-plus-scheme4/VERSION_B_AND_AB_REPORT.md` | `245bf70b3e27fd5a4554ef580ba319a1344ae73fb7cb8a23c4a580a6e9ae6768` |

The repository copy at `public/CWTLOGO.svg` was verified against the official source and has SHA-256 `8ec25400c3dd2e68652de821ea01808e6ba9e03987fa0af173436ee164697ae5`.

## Owner visual rules implemented

- Scheme 1 Ocean Balance remains the dominant light-page treatment, using light surfaces for approximately 80–85% of the page composition.
- Selective Scheme 4 deep-sea treatment uses `#062E39` only in identified emphasis zones.
- The fixed palette is:
  - web blue `#2F6E97`;
  - web green `#04AAA0`;
  - deep sea `#062E39`;
  - light background `#EAF4F5`;
  - body copy `#586B73`;
  - accessible CTA `#087B76`.
- `#04AAA0` is not used as the background for ordinary-size white text. It is used for decorative/accent purposes, while ordinary white CTA text uses `#087B76` or the deep-sea surface.
- The official Logo preserves its embedded SVG colors, proportions, and whitespace. It was not redrawn, transformed, or recolored.
- The navigation's left side exposes only the official Logo. It does not add visible `CloudWave Textile` company-name text next to the Logo. The home link retains an accessible label while the Logo image itself remains decorative within that labeled link.
- No company, factory, capacity, certification, MOQ, product, or supply-chain facts were invented.

## Implemented mechanisms

### Brand shell and navigation

- `src/public-site/shell.tsx` now uses the verified `public/CWTLOGO.svg` in the public header and footer.
- Desktop navigation includes the governed public routes and an accessible Fabric & Sourcing disclosure menu.
- Mobile navigation uses a responsive full-height disclosure surface with explicit open/close affordances and a deep-sea bottom inquiry action.
- Desktop and mobile fixed inquiry actions retain the existing governed `/get-quote/` route.
- The footer adopts the deep-sea treatment while preserving existing route and content semantics.

### Visual tokens and code-native motif

- `src/app/globals.css` defines the Version B palette, typography, spacing, surfaces, cards, buttons, focus states, header/footer behavior, responsive navigation, and selective deep zones.
- `src/public-site/brand-wave-motif.tsx` builds the approved wave/geometry motif with HTML and CSS primitives. No new Logo SVG, AI image, or substitute textile image was generated.
- The motif is used only when the governed placement does not provide an eligible public image.

### Public page adaptation

- The fixed-page renderer applies the Version B home hierarchy without changing the frozen home H1, page order, CTA destinations, or business meaning.
- Selective deep-sea zones are explicitly registered for the home Applications area, content-index CTA, article consultation and related-resource areas, and inquiry guidance.
- Product, Application, Fabric Library, Fabric Type, Resource, Privacy, Content Index, Content Article, and Inquiry surfaces use the shared Version B tokens and responsive layouts.
- Content articles include breadcrumb treatment and an optional On-this-page index derived only from existing renderable headings.
- Editorial heading blocks receive stable DOM IDs for those optional in-page links.
- The Inquiry page changes visual hierarchy only. It does not add Company, fabricated selection options, consent fields, or other new business inputs, and it preserves the existing private-file and submission semantics.

### Public media boundary

- Product cards and detail surfaces render a media region only when an eligible public image exists.
- Fabric Library and related public listings also omit missing media rather than displaying a generic weave, placeholder, or AI-generated fabric.
- `ResponsivePublicImage` and fixed-page picture elements establish an explicit positioned `<picture>` wrapper for `next/image fill`, resolving the browser warning while retaining governed AVIF/WebP source selection and application-controlled media routes.
- Real product photography is not included in this Candidate. Final product-image visual validation remains `Waiting for Real Product Data Validation`.

## Implementation file inventory

The implementation commit contains exactly these 26 files:

1. `public/CWTLOGO.svg`
2. `src/app/applications/[slug]/page.tsx`
3. `src/app/applications/page.tsx`
4. `src/app/fabric-library/[slug]/page.tsx`
5. `src/app/fabric-library/page.tsx`
6. `src/app/fabric-types/[slug]/page.tsx`
7. `src/app/get-quote/page.tsx`
8. `src/app/globals.css`
9. `src/app/privacy/page.tsx`
10. `src/app/products/page.tsx`
11. `src/app/resources/page.tsx`
12. `src/editorial/block-renderer.tsx`
13. `src/public-site/brand-visual-contract.test.tsx`
14. `src/public-site/brand-wave-motif.tsx`
15. `src/public-site/content-article-renderer.tsx`
16. `src/public-site/content-pages.tsx`
17. `src/public-site/inquiry-form.tsx`
18. `src/public-site/product-card.tsx`
19. `src/public-site/product-detail-renderer.tsx`
20. `src/public-site/responsive-image.test.tsx`
21. `src/public-site/responsive-image.tsx`
22. `src/public-site/shell.tsx`
23. `src/public-site/static-page-renderer.test.tsx`
24. `src/public-site/static-page-renderer.tsx`
25. `src/uploads/admin-finalize-public-variant.integration.test.tsx`
26. `tests/e2e/public.spec.ts`

No package manifest, lock file, Schema/Migration, ADR, authorization, upload/asset business rule, Inquiry workflow, Product Import implementation, database, SEO namespace, URL, or Redirect mechanism was changed.

## Verification evidence

All final evidence was collected from the independent branch and isolated non-production data:

| Gate | Final result |
| --- | --- |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed with zero warnings |
| `pnpm test:run` | 95 files passed; 385 tests passed |
| `pnpm exec playwright test tests/e2e/public.spec.ts --retries=0` | 44 tests passed across desktop and mobile projects |
| Production build | Passed against a fresh migrated and seeded test-only PGlite database; 43 static page units generated |
| `pnpm check:bundle` | Passed across 23 public-page manifests and 31 manifest/chunk files |
| `git diff --check` | Passed |

The automated coverage includes:

- exact official Logo source and Logo-only navigation contracts;
- Version B palette and contrast assertions, including white on `#087B76`, `#04AAA0` on `#062E39`, and the prohibition on ordinary white text over `#04AAA0`;
- desktop and mobile navigation behavior;
- selective deep-zone presence;
- no horizontal overflow at governed widths;
- Axe accessibility checks;
- public media projection and responsive variants;
- Inquiry and existing publishing/governance regressions.

Production-browser visual verification used a fresh test-only PGlite database with Product Import explicitly off. The following surfaces were inspected at 1440 × 900 and/or 390 × 844:

- `/` including the home hero and selective Applications deep zone;
- `/fabric-knowledge/`;
- `/fabric-knowledge/test-e2e-block-media-content/`;
- `/get-quote/`;
- the expanded 390 px mobile navigation.

The checked production preview had no horizontal overflow and no console warning or error. The preview servers were stopped and their synthetic temporary data was deleted after validation. No Production/Staging credentials or formal data were used.

## Initial failures and narrow corrections

The following intermediate failures were preserved as implementation evidence rather than hidden:

1. A first plain local `pnpm build` compiled and passed TypeScript but could not prerender `/about` because the default local database lacked `system_settings`. The build was rerun against a fresh migrated and seeded test-only PGlite database and passed. No production/default database data was created or imported.
2. The first full public Playwright run passed 40 tests and failed 4 assertions that still selected the pre-Version-B text logo, the former first-page image, or an old Tailwind byline color class. The selectors were narrowed to the official header Logo, product-detail media boundary, and computed body-copy color. Product/publishing assertions were not weakened. The final run passed 44/44.
3. Development-mode browser inspection exposed the known CSP/eval development overlay and a `next/image fill` warning caused by an unpositioned direct `<picture>` parent. The media boundary was fixed with an explicit positioned full-size picture wrapper. Verification moved to the production preview, which emitted no warning or error.
4. After the picture-wrapper correction, two tests still expected the literal string `<picture>`. Their assertions were updated to require the new positioned wrapper. A first full rerun identified the second old assertion after 94 files and 384 tests had passed; the final full rerun passed all 95 files and 385 tests.

## Independence and exclusions

- The unauthorized draft commit `8059f5f44e497713f04d9fa0ad09347ca32d3631` and branch `codex/brand-visual-version-b` were treated only as Draft / Reference Only / HOLD identifiers.
- Their code, diff, and test conclusions were not read, diffed, cherry-picked, copied, merged, or reused.
- The implementation was independently analyzed and created from `ee87a0be9ac6740250dc80c563f9eb4b2e135822`.
- Stage 3 baseline history and all protected branches/tags were left unchanged.
- No Reviewer or Fresh Acceptance contact, Tag, Push, Deploy, Production action, or formal data operation is part of this report.

## Remaining acceptance boundary

This Candidate is ready for Owner-directed independent review only. It does not close any Finding and does not claim Review Passed, Accepted/Frozen, or Production Ready. Real product-image quality and final photographic composition remain `Waiting for Real Product Data Validation`.
