# CWT Phase 1B Stage 6 Acceptance Record V1.0

Status: **ACCEPTED / LOCAL CHECKPOINT AUTHORIZED AND CREATED**

Acceptance date: **2026-09-09 (Asia/Shanghai)**

Production Ready: **No**

Stage 7: **HOLD — requires separate explicit Owner authorization**

Formal Product Status: **Waiting for Real Product Data Validation**

The Project Owner explicitly approved: **“批准正式验收 Stage 6，并创建本地 checkpoint”**. This record accepts the reviewed Stage 6 scope and authorizes one local annotated checkpoint tag. It does not authorize external Push or tag publication, Registry mutation, Provider configuration or calls, credentials, protected-environment access, deployment, DNS, formal data, Publish, Index, Stage 7 or Production launch.

## 1. Acceptance authorities and identities

| Authority | Exact identity or result |
| --- | --- |
| Owner decision | Formal Stage 6 acceptance and local checkpoint approved on `2026-09-09` |
| Prior whole-Stage Review | `bccae655739ef93a247fc2b072ad19f16c3d8089` — `FAIL` on one S6-04 exact-image scan-evidence Medium |
| Focused image-security Review / reviewed source-evidence base | `ee0a2710b1bcf06ac1695c12f9e46e4bb75010b4` — `PASS WITH TWO LOW FOLLOW-UPS`; prior Medium closed |
| Immutable Product release | `c9cac1618d49cb111d5aa6279d1e81ec300a81d1` |
| Immutable OCI index | `sha256:4a1348641eb92995c8efe111e65818532489f5e1152476d33672537842b70c74` |
| Build Once evidence | run `34213361695`; artifact `10051334042` |
| Native Runtime evidence | run `34253932589`; artifact `10067197746` |
| Local annotated checkpoint | `phase-1b-stage6-approved-2026-09-09`, pointing to the final acceptance-document commit |
| Current open severity | Blocker `0` / High `0` / Medium `0` / Low `6` |

The final acceptance-document commit is the direct child of reviewed source/evidence base `ee0a2710...` and contains acceptance/status documentation only. Its exact commit and annotated-tag object identities are recorded by Git because a commit cannot embed its own identity. The immutable Product was built from release `c9cac161...`; it was not built from this later acceptance-document commit.

## 2. Accepted Stage 6 scope

Stage 6 is accepted for the bounded single-host deployment and operations foundation:

- fail-closed Production/Staging configuration and isolated Public, Private and Import storage roots;
- one shared Valkey Rate Limiter authority and one trusted-client-address boundary;
- one provider-neutral malware Scanner boundary with local/Synthetic failure and concurrency evidence;
- the immutable multi-architecture application image, Compose topology, Nginx ingress, private networks, non-root/read-only runtime controls and exact release identity;
- health/readiness, bounded work, redacted logs and provider-neutral monitoring hooks;
- local PostgreSQL backup, protected-shaped encrypted off-site workflow preparation, corruption/retention controls, shared backup/Migration exclusion and isolated empty safe restore;
- reviewed CI, exact Build Once/private Registry evidence, exact-c9 native Runtime evidence and owned resource cleanup; and
- digest-bound SBOM, vulnerability and full-license evidence for both exact c9 children under the independently reviewed image-security policy.

The exact-c9 raw scanner counts remain immutable evidence. Focused Review `ee0a2710...` closes the former missing-evidence Medium by applying authoritative package/version, shipped-content, supported-path reachability and current internal-use license-obligation analysis. This acceptance does not delete, rewrite or call the raw findings absent.

## 3. Retained Low follow-ups

The following six Low items remain non-blocking and retain their original triggers:

1. At the next otherwise-required CI workflow edit, replace the misleading cleanup diagnostic wording with neutral task-cluster PID wording and update the existing string assertion.
2. At the next otherwise-required upload-action edit, add the previously recorded explicit Node runtime annotation; do not create a standalone patch solely for that annotation.
3. Future paid native operations remain attended because provider deletion can require passkey/MFA and browser access can fail; one named Operator must retain ownership through conclusive absence evidence.
4. The expired self-hosted Runner registration-token value remains material historical exposure with no current active-credential risk; any future transfer must be direct human entry into the prepared hidden field with no model/tool readback or capture.
5. On the next normal immutable Product, refresh the patched Debian/Node base and prefer an official checksummed Restic release with the reviewed Go fixes. Trigger earlier replacement if exposure/exploit evidence changes, the COS endpoint boundary broadens, failure becomes silent/non-retryable or Stage 7 shows material impact.
6. Before any image or bundled binary is conveyed outside the organization, prepare applicable notices, source locations/offers and relinking information; obtain legal review if the delivery model or license obligation is uncertain.

These are maintenance, attended-operation and future-distribution follow-ups. None is accepted as Medium-or-higher residual risk, and none becomes a reason to silently start Stage 7 or rebuild c9 outside a separately authorized change.

## 4. Stage 7 and Production boundary

Every acceptance-matrix row labelled `External Validation` remains unpassed. Stage 6 acceptance does not prove or configure real Production/Staging accounts, identities, Secrets, Cloudflare/TLS/origin firewall, Cloudmersive, Valkey, COS durability/read-back, protected restore/start, target-host capacity/pressure, independent monitoring delivery, Zoho delivery, formal Product/company/media facts, real SEO output or Production launch readiness.

Stage 7 remains HOLD until a new explicit Owner authorization defines its exact external scope, identities, credentials, spend and cleanup boundaries. Production Ready remains **No**.

## 5. Checkpoint and rollback boundary

The local checkpoint identifies the exact reviewed source and documentation state. Stage 5 tag `phase-1b-stage5-approved-2026-08-30` and its accepted source remain preserved as the prior checkpoint.

A runtime rollback uses one previously reviewed, mutually matching immutable image, configuration and Compose bundle. It does not manufacture another image, relabel c9, rewrite databases or media, discard evidence, mutate an accepted ref, or start any protected environment by itself. Database/media recovery follows the accepted backup and restore runbooks under separately authorized operational conditions.

This acceptance commit and tag are local only. No Push, remote tag publication, Registry write, CI/Build/Runtime rerun, Provider call, deployment or checkpoint automation is part of this record.
