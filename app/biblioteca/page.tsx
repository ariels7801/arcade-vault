import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/types";
import BibliotecaClient from "./BibliotecaClient";

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").order("title");
  return <BibliotecaClient games={(data ?? []) as Game[]} />;
}
