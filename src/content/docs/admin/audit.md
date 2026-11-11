---
title: Admin console audit
description: The console's audit trail and how it joins the gateway's audit log.
---

The `/audit` page shows a combined trail in two sections.

**Console actions** are the console's own records, in the `admin_audit` table of its database: time, user, a copy of the user's email (so history survives account deletion), action, target, trace id, result (`ok` or `refused`, with the gateway's message) and a small non-sensitive context. Token secrets, passwords, request bodies and download links are never stored. A failed write is logged as `admin_audit_write_failed` and the action carries on.

**Gateway requests** are the gateway's [`GET /audit`](/docs/concepts/audit-log/): every API token's requests, including other clients, newest first, with cursor paging. If the gateway is older and has no audit endpoint, or the call fails, the page shows a notice there while the console records still list.

The two are joined on `trace_id`. A console row's Show button fetches the gateway rows with that trace id, and each gateway row names the console user. The UI has no edit or delete.

## Retention

Set `AUDIT_RETENTION_DAYS` and run `php artisan admin:prune-audit` (for example from cron) to delete older console audit rows. Unset or 0 keeps everything.

Deploying a version that adds the audit table needs a migration, see [deployment](/docs/admin/deployment/#migrations-are-manual).
