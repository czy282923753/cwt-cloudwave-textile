# AI Prompt resources

Production Prompt resources are append-only, server-only reviewed content. The manifest owns membership and tuple paths; each raw LF-terminated UTF-8 resource owns its metadata and body bytes; the generated TypeScript bundle is only a deterministic transport derivative.

Phase B intentionally has an empty Production manifest and contains no Production Prompt prose. A future first body starts at version 1, must be separately reviewed, and must use the SHA-256 of the exact raw bytes in both its filename and manifest. Later changes append consecutive versions. Accepted resources and manifest tuples are never edited, renamed, repointed, or deleted during rollback.

Run the bundle verifier and the explicit Git-object history verifier before accepting any Prompt change. Synthetic test resources remain under `src/ai/testing/` and cannot be promoted or referenced by the Production manifest.
