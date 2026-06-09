import type { EngineCallbacks, InputState } from "../types";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// ── Skin type ─────────────────────────────────────────────────────────────────

export interface TetrisSkin {
  /** boardBg: null = transparent (uses page dark bg); string = fill color */
  boardBg: string | null;
  /** Per-piece-type colors. Index matches PIECES type number (1-8). */
  colors: (string | null)[];
  /** Ghost piece alpha */
  ghostAlpha: number;
  /** Draw a single block. Implement per-skin decoration (highlight, glow, etc.) */
  drawBlock: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    alpha: number,
    skin: TetrisSkin,
  ) => void;
  /** Grid line color */
  gridColor: string;
  /** Preview box background */
  previewBg: string;
  /** Preview box border */
  previewBorder: string;
}

// ── Classic skin (NES palette) ─────────────────────────────────────────────────
const CLASSIC_COLORS: (string | null)[] = [
  null,
  "#00f0f0", // I - cyan
  "#f0f000", // O - yellow
  "#a000f0", // T - purple
  "#00f000", // S - green
  "#f00000", // Z - red
  "#0000f0", // J - blue
  "#f0a000", // L - orange
  "#90a4ae", // Nut - steel gray
];

function classicDrawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha: number,
  skin: TetrisSkin,
): void {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = skin.colors[colorIndex] as string;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // subtle top highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

export const CLASSIC_SKIN: TetrisSkin = {
  boardBg: null,
  colors: CLASSIC_COLORS,
  ghostAlpha: 0.2,
  drawBlock: classicDrawBlock,
  gridColor: "rgba(255,255,255,0.05)",
  previewBg: "rgba(0,0,0,0.55)",
  previewBorder: "rgba(255,255,255,0.1)",
};

// ── Retro skin (CRT saturated palette, solid blocks, 4px highlight) ────────────
const RETRO_COLORS: (string | null)[] = [
  null,
  "#00e5ff", // I
  "#ffee00", // O
  "#cc44ff", // T
  "#44ff44", // S
  "#ff4444", // Z
  "#4488ff", // J
  "#ff8800", // L
  "#aabbcc", // Nut
];

function retroDrawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha: number,
  skin: TetrisSkin,
): void {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  // Solid fill — no shadow
  ctx.fillStyle = skin.colors[colorIndex] as string;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // 4px white semitransparent highlight at top (CRT bevel)
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

export const RETRO_SKIN: TetrisSkin = {
  boardBg: "#0d1a0d",
  colors: RETRO_COLORS,
  ghostAlpha: 0.18,
  drawBlock: retroDrawBlock,
  gridColor: "rgba(0,255,0,0.06)",
  previewBg: "rgba(0,20,0,0.8)",
  previewBorder: "rgba(0,255,0,0.15)",
};

// ── Neon skin (electric glow, shadowBlur, strokeRect outlines) ─────────────────
const NEON_COLORS: (string | null)[] = [
  null,
  "#00ffff", // I
  "#ffff00", // O
  "#dd00ff", // T
  "#00ff44", // S
  "#ff0044", // Z
  "#0066ff", // J
  "#ff6600", // L
  "#aaddff", // Nut
];

function neonDrawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha: number,
  skin: TetrisSkin,
): void {
  if (!colorIndex) return;
  const color = skin.colors[colorIndex] as string;
  ctx.globalAlpha = alpha;

  // Glow
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;

  // Fill (semi-transparent so glow shows through)
  ctx.fillStyle = color + "55";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

  // Bright stroke outline
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x * size + 1.75, y * size + 1.75, size - 3.5, size - 3.5);

  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.globalAlpha = 1;
}

export const NEON_SKIN: TetrisSkin = {
  boardBg: "#000000",
  colors: NEON_COLORS,
  ghostAlpha: 0.15,
  drawBlock: neonDrawBlock,
  gridColor: "rgba(0,200,255,0.07)",
  previewBg: "rgba(0,0,0,0.85)",
  previewBorder: "rgba(0,200,255,0.25)",
};

