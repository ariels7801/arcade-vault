"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, TouchEvent } from "react";
import { Engine } from "./engine";
import type { EngineCallbacks } from "../types";

const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"];

export interface TetrisCanvasProps extends EngineCallbacks {
  paused: boolean;
}

export default function TetrisCanvas({
  paused,
  onScoreChange,
  onLevelChange,
  onGameOver,
}: TetrisCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const pausedRef = useRef(paused);
  const callbacksRef = useRef<EngineCallbacks>({});

  function pressVirtualKey(code: string) {
    const input = engineRef.current?.input;
    if (!input) return;
    input.justPressed[code] = !input.keys[code];
    input.keys[code] = true;
  }
  function releaseVirtualKey(code: string) {
    const input = engineRef.current?.input;
    if (!input) return;
    input.keys[code] = false;
  }
  function touchHandlers(code: string) {
    return {
      onTouchStart: (e: TouchEvent) => {
        e.preventDefault();
        pressVirtualKey(code);
      },
      onTouchEnd: (e: TouchEvent) => {
        e.preventDefault();
        releaseVirtualKey(code);
      },
      onMouseDown: (e: MouseEvent) => {
        e.preventDefault();
        pressVirtualKey(code);
      },
      onMouseUp: (e: MouseEvent) => {
        e.preventDefault();
        releaseVirtualKey(code);
      },
      onMouseLeave: () => releaseVirtualKey(code),
    };
  }

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    callbacksRef.current = { onScoreChange, onLevelChange, onGameOver };
  }, [onScoreChange, onLevelChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new Engine(ctx, {
      onScoreChange: (score) => callbacksRef.current.onScoreChange?.(score),
      onLevelChange: (level) => callbacksRef.current.onLevelChange?.(level),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver?.(finalScore),
    });
    engine.initGame();
    engineRef.current = engine;

    function handleKeyDown(e: KeyboardEvent) {
      const input = engine.input;
      input.justPressed[e.code] = !input.keys[e.code];
      input.keys[e.code] = true;
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
    }
    function handleKeyUp(e: KeyboardEvent) {
      engine.input.keys[e.code] = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let rafId = 0;
    let lastTime: number | null = null;
    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!pausedRef.current) engine.update(dt);
      engine.draw();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      engineRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={600}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <div className="touch-controls">
        <div className="touch-cluster touch-cluster-move">
          <button type="button" className="touch-btn" {...touchHandlers("ArrowLeft")}>◀</button>
          <button type="button" className="touch-btn" {...touchHandlers("ArrowDown")}>▼</button>
          <button type="button" className="touch-btn" {...touchHandlers("ArrowRight")}>▶</button>
        </div>
        <div className="touch-cluster touch-cluster-fire">
          <button type="button" className="touch-btn" {...touchHandlers("ArrowUp")}>↻</button>
          <button type="button" className="touch-btn touch-btn-fire" {...touchHandlers("Space")}>⬇</button>
        </div>
      </div>
    </div>
  );
}
