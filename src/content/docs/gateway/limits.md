---
title: Limits and security notes
description: What the gateway does not do, and what to know before relying on it.
---

## Security

- **Tokens** are stored as SHA-256 hashes. The plaintext is shown once at creation. There are two roles, `api` and `admin`; there is no per-table or per-label scope.
- **The label is metadata only.** Only `PUBLIC` / `UNMARKED` is accepted, and nothing enforces access by label.
- **Not signed.** Bindings carry a digest but no `ds:Signature`. The archive binding has the structure of one that was validated against the ADatP-4778 XSD in another tool, but the gateway's own output has not been validated.
- **Logs and audit** never contain request bodies, payloads, query strings, bearer tokens or presigned URLs, but a `detail` message can quote a value a database rejected. Treat logs as sensitive.
- **Append-only audit** is enforced by the application only; grant the database role no `UPDATE` on `audit_log` to enforce it in the database too. Tamper detection (hash chaining) is not built.
- **TLS** is not terminated by the container. Put a proxy or load balancer in front.
- Table and column names come only from registered schemas and are validated as SQL identifiers; payload keys never become identifiers unvalidated.

## Data

- **Records are immutable once archived.** Deleting an archived record would need a Parquet rewrite and is not built. `DELETE /objects/{id}` gives 409.
- **Do not put a bucket lifecycle rule on `archive/`.** It would delete archive files behind the catalog's back.
- **Record tables keep one catalog row per record forever.** Use a bulk table for high-rate streams. Bulk records have no per-record digest, metadata or label and cannot be deleted individually.
- **Only `created_at` is indexed.** Give a time range when reading large tables.
- **Reads of the archive are bounded:** at most 31 archive files are opened per request, so follow `next` until it is `null` even on a short page.
- **A cache miss downloads a whole hourly file** (a few MB). The cache is per machine and starts empty after a restart.
- **Single file uploads** are one presigned PUT: 1 byte to 5 GiB.
- **Bulk batches** hold 1 to 1,000 records, all or nothing.
- **Cleanup** deletes at most 500 files per run.

## Resources

- At least 512 MB of memory; the archive job needs about 180 MB on top of the app.
- Two archive runs cannot overlap; a second one reports `skipped`.
