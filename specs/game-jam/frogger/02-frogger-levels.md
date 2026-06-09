# SPEC — FROGGER: Sistema de niveles con dificultad progresiva

> **Estado:** Propuesto
> **Depende de:** 01-frogger-core
> **Fecha:** 2026-06-08
> **Objetivo:** Definir el sistema de dificultad progresiva de FROGGER: diseño detallado de cada nivel (configuración de carriles, velocidades, patrones de entidades, timer), pantalla de nivel completado, y comportamiento especial de tortugas desde nivel 3 en adelante.

---

## Scope

**In:**
- Función `buildLanes(level: number): Lane[]` con configuración explícita por nivel (1–8) y fórmula genérica para nivel 9+
- Tabla de parámetros por nivel: velocidades base, número de entidades, gaps, frecuencia de inmersión de tortugas
- Pantalla de transición "nivel completado" dibujada en canvas (2 segundos) antes de iniciar el nivel siguiente
- Comportamiento de tortugas con ciclo de inmersión configurable por nivel (desde nivel 3: ciclos más cortos)
- Variación visual por zona de nivel (tonos de asfalto y río cambian según nivel par/impar)
- Bonus de tiempo progresivo: la fórmula `SCORE_TIME_BONUS * level` reemplaza `SCORE_TIME_BONUS` fijo del core
- Timer decreciente ajustado por nivel: nivel 1 = 30 s, reducción de 2 s por nivel, mínimo 16 s (nivel 8+)

**Fuera de alcance:**
- Controles táctiles/mobile
- Supabase Auth/RLS
- Realtime en leaderboard
- Nuevos tipos de entidades más allá de coches, troncos y tortugas
- Modos de juego alternativos (endless, contrarreloj independiente)
- Editor de niveles

---

## Data model

No requiere cambios en la tabla `games` ni `scores`. Todo el estado de niveles es en memoria, parte del `Engine`.

### Estado de nivel en `Engine`

```ts
interface LevelConfig {
  level: number;
  timeLimit: number;         // segundos disponibles por intento de cruce
  speedMultiplier: number;   // factor aplicado a todas las velocidades base
  turtleDiveInterval: number; // segundos entre ciclos de inmersión
  turtleDiveDuration: number; // segundos que la tortuga permanece sumergida
  roadLanes: RoadLaneConfig[];
  riverLanes: RiverLaneConfig[];
}

interface RoadLaneConfig {
  direction: 1 | -1;
  baseSpeed: number;    // px/s antes del multiplicador
  carCount: number;
  carWidth: number;
}

interface RiverLaneConfig {
  direction: 1 | -1;
  baseSpeed: number;
  entityKind: "log" | "turtle";
  entityCount: number;
  entityWidth: number;  // para logs; para turtles = entityCount * 40 + gaps
  groupSize?: number;   // para turtles: cuántas por grupo
}
```

### Tabla de niveles (niveles 1–8)

| Nivel | Timer | SpeedMult | DiveInterval | DiveDuration | Notas clave                                      |
|-------|-------|-----------|--------------|--------------|--------------------------------------------------|
| 1     | 30 s  | 1.00×     | —            | —            | Sin inmersión de tortugas                        |
| 2     | 28 s  | 1.15×     | —            | —            | Coches más rápidos, troncos más cortos           |
| 3     | 26 s  | 1.30×     | 6 s          | 1.5 s        | Tortugas empiezan a sumergirse                   |
| 4     | 24 s  | 1.45×     | 5 s          | 1.8 s        | Un carril de río extra sin troncos en un flanco  |
| 5     | 22 s  | 1.60×     | 4 s          | 2.0 s        | Coches en carril 3 de velocidad máxima          |
| 6     | 20 s  | 1.75×     | 3.5 s        | 2.0 s        | Grupos de tortugas reducidos a 2                 |
| 7     | 18 s  | 1.90×     | 3 s          | 2.2 s        | Troncos más cortos (ancho mínimo 96 px)          |
| 8+    | 16 s  | 2.00×     | 2.5 s        | 2.5 s        | Cap de velocidad; tortugas casi siempre sumergidas|

