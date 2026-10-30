import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://www.geraldinebartolo.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
