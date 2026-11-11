---
title: Tiers and the archive
description: How records move from PostgreSQL to Parquet files and how reads span both.
---

Records live in two tiers. New records land in PostgreSQL (`hot`). A daily **archive job** moves whole past days to Parquet files in the bucket (`archived`). Reads see both tiers as one table. This applies to records only; files are never tiered.

## The archive job

The job takes every partition older than the table's hot window and, per label and UTC hour, writes:

```
archive/table=<t>/label=<policy>-<class>/date=<YYYY-MM-DD>/hour=<hh>/part-0.parquet
archive/table=<t>/label=<policy>-<class>/date=<YYYY-MM-DD>/hour=<hh>/part-0.parquet.bdo.xml
```

The hot window is `HOT_DAYS` full past days besides today (default 7), and can be overridden per table with `POST /tables/{table}/archive-policy` (admin).

Parquet is zstd-compressed and sorted by `(created_at, object_id)`. Catalog fields are prefixed `_` (`_object_id`, `_created_at`, `_owner`, `_source`, `_label_policy`, `_label_class`, `_digest`, `_schema_version`), followed by the table's own columns and `_extra`. The `generic` table has `_fingerprint`, `_fields` and `_payload` instead.

Each partition is committed atomically. After every file is uploaded and its size checked, one transaction re-counts the partition, registers the files, marks catalog rows archived, advances the table's watermark and drops the partition. Any failure leaves the partition untouched and deletes the uploads. Rows arriving mid-export abort that day, which is retried on the next run. Two runs cannot overlap.

Run it with:

- `php bin/archive` (needs `ffi` enabled and `DUCKDB_LIB`),
- `POST /archive/run[?table=]` with an admin token, or
- the admin console's Archive page.

It needs a scheduler: cron, a scheduled container, or any caller of the endpoint. `GET /archive` shows status.

## Reading archived data

An archive file is downloaded, checked against its registered size and SHA-256, then queried with DuckDB. A digest mismatch gives 500 and no data; a missing file gives 502. Verified files are cached on local disk by hash (`ARCHIVE_CACHE_MB`, default 256, `0` turns it off), evicted least-recently-used and re-hashed on every use. The cache is per machine and starts empty after a restart. Files whose hour lies outside the requested range are never opened.

## Limits

- Deleting an archived record would need a Parquet rewrite and is not built.
- A bucket lifecycle rule would delete archive files behind the catalog's back. Do not set one on `archive/`.
- Record tables keep one catalog row per record forever. Use a bulk table for high-rate streams.
