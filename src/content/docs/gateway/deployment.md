---
title: Gateway deployment
description: Running the gateway image with Docker or on Fly.io.
---

:::tip[Step-by-step guides]
This page is the reference for the image. For complete walk-throughs with a Compose file, `fly.toml` examples and a Portainer stack, see [Installation](/docs/installation/).
:::

The image is published to `ghcr.io/crowpond/gateway` (amd64 and arm64) by the repository's CI. `latest` follows `main`; version tags (`v1.2.3`) give `1.2.3` and `1.2`. To build it yourself, run `docker build -t crowpond-gateway .` in the gateway repository.

It is FrankenPHP serving `public/` on port 8080. On start it runs `bin/migrate` (idempotent, advisory-locked) and then the server. `GET /healthz` is the health check, and the image declares a `HEALTHCHECK` for it.

## You provide

- **PostgreSQL 16** and an **S3-compatible bucket**.
- The environment from [Configuration](/docs/gateway/configuration/): at least `DATABASE_URL`, and the bucket variables if you want files and the archive.
- **TLS**: the container speaks plain HTTP on 8080.
- **A scheduler** for the archive job, and for the [cleanup job](/docs/gateway/cleanup-job/) if any file is created with `retention_days`.
- At least 512 MB of memory; the archive job needs about 180 MB of working memory on top of the app.

```sh
docker run -d --name crowpond-gateway -p 8080:8080 \
  -e DATABASE_URL=... \
  -e BUCKET_NAME=... -e AWS_ENDPOINT_URL_S3=... -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... \
  ghcr.io/crowpond/gateway:latest
```

The same image and variables work in Docker Compose, Portainer stacks and Kubernetes.

## Scheduling the archive

```sh
docker run --rm <same env> ghcr.io/crowpond/gateway php bin/archive
```

or call [`POST /archive/run`](/docs/api-reference/operations/runarchive/) with an admin token. See [Tiers and the archive](/docs/concepts/tiers-and-archive/).

## On Fly.io

Create a `fly.toml` (keep it out of version control, it is specific to your instance) and deploy. Fly's machine runtime starts the container as root regardless of `USER`, which is why the image's entrypoint drops to `www-data` itself.

```toml
app = 'your-app-name'
primary_region = 'arn'

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

  [[http_service.checks]]
    grace_period = '10s'
    interval = '30s'
    method = 'GET'
    path = '/healthz'
    timeout = '5s'

[[vm]]
  size = 'shared-cpu-1x'
  memory = '512mb'
```

```sh
fly storage create                  # sets BUCKET_NAME and the AWS_* secrets
fly secrets set DATABASE_URL=...
fly deploy
fly certs add api.example.com       # then point DNS as `fly certs` instructs
fly machine run . --schedule daily php bin/archive   # with the same secrets
fly machine run . --schedule daily php bin/cleanup   # likewise, for retention
```

## Local development

Requirements: PHP 8.3 with `pdo_pgsql`, `ffi` and `curl`, Composer, PostgreSQL 16, and `libduckdb.so` from a [DuckDB release](https://github.com/duckdb/duckdb/releases).

```sh
composer install
export DATABASE_URL=... DUCKDB_LIB=/path/to/libduckdb.so
php bin/migrate
php -d ffi.enable=1 -S 127.0.0.1:8080 -t public
```

The tests need a scratch PostgreSQL whose tables they drop, and skip if `GATEWAY_TEST_DSN` is unset:

```sh
GATEWAY_TEST_DSN="host=... port=... user=... dbname=gwtest" DUCKDB_LIB=... php -d ffi.enable=1 vendor/bin/pest
```
