"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

async function buildRealUser(
  supabase: ReturnType<typeof createClient>,
  authUser: { id: string; email?: string }
): Promise<User> {
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

interface UserProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export default function UserProvider({ children, initialUser }: UserProviderProps) {
  // initialUser comes from the server component — already reflects the real session
  const [user, setUser] = useState<User | null>(initialUser);
  const router = useRouter();

  useEffect(() => {
    // If server said no session, check localStorage for guest
    if (!initialUser) {
      try {
        const stored = localStorage.getItem("av_user");
        if (stored) setUser(JSON.parse(stored));
      } catch {}
    }

    const supabase = createClient();

    // onAuthStateChange handles reactive updates after the initial server render
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem("av_user");
        return;
      }

      if (session?.user) {
        const u = await buildRealUser(supabase, session.user);
        setUser(u);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(name: string) {
    const u: User = { name: name.toUpperCase().slice(0, 10), isGuest: true };
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  }

  async function handleSignOut() {
    if (user && !user.isGuest) {
      try {
        // Server-side signout: revokes token AND clears httpOnly cookies
        await fetch("/api/auth/signout", { method: "POST" });
      } catch {
        // Proceed even if revocation fails
      }
    }
    setUser(null);
    localStorage.removeItem("av_user");
    router.refresh();
  }

  return (
    <UserContext.Provider value={{ user, handleLogin, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}
