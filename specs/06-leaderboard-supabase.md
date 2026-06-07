# 06 — Leaderboard y tabla de juegos en Supabase

**Estado:** Aprovado
**Depende de:** 04-supabase-setup (clients de Supabase), 05-asteroides-jugable (flujo de guardado de scores)
**Fecha:** 2026-06-06
**Objetivo:** Crear las tablas `games` y `scores` en Supabase, migrar la app para leer juegos desde la DB (reemplazando `app/data.ts`), guardar scores en Supabase al terminar cada partida, migrar scores existentes de localStorage, y mostrar un leaderboard global y por juego en `/salon` y en cada página de juego.

## Scope

### Incluido

- Migración de Supabase: tabla `games` (seed con los datos actuales de `app/data.ts`) y tabla `scores` (`game_id`, `player_name`, `score`, `created_at`)
- Generar tipos TypeScript desde el schema (`npx supabase gen types`)
- Reemplazar `app/data.ts` como fuente de verdad: todas las páginas que hoy importan `GAMES` pasan a hacer fetch server-side desde Supabase
- Cambiar el modal de Game Over para guardar el score en Supabase en lugar de (o además de) localStorage
- Script/lógica de migración: al abrir la app, leer `av_scores` de localStorage y hacer upsert de esos registros en Supabase (una sola vez, marcado con flag en localStorage)
- Página `/salon` rediseñada: leaderboard global (todos los juegos) con columnas POSICIÓN / JUGADOR / JUEGO / PUNTUACIÓN / FECHA + selector de juego para filtrar
- Sección "TOP SCORES" en `/player/[id]`: muestra los top 10 scores de ese juego

### Fuera de scope

- Autenticación de usuarios — los scores se guardan con nombre libre (sin cuenta)
- Paginación del leaderboard (se muestran top N, sin "ver más")
- Admin UI para moderar/borrar scores
- Adaptar otros juegos simulados (rocas, bricks, etc.) a jugables reales — sus scores siguen siendo simulados hasta sus propias specs
- Eliminar `app/data.ts` del repo — se puede mantener como fallback o referencia

## Data model

### Tablas Supabase

```sql
-- Tabla de juegos (espejo de app/data.ts)
create table public.games (
  id          text primary key,           -- "asteroides", "rocas", etc.
  title       text not null,
  short       text not null,
  long        text not null,
  cat         text not null,              -- "SHOOTER", "PUZZLE", etc.
  cover       text not null,              -- clase CSS, ej. "cover-asteroides"
  color       text not null,              -- "cyan", "magenta", etc.
  best        integer not null default 0,
  plays       text not null default '0'
);

-- Tabla de scores
create table public.scores (
  id           uuid primary key default gen_random_uuid(),
  game_id      text not null references public.games(id),
  player_name  text not null,
  score        integer not null,
  created_at   timestamptz not null default now()
);

-- Índice para queries de leaderboard
create index scores_game_id_score_idx on public.scores(game_id, score desc);
```

### Tipos TypeScript generados

Después de aplicar la migración se corre `npx supabase gen types typescript` para generar `lib/supabase/database.types.ts` y tipar los clients con `Database`.

### Interfaz `Game` (sin cambios estructurales)

La interfaz `Game` que hoy infiere `app/data.ts` se mueve a `lib/types.ts` (o se deriva de los tipos generados). Las páginas que hoy importan `GAMES` pasan a recibir `Game[]` desde Supabase con la misma forma.

### Score en localStorage (migración)

Formato actual: `localStorage.av_scores = [{ game, score, name, at }]`
Mapeo a Supabase: `game → game_id`, `score → score`, `name → player_name`, `at → created_at`.
Flag de migración: `localStorage.av_scores_migrated = "1"`.

## Implementation plan

1. **Crear migración de Supabase** — aplicar via MCP `apply_migration`:
   - Crear tabla `games` con las columnas del data model
   - Crear tabla `scores` con FK a `games` + índice
   - Seed de `games` con los registros actuales de `app/data.ts`

2. **Generar tipos TypeScript** — correr `npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts` y actualizar `lib/supabase/client.ts` y `lib/supabase/server.ts` para tipar con `Database`

3. **Extraer interfaz `Game`** — mover la interfaz a `lib/types.ts` derivada de los tipos generados; actualizar todos los imports

4. **Reemplazar fetch de juegos** — en cada página/componente que hoy importa `GAMES` de `app/data.ts`:
   - `app/biblioteca/page.tsx` → fetch server-side desde Supabase
   - `app/player/[id]/page.tsx` → fetch del juego individual por `id`
   - Home page y cualquier otro consumidor → idem

5. **Cambiar guardado de score** — en `app/player/[id]/page.tsx`, al confirmar iniciales en el modal de Game Over: insertar en `scores` via client de Supabase (browser client). Mantener también el guardado en localStorage como fallback offline hasta que la migración haya corrido.

