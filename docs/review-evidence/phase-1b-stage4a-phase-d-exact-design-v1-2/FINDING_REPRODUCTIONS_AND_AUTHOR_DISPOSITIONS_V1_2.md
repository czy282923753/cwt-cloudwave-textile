# Finding Reproductions and Author Dispositions V1.2

Prepared: `2026-08-13`

Authority: immutable V1.1 Candidate `097d6a570762fb2f19d499fb9fc873bae0dc1d67` and fresh independent FAIL re-review `33f2e5619dc3c1a75345c077858fe1f91d6317c0`.

These are design-author dispositions for a fresh independent review, not self-acceptance.

## M-01 — reproduced and addressed

Reproduction:

- pinned Node `24.14.0` execution of the immutable V1.1 fixture through actual accepted contracts returned `context_prohibited_data` from request binding/context and `output_policy_rejected` from the exact Product output policy;
- V1.1 therefore could not reach enqueue-ready identity or protected candidate settlement.

Correction:

- sole fixture ID now begins `SYN-AI-` and its literals use the accepted PD-11 Synthetic base semantics;
- actual accepted classifier returned `allow`;
- actual accepted request binder returned `accepted` with a recomputed fingerprint equal to the independently derived accepted-contract projection;
- actual accepted `product_description_draft` policy returned `accepted` and `draft_human_review`;
- the fixture/resource/Prompt/input/fingerprint/output/config/envelope/Provider-request tuple is frozen only from executable results;
- no classifier, context, binder, authorization or output-policy bypass is authorized; and
- the one durable Domain Service → Audit/row → Worker claim → preparation → committed fence → one-shot execution → sole attempt writer/settlement → terminal projection path, `maxAttempts=1` and crash matrix remain exact.

Author disposition: **ADDRESSED FOR FRESH RE-REVIEW**.

## L-02 — reproduced and addressed

Reproduction from immutable V1.1:

- Section 4.2 ordered only one pricing GET and asserted `official_source_get=1`;
- Section 7 required both pricing and Chat Completion re-fetch before credential/API access;
- Section 8 again stated exactly one official pricing GET.

The contract could not execute both mandatory sources while truthfully reporting one total.

Correction:

- exactly two ordered GETs are named by distinct fields;
- pricing is first; Chat Completion is second; either failure stops before claim/credential/POST;
- exact HTTPS host/path, status, byte cap, observed bytes, raw SHA-256 and bounded facts are frozen per source;
- redirects, retries, alternates and hidden third reads are forbidden; and
- normal counts are `official_pricing_get=1`, `official_chat_completion_schema_get=1`, `official_source_get_total=2`, `billable_post<=1`, with exact partial-failure counts.

Author disposition: **ADDRESSED FOR FRESH RE-REVIEW**.

## L-03 — reproduced and addressed

Reproduction from immutable V1.1:

- Section 4.2 required a preflight `DEEPSEEK_API_KEY` presence/shape read;
- the next paragraph also said the key was read lazily by `prepareTextDispatch` after claim;
- inherited V1.0 authority said the adapter's `prepareTextDispatch` reader was the sole reader.

Those statements created two read/probe sites.

Correction:

- the preflight key gate and boolean report are deleted from current authority;
- script/harness/root/config/official-source preflight cannot read or probe the key;
- `deepseek-text-adapter.ts#prepareTextDispatch` invokes its module-private selected reader exactly once at the one accepted Worker attempt;
- missing/invalid returns fixed `provider_auth_failed` before dispatch marker/fetch; and
- injected tests prove count `1` for preparation and `0` for all preflight/ordinary/disabled/Production paths without persisting a value or derivative.

Author disposition: **ADDRESSED FOR FRESH RE-REVIEW**.

## Preserved independent closures

`M-02` remains **PASS/CLOSED** without redesign: `redirect:"manual"`, status-first `3xx` rejection, no `Location` use/follow, application-versus-runtime header policy, real Node loopback proof and sole Worker retry ownership remain exact.

`L-01` remains **PASS/CLOSED** without redesign: `service_tier` is absent from the strict success schema and every unknown success field remains fail closed.

All Owner authorization, Production/public/data exclusions, Phase D/E/F/G separation, `C-002`/`C-003` interpretation and unresolved supplier-assurance status remain unchanged.
