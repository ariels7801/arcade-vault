# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Online gaming platform (Arcade Vault) — players compete for points. Uses Spec Driven Design via `/spec` and `/spec-impl` skills.

No test runner configured yet.

## Stack

- **Next.js 16.2.6** — App Router, Turbopack default, React 19.2
- **Tailwind CSS v4** — PostCSS plugin (`@tailwindcss/postcss`)
- **TypeScript 5**
- **Supabase** — DB + auth (`@supabase/ssr`, `@supabase/supabase-js`); clients in `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (RSC/Server Actions)
- **Resend** — email via contact form in `/acerca-de`

## Routes

| Path            | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| `/`             | Home: hero, features, game previews, stats, live activity, pricing, CTA               |
| `/biblioteca`   | Game library — fetches `games` table from Supabase (SSR)                              |
| `/detalle/[id]` | Game detail page                                                                      |
| `/player/[id]`  | Playable game shell — loads canvas via `GAME_REGISTRY`, saves score to `scores` table |
| `/salon`        | Leaderboard — reads `scores` joined with `games` from Supabase                        |
| `/auth`         | Login/signup (client-side only, stores name in `UserProvider` context)                |
| `/acerca-de`    | About + contact form (Resend API)                                                     |

## Game Engine

Games live in `lib/games/<slug>/` and are registered in `lib/games/registry.ts` as `GAME_REGISTRY`.

Each canvas component receives `GameCanvasProps` (`EngineCallbacks` + `paused: boolean`).

**Current games:** `asteroides` (Asteroids), `tetris` (Tetris)

To add a new game: create `lib/games/<slug>/` with a canvas component, export it from `registry.ts`, insert a row in the Supabase `games` table.

see `references/implemented-games.md` when you need to check which games are implemented and how to implemented new ones.

## Database (Supabase)

Tables: `games` (id, title, short, long, cover, cat, color, best, plays), `scores` (id, game_id, player_name, score, created_at).

Types auto-generated in `lib/supabase/database.types.ts`. Re-generate with `mcp__supabase__generate_typescript_types` or `supabase gen types`.

## Env Vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_DB_PASSWORD=
RESEND_API_KEY=
```

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- Usa `/spec` y `/spec-impl` para diseño spec-driven de nuevas features.

## Agents

| Agent | File | When to use |
|-------|------|-------------|
| `game-planner` | `.claude/agents/game-planner.md` | Sugiere el siguiente juego a implementar. Analiza el catálogo, los specs existentes y la memoria persistente en `references/game-suggestions-todo.md`. Propone 1–3 candidatos razonados y actualiza el to-do. Úsalo cuando preguntes "qué juego sigue", "sugiéreme un juego" o "qué implementamos ahora". |

## Next.js 16 Breaking Changes

This version has significant API changes from v15. Key differences:

**Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are now **Promise-only** (sync access removed). Always `await` them:

```tsx
export default async function Page({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
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
