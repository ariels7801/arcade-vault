"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import type { Game } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "../../components/UserProvider";
import AsteroidsCanvas from "../../../lib/games/asteroids/AsteroidsCanvas";

export default function PlayerClient({ game }: { game: Game }) {
  const { user } = useUser();
  const isAsteroides = game.id === "asteroides";

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [initials, setInitials] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isAsteroides || paused || gameOver) return;
    const interval = setInterval(() => {
      setScore((prev) => {
        const next = prev + Math.floor(Math.random() * 47 + 13);
        setLevel(Math.floor(next / 5000) + 1);
        return next;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isAsteroides, paused, gameOver]);

  function handleAsteroidsGameOver(finalScore: number) {
    setScore(finalScore);
    setGameOver(true);
  }

  function handlePause() {
    setPaused((p) => !p);
  }

  function handleEnd() {
    setGameOver(true);
  }

  async function handleSave() {
    const name = initials.toUpperCase();

    // Guardar en Supabase
    await createClient().from("scores").insert({
      game_id: game.id,
      player_name: name,
      score,
    });

    // Fallback localStorage
    try {
      const existing = JSON.parse(localStorage.getItem("av_scores") ?? "[]");
      existing.push({ game: game.id, score, name, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(existing));
    } catch {}

    setSaved(true);
  }

  return (
    <div className="av-player fade-in">
      {/* HUD */}
      <div className="player-hud">
        <div className="hud-stat">
          <span className="l">JUGADOR</span>
          <span className="v">{user?.name ?? "GUEST"}</span>
        </div>
        <div className="hud-stat">
          <span className="l">PUNTOS</span>
          <span className="v neon-cyan">{score.toLocaleString()}</span>
        </div>
        <div className="hud-stat lives">
          <span className="l">VIDAS</span>
          <span className="v">{"♥".repeat(lives)}</span>
        </div>
        <div className="hud-stat level">
          <span className="l">NIVEL</span>
          <span className="v">{String(level).padStart(2, "0")}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className="hud-actions">
          <button className="btn ghost" onClick={handlePause}>
            {paused ? "▶ REANUDAR" : "‖ PAUSA"}
          </button>
          <button className="btn magenta" onClick={handleEnd}>
            ◼ FIN
          </button>
        </div>
      </div>

      {/* CRT */}
      <div className="crt">
        <div className="crt-screen">
          {isAsteroides ? (
            <AsteroidsCanvas
              paused={paused}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setLevel}
              onGameOver={handleAsteroidsGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="player-ship" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
            </div>
          )}
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
              <span className="pixel neon-yellow" style={{ fontSize: "20px", letterSpacing: "0.2em" }}>
                PAUSA
              </span>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">PLAYING: {game.title}</span>
          <span>{score.toLocaleString()} PTS</span>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="modal-bd">
          <div className="modal">
            <h2>GAME OVER</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString()}</div>
            <div className="input-row">
              <input
                maxLength={3}
                placeholder="AAA"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
              />
              <button className="btn yellow" onClick={handleSave} disabled={saved}>
                GUARDAR
              </button>
            </div>
            {saved && <span className="toast-saved">✓ SCORE GUARDADO</span>}
            <div className="actions">
              <Link href={`/detalle/${game.id}`} className="btn ghost">
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
