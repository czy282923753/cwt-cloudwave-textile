# CWT immutable-image security policy Candidate

Status: **CANDIDATE — requires independent S6-04 security/license Review before it is an accepted release gate**

This policy defines the minimum vulnerability and license evidence for an immutable CWT release image. It does not authorize a deployment, Registry mutation, risk acceptance, or Stage 7 action. A scanner exit code of zero proves only that the scan completed; the findings must separately pass this policy.

## 1. Subject and coverage

1. Scan every deployable `linux/*` child manifest selected by the canonical release OCI index. Use the immutable child digest as the scan subject; a tag or index-only scan is insufficient.
2. Use one fixed scanner release and one shared vulnerability database snapshot for every child in the decision set.
3. Cover operating-system packages, application/language packages and shipped binaries. License coverage must include package metadata and full-file/source-text detection where the scanner supports it.
4. Preserve the raw scanner output and stderr log without filtering or rewriting. Record the release/index/child identities, scanner and acquisition hashes, database metadata/hash/source, scan start/report time, command options, coverage and a separate policy disposition.
5. Do not hide unfixed findings, apply severity filters, add blanket license ignores, or use a mutable scanner tag. Narrow false-positive or not-applicable dispositions require a finding-level record with evidence and reviewer identity.

## 2. Fixed scanner profile

The current Candidate profile is Trivy `0.74.0`, acquired from the official release asset and verified against its published SHA-256 checksum. Run image scans with:

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

Download the database once before the decision set, then keep it fixed during all subject scans. Record `Version`, `UpdatedAt`, `DownloadedAt`, `NextUpdate`, database source, file SHA-256 and size. At the first scan start, `UpdatedAt` must be no more than 24 hours old and the scan must occur before `NextUpdate`. A missing, stale or unavailable database is non-PASS. Later Production freshness remains a separately authorized Stage 7 control.

Trivy's default `precise` vulnerability-detection priority is retained. `--ignore-unfixed`, severity filtering and blanket ignore files are forbidden in the raw evidence run.

## 3. Vulnerability disposition

The current Candidate threshold is:

- any `CRITICAL` finding is non-PASS until a replacement Product removes it or a named security reviewer records a finding-specific exposure, exploitability, compensating-control, expiry and Owner-approved risk decision;
- any `HIGH` finding with a non-empty fixed version is non-PASS until a replacement Product includes the fix;
- `HIGH` findings without a fix and all `UNKNOWN` severities require a documented security review; an absent or inconclusive review is non-PASS;
- `MEDIUM` and `LOW` findings remain visible and are prioritized by runtime reachability, privilege, data exposure, exploit maturity and fix availability. A known-exploited or materially reachable finding is non-PASS regardless of its scanner severity; and
- aggregate counts never replace finding-level evidence, and one architecture's result never substitutes for another.

Risk acceptance may not rewrite an existing Product or erase the raw finding. It must name the exact digest, finding, scope, expiry, compensating controls and rollback path. This Candidate creates no such acceptance authority.

## 4. License disposition

Scanner license categories are triage signals, not legal conclusions.

- A detected forbidden or incompatible license is non-PASS.
- `unknown`, custom `LicenseRef-*`, conflicting, `reciprocal` and `restricted` results require a component/use/distribution/obligation review. Results may be grouped only when the same component, license family, use and obligation analysis applies.
- An unresolved unknown/custom result or an unmet obligation is non-PASS.
- `notice`, permissive and unencumbered results still require applicable notices and attribution to be retained.
- GPL, MPL or another copyleft family is not rejected merely by family name. The review records how the component is shipped and whether source, notice, relinking or other obligations apply.

The evidence record must distinguish `PASS`, `REVIEW_REQUIRED` and `NON_PASS`. Only a named independent security/license review can close `REVIEW_REQUIRED`.

## 5. Change and review boundary

If findings require dependency, base-image or runtime-content changes, create a new immutable Product. Never overwrite or relabel the scanned digest as repaired. Rerun this exact-subject scan and only the other gates made stale by the Product change.

This file becomes an accepted threshold only after independent Review records that the scanner profile, freshness limit, vulnerability threshold and license treatment are proportionate to the CWT runtime and frozen Stage 6 contract. Until then, its current status remains Candidate and a subject that exceeds it cannot be represented as passing.
