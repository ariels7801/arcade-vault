# 02 — Home Page

**Estado:** Implementado
**Depende de:** 01-mvp-visual (Nav, data.ts, globals.css, UserProvider)  
**Fecha:** 2026-05-23  
**Objetivo:** Implementar la home page en `/` con hero, features, games preview, stats, live activity, pricing y CTA final, usando datos mock hardcodeados.

## Scope

### Incluido

- Reemplazar el redirect en `app/page.tsx` con el componente Home
- Hero con eyebrow "INSERTA UNA MONEDA", título animado 3 líneas, CTA buttons
- FloatingSilhouettes: 8 SVGs decorativos animados con neon colors
- Features grid: 4 cards (Games, Free, Leaderboards, Growing) con pixel icons SVG
- Games preview: primeros 6 juegos de `data.ts` en grid, con MiniCard linking a `/detalle/[id]`
- Stats section: 3 counters (12+ games, plays diarias, ranking global) — valores hardcodeados
- Live activity: ticker de scores recientes + top 5 players — datos mock hardcodeados
- Pricing section: FREE PLAY plan con feature list y FAQs — contenido estático
- CTA final con botón a `/biblioteca`
- useReveal hook para animaciones scroll-triggered

### Fuera de scope

- Home dinámica con datos reales de localStorage
- Sección "Acerca de" (propia spec futura)
- Internacionalización / i18n
- Tests automatizados

## Data model

Sin estructuras nuevas. Se reusan:

- `Game` y `GAMES` de `app/data.ts` — para games preview (primeros 6)
- Mock inline para live activity:
  ```ts
  const MOCK_SCORES = [
    { user: "PLAYER_1", game: "Space Invaders", score: 12400 },
    // ...5-7 entradas
  ];
  const MOCK_TOP_PLAYERS = [
    { rank: 1, user: "XERO_99", points: 98200 },
    // ...top 5
  ];
  ```
  Ambos arrays definidos en el mismo archivo, no exportados.

## Implementation plan

1. **Reemplazar redirect en `app/page.tsx`** — eliminar el `redirect('/biblioteca')`, exportar componente `Home` que renderiza la página completa.

2. **useReveal hook** — crear `app/hooks/useReveal.ts` con IntersectionObserver que agrega clase `revealed` a elementos con `data-reveal`.

3. **FloatingSilhouettes** — componente inline en `page.tsx` (o `app/components/FloatingSilhouettes.tsx`), 8 SVGs con posiciones y animaciones CSS ya definidas en `globals.css`.

4. **Hero section** — eyebrow, título 3 líneas con clases de animación existentes, 2 CTA buttons (→ `/biblioteca`, → `/auth`).

5. **Features grid** — 4 cards con FeatureIcon SVG inline, texto estático.

6. **Games preview** — importar `GAMES` de `data.ts`, slice primeros 6, renderizar `MiniCard` con link a `/detalle/[id]`.

7. **Stats section** — 3 counters hardcodeados, markup estático.

8. **Live activity** — definir `MOCK_SCORES` y `MOCK_TOP_PLAYERS`, renderizar ticker animado + tabla top 5.

9. **Pricing section** — contenido estático, FAQs con toggle (estado local `useState`).

10. **CTA final** — banner con botón a `/biblioteca`.

11. **Verificar en browser** con Playwright: scroll completo, links de MiniCard, animaciones reveal.

## Acceptance criteria

- [ ] `GET /` devuelve la home page (no redirect a `/biblioteca`)
- [ ] Hero renderiza eyebrow, título 3 líneas y 2 CTA buttons visibles
- [ ] 8 silhouettes SVG flotan animadas en el hero
- [ ] Features grid muestra 4 cards con iconos
- [ ] Games preview muestra exactamente 6 MiniCards; cada una linkea a `/detalle/[id]`
- [ ] Stats section muestra 3 counters con valores hardcodeados
- [ ] Ticker de live activity anima horizontalmente sin cortes
- [ ] Top 5 players renderiza lista ordenada
- [ ] Pricing section muestra plan FREE PLAY; FAQs hacen toggle al clickear
- [ ] CTA final tiene botón que navega a `/biblioteca`
- [ ] Animaciones reveal se disparan al hacer scroll (elementos con `data-reveal`)
- [ ] No hay errores en consola del browser
- [ ] Nav existente sigue funcionando (link "Inicio" activo en `/`)

## Decisions taken and discarded

- **Mock data hardcodeado (elegido)** vs localStorage real — scope acotado; integración real queda para spec futura de dashboard/perfil.

- **Componentes inline en `page.tsx` (elegido)** vs archivos separados por sección — la home es una sola ruta, extraer solo si un componente se reutiliza en otra página.

- **useReveal como hook propio (elegido)** vs librería externa — IntersectionObserver nativo es suficiente.

- **FAQs con useState local (elegido)** vs accordeon library — una dependencia nueva para 3-4 FAQs no se justifica.
