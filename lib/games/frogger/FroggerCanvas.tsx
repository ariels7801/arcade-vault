"use client";

import { useEffect, useRef, useState } from "react";
import GamepadOverlay from "@/components/GamepadOverlay";
import type { EngineCallbacks } from "../types";

// ── Constants ────────────────────────────────────────────────────────────────
const COLS = 16;
const ROWS = 14;
const CELL = 40;
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Row indices (0 = top)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const ROUND_TIME_BASE = 15; // seconds
const JUMP_DURATION = 120; // ms
const TURTLE_SUBMERGE_VISIBLE = 3000; // ms
const TURTLE_SUBMERGE_UNDER = 1500; // ms

// Goal mouth positions: 5 mouths, each 2 columns wide
// cols: 1-2, 4-5, 7-8, 10-11, 13-14 (0-indexed)
const GOAL_COLS = [1, 4, 7, 10, 13]; // left col of each mouth

// ── Local types ──────────────────────────────────────────────────────────────
type Direction = "up" | "down" | "left" | "right";

interface Entity {
  col: number; // fractional column position
  width: number; // in cells
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  submergeTimer?: number; // ms into current phase
  submergePhase?: "visible" | "under";
}

interface Lane {
  row: number;
  speed: number; // cells/second
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms elapsed in current jump
  targetCol: number;
  targetRow: number;
  fromCol: number;
  fromRow: number;
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface FroggerCanvasProps extends EngineCallbacks {
  paused: boolean;
  skinKey?: string;
}

// ── Skin ─────────────────────────────────────────────────────────────────────
interface FroggerSkin {
  roadBg: string;
  riverBg: string;
  safeBg: string;
  goalBg: string;
  goalBorder: string;
  frogBody: string;
  frogEye: string;
  logColor: string;
  logStripe: string;
  turtleColor: string;
  carColors: string[];
  truckColor: string;
  timeFull: string;
  timeMid: string;
  timeLow: string;
  boardBg: string | null;
}

const CLASSIC_SKIN: FroggerSkin = {
  roadBg: "#1a1a1a",
  riverBg: "#0a2a6e",
  safeBg: "#1a4a1a",
  goalBg: "#0d3d0d",
  goalBorder: "#ffd700",
  frogBody: "#39ff14",
  frogEye: "#ffffff",
  logColor: "#8b4513",
  logStripe: "#6b3410",
  turtleColor: "#2d8a2d",
  carColors: ["#e74c3c", "#f1c40f", "#3498db", "#e67e22"],
  truckColor: "#7f8c8d",
  timeFull: "#27ae60",
  timeMid: "#f39c12",
  timeLow: "#e74c3c",
  boardBg: null,
};

const RETRO_SKIN: FroggerSkin = {
  roadBg: "#111118",
  riverBg: "#0a1a4a",
  safeBg: "#0a2a0a",
  goalBg: "#0a1f0a",
  goalBorder: "#ccaa00",
  frogBody: "#00cc44",
  frogEye: "#dddddd",
  logColor: "#7a3a10",
  logStripe: "#5a2a08",
  turtleColor: "#226622",
  carColors: ["#cc3322", "#ccaa00", "#2266aa", "#cc6600"],
  truckColor: "#556677",
  timeFull: "#22aa44",
  timeMid: "#cc8800",
  timeLow: "#cc2222",
  boardBg: null,
};

const NEON_SKIN: FroggerSkin = {
  roadBg: "#000000",
  riverBg: "#000011",
  safeBg: "#001100",
  goalBg: "#001a00",
  goalBorder: "#ffee00",
  frogBody: "#00ff44",
  frogEye: "#ffffff",
  logColor: "#ff6600",
  logStripe: "#cc4400",
  turtleColor: "#00ff88",
  carColors: ["#ff2244", "#ffee00", "#00aaff", "#ff8800"],
  truckColor: "#aaaaff",
  timeFull: "#00ff44",
  timeMid: "#ffee00",
  timeLow: "#ff2244",
  boardBg: "#000000",
};

const SKINS: Record<string, FroggerSkin> = {
  classic: CLASSIC_SKIN,
  retro: RETRO_SKIN,
  neon: NEON_SKIN,
};

const SKIN_LABELS: Record<string, string> = {
  classic: "Classic",
  retro: "Retro",
  neon: "Neon",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildLanes(level: number): Lane[] {
  const speedMult = Math.pow(1.15, level - 1);
  const lanes: Lane[] = [];

  // Road lanes (rows 8–12), bottom to top
  const roadConfigs: Array<{ speed: number; dir: 1 | -1; entities: Array<{ w: number; type: "car" | "truck" }> }> = [
    { speed: 2.5, dir: 1,  entities: [{ w: 1, type: "car" }, { w: 1, type: "car" }, { w: 1, type: "car" }] },
    { speed: 1.8, dir: -1, entities: [{ w: 3, type: "truck" }, { w: 3, type: "truck" }] },
    { speed: 3.0, dir: 1,  entities: [{ w: 1, type: "car" }, { w: 2, type: "truck" }, { w: 1, type: "car" }] },
    { speed: 2.0, dir: -1, entities: [{ w: 1, type: "car" }, { w: 1, type: "car" }, { w: 1, type: "car" }, { w: 1, type: "car" }] },
    { speed: 3.5, dir: 1,  entities: [{ w: 2, type: "truck" }, { w: 1, type: "car" }] },
  ];

  for (let i = 0; i < roadConfigs.length; i++) {
    const cfg = roadConfigs[i];
    const row = ROW_ROAD_BOT - i;
    const entities: Entity[] = [];
    const spacing = COLS / cfg.entities.length;
    for (let j = 0; j < cfg.entities.length; j++) {
      entities.push({
        col: j * spacing,
        width: cfg.entities[j].w,
        type: cfg.entities[j].type,
      });
    }
    lanes.push({ row, speed: cfg.speed * speedMult, dir: cfg.dir, entities });
  }

  // River lanes (rows 1–6), bottom to top
  const riverConfigs: Array<{ speed: number; dir: 1 | -1; entities: Array<{ w: number; type: "log" | "turtle" }> }> = [
    { speed: 1.5, dir: -1, entities: [{ w: 3, type: "log" }, { w: 3, type: "log" }] },
    { speed: 2.0, dir: 1,  entities: [{ w: 2, type: "turtle" }, { w: 2, type: "turtle" }, { w: 2, type: "turtle" }] },
    { speed: 1.2, dir: -1, entities: [{ w: 4, type: "log" }, { w: 4, type: "log" }] },
    { speed: 2.5, dir: 1,  entities: [{ w: 2, type: "turtle" }, { w: 2, type: "turtle" }] },
    { speed: 1.8, dir: -1, entities: [{ w: 3, type: "log" }, { w: 2, type: "log" }] },
    { speed: 2.2, dir: 1,  entities: [{ w: 3, type: "turtle" }, { w: 3, type: "turtle" }] },
  ];

  for (let i = 0; i < riverConfigs.length; i++) {
    const cfg = riverConfigs[i];
    const row = ROW_RIVER_BOT - i;
    const entities: Entity[] = [];
    const spacing = COLS / cfg.entities.length;
    for (let j = 0; j < cfg.entities.length; j++) {
      const e: Entity = {
        col: j * spacing,
        width: cfg.entities[j].w,
        type: cfg.entities[j].type,
      };
      if (cfg.entities[j].type === "turtle") {
        e.submerged = false;
        e.submergeTimer = j * ((TURTLE_SUBMERGE_VISIBLE + TURTLE_SUBMERGE_UNDER) / cfg.entities.length);
        e.submergePhase = "visible";
      }
      entities.push(e);
    }
    lanes.push({ row, speed: cfg.speed * speedMult, dir: cfg.dir, entities });
  }

  return lanes;
}

function getGoalIndex(col: number): number {
  for (let i = 0; i < GOAL_COLS.length; i++) {
    if (col >= GOAL_COLS[i] && col < GOAL_COLS[i] + 2) return i;
  }
  return -1;
}

function getLaneAtRow(lanes: Lane[], row: number): Lane | null {
  return lanes.find((l) => l.row === row) ?? null;
}

function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  const lane = getLaneAtRow(lanes, frog.row);
  if (!lane) return null;
  for (const e of lane.entities) {
    if (frog.col >= e.col && frog.col < e.col + e.width) {
      if (e.type === "turtle" && e.submerged) return null;
      return e;
    }
  }
  return null;
}

function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (frog.row < ROW_ROAD_TOP || frog.row > ROW_ROAD_BOT) return false;
  const lane = getLaneAtRow(lanes, frog.row);
  if (!lane) return false;
  for (const e of lane.entities) {
    if (frog.col >= e.col && frog.col < e.col + e.width) return true;
  }
  return false;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FroggerCanvas({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  skinKey: skinKeyProp,
}: FroggerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // ── Skin ──────────────────────────────────────────────────────────────────
  const [localSkinKey, setLocalSkinKey] = useState("classic");
  const activeSkinKey = skinKeyProp ?? localSkinKey;
  const skinRef = useRef<FroggerSkin>(SKINS[activeSkinKey] ?? CLASSIC_SKIN);
  useEffect(() => {
    skinRef.current = SKINS[activeSkinKey] ?? CLASSIC_SKIN;
  }, [activeSkinKey]);

  // ── Input ─────────────────────────────────────────────────────────────────
  const pendingDirRef = useRef<Direction | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // ── Game state (mutable refs for game loop) ───────────────────────────────
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const goalsRef = useRef<boolean[]>([false, false, false, false, false]);
  const lanesRef = useRef<Lane[]>(buildLanes(1));
  const frogRef = useRef<Frog>({
    col: Math.floor(COLS / 2),
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: Math.floor(COLS / 2),
    targetRow: ROW_START,
    fromCol: Math.floor(COLS / 2),
    fromRow: ROW_START,
  });
  const roundTimerRef = useRef(ROUND_TIME_BASE * 1000); // ms
  const gameOverRef = useRef(false);
  const visitedRowsRef = useRef<Set<number>>(new Set());

  // Stable callback refs
  const cbRef = useRef({ onScoreChange, onLivesChange, onLevelChange, onGameOver });
  useEffect(() => { cbRef.current = { onScoreChange, onLivesChange, onLevelChange, onGameOver }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // ── Input handler ────────────────────────────────────────────────────────
    function handleKey(e: KeyboardEvent) {
      if (gameOverRef.current) return;
      const map: Record<string, Direction> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
      };
      if (map[e.code]) {
        e.preventDefault();
        pendingDirRef.current = map[e.code];
      }
    }
    document.addEventListener("keydown", handleKey);

    function resetFrog() {
      const f = frogRef.current;
      const cx = Math.floor(COLS / 2);
      f.col = cx; f.row = ROW_START;
      f.targetCol = cx; f.targetRow = ROW_START;
      f.fromCol = cx; f.fromRow = ROW_START;
      f.animating = false; f.animT = 0;
      visitedRowsRef.current = new Set();
    }

    function killFrog() {
      if (gameOverRef.current) return;
      livesRef.current--;
      cbRef.current.onLivesChange?.(livesRef.current);
      if (livesRef.current <= 0) {
        cbRef.current.onLivesChange?.(0);
        cbRef.current.onGameOver?.(scoreRef.current);
        gameOverRef.current = true;
        return;
      }
      roundTimerRef.current = getRoundTime(levelRef.current) * 1000;
      resetFrog();
    }

    function getRoundTime(level: number): number {
      return Math.max(8, ROUND_TIME_BASE - (level - 1) * 1);
    }

    function completeRound() {
      scoreRef.current += 200;
      cbRef.current.onScoreChange?.(scoreRef.current);
      levelRef.current++;
      cbRef.current.onLevelChange?.(levelRef.current);
      goalsRef.current = [false, false, false, false, false];
      lanesRef.current = buildLanes(levelRef.current);
      roundTimerRef.current = getRoundTime(levelRef.current) * 1000;
      resetFrog();
    }

    function addScore(pts: number) {
      scoreRef.current += pts;
      cbRef.current.onScoreChange?.(scoreRef.current);
    }

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (pausedRef.current || gameOverRef.current) return;

      const lanes = lanesRef.current;
      const frog = frogRef.current;

      // Move lane entities
      for (const lane of lanes) {
        for (const e of lane.entities) {
          e.col += (lane.speed * lane.dir * dt) / 1000;
          if (lane.dir === 1 && e.col >= COLS) e.col -= COLS + e.width;
          if (lane.dir === -1 && e.col + e.width <= 0) e.col += COLS + e.width;
        }
        // Update turtle submersion
        for (const e of lane.entities) {
          if (e.type === "turtle") {
            e.submergeTimer = (e.submergeTimer ?? 0) + dt;
            const phase = e.submergePhase ?? "visible";
            const limit = phase === "visible" ? TURTLE_SUBMERGE_VISIBLE : TURTLE_SUBMERGE_UNDER;
            if (e.submergeTimer >= limit) {
              e.submergeTimer -= limit;
              e.submergePhase = phase === "visible" ? "under" : "visible";
              e.submerged = e.submergePhase === "under";
            }
          }
        }
      }

      // Round timer
      roundTimerRef.current -= dt;
      if (roundTimerRef.current <= 0) {
        killFrog();
        return;
      }

      // Frog animation
      if (frog.animating) {
        frog.animT += dt;
        if (frog.animT >= JUMP_DURATION) {
          frog.col = frog.targetCol;
          frog.row = frog.targetRow;
          frog.animating = false;
          frog.animT = 0;
          resolveCell();
        }
        return;
      }

      // River drift: drift frog WITH the lane first, THEN check support
      // (entities already moved this frame; check after sync to avoid false kills)
      if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
        const lane = getLaneAtRow(lanes, frog.row);
        if (lane) {
          frog.col += (lane.speed * lane.dir * dt) / 1000;
          if (frog.col < 0 || frog.col >= COLS) { killFrog(); return; }
          const support = getSupport(frog, lanes);
          if (!support) { killFrog(); return; }
        } else {
          killFrog(); return;
        }
      }

      // Continuous road collision (car moves into idle frog)
      if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
        if (checkRoadCollision(frog, lanes)) { killFrog(); return; }
      }

