# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Online gaming platform (Arcade Vault) — players compete for points. Uses Spec Driven Design via `/spec` and `/spec-impl` skills.

## Commands

```bash
npm run dev      # dev server (Turbopack, http://localhost:3000)
npm run build    # production build (also Turbopack)
npm run start    # start production server
npm run lint     # ESLint (flat config, eslint.config.mjs)
```

No test runner configured yet.

## Stack

- **Next.js 16.2.6** — App Router, Turbopack default, React 19.2
- **Tailwind CSS v4** — PostCSS plugin (`@tailwindcss/postcss`)
- **TypeScript 5**

## Next.js 16 Breaking Changes

This version has significant API changes from v15. Key differences:

**Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are now **Promise-only** (sync access removed). Always `await` them:
```tsx
export default async function Page({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params
  const query = await searchParams
}
```
Run `npx next typegen` to generate `PageProps`/`LayoutProps`/`RouteContext` helpers.

**proxy instead of middleware** — rename `middleware.ts` → `proxy.ts`, export `proxy` function (not `middleware`). Edge runtime not supported in proxy.

**Linting** — `next lint` removed. Use `eslint` directly. `next build` no longer auto-lints.

**Caching**
- `revalidateTag('tag')` → `revalidateTag('tag', 'max')` (second arg required)
- `cacheLife` / `cacheTag` stable (no `unstable_` prefix needed)
- PPR/dynamicIO → `cacheComponents: true` in `next.config.ts`

**Routing** — Parallel route slots require explicit `default.js` files or builds fail.

**Images** — `next/legacy/image` deprecated; `images.domains` deprecated (use `remotePatterns`); local images with query strings need `images.localPatterns.search` config.

**Removed** — AMP support, `serverRuntimeConfig`/`publicRuntimeConfig` (use env vars), `devIndicators.appIsrStatus/buildActivity`.

**Turbopack config** — top-level `turbopack: {}` in `next.config.ts` (not `experimental.turbopack`).
