# SPEC — FROGGER jugable en /player/frogger

> **Estado:** Propuesto
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-06-08
> **Objetivo:** Implementar FROGGER como juego playable en la plataforma Arcade Vault, con mecánica de cruce de calles y ríos, integración completa con Supabase (tabla `games`, tabla `scores`) y registro en `GAME_REGISTRY`.

---

## Scope

**In:**
- Nueva fila en tabla `games` de Supabase (`id: "frogger"`, `cat: "ARCADE"`, `color: "green"`)
- Nueva clase CSS `.cover-frogger` en `app/globals.css`
- Motor del juego en `lib/games/frogger/engine.ts`: constantes de mapa, tipos `Lane`, `Car`, `Log`, `Turtle`, `Frog`; funciones de física discreta (movimiento en pasos), detección de colisión, lógica de arrastre por troncos/tortugas, gestión de 5 casas meta
- Componente `lib/games/frogger/FroggerCanvas.tsx` (`"use client"`): RAF loop, inputs de teclado (flechas + WASD), prop `paused`, callbacks `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`
- Registro en `lib/games/registry.ts` (entrada `frogger`)
- Ruta `/player/frogger` ya resuelta por el `PlayerClient.tsx` genérico via registry
- Modal game over estándar: pre-rellena `localStorage.getItem('av_player_name')`, inserta en Supabase `scores`, persiste nombre
- Limpieza de event listeners en el `return` del `useEffect`
- Pausa controlada exclusivamente vía prop `paused`

**Fuera de alcance:**
- Controles táctiles/mobile
- Supabase Auth / RLS por usuario
- Realtime en leaderboard
- Modo multijugador
- Editor de niveles
- Sonido/música (spec separado si aplica)
- Power-ups (spec separado si aplica)

---

## Data model

### Fila en `games` (Supabase)

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'frogger',
  'FROGGER',
  'Cruza calles y ríos sin ser aplastado ni ahogado.',
  'Guía tu rana a través de autopistas mortales y ríos traicioneros esquivando coches y saltando sobre troncos. Lleva las cinco ranas a casa antes de que se acabe el tiempo o pierdas tus tres vidas.',
  'ARCADE',
  'cover-frogger',
  'green'
) ON CONFLICT DO NOTHING;
```

### Tipos TypeScript (`lib/games/frogger/engine.ts`)

```ts
// Tipos de carril
type LaneType = "safe" | "road" | "river" | "home";

interface Lane {
  y: number;          // posición Y en píxeles del carril
  type: LaneType;
  speed: number;      // píxeles/segundo (negativo = izquierda)
  entities: Entity[]; // coches, troncos o tortugas
}

interface Entity {
  kind: "car" | "log" | "turtle";
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;    // tortugas pueden sumergirse (active=false)
}

interface Frog {
  x: number;          // centro X
  y: number;          // centro Y
  moving: boolean;    // animando un paso discreto
  dead: boolean;
  onLog: Entity | null; // tronco/tortuga bajo la rana (null = suelo/muerta)
}

// Props del componente
export interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

### Constantes del motor

```ts
const CANVAS_W = 480;
const CANVAS_H = 560;
const CELL = 48;          // tamaño de celda (rana ocupa 1 celda)
const COLS = 10;          // celdas horizontales
const ROWS = 14;          // filas totales (1 home + 1 water-bank + 6 river + 1 safe + 5 road + 1 start)
const LIVES_INITIAL = 3;
const HOME_COUNT = 5;
const TIME_LIMIT = 30;    // segundos por vida
const STEP_ANIM_MS = 80;  // duración animación de salto en ms

// Puntuación
const SCORE_STEP_FORWARD = 10;   // por cada paso hacia adelante
const SCORE_HOME = 50;           // por llegar a una casa
const SCORE_ALL_HOMES = 1000;    // bonus por completar las 5 casas (subida de nivel)
const SCORE_TIME_BONUS = 10;     // por cada segundo restante al llegar a casa
```

---

## Implementation plan

### Paso 1 — Fila en Supabase

