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

Content is in `src/content/docs/` (Markdown/MDX); the sidebar is in `astro.config.mjs`. `npm run check-links` (run after a build, and in CI) verifies that every internal link and anchor in `dist/` resolves.

## Structure

- `src/content/docs/`: pages. `installation/` (Docker, Fly.io, Portainer guides), `concepts/`, `gateway/`, `admin/`, `operations.md`, `development.md`. The API reference is generated (see below).
- `src/components/diagrams/`: the diagrams as inline-SVG Astro components (architecture, lifecycle, read path, deployment topology). They are coloured with the `--d-*` CSS variables in `src/styles/custom.css`, so they follow the light/dark theme switch, and carry `<title>`/`<desc>` for screen readers. Embed one in an `.mdx` page with `import Architecture from '../../components/diagrams/Architecture.astro'`.
- `src/styles/custom.css`: theme (palette from the identity sketch: night ink `#0F1C26`, pond teal `#3A8791`, amber `#E9B44C`, ice `#E3EDF0`; Bricolage Grotesque and IBM Plex Mono, self-hosted from `@fontsource`, no CDN).
- `src/assets/`: logo (one-colour mark, light and dark files) and the landing page hero scene.

Last-updated dates come from git history, so CI checks out the full history.

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
