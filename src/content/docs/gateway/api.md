---
title: API overview
description: Endpoints, roles, pagination and errors of the gateway API.
---

The full description is an OpenAPI 3.1 document, rendered in the [API reference](/docs/api-reference/) and served by every gateway at `GET /openapi.json` (no token needed, like `/healthz`: it describes the API and says nothing about a deployment). It covers every operation with parameters, request bodies, responses, the error shape, cursor pagination, the `traceparent` header and the bearer scheme. Each operation's `bearerAuth` scope is the role it needs: `api`, which any valid token satisfies, or `admin`. The `servers` entry in the document is a placeholder.

## Endpoints

Each operation links to its page in the reference, which has the parameters, request body, responses and status codes.

| Operation | Role | Purpose |
| --- | --- | --- |
| [`GET /healthz`](/docs/api-reference/operations/healthz/), [`GET /openapi.json`](/docs/api-reference/operations/openapi/) | none | health check, API description |
| [`POST /objects`](/docs/api-reference/operations/createobject/) | api | ingest a record or describe a file |
| [`POST /objects/{{id}}/commit`](/docs/api-reference/operations/commitobject/) | api | finalise an uploaded file |
| [`GET /objects`](/docs/api-reference/operations/listobjects/), [`GET /objects/{{id}}`](/docs/api-reference/operations/readobject/) | api | list, fetch |
| [`DELETE /objects/{{id}}`](/docs/api-reference/operations/deleteobject/), [`POST /cleanup/run`](/docs/api-reference/operations/cleanuprun/) | admin | delete one object, delete expired files |
| [`POST /tables/{{table}}/records`](/docs/api-reference/operations/createrecords/) | api | batch ingest into a bulk table |
| [`GET /tables`](/docs/api-reference/operations/listtables/), [`GET /tables/{{table}}`](/docs/api-reference/operations/readtable/), [`GET /tables/{{table}}/rows`](/docs/api-reference/operations/listrows/) | api | inventory, detail, filtered rows |
| [`POST /schemas`](/docs/api-reference/operations/registerschema/) | admin | register a schema (`catalog: "table"` for a bulk table) |
| [`POST /proposals/scan`](/docs/api-reference/operations/scanproposals/), [`GET /proposals`](/docs/api-reference/operations/listproposals/), [`GET /proposals/{{id}}`](/docs/api-reference/operations/readproposal/), [`POST /proposals/{{id}}/approve`](/docs/api-reference/operations/approveproposal/), [`POST /proposals/{{id}}/reject`](/docs/api-reference/operations/rejectproposal/) | admin | schema proposals |
| [`GET /archive`](/docs/api-reference/operations/archivestatus/), [`POST /archive/run`](/docs/api-reference/operations/runarchive/), [`POST /tables/{{table}}/archive-policy`](/docs/api-reference/operations/setarchivepolicy/) | admin | archive status, run, hot window |
| [`POST /tokens`](/docs/api-reference/operations/createtoken/), [`GET /tokens`](/docs/api-reference/operations/listtokens/), [`POST /tokens/{{id}}/revoke`](/docs/api-reference/operations/revoketoken/) | admin | issue, list, revoke API tokens (optionally restricted by owner and label) |
| [`GET /label-policies`](/docs/api-reference/operations/listlabelpolicies/), [`GET /label-policies/{{id}}`](/docs/api-reference/operations/getlabelpolicy/) | api | built-in and registered [label policies](/docs/concepts/labels-and-binding/#label-policies) |
| [`POST /label-policies`](/docs/api-reference/operations/createlabelpolicy/), [`DELETE /label-policies/{{id}}`](/docs/api-reference/operations/deletelabelpolicy/) | admin | register, delete a label policy |
| [`GET /audit`](/docs/api-reference/operations/listaudit/) | admin | the [audit log](/docs/concepts/audit-log/) |

## Behaviour common to all endpoints

- **Authentication:** `Authorization: Bearer <token>` on everything except `/healthz` and `/openapi.json`. See [Configuration, Authentication](/docs/gateway/configuration/#authentication).
- **Errors:** a JSON body `{"detail": ...}`. 401 means no token, 403 a wrong token or a token without the needed role, 404 not found, 409 a conflict (for example deleting an archived record), 422 a validation failure (the `detail` lists the problems), 502 an archive file is unavailable, 500 an archive integrity failure, 503 file storage is not configured. Each operation page lists the statuses it can return.
- **Pagination:** keyset cursors. List endpoints return `next`; pass it back as `after` (`_after` on table rows) until it is `null`. Never build a cursor yourself.
- **Time:** RFC 3339 timestamps in responses, UTC. Filters accept RFC 3339; a timestamp without an offset is UTC.
- **Tracing:** send a `traceparent` header and the request continues your trace; every response carries a `traceparent` header. See [Logging and trace context](/docs/concepts/logging-and-tracing/).

<br />

The spec file is checked against the router in the gateway's test suite: a route missing from it, a route it describes that does not exist, a differing method or role, a dangling `$ref`, or a document that does not validate against the OpenAPI 3.1 JSON Schema all fail the build.
