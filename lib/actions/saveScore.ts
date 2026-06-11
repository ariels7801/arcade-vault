"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveScore(gameId: string, score: number, playerName: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("scores").insert({
    game_id: gameId,
    score,
    user_id: user.id,
    player_name: playerName,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
