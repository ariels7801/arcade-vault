"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, MouseEvent, TouchEvent } from "react";
import { Engine, type EngineCallbacks } from "./engine";

const GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

interface TouchButtonConfig {
  code: string;
  label: ReactNode;
  className?: string;
}

const MOVE_BUTTONS: TouchButtonConfig[] = [
  { code: "ArrowLeft", label: "◀" },
  { code: "ArrowUp", label: "▲" },
  { code: "ArrowRight", label: "▶" },
];

const FIRE_BUTTON: TouchButtonConfig = { code: "Space", label: "●", className: "touch-btn-fire" };

export interface AsteroidsCanvasProps extends EngineCallbacks {
  paused: boolean;
}

export default function AsteroidsCanvas({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: AsteroidsCanvasProps) {
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
    callbacksRef.current = { onScoreChange, onLivesChange, onLevelChange, onGameOver };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new Engine(ctx, {
      onScoreChange: (score) => callbacksRef.current.onScoreChange?.(score),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange?.(lives),
      onLevelChange: (level) => callbacksRef.current.onLevelChange?.(level),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver?.(finalScore),
    });
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
        width={800}
        height={600}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <div className="touch-controls">
        <div className="touch-cluster touch-cluster-move">
          {MOVE_BUTTONS.map(({ code, label, className }) => (
            <button
              key={code}
              type="button"
              className={`touch-btn${className ? ` ${className}` : ""}`}
              {...touchHandlers(code)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="touch-cluster touch-cluster-fire">
          <button
            type="button"
            className={`touch-btn${FIRE_BUTTON.className ? ` ${FIRE_BUTTON.className}` : ""}`}
            {...touchHandlers(FIRE_BUTTON.code)}
          >
            {FIRE_BUTTON.label}
          </button>
        </div>
      </div>
    </div>
  );
}
