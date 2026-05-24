---
spec: 01-mvp-visual
state: Implement
date: 2026-05-20
depends-on: —
objective: Implementar las 5 pantallas visuales de Arcade Vault (Biblioteca, Detalle, Reproductor mock, Auth, Salón de la Fama) en Next.js 16 con App Router y estilos retro/CRT portados del template HTML.
---

## Scope

### En scope
- Nav component (logo, links, contador de créditos, botón auth, menú mobile)
- Página `/` → redirige o renderiza Biblioteca
- Página `/biblioteca` → grid de juegos con búsqueda y filtros por categoría
- Página `/detalle/[id]` → cover, stats, leaderboard del juego
- Página `/player/[id]` → HUD + arena CRT mock con score ticker, pausa, modal Game Over
- Página `/auth` → formulario login/signup con tabs y botones sociales (visual only)
- Página `/salon` → podio top 3 + tabla completa, tabs por juego
- `app/data.ts` → constantes GAMES, CATS, PLAYERS y función seededScores tipadas en TypeScript
- Estilos portados del template a `app/globals.css` (variables CSS, clases custom, animaciones)
- Fuentes: Press Start 2P, Courier Prime, JetBrains Mono vía Google Fonts en layout.tsx
- Estado de usuario en localStorage (`av_user`) y scores (`av_scores`) manejado en client components
- Navegación con `next/navigation` (useRouter / Link)

### Fuera de scope
- Juegos reales (ninguna lógica de juego)
- Backend, base de datos, autenticación real
- API routes
- Tests
- Optimización de imágenes / covers reales (se usan covers CSS como en el template)

## Data model

### `app/data.ts`

```ts
export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // CSS class name, e.g. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/YYYY"
}

export interface User {
  name: string;        // max 10 chars, uppercase
}

export const GAMES: Game[] = [ /* 8 juegos del template */ ]
export const CATS: string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function seededScores(seed: number, count?: number): ScoreRow[]
```

### Estado cliente (no persistido en archivos)
- `user: User | null` — localStorage key `av_user`
- `scores: ScoreEntry[]` — localStorage key `av_scores`, shape `{ game, score, name, at }`

## Implementation plan

1. Portar `app/globals.css` — copiar variables CSS, clases de layout, componentes (.card,
   .av-nav, .btn, .crt, etc.) y animaciones del template `styles.css`. Añadir import de
   Google Fonts en `app/layout.tsx`.

2. Crear `app/data.ts` — tipar y exportar GAMES, CATS, PLAYERS, seededScores.

3. Crear `app/layout.tsx` — RootLayout con Nav integrado, fondo `.av-bg` + `.av-noise`,
   footer, y proveedor de estado de usuario (useState + localStorage en client component).

4. Crear `app/components/Nav.tsx` — client component: logo, links, coin counter, botón auth,
   menú mobile con backdrop.

5. Crear `app/components/UserProvider.tsx` — context client component que expone user,
   handleLogin, handleSignOut a toda la app.

6. Crear `app/biblioteca/page.tsx` — Library: hero, buscador, chips de categoría, GameCard
   grid. Client component.

7. Crear `app/detalle/[id]/page.tsx` — GameDetail: cover CSS, tags, stats strip, acciones,
   leaderboard lateral. Server component (params async).

8. Crear `app/player/[id]/page.tsx` — GamePlayer: HUD, arena CRT mock con score ticker
   (useEffect + setInterval), pausa, modal Game Over con input de iniciales. Client component.

9. Crear `app/auth/page.tsx` — Auth: tabs login/signup, campos, botones sociales. Client
   component. Al "iniciar sesión" guarda user en contexto y redirige a /biblioteca.

10. Crear `app/salon/page.tsx` — HallOfFame: tabs por juego, podio top 3, tabla completa,
    fila destacada si hay usuario. Client component.

11. Actualizar `app/page.tsx` — redirigir a `/biblioteca` con `redirect("/biblioteca")`.

## Acceptance criteria

- [ ] `/biblioteca` muestra los 8 juegos en grid; filtrar por categoría reduce las cards;
      buscar por nombre filtra en tiempo real; sin resultados muestra mensaje "NO HAY RESULTADOS"
- [ ] `/detalle/[id]` muestra título, descripción larga, stats (partidas, mejor global,
      dificultad), tags, leaderboard con 10 filas; botón "JUGAR AHORA" navega a `/player/[id]`
- [ ] `/player/[id]` muestra HUD con jugador/puntuación/vidas/nivel; score sube
      automáticamente; botón PAUSA congela el ticker y muestra overlay; botón FIN abre
      modal Game Over con input de iniciales y botón guardar
- [ ] `/auth` muestra tabs INICIAR SESIÓN / CREAR CUENTA; tab "up" revela campo email;
      submit guarda user en contexto y redirige a `/biblioteca`; botón invitado también redirige
- [ ] `/salon` muestra podio con top 3 y tabla con 12 filas; cambiar tab de juego actualiza
      podio y tabla; usuario logueado ve su fila destacada en amarillo
- [ ] Nav visible en todas las pantallas: links activos resaltados, botón auth cambia a
      nombre de usuario cuando hay sesión, menú mobile funciona en viewport estrecho
- [ ] `/` redirige a `/biblioteca`
- [ ] Estilos retro visualmente consistentes con el template HTML de referencia
      (fondo oscuro, neon, fuentes pixel, efectos CRT)

## Decisions taken and discarded

- **File-based routing sobre hash routing** — Next.js App Router es el enfoque nativo;
  URLs limpias sin sacrificar la experiencia de SPA.

- **Estilos en globals.css, no Tailwind puro** — el diseño retro/CRT depende de variables
  CSS, clases custom y animaciones complejas que son más fieles y mantenibles en CSS plano.
  Tailwind se usa solo donde sea conveniente (utilidades de layout).

- **Mock score ticker incluido en Reproductor** — es UI interactiva (pausa, modal, guardar
  iniciales), no lógica de juego. Cumple "solo parte visual".

- **`app/data.ts` sobre `lib/data.ts`** — decisión del usuario; datos viven dentro de la
  carpeta app.

- **UserProvider como context client component** — compartir estado de sesión entre Nav y
  páginas sin prop drilling, sin backend.

- **Covers como clases CSS** — no se implementan imágenes reales; se mantienen los fondos
  generativos del template (gradientes + patrones CSS).

- **Descartado: middleware/proxy de auth** — fuera de scope, no hay auth real.

- **Descartado: API routes** — todos los datos son estáticos o localStorage.

## Identified risks

- **Next.js 16 async params** — `/detalle/[id]` y `/player/[id]` son server/client components
  que reciben `params`. Hay que `await params` antes de desestructurar o usar `use(params)`
  en client components para no romper en build.

- **`use client` + localStorage SSR** — acceder a `localStorage` en server context lanza
  error. Todo acceso debe estar dentro de client components o protegido con
  `typeof window !== "undefined"`.

- **Google Fonts en Next.js 16** — `next/font/google` es el método recomendado; importar
  vía `<link>` en layout puede generar warning de hydration. Evaluar al implementar.

- **Clases CSS del template con nombres globales** — pueden colisionar con clases de
  Tailwind. Nombrar con prefijo `av-` (ya usado en el template) para minimizar conflictos.
