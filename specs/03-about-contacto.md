# 03 — About Page + Contacto con Resend

**Estado:** Implementado
**Depende de:** 01-mvp-visual (Nav, globals.css), 02-home-page (convenciones de estilo home)  
**Fecha:** 2026-05-24  
**Objetivo:** Implementar la página `/acerca-de` con hero, highlights, divider animado y formulario de contacto que envía correos a ariels7801@gmail.com vía Resend.

## Scope

### Incluido

- Nueva ruta `app/acerca-de/page.tsx` con el componente About
- About hero: kicker "▸ ACERCA DE", título, párrafo de misión
- Highlight row: 3 cards con iconos SVG (HEART, BROWSER, PLANT)
- Divider animado con píxeles parpadeantes
- Sección de contacto: formulario (nombre, email, mensaje) con validación
- Estado de error: shake animation si algún campo está vacío
- Estado de éxito: terminal-style message tras envío exitoso
- API Route `app/acerca-de/api/contact/route.ts` que usa Resend
  - `from`: `onboarding@resend.dev`
  - `to`: `ariels7801@gmail.com`
- Instalar dependencia `resend`
- Agregar `RESEND_API_KEY` a `.env.local`
- Agregar link "ACERCA DE" en `app/components/Nav.tsx` (desktop + mobile)
- CSS de about/contact/divider copiado de `references/templates/home-about/styles.css` a `globals.css`

### Fuera de scope

- Dominio verificado en Resend (queda pendiente)
- Rate limiting / anti-spam en el formulario
- Guardar mensajes en base de datos
- Respuesta automática al remitente

## Data model

Sin estructuras nuevas en el frontend. Una sola interfaz para el body de la API:

```ts
interface ContactPayload {
  name: string;
  email: string;
  message: string;
}
```

No se persiste nada. El formulario envía a la API, Resend despacha el correo, la API responde `{ ok: true }` o `{ error: string }`.

## Implementation plan

1. **Instalar Resend** — `npm install resend` y crear `.env.local` con `RESEND_API_KEY=<key>`.

2. **API Route** — crear `app/acerca-de/api/contact/route.ts` (POST):
   - Parsea `{ name, email, message }` del body
   - Valida que los 3 campos existan; retorna 400 si falta alguno
   - Llama a Resend con `from: "onboarding@resend.dev"`, `to: "ariels7801@gmail.com"`
   - Retorna `{ ok: true }` o `{ error: string }`

3. **CSS about** — agregar estilos `about-hero`, `highlight-row`, `highlight`, `about-divider`,
   `div-pixels`, `contact-grid`, `contact-form`, `terminal-success` de
   `references/templates/home-about/styles.css` a `app/globals.css`.

4. **Página `/acerca-de`** — crear `app/acerca-de/page.tsx` (`"use client"`):
   - `useReveal()` para animaciones scroll
   - About hero: kicker, título, párrafo de misión
   - Highlight row: 3 cards con `HighlightIcon` (HEART, BROWSER, PLANT)
   - Divider animado con píxeles parpadeantes
   - Sección de contacto: `ContactForm` con campos nombre, email, mensaje
   - Estado `shake` si algún campo vacío al submit
   - Estado de éxito: reemplaza form con terminal-style message

5. **Agregar "ACERCA DE" al Nav** — en `app/components/Nav.tsx` agregar
   `{ href: "/acerca-de", label: "ACERCA DE" }` al array `links`.

6. **Verificar en browser** — navegar a `/acerca-de`, testear formulario vacío (shake),
   formulario completo (correo llega a ariels7801@gmail.com), terminal success visible.

## Acceptance criteria

- [ ] `GET /acerca-de` renderiza la página sin errores de consola
- [ ] Nav muestra link "ACERCA DE" activo cuando la ruta es `/acerca-de` (desktop y mobile)
- [ ] About hero muestra kicker, título y párrafo de misión
- [ ] Highlight row muestra 3 cards con iconos SVG (HEART, BROWSER, PLANT)
- [ ] Divider animado con píxeles parpadeantes renderiza entre highlights y contacto
- [ ] Formulario muestra 3 campos: nombre, email, mensaje
- [ ] Submit con campos vacíos dispara animación shake; no se envía el correo
- [ ] Submit con campos completos llama a `POST /acerca-de/api/contact`
- [ ] API retorna `{ ok: true }` y Resend despacha el correo a ariels7801@gmail.com
- [ ] Tras envío exitoso, el formulario se reemplaza por terminal-style success message
- [ ] `RESEND_API_KEY` leída desde `.env.local` (no hardcodeada)
- [ ] Animaciones reveal se disparan al hacer scroll

## Decisions taken and discarded

- **`from: onboarding@resend.dev` (elegido)** vs dominio propio — no hay dominio verificado aún;
  cambiar el `from` cuando se registre uno en Resend.

- **API Route en `app/acerca-de/api/contact/route.ts` (elegido)** vs Server Action —
  API Route es más explícita para debugging y permite testear con curl/Postman.

- **Shake sin envío (elegido)** vs mostrar mensaje de error inline — el shake es la
  convención del reference template y es suficiente señal visual para campos vacíos.

- **Terminal success reemplaza el form (elegido)** vs mensaje debajo del form —
  es el comportamiento del reference; más dramático y acorde al estilo arcade.