Aplicar vía MCP `apply_migration`:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'frogger',
  'FROGGER',
  'Cruza calles y ríos sin ser aplastado ni ahogado.',
  'Guía tu rana a través de autopistas mortales y ríos traicioneros esquivando coches y saltando sobre troncos. Lleva las cinco ranas a casa antes de que se acabe el tiempo o pierdas tus tres vidas.',
  'ARCADE',
  'cover-frogger',
  'green'
) ON CONFLICT DO NOTHING;
```

Verificar políticas RLS (crear si faltan):

```sql
CREATE POLICY IF NOT EXISTS "public_select_games"  ON games  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "public_select_scores" ON scores FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "anon_insert_scores"   ON scores FOR INSERT WITH CHECK (true);
```

### Paso 2 — Cover CSS

Agregar `.cover-frogger` a `app/globals.css`:

```css
.cover-frogger {
  background: linear-gradient(180deg, #001a00 0%, #003300 50%, #001a00 100%);
  position: relative;
  overflow: hidden;
}
.cover-frogger::before {
  content: "🐸";
  position: absolute;
  font-size: 40px;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  filter: drop-shadow(0 0 8px #00ff44);
}
.cover-frogger::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 46px,
    rgba(0, 255, 68, 0.08) 46px,
    rgba(0, 255, 68, 0.08) 48px
  );
}
```

### Paso 3 — Diseño del mapa de carriles

En `lib/games/frogger/engine.ts`, definir la función `buildLanes(level: number): Lane[]` que construye los 14 carriles del mapa de abajo hacia arriba:

| Índice fila (0=abajo) | Tipo     | Contenido                                    |
|-----------------------|----------|----------------------------------------------|
| 0                     | safe     | Zona de salida (spawn de la rana)            |
| 1–5                   | road     | 5 carriles de carretera con coches           |
| 6                     | safe     | Mediana (zona segura entre carretera y río)  |
| 7–12                  | river    | 6 carriles de río con troncos y tortugas     |
| 13                    | home     | 5 casas meta + 4 zonas letales entre ellas   |

Velocidades base (píxeles/segundo):
- Carriles de carretera: alternados positivo/negativo, rango 60–120 px/s
- Carriles de río: alternados positivo/negativo, rango 50–100 px/s
- Multiplicador por nivel: `baseSpeed * (1 + (level - 1) * 0.15)`, máximo ×2.5

Entidades por carril:
- Coches (road): 2–4 coches por carril, ancho 80px, altura 36px, gap mínimo 100px
- Troncos (river, carriles 7/9/11): 2–3 troncos por carril, ancho 120–200px (aleatorio), altura 36px
- Tortugas (river, carriles 8/10/12): grupos de 2–3 tortugas, ancho 40px c/u, altura 36px; ciclo de inmersión cada 4–6 s (duración 1.5 s)

Casas meta (fila 13): 5 posiciones equidistantes (`x = 24 + i * 96` para `i = 0..4`), ancho 48px cada una. Las zonas entre casas son letales (como la carretera).

### Paso 4 — Motor (`lib/games/frogger/engine.ts`)

Exportar clase `Engine`:

```ts
export class Engine {
  constructor(ctx: CanvasRenderingContext2D, callbacks: FroggerEngineCallbacks) {}

  // API pública
  initGame(): void      // resetea todo, genera lanes, coloca rana en spawn
  update(dt: number): void
  draw(): void

