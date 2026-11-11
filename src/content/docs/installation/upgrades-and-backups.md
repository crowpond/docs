---
title: Upgrades and backups
description: Moving to new image versions and what to back up.
---

## Upgrading

1. **Read the release notes** of the gateway and admin repositories, and pin version tags (`ghcr.io/crowpond/gateway:1.2`) in production instead of `latest`, so a restart never changes the version by surprise.
2. **Back up PostgreSQL** first (see below).
3. **Pull the new images and recreate the containers**: `docker compose pull && docker compose up -d`, Portainer's *Re-pull image and redeploy*, or `fly deploy --image ghcr.io/crowpond/gateway:<tag>`.
4. **Gateway:** nothing else to do. It runs `bin/migrate` when it starts (idempotent, advisory-locked, so several containers starting together are safe).
5. **Admin console:** run `php artisan migrate --force` after every upgrade that adds a migration. It never migrates on start.
6. **Scheduled machines** (Fly): update them to the new image as well.

Upgrade the gateway before the console. The console copes with an older gateway that lacks an endpoint (the audit page, for example, shows a notice instead of failing), but a new console may use calls an old gateway does not have.

## Backups

crowpond does not back anything up. What to protect:

| What | Where | How |
| --- | --- | --- |
| Gateway database | PostgreSQL | `pg_dump -Fc` on a schedule, or physical backups with WAL archiving. It holds the catalog, hot data, schemas, tokens (hashed) and the audit log. |
| Archive and files | the bucket | Versioning or replication in your S3 service. The catalog points at these files, so keep the database and bucket backups close in time. |
| Console database | PostgreSQL | `pg_dump -Fc crowpond_admin`. Accounts, passkeys and the console audit trail. |
| `APP_KEY` | your secret store | It encrypts sessions and stored two-factor secrets. Lose it and every user must log in again and set up two-factor again. |

With Compose:

```sh
docker compose exec -T postgres pg_dump -U crowpond -Fc gateway > gateway-$(date +%F).dump
docker compose exec -T postgres pg_dump -U crowpond -Fc crowpond_admin > admin-$(date +%F).dump
```

Restore into an empty database with `pg_restore -d <database> <dump>`.

<br />

Two cautions:

- Do not set a bucket **lifecycle rule** on `archive/`: it would delete archive files behind the catalog's back. Expire files with `retention_days` and the cleanup job instead.
- Archived records exist only as Parquet in the bucket once their partition is dropped from PostgreSQL. A database restore from before an archive run therefore leaves archive files in the bucket that the restored catalog does not know about; a bucket restore without the database leaves the catalog pointing at missing files (reads of those days return 502).

Verify a restore by reading a table that spans the archive boundary and checking the response has no 500 or 502.
