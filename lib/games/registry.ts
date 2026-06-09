import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { EngineCallbacks } from "./types";

export interface GameCanvasProps extends EngineCallbacks {
  paused: boolean;
}

export const GAME_REGISTRY: Record<string, ComponentType<GameCanvasProps>> = {
  asteroides: dynamic(() => import("./asteroids/AsteroidsCanvas")),
  tetris: dynamic(() => import("./tetris/TetrisCanvas")),
  frogger: dynamic(() => import("./frogger/FroggerCanvas")),
};