### Configuración de carriles nivel 1 (referencia base)

**Zona de carretera (carriles road, filas 1–5, de abajo hacia arriba):**

| Fila | Dirección | Velocidad base | Coches | Ancho coche |
|------|-----------|---------------|--------|-------------|
| 1    | →         | 70 px/s       | 3      | 80 px       |
| 2    | ←         | 80 px/s       | 2      | 96 px       |
| 3    | →         | 60 px/s       | 3      | 80 px       |
| 4    | ←         | 90 px/s       | 2      | 112 px      |
| 5    | →         | 75 px/s       | 3      | 80 px       |

**Zona de río (carriles river, filas 7–12, de abajo hacia arriba):**

| Fila | Dirección | Vel. base | Entidad | Cantidad | Ancho    |
|------|-----------|-----------|---------|----------|----------|
| 7    | →         | 50 px/s   | log     | 3        | 160 px   |
| 8    | ←         | 65 px/s   | turtle  | 3 grupos | 2 por grp|
| 9    | →         | 55 px/s   | log     | 2        | 200 px   |
| 10   | ←         | 70 px/s   | turtle  | 3 grupos | 3 por grp|
| 11   | →         | 60 px/s   | log     | 3        | 140 px   |
| 12   | ←         | 80 px/s   | turtle  | 2 grupos | 2 por grp|

---

## Implementation plan

### Paso 1 — Extraer `buildLanes` a módulo propio

Crear `lib/games/frogger/levels.ts` con:

1. Array `LEVEL_CONFIGS: LevelConfig[]` con entradas para niveles 1–8 (valores de la tabla de arriba)
2. Función `getLevelConfig(level: number): LevelConfig`:
   - Si `level <= 8`, retorna `LEVEL_CONFIGS[level - 1]`
   - Si `level > 8`, toma la config de nivel 8 y aplica: `speedMultiplier = Math.min(2.0 + (level - 8) * 0.05, 3.0)`, `turtleDiveInterval = Math.max(2.5 - (level - 8) * 0.1, 1.0)`, `timeLimit = 16`
3. Función `buildLanes(level: number): Lane[]` que llama `getLevelConfig(level)` y construye el array de `Lane[]` con posiciones Y calculadas, velocidades aplicadas (`baseSpeed * config.speedMultiplier`) y entidades generadas con `spawnEntities(laneConfig, canvasW)`
4. Función `spawnEntities(cfg: RoadLaneConfig | RiverLaneConfig, canvasW: number): Entity[]`:
   - Para coches: distribuye `cfg.carCount` coches con gaps uniformes (`canvasW / carCount`) con jitter ±20px; dirección determina velocidad positiva/negativa
   - Para troncos: distribuye con gaps mínimos de 80px entre troncos (para que la rana pueda saltar)
   - Para tortugas: genera grupos de `cfg.groupSize` tortugas consecutivas con 4px de gap interno; gap entre grupos ≥ 60px

**Verificación:** `buildLanes(1)` produce 14 `Lane` con types correctos; `buildLanes(5)` produce velocidades 1.60× mayores que nivel 1.

### Paso 2 — Timer ajustado por nivel

En `Engine.initGame()` y en el handler de nivel completado:

```ts
const cfg = getLevelConfig(this.level);
this.timer = cfg.timeLimit;
this.turtleDiveInterval = cfg.turtleDiveInterval;
this.turtleDiveDuration = cfg.turtleDiveDuration;
```

En `Engine.update(dt)`:
- `this.timer -= dt`
- Si `this.timer <= 0` → muerte por tiempo agotado (igual que colisión)

Bonus de tiempo al llegar a casa:
```ts
const timeBonus = Math.floor(this.timer) * SCORE_TIME_BONUS * this.level;
this.score += SCORE_HOME + timeBonus;
```

**Verificación:** En nivel 1, llevar rana a casa con 25 s restantes = 50 + (25 × 10 × 1) = 300 pts. En nivel 3, mismos 25 s restantes = 50 + (25 × 10 × 3) = 800 pts.

