"use client";

import { useEffect, useRef, useState } from "react";
import { Engine, CLASSIC_SKIN, RETRO_SKIN, NEON_SKIN, type EngineCallbacks, type AsteroidsSkin } from "./engine";
import GamepadOverlay from "@/components/GamepadOverlay";

const GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

// ── Skin map ──────────────────────────────────────────────────────────────────
const SKINS: Record<string, AsteroidsSkin> = {
  classic: CLASSIC_SKIN,
  retro: RETRO_SKIN,
  neon: NEON_SKIN,
};

const SKIN_LABELS: Record<string, string> = {
  classic: "Classic",
  retro: "Retro",
  neon: "Neon",
};


export interface AsteroidsCanvasProps extends EngineCallbacks {
  paused: boolean;
  skinKey?: string;
}

export default function AsteroidsCanvas({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  skinKey: skinKeyProp,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const pausedRef = useRef(paused);
  const callbacksRef = useRef<EngineCallbacks>({});

  // ── Skin state — local selector when skinKey not provided externally ────────
  const [localSkinKey, setLocalSkinKey] = useState<string>("classic");
  const activeSkinKey = skinKeyProp ?? localSkinKey;
  const skinRef = useRef<AsteroidsSkin>(SKINS[activeSkinKey] ?? CLASSIC_SKIN);

  useEffect(() => {
    skinRef.current = SKINS[activeSkinKey] ?? CLASSIC_SKIN;
    if (engineRef.current) {
      engineRef.current.skin = skinRef.current;
    }
  }, [activeSkinKey]);

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

    const engine = new Engine(
      ctx,
      {
        onScoreChange: (score) => callbacksRef.current.onScoreChange?.(score),
        onLivesChange: (lives) => callbacksRef.current.onLivesChange?.(lives),
        onLevelChange: (level) => callbacksRef.current.onLevelChange?.(level),
        onGameOver: (finalScore) => callbacksRef.current.onGameOver?.(finalScore),
      },
      skinRef.current,
    );
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
      // Keep engine skin in sync (updated by skinRef effect)
      engine.skin = skinRef.current;
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
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "800/600" }}>
        {/* Skin selector — only shown when no external skinKey is provided */}
        {skinKeyProp === undefined && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 20,
              display: "flex",
              gap: 4,
            }}
          >
            {Object.keys(SKINS).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setLocalSkinKey(key)}
                style={{
                  padding: "2px 8px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  border: `1px solid ${localSkinKey === key ? "#fff" : "rgba(255,255,255,0.3)"}`,
                  borderRadius: 3,
                  background: localSkinKey === key ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.5)",
                  color: localSkinKey === key ? "#fff" : "rgba(255,255,255,0.55)",
                }}
              >
                {SKIN_LABELS[key]}
              </button>
            ))}
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
      <GamepadOverlay
        onUpPress={() => pressVirtualKey("ArrowUp")}
        onUpRelease={() => releaseVirtualKey("ArrowUp")}
        onLeftPress={() => pressVirtualKey("ArrowLeft")}
        onLeftRelease={() => releaseVirtualKey("ArrowLeft")}
        onRightPress={() => pressVirtualKey("ArrowRight")}
        onRightRelease={() => releaseVirtualKey("ArrowRight")}
        onActionAPress={() => pressVirtualKey("Space")}
        onActionARelease={() => releaseVirtualKey("Space")}
        onActionBPress={() => pressVirtualKey("ArrowDown")}
        onActionBRelease={() => releaseVirtualKey("ArrowDown")}
        labelA="●"
        labelB="⌁"
      />
    </div>
  );
}
