# CWT Phase 1B Stage 6 — Exact-c9 Image Security Focused Independent Review V1.0

Status: **PASS WITH TWO LOW FOLLOW-UPS / PRIOR S6-04 SCAN-EVIDENCE MEDIUM CLOSED / WHOLE STAGE 6 NOT ACCEPTED HERE / STAGE 7 HOLD**

Reviewed: **2026-09-09 (Asia/Shanghai)**

Reviewer: **independent Codex Reviewer task**

Review Candidate: `76da5bc8a085b7f41bb374748907bcb45245816d`

Prior whole-Stage Review: `bccae655739ef93a247fc2b072ad19f16c3d8089`

Immutable image subjects:

- release commit `c9cac1618d49cb111d5aa6279d1e81ec300a81d1`;
- OCI index `sha256:4a1348641eb92995c8efe111e65818532489f5e1152476d33672537842b70c74`;
- `linux/amd64` child `sha256:3578b5e70447ee58552b58be306f3992724aedab46d26755f2ab8a9db4ad17c6`; and
- `linux/arm64` child `sha256:eab5eb76bbd427e452fdf0ead7948a8f5d93991973b2f53b4f1555276a11bcf4`.

## 1. Verdict and boundary

The focused S6-04 image-security Review is **PASS**. The prior blocking Medium was an evidence-boundary defect: the accepted Stage 6 plan required exact-subject vulnerability/license evidence, while the earlier closure package had none. Candidate `76da5bc...` now supplies a fixed scanner identity, publisher-valid database snapshot, exact child-digest subjects, full vulnerability/license coverage, unmodified per-platform reports, stderr, hashes and a policy disposition. The missing-evidence root cause is closed.

The Candidate's first-pass `NON_PASS` is not retained as the reviewed outcome. It was produced by two disproportionate draft rules: an independent `24h` database limit layered over the publisher's `NextUpdate`, and automatic rejection based only on scanner severity/fix availability. The reviewed policy uses one database validity boundary and requires finding applicability, supported-path reachability and current license obligations. That correction changes no Product byte and does not erase a raw finding.

After finding-level review, exact c9 is **PASS for the bounded Stage 6 application-image gate** with zero Blocker, zero High and zero Medium under `docs/REVIEW_POLICY.md`. Two Low follow-ups remain in §6. This Review does not accept whole Stage 6, authorize a checkpoint/tag, approve deployment, perform a Registry/provider action, or start Stage 7.

## 2. Evidence sufficiency

The evidence is sufficient for the exact subjects:

| Gate | Independent result |
| --- | --- |
| Subject binding | PASS — raw OCI-index bytes hash to the recorded index and name both exact platform children; each report names its immutable child digest. |
| Scanner identity | PASS — Trivy `0.74.0` macOS ARM64 asset SHA-256 matches the retained official checksum and release API digest. Signature verification was not performed and is not claimed. |
| Database | PASS — one schema-2 snapshot was reused offline; earliest scan was `43,545` seconds after `UpdatedAt` and before publisher-recorded `NextUpdate`. The 1.37 GB database was not committed, but metadata, source, size and file hash are retained. |
| Coverage | PASS — both children include Debian OS packages, 214 Node packages, Restic and Supercronic Go binaries, plus full package/file-license detection. No severity filter, `--ignore-unfixed` or blanket license ignore was used. |
| Raw evidence | PASS — both JSON reports and stderr logs are retained unmodified; the independent integrity check passed all `13/13` entries in `SHA256SUMS`. |
| Architecture separation | PASS — both children were scanned separately. Their aggregate results match, but neither result substitutes for the other. |

A scanner exit code of zero remains scan-execution evidence only. The policy outcome comes from the review below.

## 3. Vulnerability applicability

The two platform reports each contain 287 vulnerability records (`148` unique IDs), including 7 Critical, 77 High and 8 Unknown-severity records. Counts are triage, not CWT severity. Trivy's own Go-binary documentation says it discovers embedded dependencies and Go versions but cannot know whether or how a standard-library function is used, so stdlib results can be false positives and require reachability analysis ([Trivy Go coverage](https://trivy.dev/docs/v0.74/guide/coverage/language/golang/)).

### 3.1 Critical records

