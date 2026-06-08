# NN — [TITLE] jugable en /player/[id]

> This is the spec template for a game port. Replace all `[PLACEHOLDERS]` with
> game-specific values. Remove this note before saving the final spec.

**Estado:** Borrador
**Depende de:** 04-supabase-setup (clients de Supabase), 06-leaderboard-supabase (tablas games/scores)
**Fecha:** [YYYY-MM-DD]
**Objetivo:** Portar [TITLE] (`references/started-games/[REF-FOLDER]/`) a un componente React/TS montado en `/player/[id]`, registrarlo en el catálogo de Supabase, y exponerlo en el leaderboard global vía las tablas `games` y `scores` ya existentes.

---

## Scope

### Incluido

- Nueva fila en la tabla `games` de Supabase (`id: "[id]"`, `cat: "[CAT]"`, `color: "[color]"`, `cover: "cover-[id]"`, copy arcade en español)
- Nueva clase CSS `.cover-[id]` en `app/globals.css` (inspirada en `.cover-asteroides` pero con formas propias)
- Puerto a TypeScript del motor del juego en `lib/games/[id]/engine.ts`: clases/interfaces del reference tipadas, estado mutable en una clase `Engine(ctx, callbacks)`, callbacks `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver` disparados solo en cambios de valor
- [ASSETS ONLY — REMOVE IF NOT APPLICABLE] Relocalización de assets externos (`public/games/[id]/`) y carga client-side en el canvas component
- Componente `lib/games/[id]/[Title]Canvas.tsx` (`"use client"`): RAF loop, inputs de teclado y overlay de controles táctiles (`pointer: coarse`), prop `paused`
- [FIRST PORT ONLY — REPLACE WITH ONE LINE IF REGISTRY EXISTS] Creación de `lib/games/registry.ts` y refactor de `app/player/[id]/PlayerClient.tsx` para usar el registry en lugar del if-branch `isAsteroides`; migración de Asteroides al registry
- [SUBSEQUENT PORTS — REPLACE ABOVE] Registro de `[id]` en `lib/games/registry.ts` (una línea)
- Verificación de políticas RLS en Supabase: `SELECT` público en `games` y `scores`, `INSERT` anónimo en `scores`
- Verificación end-to-end: leaderboard por juego en `/detalle/[id]` y global en `/salon`

### Fuera de scope

- Adaptar otros juegos del catálogo — queda para sus propias specs
- Arquitectura genérica de game adapters más allá del registry ya existente
- Sonido/música
- Autenticación de usuarios — scores se guardan con nombre libre
- Paginación del leaderboard
- Admin UI para moderar scores
- Soporte de gamepad físico

---

## Data model

### Fila en `games` (Supabase)

```ts
{
  id:     "[id]",
  title:  "[TITLE]",
  short:  "[Frase corta, tono arcade, <80 chars]",
  long:   "[2-3 frases descriptivas, tono neon/retro]",
  cat:    "[ARCADE|PUZZLE|SHOOTER|VERSUS]",
  cover:  "cover-[id]",
  color:  "[cyan|magenta|green|yellow]",
  best:   [número ejemplo],
  plays:  "[string ejemplo, e.g. '18.2K']",
}
```

### Interfaces TypeScript (`lib/games/[id]/engine.ts`)

> If `EngineCallbacks`, `InputState`, and `GameState` are already extracted to
> `lib/games/types.ts`, import from there instead of redefining them.

```ts
// Shared types (in lib/games/types.ts if second game; else local)
export type GameState = "playing" | "dead" | "gameover";

export interface EngineCallbacks {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;  // omit if game has no lives
  onLevelChange?: (level: number) => void;  // omit if game has no levels
  onGameOver?: (finalScore: number) => void;
}

export interface InputState {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

// Engine class
export class Engine {
  readonly input: InputState = { keys: {}, justPressed: {} };
  constructor(ctx: CanvasRenderingContext2D, callbacks: EngineCallbacks = {}) { ... }
  initGame(): void
  update(dt: number): void
  draw(): void
}
```

