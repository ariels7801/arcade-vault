"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/types";

interface ScoreEntry {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
  games: { title: string } | null;
}

const GLOBAL_ID = "__global__";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function rankClass(i: number) {
  if (i === 0) return "top1";
  if (i === 1) return "top2";
  if (i === 2) return "top3";
  return "";
}

export default function SalonPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [activeGame, setActiveGame] = useState(GLOBAL_ID);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("games")
      .select("*")
      .order("title")
      .then(({ data }) => {
        if (data) setGames(data as Game[]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    const query =
      activeGame === GLOBAL_ID
        ? supabase
            .from("scores")
            .select("*, games(title)")
            .order("score", { ascending: false })
            .limit(20)
        : supabase
            .from("scores")
            .select("*, games(title)")
            .eq("game_id", activeGame)
            .order("score", { ascending: false })
            .limit(20);

    query.then(({ data }) => {
      setScores((data ?? []) as ScoreEntry[]);
      setLoading(false);
    });
  }, [activeGame]);

  const top3 = scores.slice(0, 3);
  const isGlobal = activeGame === GLOBAL_ID;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p>LOS MEJORES DE ARCADE VAULT</p>
      </div>

      {/* Game selector tabs */}
      <div className="hall-tabs">
        <button
          className={`chip${activeGame === GLOBAL_ID ? " active" : ""}`}
          onClick={() => setActiveGame(GLOBAL_ID)}
        >
          GLOBAL
        </button>
        {games.map((g) => (
          <button
            key={g.id}
            className={`chip${activeGame === g.id ? " active" : ""}`}
            onClick={() => setActiveGame(g.id)}
          >
            {g.title.slice(0, 10)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div className="spinner" />
        </div>
      ) : scores.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            fontFamily: "var(--pixel)",
            fontSize: "11px",
            letterSpacing: "0.16em",
            color: "var(--ink-dim)",
          }}
        >
          SIN SCORES AÚN — ¡SÉ EL PRIMERO!
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {top3.length >= 3 && (
            <div className="podium">
              <div className="podium-slot silver">
                <div className="rank-num">#2</div>
                <div className="name">{top3[1].player_name}</div>
                {isGlobal && (
                  <div className="date" style={{ fontSize: "9px", color: "var(--ink-dim)" }}>
                    {top3[1].games?.title ?? "—"}
                  </div>
                )}
                <div className="score">{top3[1].score.toLocaleString()}</div>
                <div className="date">{formatDate(top3[1].created_at)}</div>
              </div>
              <div className="podium-slot gold">
                <div className="rank-num">#1</div>
                <div className="name">{top3[0].player_name}</div>
                {isGlobal && (
                  <div className="date" style={{ fontSize: "9px", color: "var(--ink-dim)" }}>
                    {top3[0].games?.title ?? "—"}
                  </div>
                )}
                <div className="score">{top3[0].score.toLocaleString()}</div>
                <div className="date">{formatDate(top3[0].created_at)}</div>
              </div>
              <div className="podium-slot bronze">
                <div className="rank-num">#3</div>
                <div className="name">{top3[2].player_name}</div>
                {isGlobal && (
                  <div className="date" style={{ fontSize: "9px", color: "var(--ink-dim)" }}>
                    {top3[2].games?.title ?? "—"}
                  </div>
                )}
                <div className="score">{top3[2].score.toLocaleString()}</div>
                <div className="date">{formatDate(top3[2].created_at)}</div>
              </div>
            </div>
          )}

          {/* Full table */}
          <div className={`hall-table${isGlobal ? " hall-table--global" : ""}`}>
            <div className="th">
              <span>#</span>
              <span>JUGADOR</span>
              {isGlobal && <span>JUEGO</span>}
              <span>PUNTUACIÓN</span>
              <span>FECHA</span>
            </div>
            {scores.map((row, i) => (
              <div
                key={row.id}
                className={`tr ${rankClass(i)}`}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <span className="rk">#{String(i + 1).padStart(2, "0")}</span>
                <span className="pl">{row.player_name}</span>
                {isGlobal && (
                  <span className="dt" style={{ fontSize: "11px" }}>
                    {row.games?.title ?? "—"}
                  </span>
                )}
                <span className="sc">{row.score.toLocaleString()}</span>
                <span className="dt">{formatDate(row.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