### Paso 3 — Ciclo de inmersión de tortugas

En `Engine`, cada grupo de tortugas tiene su propio estado de inmersión:

```ts
interface TurtleGroup {
  entities: Entity[];     // las tortugas del grupo
  diveTimer: number;      // cuenta hacia diveInterval
  diving: boolean;        // true = están bajando
  diveProgress: number;   // 0.0 → 1.0 durante la inmersión
}
```

En `update(dt)` para cada `TurtleGroup` de cada carril river:
1. Si `!diving`: `diveTimer += dt`; si `diveTimer >= turtleDiveInterval`: `diving = true`, `diveTimer = 0`, `diveProgress = 0`
2. Si `diving`: `diveProgress += dt / turtleDiveDuration`; actualizar `entity.active = diveProgress < 0.8` (se vuelven peligrosas al 80% de inmersión para dar margen visual); si `diveProgress >= 1.0`: `diving = false`, `diveProgress = 0`
3. La rana muere si está en una tortuga con `!entity.active`

En `draw()`:
- Tortugas con `diving && diveProgress > 0.5`: dibujar con alpha `1.0 - diveProgress` (desvanecen)
- Tortugas `!active`: no dibujar (completamente sumergidas)

**Verificación:** Con `turtleDiveInterval = 6, turtleDiveDuration = 1.5` (nivel 1), las tortugas emergen 6 s, se sumergen 1.5 s, ciclo de 7.5 s. Con nivel 8 (`interval=2.5, duration=2.5`), ciclo de 5 s con 50% del tiempo sumergidas.

### Paso 4 — Pantalla de transición "Nivel completado"

Cuando `homesReached.length === HOME_COUNT` (5 casas completadas):

1. Cambiar estado interno del engine a `"levelComplete"`
2. En `draw()`, si estado es `"levelComplete"`: dibujar overlay sobre el canvas:
   ```
   Fondo negro semitransparente (alpha 0.7) cubriendo canvas completo
   Texto centrado:
     "¡NIVEL COMPLETADO!" — fuente 32px bold, color #00ff44
     "NIVEL X" — fuente 24px, color blanco
     "BONUS: +1000 pts" — fuente 20px, color amarillo
   Animación: texto con `Math.sin(t * 4) * 4` en Y para efecto de pulso
   ```
3. Timer de transición: 2 segundos en estado `"levelComplete"`, luego:
   - Incrementar level, disparar `onLevelChange(level)`
   - Sumar `SCORE_ALL_HOMES` al score, disparar `onScoreChange(score)`
   - `buildLanes(level)`, limpiar `homesReached`, respawnear rana
   - Cambiar estado a `"playing"`
4. Durante `"levelComplete"`, `update(dt)` no procesa input ni colisiones ni mueve entidades (el juego congela mientras se muestra la transición)

**Verificación:** Al completar nivel 1, pantalla muestra overlay 2 s; al desaparecer, entidades van visiblemente más rápidas.

### Paso 5 — Variación visual por nivel

En `draw()`, el color de fondo de los carriles varía según `(level % 2)`:

```ts
// Carretera
const roadColor = level % 2 === 0 ? "#1a1a2e" : "#1a1a1a";  // azulado / neutro
// Río
const riverColor = level % 2 === 0 ? "#001833" : "#002244";   // azul profundo / índigo

// A partir del nivel 5: añadir tinte naranja a los coches
const carColors = level >= 5
  ? ["#ff4400", "#ff6600", "#ffaa00"]   // carretera nocturna / atardecer
  : ["#cc2200", "#ffffff", "#ffdd00"];  // esquema clásico
```

Esta variación es puramente visual; no altera la lógica de colisiones.

**Verificación:** El aspecto visual cambia perceptiblemente al pasar de nivel 1 a 2.

### Paso 6 — Integración con Engine existente

