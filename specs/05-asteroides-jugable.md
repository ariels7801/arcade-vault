# 05 — Asteroids jugable en /player/asteroides

**Estado:** Implementado
**Depende de:** ninguno (usa la estructura existente de app/player/[id], app/data.ts, UserProvider)
**Fecha:** 2026-06-06
**Objetivo:** Adaptar el juego de Asteroides de `references/started-games/02-asteroids` (vanilla JS + canvas) a un componente React/TS que se monta en `/player/asteroides`, como un juego nuevo del catálogo, jugable con teclado y controles táctiles.

## Scope

### Incluido

- Nueva entrada en `GAMES` (`app/data.ts`) con `id: "asteroides"`, título **ASTEROIDES**, categoría `SHOOTER`, color `cyan`, `cover: "cover-asteroides"` (textos `short`/`long` y valores `best`/`plays` redactados siguiendo el tono neon/arcade de las entradas existentes, mostrados para aprobación)
- Nueva clase CSS `.cover-asteroides` en `app/globals.css`, inspirada en `.cover-rocas` pero con formas/acentos propios (siluetas poligonales de asteroides) para distinguirse en la biblioteca
- Puerto a TypeScript del motor del juego (`lib/games/asteroids/engine.ts`): clases `Ship`, `Asteroid`, `Bullet`, `PowerUp`, `Particle`, funciones de juego (`update`, `draw`, `initGame`, `nextLevel`, colisiones, HUD dibujado en canvas), manteniendo lógica, balance y textos en español del reference tal cual (resolución interna fija 800x600)
- Componente `lib/games/asteroids/AsteroidsCanvas.tsx`:
  - Monta el `<canvas>`, corre el loop con `requestAnimationFrame`, maneja inputs de teclado (flechas + espacio)
  - Expone callbacks `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` para que el player page sincronice su HUD/modal
  - Acepta prop `paused` para detener `update()` (loop sigue corriendo para drawing/overlay "PAUSA" en canvas)
  - Overlay de controles táctiles (girar izq/der, acelerar, disparar) visible en `pointer: coarse`, mapeado a las mismas entradas virtuales (`keys`/`justPressed`) que usa el motor
- Modificar `app/player/[id]/page.tsx`:
  - Detectar `game.id === "asteroides"` y renderizar `AsteroidsCanvas` dentro de `.crt-screen` en lugar de la `.game-arena` simulada
  - Conectar callbacks del canvas a los estados existentes `score`/`lives`/`level`/`gameOver` (se omite el `setInterval` simulado solo para este juego)
  - Reusar el modal de Game Over existente (PUNTUACIÓN FINAL + iniciales + GUARDAR → `av_scores`) sin cambios de flujo
  - El botón PAUSA existente controla la prop `paused` del canvas
- Estilos CSS para el overlay de controles táctiles en `app/globals.css` (consistentes con `btn ghost`/`btn magenta`)

### Fuera de scope

- Adaptar otros juegos del catálogo (`bricks`, `tetro`, `snake`, `rocas`, etc.) — queda para specs futuras, una por juego
- Arquitectura genérica de "game adapters" para enchufar cualquier juego al player — se evalúa después de validar el patrón con Asteroids
- Sonido/música
- Guardar replay, estadísticas avanzadas o leaderboard online (Supabase) — `av_scores` sigue en localStorage como hoy
- Modificar la entrada existente `"rocas"` — sigue siendo un juego simulado, sin tocar
- Soporte de gamepad físico

## Data model

Nuevas estructuras (TypeScript), todas en `lib/games/asteroids/`:

