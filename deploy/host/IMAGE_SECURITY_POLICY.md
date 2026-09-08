# CWT immutable-image security policy

Status: **INDEPENDENTLY REVIEWED FOR STAGE 6 — exact scope and disposition are recorded in `docs/PHASE_1B_STAGE6_EXACT_C9_IMAGE_SECURITY_INDEPENDENT_REVIEW_V1_0.md`**

This policy defines the minimum vulnerability and license evidence for an immutable CWT release image. It does not authorize a deployment, Registry mutation, risk acceptance, or Stage 7 action. A scanner exit code of zero proves only that the scan completed; the findings must separately pass this policy.

## 1. Subject and coverage

1. Scan every deployable `linux/*` child manifest selected by the canonical release OCI index. Use the immutable child digest as the scan subject; a tag or index-only scan is insufficient.
2. Use one fixed scanner release and one shared vulnerability database snapshot for every child in the decision set.
3. Cover operating-system packages, application/language packages and shipped binaries. License coverage must include package metadata and full-file/source-text detection where the scanner supports it.
4. Preserve the raw scanner output and stderr log without filtering or rewriting. Record the release/index/child identities, scanner and acquisition hashes, database metadata/hash/source, scan start/report time, command options, coverage and a separate policy disposition.
5. Do not hide unfixed findings, apply severity filters, add blanket license ignores, or use a mutable scanner tag. Narrow false-positive or not-applicable dispositions require a finding-level record with evidence and reviewer identity.

## 2. Fixed scanner profile

The reviewed exact-c9 profile is Trivy `0.74.0`, acquired from the official release asset and verified against its published SHA-256 checksum. Each later decision set must likewise pin and record one supported scanner release; a floating `latest` version is not allowed. Run image scans with:

```text
trivy image \
  --cache-dir <evidence-cache> \
  --skip-db-update \
  --offline-scan \
  --image-src docker \
  --scanners vuln,license \
  --license-full \
  --format json \
  --output <raw-report.json> \
  <repository>@sha256:<child-manifest-digest>
```

Download the database once before the decision set, then keep it fixed during all subject scans. Record `Version`, `UpdatedAt`, `DownloadedAt`, `NextUpdate`, database source, file SHA-256 and size. The first scan must occur before the publisher-recorded `NextUpdate`; missing, invalid, expired or unavailable metadata is non-PASS. Record the age at scan time, but do not add a second elapsed-time limit that can contradict the database publisher's own validity boundary. Later Production freshness remains a separately authorized Stage 7 control.

Trivy's default `precise` vulnerability-detection priority is retained. `--ignore-unfixed`, severity filtering and blanket ignore files are forbidden in the raw evidence run.

## 3. Vulnerability disposition

The threshold is:

- every `CRITICAL`, `HIGH` and `UNKNOWN` finding requires a documented disposition. An absent or inconclusive disposition is non-PASS;
- a finding that authoritative upstream evidence shows is not affected, not shipped or not reachable through a supported CWT path may be closed by a named independent reviewer. Record the exact subject, finding, upstream basis and CWT runtime boundary; this is a technical applicability decision, not risk acceptance;
- a scanner severity or non-empty fixed version is triage input, not automatic proof of CWT impact. A finding is non-PASS when the affected component and behavior are materially reachable on a supported path, or when known exploitation changes the actual exposure beyond the project's accepted threshold;
- `MEDIUM` and `LOW` findings remain visible and are prioritized by runtime reachability, privilege, data exposure, exploit maturity, operator recovery and fix availability. Residual issues use the severity and exit conditions in `docs/REVIEW_POLICY.md`; and
- aggregate counts never replace finding-level evidence, and one architecture's result never substitutes for another.

Risk acceptance may not rewrite an existing Product or erase the raw finding. It must name the exact digest, finding, scope, expiry, compensating controls and rollback path. This policy creates no Owner risk-acceptance authority.

## 4. License disposition

Scanner license categories are triage signals, not legal conclusions.

- A license that is actually forbidden or incompatible for the component's supported CWT use or distribution is non-PASS.
- `unknown`, custom `LicenseRef-*`, conflicting, `reciprocal` and `restricted` results require a component/use/distribution/obligation review. Results may be grouped only when the same component, license family, use and obligation analysis applies. A scanner's `unknown` taxonomy does not by itself mean the component's license is unidentified.
- An actually unidentified component/license, a current incompatibility or an unmet obligation for the current delivery model is non-PASS. A future distribution obligation is recorded with its trigger and must be satisfied before that distribution begins; it does not block an internal-only use that does not trigger it.
- `notice`, permissive and unencumbered results still require applicable notices and attribution to be retained.
- GPL, MPL or another copyleft family is not rejected merely by family name. The review records how the component is shipped and whether source, notice, relinking or other obligations apply.

The evidence record must distinguish `PASS`, `REVIEW_REQUIRED` and `NON_PASS`. Only a named independent security/license review can close `REVIEW_REQUIRED`. This is technical compliance triage, not legal advice; uncertainty that could change the disposition is escalated rather than guessed.

## 5. Change and review boundary

If findings require dependency, base-image or runtime-content changes, create a new immutable Product. Never overwrite or relabel the scanned digest as repaired. Rerun this exact-subject scan and only the other gates made stale by the Product change.

The focused independent Review named above records that this scanner profile, publisher-validity freshness boundary, applicability threshold and license treatment are proportionate to the CWT runtime and frozen Stage 6 contract. A later policy change requires a new review; it may not silently reinterpret retained raw findings or rewrite an immutable Product.