  // Input mutable desde el componente
  readonly input: { justPressed: Record<string, boolean> }
}
```

**`initGame()`:**
1. Resetear score=0, lives=LIVES_INITIAL, level=1, timer=TIME_LIMIT, homesReached=[]
2. Llamar `buildLanes(1)`
3. Colocar rana en celda (4, 0) (centro inferior)
4. Disparar callbacks iniciales: `onScoreChange(0)`, `onLivesChange(3)`, `onLevelChange(1)`

**`update(dt)`:**
1. Si `frog.moving`: avanzar animación de salto; si termina, snap a celda destino
2. Mover todas las entidades de cada carril: `entity.x += lane.speed * dt`; wrap horizontal cuando salen del canvas (`x < -width` → `x = CANVAS_W`, o viceversa)
3. Actualizar ciclo de inmersión de tortugas (timer individual por grupo)
4. Si `!frog.moving`: leer `input.justPressed` para WASD/flechas → calcular celda destino → si dentro de límites, iniciar animación de salto; registrar si el paso fue hacia adelante (y < destino.y → score += SCORE_STEP_FORWARD)
5. Resolver arrastre: si la rana está en un carril river y `frog.onLog != null`: mover `frog.x += entity.speed * dt`; si la rana sale del borde, trigger muerte
6. **Detección de colisiones** (solo cuando `!frog.moving` o al final del salto):
   - Zona road: rana colisiona con coche → muerte
   - Zona river sin `frog.onLog` válido: muerte (ahogamiento)
   - Zona home: rana en posición de casa válida no ocupada → `homesReached.push(homeIndex)`, score += SCORE_HOME + timer * SCORE_TIME_BONUS; si homesReached.length === 5 → nivel completado
   - Zona home pero fuera de casa: muerte
7. Decrementar timer. Si `timer <= 0` → muerte
8. **Muerte:** `lives--`; disparar `onLivesChange(lives)`; si `lives === 0` → `onLivesChange(0)` luego `onGameOver(score)`; sino respawnear rana, reset timer
9. **Nivel completado:** `level++`; `onLevelChange(level)`; `score += SCORE_ALL_HOMES`; `onScoreChange(score)`; reconstruir lanes con nueva velocidad; limpiar homesReached; respawnear rana

**`draw()`:**
1. Fondo por tipo de carril: safe=gris oscuro, road=asfalto gris, river=azul, home=verde oscuro
2. Líneas de carril divisorias
3. Entidades: coches (rectángulos rojos/amarillos/blancos con pequeño highlight), troncos (marrones con textura de veta), tortugas (verdes, más oscuras cuando sumergidas, invisibles al 50% de inmersión)
4. Casas meta: rectángulos verdes brillantes; ocupadas muestran una mini-rana
5. Rana: sprite simple dibujado con primitivas canvas (círculo cuerpo + ojos + patas), orientación girada según último movimiento
6. HUD interno (opcional, mínimo): timer en esquina superior derecha del canvas
7. Animación de muerte: flash rojo 3 frames antes de respawn

### Paso 5 — Componente canvas (`lib/games/frogger/FroggerCanvas.tsx`)

```tsx
"use client";
import { useRef, useEffect } from "react";
import { Engine, type FroggerGameProps } from "./engine";

