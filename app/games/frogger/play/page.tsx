"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const FroggerCanvas = dynamic(() => import("@/lib/games/frogger/FroggerCanvas"), {
  ssr: false,
});

export default function FroggerPlayPage() {
  const [gameKey, setGameKey] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  // Pre-fill name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("av_player_name");
    if (stored) setName(stored);
  }, []);

  function handleGameOver(finalScore: number) {
    setScore(finalScore);
    setOver(true);
  }

  async function handleSave() {
    if (saved || !name.trim()) return;
    const playerName = name.trim();
    localStorage.setItem("av_player_name", playerName);
    await createClient().from("scores").insert({
      game_id: "frogger",
      player_name: playerName,
      score,
      user_id: null,
    } as never);
    setSaved(true);
  }

  function handleRestart() {
    setGameKey((k) => k + 1);
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
  }

  return (
    <div className="av-player fade-in">
      {/* HUD */}
      <div className="player-hud">
        <div className="hud-stat">
          <span className="l">JUGADOR</span>
          <span className="v">{name || "GUEST"}</span>
        </div>
        <div className="hud-stat">
          <span className="l">PUNTOS</span>
          <span className="v neon-cyan">{score.toLocaleString()}</span>
        </div>
        <div className="hud-stat lives">
          <span className="l">VIDAS</span>
          <span className="v">{"♥".repeat(Math.max(0, lives))}</span>
        </div>
        <div className="hud-stat level">
          <span className="l">NIVEL</span>
          <span className="v">{String(level).padStart(2, "0")}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className="hud-actions">
          <button className="btn ghost" onClick={() => setPaused((p) => !p)}>
            {paused ? "▶ REANUDAR" : "‖ PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            ◼ FIN
          </button>
        </div>
      </div>

      {/* CRT */}
      <div className="crt">
        <div className="crt-screen">
          <FroggerCanvas
            key={gameKey}
            paused={paused}
            onScoreChange={setScore}
            onLivesChange={setLives}
            onLevelChange={setLevel}
            onGameOver={handleGameOver}
          />
          {paused && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <span
                className="pixel neon-yellow"
                style={{ fontSize: "20px", letterSpacing: "0.2em" }}
              >
                PAUSA
              </span>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">PLAYING: FROGGER</span>
          <span>{score.toLocaleString()} PTS</span>
        </div>
      </div>

      {/* Game Over Modal */}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>GAME OVER</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString()}</div>
            <div className="input-row">
              <input
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saved}
              />
              <button
                className="btn yellow"
                onClick={handleSave}
                disabled={saved || !name.trim()}
              >
                GUARDAR
              </button>
            </div>
            {saved && <span className="toast-saved">✓ SCORE GUARDADO</span>}
            <div className="actions">
              <button className="btn ghost" onClick={handleRestart}>
                ↺ JUGAR DE NUEVO
              </button>
              <Link href="/detalle/frogger" className="btn ghost">
                VER DETALLE
              </Link>
              <Link href="/biblioteca" className="btn ghost">
                BIBLIOTECA
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
