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

### Restricting an `api` token

For an `api` token the form has three restriction fields, each with a **No restriction** toggle and a multi-value input: **Write owners**, **Read owners** and **Read labels** (as `POLICY/CLASS` patterns, `*` as wildcard, for example `ais-*` or `PUBLIC/*`). Type a value and press Enter to add it. The fields are not shown for an `admin` token, which is never restricted.

- Toggle on (the default): no restriction, the token behaves as before.
- Toggle off with entries: only values matching one of the patterns are allowed.
- Toggle off with **zero entries**: **nothing is allowed** in that direction. The form shows a warning, because it is easy to do by accident: a token with an empty write list cannot write, and one with an empty read list cannot read.

Restrictions are set when the token is created; issue a new token to change them. See [Token access restrictions](/docs/concepts/access-control/) for the matching rules and examples.

The console's own `GATEWAY_ADMIN_TOKEN` is one of these tokens. Revoking it from the console would lock the console out.

## Label policies

The console's **Label policies** page (`/label-policies`) lists the gateway's built-in (`PUBLIC`, `NATO`) and registered [label policies](/docs/concepts/labels-and-binding/#label-policies), registers a new one (identifier, optional URI, classifications one per line from lowest to highest, optional description) and deletes a registered policy the gateway reports as unused. The bulk-table form on **Register a schema** offers the registered policies and their classifications for the table's label. A `NATO` label implies NATO ownership and must not be used for open data.

## Downloading files

For an object that is a file, the object page shows the file name (when the metadata has one), content type, size and SHA-256, with a **Download** button. The button opens a short-lived link that the gateway issues for each read, and the browser downloads straight from the file store: the file does not pass through the console. If the link has expired, press "Refresh link". A file that is still pending upload, or expired or deleted, has no download. The console never stores the link: the request log bar and the audit table keep only the part before the `?`.

## Why passkeys pin Symfony versions

Fortify's passkey support depends on `laravel/passkeys`, which pulls in Symfony components whose newest releases need PHP 8.4, while the console runs on PHP 8.3. `composer.json` pins `symfony/property-access`, `symfony/property-info`, `symfony/serializer`, `symfony/string` and `symfony/type-info` to PHP 8.3-compatible releases. If the app moves to PHP 8.4, the pins can go.
