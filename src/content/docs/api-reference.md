---
title: API reference
description: Placeholder for the gateway API reference generated from OpenAPI.
---

:::note
The full API reference will be generated from an OpenAPI 3.1 description once the gateway publishes one. That work is tracked in [crowpond/gateway#5](https://github.com/crowpond/gateway/issues/5).
:::

Until then, the main routes are summarised below. Every route except `GET /healthz` needs a bearer token (`Authorization: Bearer <token>`).

| Endpoint | Role | |
| --- | --- | --- |
| `GET /healthz` | none | health check |
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
| `GET /audit` | admin | the audit log |

See [Gateway configuration](/docs/gateway/configuration/#errors) for error statuses and [Logging and trace context](/docs/concepts/logging-and-tracing/) for the `traceparent` header.
