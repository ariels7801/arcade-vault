"use client";

import Link from "next/link";
import { useState } from "react";
import type { Game } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/UserProvider";
import { GAME_REGISTRY } from "@/lib/games/registry";

export default function PlayerClient({ game }: { game: Game }) {
  const { user } = useUser();
  const GameCanvas = GAME_REGISTRY[game.id] ?? null;

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(0);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleGameOver(finalScore: number) {
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
    if (!user || user.isGuest) return;

    await createClient().from("scores").insert({
      game_id: game.id,
      score,
      user_id: user.id!,
      player_name: user.name,
    });

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
        {lives > 0 && (
          <div className="hud-stat lives">
            <span className="l">VIDAS</span>
            <span className="v">{"♥".repeat(lives)}</span>
          </div>
        )}
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
          {GameCanvas ? (
            <GameCanvas
              paused={paused}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setLevel}
              onGameOver={handleGameOver}
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
              <button className="btn yellow" onClick={handleSave} disabled={saved || !user || user.isGuest}>
                {saved ? "✓ GUARDADO" : "GUARDAR SCORE"}
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
