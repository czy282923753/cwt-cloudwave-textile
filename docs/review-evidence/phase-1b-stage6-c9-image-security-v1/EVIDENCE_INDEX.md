# Exact-c9 image-security evidence correction V1

Status: **SCAN EXECUTION COMPLETE / EXACT C9 NON-PASS UNDER POLICY CANDIDATE / INDEPENDENT REVIEW REQUIRED / STAGE 6 NOT ACCEPTED / STAGE 7 HOLD**

Recorded: **2026-09-09 (Asia/Shanghai)**

## 1. Immutable subjects

- Release commit: `c9cac1618d49cb111d5aa6279d1e81ec300a81d1`
- Repository: `ghcr.io/czy282923753/cwt-cloudwave-textile`
- OCI index: `sha256:4a1348641eb92995c8efe111e65818532489f5e1152476d33672537842b70c74`
- `linux/amd64`: `sha256:3578b5e70447ee58552b58be306f3992724aedab46d26755f2ab8a9db4ad17c6`
- `linux/arm64`: `sha256:eab5eb76bbd427e452fdf0ead7948a8f5d93991973b2f53b4f1555276a11bcf4`

`raw/oci-index.json` hashes to the exact index digest and maps both platform children above. Both locally acquired image IDs and architectures matched those immutable children. No mutable tag was a scan subject.

## 2. Scanner and database

One official Trivy `0.74.0` macOS ARM64 asset was used. Its SHA-256, `1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11`, matched both the official GitHub release API digest and the retained official checksums file. Signature verification was not performed and is not claimed. See `scanner-acquisition.json`.

The database was downloaded once from `mirror.gcr.io/aquasec/trivy-db:2`, then held fixed with `--skip-db-update --offline-scan` for both subjects. Schema version was `2`; `UpdatedAt` was `2026-09-08T07:08:01.235696926Z`; the earliest scan began `43,545` seconds later and before `NextUpdate`. The database SHA-256 was `852bdc39628443d9415c2df73424d36800e7a11421a826cde575c9b464dc9f88`. The 1.37 GB database is intentionally not committed; its raw metadata and identity are retained in `raw/trivy-db-metadata.json` and `vulnerability-db.json`.

The exact scan profile covered OS packages, Node packages and shipped Go binaries with vulnerability plus full package/file-license detection. It used no severity filter, no `--ignore-unfixed` and no blanket license ignore. The raw JSON and stderr logs are retained unchanged.

## 3. Results

Each platform reported the same aggregate counts:

| Evidence | Per-platform result |
| --- | ---: |
| Vulnerability records / unique IDs | 287 / 148 |
| Critical | 7 total, 3 with a fixed version |
| High | 77 total, 25 with a fixed version |
| Medium | 115 total, 27 with a fixed version |
| Low | 80 total, 8 with a fixed version |
| Unknown severity | 8 total, 7 with a fixed version |
| License records | 817 |
| License categories | 328 notice, 322 restricted, 158 unknown, 7 unencumbered, 2 reciprocal |

Critical records include fixed updates for `libgnutls30` and Restic's embedded `golang.org/x/crypto`, plus unresolved/deferred records for `perl-base` and `zlib1g`. The two reciprocal classifications are `libffi8` / `MPL-1.1` and `@vercel/og` / `MPL-2.0`. These names summarize the evidence; `disposition.json` and the unmodified reports remain authoritative.

Under the Candidate policy in `deploy/host/IMAGE_SECURITY_POLICY.md`, both child digests are **NON_PASS** for vulnerabilities because Critical findings and fixable High findings are present. License disposition is **REVIEW_REQUIRED** because unknown/custom, reciprocal and restricted classifications still need component/use/obligation review. Trivy's license categories are opinionated triage classifications and are not treated as legal conclusions.

Trivy exited successfully for both scans. That proves successful scan execution, not policy PASS.

## 4. Evidence inventory

| Path | Purpose |
| --- | --- |
| `image-identities.json` | Release/index/child mapping, raw-index hash and local Docker identity check |
| `scanner-acquisition.json` | Fixed scanner release, asset identity and checksum verification boundary |
| `vulnerability-db.json` | Database source, metadata, hash, size and freshness calculation |
| `disposition.json` | Machine-readable invocation, coverage, counts, Critical records and policy outcome |
| `packaging-validation.json` | Bounded credential-pattern scan scope and zero-match result |
| `raw/oci-index.json` | Unmodified exact registry index bytes |
| `raw/trivy-c9-linux-amd64.json` | Unmodified `linux/amd64` Trivy JSON |
| `raw/trivy-c9-linux-arm64.json` | Unmodified `linux/arm64` Trivy JSON |
| `raw/trivy-c9-linux-*.stderr.log` | Unmodified scanner progress/coverage logs |
| `raw/trivy-db-metadata.json` | Unmodified Trivy DB metadata |
| `raw/trivy_0.74.0_checksums.txt` | Official Trivy release checksums |
| `SHA256SUMS` | Integrity manifest for every retained evidence file except itself |

The raw reports contain no credential value identified by the bounded token/secret-pattern scan recorded during packaging. The reports contain package metadata, vulnerability descriptions, image identity and build/runtime metadata and should remain review evidence rather than public product copy.

## 5. Smallest corrective path

1. Create a new immutable Product from current patched Debian/Node base digests, including the available `libgnutls30` correction.
2. Update or rebuild Restic so embedded `golang.org/x/crypto` is at least the scanner-identified fixed version, and update Restic/Supercronic Go toolchains and embedded dependencies where fixed versions exist.
3. Remove runtime Perl/tooling/license-file content only when verified unused. For no-fix findings and license classifications that remain, prepare narrow component/use/exposure/obligation dispositions; do not apply a blanket acceptance.
4. Scan both replacement child digests with the same accepted profile, then rerun only the image/Product gates made stale by changed bytes.

Exact c9 remains immutable historical evidence and is not represented as repaired. This package performs no Product change, CI/Build/Runtime replay, Registry write, Push, tag, deployment, Provider mutation, credential action, Stage acceptance or Stage 7 work.

## 6. References

- [Trivy v0.74.0 release](https://github.com/aquasecurity/trivy/releases/tag/v0.74.0)
- [Trivy vulnerability scanner behavior](https://trivy.dev/docs/v0.74/guide/scanner/vulnerability/)
- [Trivy license scanner behavior and categories](https://trivy.dev/docs/v0.74/guide/scanner/license/)
- [Go vulnerability record GO-2026-6303 / CVE-2026-56854](https://pkg.go.dev/vuln/GO-2026-6303)
- [Debian security tracker CVE-2026-42010](https://security-tracker.debian.org/tracker/CVE-2026-42010)