| Finding group | Reviewed applicability and disposition |
| --- | --- |
| `perl-base` / `CVE-2026-13221` | **NOT AFFECTED.** Debian records that the defect was introduced in Perl `v5.37.10`; c9 contains `5.36.0` ([Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-13221)). |
| `perl-base` / `CVE-2026-8376` | **NOT AFFECTED.** The defect is limited to 32-bit builds, while both c9 subjects are 64-bit `amd64`/`arm64` ([Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-8376)). |
| `perl-base` / `CVE-2026-42496` | **NOT SHIPPED.** The finding affects `Archive::Tar`; Debian's file list places `Archive/Tar.pm` in `perl-modules-5.36`, not the installed `perl-base` package ([affected package file list](https://packages.debian.org/bookworm/all/perl-modules-5.36/filelist), [installed package file list](https://packages.debian.org/bookworm/amd64/perl-base/filelist)). |
| `zlib1g` / `CVE-2023-45853` | **NOT AFFECTED IN DEBIAN BOOKWORM.** Debian records that the vulnerable MiniZip contribution is not built into its binary packages ([Debian tracker](https://security-tracker.debian.org/tracker/CVE-2023-45853)). |
| `libgnutls30` / `CVE-2026-33845`, `CVE-2026-42010` | **SHIPPED BUT NOT REACHABLE ON A SUPPORTED CWT PATH.** The findings concern DTLS fragment handling and RSA-PSK server authentication ([Debian DTLS record](https://security-tracker.debian.org/tracker/CVE-2026-33845), [Debian RSA-PSK record](https://security-tracker.debian.org/tracker/CVE-2026-42010)). CWT's supported application paths use Node/Go TLS; no CWT service exposes a GnuTLS DTLS or RSA-PSK server. All application containers also run as UID/GID `10001`, read-only, `cap_drop: ALL`, and `no-new-privileges`. |
| Restic `golang.org/x/crypto` / `CVE-2026-56854` | **DEPENDENCY PRESENT, AFFECTED SYMBOL NOT REACHABLE.** The Go record limits the issue to SSH server `NewServerConn` ([GO-2026-6303](https://pkg.go.dev/vuln/GO-2026-6303)); CWT's protected Restic repository selector accepts only the exact HTTPS Tencent COS S3 endpoint and never an SSH server path. |

These are technical `not_affected`, `not_shipped` or `not_reachable` dispositions, not Owner risk acceptances.

### 3.2 High and Unknown records

The remaining High/Unknown records collapse into a much smaller set of runtime boundaries:

- Debian `util-linux`, mount/nsenter, `libcap`, `systemd-homed`, ACL, terminal and archive-tool findings require privileged utilities, absent services or attacker-controlled inputs that CWT does not expose. The exact Compose path is non-root, read-only, capability-free and `no-new-privileges`; CWT application scripts invoke Node, PostgreSQL client tools, Restic and Supercronic, not those privileged utilities.
- The `perl-base` High records attributed to `Archive::Tar`, `IO::Compress` and `Storable` are either in the uninstalled module package or have no CWT Perl invocation or attacker-controlled Perl input. The same source-package attribution issue explains the scanner's Critical `Archive::Tar` record.
- The five Unknown PCRE2 records require PCRE2 compile/match operations on hostile expressions or invalid UTF input; no supported CWT path exposes a PCRE2 API. The Unknown Restic OpenPGP and SSH-channel findings are outside the exact S3/COS repository path.
- Restic's embedded gRPC/xDS and SSH dependencies support other backends, not CWT's fixed S3/COS backend. `html/template`, unencrypted HTTP/2 server, `os.Root` and related Go findings likewise have no supported CWT entry point.
- Some Restic outbound parser/TLS symbols are conservatively treated as potentially reachable when contacting COS: ASN.1 certificate parsing, DNS parsing, XML error parsing and TLS `KeyUpdate`. The Go record for `CVE-2026-56862`, for example, includes `tls.Conn.Read/Write` and outbound `Dial` paths and is fixed in Go `1.26.6` ([GO-2026-6090](https://pkg.go.dev/vuln/GO-2026-6090)). Exploitation would terminate one scheduled backup invocation through a hostile/malformed provider or network response; it does not grant privilege, expose data or create false backup success. The fixed repository allowlist, process isolation, nonzero command failure, work-health reporting and scheduled retry keep the actual CWT impact **Low**, not scanner High.
- Supercronic is used only to parse fixed local crontabs and spawn local commands. Its embedded Go network/parser packages have no CWT runtime input path.
- Medium OS records primarily cover the same absent utilities/services or libc functions with caller-controlled formats. DNS/parser records in glibc are conservatively potentially reachable by native backup/PostgreSQL tools, but the raw reports do not establish a deterministic exploit against CWT's configured resolvers/providers; the demonstrated impact remains bounded to a process failure or retryable operation. The available `libc6` `deb12u14` fixes and the GnuTLS `deb12u7` update therefore join the normal immutable-Product refresh in Low L-01 rather than creating a separate blocker.

The application Node dependency scan reports only two Medium `qs` records and no Critical/High/Unknown record. The first requires `qs.stringify` on a specially shaped attacker-controlled object; the second requires non-default `comma: true` plus `throwOnLimitExceeded: true`. The shipped CWT source contains no `qs.parse`, `qs.stringify` or either option, and the transport already bounds request sizes. No actual c9 finding establishes a deterministic Medium-or-higher defect on a supported path with inadequate recovery.

The following index makes the mandatory Critical/High/Unknown disposition complete. Both platform reports contain the same ID sets; the disposition applies independently to each exact child, and every repeated OS binary-package record for an ID inherits the named source/runtime boundary.

| Exact target/finding IDs | Disposition |
| --- | --- |
| OS Critical `CVE-2026-13221`, `CVE-2026-8376` | `not_affected` — exact version/architecture evidence in §3.1. |
| OS Critical `CVE-2026-42496` | `not_shipped` — affected `Archive::Tar` module is not in installed `perl-base`. |
| OS Critical `CVE-2023-45853` | `not_affected` — Debian does not build the affected MiniZip contribution. |
| OS Critical `CVE-2026-33845`, `CVE-2026-42010` | `not_reachable` — no GnuTLS DTLS/RSA-PSK service or caller. |
| Restic Critical `CVE-2026-56854` | `not_reachable` — affected SSH server symbol is outside fixed S3/COS use. |
| OS High `CVE-2026-33846`, `CVE-2026-3833`, `CVE-2026-42009` | `not_reachable` — no supported GnuTLS caller. |
| OS High `CVE-2026-4878`, `CVE-2026-53613`, `CVE-2026-76642`, `CVE-2026-78408`, `CVE-2026-78409`, `CVE-2026-78410` | `not_reachable` — require capability/file-attribute or privileged mount/nsenter behavior absent from the application runtime. |
| OS High `CVE-2026-16742` | `not_shipped_path` — `systemd-homed` is not a CWT container service. |
| OS High `CVE-2025-69720`, `CVE-2026-41992`, `CVE-2026-54369` | `not_reachable` — no hostile terminal, LZH decompression or ACL mutation path. |
| OS High `CVE-2026-42497`, `CVE-2026-48962`, `CVE-2026-57432`, `CVE-2026-57433`, `CVE-2026-9538` | `not_shipped_or_not_reachable` — affected optional Perl modules are absent or no CWT Perl/hostile-input caller exists. |
| Restic High `CVE-2026-84304`, `GHSA-hrxh-6v49-42gf`, `CVE-2026-56853`, `CVE-2026-56858`, `CVE-2026-39822` | `not_reachable` — gRPC/xDS, h2c server, HTML template and `os.Root` behaviors are outside the fixed Restic S3/COS path. |
| Restic High `CVE-2026-39821`, `CVE-2026-56852`, `CVE-2026-56860` | `controlled_input_not_material` — hostname/repository/path data is fixed by the repository selector or owned CWT backup data; no attacker-controlled supported input is established. |
| Restic High `CVE-2026-33818`, `CVE-2026-46600`, `CVE-2026-56859`, `CVE-2026-56862` | `reachable_low` — bounded external parser/TLS DoS exposure, tracked in Low L-01. |
| Supercronic High `CVE-2026-33818`, `CVE-2026-39821`, `CVE-2026-46600`, `CVE-2026-56853`, `CVE-2026-56858`, `CVE-2026-56859`, `CVE-2026-56860`, `CVE-2026-56862` | `not_reachable` — Supercronic receives a fixed local crontab and launches local commands; no CWT network/parser caller. |
| OS Unknown `CVE-2026-86145`, `TEMP-0000000-21C4F8`, `TEMP-0000000-8188AC`, `TEMP-0000000-A5518C`, `TEMP-0000000-B05303` | `not_reachable` — no CWT PCRE2 compile/match API or hostile PCRE2 subject. |
| Restic Unknown `CVE-2026-56855`, `CVE-2026-78662`, `GO-2026-5932` | `not_reachable` — SSH-channel/OpenPGP behaviors are outside fixed S3/COS use. |

## 4. License disposition

The license gate is **PASS for the current internal/private image use**.

- The reports contain no `forbidden` classification.
- Trivy documents its categories as an opinionated risk view and maps `restricted`, `reciprocal` and `unknown` directly to scanner severities; it also notes that full scanning examines package metadata and arbitrary license/source text ([Trivy license scanner](https://trivy.dev/docs/v0.74/guide/scanner/license/)). Those category counts are not a legal conclusion.
- The 158 `unknown` records are not 158 unidentified components. They are named Debian license expressions/exceptions and public-domain labels plus one recognized SPDX identifier, Nodemailer's `MIT-0`; SPDX identifies `MIT-0` as “MIT No Attribution” ([SPDX MIT-0](https://spdx.org/licenses/MIT-0.html)).
- The two reciprocal records are known and attributable: `libffi8` source-package metadata includes `MPL-1.1` among several file-level licenses, while Next's compiled `@vercel/og` package declares `MPL-2.0`. Neither result proves an application-wide incompatibility.
- The only Node package records outside Trivy's notice/permissive/unencumbered classes are server-side Nodemailer, compiled `@vercel/og`, and the architecture-matching `@img/sharp-libvips-linux-*` shared library under LGPL-3.0-or-later. The other restricted records are OS package/file-level GPL/LGPL metadata. These components remain inside the private server image; they are not browser-delivered CWT client code. A future image conveyance must preserve the applicable license/notice, source availability and relinking rights rather than treating `restricted` as either automatic rejection or automatic clearance.
- The current boundary is a private CWT registry and server-side internal deployment, not delivery of the image to an outside recipient. Mozilla's MPL 2.0 guidance states that internal use/distribution creates no outside-distribution obligation and that merely making a web service available is not distribution of its server code ([MPL 2.0 FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)). Notices, source availability and relinking obligations must still be prepared before any future image conveyance outside the organization; §6 records that trigger.

This is a technical obligation review, not legal advice. A future external image/software distribution, license modification, unidentified component or incompatible term is a new gate and must not inherit this internal-use PASS silently.

## 5. Security & Test Simplification Check

The reviewed correction deletes duplicate or category-only authority instead of adding a mechanism:

1. publisher `NextUpdate` is the sole database-validity boundary; the redundant `24h` clock is removed;
2. one raw Trivy run remains the evidence source; no second scanner, VEX store, waiver database, ignore list or parallel policy engine is added;
3. scanner severity/fix availability remains triage, while authoritative upstream applicability and the existing CWT execution boundary decide impact; and
4. Owner approval is reserved for accepting real residual Medium-or-higher risk, not for correcting a false positive, `not_shipped` component or unreachable symbol.

The evidence package is documentation-only and immutable-subject analysis. Full application Build/test/browser reruns would not validate its risk decisions and were not repeated.

## 6. Non-blocking follow-ups

### Low L-01 — Refresh patched OS packages and Restic's Go toolchain on the next normal immutable Product

The exact c9 Debian snapshot predates available `libc6` `deb12u14` and GnuTLS `deb12u7` corrections, while Restic `0.19.1` embeds Go `1.26.4` and leaves the bounded outbound DoS exposure described in §3.2. On the next normal immutable Product, refresh the pinned Debian/Node base and prefer the next official, checksummed Restic release built with Go `1.26.6` or later. Do not introduce a one-off custom binary supply chain solely to erase Low scanner results. Trigger earlier replacement if exploit evidence appears, the COS endpoint boundary broadens, failure stops being visible/retryable, or Stage 7 proves material operational impact. ([Restic 0.19.1 release](https://github.com/restic/restic/releases/tag/v0.19.1))

### Low L-02 — Prepare a distribution notice/source-offer package before external image conveyance

The current private server-side use does not trigger the reviewed outside-distribution obligations. Before the image or bundled binaries are delivered outside the organization, inventory the actual conveyed components and retain applicable notices, source locations/offers and relinking information. Legal review is required if that future delivery model or a license term is uncertain. This trigger does not block current Stage 6 closure.

## 7. Verification record

The independent Review performed read-only or documentation-only checks:

- verified Candidate ancestry and the exact 17-file delta from prior Review `bccae655...`;
- parsed the OCI identity, scanner, database, disposition and packaging records;
- independently ran `sha256sum -c SHA256SUMS`: `13/13` PASS;
- independently recomputed per-target severity, fixability, package and license-category groupings from both raw JSON reports;
- checked that the two reports are distinct child subjects and have matching aggregate inventories without substituting one architecture for the other;
- compared Critical/High/Unknown records with authoritative Debian, Go, Trivy, SPDX and Mozilla sources and the exact CWT Dockerfile/Compose/backup repository boundary; and
- ran Markdown/JSON/integrity structure checks and `git diff --check` after the bounded policy/report correction.

No scanner rerun, Product rebuild, source/dependency/CI/workflow change, Registry write, external upload, Provider mutation, deployment, Push or Stage 7 action occurred.

## 8. Closure and next gate

The prior whole-Stage Review's single blocking Medium is **CLOSED** for its exact evidence requirement, and exact c9 passes this focused Stage 6 image-security disposition with only the two Low follow-ups above. The coordinator may now evaluate this Review together with the already reviewed Stage 6 gate set and, separately, decide whether Stage 6 acceptance/checkpoint work is eligible. This file itself grants no such acceptance or external authority; Stage 7 remains **HOLD**.
