import Link from "next/link";
import { notFound } from "next/navigation";
import { GAMES, seededScores } from "../../data";

export default async function DetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  const scores = seededScores(
    game.id.charCodeAt(0) + game.id.charCodeAt(1),
    10
  );

  const rankClass = (i: number) =>
    i === 0 ? "lb-row top1" : i === 1 ? "lb-row top2" : i === 2 ? "lb-row top3" : "lb-row";

  return (
    <div className="av-detail fade-in">
      {/* LEFT */}
      <div>
        <div className="detail-cover">
          <div className={`cover-bg ${game.cover}`} style={{ position: "absolute", inset: 0 }} />
        </div>

        <div className="detail-info">
          <h2 className="pixel">{game.title}</h2>

          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>{game.color.toUpperCase()}</span>
            <span>RETRO</span>
          </div>

          <p>{game.long}</p>

          <div className="stat-strip">
            <div>
              <div className="l">PARTIDAS</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">MEJOR</div>
              <div className="v">{game.best.toLocaleString()}</div>
            </div>
            <div>
              <div className="l">DIFICULTAD</div>
              <div className="v" style={{ fontSize: "13px" }}>★★★☆☆</div>
            </div>
          </div>

          <div className="detail-actions">
            <Link href={`/player/${game.id}`} className="btn yellow lg">
              ▶ JUGAR AHORA
            </Link>
            <button className="btn ghost">AÑADIR</button>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="leaderboard">
        <h3>TOP SCORES</h3>
        {scores.map((row, i) => (
          <div key={i} className={rankClass(i)}>
            <span className="rk">#{row.rank}</span>
            <span className="pl">{row.name}</span>
            <span className="sc">{row.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
