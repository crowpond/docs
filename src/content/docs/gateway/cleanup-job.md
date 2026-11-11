---
title: Cleanup job
description: Deleting files past their retention, expired archive files, and old audit rows.
---

The cleanup job deletes every file whose `expires_at` has passed (see [Retention and cleanup](/docs/concepts/retention-and-cleanup/)) archived Parquet files past their [archive retention](/docs/concepts/retention-and-cleanup/#archive-retention) limit (`ARCHIVE_RETENTION_DAYS` or the table's own), and, when `AUDIT_RETENTION_DAYS` is set, audit rows older than that.

Run it with either:

- `php bin/cleanup` inside the container (or locally against `DATABASE_URL` and the bucket), or
- [`POST /cleanup/run`](/docs/api-reference/operations/cleanuprun/) with an admin token.

Both take a dry run that deletes nothing and reports what the archive part would remove: `php bin/cleanup --dry-run`, or `?dry_run=true` on the endpoint.

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
- At most 500 files and 500 archive files are deleted per run. If the result says `more: true`, run it again.
- An archive file is deleted whole, with its binding, registry row and catalog rows, in one transaction; a failure rolls that file back and the next run retries it. Each is audited as `archive.expire`.
- It logs `file_deleted` or `file_delete_failed` per file, and `archive_file_deleted`, `archive_file_expired` (dry run) or `archive_file_delete_failed` per archive file. Through the API these are under the request's trace; `bin/cleanup` uses a trace of its own for the whole run.
- Audit purging writes one `audit.purge` row with the count, in the same transaction; nothing is written when nothing was old enough.