### Props del canvas component (`lib/games/[id]/[Title]Canvas.tsx`)

```ts
export interface [Title]CanvasProps extends EngineCallbacks {
  paused: boolean;
}
```

### Registry (`lib/games/registry.ts`) — solo si es el primer port

```ts
// Maps game.id → lazy-loaded canvas component with standard props
export const GAME_REGISTRY: Record<string, ComponentType<GameCanvasProps>> = {
  asteroides: AsteroidsCanvas,  // migrated from the old isAsteroides branch
  [id]: [Title]Canvas,          // new game
};
```

---

## Implementation plan

### Paso 1 — Fila en Supabase + RLS

Aplicar via MCP `apply_migration`:
- `INSERT INTO games VALUES ('[id]', '[TITLE]', '[short]', '[long]', '[CAT]', 'cover-[id]', '[color]', [best], '[plays]') ON CONFLICT DO NOTHING;`
- Verificar (o crear si faltan) políticas RLS:
  ```sql
  CREATE POLICY "public_select_games" ON games FOR SELECT USING (true);
  CREATE POLICY "public_select_scores" ON scores FOR SELECT USING (true);
  CREATE POLICY "anon_insert_scores"   ON scores FOR INSERT WITH CHECK (true);
  ```
- Actualizar también `app/data.ts GAMES[]` con la misma entrada (como referencia local; ya no es la fuente de verdad).

### Paso 2 — Cover CSS

Agregar `.cover-[id]` a `app/globals.css` después de `.cover-asteroides` (~línea 510). Patrón de referencia:
```css
.cover-[id] {
  background: [gradiente temático];
}
.cover-[id]::after {
  content: ""; position: absolute; inset: 0;
  background: [forma característica del juego];
  clip-path: [polígono propio, distinto de los demás covers];
}
.cover-[id]::before {
  content: "[símbolo ASCII]"; position: absolute; [posición];
  color: var(--[color]); font-size: [Npx];
  text-shadow: 0 0 8px var(--[color]);
}
```

### Paso 3 — Puerto del motor a TypeScript

Crear `lib/games/[id]/engine.ts`:
- Extraer constantes del reference (`[CONST_NAMES…]`) como `const` de módulo.
- Portar clases `[ClassName…]` con tipos explícitos; cada `draw()` recibe `ctx` como parámetro.
- Encapsular estado mutable en clase `Engine`:
  - Constructor: `(ctx: CanvasRenderingContext2D, callbacks: EngineCallbacks = {})`.
  - Métodos públicos: `initGame()`, `update(dt: number)`, `draw()`.
  - Estado interno `[score, lives, level, state, …]` con setters privados que disparan callbacks solo cuando el valor cambia.
  - NO incluir RAF loop — lo maneja el componente.
  - NO auto-restart en game over — React hace el remount.
- Si es el segundo juego que usa `EngineCallbacks`/`InputState`: moverlos a `lib/games/types.ts` e importar desde ahí (en `engine.ts` de este juego y en `lib/games/asteroids/engine.ts`).

[ASSETS STEP — REMOVE IF NOT APPLICABLE]
### Paso 4 — Assets externos

Copiar de `references/started-games/[REF-FOLDER]/assets/` a `public/games/[id]/`:
- `[file1]`, `[file2]` (sprites, audio, etc.)
Acceder en el canvas component via rutas relativas a `/public`:
```ts
const img = new Image(); img.src = "/games/[id]/[file]";
```

### Paso [4 or 5] — Componente de canvas

