---
title: Admin console setup
description: What the admin console is, how it is built, and how to install and configure it.
---

The admin console for the gateway lets you review and approve schema proposals, browse tables and objects, filter typed tables, register schemas, run and tune the archive, and issue and revoke API tokens.

It is PHP 8.3 with Laravel 13, the official Livewire starter kit (Fortify, Flux UI, Livewire) and its own small PostgreSQL database.

## How it works

- It talks **only to the gateway's HTTP API**, with an admin token, through one class (`app/Services/Gateway/GatewayClient.php`). It never touches the gateway's database, so anything the console does, `curl` can do too.
- Its **own database** holds only accounts, password-reset tokens, passkeys and its audit table. It should be a separate database and user, even if it shares a Postgres server with the gateway. Sessions are an encrypted cookie, not a database table.
- **Pages**: overview with scan, proposals (detail, edit, approve, reject), tables (columns, schema, versions, filtered rows), register a schema (record or bulk table), objects, archive (per-table hot days, run now, recent runs), API tokens, audit, a static API reference at `/api-docs`, and account settings.
- A **request log bar** at the bottom of every page lists every call the console made to the gateway in this session: method, path, status, timing, bodies and the `traceparent` ids. It is per-session, capped at 30 entries, and never shows the admin token or a download link.
- Every gateway call carries a `traceparent` header: one trace id per incoming admin request and a fresh span id per call. The gateway logs the console's span as `parent_span_id`.

## Configuration

| Setting | |
| --- | --- |
| `APP_KEY` (secret) | `php artisan key:generate --show` |
| `DB_URL` (secret) | The console's own Postgres connection string, e.g. `postgres://crowpond_admin:<password>@db-host:5432/crowpond_admin`. Create a separate database and user manually: `CREATE DATABASE crowpond_admin; CREATE USER crowpond_admin WITH PASSWORD '...'; GRANT ALL ON DATABASE crowpond_admin TO crowpond_admin;` |
| `GATEWAY_URL` | Base URL the console uses to reach the gateway |
| `GATEWAY_PUBLIC_URL` | Base URL shown in `/api-docs` examples; only set it if it differs from `GATEWAY_URL` |
| `GATEWAY_ADMIN_TOKEN` (secret) | An admin token for the gateway |
| `AUDIT_RETENTION_DAYS` | Days `admin:prune-audit` keeps audit rows; unset or 0 keeps them forever |
| `GATEWAY_TIMEOUT`, `GATEWAY_LONG_TIMEOUT` | Seconds; the long one is for "run archive now" (default 900) |

Session, logging and cache settings are in `.env.example` and the production defaults on the [deployment page](/docs/admin/deployment/).

## Install and run locally

```sh
composer install
npm install && npm run build       # Flux UI + Tailwind assets (npm run dev for HMR)
cp .env.example .env && php artisan key:generate
# for local use set APP_ENV=local, SESSION_SECURE_COOKIE=false, DB_* (or DB_CONNECTION=sqlite),
# GATEWAY_URL, GATEWAY_ADMIN_TOKEN
php artisan migrate
php artisan admin:create-user
php artisan serve
vendor/bin/pest
```

The tests fake the gateway's responses and use an in-memory SQLite database; they need neither the real Postgres database nor a built frontend.

## Security notes

Every page sets a strict Content-Security-Policy (same-origin only, no framing, per-request nonce for scripts and styles). `script-src` includes `'unsafe-eval'` because Livewire's Alpine needs it; that is the one weakening. Table names, object ids and statuses are validated before they enter a URL.
