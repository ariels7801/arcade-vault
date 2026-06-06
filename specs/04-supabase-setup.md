# 04 — Setup de Supabase (clients)

**Estado:** Implementado
**Depende de:** ninguno (setup independiente, base para futuras specs de auth/datos)
**Fecha:** 2026-06-06
**Objetivo:** Instalar y configurar los clients de Supabase (`lib/supabase/client.ts` y `lib/supabase/server.ts`) con `@supabase/supabase-js` y `@supabase/ssr`, listos para usarse en futuras specs de autenticación o tablas.

## Scope

### Incluido

- Instalar dependencias `@supabase/supabase-js` y `@supabase/ssr`
- Crear `lib/supabase/client.ts` — cliente de browser (`createBrowserClient`)
- Crear `lib/supabase/server.ts` — cliente de servidor (`createServerClient`) con manejo de cookies vía `next/headers` (`cookies()`)
- Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.template` (vacías)
- Agregar las mismas variables a `.env.local` (el usuario pega los valores reales después)

### Fuera de scope

- Autenticación real (login/signup/sesión) — el `UserProvider` actual sigue usando localStorage
- Creación de tablas en la base de datos (`public` sigue vacío)
- `proxy.ts` para refresco de sesión — no aplica sin auth real todavía
- Rutas o páginas que consuman estos clients — solo se crean los helpers

## Data model

Sin estructuras nuevas — este spec solo crea helpers de conexión (`SupabaseClient` tipado genéricamente, sin `Database` types porque no hay tablas aún).

## Implementation plan

1. **Instalar dependencias** — `npm install @supabase/supabase-js @supabase/ssr`

2. **Variables de entorno** — agregar a `.env.template`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

   Agregar las mismas claves (vacías) a `.env.local`. El usuario completa los valores reales manualmente desde el dashboard de Supabase.

3. **Cliente de browser** — crear `lib/supabase/client.ts`:

   ```ts
   import { createBrowserClient } from "@supabase/ssr";

   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     );
   }
   ```

4. **Cliente de servidor** — crear `lib/supabase/server.ts`:

   ```ts
   import { createServerClient } from "@supabase/ssr";
   import { cookies } from "next/headers";

   export async function createClient() {
     const cookieStore = await cookies();

     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return cookieStore.getAll();
           },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) =>
                 cookieStore.set(name, value, options),
               );
             } catch {
               // se ignora si setAll se llama desde un Server Component
             }
           },
         },
       },
     );
   }
   ```

5. **Verificar build** — correr `npm run build` y confirmar que compila sin errores de tipos ni de imports (las env vars vacías no rompen el build, solo fallarían en runtime al invocar `createClient`).

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json` (dependencies)
- [ ] `lib/supabase/client.ts` exporta `createClient()` usando `createBrowserClient`
- [ ] `lib/supabase/server.ts` exporta `createClient()` async usando `createServerClient` con `cookies()` de `next/headers`
- [ ] `.env.template` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` vacías
- [ ] `.env.local` contiene las mismas claves (el usuario completa los valores)
- [ ] `npm run build` compila sin errores de tipos ni imports rotos

## Decisions taken and discarded

- **`@supabase/ssr` + `@supabase/supabase-js` (elegido)** vs solo `@supabase/supabase-js` —
  `@supabase/ssr` permite manejo correcto de cookies de sesión en server components/routes,
  necesario para cuando se agregue auth real más adelante. Usar solo el cliente básico
  habría dejado `server.ts` casi idéntico a `client.ts`, sin aprovechar SSR.

- **Sin `proxy.ts` (descartado por ahora)** — el refresco de sesión vía proxy solo tiene
  sentido cuando exista auth real; agregarlo ahora sería código sin uso. Se deja para
  la futura spec de autenticación.

- **Valores de `.env.local` pegados manualmente por el usuario (elegido)** vs consultarlos
  vía MCP — el usuario prefiere completar las credenciales él mismo.

- **Sin tipos `Database` generados (elegido)** vs generar tipos desde el schema —
  el schema `public` está vacío; generar tipos ahora produciría un tipo vacío sin valor.
  Se generará cuando existan tablas.
