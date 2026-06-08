---
name: add-game
description: >
  Designs a spec to port a canvas game into Arcade Vault with its Supabase
  leaderboard, following the Asteroids precedent (engine + canvas + registry
  wiring + games row + cover CSS). Spec-only — implement later with /spec-impl.
  Use when adding a new playable game to the catalog.
disable-model-invocation: true
argument-hint: '<reference folder or game name, e.g. 03-tetris>'
---

# /add-game — Guided spec designer for game ports

This skill produces a spec for porting a canvas game into Arcade Vault. **You write no code here.** Your job is to inspect the source game and the project, ask clarifying questions, and author a spec section by section until it is ready to be saved and implemented.

This skill is a **specialization of `/spec`**: it inherits all of `/spec`'s process rules (section-by-section flow, confirmation gates, language mirroring, hard stops, save conventions) and layers game-port-specific content on top. Read `/spec` first (Phase 1, step 2), then use its methodology throughout Phases 3 and 4. `template.md` (sibling of this file) is the game-port content skeleton that fills `/spec`'s structure.

## Philosophy

Every game port touches the same seven integration points: Supabase row, cover CSS, engine TypeScript port, optional asset relocation, canvas component, registry wiring, and leaderboard verification. The template encodes that recipe. Your job is to fill it with game-specific details, not reinvent it.

Language rule: reply in the same language as the initial prompt. Spanish prompt → Spanish replies; English prompt → English replies. Match section headings by meaning, not exact wording.

---

## Phase 1 — Context

Before asking the user anything, gather all context silently:

1. Read `CLAUDE.md` and `AGENTS.md` to understand the stack.
2. Read the `/spec` skill — load `~/.claude/skills/spec/SKILL.md` and `~/.claude/skills/spec/template.md` in full. This is the master spec-writing contract you must honor: section order, language rules, confirmation gates, hard rules, and output format all derive from it. Everything `/add-game` adds is game-port-specific detail layered on top of `/spec`'s conventions.
3. List `specs/` — note the highest-numbered spec (e.g. `06-…`). The new spec will be `07-` (or whatever comes next).
4. Read `specs/05-asteroides-jugable.md` and `specs/06-leaderboard-supabase.md` in full — these are the canonical game-port precedent you must follow.
5. Read `template.md` (sibling of this file) to internalize the game-port spec structure.
6. Inspect the source game:
   - If `$ARGUMENTS` names a folder under `references/started-games/` (e.g. `03-tetris`), read its `index.html`, `game.js` (and any `style.css` or `assets/`). Extract: canvas width × height, class names, input model (`keydown`/`keyup` keys or otherwise), score variable, lives/level mechanics, external assets (images, audio).
   - If `$ARGUMENTS` is empty or does not match a reference folder, skip ahead and ask the user in Phase 2 for the source (URL, paste, or description).
7. Read `app/player/[id]/PlayerClient.tsx` to detect whether a game registry already exists:
   - **Registry absent:** file has `isAsteroides` (or equivalent) if-branch. The spec must include a one-time step to introduce `lib/games/registry.ts` and refactor the player page.
   - **Registry present:** `lib/games/registry.ts` already exists. The spec only needs to add one line to the registry.
   Store which case applies — you will use it in Phase 3.

---

## Phase 2 — Clarify through questions

Ask in blocks of 3–5 questions. Wait for answers before continuing. Do not assume.

**Block A — Catalog identity** (always ask):
1. **Game `id`** (kebab-case, becomes `/player/<id>`, `cover-<id>`, Supabase PK). Suggest a candidate from the reference folder name (e.g. `tetris`). Is this OK?
2. **`title`** (all-caps, shown in the UI). Suggest from the reference.
3. **`cat`** — which category? Options: `ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`. Recommend based on genre.
4. **`color`** — which accent color? Options: `cyan`, `magenta`, `green`, `yellow`. Recommend based on the game's vibe.
5. **`short` / `long` copy** — do you want me to draft arcade-toned copy in the style of existing games, or will you provide it?

**Block B — Technical specifics** (ask once Block A is answered):
1. **Canvas resolution** — the reference is `W × H` (fill in from your read). Keep as-is or resize for the CRT screen?
2. **External assets** — if the reference has sprite images or audio files: confirm they should be copied to `public/games/<id>/` and loaded client-side in the canvas component.
3. **Keyboard map** — fill in what you found (e.g. "ArrowLeft/Right: move, ArrowUp: rotate, Space: drop"). Correct?
4. **Touch controls** — which buttons should appear on `pointer: coarse`? Suggest based on keyboard map (e.g. ◀ ▶ ▲ ●).
5. **Lives / Level** — does this game have lives? levels? If not, which callbacks are irrelevant (`onLivesChange` / `onLevelChange` can be omitted)?

**Stop asking when you can answer without assuming:**
- Which files will appear or change?
- What is the first executable step and what is the last?
- How do I verify the feature is finished?

---

## Phase 3 — Develop the spec section by section

**Follow the Phase 3 methodology from `/spec` exactly** (read in Phase 1, step 2). Reproduce its section-by-section flow, confirmation gates, and tone rules verbatim — `/add-game` only customizes the *content* of each section, not the *process*.

