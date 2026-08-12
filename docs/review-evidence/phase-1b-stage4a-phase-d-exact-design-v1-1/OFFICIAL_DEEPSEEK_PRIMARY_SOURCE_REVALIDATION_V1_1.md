# Official DeepSeek Primary-Source Revalidation V1.1

Retrieval date: `2026-08-12`

Bounded retrieval completed: `2026-08-12T15:47:20Z`

Method: Node 24 built-in `fetch`, HTTPS, no credential, no DeepSeek API/model call, raw-body SHA-256 in memory, no raw source snapshot persisted.

## 1. Exact retrieval manifest

| Official URL | HTTP | Bytes | Raw SHA-256 |
|---|---:|---:|---|
| `https://api-docs.deepseek.com/api/deepseek-api/` | 200 | 12,832 | `8c58091f8d6d94837e710b42f11bf2a006cd84025738e3f8c6ce6da447445d94` |
| `https://api-docs.deepseek.com/quick_start/pricing/` | 200 | 21,969 | `3af5e5d6992a4e26709ed37f02d9bfbc46ee92dc825e6588404728419f41ce71` |
| `https://api-docs.deepseek.com/quick_start/rate_limit/` | 200 | 34,717 | `b9d487d90ce8c12528b4921479290f0cadf4d47be485cc2997e66c3792fa4917` |
| `https://api-docs.deepseek.com/guides/kv_cache/` | 200 | 33,715 | `bc5e7990b942bb8b4d94def9ef85c2b97475f77bbc47fdd20cc9582c92a2a7d0` |
| `https://api-docs.deepseek.com/guides/json_mode/` | 200 | 31,947 | `7fc0e1ad3111e6bd817dc26f121bbc97342c43507230f47dfd2274dcf6f04d79` |
| `https://api-docs.deepseek.com/guides/thinking_mode/` | 200 | 107,940 | `f6df574aed34cf0e03bfefcf396f3b9b723f588318f1c86ff0d1d9d8ad14b481` |
| `https://api-docs.deepseek.com/quick_start/error_codes/` | 200 | 19,990 | `b0cceeb3844c15ef05ebe9441bcedcd7a9ec50dd01c7d548429b55c1e933cf06` |
| `https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html` | 200 | 33,904 | `2b433c53cbac75491959025eba5a27908f9f1886352dce0a05f3d5a936d87790` |
| `https://api-docs.deepseek.com/api/create-chat-completion/` | 200 | 125,153 | `2948bb768f4fedca3837bd402ca5bf7ca864b7bc6ef68312f82ebe4fb8ea9a3a` |

The API-doc pages had `Last-Modified` values between `2026-08-12T15:21:04Z` and `2026-08-12T15:21:16Z`; the terms page had `2026-07-15T07:30:02Z`. Raw API-doc hashes therefore differ from immutable V1.0/reviewer snapshots even though the bounded material facts below remain the same. V1.1 records the drift and replaces the compiled pricing source hash; it does not treat historical hashes as current.

## 2. Bounded current contract projection

- OpenAI-compatible base URL is `https://api.deepseek.com`; the admitted Chat Completion target is `/chat/completions`; authentication is Bearer-token based.
- Current admitted model alias is `deepseek-v4-flash`; the published version is `DeepSeek-V4-Flash-0731`.
- Current per-million token prices are USD `0.0028` cache-hit input, USD `0.14` cache-miss input and USD `0.28` output. CWT integer microusd rates are `2,800`, `140,000`, `280,000`.
- Thinking is currently default-enabled for the relevant model behavior; the OpenAI Chat Completion request can explicitly disable it using the reviewed `thinking.type=disabled` envelope.
- JSON Output requires `response_format.type=json_object`, an explicit JSON instruction and local handling of empty/truncated output.
- Disk context caching is default, exposes cache-hit/miss token accounting and is commonly retained hours-to-days. No exact cache-disable control was established.
- Official error documentation supports the reviewed bounded HTTP classes; the adapter remains stricter than public error prose and never trusts error messages.
- Pricing, model/service behavior and public terms may change. The compiled snapshot is not a future guarantee.

## 3. `service_tier` check (`L-01`)

The exact raw Chat Completion page contained `0` literal `service_tier` occurrences. No current official primary-source type, allowed value set, normalization or evidence contract for that success field was found. V1.1 therefore removes it from the strict success allowlist. This is a fail-closed correction, not evidence that DeepSeek can never add such a field later.

The remaining top-level success allowlist is exactly:

```text
id, object, created, model, system_fingerprint, choices, usage
```

Unknown top-level or nested success fields remain non-retryable invalid response.

## 4. External assurance boundary

The public sources do not establish account-specific or enterprise commitments for:

- DPA;
- API input/output no-training or no-service-improvement use;
- processing/storage region or transfer mechanism;
- cache disablement/retention guarantee;
- complete subprocessors;
- tenant isolation/security controls;
- SLA, incident notice or account-specific operational assurance.

Accordingly `PD-04`–`PD-08` and `PD-10` remain unresolved external assurance/Owner-accepted residual risk. API/schema/price observations do not close them and no PASS is recorded.

## 5. Implementation preflight rule

The later authorized implementation/validation task must re-fetch the pricing and Chat Completion sources before any credential/API call. A raw hash, alias/version, rate, response-schema or instruction change is a fail-closed stop requiring reviewed snapshot/design reconciliation. The Worker performs no remote runtime price lookup; only the controlled preflight performs the one bounded official-source GET.
