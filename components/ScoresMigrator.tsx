"use client";

import { useEffect } from "react";
import { migrateLocalScores } from "@/lib/migrateScores";

export default function ScoresMigrator() {
  useEffect(() => {
    migrateLocalScores();
  }, []);

  return null;
}
