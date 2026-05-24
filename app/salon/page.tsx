"use client";

import { useState } from "react";
import { GAMES, seededScores } from "../data";
import { useUser } from "../components/UserProvider";

export default function SalonPage() {
  const { user } = useUser();
  const [activeGame, setActiveGame] = useState(GAMES[0].id);

  const scores = seededScores(
    activeGame.charCodeAt(0) + activeGame.charCodeAt(1),
    12
  );

  const top3 = scores.slice(0, 3);
  const userInTop = user ? scores.some((r) => r.name === user.name) : false;
  const userRow = user
    ? {
        rank: 13,
        name: user.name,
        score: Math.floor(scores[11].score * 0.7),
        date: "HOY",
      }
    : null;

  const rankClass = (i: number) =>
    i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p>LOS MEJORES DE ARCADE VAULT</p>
      </div>

      {/* Game tabs */}
      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`chip${activeGame === g.id ? " active" : ""}`}
            onClick={() => setActiveGame(g.id)}
          >
            {g.title.slice(0, 10)}
          </button>
        ))}
      </div>

      {/* Podium — silver | gold | bronze */}
      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">#2</div>
          <div className="name">{top3[1].name}</div>
          <div className="score">{top3[1].score.toLocaleString()}</div>
          <div className="date">{top3[1].date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="rank-num">#1</div>
          <div className="name">{top3[0].name}</div>
          <div className="score">{top3[0].score.toLocaleString()}</div>
          <div className="date">{top3[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">#3</div>
          <div className="name">{top3[2].name}</div>
          <div className="score">{top3[2].score.toLocaleString()}</div>
          <div className="date">{top3[2].date}</div>
        </div>
      </div>

      {/* Full table */}
      <div className="hall-table">
        <div className="th">
          <span>#</span>
          <span>JUGADOR</span>
          <span>PUNTUACIÓN</span>
          <span>FECHA</span>
        </div>

        {scores.map((row, i) => (
          <div
            key={i}
            className={[
              "tr",
              rankClass(i),
              user && row.name === user.name ? "you" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="rk">#{row.rank}</span>
            <span className="pl">{row.name}</span>
            <span className="sc">{row.score.toLocaleString()}</span>
            <span className="dt">{row.date}</span>
          </div>
        ))}

        {user && !userInTop && userRow && (
          <>
            <div className="tr you-label">— TU POSICIÓN —</div>
            <div className="tr you">
              <span className="rk">#{userRow.rank}</span>
              <span className="pl">{userRow.name}</span>
              <span className="sc">{userRow.score.toLocaleString()}</span>
              <span className="dt">{userRow.date}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
