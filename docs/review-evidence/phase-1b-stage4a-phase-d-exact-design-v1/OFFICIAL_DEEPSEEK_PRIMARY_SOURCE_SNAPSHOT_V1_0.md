# Official DeepSeek Primary-Source Snapshot V1.0

Purpose: bounded official-source evidence for the Phase D Exact Design Candidate
Retrieved: `2026-08-12`
Network action: official documentation/terms HTTP reads only; **no API model call, credential access, account mutation or external write**
Hash method: SHA-256 over the exact raw response bytes returned by the URL on retrieval

## 1. Source identity and raw-byte hashes

| ID | Exact official URL | Bytes | SHA-256 | Observed HTTP metadata |
|---|---|---:|---|---|
| DS-01 | <https://api-docs.deepseek.com/api/deepseek-api/> | 12,832 | `ff6d5d7fa2ce6e95c0f4a521bafc78d2f9f5ba9d6bf3a1491e27cd4dae2abf06` | Last-Modified `Sat, 08 Aug 2026 09:38:00 GMT`; ETag `"011cb0404f4fdf307b62500fb10fbd7a"` |
| DS-02 | <https://api-docs.deepseek.com/quick_start/pricing/> | 22,223 | `b7b5819eb2eea0efab609aee5068ee10ef39216f0cab797bfbe5e02e8f807002` | Last-Modified `Sat, 08 Aug 2026 09:37:53 GMT`; ETag `"407d57a2320affa09c2c149c1f7efb52"` |
| DS-03 | <https://api-docs.deepseek.com/quick_start/rate_limit/> | 34,717 | `07618235551000473cface54ec7d7943affc7f939a8b0d49564755e2f813498c` | Last-Modified `Sat, 08 Aug 2026 09:38:00 GMT`; ETag `"7ba2cbdb25c771a17579475df21934f6"` |
| DS-04 | <https://api-docs.deepseek.com/guides/kv_cache/> | 33,715 | `7fd5ff8c3eecb435a1fa475701edcfd5e41a5fcb5816021a3e8d84c7ca035665` | Last-Modified `Sat, 08 Aug 2026 09:37:51 GMT`; ETag `"37cf41d2458f492acbcb744e5c8b44cd"` |
| DS-05 | <https://api-docs.deepseek.com/guides/json_mode/> | 31,947 | `1b9286c62c51f040ebc635790ee33f0bdab9d51c14b3ca4592c012b46d8811dd` | Last-Modified `Sat, 08 Aug 2026 09:37:58 GMT`; ETag `"08235804a65ab0ececeaaf066916e45a"` |
| DS-06 | <https://api-docs.deepseek.com/guides/thinking_mode/> | 108,044 | `a08205df38d4452e102cf7be45aa93752557cc259d4c8021946cdc6cbd58682f` | Last-Modified `Sat, 08 Aug 2026 09:37:56 GMT`; ETag `"756781a51e61709301e434dd8f8c8d6e"` |
| DS-07 | <https://api-docs.deepseek.com/quick_start/error_codes/> | 19,990 | `4899b40e652d026777e992d9b7999e6e8ef28609a2b0626c10e021887d4e7c17` | Last-Modified `Sat, 08 Aug 2026 09:37:51 GMT`; ETag `"59cc5120033263f57cb3ade4100cdb2f"` |
| DS-08 | <https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html> | 33,904 | `2b433c53cbac75491959025eba5a27908f9f1886352dce0a05f3d5a936d87790` | Last-Modified `Wed, 15 Jul 2026 07:30:02 GMT`; ETag `W/"a4e0bb69a28f8e3920d6e3698452aebe"` |
| DS-09 | <https://api-docs.deepseek.com/api/create-chat-completion/> | 125,506 | `f173ca3608279b1257c7aee9e24da6558fd7c5bfc20faff99d70655c670f6a27` | Last-Modified `Sat, 08 Aug 2026 09:37:54 GMT`; ETag `"1e3ec4297f6239e65dce6124d41cba92"` |

The raw HTML pages are not committed because the design needs stable bounded facts and hashes, not a copied third-party corpus. This record is the content snapshot: retrieval identity, raw-byte hash, metadata and the reviewed fact projection below. A later implementation/review must treat any changed raw hash as drift and reassess the affected facts.

## 2. Bounded contract-fact projection

### DS-01 — Base API and authentication

- OpenAI-compatible base URL: `https://api.deepseek.com`.
- Authentication uses a Bearer API key.
- The design fixes one HTTPS host/path and does not accept caller/config URLs.

