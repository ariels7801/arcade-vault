# Game Suggestions — Arcade Vault

Persistent memory for the `game-planner` agent. Each run appends here.
Statuses gate what can be re-suggested on future runs.

## Status Legend

| Status        | Meaning                                                              |
|---------------|----------------------------------------------------------------------|
| `implemented` | Canvas built, registered in GAME_REGISTRY — never suggest again     |
| `db-stub`     | Row exists in the `games` table but no canvas yet — available to implement |
| `suggested`   | game-planner recommended this in a prior session — skip on next run |
| `discarded`   | Considered and explicitly rejected — skip on next runs              |

## Log

| Date       | ID          | Title         | Category | Color   | Status      | Notes                                      |
|------------|-------------|---------------|----------|---------|-------------|--------------------------------------------|
| 2026-06-08 | asteroides  | ASTEROIDES    | SHOOTER  | cyan    | implemented | Canvas + GAME_REGISTRY. Baseline ref.      |
| 2026-06-08 | tetris      | TETRIS        | PUZZLE   | cyan    | implemented | Canvas + GAME_REGISTRY. Baseline ref.      |
| 2026-06-08 | bricks      | NEON BRICKS   | ARCADE   | cyan    | db-stub     | In games table, no canvas yet.             |
| 2026-06-08 | duelo       | PIXEL DUEL    | VERSUS   | magenta | db-stub     | In games table, no canvas yet.             |
| 2026-06-08 | glot        | GLOTON X      | ARCADE   | yellow  | db-stub     | In games table, no canvas yet.             |
| 2026-06-08 | invaders    | SPACE RAID    | SHOOTER  | green   | db-stub     | In games table, no canvas yet.             |
| 2026-06-08 | rana        | CYBER FROG    | ARCADE   | green   | db-stub     | In games table, no canvas yet.             |
| 2026-06-08 | rocas       | ROCAS DRIFT   | SHOOTER  | cyan    | db-stub     | In games table, no canvas yet.             |
| 2026-06-08 | snake       | PIXEL SNAKE   | ARCADE   | green   | db-stub     | In games table, no canvas yet.             |
| 2026-06-08 | tetro       | TETRO VAULT   | PUZZLE   | magenta | db-stub     | In games table, no canvas yet.             |
