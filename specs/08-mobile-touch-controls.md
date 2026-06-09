# SPEC — Control táctil unificado para juegos en mobile (portrait)

> **Estado:** Implementado
> **Depende de:** 07-tetris-jugable
> **Fecha:** 2026-06-09
> **Objetivo:** Añadir un gamepad táctil unificado (d-pad + 2 botones de acción) debajo del canvas en todos los juegos funcionales cuando el dispositivo es touch, y ajustar el layout del shell `/player/[id]` para portrait mobile.

---

## Scope

**In:**

- Componente compartido `components/GamepadOverlay.tsx`: d-pad (4 flechas) + 2 botones de acción (A, B), visible solo bajo `pointer: coarse`
- `lib/games/asteroids/AsteroidsCanvas.tsx`: reemplazar controles táctiles existentes por `GamepadOverlay`
- `lib/games/tetris/TetrisCanvas.tsx`: reemplazar controles táctiles existentes por `GamepadOverlay`
- Canvas scaling en ambos juegos: CSS `max-width: 100%` + `aspect-ratio` fijo, sin cambiar resolución interna del canvas
- Layout del shell `app/player/[id]/PlayerClient.tsx`: canvas arriba, gamepad abajo en portrait touch; HUD de puntuación/vidas visible en pantalla pequeña

**Fuera de alcance:**

- Soporte landscape u orientación forzada
- Nuevos juegos más allá de asteroides y tetris
- Gamepad visible en desktop
- Etiquetas de botones personalizadas por juego (se usan iconos genéricos)
- Vibración/haptic feedback
- Persistencia de layout de controles
- Controles táctiles/mobile en Supabase Auth, leaderboard u otras páginas

---

## Data model

No hay cambios en base de datos. Solo estructuras TypeScript nuevas.

### Interface `GamepadOverlayProps`

```ts
interface GamepadOverlayProps {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onActionA?: () => void;
  onActionB?: () => void;
  labelA?: string; // default "A"
  labelB?: string; // default "B"
}
```

### Mapeo por juego

| Botón | Asteroides        | Tetris          |
| ----- | ----------------- | --------------- |
| ↑     | Thrust (acelerar) | Rotar pieza     |
| ↓     | — (no-op)         | Soft drop       |
| ←     | Girar izquierda   | Mover izquierda |
| →     | Girar derecha     | Mover derecha   |
| A     | Disparar          | Hard drop       |
| B     | Hyperspace        | — (no-op)       |

---

## Implementation plan

1. **Crear `components/GamepadOverlay.tsx`**
   - Componente `"use client"` visible solo si `pointer: coarse` (CSS media query o hook)
   - Layout: d-pad (cruz de 3×3 con flechas en posiciones cardinales) a la izquierda, botones A/B a la derecha
   - Eventos `onPointerDown` / `onPointerUp` para cada botón (no `onClick` — evita el delay de 300ms)
   - `touch-action: none` en el contenedor para evitar scroll accidental
   - `user-select: none` para evitar selección de texto al pulsar
   - Verificar: el componente no renderiza nada en desktop

2. **Actualizar `lib/games/asteroids/AsteroidsCanvas.tsx`**
   - Eliminar overlay táctil existente
   - Importar y montar `<GamepadOverlay>` con el mapeo de Asteroides
   - Los callbacks de GamepadOverlay disparan los mismos eventos que las teclas correspondientes
   - Verificar: thrust, giro, disparo y hyperspace funcionan desde el gamepad

3. **Actualizar `lib/games/tetris/TetrisCanvas.tsx`**
   - Eliminar overlay táctil existente (los 5 botones bajo `pointer: coarse`)
   - Importar y montar `<GamepadOverlay>` con el mapeo de Tetris
   - Verificar: mover, rotar, soft drop y hard drop funcionan desde el gamepad

4. **Escalar canvas en ambos juegos**
   - Envolver el `<canvas>` en un `div` con `style={{ width: '100%', aspectRatio: '<W>/<H>' }}`
   - El `<canvas>` recibe `style={{ width: '100%', height: '100%' }}` (CSS scaling, resolución interna sin cambios)
   - Verificar: en 375px de ancho el canvas llena el ancho sin deformar

5. **Ajustar layout de `app/player/[id]/PlayerClient.tsx`**
   - En mobile (`pointer: coarse`): layout en columna — canvas arriba, HUD compacto, gamepad abajo
   - HUD (score, vidas, nivel) en fila horizontal compacta entre canvas y gamepad
   - Verificar: en iPhone SE (375×667) todos los elementos son visibles sin scroll

---

## Acceptance criteria

- [ ] En un dispositivo touch (pointer: coarse), `GamepadOverlay` es visible debajo del canvas
- [ ] En desktop (pointer: fine), `GamepadOverlay` no renderiza nada
- [ ] En Asteroides: thrust, girar izq/der, disparar y hyperspace funcionan desde el gamepad táctil
- [ ] En Tetris: mover izq/der, rotar, soft drop y hard drop funcionan desde el gamepad táctil
- [ ] El canvas de ambos juegos llena el ancho disponible en portrait sin deformar la relación de aspecto
- [ ] El HUD (score, vidas, nivel) es legible en pantalla de 375px de ancho
- [ ] No hay scroll accidental al pulsar los botones del gamepad
- [ ] Los controles de teclado siguen funcionando en ambos juegos
- [ ] El overlay táctil anterior de Asteroides y Tetris queda completamente eliminado

---

## Decisions

- **Sí: `onPointerDown`/`onPointerUp` en lugar de `onClick`** — Razón: `onClick` tiene un delay de ~300ms en mobile que hace los controles arcade injugables.
- **Sí: CSS scaling del canvas (no resize de resolución interna)** — Razón: cambiar `canvas.width`/`canvas.height` resetea el contexto y rompe el game loop; CSS scaling es transparente al motor del juego.
- **Sí: `touch-action: none` en el gamepad** — Razón: sin esto el browser interpreta swipes como scroll y los botones no disparan eventos correctamente.
- **Sí: componente compartido `GamepadOverlay`** — Razón: los juegos futuros lo reutilizan sin reescribir el d-pad.
- **Sí: solo portrait** — Razón: decisión del usuario; landscape queda fuera de alcance.
- **No: haptic feedback** — Razón: fuera de alcance; requiere Permissions API y varía por dispositivo.
- **No: botones con labels personalizados por juego** — Razón: iconos genéricos son suficientes; la complejidad de configuración no justifica el beneficio.
- **No: deshabilitar teclado en touch devices** — Razón: un teclado conectado a un móvil debe seguir funcionando; no hay beneficio en bloquearlo.
