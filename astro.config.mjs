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
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        alt: 'crowpond',
      },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/custom.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/crowpond' },
      ],
      editLink: { baseUrl: 'https://github.com/crowpond/docs/edit/main/' },
      lastUpdated: true,
      sidebar: [
        {
          label: 'Start here',
          items: [
            { slug: 'getting-started' },
            { slug: 'concepts/overview', badge: { text: 'New', variant: 'tip' } },
          ],
        },
        {
          label: 'Installation',
          items: [
            { slug: 'installation' },
            { slug: 'installation/docker' },
            { slug: 'installation/fly' },
            { slug: 'installation/portainer' },
            { slug: 'installation/upgrades-and-backups' },
          ],
        },
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
            { slug: 'gateway/api' },
            { slug: 'gateway/configuration' },
            { slug: 'gateway/deployment' },
            { slug: 'gateway/cleanup-job' },
            { slug: 'gateway/limits' },
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
        {
          label: 'Operate and develop',
          items: [
            { slug: 'operations' },
            { slug: 'development' },
          ],
        },
        ...openAPISidebarGroups,
      ],
    }),
  ],
});
