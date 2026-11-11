---
title: Admin console deployment
description: Running the admin image, with manual migrations, on Docker or Fly.io.
---

The image is published to `ghcr.io/crowpond/admin` (amd64 and arm64) by the repository's CI: `latest` follows `main`, and version tags (`v1.2.3`) give `1.2.3` and `1.2`. To build it yourself, run `docker build -t crowpond-admin .`.

It is FrankenPHP serving `public/` on port 8080, built in two stages: a Node stage compiles the Vite, Tailwind and Flux assets into `public/build`, and the PHP stage copies that and the Composer vendor directory in. `GET /up` is the health check, and the image declares a `HEALTHCHECK` for it.

## You provide

- **PostgreSQL** for the console's own accounts (not the gateway's database).
- **TLS**: put a reverse proxy or load balancer in front, and set `APP_URL` to the public `https://` URL.
- The settings from [setup](/docs/admin/setup/#configuration) plus these production defaults:

```
APP_ENV=production                APP_DEBUG=false
APP_URL=https://manage.example.com
LOG_CHANNEL=stderr                LOG_STDERR_FORMATTER=Monolog\Formatter\JsonFormatter
DB_CONNECTION=pgsql               SESSION_DRIVER=cookie        SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true        SESSION_SAME_SITE=strict
CACHE_STORE=file                  QUEUE_CONNECTION=sync        MAIL_MAILER=log
GATEWAY_URL=https://api.example.com
# secrets: APP_KEY, GATEWAY_ADMIN_TOKEN, DB_URL
```

## Migrations are manual

The container does not migrate on start. Run the migrations after the first deploy and after every deploy that adds one:

```sh
docker run -d --name crowpond-admin -p 8080:8080 --env-file admin.env ghcr.io/crowpond/admin:latest
docker exec crowpond-admin php artisan migrate --force
docker exec -it crowpond-admin php artisan admin:create-user
```

The same image and variables work in Docker Compose, Portainer stacks and Kubernetes.

## On Fly.io

Create a `fly.toml` (not committed, it is specific to your instance), put the production defaults under `[env]`, set the secrets with `fly secrets set`, then deploy. As with the gateway, Fly starts the container as root, and the image's entrypoint drops to `www-data` itself.

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
    path = '/up'
    timeout = '5s'

[env]
  # the production defaults from above

[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'
```

```sh
fly secrets set APP_KEY=... GATEWAY_ADMIN_TOKEN=... DB_URL=...
fly deploy
fly certs add manage.example.com    # then point DNS as `fly certs` instructs
fly ssh console -C "php artisan migrate --force"
fly ssh console -C "php artisan admin:create-user"
```
