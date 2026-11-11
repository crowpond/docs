---
title: API overview
description: Endpoints, roles, pagination and errors of the gateway API.
---

The full description is an OpenAPI 3.1 document, rendered in the [API reference](/docs/api-reference/) and served by every gateway at `GET /openapi.json` (no token needed, like `/healthz`: it describes the API and says nothing about a deployment). It covers every operation with parameters, request bodies, responses, the error shape, cursor pagination, the `traceparent` header and the bearer scheme. Each operation's `bearerAuth` scope is the role it needs: `api`, which any valid token satisfies, or `admin`. The `servers` entry in the document is a placeholder.

## Endpoints

| Endpoint | Role | Purpose |
| --- | --- | --- |
| `GET /healthz`, `GET /openapi.json` | none | health check, API description |
| `POST /objects` | api | ingest a record or describe a file |
| `POST /objects/{id}/commit` | api | finalise an uploaded file |
| `GET /objects`, `GET /objects/{id}` | api | list, fetch |
| `DELETE /objects/{id}`, `POST /cleanup/run` | admin | delete one object, delete expired files |
| `POST /tables/{table}/records` | api | batch ingest into a bulk table |
| `GET /tables`, `GET /tables/{table}`, `GET /tables/{table}/rows` | api | inventory, detail, filtered rows |
| `POST /schemas` | admin | register a schema (`catalog: "table"` for a bulk table) |
| `POST /proposals/scan`, `GET /proposals[/{id}]`, `POST /proposals/{id}/approve\|reject` | admin | schema proposals |
| `GET /archive`, `POST /archive/run`, `POST /tables/{table}/archive-policy` | admin | archive status, run, hot window |
| `POST /tokens`, `GET /tokens`, `POST /tokens/{id}/revoke` | admin | issue, list, revoke API tokens |
| `GET /label-policies[/{id}]` | api | built-in and registered [label policies](/docs/concepts/labels-and-binding/#label-policies) |
| `POST /label-policies`, `DELETE /label-policies/{id}` | admin | register, delete a label policy |
| `GET /audit` | admin | the [audit log](/docs/concepts/audit-log/) |

## Behaviour common to all endpoints

- **Authentication:** `Authorization: Bearer <token>` on everything except `/healthz` and `/openapi.json`. See [Configuration, Authentication](/docs/gateway/configuration/#authentication).
- **Errors:** a JSON body `{"detail": ...}`. 401 means no token, 403 a wrong token or a token without the needed role, 404 not found, 409 a conflict (for example deleting an archived record), 422 a validation failure (the `detail` lists the problems), 502 an archive file is unavailable, 500 an archive integrity failure.
- **Pagination:** keyset cursors. List endpoints return `next`; pass it back as `after` (`_after` on table rows) until it is `null`. Never build a cursor yourself.
- **Time:** RFC 3339 timestamps in responses, UTC. Filters accept RFC 3339; a timestamp without an offset is UTC.
- **Tracing:** send a `traceparent` header and the request continues your trace; every response carries a `traceparent` header. See [Logging and trace context](/docs/concepts/logging-and-tracing/).

<br />

The spec file is checked against the router in the gateway's test suite: a route missing from it, a route it describes that does not exist, a differing method or role, a dangling `$ref`, or a document that does not validate against the OpenAPI 3.1 JSON Schema all fail the build.