```ts
// engine.ts
export type GameState = "playing" | "dead" | "gameover";

export interface EngineCallbacks {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
}

// Clases portadas tal cual del reference (mismos campos, tipados):
// Bullet, Asteroid, Ship, Particle, PowerUp
// + objeto/clase Engine que encapsula el estado mutable
//   (ship, bullets, asteroids, particles, powerups, score, lives, level, state)
//   y los métodos initGame/nextLevel/update/draw, invocando los callbacks
//   en los puntos donde cambian score/lives/level/state

// AsteroidsCanvas.tsx
export interface AsteroidsCanvasProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

La nueva entrada del catálogo (`{ id: "asteroides", ... }` en `app/data.ts`) usa la interfaz `Game` ya existente — no se agrega ningún tipo nuevo ahí.

No se introduce persistencia nueva — el guardado de score sigue usando `av_scores` en `localStorage` vía el flujo existente de `app/player/[id]/page.tsx` (`{ game: "asteroides", score, name, at }`).

## Implementation plan

1. **Agregar entrada del juego** — en `app/data.ts`, añadir al array `GAMES`:

   ```ts
   {
     id: "asteroides",
     title: "ASTEROIDES",
     short: "<frase corta a redactar>",
     long: "<2-3 frases descriptivas a redactar>",
     cat: "SHOOTER",
     cover: "cover-asteroides",
     color: "cyan",
     best: <número de ejemplo>,
     plays: "<número de ejemplo>",
   }
   ```

   (textos y números exactos se muestran para aprobación antes de escribir el spec final)

2. **Cover CSS** — crear `.cover-asteroides` en `app/globals.css`, siguiendo el patrón de `.cover-rocas` (gradiente de fondo + pseudo-elementos decorativos) pero con formas propias (siluetas poligonales) para diferenciarse visualmente en `/biblioteca`

3. **Portar el motor a TypeScript** — crear `lib/games/asteroids/engine.ts`:
   - Trasladar constantes (`TRIPLE_SHOT_DURATION`, `RADII`, `SPEEDS`, `POINTS`, etc.), utilidades (`wrap`, `dist`, `rand`, `randInt`) y clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` tal cual, con tipos explícitos
   - Encapsular el estado mutable (`ship`, `bullets`, `asteroids`, `particles`, `powerups`, `score`, `lives`, `level`, `state`, `deadTimer`) y las funciones `initGame`, `nextLevel`, `explode`, `killShip`, `update`, `draw`, `drawHUD`, `drawOverlay`, `drawLifeIcon` en una clase/objeto `Engine` que recibe un `CanvasRenderingContext2D` y un objeto `EngineCallbacks`
   - Insertar las llamadas a `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver` en los puntos donde el reference muta `score`, `lives`, `level` y entra a `state === 'gameover'`

4. **Componente de canvas** — crear `lib/games/asteroids/AsteroidsCanvas.tsx` (`"use client"`):
   - `useRef` al `<canvas width={800} height={600}>`, instanciar `Engine` en un `useEffect`
   - Loop con `requestAnimationFrame`, replicando `loop(ts)`/`dt` del reference; si `paused === true`, omitir `engine.update(dt)` pero seguir llamando `engine.draw()` + dibujar overlay "PAUSA"
   - Listeners de teclado (`keydown`/`keyup`) scoped al componente (agregar/remover en mount/unmount), replicando `keys`/`justPressed`/`pressed`
   - CSS: `<canvas style={{ width: "100%", height: "100%" }}>` para escalar dentro de `.crt-screen` manteniendo resolución interna 800x600

