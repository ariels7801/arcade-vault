export type GameState = "playing" | "dead" | "gameover";

export interface EngineCallbacks {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export interface InputState {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}