// ── Piece shapes ───────────────────────────────────────────────────────────────

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Nut
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = (PIECES[type] as number[][]).map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(board: number[][], shape: number[][], ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export class Engine {
  readonly input: InputState = { keys: {}, justPressed: {} };

  public skin: TetrisSkin;

  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;
  private board: number[][] = createBoard();
  private current: Piece = randomPiece();
  private next: Piece = randomPiece();
  private _score = 0;
  private _lines = 0;
  private _level = 1;
  private dropAccum = 0;
  private dropInterval = 1000;
  private over = false;

  constructor(
    ctx: CanvasRenderingContext2D,
    callbacks: EngineCallbacks = {},
    skin: TetrisSkin = CLASSIC_SKIN,
  ) {
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.skin = skin;
  }

  private setScore(v: number): void {
    if (v === this._score) return;
    this._score = v;
    this.callbacks.onScoreChange?.(v);
  }

  private setLevel(v: number): void {
    if (v === this._level) return;
    this._level = v;
    this.callbacks.onLevelChange?.(v);
  }

  initGame(): void {
    this.board = createBoard();
    this._score = 0;
    this._lines = 0;
    this._level = 1;
    this.dropAccum = 0;
    this.dropInterval = 1000;
    this.over = false;
    this.next = randomPiece();
    this.spawn();
    this.callbacks.onScoreChange?.(0);
    this.callbacks.onLevelChange?.(1);
  }

  private spawn(): void {
    this.current = this.next;
    this.next = randomPiece();
    if (collide(this.board, this.current.shape, this.current.x, this.current.y)) {
      this.over = true;
      this.callbacks.onGameOver?.(this._score);
    }
  }

  private ghostY(): number {
    let gy = this.current.y;
    while (!collide(this.board, this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private merge(): void {
    const { shape, x, y } = this.current;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) this.board[y + r][x + c] = shape[r][c];
  }

  private clearLines(): void {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this._lines += cleared;
      this.setScore(this._score + (LINE_SCORES[cleared] || 0) * this._level);
      this.setLevel(Math.floor(this._lines / 10) + 1);
      this.dropInterval = Math.max(100, 1000 - (this._level - 1) * 90);
    }
  }

  private tryRotate(): void {
    const rotated = rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(this.board, rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private softDrop(): void {
    if (!collide(this.board, this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.setScore(this._score + 1);
    } else {
      this.lockPiece();
    }
  }

  private hardDrop(): void {
    const gy = this.ghostY();
    this.setScore(this._score + (gy - this.current.y) * 2);
    this.current.y = gy;
    this.lockPiece();
  }

  private lockPiece(): void {
    this.merge();
    this.clearLines();
    this.spawn();
  }

  update(dt: number): void {
    if (this.over) return;

    const jp = this.input.justPressed;

    if (jp["ArrowLeft"]) {
      if (!collide(this.board, this.current.shape, this.current.x - 1, this.current.y))
        this.current.x--;
    }
    if (jp["ArrowRight"]) {
      if (!collide(this.board, this.current.shape, this.current.x + 1, this.current.y))
        this.current.x++;
    }
    if (jp["ArrowUp"] || jp["KeyX"]) {
      this.tryRotate();
    }
    if (jp["ArrowDown"]) {
      this.softDrop();
    }
    if (jp["Space"]) {
      this.hardDrop();
    }

    this.input.justPressed = {};

    if (this.over) return;

    this.dropAccum += dt * 1000;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      if (!collide(this.board, this.current.shape, this.current.x, this.current.y + 1)) {
        this.current.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const skin = this.skin;
    const W = COLS * BLOCK;
    const H = ROWS * BLOCK;

    // Board background
    if (skin.boardBg) {
      ctx.fillStyle = skin.boardBg;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    // Grid lines
    ctx.strokeStyle = skin.gridColor;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(W, r * BLOCK);
      ctx.stroke();
    }

    // Board pieces
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        skin.drawBlock(ctx, c, r, this.board[r][c], BLOCK, 1, skin);

    if (!this.over) {
      // Ghost piece
      const gy = this.ghostY();
      for (let r = 0; r < this.current.shape.length; r++)
        for (let c = 0; c < this.current.shape[r].length; c++)
          if (this.current.shape[r][c])
            skin.drawBlock(ctx, this.current.x + c, gy + r, this.current.shape[r][c], BLOCK, skin.ghostAlpha, skin);

      // Current piece
      for (let r = 0; r < this.current.shape.length; r++)
        for (let c = 0; c < this.current.shape[r].length; c++)
          if (this.current.shape[r][c])
            skin.drawBlock(ctx, this.current.x + c, this.current.y + r, this.current.shape[r][c], BLOCK, 1, skin);
    }

    // Next piece preview (top-right corner)
    const NB = 20;
    const previewX = W - 4 * NB - 6;
    const previewY = 6;
    ctx.fillStyle = skin.previewBg;
    ctx.fillRect(previewX - 2, previewY - 2, 4 * NB + 4, 4 * NB + 4);
    ctx.strokeStyle = skin.previewBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(previewX - 2, previewY - 2, 4 * NB + 4, 4 * NB + 4);

    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const px = previewX + (offX + c) * NB;
        const py = previewY + (offY + r) * NB;
        ctx.globalAlpha = 1;
        ctx.fillStyle = skin.colors[shape[r][c]] as string;

        if (skin === NEON_SKIN) {
          const col = skin.colors[shape[r][c]] as string;
          ctx.shadowBlur = 10;
          ctx.shadowColor = col;
          ctx.fillStyle = col + "55";
          ctx.fillRect(px + 1, py + 1, NB - 2, NB - 2);
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1.75, py + 1.75, NB - 3.5, NB - 3.5);
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        } else {
          ctx.fillRect(px + 1, py + 1, NB - 2, NB - 2);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(px + 1, py + 1, NB - 2, 3);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
