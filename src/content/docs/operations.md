---
title: Operations
description: Routine jobs, monitoring and things to watch when running crowpond.
---

## Scheduled jobs

Nothing in the gateway or the console runs on a timer. Schedule these yourself (cron, a scheduled container, or any caller):

| Job | Command | Endpoint | When |
| --- | --- | --- | --- |
| Archive | `php bin/archive` | `POST /archive/run` | daily |
| Cleanup | `php bin/cleanup` | `POST /cleanup/run` | daily, if you use file retention or `AUDIT_RETENTION_DAYS` |
| Prune console audit | `php artisan admin:prune-audit` | | if you set the console's `AUDIT_RETENTION_DAYS` |

The endpoints need an admin token. Check progress with `GET /archive` or the console's Archive page.

## Health checks

- Gateway: `GET /healthz`.
- Admin console: `GET /up`.

## Logs

Both applications log to stderr as JSON lines. Follow a problem across components with the trace id: every gateway response has a `traceparent` header, and the console records its trace ids in its request log bar and audit trail. See [Logging and trace context](/docs/concepts/logging-and-tracing/) and [Audit log](/docs/concepts/audit-log/).

## Sizing

The gateway needs at least 512 MB of memory; the archive job takes about 180 MB on top. The console runs in 256 MB.

## Things to remember

- Back up PostgreSQL yourself; crowpond does not.
- Do not set a bucket lifecycle rule on `archive/`: it would delete archive files behind the catalog's back.
- Revoked or lost tokens cannot be recovered; issue a new one.
- A cache miss when reading the archive downloads a whole hourly file (a few MB). The cache is per machine and empty after a restart.
- Give a time range when reading large tables: only `created_at` is indexed.
- Grant the gateway's database role no `UPDATE` on `audit_log` to enforce its append-only behaviour in the database.
