---
title: Logging and trace context
description: The gateway's NDJSON logs and W3C trace context.
---

Logs go to stderr (PHP errors too) and nowhere else: no log files, and nothing ships logs from inside the container. The platform captures the stream and can forward it to a collector. The access log and events share the stream and are told apart by `level` and `event`.

The format is NDJSON: one JSON object per line. Field names follow the [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) where one exists, so `jq`, DuckDB or a collector can read the stream directly.

Every request writes one `request` line, after any events it caused:

```json
{"ts":"2026-11-11T10:15:02.123456+00:00","event":"request","level":"info","severity_text":"INFO","severity_number":9,
 "trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","span_id":"f9790774d574c856","who":"aisstore","role":"api",
 "token_id":"01a1c9b3-0482-7515-9987-69974bd5ca66","http.request.method":"GET","http.route":"/objects/{id}",
 "http.response.status_code":422,"http.response.body.size":100,"parent_span_id":"00f067aa0ba902b7",
 "duration_ms":8.94,"detail":"..."}
```

| Field | |
| --- | --- |
| `ts` | RFC 3339 timestamp, UTC |
| `event` | `request` for the access line; otherwise the event name (`ingested`, `committed`, `archive_run`, `error`, ...) |
| `level`, `severity_text`, `severity_number` | `info` / `warn` / `error` (INFO 9, WARN 13, ERROR 17) |
| `trace_id`, `span_id` | the request's W3C trace context; on every event of the request |
| `parent_span_id` | the caller's span, when a valid `traceparent` came in (`request` line only) |
| `who`, `role`, `token_id` | the calling token's name, role and id; absent when no valid token was presented. Never the secret |
| `http.request.method`, `http.route`, `http.response.status_code` | as in OpenTelemetry; `http.route` is the matched pattern, null when no route matched |
| `http.response.body.size` | response body bytes |
| `duration_ms` | time spent in the gateway |
| `detail` | the problem `detail` of a 4xx or 5xx response (cut at 500 characters), else null |

Levels: 5xx are `error`; 401 and 403 are `warn`; other 4xx are `info`. A failed archive integrity check always writes an `archive_integrity_failed` event at `error`, on top of the 500 it returns.

## Trace context

Send a `traceparent` header (`00-<32 hex trace id>-<16 hex parent id>-<2 hex flags>`, lower case, no all-zero ids) and the request continues that trace: same `trace_id`, a new `span_id` of the gateway's own, and your span as `parent_span_id`. A missing or invalid header is ignored and a new trace is started. Every response carries a `traceparent` header; quote its trace id when reporting a problem. The same ids appear in the [audit log](/docs/concepts/audit-log/).

The admin console sends a `traceparent` on every gateway call, so a console action can be followed into the gateway's logs and audit rows.

## Jobs

[`POST /archive/run`](/docs/api-reference/operations/runarchive/) and [`POST /cleanup/run`](/docs/api-reference/operations/cleanuprun/) log one event per day archived (`archive_day`, `archive_day_failed`) or file deleted (`file_deleted`, `file_delete_failed`) under the request's trace, then a summary event. `bin/archive` and `bin/cleanup` write the same events with a `trace_id` of their own for the whole run and no `who`.

## Never logged

Request bodies, payloads, query strings, bearer tokens, presigned or download URLs. URLs and bearer tokens are also removed from logged exception messages. A `detail` is the message the client got, and a database rejection can quote the offending value, so treat logs as sensitive anyway.