Crear `lib/games/[id]/[Title]Canvas.tsx` (`"use client"`):
- `useRef` al `<canvas width={[W]} height={[H]}>`.
- Engine instanciado una sola vez en `useEffect([], [])` via `engineRef`.
- `callbacksRef` actualizado por `useEffect` en los cuatro callbacks (evita re-crear el Engine).
- `pausedRef` actualizado por `useEffect` en `paused` prop.
- RAF loop: `dt = Math.min((ts - lastTime) / 1000, 0.05)` — si `!pausedRef.current`, llamar `engine.update(dt)`; siempre llamar `engine.draw()`.
- Listeners `keydown`/`keyup` en `window`, scoped al componente, con `e.preventDefault()` para las teclas del juego (`[KEY_LIST]`). Mutando `engine.input.keys` / `engine.input.justPressed`.
- Cleanup del `useEffect`: `cancelAnimationFrame`, `removeEventListener`, `engineRef.current = null`.
- Canvas CSS: `width: "100%"`, `height: "100%"` para escalar dentro de `.crt-screen`.
- Overlay de controles táctiles (`.touch-controls`): botones `[BUTTON_LIST]` con `touchHandlers(code)` (mismo patrón que `AsteroidsCanvas.tsx`).

### Paso [5 or 6] — Registry wiring

**Si el registry NO existe (primer port):**
1. Crear `lib/games/registry.ts`:
   ```ts
   import dynamic from "next/dynamic";
   import type { ComponentType } from "react";
   import type { EngineCallbacks } from "./types";

   export interface GameCanvasProps extends EngineCallbacks {
     paused: boolean;
   }

   export const GAME_REGISTRY: Record<string, ComponentType<GameCanvasProps>> = {
     asteroides: dynamic(() => import("./asteroids/AsteroidsCanvas")),
     [id]: dynamic(() => import("./[id]/[Title]Canvas")),
   };
   ```
2. Refactorizar `app/player/[id]/PlayerClient.tsx`:
   - Eliminar `const isAsteroides = game.id === "asteroides"` y el import de `AsteroidsCanvas`.
   - Importar `GAME_REGISTRY` + `GameCanvasProps`.
   - Derivar `const GameCanvas = GAME_REGISTRY[game.id]`.
   - En JSX: `{GameCanvas ? <GameCanvas paused={paused} onScoreChange={…} … /> : <div className="game-arena">…</div>}`.

**Si el registry YA existe (port posterior):**
- Agregar `[id]: dynamic(() => import("./[id]/[Title]Canvas"))` en `lib/games/registry.ts`.

### Paso [6 or 7] — Score insert y leaderboards

Score insert ya es genérico en `PlayerClient.tsx` (`scores.insert({ game_id: game.id, … })`). Sin cambios.
Verificar que `/detalle/[id]`, `/salon` y `/biblioteca` muestran el nuevo juego correctamente (data-driven por `game.id` desde Supabase — no debería requerir cambios de código).

### Paso [7 or 8] — Verificar en browser

Navegar a cada superficie y confirmar:
- `/biblioteca` → card de `[TITLE]` visible con cover `.cover-[id]` propio.
- `/player/[id]` → canvas del juego dentro de `.crt-screen` (no `.game-arena` simulada).
- Jugar con teclado (`[KEY_LIST]`), pasar [nivel/eliminar piezas/destruir bloques según el juego].
- HUD (`player-hud`) se actualiza en sincronía con el juego via callbacks.
- PAUSA: loop se detiene, overlay visible; REANUDAR: continúa donde quedó.
- Perder → modal de Game Over con puntaje final → guardar iniciales → verificar fila en Supabase `scores`.
- `/salon` → score aparece en leaderboard global.
- `/detalle/[id]` → score aparece en TOP SCORES del juego.
- Emular `pointer: coarse` (DevTools mobile) → controles táctiles visibles y funcionales.
- `npm run build` sin errores de tipos ni imports rotos.

---

## Acceptance criteria

