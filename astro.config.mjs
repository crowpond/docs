// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

// Served from https://crowpond.github.io/docs/ on GitHub Pages.
// For a custom domain later: set `site` to it and `base` to '/'.
export default defineConfig({
  site: 'https://crowpond.github.io',
  base: '/docs',
  integrations: [
    starlight({
      // The API reference is generated from the gateway's OpenAPI description (see README, "API reference").
      plugins: [
        starlightOpenAPI([{ base: 'api-reference', label: 'API reference', schema: './openapi/gateway.json' }]),
      ],
      title: 'crowpond',
      description: 'Documentation for crowpond, an open source datalake: gateway and admin console.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/crowpond' }],
      sidebar: [
        { label: 'Getting started', slug: 'getting-started' },
        {
          label: 'Concepts',
          items: [
            { slug: 'concepts/objects' },
            { slug: 'concepts/tables' },
            { slug: 'concepts/tiers-and-archive' },
            { slug: 'concepts/retention-and-cleanup' },
            { slug: 'concepts/labels-and-binding' },
            { slug: 'concepts/audit-log' },
            { slug: 'concepts/logging-and-tracing' },
          ],
        },
        {
          label: 'Gateway',
          items: [
            { slug: 'gateway/configuration' },
            { slug: 'gateway/deployment' },
            { slug: 'gateway/cleanup-job' },
          ],
        },
        {
          label: 'Admin console',
          items: [
            { slug: 'admin/setup' },
            { slug: 'admin/users' },
            { slug: 'admin/deployment' },
            { slug: 'admin/audit' },
          ],
        },
        { label: 'Operations', slug: 'operations' },
        ...openAPISidebarGroups,
      ],
    }),
  ],
});
