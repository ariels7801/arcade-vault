import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/types";

export default async function DetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase.from("games").select("*").eq("id", id).single();
  if (!game) notFound();

  const { data: scores } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", id)
    .order("score", { ascending: false })
    .limit(10);

  const g = game as Game;

  const rankClass = (i: number) =>
    i === 0 ? "lb-row top1" : i === 1 ? "lb-row top2" : i === 2 ? "lb-row top3" : "lb-row";

  return (
    <div className="av-detail fade-in">
      {/* LEFT */}
      <div>
        <div className="detail-cover">
          <div className={`cover-bg ${g.cover}`} style={{ position: "absolute", inset: 0 }} />
        </div>

        <div className="detail-info">
          <h2 className="pixel">{g.title}</h2>

          <div className="detail-tags">
            <span>{g.cat}</span>
            <span>{g.color.toUpperCase()}</span>
            <span>RETRO</span>
          </div>

          <p>{g.long}</p>

          <div className="stat-strip">
            <div>
              <div className="l">PARTIDAS</div>
              <div className="v">{g.plays}</div>
            </div>
            <div>
              <div className="l">MEJOR</div>
              <div className="v">{g.best.toLocaleString()}</div>
            </div>
            <div>
              <div className="l">DIFICULTAD</div>
              <div className="v" style={{ fontSize: "13px" }}>★★★☆☆</div>
            </div>
          </div>

          <div className="detail-actions">
            <Link href={`/player/${g.id}`} className="btn yellow lg">
              ▶ JUGAR AHORA
            </Link>
            <button className="btn ghost">AÑADIR</button>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="leaderboard">
        <h3>TOP SCORES</h3>
        {scores && scores.length > 0 ? (
          scores.map((row, i) => (
            <div key={i} className={rankClass(i)}>
              <span className="rk">#{i + 1}</span>
              <span className="pl">{row.player_name}</span>
              <span className="sc">{row.score.toLocaleString()}</span>
            </div>
          ))
        ) : (
          <div className="lb-row" style={{ justifyContent: "center", opacity: 0.5 }}>
            SIN SCORES AÚN
          </div>
        )}
      </div>
    </div>
  );
}
