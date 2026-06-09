---
name: spec-impl-game
description: >
  Implementa un spec de juego aprobado (igual que /spec-impl) y, al terminar,
  detona en secuencia los agentes skin-designer y mobile-porter sobre el juego
  recién implementado. Úsalo para llevar un juego de spec → implementado →
  con skins → mobile-ready con un solo comando.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementador de specs de juego con pulido automático

Este comando es una **especialización de `/spec-impl`**. Hereda sus 4 fases completas y
añade una **Fase 5** que detona `skin-designer` y luego `mobile-porter` sobre el juego
recién implementado, sin intervención del usuario.

## Contexto de sesión

Estado actual del repositorio:
!`git status --short`

Branch actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

---

## Fase 0 — Leer el contrato heredado

Antes de hacer cualquier otra cosa:

1. Lee `~/.claude/skills/spec-impl/SKILL.md` **completo**.
2. Ejecuta las Fases 1–4 de ese skill **verbatim**: no las resumas, no las simplifiques,
   no las omitas. Cada regla, cada bloqueo, cada pausa de `/spec-impl` aplica aquí con
   la misma fuerza.
3. Además, mientras ejecutas esas fases, realiza la **captura del `game-id`** (ver abajo)
   para tenerlo listo en Fase 5.

---

## Captura del `game-id`

Durante la Fase 1/3 de `/spec-impl`, deriva el id del juego así:

1. Toma el slug del spec (ej. `09-frogger-jugable`) y extrae la parte central
   eliminando el número y el sufijo `-jugable` (u otro sufijo genérico): → `frogger`.
2. Confirma que `lib/games/<game-id>/` existe una vez terminada la implementación
   (lo habrás creado tú durante Fase 4).
3. Guarda `<game-id>` y el path `lib/games/<game-id>/<NameCanvas>.tsx` — los necesitas
   para los prompts de Fase 5.

Si la derivación es ambigua, pregunta al usuario antes de continuar.

---

## Fases 1–4 — Heredadas de `/spec-impl`

Ejecutar exactamente como describe `~/.claude/skills/spec-impl/SKILL.md`.

Puntos críticos que **no pueden omitirse**:
- Bloqueo si el estado del spec no significa "Aprobado" (en cualquier idioma).
- Creación/switch de branch `spec-NN-slug` antes de tocar código.
- Implementación paso a paso con pausa y confirmación después de cada paso.
- Al terminar el último paso, mostrar el bloque estándar de `/spec-impl`:

  ```
  ✅ Todos los pasos del plan están implementados.

  Siguiente paso: verificar los criterios de aceptación uno a uno.
  ...
  ```

  **No te detengas aquí.** Inmediatamente después, continúa con Fase 5.

---

## Fase 5 — Post-implementación: skins y mobile (secuencial, sin pausa)

Una vez cerrado el último paso de la implementación:

### Anuncio

```
🎨 Implementación completa. Lanzando pulido automático para `<game-id>`.
   Paso A: skin-designer  →  Paso B: mobile-porter  (secuencial)
```

### Paso A — skin-designer

Lanza el agente `skin-designer` con `subagent_type: "skin-designer"` y el siguiente
prompt (sustituye los placeholders):

```
Aplica los 3 skins canónicos (classic, retro, neon) al juego "<GAME_ID>".

Contexto:
- El archivo canvas del juego está en: lib/games/<GAME_ID>/<NameCanvas>.tsx
- El proyecto NO tiene components/games/ — usa SIEMPRE lib/games/<id>/ como ruta base.
- El selector de temas ya debe existir en la play page o añadirlo como indica tu guía.

Sigue tu guía completa (references/game-with-themes.md, patrón TetrisCanvas, etc.).
Al terminar reporta: skins añadidos, archivos editados, fila actualizada en
references/game-with-themes.md.
```

**Espera** a que skin-designer termine. Relaya su resumen al usuario.

### Paso B — mobile-porter

**Solo cuando Paso A ha terminado**, lanza `mobile-porter` con
`subagent_type: "mobile-porter"` y el prompt:

```
Porta el juego "<GAME_ID>" a mobile portrait.

Contexto:
- El archivo canvas está en: lib/games/<GAME_ID>/<NameCanvas>.tsx
- Sigue tu guía completa (references/mobile-ported-games.md, patrón AsteroidsCanvas,
  GamepadOverlay, etc.).

Al terminar reporta: mapeo de botones aplicado, archivos editados, fila actualizada en
references/mobile-ported-games.md.
```

**Espera** a que mobile-porter termine. Relaya su resumen al usuario.

### Regla de secuencia

NUNCA lanzar Paso A y Paso B en el mismo bloque de herramientas. B **debe** esperar
a que A haya cerrado completamente. Esta secuencia es intencional:
- skin-designer puede añadir campos de color que mobile-porter puede leer.
- Ambos editan el mismo archivo canvas; correrlos en paralelo produciría conflictos.

---

## Cierre

Tras los dos agentes, muestra:

```
✅ Pulido automático completado para `<game-id>`.

skin-designer  →  <resumen de 1 línea de lo que hizo>
mobile-porter  →  <resumen de 1 línea de lo que hizo>

Próximos pasos:
1. Verifica los criterios de aceptación del spec uno a uno.
2. Cuando todos pasen, cambia el estado del spec a "Implementado" (o "Implemented").
3. Haz el commit final y abre un PR desde la branch spec-NN-slug.
```

---

## Resumen de comportamiento esperado

```
/spec-impl-game 09-frogger-jugable

  Fase 0  →  Lee ~/.claude/skills/spec-impl/SKILL.md (contrato heredado)
             Nota game-id candidato: "frogger"

  Fase 1  →  Encuentra specs/09-frogger-jugable.md

  Fase 2  →  Lee estado → "Aprobado" ✅ continúa
             (Si fuera "Borrador" → ❌ bloquea igual que /spec-impl)

  Fase 3  →  git checkout -b spec-09-frogger-jugable
             Muestra objetivo, scope, plan y criterios

  Fase 4  →  Implementa paso a paso con pausas
             Crea lib/games/frogger/FroggerCanvas.tsx, engine.ts, etc.
             Confirma game-id = "frogger"

  Fase 5  →  Anuncia pulido automático
             Paso A: Agent(skin-designer, "frogger") → espera → relaya resumen
             Paso B: Agent(mobile-porter, "frogger") → espera → relaya resumen
             Muestra bloque de cierre con próximos pasos

/spec-impl-game 09-frogger-jugable  (estado: Borrador)

  Fase 1  →  Encuentra specs/09-frogger-jugable.md
  Fase 2  →  Lee estado → "Borrador" → ❌ bloquea
             Muestra error estándar de /spec-impl
             No crea branch, no toca código, no llega a Fase 5
```

---

## Notas operativas

- El spawn de los agentes skin-designer y mobile-porter está **explícitamente autorizado**
  porque el usuario invocó este comando con ese propósito.
- Los agentes trabajan en el mismo worktree; sus cambios se acumulan en la branch
  `spec-NN-slug` activa. No crean branches propias.
- Si un agente falla o reporta un error, relaya el error al usuario y pregunta si debe
  continuar con el siguiente agente o detenerse.
- Este comando no toca specs de juegos distintos al objetivo, ni páginas no-juego
  (home, biblioteca, salón, auth, nav).
