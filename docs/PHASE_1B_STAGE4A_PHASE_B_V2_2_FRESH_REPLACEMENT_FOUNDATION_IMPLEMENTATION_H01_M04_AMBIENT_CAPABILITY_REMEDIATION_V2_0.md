# CWT Stage 4A Phase B V2.2 Fresh Replacement H-01/M04 Ambient Capability Remediation V2.0

Status: **Corrected Candidate complete; Fresh Independent Implementation Re-review required. Not accepted.**

This Markdown is explanatory only. The canonical current authority is `H01_M04_AMBIENT_CAPABILITY_REMEDIATION_V2_AUTHORITY_V1_0.json`; the sole current manifest and verifier form the evidence integrity boundary. H-01 is correction attempt 2. H-02 remains closed after attempt 1 and was exercised only as non-regression.

## Identity and scope

- Failed remediation Candidate preserved at `49f789a9e4c5c7f2a3dbd7eaddba17e6a248832b`; failed remediation code HEAD `8cd768fada5da140d62aa48b7efc02d60cf1758b`.
- Remediation branch: `codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-h01-m04-remediation-v2`.
- Exact corrected code HEAD: `75c77797d64636d303cea2e8683c7a093fe8ec1f`; parent `49f789a9e4c5c7f2a3dbd7eaddba17e6a248832b`; tree `018d872a3544bbfc9d0f6aa84b08911d262ee2b9`.
- Relative to the failed remediation Candidate, exactly two Product-code paths changed: the sole architecture checker and its replacement V3.1 graph-fault/profile fixture. Added/deleted Product-code paths: zero.
- No checkpoint was created, no ref was moved or pushed, and no merge, rebase, cherry-pick, amend, or history rewrite occurred.

## H-01 correction

The sole V3.1 checker now resolves protected `protected-ai` and `phase-b-outer-composition` executable value references through the installed TypeScript Program/TypeChecker. It rejects forbidden runtime-global capability origins before reachability even when expressed as bare identifiers, aliases, bind/call/apply, class/static initializers, containers, destructuring, IIFE arguments, or `window`/`self`/`global`/`navigator` members. Diagnostics bind deterministic path, rule, AST kind/position, semantic origin, and capability name.

The exact Reviewer `fetch("https://api.deepseek.com")` witness now fails with `denied_capability_origin`. Sixteen semantic fault probes cover `fetch`, WebSocket, EventSource, XMLHttpRequest and global-object variants. Repository-local declarations and explicit local imports named `fetch` or `WebSocket` remain positive controls. The sole ambient exception remains exact direct non-optional `globalThis.cwtDatabaseConnection` access at `src/db/client.ts`; the DB convergence source and behavior are unchanged.

## Verification

- Exact pre-correction bare-fetch failure reproduced: the real gate exited 0 and returned `ok: true`; the temporary witness was then removed and the source restored byte-identically.
- Exact code-HEAD architecture gate: 623 candidates, 471 executables, zero unclassified/ambiguous, 21 ordinary URL values, zero static-resource candidates, 55 fault probes, 7 positives, 2 positive and 6 expected-negative type seams, 28 inherited lifecycle mutations, bundle proof ready, and exactly five canonical artifacts.
- All `src/ai` tests: 14/14 files and 163/163 tests passed. The unchanged H-02/NH01 real-service authorization matrix remains 6/6 tests and 21 invocations, with H-02 closed.
- Focused DB convergence, schema/Migration, noindex, public pagination/publication and public-bundle boundaries: 7/7 files and 8/8 tests passed.
- Repository ESLint passed with zero warnings. Strict TypeScript passed before and after official Next type generation.
- Accepted `0020` verifier passed. Independent Schema extraction remains `ai_model_config=21/21` and `ai_runs=96/96`, exact order. The accepted V2.2 package verifier returned `PACKAGE_CONSISTENCY_PASS_NOT_INDEPENDENT_ACCEPTANCE`.
- Prompt bundle and protected Prompt history passed; Production Prompt manifest and Provider registry remain exact-empty.
- Official Next 16.2.12 typegen passed with telemetry and network denied. The isolated Next webpack server/public bundle passed under OS-level network denial: 51 server files, 16 client chunks, three server markers, raw Synthetic Prompt retained server-only, and positive leak control passed.

The broader full Vitest suite was not rerun. The only Product-code mutation is the non-runtime checker and its fixture; the executable architecture gate, all AI tests, focused frozen-boundary tests, full lint, and strict typecheck directly cover the affected risk, while unrelated tests would not exercise the semantic checker further.

## Preserved closures and exceptions

The attempt-2 Product diff is empty for H-02/NH01 production/test paths, all `src/db/**`, M02/NM01/M01/M03/M05/L01/L02 runtime paths, public Product/SEO/URL/Redirect/font/pagination, Production Prompt/Provider, Schema/Migration/snapshot/journal/seed, package/lock/dependency and config. No Provider/API/credential/network, Phase C/D/E, deployment, publish, or index path was added.

Temporary pinned dependency symlinks were used only to execute installed tools and removed before formal proof. The Next standalone tracer's generated dependency trace and fixture `next-env.d.ts` were moved outside the repository before clean-code proof emission and were not committed. The unchanged full public build retains its previously disclosed offline Google Font debt; no public/font code changed and no unrelated full public build is claimed.

The controlling independent FAIL report and seven-entry evidence package were imported byte-identically and reverify against manifest SHA-256 `d1e66f0a1ffdfb898e62508643c6488027ad98eb79eddff05e4543cf66776cd7`.

## Next gate

Stop for Fresh Independent Implementation Re-review. It must begin with `REMEDIATION_FINDINGS_REVIEW` for H-01 attempt 2, including semantic ambient origins and the exact DB exception, confirm H-02 remains closed, audit all affected and preserved closures, then decide `FULL_REVIEW_NECESSITY` with rationale. Identity, checkpoint, manifest, frozen-boundary and security checks remain mandatory.
