# SPEC 10 — Autenticación real con Supabase (registro, login, sesión)

> **Estado:** Aprovado
> **Depende de:** SPEC 04 (Supabase clients), SPEC 06 (scores/leaderboard) ·
> **Fecha:** 2026-06-10
> **Objetivo:** Reemplazar el login falso de localStorage por autenticación real de Supabase (email+contraseña con verificación por correo, más Google y GitHub OAuth), conservar el modo invitado solo-navegación, y exigir cuenta para jugar `/player/[id]`.

---

## Contexto (por qué este spec existe)

Hoy `/auth` es decorativo: `UserProvider` guarda un nombre en `localStorage` (`av_user`) y `PlayerClient` escribe scores con un `player_name` libre de 3 letras (`AAA`). No hay cuentas, ni sesión, ni identidad verificable. SPEC 04 dejó los clients de Supabase listos pero difirió explícitamente la auth real a una spec futura — esta. El objetivo es identidad real por usuario para que el leaderboard (`/salon`) refleje cuentas verificadas, no iniciales anónimas.

Decisiones ya cerradas (no reabrir):

- Método: email + contraseña, **+ social Google + GitHub**.
- Verificación por correo **activa** (el usuario confirma antes de poder entrar).
- Modo **invitado se conserva**, pero solo para navegar — **no puede jugar ni guardar score**.
- Identidad: tabla `profiles` con `username` único + columna `scores.user_id`.
- Única ruta protegida: `/player/[id]`.

---

## Scope

**In:**

- **DB — tabla `profiles`:** `id uuid PK → auth.users(id)`, `username text unique not null`, `created_at`. RLS: lectura pública, update solo dueño.
- **DB — trigger** `on auth.users insert` que crea la fila `profiles` tomando el `username` de `raw_user_meta_data` (signup email) o derivándolo del email/nombre OAuth.
- **DB — columna `scores.user_id uuid → auth.users(id)`** nullable (legado compatible), RLS exige `auth.uid() = user_id` en inserts nuevos.
- **Regenerar** `lib/supabase/database.types.ts`.
- **`app/auth/page.tsx` reescrito:** signup (email + contraseña + username), login (email + contraseña), botones OAuth **Google** y **GitHub**, botón invitado conservado. Estados de error/carga/"revisa tu correo".
- **`app/auth/callback/route.ts` (nuevo):** intercambia el `code` por sesión (confirmación de email y retorno OAuth), redirige a `/biblioteca`.
- **`proxy.ts` (nuevo, raíz del proyecto):** refresca la sesión en cada request y protege `/player/[id]` — sin sesión Supabase → redirige a `/auth`.
- **`components/UserProvider.tsx` híbrido:** si hay sesión Supabase → usuario real (lee `profiles.username`); si no, pero hay `av_user` en localStorage → invitado. `handleSignOut` llama `supabase.auth.signOut()` para reales y limpia localStorage para invitados.
- **`app/player/[id]/PlayerClient.tsx`:** guarda score con `user_id` + `username` real; elimina input de iniciales `AAA` y `av_scores`.
- **`lib/types.ts`:** extender `User` con `id?`, `email?`, `isGuest: boolean`.
- **`lib/auth.ts` (nuevo helper):** `getSessionUser()` — sesión + profile reutilizable por server components y `proxy.ts`.

**Fuera de alcance (specs futuras):**

- Recuperar/cambiar contraseña, cambiar email.
- Página de perfil, avatar, editar `username`.
- Sesiones anónimas de Supabase (`signInAnonymously`) — el invitado sigue en localStorage.
- Leaderboard en realtime, RLS granular, rate-limit/captcha.
- Controles táctiles / mobile.
- Migrar scores históricos sin `user_id` (quedan como legado de solo lectura).

---

## Data model

```sql
-- profiles: 1:1 con auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_public" on public.profiles for select using (true);
create policy "profiles_update_own"   on public.profiles for update using (auth.uid() = id);

-- trigger: crea profile al registrarse (email o OAuth)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- scores: ligar a usuario (nullable para compatibilidad con legado)
alter table public.scores add column user_id uuid references auth.users(id) on delete set null;
alter table public.scores enable row level security;
create policy "scores_select_public" on public.scores for select using (true);
create policy "scores_insert_own"    on public.scores
  for insert with check (auth.uid() = user_id);
```

```ts
// lib/types.ts
export type User = {
  id?: string; // uuid Supabase; ausente si invitado
  name: string; // username (real) o nombre local (invitado)
  email?: string;
  isGuest: boolean;
};
```

Convenciones:

- `player_name` en `scores` se conserva denormalizado (`= username` al guardar) para que `/salon` no cambie su query.
- `username`: mayúsculas, ≤ 10 chars, validado único por constraint (colisión → mensaje "tag ya tomado").

---

## Implementation plan

