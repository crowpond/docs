---
title: Token access restrictions
description: Limit an API token to certain owners and labels, for writing and for reading.
---

By default every `api` token can write and read everything. A token can be **restricted** so that it only writes under certain owners, and only reads records with certain owners and labels. This is how you hand a producer an ingest-only token, or give a partner read access to the open part of the data.

Admin tokens are never restricted. The three lists below are rejected for an admin token (`422`).

## The three lists

All three are optional lists of patterns, set when the token is created.

| List | Limits |
| --- | --- |
| `write_owners` | The `owner` values the token may supply when it writes objects or records |
| `read_owners` | The owners whose records the token may read |
| `read_labels` | The [labels](/docs/concepts/labels-and-binding/) the token may read, written as `POLICY/CLASSIFICATION` patterns |

- **Omitted or `null`: unrestricted.** Every token issued before this feature has `null` in all three lists and behaves exactly as before.
- **An empty list `[]`: nothing allowed.** A token with `"read_owners": []` can read nothing.
- **Patterns:** a list holds any number of patterns, and access is granted if **any** pattern matches. `*` is the only wildcard and matches any run of characters, including none. The whole value must match.

| Pattern | Matches |
| --- | --- |
| `ais-*` | `ais-norway`, `ais-` and anything else starting with `ais-` |
| `PUBLIC/UNMARKED` | exactly that label |
| `NATO/*` | any classification under the `NATO` policy |
| `*` | everything |

The write and read lists are independent: being allowed to write an owner does **not** let the token read it back. A record is readable only if **both** its owner and its label pass; the two lists are combined with AND.

## Creating a restricted token

With the API, give the lists as arrays of strings in [`POST /tokens`](/docs/api-reference/operations/createtoken/):

```sh
curl -X POST https://gateway.example.com/tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name": "ais-ingest", "role": "api", "write_owners": ["ais-*"], "read_owners": [], "read_labels": []}'
```

The response and [`GET /tokens`](/docs/api-reference/operations/listtokens/) always include the three fields, `null` when unrestricted.

With the bootstrap script, repeat the flags for several patterns:

```sh
bin/create-token ais-ingest api --write-owner 'ais-*'
bin/create-token multi api --write-owner ais-norway --write-owner ais-sweden --read-owner 'ais-*' --read-label 'PUBLIC/*'
```

In the admin console, see [Gateway API tokens](/docs/admin/users/#gateway-api-tokens).

## Worked examples

**A write-only ingest token.** A producer that posts AIS data and never needs to read it back:

```json
{"name": "ais-ingest", "role": "api", "write_owners": ["ais-*"], "read_owners": [], "read_labels": []}
```

It can write records and objects whose owner starts with `ais-`. Writing any other owner gives `403`. Every read comes back empty or `404`, so a leaked token cannot be used to download the data.

**A read-only partner token limited to PUBLIC labels.** A partner who may see open data from one owner and nothing else:

```json
{"name": "partner", "role": "api", "write_owners": [], "read_owners": ["ais-norway"], "read_labels": ["PUBLIC/*"]}
```

The partner sees only records owned by `ais-norway` **and** labelled under `PUBLIC`. A `NATO/RESTRICTED` record from the same owner is invisible to them, as is a `PUBLIC` record from another owner. The empty `write_owners` means they cannot write.

**A multi-owner token.** A gateway client that feeds two sources and reads them back, but only those:

```json
{"name": "norway-sweden", "role": "api",
 "write_owners": ["ais-norway", "ais-sweden"],
 "read_owners": ["ais-norway", "ais-sweden"],
 "read_labels": ["*"]}
```

## What a restricted token sees

| Request | Result for something the token may not use |
| --- | --- |
| Write an object or record with a disallowed `owner` | `403` |
| Write to a [bulk table](/docs/concepts/tables/) whose fixed owner is not in `write_owners` | `403`, even if the caller leaves `owner` out: the table's owner is what is checked |
| [`GET /objects`](/docs/api-reference/operations/listobjects/), `GET /tables/{table}/rows` (live and archive tiers) | Unreadable records are **silently left out**. Pagination stays correct: pages are filled from the readable records only |
| Read a single object the token cannot read | `404`, the same as for an id that does not exist. Existence is not revealed |
| Commit an object (or upload its file) whose owner is not in `write_owners` | `403`. These are write operations: they depend on `write_owners`, not on read access |
| A bulk table whose owner or label the token cannot read | `404` on its rows, as if the table did not exist |
| Row counts and statistics in `GET /tables` | The table is still listed, but its counts and dates (`rows`, `hot_rows`, `archived_rows`, `archive_files`, `oldest`, `newest`, `archived_through`) are `null` unless the token can see the table in full |

## Details that can catch you out

- **A write-only token works end to end.** A token that may write an owner but not read it can create an object, upload its file and commit it. It then gets `404` if it tries to read the object back, and its lists come back empty. Deleting objects is admin-only and unaffected by these lists.
- **Filtering is by owner and label, not by who wrote.** A restriction decides what a token can see; it does not track which token created a record.
- **Counts that leak.** A table the token cannot fully see shows no row counts or dates, because a count over the whole table would reveal how much data is hidden. A token that can see only part of a table cannot see that table's statistics. The `files` count and size are limited to the files the token can see.
- **A bulk table has one owner and one label.** It is either visible to a token or not; there is no partial view.
- **Case matters for owners, not for labels.** Owner patterns are matched against the stored owner exactly as written: `Ais-*` does not match `ais-norway`. Label patterns are converted to uppercase when the token is created, to match how label policy and classification are stored.
- **Restrictions are fixed at creation.** To change them, issue a new token and [revoke](/docs/gateway/configuration/#authentication) the old one.
- **Not a substitute for TLS or secret handling.** A restricted token is still a bearer secret.

## Choosing restrictions

- Start from what the client must do. A producer needs `write_owners` for its own owners; a consumer needs `read_owners` and `read_labels`.
- Give every client its own token, so a leak can be revoked without touching the others.
- Prefer a narrow pattern (`ais-norway`) over `ais-*`, and `*` only deliberately. Use `[]` rather than `*` for a direction the client does not use.
- For read tokens, set **both** lists. `read_owners` alone still lets any label from those owners through, and `read_labels` alone lets those labels through from any owner.
- Keep the label list short and positive: name the labels a client may read instead of trying to exclude others. There is no negation.
- Test with the restricted token before handing it over: list the objects, expect only the allowed ones, and try a forbidden write.
