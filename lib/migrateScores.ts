import { createClient } from "@/lib/supabase/client";

interface LocalScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

export async function migrateLocalScores() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("av_scores_migrated") === "1") return;

  let local: LocalScore[] = [];
  try {
    local = JSON.parse(localStorage.getItem("av_scores") ?? "[]");
  } catch {
    return;
  }
  if (local.length === 0) {
    localStorage.setItem("av_scores_migrated", "1");
    return;
  }

  const supabase = createClient();

  // Obtener ids válidos para filtrar scores con FK inválida
  const { data: games } = await supabase.from("games").select("id");
  const validIds = new Set((games ?? []).map((g) => g.id));

  const rows = local
    .filter((s) => validIds.has(s.game))
    .map((s) => ({
      game_id: s.game,
      player_name: s.name ?? "???",
      score: s.score,
      created_at: new Date(s.at).toISOString(),
    }));

  if (rows.length > 0) {
    await supabase.from("scores").insert(rows);
  }

  localStorage.setItem("av_scores_migrated", "1");
}
