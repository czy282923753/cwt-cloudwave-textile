# Phase 1B Stage 3 Public Contact Information Display Implementation Report

## 1. Candidate status

- Role: independent Developer for the public contact-information display task.
- Result: **Developer Candidate — PAUSED**.
- Frozen starting point: `b2b5985d7f9b748189a8ade1277c273abedbe6e7`.
- Task branch: `codex/public-contact-information-display`.
- Code-and-test commit: `1c497eb62591da73a1bf36aba366ac748afcf22e`.
- This report does not claim Independent Review, Fresh Acceptance, Accepted/Frozen, Production Ready, deployment, or the start of another role.

## 2. Owner source and exact authorized facts

The project Owner explicitly confirmed and authorized these public values in the delegated task dated 2026-08-09:

- Email: `sales@cwtextile.com`.
- WhatsApp display: `+86 133 8000 7688`.
- WhatsApp canonical `wa.me` digits: `8613380007688`.
- Location: `Guangzhou, Guangdong, China`.
- Business Hours: `Monday–Friday, 9:00–18:00 (UTC+8)`.

No external source, inferred company fact, internal notification address, fixture value, or unconfirmed business claim was used.

## 3. Company Fact and environment-boundary review

The existing `company_facts` authority and `currentPublicCompanyFactConditions()` were reviewed before implementation. The persistent Company Fact path requires a verified record, explicit public-use permission, verifier identity, verification time, non-empty evidence, and a current review window. This task did not weaken, bypass, seed, migrate, or write that persistent workflow. It also did not add a second persistent Company Information mechanism.

The current Owner instruction is the explicit authority for this narrowly bounded set of public contact values. Because the task prohibits production-data import and backend Company Information work while requiring the approved values to render now, the implementation uses one immutable, code-owned configuration module as the current replaceable authority. The module documents its temporary replacement condition and is not a general-purpose path for publishing other Company Facts.

The previous `WHATSAPP_NUMBER` environment variable supplied only the floating WhatsApp action and could drift independently from the new Footer and Get Quote displays. It was removed from the runtime schema, production preflight, environment example, and environment test. Public contact information is not secret and is not environment-specific, so adding four new environment variables would have introduced operational drift without adding a valid evidence or review boundary.

`INQUIRY_NOTIFICATION_TO` remains the internal notification-delivery destination only. It is not read by public rendering, is not used as the public email address, and the environment example now labels its section `Internal inquiry email delivery`.

## 4. Single authority and replacement condition

`src/config/public-contact-information.ts` is the only production source containing the four approved values and their derived `mailto:` and `wa.me` links. Footer, Get Quote direct-contact rendering, and the existing floating WhatsApp actions all read that source. There is no environment fallback, database fallback, duplicate hardcoding, or dual read/write path.

A future persistent Company Information administration flow must replace this module atomically after separate Owner approval and any required architecture/ADR, schema, migration, audit, authorization, production-data, and rollback review. Cutover must delete this code authority and update all consumers to the approved persistent authority; it must not keep this module as a fallback or parallel source.

## 5. Implemented scope

- Added the immutable Owner-confirmed public contact configuration.
- Added one shared semantic contact renderer with:
  - Footer variant: Email, WhatsApp, Location, and Business Hours.
  - Direct variant: Email and WhatsApp only.
- Added the Footer Contact section while retaining the official Logo, existing Explore and Knowledge areas, Privacy link, legal-name fallback, and responsive layout.
- Added `Contact us directly` to the existing Version B Get Quote guidance panel without changing the main CTA, Inquiry form, upload/privacy behavior, or country-code contract.
- Kept Email on `mailto:sales@cwtextile.com`.
- Kept WhatsApp on `https://wa.me/8613380007688` and used the existing `whatsapp_click` tracked-link path.
- Limited WhatsApp analytics to the allowlisted non-PII `placement` values (`footer_contact`, `quote_direct`, `desktop_float`, or `mobile_bar`). No email address or phone number enters analytics properties.
- Reworked the Footer grid to one column on small screens, two columns from 768 px, and four bounded columns from 1024 px; contact links use safe wrapping.
- Added no Contact page, Contact/Header navigation, Home/Header navigation, new Header CTA, or route.

