# Sugerencias de juegos — To-Do

> Mantenido por el agente `game-planner`. No editar manualmente sin avisar al agente.

## 🟡 Sugeridos (pendientes de decisión)

| ID | Título | Categoría | Color | Descripción breve | Justificación | Fecha |
| --- | ------ | --------- | ----- | ----------------- | ------------- | ----- |
| `rana` | CYBER FROG | MAZE | green | Cruza calles y ríos mortales guiando a tu rana hacia la meta sin ser aplastado ni ahogado. | Cubre la categoría MAZE, ausente en el catálogo; mecánica de cuadrícula con colisiones por zona, 100% Canvas 2D. | 2026-06-08 |
| `snake` | PIXEL SNAKE | ARCADE | green | Devora píxeles y crece sin fin evitando que tu serpiente colisione con su propia cola. | Clásico icónico de ARCADE de bajo riesgo; mecánica de grilla simple. | 2026-06-08 |
| `duelo` | PIXEL DUEL | VERSUS | magenta | Enfréntate a la IA en un duelo de disparos 1v1 donde reflejos y posición lo deciden todo. | Única categoría VERSUS en el catálogo; diferenciación clara frente a SHOOTER y ARCADE. | 2026-06-08 |
| `laberinto` | LABYRINTH RUN | MAZE | violet | Navega un laberinto generado proceduralmente recogiendo llaves antes de que el temporizador expire. | Variante MAZE distinta a Frogger; generación DFS aporta rejugabilidad infinita sin assets externos. | 2026-06-08 |
| `sombra` | SHADOW MAZE | MAZE | indigo | Explora un laberinto oscuro con visión limitada buscando la salida mientras enemigos patrullan en las sombras. | MAZE con fog-of-war; diferenciación clara respecto a `laberinto` y `rana`. | 2026-06-08 |
| `saltarin` | PIXEL JUMP | PLATFORMER | orange | Salta de plataforma en plataforma ascendiendo sin límite evitando enemigos y obstáculos a velocidad creciente. | PLATFORMER ausente del catálogo; mecánica de salto con gravedad vía delta-time, Canvas 2D puro. | 2026-06-08 |
| `caverna` | CAVERN RUNNER | PLATFORMER | amber | Corre sin parar por cavernas generadas infinitamente esquivando estalactitas y trampas a velocidad creciente. | Runner infinito one-button, generación procedural de segmentos de nivel. | 2026-06-08 |
| `azotea` | ROOFTOP HOP | PLATFORMER | rose | Salta entre azoteas urbanas de anchura y altura aleatorias acumulando puntos antes de caer al vacío. | PLATFORMER con pantalla estática, sin scroll; diferenciado de `saltarin` y `caverna`. | 2026-06-08 |
| `pong` | NEON PONG | ARCADE | violet | Devuelve la pelota con precisión creciente y supera al oponente antes de que el rally se vuelva imposible. | Arquetipo del género ARCADE; mecánica de raqueta + pelota 100% Canvas 2D. | 2026-06-08 |
| `centipede` | CENTIPEDE STRIKE | ARCADE | lime | Destruye el ciempiés segmento a segmento mientras los hongos del campo complican cada disparo. | Sub-género shooter-arcade de torreta fija, diferente a Asteroides y Snake. | 2026-06-08 |
| `breakout` | BREAKOUT TURBO | ARCADE | orange | Rompe todos los bloques con una pelota acelerada antes de que escape por el fondo. | Variante Arkanoid sin power-ups, énfasis en velocidad pura; física de colisión rectangular trivial. | 2026-06-08 |
| `beat-blaster` | BEAT BLASTER | RHYTHM | pink | Pulsa al ritmo exacto de la música generada proceduralmente y encadena combos para multiplicar tu puntuación. | Introduce la categoría RHYTHM ausente; ritmo procedural elimina dependencias de licencias. | 2026-06-08 |
| `drum-duel` | DRUM MACHINE DUEL | RHYTHM | yellow | Replica patrones de batería que se vuelven más complejos en cada ronda y demuestra tu precisión rítmica. | Segunda entrada RHYTHM con mecánica distinta (memoria + reproducción vs. reacción); Web Audio API puro. | 2026-06-08 |
| `pong-duel` | PONG DUEL | VERSUS | violet | Defiende tu arco y supera a la IA en el clásico de raquetas donde cada rebote aumenta la velocidad. | Segundo VERSUS; complementa a `duelo` (disparos) con género de raqueta distinto. | 2026-06-08 |
| `tank-battle` | TANK BATTLE | VERSUS | lime | Maneja tu tanque pixel-art en un laberinto y destruye al oponente antes de que te alcance. | Tercer VERSUS; movimiento rotacional + proyectiles con rebote, mecánica radicalmente diferente. | 2026-06-08 |
| `neon-racer` | NEON RACER | RACING | orange | Conduce a máxima velocidad por pistas de neón esquivando tráfico y acumulando turbo. | RACING sin representante en catálogo; top-down scroll vertical, el approach más factible en Canvas 2D. | 2026-06-08 |
| `outrun-drift` | OUTRUN DRIFT | RACING | red | Surca carreteras infinitas con perspectiva de camino curvado y bate el crono antes de que expire. | RACING con estética OutRun; pseudo-3D por segmentos proyectados en 2D, sin dependencias externas. | 2026-06-08 |
| `speed-bikes` | SPEED BIKES | RACING | yellow | Adelanta motos rivales en una autopista infinita cambiando de carril, recogiendo nitro y sobreviviendo al tráfico. | RACING con cambio de carril discreto (3 carriles), menor riesgo técnico del trío RACING. | 2026-06-08 |
| `invaders` | SPACE RAID | SHOOTER | green | Defiende la Tierra disparando a oleadas de invasores alienígenas que descienden cada vez más rápido. | DB stub listo; Space Invaders clásico, patrón de movimiento en grilla + disparos, 100% Canvas 2D. | 2026-06-08 |
| `rocas` | ROCAS DRIFT | SHOOTER | cyan | Pilota una nave en un cinturón de asteroides y destruye rocas que se fragmentan en pedazos más pequeños. | DB stub listo; mecánica de fragmentación progresiva diferencia de `asteroides`. | 2026-06-08 |
| `tetro` | TETRO VAULT | PUZZLE | magenta | Coloca piezas en un tablero con perspectiva isométrica simulada y completa capas antes de que el nivel suba. | DB stub listo; variante Tetris con twist visual isométrico. | 2026-06-08 |
| `bricks` | NEON BRICKS | PUZZLE | cyan | Rompe todos los bloques de neón con una pelota rebotante antes de que se agoten las vidas. | DB stub listo; Breakout/Arkanoid con estética neón, física de rebote pura. | 2026-06-08 |
| `minesweeper-blitz` | MINESWEEPER BLITZ | PUZZLE | yellow | Despeja un campo minado contrarreloj usando lógica deductiva; cada error detona una reacción en cadena. | PUZZLE de lógica pura ausente; estilo contemplativo/estratégico contrasta con todos los juegos actuales. | 2026-06-08 |

## 🟢 Aceptados / en desarrollo

| ID | Título | Spec | Fecha aceptado |
| --- | ------ | ---- | -------------- |

## ✅ Implementados

| ID | Título | Categoría | Fecha |
| --- | ------ | --------- | ----- |
| `asteroides` | ASTEROIDES | SHOOTER | — |
| `tetris` | TETRIS | PUZZLE | — |

## ❌ Descartados

| ID | Título | Motivo | Fecha |
| --- | ------ | ------ | ----- |
