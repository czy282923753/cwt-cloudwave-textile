# Reviewer H-01 Final Fresh Challenge Matrix V1.0

Every source mutation below was applied only to a disposable exact snapshot, exercised through the real sole `scripts/verify-ai-architecture.ts` gate, and restored.

| Case | Boundary | Expected / actual |
| --- | --- | --- |
| Combined declare function/class/const | attempt-2 `d41c9c4...` | gate exit 0 / exit 0 (defect reproduced) |
| Same combined witness | V3 | reject / exit 1, `typescript_resolved_non_emitting_repository_declaration` |
| `export declare class EventSource` captured in a container | V3 | reject / exit 1 |
| overload-only `function fetch(...): ...;` | V3 | reject / exit 1 |
| interface-only `WebSocket` used as a constructor | V3 | reject / exit 1 |
| triple-reference `.d.ts` ambient `fetch`, then object-container call | V3 | reject / exit 1 |
| emitted local `fetch`, `WebSocket`, `EventSource`, parameter `XMLHttpRequest` | V3 | allow / exit 0 |
| exact DB path plus wrong global member | V3 | reject / exit 1 |
| exact DB path plus destructured `globalThis` alias | V3 | reject / exit 1 |

Representative decisive diagnostic:

```json
{"path":"src/ai/canonical-json.ts","rule":"protected-phase-b-runtime-global-capability-origin-denied","nodeKind":"Identifier","reason":"ambient_runtime_capability_not_authorized","origin":"typescript_resolved_non_emitting_repository_declaration","capability":"fetch"}
```

The corrected code HEAD baseline passed with the full declared 69 fault/topology cases, 10 positives and 28 lifecycle mutations. No alternate checker or compatibility branch was found.
