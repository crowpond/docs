---
title: Creating users and logging in
description: Accounts, authentication and the absence of self-service registration.
---

Accounts are rows in the console's database, authenticated through [Laravel Fortify](https://laravel.com/docs/fortify): email and password, with optional two-factor authentication (TOTP) and passkeys (WebAuthn).

There is **no self-service registration**. Create an account with:

```sh
php artisan admin:create-user
```

It prompts for name, email and password, and marks the email as verified immediately, since there is no mail service to deliver a verification link.

## Behaviour to know

- Logins are throttled to 5 attempts per minute per email and address.
- Sessions last 8 hours and are encrypted, `HttpOnly`, `Secure` and `SameSite=Strict`. State-changing requests are CSRF-protected.
- Password reset and email verification links are **logged, not delivered** (`MAIL_MAILER=log`). Use `admin:create-user` for day-to-day account creation.
- There are no roles: anyone who can log in can do everything the console's admin token can.

## Gateway API tokens

The console's **Tokens** page (`/tokens`) issues and revokes the gateway's per-client bearer tokens. Pick a name and a role (`api` or `admin`); the gateway returns the plaintext secret once, so copy it immediately. Revoking is immediate and permanent; the row stays with `revoked_at` set, so the list keeps a history. `created_by` is set to the logged-in user's email.

The console's own `GATEWAY_ADMIN_TOKEN` can be one of these issued tokens. Since that would let the console revoke the token it authenticates with, switching to one is a deliberate, manual step.

## Why passkeys pin Symfony versions

Fortify's passkey support depends on `laravel/passkeys`, which pulls in Symfony components whose newest releases need PHP 8.4, while the console runs on PHP 8.3. `composer.json` pins `symfony/property-access`, `symfony/property-info`, `symfony/serializer`, `symfony/string` and `symfony/type-info` to PHP 8.3-compatible releases. If the app moves to PHP 8.4, the pins can go.
