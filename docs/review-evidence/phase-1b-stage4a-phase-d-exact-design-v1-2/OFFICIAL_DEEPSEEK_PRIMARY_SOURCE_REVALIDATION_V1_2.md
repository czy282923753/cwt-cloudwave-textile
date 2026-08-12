# Official DeepSeek Primary-Source Revalidation V1.2

Retrieval date: `2026-08-13` (`Asia/Shanghai`)

Completed: `2026-08-13T00:38:29+08:00` / `2026-08-12T16:38:29Z`

Method: Node `24.14.0` built-in `fetch`, exact HTTPS URLs, `redirect:"manual"`, `30,000 ms` timeout, bounded raw bytes, fatal UTF-8 and in-memory SHA-256. No credential was read and no `api.deepseek.com` API/model call occurred. Raw pages were not persisted.

## 1. Exact mandatory source set

| Evidence field | Exact official URL | HTTP | Bytes | Raw SHA-256 |
|---|---|---:|---:|---|
| `official_pricing_get` | `https://api-docs.deepseek.com/quick_start/pricing/` | 200 | 21,969 | `3af5e5d6992a4e26709ed37f02d9bfbc46ee92dc825e6588404728419f41ce71` |
| `official_chat_completion_schema_get` | `https://api-docs.deepseek.com/api/create-chat-completion/` | 200 | 125,153 | `2948bb768f4fedca3837bd402ca5bf7ca864b7bc6ef68312f82ebe4fb8ea9a3a` |

Observed execution counters:

```text
official_pricing_get=1
official_chat_completion_schema_get=1
official_source_get_total=2
billable_post=0
```

No redirect, retry, alternate path, hidden source or third read occurred. These design-time counts demonstrate the two-source contract without authorizing the later real Provider validation.

## 2. Bounded fact projection

Pricing source facts present:

- alias `deepseek-v4-flash`;
- published version `DeepSeek-V4-Flash-0731`;
- OpenAI-format base `https://api.deepseek.com`;
- both non-thinking and thinking behavior, with thinking default;
- JSON Output support; and
- per-million-token cache-hit input USD `0.0028`, cache-miss input USD `0.14`, output USD `0.28`, represented by CWT as `2,800`, `140,000`, `280,000` integer microusd.

Chat Completion schema facts present:

- `POST /chat/completions` and admitted model alias;
- `thinking.type` values `enabled | disabled`, default `enabled`;
- `response_format.type=json_object` and explicit JSON-instruction requirement;
- non-streaming response schema and documented empty/truncated/finish-reason hazards; and
- zero literal `service_tier` occurrences.

The strict CWT request remains narrower than the public surface: explicit non-thinking, non-streaming JSON object; no tools, retrieval, files, URL input, Beta/FIM, conversation state, reasoning content or fallback. The strict success allowlist remains `id`, `object`, `created`, `model`, `system_fingerprint`, `choices`, `usage`; unknown fields fail closed.

Both source byte counts and hashes match the immutable V1.1 observation. A future byte/hash/fact/schema/rate change is not accepted automatically; it is a pre-credential/pre-claim/pre-POST reviewed-reconciliation stop.

## 3. External-assurance boundary

These public documents do not establish DPA, API no-training/no-service-improvement use, processing/storage region, cache disablement/retention guarantee, complete subprocessors, tenant isolation/security, SLA, incident notice or account-specific enterprise guarantees. `PD-04`–`PD-08` and `PD-10` therefore remain Owner-accepted non-blocking unresolved external assurance, not PASS.