      // Process input
      const dir = pendingDirRef.current;
      pendingDirRef.current = null;
      if (!dir) return;

      let nc = frog.col, nr = frog.row;
      if (dir === "up")    nr--;
      if (dir === "down")  nr++;
      if (dir === "left")  nc = Math.floor(nc) - 1;
      if (dir === "right") nc = Math.floor(nc) + 1;

      // Boundary checks
      if (nc < 0 || nc >= COLS) return;
      if (nr < 0 || nr >= ROWS) return;

      // Score for advancing up
      if (nr < frog.row && !visitedRowsRef.current.has(nr)) {
        visitedRowsRef.current.add(nr);
        addScore(10);
      }

      frog.fromCol = frog.col;
      frog.fromRow = frog.row;
      frog.targetCol = nc;
      frog.targetRow = nr;
      frog.animating = true;
      frog.animT = 0;
    }

    function resolveCell() {
      const frog = frogRef.current;

      // Goal row
      if (frog.row === ROW_GOALS) {
        const gIdx = getGoalIndex(Math.floor(frog.col));
        if (gIdx === -1) { killFrog(); return; }
        if (goalsRef.current[gIdx]) { killFrog(); return; }
        const timeBonus = Math.floor((roundTimerRef.current / 1000) * 10);
        addScore(50 + timeBonus);
        goalsRef.current[gIdx] = true;
        if (goalsRef.current.every(Boolean)) {
          completeRound();
        } else {
          roundTimerRef.current = getRoundTime(levelRef.current) * 1000;
          const cx = Math.floor(COLS / 2);
          const f = frogRef.current;
          f.col = cx; f.row = ROW_START;
          f.targetCol = cx; f.targetRow = ROW_START;
          f.fromCol = cx; f.fromRow = ROW_START;
          visitedRowsRef.current = new Set();
        }
        return;
      }

      // Road collision
      if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
        if (checkRoadCollision(frog, lanesRef.current)) { killFrog(); return; }
      }

      // River — must be on support
      if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
        const support = getSupport(frog, lanesRef.current);
        if (!support) { killFrog(); return; }
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
      const s = skinRef.current;
      if (s.boardBg) {
        ctx.fillStyle = s.boardBg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      } else {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Zone backgrounds
      // Goals row
      ctx.fillStyle = s.goalBg;
      ctx.fillRect(0, ROW_GOALS * CELL, CANVAS_W, CELL);

      // River rows
      ctx.fillStyle = s.riverBg;
      ctx.fillRect(0, ROW_RIVER_TOP * CELL, CANVAS_W, (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL);

      // Safe mid row
      ctx.fillStyle = s.safeBg;
      ctx.fillRect(0, ROW_SAFE_MID * CELL, CANVAS_W, CELL);

      // Road rows
      ctx.fillStyle = s.roadBg;
      ctx.fillRect(0, ROW_ROAD_TOP * CELL, CANVAS_W, (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL);

      // Start row
      ctx.fillStyle = s.safeBg;
      ctx.fillRect(0, ROW_START * CELL, CANVAS_W, CELL);

      // Road lane dividers
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let r = ROW_ROAD_TOP; r <= ROW_ROAD_BOT; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(CANVAS_W, r * CELL);
        ctx.stroke();
      }

      // Goal mouths
      for (let i = 0; i < GOAL_COLS.length; i++) {
        const x = GOAL_COLS[i] * CELL;
        const y = ROW_GOALS * CELL;
        ctx.fillStyle = goalsRef.current[i] ? "#2d8a2d" : s.goalBg;
        ctx.fillRect(x, y, CELL * 2, CELL);
        ctx.strokeStyle = s.goalBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, CELL * 2 - 2, CELL - 2);
        if (goalsRef.current[i]) {
          // Frog silhouette in goal
          drawFrogAt(ctx, s, x + CELL, y + CELL / 2, 0.7);
        }
      }

      // Entities
      for (const lane of lanesRef.current) {
        for (const e of lane.entities) {
          drawEntity(ctx, s, e, lane.row);
        }
      }

      // Frog
      const frog = frogRef.current;
      let fx: number, fy: number;
      if (frog.animating) {
        const t = frog.animT / JUMP_DURATION;
        fx = (frog.fromCol + (frog.targetCol - frog.fromCol) * t) * CELL + CELL / 2;
        fy = (frog.fromRow + (frog.targetRow - frog.fromRow) * t) * CELL + CELL / 2;
      } else {
        fx = frog.col * CELL + CELL / 2;
        fy = frog.row * CELL + CELL / 2;
      }
      drawFrogAt(ctx, s, fx, fy, 1);

      // HUD
      drawHUD(ctx, s);
    }

    function drawEntity(ctx: CanvasRenderingContext2D, s: FroggerSkin, e: Entity, row: number) {
      const y = row * CELL;
      const x = e.col * CELL;
      const w = e.width * CELL;
      const h = CELL;

      if (e.type === "log") {
        ctx.fillStyle = s.logColor;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 6, w - 4, h - 12, 6);
        ctx.fill();
        // Stripe
        ctx.fillStyle = s.logStripe;
        for (let i = 1; i < e.width; i++) {
          ctx.fillRect(x + i * CELL - 2, y + 6, 4, h - 12);
        }
      } else if (e.type === "turtle") {
        const alpha = e.submerged ? 0.3 : 1;
        ctx.globalAlpha = alpha;
        for (let i = 0; i < e.width; i++) {
          const tx = x + i * CELL + 4;
          const ty = y + 4;
          ctx.fillStyle = s.turtleColor;
          ctx.beginPath();
          ctx.ellipse(tx + 16, ty + 16, 14, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          // Shell pattern
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(tx + 16, ty + 16, 8, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (e.type === "car") {
        const colorIdx = Math.floor(Math.abs(e.col * 7 + row * 3)) % s.carColors.length;
        ctx.fillStyle = s.carColors[colorIdx];
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 8, w - 4, h - 16, 4);
        ctx.fill();
        // Windows
        ctx.fillStyle = "rgba(180,220,255,0.6)";
        ctx.fillRect(x + 5, y + 10, w - 10, h - 22);
        // Wheels
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(x + 8, y + h - 6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w - 8, y + h - 6, 5, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === "truck") {
        ctx.fillStyle = s.truckColor;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 6, w - 4, h - 12, 4);
        ctx.fill();
        // Cabin
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        const cabW = CELL - 4;
        ctx.fillRect(x + 2, y + 6, cabW, h - 12);
        // Wheels
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(x + 10, y + h - 6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w - 10, y + h - 6, 5, 0, Math.PI * 2); ctx.fill();
      }
    }

    function drawFrogAt(ctx: CanvasRenderingContext2D, s: FroggerSkin, cx: number, cy: number, scale: number) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      // Body
      ctx.fillStyle = s.frogBody;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = s.frogEye;
      ctx.beginPath(); ctx.arc(-8, -9, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -9, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(-8, -9, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -9, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawHUD(ctx: CanvasRenderingContext2D, s: FroggerSkin) {
      const score = scoreRef.current;
      const lives = livesRef.current;
      const level = levelRef.current;
      const roundMs = Math.max(0, roundTimerRef.current);
      const roundTotal = Math.max(8, ROUND_TIME_BASE - (levelRef.current - 1) * 1) * 1000;
      const timeFrac = roundMs / roundTotal;

      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#ffffff";

      // Score top-left
      ctx.textAlign = "left";
      ctx.fillText(`${score}`, 8, 14);

      // Level top-center
      ctx.textAlign = "center";
      ctx.fillText(`LV ${level}`, CANVAS_W / 2, 14);

      // Lives top-right (frog icons)
      for (let i = 0; i < lives; i++) {
        ctx.fillStyle = s.frogBody;
        ctx.beginPath();
        ctx.arc(CANVAS_W - 14 - i * 18, 10, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Time bar (bottom of HUD row, above goals)
      const barX = 4;
      const barY = ROW_GOALS * CELL + CELL - 6;
      const barW = CANVAS_W - 8;
      const barH = 4;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(barX, barY, barW, barH);
      const timeColor = timeFrac > 0.5 ? s.timeFull : timeFrac > 0.25 ? s.timeMid : s.timeLow;
      ctx.fillStyle = timeColor;
      ctx.fillRect(barX, barY, barW * timeFrac, barH);
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    function loop(now: number) {
      const dt = Math.min(now - (lastTimeRef.current || now), 100);
      lastTimeRef.current = now;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("keydown", handleKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Virtual key bridge for GamepadOverlay
  function pressVirtualKey(code: string) {
    const map: Record<string, Direction> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    };
    if (map[code]) pendingDirRef.current = map[code];
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Skin selector */}
      {!skinKeyProp && (
        <div className="flex gap-2">
          {Object.keys(SKINS).map((key) => (
            <button
              key={key}
              onClick={() => setLocalSkinKey(key)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                activeSkinKey === key
                  ? "bg-lime-500 text-black border-lime-500"
                  : "bg-transparent text-lime-400 border-lime-700 hover:border-lime-500"
              }`}
            >
              {SKIN_LABELS[key]}
            </button>
          ))}
        </div>
      )}
      <div style={{ width: "100%", aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <GamepadOverlay
        onUpPress={() => pressVirtualKey("ArrowUp")}
        onDownPress={() => pressVirtualKey("ArrowDown")}
        onLeftPress={() => pressVirtualKey("ArrowLeft")}
        onRightPress={() => pressVirtualKey("ArrowRight")}
      />
    </div>
  );
}
