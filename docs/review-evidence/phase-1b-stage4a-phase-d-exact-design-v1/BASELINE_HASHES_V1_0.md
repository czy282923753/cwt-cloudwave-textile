# Accepted Baseline Hashes V1.0

Hash method: SHA-256 over accepted Phase C checkpoint worktree bytes
Observed: `2026-08-12`

| Accepted path | SHA-256 |
|---|---|
| `src/ai/providers/text-provider.ts` | `d46a608c82d4c892feb4c6ddf5ec44fbd75344d6aa64da26f386febc98f8d8f1` |
| `src/ai/providers/registry.ts` | `7cedc4e751972de2ca93c23021be8087061ec1f561fd560c85b7989279acd280` |
| `src/ai/core/orchestrator.ts` | `3b67ff43bc9c277dfef0d653458f2ed498bbb6a4d8444d3f77e53ba5b34f9fd9` |
| `src/ai/runs/contracts.ts` | `93d5c37e1d2d5ba0b279a66db1760b4a5f45693b6576a87e32eb697e25f751c1` |
| `src/ai/runs/attempt-evidence.ts` | `102ef5677814304156bf1474fae968879592318a22eba95b8b655d326f848be1` |
| `src/ai/runs/pricing-policy.ts` | `3225e677bbe71b94d36b191b73d3a3048c95c9f99a9abb0ac041ea25dec4ff30` |
| `src/ai/runs/repository.ts` | `60a653e3c8f84672c4a13c000eca6bb1271c53fddc2ed8ab65f2e7b35d339772` |
| `src/ai/runs/worker.ts` | `7a57533dca0f384f9c8b0234548cb2e5274c0c1a4aeeab3d5e8df8225ab2db91` |
| `src/server/ai/phase-c-composition.ts` | `1b661f43fc5a1a2fd4c48908bb455ea41975911f86246e848ceb7238441dbe11` |
| `scripts/process-ai-runs.ts` | `f1a5667779a8390e743e9bc90ae2241751d2ad5cf6503d4d962189bfdad78356` |
| `scripts/verify-ai-architecture.ts` | `9c990020f3ec5a433fee1187f706e50db58b935eb32027b7cc34a4f54fc7a4f1` |
| `test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json` | `51699e6da13fb572289851df9c0f984a13b02ce48cc5db878b1d320aabee1ddb` |

Identity checks:

```text
accepted checkpoint ref = 9006b638ed51f981f7477829086244627c488d6b
independent PASS review direct parent = 9006b638ed51f981f7477829086244627c488d6b
Owner Decision commit = ef262e57f9ade9660d6938a7464bdcdb10e02d54
Owner Decision commit direct parent = 9006b638ed51f981f7477829086244627c488d6b
```

These hashes are inventory evidence only. Phase D implementation will intentionally replace or modify only the exact paths authorized by the Exact Design; historical V4 and accepted checkpoint refs remain unchanged.
