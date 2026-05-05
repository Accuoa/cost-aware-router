# landing-template

Astro+Tailwind landing-page template. Each per-idea project repo will fork
this template (via `tools/scaffold`) and replace `src/content.example.json`
with the project's real content.

## Local dev

- `npm install`
- `npm run dev` (http://localhost:4321/)
- `npm run build` (writes to dist/)
- `npm test` (cheerio assertions on the built HTML)

## Deploy (per project repo)

GitHub Pages deploys automatically on push to `main` via `.github/workflows/pages.yml`.
The workflow sets `ASTRO_SITE` and `ASTRO_BASE` env vars derived from the repo
owner and name, so the same template lives at `accuoa.github.io/<repo>` without
manual config.

## Customizing per project

The scaffolding script (`tools/scaffold`) generates each per-idea repo and
replaces `src/content.example.json` with the project's content. The schema
in `src/content/config.ts` is the contract — content that doesn't validate
against the Zod schema fails the build.
