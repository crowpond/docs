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

A placeholder page for now. It will be generated from the gateway's OpenAPI 3.1 description ([crowpond/gateway#5](https://github.com/crowpond/gateway/issues/5)), for example with `starlight-openapi`.

GitHub Pages is not available on private repositories on the free plan. The deploy job runs only when the repository variable `DEPLOY_PAGES` is `true`; enable Pages (Settings, Pages, Source: GitHub Actions) and set the variable once the repository is public or the plan allows it.
