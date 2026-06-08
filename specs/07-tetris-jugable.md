# 07 — TETRIS jugable en /player/tetris

**Estado:** Implementado
**Depende de:** 04-supabase-setup (clients de Supabase), 06-leaderboard-supabase (tablas games/scores)
**Fecha:** 2026-06-07
**Objetivo:** Portar TETRIS (`references/started-games/03-tetris/`) a un componente React/TS montado en `/player/tetris`, crear `lib/games/registry.ts` para eliminar el if-branch `isAsteroides` de `PlayerClient.tsx`, registrar el juego en Supabase, y exponerlo en el leaderboard global vía las tablas `games` y `scores` ya existentes.

---

## Scope

### Incluido

- Nueva fila en la tabla `games` de Supabase (`id: "tetris"`, `cat: "PUZZLE"`, `color: "cyan"`, `cover: "cover-tetris"`, copy arcade en español)
- Nueva clase CSS `.cover-tetris` en `app/globals.css` (gradiente frío/geométrico con formas propias, distinto de `.cover-asteroides`)
- Puerto a TypeScript del motor en `lib/games/tetris/engine.ts`: constantes `COLS`, `ROWS`, `BLOCK`, `PIECES`, `COLORS`, `LINE_SCORES`; funciones `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`; clase `Engine(ctx, callbacks)` con estado mutable (`board`, `current`, `next`, `score`, `lines`, `level`, `state`) y métodos públicos `initGame()`, `update(dt)`, `draw()`; callbacks `onScoreChange` y `onLevelChange` disparados solo en cambios de valor; `onGameOver` al hacer top-out; `onLivesChange` **omitido** (Tetris no tiene vidas). La "siguiente pieza" se dibuja dentro del canvas principal (no en un canvas separado).
- Componente `lib/games/tetris/TetrisCanvas.tsx` (`"use client"`): RAF loop con acumulador `dropAccum`/`dropInterval`, inputs de teclado (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `KeyX`, `ArrowDown`, `Space`, `KeyP`), overlay de controles táctiles con 5 botones (◀ ▶ ↻ ▼ ⬇) bajo `pointer: coarse`, prop `paused`
- Creación de `lib/games/registry.ts` y refactor de `app/player/[id]/PlayerClient.tsx`: eliminar `isAsteroides` if-branch, migrar `AsteroidsCanvas` al registry, agregar `TetrisCanvas`
- Verificación de políticas RLS en Supabase: `SELECT` público en `games` y `scores`, `INSERT` anónimo en `scores`
- Verificación end-to-end: leaderboard por juego en `/detalle/tetris` y global en `/salon`

### Fuera de scope

- Adaptar otros juegos del catálogo — queda para sus propias specs
- Arquitectura genérica de game adapters más allá del registry introducido aquí
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
  id:     "tetris",
  title:  "TETRIS",
  short:  "Encaja piezas, borra líneas, sobrevive al caos geométrico que no para.",
  long:   "Siete piezas. Veinte filas. Una sola regla: no dejes que lleguen arriba. Cada línea borrada es un segundo más de oxígeno; cada nivel, una velocidad que roza el pánico. El tablero no tiene memoria — tú tampoco tendrás tiempo para lamentarte.",
  cat:    "PUZZLE",
  cover:  "cover-tetris",
  color:  "cyan",
  best:   28400,
  plays:  "11.7K",
}
```

### Interfaces TypeScript (`lib/games/tetris/engine.ts`)

> `EngineCallbacks`, `InputState` y `GameState` se mueven a `lib/games/types.ts` (segundo juego que los usa) e importan desde ahí tanto `engine.ts` de Tetris como `lib/games/asteroids/engine.ts`.

```ts
// lib/games/types.ts (extraído — compartido entre juegos)
export type GameState = "playing" | "dead" | "gameover";

