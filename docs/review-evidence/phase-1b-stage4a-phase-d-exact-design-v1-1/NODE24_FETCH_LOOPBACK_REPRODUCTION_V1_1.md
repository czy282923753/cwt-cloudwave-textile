# Node 24 Built-in Fetch Loopback Reproduction V1.1

Executed: `2026-08-12`

Scope: local loopback only; no DeepSeek credential, API/model call or external write.

Runtime tuple:

```json
{
  "node": "24.14.0",
  "v8": "13.6.233.17-node.41",
  "icu": "78.2",
  "unicode": "17.0",
  "cldr": "48.0",
  "platform": "darwin",
  "arch": "arm64"
}
```

## 1. Reproduced `M-02`

A loopback origin returned `302` with a destination counter. With built-in `fetch(..., { redirect:"error" })`, the promise rejected as:

```json
{
  "resolved": false,
  "name": "TypeError",
  "causeCode": null,
  "causeName": "Error"
}
```

The rejection did not expose the HTTP status. A network rejection also crosses the broad `TypeError` boundary. Depending on exception message/stack/unstable cause detail would contradict the safe evidence contract and would not provide a stable redirect-vs-network retry discriminator. The independent review finding is reproduced.

## 2. Replacement primitive reproduction

With `redirect:"manual"` against the same loopback redirect:

```json
{
  "status": 302,
  "redirected": false,
  "destinationHits": 0
}
```

The response status is available for a stable status-first non-retryable decision. No target was followed. The V1.1 design additionally forbids reading/resolving `Location` or the body before returning the typed redirect failure.

## 3. Emitted header-name reproduction

The application supplied only `Accept`, `Content-Type` and `Authorization` using an in-memory Synthetic sentinel. The loopback server observed the exact lowercase sorted header names:

```json
[
  "accept",
  "accept-encoding",
  "accept-language",
  "authorization",
  "connection",
  "content-length",
  "content-type",
  "host",
  "sec-fetch-mode",
  "user-agent"
]
```

The application-controlled headers each occurred exactly once. The seven remaining names were runtime/transport generated. No cookie, forwarding, trace/baggage, proxy authorization, API-key or second authorization name appeared. No header value or credential-like value was retained in evidence.

This reproduces the second half of `M-02`: “exactly three headers on the wire” is false for built-in fetch. V1.1 replaces it with an exact three-name application allowlist plus an exact runtime-generated name policy.

## 4. Required executable implementation gate

The implementation test must reproduce the results through the actual adapter/transport wrapper, not merely raw fetch:

- manual redirect status is rejected before `Location`/body access;
- destination hits remain zero;
- redirect is non-retryable and network-unreachable remains transient;
- captured header names equal the exact set above;
- only three application names are constructed by adapter code; and
- runtime tuple/header/manual semantics drift stops before credential access, claim or external call.

An injected fake transport still owns deterministic body/status/fault vectors. The real loopback test exists specifically to bind the selected Node transport semantics.
