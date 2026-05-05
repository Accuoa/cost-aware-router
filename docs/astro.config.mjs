import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'http://localhost:4321',
  base: process.env.ASTRO_BASE ?? '/',
  integrations: [tailwind()],
  output: 'static',
});