## 6. File scope

Code and configuration:

- `.env.example`
- `src/config/env.ts`
- `src/config/public-contact-information.ts`
- `src/public-site/public-contact-information.tsx`
- `src/public-site/shell.tsx`
- `src/app/get-quote/page.tsx`
- `src/app/globals.css`

Tests:

- `src/config/env.test.ts`
- `src/public-site/public-contact-information.test.tsx`
- `tests/e2e/public.spec.ts`

No Schema, Migration, table, state, Worker, queue, Outbox, background job, database seed, production data, Header route, Contact page, or new dependency was added.

## 7. Verification environment

- Host architecture: Apple Silicon `arm64`.
- Node.js: `v24.14.0`, `process.arch = arm64`.
- pnpm: `11.9.0`.
- The task worktree began without `node_modules`, `.next`, a local database, storage, or browser-test artifacts.
- Dependencies were installed into this worktree with `--frozen-lockfile` from a new task-owned pnpm store at `/tmp/cwt-public-contact-abf8-b2b5985d-pnpm-store`; pnpm reported `reused 0` and downloaded 526 packages.
- Chromium, headless shell, and FFmpeg were freshly downloaded to `/tmp/cwt-public-contact-abf8-b2b5985d-playwright` and used through `PLAYWRIGHT_BROWSERS_PATH`.
- Playwright created fresh isolated E2E database/storage roots through its existing temporary-root configuration.
- No existing Developer or Reviewer `node_modules`, cache, database, build, browser session, branch content, or worktree was entered or reused.

## 8. Verification results

All final gates passed without `skip`, `only`, retry, suppression, warning allowance, or reduced strictness:

| Gate | Command / scope | Result |
| --- | --- | --- |
| Focused unit/config | `pnpm exec vitest run src/public-site/public-contact-information.test.tsx src/config/env.test.ts` | 2 files, 9 tests passed |
| Lint | `pnpm lint` | Passed with zero warnings |
| Strict typecheck | `pnpm typecheck` | Passed |
| Full Vitest | `pnpm test:run` | 97 files, 416 tests passed in 266.06 s |
| Production Build | isolated migrated/seeded task PGlite + `pnpm build` | Passed; 43 static pages generated and all routes completed |
| Public bundle | `pnpm check:bundle` | Passed across 23 public page manifests and 31 manifest/chunk files |
| Focused Playwright | contact test, Chromium projects, `--retries=0` | 2 tests passed in 39.1 s |
| Full Playwright | `pnpm exec playwright test --retries=0` with task-owned browser path | 54 tests passed in 2.1 min |
| Patch hygiene | `git diff --check` | Passed |

The new browser coverage verifies exact text and links, Footer and Get Quote rendering, direct-channel field limits, absence of Contact/Home Header navigation, absence of `/contact/` and `/contact-us/` pages, unchanged primary form CTA, keyboard focus order, critical/serious Axe results, and no horizontal overflow at 320, 390, 1024, and 1440 px. Existing six-width public coverage also continued to pass.

The new unit coverage verifies the frozen single source, both render variants, removal of the former public WhatsApp environment authority, no renderer dependency on `INQUIRY_NOTIFICATION_TO`, and an actual tracked WhatsApp click payload containing only `safeProperties.placement` and no email or phone value.

## 9. Environment interruption and resolution

The first standalone `pnpm build` attempt used the repository's default uninitialized local PGlite path and stopped while prerendering `/about` because `system_settings` did not exist. This was an environment initialization failure, not a code or test failure, and it was not concealed.

The build gate was rerun from a new task-owned isolated PGlite directory after applying the existing Migrations and core local seed. The rerun passed completely. No shared database, production database, production credentials, or formal production data was used.

## 10. Complexity and governance conclusion

The change replaces the former split WhatsApp environment authority with one narrow code configuration and one shared renderer. Total persistent complexity is unchanged: no new durable state or coordination exists. UI complexity increases only by the requested Contact surfaces and focused tests, while authority complexity falls because duplicate or environment-specific public contact sources do not remain.

The implementation is a Developer Candidate only. It is paused for the separately assigned independent review/acceptance process. No Tag, Push, deployment, DNS change, external write, production credential use, or next-role activity was performed.