5. **Controles táctiles** — dentro de `AsteroidsCanvas.tsx`, agregar overlay con 4 botones (◀ ▶ ▲ acelerar, • disparar) posicionados en las esquinas inferiores, visibles solo bajo `@media (pointer: coarse)`. Cada botón en `onTouchStart`/`onTouchEnd` (y `onMouseDown`/`onMouseUp` para testing en desktop) setea/limpia las mismas entradas virtuales que lee el motor (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`)

6. **Estilos de controles táctiles** — agregar a `app/globals.css` las clases del overlay (`.touch-controls`, `.touch-btn`, etc.), reusando la paleta neon/`btn ghost`/`btn magenta` existente

7. **Integrar en el player page** — en `app/player/[id]/page.tsx`:
   - Si `game.id === "asteroides"`: omitir el `setInterval` simulado de score y renderizar `<AsteroidsCanvas paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={(final) => { setScore(final); setGameOver(true); }} />` dentro de `.crt-screen` en lugar del marcado decorativo
   - Para otros juegos, mantener el comportamiento simulado actual sin cambios
   - Agregar el setter para `lives` (hoy es `useState(3)` sin setter) para que `AsteroidsCanvas` pueda actualizarlo

8. **Verificar en browser** — navegar a `/player/asteroides`:
   - Confirmar que la card "ASTEROIDES" aparece en `/biblioteca` con su cover propio
   - Jugar con teclado (mover, disparar, romper asteroides, recoger power-up, pasar de nivel)
   - Confirmar que `player-hud` (PUNTOS/VIDAS/NIVEL) se actualiza en sincronía con el HUD dibujado en canvas
   - Probar PAUSA (loop se detiene, overlay "PAUSA" visible) y reanudar
   - Perder las 3 vidas → modal de Game Over aparece con el puntaje final, guardar iniciales → verificar entrada en `localStorage.av_scores` con `game: "asteroides"`
   - Emular viewport táctil (`pointer: coarse` / DevTools mobile) → controles on-screen visibles y funcionales

## Acceptance criteria

- [ ] `GAMES` en `app/data.ts` incluye una entrada `{ id: "asteroides", title: "ASTEROIDES", cat: "SHOOTER", color: "cyan", cover: "cover-asteroides", ... }`
- [ ] `/biblioteca` muestra la card "ASTEROIDES" con su propio cover visual (`.cover-asteroides`, distinto de `.cover-rocas`)
- [ ] `/player/asteroides` renderiza el canvas del juego dentro de `.crt-screen` (no la `.game-arena` simulada)
- [ ] El juego es jugable con teclado: flechas para girar/acelerar, espacio para disparar
- [ ] Los asteroides se rompen en fragmentos al ser impactados, otorgan puntos según tamaño, y aparecen power-ups de disparo triple
- [ ] Al perder las 3 vidas, el canvas dispara `onGameOver` y aparece el modal de React "GAME OVER" con el puntaje final (no el overlay del reference)
- [ ] `player-hud` (PUNTOS/VIDAS/NIVEL) se mantiene sincronizado en tiempo real con el estado del canvas vía los callbacks
- [ ] El botón PAUSA detiene el loop del juego (asteroides/nave dejan de moverse) y muestra overlay "PAUSA"; REANUDAR continúa donde quedó
- [ ] Guardar iniciales en el modal persiste una entrada en `localStorage.av_scores` con `game: "asteroides"`
- [ ] En viewport táctil (`pointer: coarse`), aparece un overlay con botones de girar izq/der, acelerar y disparar, y cada uno controla la nave correctamente
- [ ] En viewport con mouse/teclado (`pointer: fine`), el overlay de controles táctiles no se muestra
- [ ] El canvas escala correctamente para llenar `.crt-screen` en distintos tamaños de pantalla, sin distorsionar proporciones (mantiene 4:3)
- [ ] `npm run build` compila sin errores de tipos ni imports rotos

## Decisions taken and discarded

- **Juego nuevo "asteroides" (elegido)** vs reusar la entrada existente "rocas" — "rocas" es un juego del catálogo simulado y diferente; mezclar el Asteroids real ahí confundiría su identidad. Se crea una entrada propia y "rocas" queda intacto para una futura adaptación independiente.

- **El motor dibuja su propio HUD en canvas (elegido)** vs que React dibuje los stats — evita duplicar/desincronizar números; el `player-hud` de React se reduce a marco (jugador + botones), y el canvas es la única fuente de verdad visual del estado del juego.

- **Canvas notifica vía callbacks, React muestra el modal de Game Over existente (elegido)** vs el overlay "GAME OVER" del reference — evita superponer dos pantallas de fin de juego y reusa el flujo de guardado de `av_scores` ya construido.

- **Pausa real integrada al loop (elegido)** vs quitar el botón para este juego — mantiene consistencia de controles entre juegos de la plataforma; se logra simplemente condicionando la llamada a `update()`.

- **Resolución interna fija 800x600 + escalado CSS (elegido)** vs recalcular dimensiones dinámicamente — preserva intacta toda la lógica de spawns/colisiones/dibujo del reference (que depende de constantes `W`/`H`); el `aspect-ratio: 4/3` de `.crt-screen` calza naturalmente con 800x600.

- **Motor portado en `lib/games/asteroids/` (elegido)** vs vivir dentro de `app/player/[id]/` — separa lógica pura de wiring a React y deja un patrón reutilizable si se decide construir una arquitectura genérica de juegos más adelante.

- **Controles táctiles con overlay sobre el canvas (elegido)** vs barra fija debajo del CRT — no agrega altura permanente a la página y solo aparece en dispositivos táctiles (`pointer: coarse`), manteniendo la pantalla limpia en desktop.

- **Cover propio `.cover-asteroides` (elegido)** vs reusar `.cover-rocas` — dos juegos distintos no deberían compartir el mismo cover visual en la biblioteca; se crea una variante con formas propias inspirada en la paleta espacial existente.

## Identified risks

- **Re-renders de React por cambios frecuentes de score** — el motor llama `onScoreChange` en cada impacto; si dispara `setState` en cada frame podría generar renders excesivos del player page. Mitigación: solo invocar el callback cuando el valor realmente cambia (no en cada `update`), tal como ya hace el reference (`score += POINTS[...]` solo en colisión).

- **Fugas de memoria al salir de la página a mitad de partida** — el loop (`requestAnimationFrame`) y los listeners de teclado deben limpiarse en el `useEffect` cleanup al desmontar `AsteroidsCanvas` (ej. al navegar a "BIBLIOTECA" desde el modal de Game Over o antes de terminar la partida).

- **Render borroso en pantallas de alta densidad (high-DPI)** — al fijar la resolución interna en 800x600 y escalar por CSS, el canvas puede verse pixelado en monitores 2x/3x. Si se nota en la verificación, se puede ajustar `canvas.width/height` con `devicePixelRatio` y `ctx.scale(dpr, dpr)` sin tocar la lógica de coordenadas (que sigue operando en 800x600).

- **Conflicto entre controles táctiles y gestos del navegador** — toques sostenidos sobre los botones podrían disparar scroll/zoom del navegador. Mitigación: `touch-action: none` en `.touch-btn` y `e.preventDefault()` en los handlers táctiles.
