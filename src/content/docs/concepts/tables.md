---
title: Tables, proposals and bulk tables
description: Typed tables, how they are created, and bulk tables for high-rate streams.
---

## Typed tables

A typed table has one column per top-level property of its JSON Schema, plus an `extra jsonb` column for fields without a column. The `generic` table holds everything that matches nothing else.

Tables are created only by an admin, never automatically and never from unvalidated payload keys:

- by **registering a schema** (`POST /schemas`), or
- by **approving a proposal**.

`POST /proposals/scan` clusters similar payloads in `generic` and proposes a table. Approving a proposal creates the table, moves the fitting rows over and turns on routing for that shape. Rejecting it discards the proposal. Schema changes add a new version and can only add columns.

All typed tables are range-partitioned by `created_at`, one partition per UTC day, created on demand.

## Bulk tables

Bulk tables are for high-rate streams (for example vessel positions). Register a schema with `catalog: "table"` to get one. Owner, source and label are fixed for the whole table, and no catalog row is written per record. `POST /tables/{table}/records` ingests up to 1,000 records per call, all or nothing.

Bulk records have no per-record digest, metadata or label, and cannot be deleted individually. They are read with `GET /tables/{table}/rows`, not `/objects`.

## Reading rows

`GET /tables/{table}/rows` reads a typed table across both tiers (see [Tiers and archive](/docs/concepts/tiers-and-archive/)), ordered by `(created_at, object_id)`.

| Parameter | Meaning |
| --- | --- |
| `<column>=<value>` | equals |
| `<column>.<op>=<value>` | `op`: `eq ne gt gte lt lte in null prefix contains` |
| `extra.<key>[.<op>]=<value>` | a field without a column (text comparison) |
| `_source`, `_owner` | catalog filters |
| `_id=<object_id>` | one row |
| `_created_from`, `_created_to` | `created_at` range, from inclusive, to exclusive |
| `_select=a,b` | only these columns |
| `_order=asc\|desc`, `_after=<cursor>`, `_limit=<1..1000>` | ordering and keyset pagination; pass the response's `next` as `_after` |

Operators are checked against the column type. Bad values, unknown columns and unknown parameters give 422, so a typo never returns everything. Timestamps without an offset are UTC. `contains` is case-insensitive, and `%` and `_` are literal.

Each item has `object_id`, `created_at`, `owner`, `source`, `label`, `digest_sha256`, `schema_version`, `data` (the columns) and `extra`.

Things to know:

- Only `created_at` is indexed. Give a time range on big tables.
- Files written under an older schema version read the missing columns as `NULL`.
- At most 31 archive files are opened per request, so a page can be short and still carry `next`. Follow `next` until it is `null`.
