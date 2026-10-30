# Geraldine Bartolo — Astro migration

Static Astro reproduction of https://www.geraldinebartolo.com/. No CMS or WordPress runtime is needed. Requires Node 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
npm run build
npm run verify
```

## Content and structure

- `src/content/pages/`: local page data and original block markup, plus header/footer HTML.
- `src/content/routes.json`: preserved public routes.
- `src/layouts/SiteLayout.astro`: shared document shell, metadata and navigation runtime.
- `src/components/`: shared header/footer rendering.
- `public/assets/`: self-hosted images, fonts, styles and CV PDF.
- `scripts/import-site.mjs`: repeatable import of the original public site. Running this overwrites migrated content; only re-run deliberately.
- `migration/assets.json`: source-to-local asset mapping. Original HTML snapshots are ignored by Git.

The original block CSS and markup are deliberately retained for visual fidelity. Content reads happen only at build time and can later be replaced by a CMS adapter. A future structured content refactor should preserve a screenshot baseline before altering the block markup.

## Hosting

Vercel: framework Astro, build `npm run build`, output `dist`. No environment variables required. Connect the GitHub repository for automatic deployments. The canonical site URL remains the existing domain; domain/DNS cutover is separate from deploying the Vercel preview.

## Migration details

All primary navigation routes and sitemap-listed legacy routes are imported. Original page titles, descriptions, canonical URLs and responsive theme CSS are retained. Original malformed email links are corrected. Analytics and WordPress service/REST discovery, image lazy-loading runtime, and comment submission are removed. Images use native browser loading; no live WordPress asset requests are required.

The original Jetpack CDN stylesheet returns an error and is excluded; the page-specific block CSS is retained. Legacy comments and any WordPress-only admin workflows are static content, not a new backend.
