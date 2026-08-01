# ADR-0001: Modular monolith

Status: Accepted.

CWT uses one deployable Next.js application with separated public, admin, domain, persistence, jobs, and integration modules. This keeps Phase 1 maintainable while preserving boundaries for later scale. Independent AI microservices are deferred until workload evidence justifies them.