### DS-02 — Model and pricing

- Current admitted alias observed: `deepseek-v4-flash`.
- Published model version observed: `DeepSeek-V4-Flash-0731`.
- Current per-million-token rates observed for this model: cache-hit input `USD 0.0028`, cache-miss input `USD 0.14`, output `USD 0.28`.
- The page warns of planned price change; prices and model/service facts are mutable and require freshness checks.

Converted exact integer rates used by the design:

```text
cache hit input: 2,800 microusd / 1,000,000 tokens
cache miss input: 140,000 microusd / 1,000,000 tokens
output: 280,000 microusd / 1,000,000 tokens
```

### DS-03 — Rate limit, keep-alive and isolation

- Rate/concurrency behavior is account-level and may queue requests rather than expose a stable user-selected limit.
- Non-streaming responses may emit blank keep-alive lines while inference is pending.
- The documented long Provider inactivity boundary is not adopted as a CWT timeout; CWT uses a shorter exact total timeout.
- The documented `user_id` isolation field is omitted because Phase D has no need to send an external user/customer identity.

### DS-04 — Context caching

- Disk context caching is enabled by default and triggers for requests.
- Cache entries commonly persist hours to days.
- Usage reports cache-hit and cache-miss Prompt tokens.
- No exact official cache-disable control was established by the reviewed sources. The design must not claim cache disablement.

### DS-05 — JSON Output

- Request JSON Output uses `response_format: {"type":"json_object"}`.
- Prompt instructions must explicitly request JSON.
- JSON Output may produce empty content; length-limited output may be truncated.
- CWT therefore validates nonempty one-object output locally and treats empty/truncated results as failure.

### DS-06 — Thinking mode

- Thinking is enabled by default for the current model behavior.
- The OpenAI-compatible Chat Completion request disables it explicitly with `thinking: {"type":"disabled"}`.
- CWT does not use raw reasoning content and rejects nonempty reasoning fields/tokens.

### DS-07 — HTTP errors

- Documented status meanings include `400` invalid format, `401` authentication, `402` insufficient balance, `422` invalid parameters, `429` rate limit, `500` server error and `503` overload.
- Phase D maps these into existing safe CWT Provider classes. It never persists the Provider error message/body.

### DS-08 — Open Platform Terms

- Observed release date `2026-04-22` and effective date `2026-04-29`.
- The terms permit service/price/terms change, place data/right/legal-basis responsibilities on the developer, provide service on an as-is/as-available basis and contain liability limitations.
- These public terms do **not** establish the requested account-specific DPA, no-training guarantee, processing region, subprocessor list, enterprise cache guarantee or enterprise security assurance.
- Missing assurance remains Owner-accepted residual risk, not PASS.

### DS-09 — Chat Completion request/response schema

- Exact Phase D operation: `POST /chat/completions`.
- Relevant response fields include response `id`, choices/finish reason/message content, returned model, system fingerprint and usage.
- Current finish reasons include `stop`, `length`, `content_filter`, `tool_calls` and `insufficient_system_resource`.
- Usage includes aggregate input/output/total and cache-hit/cache-miss Prompt token counts; reasoning-token detail may be present.
- The public endpoint exposes many optional request features. CWT admits only the much smaller exact allowlist in the Exact Design.

## 3. Challenges and reconciliation

| Known proposition | Reverified disposition |
|---|---|
| `deepseek-v4-flash` is the current alias | Supported on retrieval date; mutable, must be preflighted and returned model checked. |
| OpenAI-format base URL is `https://api.deepseek.com` | Supported; design fixes host/path/TLS and forbids arbitrary endpoint. |
| Thinking defaults enabled | Supported; CWT must send explicit `thinking.type=disabled`. |
| JSON object can be empty/truncated | Supported; CWT must reject empty/invalid/truncated output. |
| Disk context cache is default and persists hours-to-days | Supported; no disable control established; usage/cost split and residual risk required. |
| Pricing/model/service terms may change | Supported; compiled snapshot freshness and preflight required. |
| Public terms establish prior enterprise assurances | **Not supported**; must remain unresolved external assurance. |

## 4. Evidence limits

No account-specific capability, quota, credential validity, actual returned model, actual API response, latency, abort behavior or usage accuracy was tested in this docs-only task. Those items remain External Validation `NOT RUN`. No source above is treated as proof of DPA, no-training, region, subprocessor or enterprise guarantee.