export interface EngineCallbacks {
  onScoreChange?: (score: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?:    (finalScore: number) => void;
  // onLivesChange omitido — Tetris no tiene vidas
}

// lib/games/tetris/engine.ts
export class Engine {
  readonly input: { keys: Record<string, boolean>; justPressed: Record<string, boolean> };
  constructor(ctx: CanvasRenderingContext2D, callbacks: EngineCallbacks = {}) { ... }
  initGame(): void
  update(dt: number): void   // avanza dropAccum, aplica soft/hard drop, lockPiece
  draw(): void               // board + ghost + current piece + preview en esquina
}
```

### Props del componente (`lib/games/tetris/TetrisCanvas.tsx`)

```ts
export interface TetrisCanvasProps extends EngineCallbacks {
  paused: boolean;
}
```

### Registry (`lib/games/registry.ts`) — introducido en este spec

```ts
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { EngineCallbacks } from "./types";

export interface GameCanvasProps extends EngineCallbacks {
  paused: boolean;
}

export const GAME_REGISTRY: Record<string, ComponentType<GameCanvasProps>> = {
  asteroides: dynamic(() => import("./asteroids/AsteroidsCanvas")),
  tetris: dynamic(() => import("./tetris/TetrisCanvas")),
};
```

---

## Implementation plan

### Paso 1 — Fila en Supabase + RLS

Aplicar vía MCP `apply_migration`:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  'tetris', 'TETRIS',
  'Encaja piezas, borra líneas, sobrevive al caos geométrico que no para.',
  'Siete piezas. Veinte filas. Una sola regla: no dejes que lleguen arriba. Cada línea borrada es un segundo más de oxígeno; cada nivel, una velocidad que roza el pánico. El tablero no tiene memoria — tú tampoco tendrás tiempo para lamentarte.',
  'PUZZLE', 'cover-tetris', 'cyan', 28400, '11.7K'
) ON CONFLICT DO NOTHING;
```

Verificar (o crear si faltan) políticas RLS:

```sql
CREATE POLICY "public_select_games" ON games FOR SELECT USING (true);
CREATE POLICY "public_select_scores" ON scores FOR SELECT USING (true);
CREATE POLICY "anon_insert_scores"   ON scores FOR INSERT WITH CHECK (true);
```

### Paso 2 — Cover CSS

Agregar `.cover-tetris` a `app/globals.css` después de `.cover-asteroides`. Patrón geométrico frío con bloques apilados:

```css
.cover-tetris {
  background: linear-gradient(135deg, #0a0a1a 0%, #001a2e 100%);
}
.cover-tetris::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--cyan);
  clip-path: polygon(
    20% 60%,
    40% 60%,
    40% 80%,
    60% 80%,
    60% 40%,
    80% 40%,
    80% 100%,
    20% 100%
  );
  opacity: 0.15;
}
.cover-tetris::before {
  content: "▮▮▮";
  position: absolute;
  bottom: 12px;
  left: 16px;
  color: var(--cyan);
  font-size: 20px;
  text-shadow: 0 0 8px var(--cyan);
}
```

### Paso 3 — Extraer tipos compartidos a `lib/games/types.ts`

Crear `lib/games/types.ts` con `GameState`, `EngineCallbacks` (sin `onLivesChange`). Actualizar `lib/games/asteroids/engine.ts` para importar desde ahí en lugar de definirlos localmente (cambio de imports, sin cambio de lógica).

### Paso 4 — Puerto del motor a TypeScript

Crear `lib/games/tetris/engine.ts`:

- Constantes de módulo: `COLS=10`, `ROWS=20`, `BLOCK=30`, `PIECES[]`, `COLORS[]`, `LINE_SCORES[]`.
- Tipos internos: `Piece { type, shape, x, y }`.
- Funciones puras: `createBoard()`, `randomPiece()`, `collide()`, `rotateCW()`, `tryRotate()`, `merge()`, `clearLines()`, `ghostY()`.
- Clase `Engine`:
  - Constructor: `(ctx, callbacks = {})`.
  - Estado interno: `board`, `current`, `next`, `score`, `lines`, `level`, `state`, `dropAccum`, `dropInterval`.
  - `initGame()`: resetea estado, genera primera pieza, llama callbacks iniciales.
  - `update(dt)`: acumula `dropAccum`; si supera `dropInterval` intenta bajar la pieza o hace `lockPiece()`; procesa `input.justPressed` para `ArrowLeft`, `ArrowRight`, `ArrowUp`/`KeyX`, `ArrowDown`, `Space`; resetea `justPressed` al final.
  - `draw()`: borra canvas, dibuja grilla, board, ghost (alpha 0.2), pieza actual, preview de siguiente pieza en esquina superior derecha.
  - Setters privados que disparan callbacks solo cuando el valor cambia.
  - NO incluir RAF loop ni auto-restart.

### Paso 5 — Componente de canvas

Crear `lib/games/tetris/TetrisCanvas.tsx` (`"use client"`):

- `useRef` al `<canvas width={300} height={600}>`.
- `engineRef` instanciado una sola vez en `useEffect([], [])`.
- `callbacksRef` actualizado por `useEffect` en los tres callbacks (evita recrear Engine).
- `pausedRef` actualizado por `useEffect` en `paused`.
- RAF loop: `dt = Math.min((ts - lastTime) / 1000, 0.05)`; si `!pausedRef.current`, llamar `engine.update(dt)`; siempre llamar `engine.draw()`.
- Listeners `keydown`/`keyup` en `window`, con `e.preventDefault()` para `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`. Mutando `engine.input.keys` / `engine.input.justPressed`.
- `KeyP` en `keydown` llama `onPauseToggle` (prop adicional) si se quiere mantener el atajo de teclado; alternativamente el botón PAUSA de React es suficiente.
- Cleanup: `cancelAnimationFrame`, `removeEventListener`, `engineRef.current = null`.
- Canvas CSS: `width: "100%"`, `height: "100%"` para escalar dentro de `.crt-screen`.
- Overlay táctil (`.touch-controls`): 5 botones `◀ ▶ ↻ ▼ ⬇` con `touchHandlers(code)` mapeados a `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`.

### Paso 6 — Registry + refactor de PlayerClient

1. Crear `lib/games/registry.ts` con el contenido del data model.
2. En `app/player/[id]/PlayerClient.tsx`:
   - Eliminar `const isAsteroides = game.id === "asteroides"` y el import directo de `AsteroidsCanvas`.
   - Importar `GAME_REGISTRY` y `GameCanvasProps` desde `lib/games/registry.ts`.
   - Derivar `const GameCanvas = GAME_REGISTRY[game.id]`.
   - Eliminar el `setInterval` simulado de score (condicionado a `!isAsteroides`); los juegos reales no lo necesitan.
   - En JSX: `{GameCanvas ? <GameCanvas paused={paused} onScoreChange={…} onLevelChange={…} onGameOver={…} /> : <div className="game-arena">…</div>}`.
   - El HUD muestra PUNTOS + NIVEL (sin VIDAS para Tetris; `onLivesChange` es opcional en `EngineCallbacks` — PlayerClient lo pasa solo si el juego lo dispara).

### Paso 7 — Verificar en browser

- `/biblioteca` → card **TETRIS** visible con cover `.cover-tetris` propio.
- `/player/tetris` → canvas dentro de `.crt-screen` (no `.game-arena` simulada).
- Jugar con teclado: mover (`←/→`), rotar (`↑/X`), soft drop (`↓`), hard drop (`Space`).
- Completar una línea → PUNTOS y NIVEL se actualizan en el HUD de React vía callbacks.
- Pasar de nivel (cada 10 líneas) → velocidad aumenta, NIVEL sube en HUD.
- PAUSA → loop se detiene; REANUDAR → continúa donde quedó.
- Top-out → modal Game Over con puntaje final → guardar iniciales → verificar fila en Supabase `scores` con `game_id = "tetris"`.
- `/salon` → score aparece en leaderboard global.
- `/detalle/tetris` → score aparece en TOP SCORES del juego.
- DevTools mobile (`pointer: coarse`) → 5 botones táctiles visibles y funcionales.
- Verificar que `/player/asteroides` sigue funcionando tras el refactor del registry.
- `npm run build` sin errores de tipos ni imports rotos.

---

## Acceptance criteria

- [ ] La tabla `games` en Supabase contiene una fila con `id = "tetris"` y las columnas del data model
- [ ] Las políticas RLS permiten `SELECT` público en `games`/`scores` e `INSERT` anónimo en `scores`
- [ ] `/biblioteca` muestra la card **TETRIS** con su cover visual propio (`.cover-tetris`, distinto de `.cover-asteroides` y otros)
- [ ] `/player/tetris` renderiza el canvas del juego dentro de `.crt-screen` (no la `.game-arena` simulada)
- [ ] El juego es jugable con teclado: `←/→` mover, `↑/X` rotar, `↓` soft drop, `Space` hard drop
- [ ] `player-hud` (PUNTOS / NIVEL) se mantiene sincronizado en tiempo real con el canvas vía callbacks; VIDAS no aparece en HUD
- [ ] Completar líneas actualiza score y nivel correctamente según `LINE_SCORES × nivel`
- [ ] El botón PAUSA detiene el loop; REANUDAR continúa donde quedó
- [ ] Al hacer top-out, el modal de Game Over muestra el puntaje final y permite guardar iniciales
- [ ] Guardar iniciales inserta una fila en Supabase `scores` con `game_id = "tetris"`
- [ ] El score aparece en `/salon` (leaderboard global) y en `/detalle/tetris` (TOP SCORES)
- [ ] En viewport táctil (`pointer: coarse`) aparecen 5 botones (◀ ▶ ↻ ▼ ⬇), cada uno controla el juego correctamente
- [ ] `lib/games/registry.ts` existe y `PlayerClient.tsx` usa el registry sin ningún if-branch hardcodeado por `game.id`
- [ ] `/player/asteroides` sigue funcionando correctamente tras el refactor del registry
- [ ] `lib/games/types.ts` existe con `GameState` y `EngineCallbacks`; `asteroids/engine.ts` importa desde ahí
- [ ] `npm run build` compila sin errores de tipos ni imports rotos

---

## Decisions taken and discarded

- **Registry en `lib/games/registry.ts` (elegido)** vs agregar otro `if (game.id === "tetris")` branch — el if-chain crece O(n) con cada juego nuevo; el registry hace el wiring en O(1), un import + una línea. Este es el momento natural de generalizar: ya existe el precedente `isAsteroides` y este es el segundo port.

- **Tipos compartidos en `lib/games/types.ts` (elegido)** vs duplicar `EngineCallbacks`/`GameState` en cada motor — dos juegos ya usan la misma interfaz; duplicarla garantiza desincronización futura. Mover al archivo compartido es coste mínimo ahora, beneficio acumulativo con cada port siguiente.

- **`onLivesChange` omitido (elegido)** vs incluirlo con valor fijo — Tetris no tiene concepto de vidas; forzar el callback con un valor constante sería ruido semántico. `EngineCallbacks` lo define como opcional (`?`) precisamente para este caso.

- **Preview de siguiente pieza dibujado en canvas principal (elegido)** vs segundo `<canvas>` HTML separado — mantiene `TetrisCanvas.tsx` como componente único sin necesidad de coordinar dos refs ni exponer un segundo canvas al layout de React. El reference original usaba un canvas separado por limitaciones del HTML estático; en React no hay esa restricción.

- **`tetris` como id de catálogo (elegido)** vs `tetro` (nombre que usa el catálogo simulado actual) — `tetris` es el nombre canónico del juego y coincide con el reference folder; `tetro` era un alias provisional del catálogo mock.

- **Canvas interno 300×600 + escalado CSS (elegido)** vs recalcular dimensiones dinámicamente — preserva intacta toda la lógica de colisiones y spawns del reference (que depende de `COLS`, `ROWS`, `BLOCK` fijos); `.crt-screen` se encarga del escalado visual.

- **Eliminar el `setInterval` simulado de score (elegido)** vs mantenerlo para juegos sin canvas real — el refactor del registry es el momento de limpiar ese parche; los juegos simulados restantes en el catálogo no tienen página `/player` funcional todavía, por lo que el `setInterval` no tiene consumidores activos tras el refactor.

---

## Identified risks

- **RLS bloquea inserts anónimos** — Supabase habilita RLS por defecto. Sin políticas, los inserts en `scores` desde el browser fallan silenciosamente. Mitigación: paso 1 verifica/crea las políticas RLS explícitamente.

- **Re-renders frecuentes por callbacks de score** — `onScoreChange` puede dispararse varias veces por segundo (soft drop +1 por celda, hard drop +2 por celda caída). Mitigación: el engine solo dispara el callback cuando el valor realmente cambia (setter privado con comparación antes de llamar al callback).

- **Fugas de memoria al desmontar el canvas** — el RAF loop y los listeners de `window` deben cancelarse/removerse en el cleanup del `useEffect`. `engineRef` debe nullificarse para que el GC libere los recursos del canvas.

- **Render borroso en pantallas high-DPI** — canvas fijo 300×600 escalado por CSS puede verse pixelado en monitores 2x/3x. Si se detecta en la verificación: ajustar `canvas.width/height` con `devicePixelRatio` y `ctx.scale(dpr, dpr)` sin tocar la lógica de coordenadas.

- **Conflicto entre controles táctiles y gestos del navegador** — toques sostenidos pueden disparar scroll/zoom. Mitigación: `touch-action: none` en `.touch-btn` y `e.preventDefault()` en los handlers táctiles.

- **Regresión en Asteroides tras el refactor del registry** — cambiar `PlayerClient.tsx` para usar el registry puede romper el flujo de Asteroides si los props no coinciden exactamente con `GameCanvasProps`. Mitigación: el criterio de aceptación incluye verificar `/player/asteroides` explícitamente tras el refactor; `AsteroidsCanvas` debe actualizar sus props para extender `GameCanvasProps` desde `lib/games/types.ts`.

- **`dropInterval` desincronizado entre pause/resume** — si `lastTime` no se resetea correctamente al reanudar, el primer frame tras el resume acumula todo el tiempo pausado y baja la pieza instantáneamente. Mitigación: al salir de pausa, resetear `lastTime = performance.now()` antes de reanudar el RAF (mismo patrón que el reference).