Concretely:
- Show one section at a time, formatted in Markdown.
- After each section ask for confirmation before moving to the next. Do not advance without it.
- If the user requests changes, apply them and show the section again.
- Use the section order and heading names defined in `/spec`'s `template.md`. The content skeleton for each section comes from `template.md` (sibling of this file — the game-port template).

Game-port-specific content guidance per section:
1. **Header** — Objetivo must be one sentence. Estado = Borrador. Depende de: always includes `04-supabase-setup` and `06-leaderboard-supabase`.
2. **Scope** — Incluido must name: Supabase row, RLS policies, cover CSS, engine port, canvas component, registry step, and leaderboard verification. Fuera de scope must explicitly exclude: other games, auth, gamepad, sound, pagination.
3. **Data model** — catalog entry row shape, `EngineCallbacks`/`InputState`/`Engine` constructor interfaces, canvas component props, registry type. Note if shared types should move to `lib/games/types.ts`.
4. **Implementation plan** — use the 8-step recipe from `template.md` as the skeleton; fill each step with game-specific names, paths, keyboard map, asset list. Keep step labels intact.
5. **Acceptance criteria** — boolean checklist mirroring the 8-step plan.
6. **Decisions taken and discarded** — always include: registry approach vs if-chain, cover color rationale, asset strategy (if applicable).
7. **Identified risks** — carry forward risks from `template.md`; add asset-specific ones if the game has external files.

---

## Phase 4 — Save the spec

**Follow the Phase 4 (save) rules from `/spec` exactly** (read in Phase 1, step 2). Specifically:

1. Count existing specs in `specs/` to derive the next `NN`.
2. Generate a slug from the game id: propose `NN-<id>-jugable` (confirm with user before writing).
3. Write the file to `specs/NN-slug.md` with **Estado: Borrador** (never Aprobado — that is always a human action).
4. Confirm to the user using `/spec`'s confirmation format:

```
✅ Spec guardado en specs/NN-slug.md

Estado: Borrador — revísalo y cámbialo a "Aprobado" cuando estés listo.
Siguiente paso: /spec-impl NN-slug para implementarlo.
```

**Stop here.** Same hard stop as `/spec`: do not propose implementing, do not write code, do not take any further action.

---

## Hard rules

- **Never write code.** Only the spec `.md` file at the end.
- **Never mark the spec as Aprobado/Approved automatically.** That is always a human action.
- **Never assume decisions the user did not confirm** — game id, color, controls, canvas size.
- **Never generate the full spec in one shot.** Section by section, with confirmation.
- **Always include the Supabase `games` row + RLS check** in the implementation plan, even for games with no leaderboard complexity — the row is needed for the player page to work.
- **Always address the registry** — either introduce it (first port) or add to it (subsequent ports). Never add another `if (game.id === "…")` branch.
- **Flag external assets early.** If the reference has images/audio, mark it in the scope's Incluido section and plan the `public/games/<id>/` step. Do not silently skip assets.
- **If the feature is too complex** (multiple independent mini-games, full multiplayer, server-side physics), suggest splitting into separate specs before proceeding.

---

## Tone when asking questions

Be direct. Use concrete questions, numbered for easy reply. When offering options, mark your recommendation. Do not apologize for asking.

Example well-formed block:

> Antes de escribir el data model necesito confirmar tres cosas:
>
> 1. **Resolución interna.** La referencia usa 300×600. ¿Mantenemos eso o escalamos a 400×800 para el CRT screen de la plataforma? Recomendación: mantener 300×600 + escalado CSS como en Asteroides.
> 2. **¿Lives?** Tetris no tiene vidas — ¿omitimos `onLivesChange` del callback? Recomendación: sí, omitirlo.
> 3. **Estilo del cover.** ¿Color acento `cyan` (frío, puzzle-ish) o `magenta` (enérgico)? Recomendación: `cyan`.

---

## Summary of expected behavior

```
/add-game 03-tetris

  Phase 1  →  Lee CLAUDE.md
              Lee ~/.claude/skills/spec/SKILL.md + template.md (contrato maestro de specs)
              Lista specs/ (siguiente: 07-)
              Lee specs/05 + 06 (precedente de game port)
              Lee references/started-games/03-tetris/game.js
                → extrae: canvas 300×600, PIECES[], COLORS[], teclado ArrowLeft/Right/Up/Down
                → no assets externos
              Lee PlayerClient.tsx → detecta isAsteroides if-branch → registry AUSENTE
              Silencio hasta Phase 2

  Phase 2  →  Bloque A: id=tetris OK? title=TETRIS? cat=PUZZLE? color=cyan? copy=borrador?
              [espera respuestas]
              Bloque B: canvas 300×600 confirmar; sin assets; teclado map; touch buttons; sin lives
              [espera respuestas]
              Para cuando puede responder: qué archivos cambian, primer/último paso, cómo verificar

  Phase 3  →  Header → Scope → Data model → Implementation plan → AC → Decisions → Risks
              Pausa + confirmación después de cada sección

  Phase 4  →  Escribe specs/07-tetris-jugable.md (Borrador)
              ✅ Confirma path + instrucción /spec-impl
              Para. No escribe código.

/add-game  (sin argumento)

  Phase 1  →  Lee contexto, detecta que no hay referencia en $ARGUMENTS
  Phase 2  →  Primero pregunta: ¿cuál es el juego a portar? ¿hay referencia en references/?
              Continúa desde ahí
```
