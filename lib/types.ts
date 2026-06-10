import type { Tables } from "@/lib/supabase/database.types";

export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = Omit<Tables<"games">, "color" | "cat"> & {
  color: GameColor;
  cat: GameCategory;
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

export type User = {
  id?: string;
  name: string;
  email?: string;
  isGuest: boolean;
};
