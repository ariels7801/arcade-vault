"use client";

import Link from "next/link";
import { useState } from "react";
import type { Game } from "@/lib/types";

const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

export default function BibliotecaClient({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("TODOS");

  const filtered = games.filter((g) => {
    const matchCat = activeCat === "TODOS" || g.cat === activeCat;
    const matchQuery = g.title.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <>
      <section className="av-hero">
        <h1 className="pixel neon-cyan">BIBLIOTECA</h1>
        <p className="sub">
          <span className="blink">▶</span> INSERT COIN — SELECT GAME
        </p>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            type="text"
            placeholder="BUSCAR JUEGO..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="av-chips">
          {CATS.map((cat) => (
            <button
              key={cat}
              className={`chip${activeCat === cat ? " active" : ""}`}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 32px" }}>
          <p className="pixel neon-magenta" style={{ fontSize: "14px", letterSpacing: "0.12em" }}>
            NO HAY RESULTADOS
          </p>
        </div>
      ) : (
        <div className="av-grid">
          {filtered.map((game) => (
            <Link key={game.id} href={`/detalle/${game.id}`} className="card fade-in">
              <div className="cover">
                <div className={`cover-bg ${game.cover}`} />
                <span className="label">{game.cat}</span>
              </div>
              <div className="meta">
                <div className="title">{game.title}</div>
                <div className="desc">{game.short}</div>
                <div className="row">
                  <div className="score-badge">
                    <span>MEJOR</span>
                    <b>{game.best.toLocaleString()}</b>
                  </div>
                  <button className="btn" style={{ fontSize: "9px", padding: "8px 14px" }}>
                    VER
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