export default function FroggerCanvas(props: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const callbacksRef = useRef(props);
  const pausedRef = useRef(props.paused);

  // Sincronizar callbacks sin recrear engine
  useEffect(() => { callbacksRef.current = props; }, [props]);
  useEffect(() => { pausedRef.current = props.paused; }, [props.paused]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const engine = new Engine(ctx, {
      onScoreChange: (s) => callbacksRef.current.onScoreChange(s),
      onLivesChange: (l) => callbacksRef.current.onLivesChange(l),
      onLevelChange: (lv) => callbacksRef.current.onLevelChange(lv),
      onGameOver:    (s) => callbacksRef.current.onGameOver(s),
    });
    engineRef.current = engine;
    engine.initGame();

    let rafId: number;
    let lastTime = performance.now();

    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!pausedRef.current) engine.update(dt);
      engine.draw();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    // Keyboard input
    function onKeyDown(e: KeyboardEvent) {
      const keys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD"];
      if (keys.includes(e.code)) {
        e.preventDefault();
        engine.input.justPressed[e.code] = true;
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={560}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

### Paso 6 — Registro en `lib/games/registry.ts`

Añadir entrada `frogger`:

```ts
import dynamic from "next/dynamic";

export const GAME_REGISTRY: Record<string, ComponentType<GameCanvasProps>> = {
  asteroides: dynamic(() => import("./asteroids/AsteroidsCanvas")),
  tetris:     dynamic(() => import("./tetris/TetrisCanvas")),
  frogger:    dynamic(() => import("./frogger/FroggerCanvas")),  // nueva entrada
};
```

### Paso 7 — Modal game over (en `PlayerClient.tsx` existente)

El modal game over ya existe en `PlayerClient.tsx`. Verificar que:
- Pre-rellena el nombre desde `localStorage.getItem('av_player_name')`
- Al guardar, inserta `{ game_id: 'frogger', player_name: name, score, user_id: null }` en tabla `scores`
- Persiste el nombre en `localStorage.setItem('av_player_name', name)`

No requiere cambios en `PlayerClient.tsx` si el patrón ya está implementado para tetris/asteroides.

### Paso 8 — Verificar en browser

- `/biblioteca` → card **FROGGER** con cover `.cover-frogger`
- `/player/frogger` → canvas 480×560 dentro de `.crt-screen`
- Movimiento: flechas y WASD mueven la rana en pasos discretos
- En carretera: colisión con coche → pierde vida, rana vuelve al inicio
- En río: saltar al agua → pierde vida; subirse a tronco → se mueve con él
- Llegar a una de las 5 casas → casa se marca como ocupada, +50 pts + bonus tiempo
- Completar 5 casas → sube de nivel, velocidad aumenta
- 3 vidas agotadas → modal game over con score final
- Guardar nombre → fila en `scores` con `game_id = "frogger"`
- Score visible en `/salon` y `/detalle/frogger`
- PAUSA → loop se detiene; REANUDAR → continúa
- `npm run build` sin errores

---

## Acceptance criteria

- [ ] Fila en tabla `games` con `id = "frogger"` y los 7 campos correctos
- [ ] `/biblioteca` muestra card FROGGER con cover visual propio (`.cover-frogger`)
- [ ] `/player/frogger` renderiza canvas 480×560 dentro de `.crt-screen`
- [ ] Flechas y WASD mueven la rana en pasos discretos de una celda
- [ ] Colisión con coche en zona road → pierde vida, rana respawnea en inicio
- [ ] Rana en zona river sin tronco/tortuga válida → pierde vida (ahogamiento)
- [ ] Rana sobre tronco/tortuga se desplaza con la entidad horizontalmente
- [ ] Tortuga sumergida no soporta a la rana (rana muere)
- [ ] Llegar a casa válida suma puntos (50 + bonus tiempo) y marca la casa como ocupada
- [ ] Completar 5 casas dispara subida de nivel (velocidad +15% por nivel)
- [ ] Timer de 30 s por vida; al agotarse, pierde una vida
- [ ] HUD React muestra PUNTOS, VIDAS y NIVEL sincronizados en tiempo real
- [ ] `onLivesChange(0)` se dispara antes que `onGameOver(score)`
- [ ] Modal game over pre-rellena nombre desde `localStorage`; guardar inserta en `scores`
- [ ] Score visible en `/salon` y `/detalle/frogger`
- [ ] Prop `paused` detiene el loop sin P/Esc en canvas
- [ ] Event listeners limpiados en el `return` del `useEffect`
- [ ] `GAME_REGISTRY` incluye entrada `frogger`
- [ ] `npm run build` sin errores de tipos

---

## Decisions

- **Sí: 3 vidas** — Razón: mecánica original de Frogger; pierde vida al ser atropellado, ahogado, quedar fuera del mapa, o agotar el timer. Refuerza la tensión arcade característica.
- **Sí: `onLivesChange(0)` antes de `onGameOver`** — Razón: convención de la plataforma; el HUD debe mostrar 0 vidas antes de que aparezca el modal.
- **Sí: Canvas 480×560 fijo escalado por CSS** — Razón: simplifica la lógica de colisiones (coordenadas fijas); el escalado visual lo maneja `.crt-screen`.
- **Sí: Movimiento discreto (paso a paso)** — Razón: mecánica definitoria de Frogger; la rana no se desplaza suavemente sino en saltos de una celda, lo que hace la detección de colisiones predecible y el juego más legible.
- **Sí: Celda de 48px** — Razón: `480 / 10 = 48`, encaja perfectamente en 10 columnas; la rana cabe con margen visual y los coches/troncos son múltiplos enteros.
- **No: Controles táctiles** — Razón: fuera de alcance en esta spec; requiere D-pad virtual overlay con 4 botones direccionales, se puede añadir en spec secundaria de controles.
- **No: Supabase Auth/RLS por usuario** — Razón: fuera de alcance de la plataforma actual; scores son anónimos con nombre libre.
- **No: Realtime en leaderboard** — Razón: fuera de alcance.
- **No: Sprites externos (imágenes PNG)** — Razón: no añadir assets binarios; la rana y entidades se dibujan con primitivas canvas (rectángulos, arcos, paths). Mantiene el proyecto libre de dependencias de assets.
- **No: Sonido en este spec** — Razón: sonido es alcance del spec secundario `02-frogger-levels.md` o spec dedicado de audio.
- **Sí: HUD doble (canvas interno + React externo)** — Razón: el canvas dibuja opcionalmente el timer interno; el HUD de React (PUNTOS/VIDAS/NIVEL) lo provee `PlayerClient.tsx` vía callbacks, consistente con el patrón de Tetris y Asteroides.
- **Sí: Wrap horizontal de entidades** — Razón: los coches y troncos se desplazan indefinidamente; al salir por un borde reaparecen por el opuesto, manteniendo el flujo continuo sin necesidad de generar nuevas entidades.
