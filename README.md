# crowpond docs

Documentation site for [crowpond](https://github.com/crowpond), built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build). Published to GitHub Pages at <https://crowpond.github.io/docs/>.

## Run locally

Requires Node 22.23.4 or newer.

```sh
npm ci
npm run dev        # http://localhost:4321/docs/
```

## Build

```sh
npm run build      # output in dist/
npm run preview
```

Content is in `src/content/docs/` (Markdown/MDX); the sidebar is in `astro.config.mjs`.

## Deploy

`.github/workflows/ci.yml` builds on every push and pull request, and deploys to GitHub Pages from `main`. The site is served under the `/docs` base path. For a custom domain, set `site` to it and `base` to `/` in `astro.config.mjs`.

## API reference

The API reference pages under `/docs/api-reference/` are generated at build time by [`starlight-openapi`](https://github.com/HiDeoo/starlight-openapi) from `openapi/gateway.json`, a committed copy of the gateway's `openapi.json` (the same document the gateway serves at `GET /openapi.json`). Nothing in the reference is written by hand; fix the description in the gateway repository instead.

The copy is pinned to one gateway commit in `openapi/spec.lock.json` (commit and sha256), so a build never depends on the network or on whatever is on `main`, and a spec change shows up as a reviewable diff in this repository.

Refresh the spec after the gateway's API changed:

```sh
npm run fetch-spec            # re-download the pinned commit (rarely needed)
npm run fetch-spec -- main    # move the pin to the gateway's current main (or give a commit hash)
git diff openapi/             # review, then commit openapi/gateway.json and openapi/spec.lock.json
```

The gateway repository is private for now, so the download needs a token that can read it: `GITHUB_TOKEN` or `GH_TOKEN`, otherwise the script uses `gh auth token`. Without a token it tries the public raw URL, which works once the repository is public (and then needs a full commit hash). `npm run build` first runs `npm run check-spec`, which fails when `openapi/gateway.json` no longer matches the recorded sha256 (an accidental hand edit), so CI catches that too; it does not fetch anything, so CI needs no access to the gateway repository.

GitHub Pages is not available on private repositories on the free plan. The deploy job runs only when the repository variable `DEPLOY_PAGES` is `true`; enable Pages (Settings, Pages, Source: GitHub Actions) and set the variable once the repository is public or the plan allows it.
