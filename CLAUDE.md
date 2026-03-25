# CLAUDE.md

## 1. Purpose
This file defines the working contract for contributors and AI agents in this repository.
It is derived from:
- `docs/TECH_SPEC.md` (authoritative)
- `docs/learning/*` (context and acceptance references)

When documents conflict, **`docs/TECH_SPEC.md` takes precedence**.

## 2. Project Scope
Current scope is **ability management only** (backend admin module), including:
1. Category management
2. Capability management
3. External HTTP capability configuration
4. Sync jobs with upstream platform

Out of scope:
1. Intelligent-agent management module
2. Frontend intelligent-agent publish/on-offline flows
3. Service-side RBAC enforcement (gateway auth is used)

## 3. Tech Stack
1. Frontend: React + TypeScript
2. Frontend UI Library: Ant Design (antd)
3. Backend: Node.js + TypeScript
4. Storage: MySQL (+ Redis as supporting infra)

## 4. Architecture Baseline
Request path must follow:
`User -> API Controller -> Service -> Repository -> Database`

Sync path must follow:
`Scheduler -> Sync Worker -> Upstream API -> Ability Service -> Database`

Reference: `docs/learning/system-data-flow.md`

## 5. Non-Negotiable Business Rules
1. **number-string rule**
   - All business numeric params use number-string.
   - Regex: `^[0-9]+$`
   - Leading zeros are allowed.
2. **Delete idempotency**
   - Repeated delete returns success code `0`.
3. **Sync trigger mutual exclusion**
   - Manual sync trigger must reject concurrent running jobs.
4. **Readonly sync capability**
   - `source=sync` capability cannot be edited/deleted manually.
5. **Capability creation type restriction**
   - Only external types are creatable manually.
6. **Capability type change behavior**
   - Changing `capability_type` clears `request_config`.

## 6. API Contract Baseline
Base path: `/api/v1/ability-management`

Core endpoints:
1. Categories: `GET/POST /categories`, `PUT/DELETE /categories/{id}`
2. Capabilities: `GET/POST /capabilities`, `GET/PUT/DELETE /capabilities/{id}`
3. Sync jobs: `GET /sync-jobs`, `POST /sync-jobs/trigger`

Capability list filters are limited to:
1. `keyword`
2. `capability_type`

Common response shape:
1. Success: `{ code: "0", message: "ok", data, request_id }`
2. Failure: `{ code: "CAP_xxxx", message, request_id }`

## 7. Error-Code and HTTP Mapping
Must follow `docs/TECH_SPEC.md`:
1. `CAP_4001` -> 400
2. `CAP_4002` -> 409
3. `CAP_4003` -> 404
4. `CAP_4004` -> 409
5. `CAP_4005` -> 409
6. `CAP_4006` -> 400
7. `CAP_4091` -> 409
8. `CAP_5001` -> 502 (external dependency)
9. `CAP_5002` -> 500 (internal sync/task failure)

## 8. Data Model Constraints
Mandatory constraints to keep aligned with `docs/TECH_SPEC.md`:
1. Unique constraints for normalized names and sync keys
2. FK constraints:
   - `capabilities.category_id -> categories.id`
   - `capability_http_configs.capability_id -> capabilities.id`
3. ON UPDATE/DELETE strategy:
   - `ON UPDATE CASCADE`
   - `ON DELETE RESTRICT`
4. Core columns marked `NOT NULL`

## 9. Testing and Quality Gates
Any implementation should be verifiable by automation:
1. API contract tests (schema, code, status)
2. Parameterized validation tests (`number-string`, timeout, URL safety)
3. Concurrency tests (`version` conflict -> `CAP_4091`)
4. Sync tests (incremental/full/retry/partial)
5. Performance baseline: 10,000 records, list API `P95 < 500ms`

Reference:
- `docs/learning/ability-management-techspec-acceptance.md`
- `docs/learning/ability-management-acceptance-criteria.md`
- `docs/learning/ability-management-testcases.csv`

## 10. Change Management Rules
When updating implementation or docs:
1. Keep API, DB constraints, and acceptance criteria in sync.
2. Update `docs/TECH_SPEC.md` first for behavior changes.
3. Keep `docs/learning/*` aligned for test and review artifacts.
4. Frontend should use Ant Design by default; introducing another UI library requires prior TECH_SPEC update.
5. Do not introduce undocumented behavior in code.

## 11. Current Source of Truth Files
1. `docs/TECH_SPEC.md`
2. `docs/learning/ability-management-prd-supplement.md`
3. `docs/learning/ability-management-techspec-acceptance.md`
4. `docs/learning/system-data-flow.md`
