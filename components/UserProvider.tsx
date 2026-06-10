"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

interface UserContextValue {
  user: User | null;
  handleLogin: (name: string) => void;
  handleSignOut: () => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  handleLogin: () => {},
  handleSignOut: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          name: (profile?.username ?? authUser.email ?? "PLAYER").toUpperCase().slice(0, 10),
          email: authUser.email ?? undefined,
          isGuest: false,
        });
        return;
      }

      try {
        const stored = localStorage.getItem("av_user");
        if (stored) setUser(JSON.parse(stored));
      } catch {}
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        setUser({
          id: session.user.id,
          name: (profile?.username ?? session.user.email ?? "PLAYER").toUpperCase().slice(0, 10),
          email: session.user.email ?? undefined,
          isGuest: false,
        });
      } else {
        try {
          const stored = localStorage.getItem("av_user");
          setUser(stored ? JSON.parse(stored) : null);
        } catch {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleLogin(name: string) {
    const u: User = { name: name.toUpperCase().slice(0, 10), isGuest: true };
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  }

  async function handleSignOut() {
    if (user && !user.isGuest) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem("av_user");
  }

  return (
    <UserContext.Provider value={{ user, handleLogin, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}
