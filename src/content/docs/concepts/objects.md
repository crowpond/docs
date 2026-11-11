---
title: "Objects: records and files"
description: The two kinds of object the gateway stores and how the catalog tracks them.
---

Everything ingested through `POST /objects` is an **object**. The `objects` table is the catalog, with one row per object: id (UUIDv7), owner, source, content type, label, kind, schema, storage location, tier and a SHA-256 digest of the canonical JSON or of the file bytes.

## Records

A record is a JSON payload. New records land in PostgreSQL and, after the table's hot window, are archived to Parquet (see [Tiers and archive](/docs/concepts/tiers-and-archive/)). Where a record goes:

1. A caller can name a **registered schema** (a JSON Schema bound to a typed table). The payload is validated and written to that table; invalid payloads are rejected with 422.
2. Without a name, a payload that closely matches an **approved** table (80% field overlap, and valid) is routed there automatically.
3. Everything else goes to the `generic` table as `jsonb`.

Records are immutable once archived. A record that is already archived cannot be deleted (409).

## Files

Files (images, video, Parquet and so on) never pass through the gateway:

1. `POST /objects` with a file description returns a presigned upload URL.
2. The client uploads the bytes to the bucket.
3. `POST /objects/{id}/commit` checks size and SHA-256. Only then does the file become downloadable.

Files have no tiering: the catalog's `tier` is `null` and they stay in the bucket as uploaded. A file can be given a lifetime, see [Retention and cleanup](/docs/concepts/retention-and-cleanup/).

## Reading

`GET /objects/{id}` returns the catalog row and the payload (or a download URL for a committed file).

`GET /objects` lists catalog rows without payloads. Filters:

- `source`, `owner`, `kind` (`record` or `file`), `schema`, `table`
- `created_from` (inclusive) and `created_to` (exclusive)
- `after` and `limit`: keyset pagination; pass the response's `next` as `after`
- `metadata.<key>[.<op>]=<value>`: text comparison against the object's `metadata`. `op` is one of `eq ne in null prefix contains`, default `eq`. Unknown keys or operators give 422.

Metadata filtering only sees the live catalog row, not the payload, so it works the same whether the object is hot or archived.

## Deleting

`DELETE /objects/{id}` (admin token) removes one object now: a file (bucket object and catalog row) or a record still in PostgreSQL. Bulk-table records have no catalog row and cannot be deleted individually.
