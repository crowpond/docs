---
title: Gateway configuration
description: Environment variables the gateway reads.
---

The gateway is configured through environment variables.

| Variable | |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (libpq or URL) |
| `BUCKET_NAME`, `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | The bucket (any S3-compatible store). Without it, file endpoints return 503 and nothing is archived |
| `DUCKDB_LIB` | Path of `libduckdb.so`; needed to read or write the archive |
| `UPLOAD_URL_TTL` | Presigned URL lifetime in seconds (default 900) |
| `HOT_DAYS` | Default hot window in days (default 7) |
| `ARCHIVE_CACHE_MB`, `ARCHIVE_CACHE_DIR` | Local archive cache (default 256 MB, system temp dir); `0` turns the cache off |
| `ARCHIVE_WORK_DIR` | Scratch space for archive exports (default system temp dir) |
| `AUDIT_READS` | `on` also audits successful GET requests (default off); denied reads are always audited |
| `AUDIT_RETENTION_DAYS` | Delete audit rows older than this many days in the cleanup job (unset: keep forever). A value that is not a positive whole number is a startup error |

Secrets: `DATABASE_URL` and the bucket credentials.

## Authentication

Bearer tokens. Every token is a row in the `tokens` table, issued through `POST /tokens` and stored as a SHA-256 hash, never as plaintext. Two roles exist: `api` (ingest and read) and `admin` (everything, including issuing tokens, running jobs and deleting).

Bootstrap the very first admin token with `bin/create-token <name> admin`, run once inside the container or locally against `DATABASE_URL`. Every later token can be issued from the admin console's Tokens page or with `POST /tokens`.

- `POST /tokens` returns the plaintext secret once and never again. Store it then, or issue a new token.
- Revoking is permanent (`POST /tokens/{id}/revoke`). An unknown `token_id` gives 404; revoking an already-revoked token succeeds and does nothing.
- A successful request bumps the token's `last_used_at`, at most once a minute.

## Errors

Errors are `{"detail": ...}` with status 401 (no token), 403 (wrong token or not admin), 404, 409, 422, 502 (archive file unavailable) or 500 (archive integrity failure).
