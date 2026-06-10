# SPEC — Homologación de la estructura de directorios de juegos

> **Estado:** Implementado
> **Depende de:** 07-tetris-jugable, 08-mobile-touch-controls
> **Fecha:** 2026-06-09
> **Objetivo:** Establecer una única convención canónica de directorios para juegos y componentes compartidos, alineando código y documentación y eliminando el convenio fantasma duplicado.

## Scope

**In:**

- Definir la convención canónica única (canvas, registro, ruta jugable, componentes compartidos).
- Eliminar la ruta huérfana `app/games/frogger/play/` y la carpeta `app/games/` vacía resultante.
- Consolidar los 4 componentes React compartidos en `components/` (raíz) y actualizar imports.
- Alinear documentación viva: `game-jam.md`, `skin-designer.md`, `game-planner.md`, `CLAUDE.md`.
- Actualizar `references/implemented-games.md` (añadir frogger).

**Fuera de alcance:**

- Reescribir specs históricos ya implementados (`01`, `02`, `03`) — son registro del estado en su momento.
- Unificar `lib/types.ts` (Game DB) y `lib/games/types.ts` (EngineCallbacks) — concerns distintos.
- Renombrar IDs de juego o tocar tablas `games`/`scores` de Supabase.
- Migrar canvas a `components/games/Game.tsx` (descartado; se mantiene `lib/games/`).
- Controles táctiles/mobile, Auth/RLS, Realtime en leaderboard.

## Data model

Sin nuevas estructuras de datos. Solo cambios de ubicación de archivos e imports.

## Convención canónica (la verdad única)

| Aspecto                       | Ruta canónica                                               |
| ----------------------------- | ----------------------------------------------------------- |
| Componente canvas de juego    | `lib/games/<slug>/<Name>Canvas.tsx`                         |
| Registro de juegos            | `lib/games/registry.ts` → `GAME_REGISTRY`                   |
| Tipos de engine               | `lib/games/types.ts` (`EngineCallbacks`, `GameCanvasProps`) |
| Ruta jugable (única)          | `app/player/[id]/` (genérica, registry-driven)              |
| Componentes React compartidos | `components/` (raíz), alias `@/components/...`              |
| Tipo `Game` (DB)              | `lib/types.ts`                                              |

## Implementation plan

1. **Consolidar componentes compartidos en `components/` (raíz).**
   - Mover `app/components/{Nav,UserProvider,FloatingSilhouettes,ScoresMigrator}.tsx` → `components/`.
   - Actualizar imports a `@/components/...`:
     - `app/layout.tsx:3-5` (Nav, UserProvider, ScoresMigrator)
     - `app/page.tsx:8` (FloatingSilhouettes)
     - `app/auth/page.tsx:5` (UserProvider)
     - `app/player/[id]/PlayerClient.tsx:7` (UserProvider)
   - Verificación: `grep -r "app/components\|./components/\|../components/"` no devuelve referencias residuales; `npx tsc --noEmit` sin errores.

2. **Eliminar la ruta huérfana de frogger.**
   - Borrar `app/games/frogger/play/page.tsx` y la carpeta `app/games/` (queda vacía).
   - Verificación: navegar `/player/frogger`, jugar, game over, guardar score.

3. **Alinear documentación viva.**
   - `.claude/agents/game-jam.md`: `components/games/<Name>Game.tsx` → `lib/games/<slug>/<Name>Canvas.tsx`; `app/games/<id>/play/page.tsx` → ruta única `app/player/[id]` (registry-driven, sin page por juego); `<Name>GameProps` → `GameCanvasProps` de `lib/games/types.ts`; añadir paso "registrar en `registry.ts`".
   - `.claude/agents/skin-designer.md`: `components/games/TetrisGame.tsx` → `lib/games/tetris/TetrisCanvas.tsx`; `components/games/<Juego>.tsx` → `lib/games/<slug>/<Name>Canvas.tsx`; `app/games/<juego>/play/page.tsx` → `app/player/[id]/PlayerClient.tsx`.
   - `.claude/agents/game-planner.md`: `app/games/` "fuente de verdad" → `lib/games/`.
   - `CLAUDE.md`: añadir sección "Convención canónica" con la tabla de arriba; aclarar ruta jugable única y casa de componentes.

4. **Actualizar referencias.**
   - `references/implemented-games.md`: verificar id real de frogger en DB; añadir frogger a la sección "Implemented Games".

## Acceptance criteria

- [ ] No existe `app/games/` en el repo.
- [ ] Frogger jugable solo vía `/player/frogger`; score se guarda correctamente.
- [ ] Los 4 componentes compartidos viven en `components/` (raíz) y todos los imports resuelven.
- [ ] `npx tsc --noEmit` y `npm run build` sin errores.
- [ ] `.claude/agents/game-jam.md`, `skin-designer.md`, `game-planner.md` no mencionan `components/games/*Game.tsx` ni `app/games/<id>/play/`.
- [ ] `CLAUDE.md` contiene la tabla de convención canónica.
- [ ] `references/implemented-games.md` incluye frogger en la sección de implementados.

## Decisions

- **Sí: canvas en `lib/games/<slug>/<Name>Canvas.tsx`** — 3 juegos ya lo usan, registry-driven; menor coste que migrar.
- **Sí: ruta única `app/player/[id]`** — elimina la duplicación PlayerClient vs FroggerPlayPage; escala sin page por juego.
- **Sí: componentes en `components/` raíz** — alias `@/components` ya configurado; GamepadOverlay ya vive ahí.
- **No: tocar specs 01-03** — registro histórico; reescribirlos distorsiona el historial de decisiones.
- **No: unificar lib/types.ts con lib/games/types.ts** — concerns separados (Game DB vs EngineCallbacks), fuera del scope de "estructura de directorios".
- **No: migrar canvas a components/games/Game.tsx** — el convenio actual funciona; el coste de migrar supera el beneficio.

## Risks

- Imports relativos no listados podrían romperse al mover `app/components/` → mitigar con `grep -r "app/components"` global antes de borrar la carpeta y `npx tsc --noEmit` tras cada paso.
- El id real de frogger en DB podría ser `rana` y no `frogger` → verificar con `mcp__supabase__execute_sql` antes de actualizar `implemented-games.md`.
