import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Game } from "@/lib/types";
import PlayerClient from "./PlayerClient";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("*").eq("id", id).single();
  if (!game) notFound();
  return <PlayerClient game={game as Game} />;
}
