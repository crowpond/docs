---
title: Getting started
description: What crowpond is and how to run the gateway and admin console.
---

crowpond is an open source datalake. It consists of two applications, each published as a container image:

| Application | Image | Repository |
| --- | --- | --- |
| Gateway | `ghcr.io/crowpond/gateway` | [crowpond/gateway](https://github.com/crowpond/gateway) |
| Admin console | `ghcr.io/crowpond/admin` | [crowpond/admin](https://github.com/crowpond/admin) |

Both images are built for amd64 and arm64. `latest` follows `main`; version tags such as `v1.2.3` give the tags `1.2.3` and `1.2`.

The gateway is a generic ingest and retrieval API for any kind of data: JSON records, images, video, streams. Callers say what the data is (owner, source, classification, metadata); the gateway stores it, returns an object ID (plus an upload URL for files) and serves it back. Every object carries a STANAG 4774 label bound to it per STANAG 4778 (see [Labels and binding](/docs/concepts/labels-and-binding/)).

## What you need to provide

- **PostgreSQL 16** for the gateway's live data. It is not part of crowpond.
- An **S3-compatible bucket** for files and the Parquet archive. Without one, file endpoints return 503 and nothing is archived.
- **TLS**: the containers speak plain HTTP on port 8080, so put a reverse proxy or load balancer in front.
- **A scheduler** for the archive job and, if you use file retention, the cleanup job. Nothing in the gateway runs on a timer.
- For the admin console, a **second PostgreSQL database** (separate database and user) for its own accounts.

## Run the gateway

```sh
docker run -d --name crowpond-gateway -p 8080:8080 \
  -e DATABASE_URL=... \
  -e BUCKET_NAME=... -e AWS_ENDPOINT_URL_S3=... \
  -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... \
  ghcr.io/crowpond/gateway:latest
```

On start the container runs `bin/migrate` (idempotent) and then the server. `GET /healthz` is the health check.

Every request except `/healthz` needs a bearer token. Create the first admin token inside the container:

```sh
docker exec crowpond-gateway php bin/create-token my-admin admin
```

Every later token can be issued from the admin console's Tokens page, or with `POST /tokens` using an admin token. See [Gateway configuration](/docs/gateway/configuration/) and [Gateway deployment](/docs/gateway/deployment/).

## Run the admin console

Set it up as described in [Admin console setup](/docs/admin/setup/) and [Admin console deployment](/docs/admin/deployment/). In short: give it its own database, the gateway's URL and an admin token, run the migrations, then create a user with `php artisan admin:create-user`.

## Next

- [Objects](/docs/concepts/objects/): records versus files.
- [Tables](/docs/concepts/tables/): typed tables, proposals and bulk tables.
- [API reference](/docs/api-reference/).