Actualizar `lib/games/frogger/engine.ts` del spec core para:
1. Importar `buildLanes`, `getLevelConfig` desde `./levels`
2. En constructor: `this.lanes = []` (array vacío hasta `initGame()`)
3. En `initGame()`: reemplazar llamada directa a `buildLanes` hardcodeada por `buildLanes(this.level)` + aplicar `getLevelConfig` para timer y parámetros de tortugas
4. En `update()`: integrar lógica de `TurtleGroup`, timer de nivel, estado `"levelComplete"`

**Verificación:** `initGame()` sin cambios de interfaz pública; el componente `FroggerCanvas.tsx` no requiere modificaciones.

---

## Acceptance criteria

- [ ] `lib/games/frogger/levels.ts` exporta `LEVEL_CONFIGS`, `getLevelConfig` y `buildLanes`
- [ ] `buildLanes(1)` retorna 14 Lane con los tipos y velocidades correctos según la tabla
- [ ] `buildLanes(5)` retorna velocidades 1.60× respecto a `buildLanes(1)` para cada carril equivalente
- [ ] `getLevelConfig(9)` retorna `speedMultiplier > 2.0` (fórmula post-nivel 8 activa)
- [ ] Timer del nivel 1 es 30 s; nivel 5 es 22 s; nivel 8+ es 16 s
- [ ] Agotar el timer causa pérdida de vida y reinicio del timer al valor de `getLevelConfig(level).timeLimit`
- [ ] Bonus de tiempo al llegar a casa = `floor(timer) * 10 * level`
- [ ] Tortugas en nivel 1 no se sumergen (sin ciclo de inmersión)
- [ ] Tortugas en nivel 3+ se sumergen con el intervalo/duración configurados
- [ ] Rana sobre tortuga sumergida (diveProgress ≥ 0.8) muere
- [ ] Pantalla de transición aparece 2 s al completar 5 casas, luego inicia nivel siguiente
- [ ] Durante la transición, el motor no procesa input ni colisiones
- [ ] Overlay de transición muestra nivel completado + bonus pts
- [ ] Variación de color de carriles entre niveles par/impar es visible
- [ ] `FroggerCanvas.tsx` no requiere modificaciones para soportar el sistema de niveles
- [ ] `npm run build` sin errores de tipos

---

## Decisions

- **Sí: Módulo `levels.ts` separado del motor** — Razón: el motor (`engine.ts`) ya es extenso; separar la configuración de niveles mantiene cada archivo con una sola responsabilidad. `buildLanes` es configuración pura sin efectos secundarios; testeable de forma independiente.
- **Sí: Cap de velocidad en 3.0× para niveles >8** — Razón: por encima de 3× los coches cruzan la pantalla completa en menos de 0.16 s; a 60 fps (frame cada 0.016 s) hay menos de 10 frames para reaccionar, lo que hace el juego injugable incluso para jugadores expertos.
- **Sí: Timer mínimo de 16 s** — Razón: por debajo de 16 s no hay tiempo suficiente para cruzar los 13 carriles desde el inicio incluso moviéndose perfectamente a cada frame, lo que convierte el juego en injusto en lugar de difícil.
- **Sí: Tortugas empiezan a sumergirse en nivel 3** — Razón: nivel 1 y 2 sirven de tutorial implícito; introducir la mecánica de inmersión en nivel 3 da al jugador tiempo para aprender el resto de mecánicas antes.
- **Sí: Transición de 2 s congelando el motor** — Razón: dar feedback claro al jugador y evitar que el cambio de velocidad sea abrupto e inesperado. 2 s es suficiente para leer el overlay sin interrumpir el ritmo arcade.
- **No: Bosses ni enemigos especiales** — Razón: la mecánica de Frogger se basa en patrones de obstáculos, no en enemigos con comportamiento propio; añadir un boss rompería la coherencia del diseño clásico. Se puede considerar en un spec futuro como variante temática.
- **No: Controles táctiles** — Razón: fuera de alcance; el D-pad virtual requeriría un spec dedicado de UI overlay con 4 botones posicionados sobre el canvas.
- **No: Supabase Auth/RLS** — Razón: fuera de alcance de la plataforma.
- **No: Realtime en leaderboard** — Razón: fuera de alcance de la plataforma.
