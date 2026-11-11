---
title: Audit log
description: The gateway's durable record of who did what through the API.
---

The logs go to stderr and live as long as the platform keeps them. The `audit_log` table is the durable, queryable record of who did what through the API. Logs are for operations; the table is for accountability.

## What a row holds

One row per audited request:

| Column | |
| --- | --- |
| `audit_id` | UUIDv7, time-ordered; the pagination cursor |
| `at` | when the transaction started (UTC) |
| `trace_id`, `span_id`, `parent_span_id` | the request's W3C trace context, the same ids as in the log lines |
| `token_id`, `token_name`, `role` | the calling token; null when no valid token was presented. Never the secret |
| `method`, `route` | the matched route pattern (`/objects/{id}`), never the raw path |
| `action` | stable name of the operation |
| `target_type`, `target_id` | what it acted on: `object`, `table`, `token`, `proposal` or `schema`. Null for runs and scans |
| `status`, `outcome` | HTTP status; `ok`, `denied` (401/403) or `failed` (any other 4xx/5xx) |
| `detail` | small jsonb of counts and names only |

Never stored: request or response bodies, payloads, metadata, query strings, bearer tokens, token secrets, presigned or download URLs.

## What is audited

Every state-changing request, every denied request (401/403) on a route that has an action, and, with `AUDIT_READS=on`, successful and failed reads too. `GET /healthz` and unmatched routes are never audited.

Actions: `object.create`, `object.commit`, `object.delete`, `records.create` (one row per batch), `schema.register`, `proposal.scan`, `proposal.approve`, `proposal.reject`, `archive.policy`, `archive.run`, `cleanup.run`, `token.create`, `token.revoke`, `label_policy.create`, `label_policy.delete`, `audit.purge`. Reads: `object.list`, `object.read`, `table.list`, `table.read`, `table.rows`, `archive.status`, `proposal.list`, `proposal.read`, `token.list`, `label_policy.list`, `label_policy.read`, `audit.list`.

## Consistency

For a change made in one transaction, the audit row is inserted in that transaction: a committed change always has its `ok` row, and a rolled-back one has none. If the audit row cannot be written, the change is rolled back and the request fails with 500. A rejected or failed request gets a `failed` or `denied` row afterwards, best effort.

`archive.run` and `cleanup.run` use separate connections and cannot be rolled back; the row is written afterwards, and if that fails the request returns 500 although the work was done (an `audit_failed` event is logged).

## Reading it

`GET /audit` needs an admin token; an api token gets 403 and the attempt is itself recorded. All filters are optional and combined with AND: `from` (inclusive), `to` (exclusive) as RFC 3339 timestamps, `token_id`, `action`, `target_id`, `trace_id` (32 lower-case hex) and `outcome`. Pagination is keyset on `audit_id` with `limit` (1 to 1000, default 100) and `after` (the previous `next`). Oldest first by default; `order=desc` gives newest first.

A response, abridged:

```json
{"items": [{"audit_id": "01a1c9dc-957f-7582-90f2-2480ab5d977c", "at": "2026-11-11T09:07:19.038989+00:00",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736", "span_id": "f9790774d574c856", "parent_span_id": "00f067aa0ba902b7",
  "token_id": "01a1c9b3-0482-7515-9987-69974bd5ca66", "token_name": "feed-gateway", "role": "api",
  "method": "POST", "route": "/objects", "action": "object.create", "target_type": "object",
  "target_id": "01a1c9dc-9575-7f1e-8a00-1c4d2e5b6a70", "status": 201, "outcome": "ok",
  "detail": {"kind": "file", "source": "drone-17", "owner": "survey-team"}}],
 "next": null}
```

Indexes cover `at`, `token_id`, `action`, `trace_id` and `target_id`.

## Retention and integrity

Rows are kept forever unless `AUDIT_RETENTION_DAYS` is set. The cleanup job then deletes older rows and records that in one `audit.purge` row. Apart from that the application only inserts: it never updates or deletes an audit row. To enforce this in the database too, grant the gateway's role `INSERT, SELECT` (and `DELETE` only if you use retention) on `audit_log`, with no `UPDATE`. Hash-chaining rows to make tampering detectable is not built; it is an open question.

The admin console keeps its own audit trail as well, see [Admin console audit](/docs/admin/audit/).