- [ ] La tabla `games` en Supabase contiene una fila con `id = "[id]"` y las columnas del data model
- [ ] Las políticas RLS permiten `SELECT` público en `games`/`scores` e `INSERT` anónimo en `scores`
- [ ] `/biblioteca` muestra la card `[TITLE]` con su cover visual propio (`.cover-[id]`, distinto de otros covers)
- [ ] `/player/[id]` renderiza el canvas del juego dentro de `.crt-screen` (no la `.game-arena` simulada)
- [ ] El juego es jugable con teclado: `[KEY_LIST]`
- [ ] `player-hud` (PUNTOS[/VIDAS/NIVEL]) se mantiene sincronizado en tiempo real con el canvas vía callbacks
- [ ] El botón PAUSA detiene el loop y muestra overlay; REANUDAR continúa
- [ ] Al perder, el modal de Game Over muestra el puntaje final y permite guardar iniciales
- [ ] Guardar iniciales inserta una fila en Supabase `scores` con `game_id = "[id]"`
- [ ] El score aparece en `/salon` (leaderboard global) y en `/detalle/[id]` (TOP SCORES)
- [ ] En viewport táctil (`pointer: coarse`) aparece overlay con botones `[BUTTON_LIST]`, cada uno controla el juego correctamente
- [ ] `lib/games/registry.ts` existe y `PlayerClient.tsx` usa el registry (sin if-branch hardcodeado por `game.id`)
- [ ] `npm run build` compila sin errores de tipos ni imports rotos

---

## Decisions taken and discarded

- **Registry en `lib/games/registry.ts` (elegido)** vs agregar otro `if (game.id === "…")` branch — el if-chain crece O(n) con cada juego nuevo; el registry hace el wiring O(1), un import + una línea. Dado que ya existe el precedente `isAsteroides`, este es el momento de generalizar.

- **`[id]` como id de catálogo (elegido)** vs `[alternative]` — [breve justificación, ej. "coincide con el nombre del reference folder y es el slug más reconocible en español"].

- **Canvas interno `[W]×[H]` + escalado CSS (elegido)** vs recalcular dimensiones dinámicamente — preserva intacta la lógica de colisiones/spawns del reference; `.crt-screen` se encarga del escalado visual.

[ASSETS DECISION — REMOVE IF NOT APPLICABLE]
- **Assets en `public/games/[id]/` (elegido)** vs inline base64 o importar con webpack — `/public/` es el método estándar de Next.js para assets estáticos servidos directamente; no requiere configuración adicional de `next.config.ts`.

---

## Identified risks

- **RLS bloquea inserts anónimos** — Supabase habilita RLS por defecto. Sin políticas, los inserts en `scores` desde el browser fallan silenciosamente. Mitigación: paso 1 verifica/crea las políticas RLS explícitamente.

- **Re-renders frecuentes por callbacks de score** — el motor puede llamar `onScoreChange` en cada frame (colisión). Mitigación: el engine solo dispara el callback cuando el valor realmente cambia (setter privado con comparación).

- **Fugas de memoria al desmontar el canvas** — el RAF loop y los listeners de `window` deben cancelarse/removerse en el cleanup del `useEffect`. El `engineRef` debe nullificarse para que el GC libere los recursos del canvas.

- **Render borroso en pantallas high-DPI** — canvas fijo `[W]×[H]` escalado por CSS puede verse pixelado en monitores 2x/3x. Si se detecta en la verificación: ajustar `canvas.width/height` con `devicePixelRatio` y `ctx.scale(dpr, dpr)` sin tocar la lógica de coordenadas.

- **Conflicto entre controles táctiles y gestos del navegador** — toques sostenidos pueden disparar scroll/zoom. Mitigación: `touch-action: none` en `.touch-btn` y `e.preventDefault()` en los handlers táctiles.

[ASSETS RISK — REMOVE IF NOT APPLICABLE]
- **Assets no encontrados en producción** — si los archivos no se copian a `public/games/[id]/` antes del build, las URLs fallan silenciosamente. Mitigación: verificar en el paso de verificación browser que los assets cargan (Network tab sin 404).

- **Tipo `GameCanvasProps` desincronizado entre juegos** — si un juego omite `onLivesChange` pero el tipo lo requiere, el TypeScript check falla. Mitigación: todos los callbacks en `EngineCallbacks` son opcionales (`?`); el registry los pasa todos y el motor ignora los que no implementa.
