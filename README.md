# CWT — CloudWave Textile

CWT is a long-lived B2B fabric SEO acquisition platform for CloudWave Textile. It combines a real-product catalog, Applications, a Fabric Library, editorial content, a low-friction inquiry flow, and a lightweight CRM.

The frozen product and architecture baseline is CWT V1.1. Start with:

- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/SEO_URL_STRATEGY.md`
- `docs/PUBLISHING_RULES.md`
- `AGENTS.md`

## Current phase

Phase 1A. Production deployment, real customer data, real product imports, AI publishing, multilingual publishing, and Phase 1B imports are out of scope.

## Runtime

- Node.js 24.14.0 LTS
- pnpm 11.9.0
- Next.js 16.2 Active LTS patch line
- PostgreSQL-compatible schema through Drizzle

The exact application dependencies are pinned in `package.json` and `pnpm-lock.yaml`.

## Local setup

1. Copy `.env.example` to a local `.env` file and replace development-only secrets.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Apply the development database migrations with `pnpm db:migrate`.
4. Seed synthetic noindex data with `pnpm db:seed`.
5. Start the application with `pnpm dev`.

Use Node.js 24. The project rejects unsupported runtime majors.

## Quality commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run`
- `pnpm build`
- `pnpm check:bundle`
- `pnpm check`

## Environment boundary

Non-production environments are noindex and use isolated databases, storage, secrets, authentication, and analytics configuration. Synthetic fixtures are not real CWT product or company facts and must never be presented as such.
