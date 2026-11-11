---
title: Labels and binding (STANAG 4774/4778)
description: How every stored object carries a confidentiality label bound to it.
---

Every object carries a confidentiality label, expressed per **STANAG 4774** (confidentiality label syntax) and bound to the data per **STANAG 4778** (binding of metadata to data objects).

## Labels

Only the `PUBLIC` policy with classification `UNMARKED` is accepted. Anything else is rejected, at ingest and again before archiving. The label is metadata only: nothing enforces access by label.

## Binding

- **Stored files in the archive** use a **detached** binding: each Parquet file has a sibling `<file>.bdo.xml` that references it and carries the label and local-use digest attributes (`ar:sha256`, `ar:bytes`, `ar:rows`). The `ar:` attributes are local to crowpond and not part of the standard. The label is on the file, not on each record.
- **Catalog objects** carry the binding as columns on the catalog row.
- **Emitted objects** (API responses) are not bound with a separate file.

The gateway's archive bindings have not been validated against the ADatP-4778 XSD. They are not signed: they carry a digest but no `ds:Signature`.

The standard documents themselves are distributed by NATO under terms that forbid reproducing them, so they are not included here.
