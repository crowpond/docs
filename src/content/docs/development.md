---
title: Development
description: Running the gateway and the admin console from source, and their test suites.
---

The applications live in their own repositories: [crowpond/gateway](https://github.com/crowpond/gateway) and [crowpond/admin](https://github.com/crowpond/admin). Each has a GitHub Actions workflow that runs the tests on every push and pull request and, on `main` and version tags, builds and publishes the image to `ghcr.io/crowpond/<name>` for amd64 and arm64.

## Gateway

Requirements: PHP 8.3 with `pdo_pgsql`, `ffi` and `curl`, Composer, PostgreSQL 16, and `libduckdb.so` from a [DuckDB release](https://github.com/duckdb/duckdb/releases) (CI uses the version pinned in the Dockerfile).

```sh
composer install
export DATABASE_URL=... DUCKDB_LIB=/path/to/libduckdb.so
php bin/migrate                                    # creates and updates the tables; safe to repeat
php -d ffi.enable=1 -S 127.0.0.1:8080 -t public    # development server
php -d ffi.enable=1 bin/archive                    # run the archive job once
php bin/cleanup                                    # delete files past their retention
```

Tests use [Pest](https://pestphp.com) and need a scratch PostgreSQL whose tables they **drop**. They skip if `GATEWAY_TEST_DSN` is unset:

```sh
docker run -d --rm -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gwtest postgres:16
GATEWAY_TEST_DSN="host=127.0.0.1 port=5433 user=postgres password=postgres dbname=gwtest" \
  DUCKDB_LIB=/path/to/libduckdb.so php -d ffi.enable=1 vendor/bin/pest
```

`openapi.json` in the gateway repository is edited by hand. `tests/OpenApiTest.php` needs no database and keeps it in step with the routes: change a route and the spec together. This site takes a pinned copy of it, see the [docs README](https://github.com/crowpond/docs#api-reference).

## Admin console

```sh
composer install
npm install && npm run build       # Flux UI and Tailwind assets (npm run dev for HMR)
cp .env.example .env && php artisan key:generate
# for local use set APP_ENV=local, SESSION_SECURE_COOKIE=false, DB_* (or DB_CONNECTION=sqlite),
# GATEWAY_URL and GATEWAY_ADMIN_TOKEN
php artisan migrate
php artisan admin:create-user
php artisan serve
vendor/bin/pest
```

The tests fake the gateway's responses and use an in-memory SQLite database; they need neither a real PostgreSQL nor a built frontend. One test fails if `.env.example` drifts from the locked-down session values. CI also runs `npm ci && npm run build`, because the Dockerfile needs that step to succeed.

## Images

Both images are built from the Dockerfile in the repository: `docker build -t crowpond-gateway .` and `docker build -t crowpond-admin .`. The gateway image pins the DuckDB library version in a build argument; the admin image builds the frontend in a Node stage.

## This documentation

Astro with Starlight; content is Markdown and MDX in `src/content/docs/`. See the [repository README](https://github.com/crowpond/docs).