1. **Migración `profiles` + RLS + trigger** — `mcp__supabase__apply_migration`. Verificar: insertar usuario de prueba crea fila `profiles`.
2. **Migración `scores.user_id` + RLS** — `mcp__supabase__apply_migration`. Verificar: `list_tables` muestra columna y políticas.
3. **Regenerar tipos** → `lib/supabase/database.types.ts` via `mcp__supabase__generate_typescript_types`. Verificar: `npm run build` compila.
4. **`lib/types.ts`** — extender `User`. Crear **`lib/auth.ts`** con `getSessionUser()` (sesión Supabase + `profiles.username`).
5. **`components/UserProvider.tsx` híbrido** — montar: leer sesión Supabase; si hay → usuario real; si no → fallback `av_user`. `onAuthStateChange` para reactividad. `handleSignOut` ramifica real/invitado.
6. **`app/auth/callback/route.ts`** — `exchangeCodeForSession(code)`, redirige a `/biblioteca` (error → `/auth?error=...`).
7. **`app/auth/page.tsx`** — signup: `signUp({ email, password, options:{ data:{ username }, emailRedirectTo: <callback> } })` → mostrar "revisa tu correo". Login: `signInWithPassword`. Social: `signInWithOAuth({ provider:'google'|'github', options:{ redirectTo:<callback> } })`. Invitado: `handleLogin` local existente.
8. **`proxy.ts`** — refresco de sesión (patrón `@supabase/ssr` con `getUser()`); si path empieza con `/player/` y sin usuario autenticado → `redirect /auth`. Edge runtime desactivado.
9. **`app/player/[id]/PlayerClient.tsx`** — `handleSave` inserta `{ game_id, score, user_id: user.id, player_name: user.name }`; quitar input `AAA` y `av_scores`. Modal game-over: score + botón guardar (disabled si ya guardó).
10. **Nav / sign-out** — verificar que el botón de logout existente invoca `handleSignOut` del provider.

Cada paso deja el sistema compilable y ejecutable.

---

## Acceptance criteria

- [ ] Signup con email+contraseña+username crea usuario en `auth.users` y fila en `profiles` con ese `username`.
- [ ] Tras signup, Supabase envía correo de verificación; el usuario NO tiene sesión hasta confirmar.
- [ ] Click en el enlace del correo pasa por `/auth/callback`, crea sesión y redirige a `/biblioteca`.
- [ ] Login Google y login GitHub abren OAuth, vuelven por `/auth/callback` y crean sesión + fila `profiles`.
- [ ] `username` duplicado muestra error legible y no crea cuenta.
- [ ] Invitado entra a `/biblioteca`, `/salon`, `/`, `/acerca-de`, pero al abrir `/player/[id]` es redirigido a `/auth`.
- [ ] Usuario sin sesión que navega directo a `/player/<id>` es redirigido a `/auth`.
- [ ] Usuario autenticado juega `/player/[id]`, hace game over, guarda y el score aparece en `/salon` con su `username`.
- [ ] Score insertado tiene `user_id` = id del usuario; RLS rechaza insert con `user_id` ajeno.
- [ ] HUD de `PlayerClient` muestra el `username` real (no "GUEST").
- [ ] Sign-out cierra sesión Supabase y el sitio vuelve a estado deslogueado.
- [ ] `npm run build` compila sin errores de tipos.

---

## Decisions

- **Sí: `profiles` separada de `auth.users`.** `auth.users` no es editable directo; `profiles` da `username` público para el leaderboard sin exponer email.
- **Sí: trigger `security definer` para crear profile.** Garantiza la fila aunque el signup sea OAuth (sin form de username); deriva del email si falta.
- **Sí: conservar `player_name` denormalizado en `scores`.** Evita tocar la query de `/salon` y sobrevive si el usuario se borra (`on delete set null`).
- **No: sesión anónima de Supabase para invitado.** El usuario pidió conservar el invitado local; jugar exige cuenta real, así que el invitado no necesita identidad en DB.
- **No: password reset / perfil en este spec.** Alcance acotado a registro+login+sesión; van en specs propias.
- **Sí: proteger solo `/player/[id]` vía `proxy.ts`.** Resto del sitio público (decisión del usuario).
- **No: edge runtime en proxy.** Next 16 no soporta edge runtime en `proxy.ts`.
- **Sí: verificación de email activa.** Decisión explícita del usuario.

---

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| OAuth Google/GitHub requiere client-id/secret en dashboard Supabase | Habilitar providers y registrar credenciales antes de probar social; email+pass funciona sin eso.                                      |
| `emailRedirectTo` / `redirectTo` mal configurado rompe el callback  | Usar URL absoluta derivada del `origin` del request; registrar la URL en "Redirect URLs" del dashboard Supabase.                       |
| `proxy.ts` mal escrito puede colgar todas las rutas                 | Limitar matcher a rutas no estáticas; redirigir solo bajo `/player/`; el resto pasa intacto.                                           |
| Scores legacy sin `user_id`                                         | Columna nullable (legado), pero RLS de insert exige `auth.uid() = user_id` en inserts nuevos.                                          |
| Colisión de `username` en OAuth (deriva del email)                  | Constraint `unique` + `on conflict do nothing`; si colisiona, fila no se crea; se resuelve en spec de perfil futura (riesgo aceptado). |

---

## Lo que **no** está en este spec

- Recuperar/cambiar contraseña, cambiar email, página de perfil, editar `username`, avatar.
- Sesión anónima de Supabase, leaderboard realtime, controles mobile, captcha/rate-limit.

Cada uno, si llega, va en su propia spec.
