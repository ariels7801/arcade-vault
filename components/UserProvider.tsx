"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
    try {
      const stored = localStorage.getItem("av_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  function handleLogin(name: string) {
    const u: User = { name: name.toUpperCase().slice(0, 10) };
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  }

  function handleSignOut() {
    setUser(null);
    localStorage.removeItem("av_user");
  }

  return (
    <UserContext.Provider value={{ user, handleLogin, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}
