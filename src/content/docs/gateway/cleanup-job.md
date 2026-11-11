---
title: Cleanup job
description: Deleting files past their retention, and old audit rows.
---

The cleanup job deletes every file whose `expires_at` has passed (see [Retention and cleanup](/docs/concepts/retention-and-cleanup/)) and, when `AUDIT_RETENTION_DAYS` is set, audit rows older than that.

Run it with either:

- `php bin/cleanup` inside the container (or locally against `DATABASE_URL` and the bucket), or
- [`POST /cleanup/run`](/docs/api-reference/operations/cleanuprun/) with an admin token.

Nothing in the gateway runs on a timer, so schedule it. For example with Docker:

```sh
docker run --rm <same env> ghcr.io/crowpond/gateway php bin/cleanup
```

or on Fly.io:

```sh
fly machine run . --schedule daily php bin/cleanup
```

## Behaviour

- The bucket object is deleted first, then the catalog row, one file per transaction. A bucket failure leaves the row, and the next run retries it.
- At most 500 files are deleted per run. If the result says `more: true`, run it again.
- It logs `file_deleted` or `file_delete_failed` per file. Through the API these are under the request's trace; `bin/cleanup` uses a trace of its own for the whole run.
- Audit purging writes one `audit.purge` row with the count, in the same transaction; nothing is written when nothing was old enough.
