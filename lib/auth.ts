import { createClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", authUser.id)
    .single();

  return {
    id: authUser.id,
    name: (profile?.username ?? authUser.email ?? "PLAYER").toUpperCase().slice(0, 10),
    email: authUser.email,
    isGuest: false,
  };
}