6. **Migración de localStorage** — crear `lib/migrateScores.ts`: función que lee `av_scores`, hace `upsert` en Supabase y escribe `av_scores_migrated = "1"`. Llamarla una sola vez desde un componente cliente en el layout raíz (solo si `av_scores_migrated` no existe).

7. **Sección TOP SCORES en `/player/[id]`** — fetch de los top 10 scores del juego (server-side), renderizar tabla debajo del `.crt-screen` con columnas POSICIÓN / JUGADOR / PUNTUACIÓN / FECHA

8. **Rediseñar `/salon`** — leaderboard global (top 20, todos los juegos) con columnas POSICIÓN / JUGADOR / JUEGO / PUNTUACIÓN / FECHA + selector de juego para filtrar (client-side con nuevo fetch a Supabase al seleccionar)

9. **Verificar en browser** — navegar a `/biblioteca` (juegos cargados desde DB), jugar Asteroides hasta Game Over, guardar iniciales → verificar fila en Supabase `scores`, navegar a `/salon` → score aparece en leaderboard, navegar a `/player/asteroides` → aparece en TOP SCORES de ese juego

## Acceptance criteria

- [ ] Las tablas `games` y `scores` existen en Supabase con las columnas del data model
- [ ] `games` contiene los mismos registros que `app/data.ts` (mismo `id`, `title`, `cat`, etc.)
- [ ] `lib/supabase/database.types.ts` existe y los clients están tipados con `Database`
- [ ] `/biblioteca` carga los juegos desde Supabase (sin importar `GAMES` de `app/data.ts`)
- [ ] `/player/[id]` carga el juego individual desde Supabase; una `id` inexistente devuelve 404
- [ ] Al guardar iniciales en el modal de Game Over, se inserta una fila en `scores` en Supabase
- [ ] La migración de localStorage corre una sola vez: los scores de `av_scores` aparecen en Supabase y `av_scores_migrated = "1"` queda seteado en localStorage
- [ ] `/player/[id]` muestra una tabla TOP SCORES con los 10 mejores scores de ese juego
- [ ] `/salon` muestra un leaderboard global con los top 20 scores de todos los juegos
- [ ] `/salon` tiene un selector de juego que filtra el leaderboard por juego
- [ ] `npm run build` compila sin errores de tipos ni imports rotos

## Decisions taken and discarded

- **`games` en Supabase como fuente de verdad (elegido)** vs mantener `app/data.ts` — centralizar en DB permite que el leaderboard haga JOINs con `scores` sin duplicar datos; `app/data.ts` se conserva en el repo como referencia pero deja de ser importado por las páginas.

- **Scores sin autenticación (elegido)** vs requerir cuenta — reducir fricción para jugar; el nombre es libre. Auth queda para una spec futura.

- **Migración de localStorage con flag (elegido)** vs ignorar scores históricos — el usuario pidió migrar los datos; el flag `av_scores_migrated` garantiza que el upsert solo corre una vez y no duplica registros en recargas posteriores.

- **Leaderboard en `/salon` + TOP SCORES en `/player/[id]` (elegido)** vs solo una ubicación — `/salon` da visibilidad global; TOP SCORES en el player page da contexto inmediato al jugador antes/después de jugar.

- **Filtro por juego en `/salon` con nuevo fetch al seleccionar (elegido)** vs pre-cargar todos los datos — evita traer filas innecesarias; al seleccionar un juego se hace una query puntual a Supabase.

- **Top 10 en player page, top 20 global en `/salon` (elegido)** vs paginación — sin paginación por ahora; N fijo cubre el caso de uso sin complejidad extra.

## Identified risks

- **Fetch de juegos falla en build/SSR** — si las env vars de Supabase no están seteadas en el entorno de build, las páginas que leen `games` desde la DB lanzarán errores en tiempo de compilación o en runtime. Mitigación: validar que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén en `.env.local` antes de correr `npm run build`.

- **RLS (Row Level Security) bloquea inserts anónimos** — Supabase habilita RLS por defecto; sin políticas explícitas, los inserts en `scores` desde el browser client fallarán silenciosamente. Mitigación: crear políticas RLS que permitan `SELECT` público en `games` y `scores`, e `INSERT` anónimo en `scores`.

- **Datos de `games` desincronizados si se modifica `app/data.ts`** — al tener dos fuentes, un cambio en `data.ts` no se refleja automáticamente en la DB. Mitigación: documentar en `app/data.ts` que ya no es la fuente de verdad; los cambios de catálogo deben hacerse directamente en Supabase.

- **Migración de localStorage con scores de juegos sin fila en `games`** — si `av_scores` contiene entradas con `game` que no existe en la tabla `games` (ej. juegos simulados sin entrada real), el insert fallará por FK. Mitigación: filtrar en `migrateScores.ts` solo los `game_id` que existen en `games`.
