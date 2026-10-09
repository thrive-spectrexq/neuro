# ADR 0001: Safer defaults for local runtime services

- **Status:** Proposed
- **Date:** 2026-10-09
- **Decision owners:** Neuro maintainers

## Context

The Docker Compose configuration publishes the API, Redis, ChromaDB, and optional Ollama ports without an explicit host address. Docker therefore may expose these ports on network interfaces beyond loopback. Redis is configured with `allkeys-lru` even though the same Redis instance is used as Celery's broker and result backend. An eviction policy intended for disposable cache entries can remove queue/backend keys under memory pressure.

Neuro's default deployment is local-first. Network exposure and loss of task state should therefore require an intentional configuration choice rather than being the default.

## Decision

1. Publish the backend, Redis, ChromaDB, and optional Ollama ports on `127.0.0.1` by default, using the Compose variable `NEURO_BIND_ADDRESS` to allow an explicit override.
2. Change Redis to `noeviction` so Redis refuses writes when its configured memory limit is exhausted instead of silently evicting arbitrary broker/backend keys.
3. Keep Redis append-only persistence enabled.
4. Document that operators who override the bind address must provide appropriate network controls and authentication, and must monitor Redis memory/capacity.

## Consequences

### Benefits

- A default local installation does not intentionally publish these ports on every host interface.
- Redis queue/result keys are not evicted by the configured LRU policy.
- Operators can still choose a non-loopback bind address when their deployment requires it.

### Trade-offs and limitations

- `noeviction` makes writes fail when Redis reaches its memory limit. This is preferable to silently evicting queue state, but it requires monitoring, capacity planning, and operational response.
- Loopback-only port publishing may change access for users who currently connect to Neuro from another device. Such deployments must explicitly set `NEURO_BIND_ADDRESS` to a suitable interface and protect the exposed services.
- This change does not by itself add authentication to Redis or ChromaDB, encrypt traffic, or make a public deployment secure.

## Validation

Before release, maintainers should:

- Run `docker compose config` with the default environment and confirm all published ports use `127.0.0.1`.
- Run `docker compose config` with an explicit `NEURO_BIND_ADDRESS` override and confirm it is applied consistently.
- Start the stack and verify backend, Redis, and ChromaDB health checks.
- Verify Redis reports `noeviction` and test/monitor behavior at the configured memory limit in a non-production environment.
- Document the override in deployment instructions for users who intentionally need remote access.
