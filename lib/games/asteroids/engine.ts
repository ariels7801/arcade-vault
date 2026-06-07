// Motor de Asteroides portado de references/started-games/02-asteroids/game.js
// El estado de score/lives/level/game-over se notifica vía callbacks; el HUD
// numérico fuera del canvas y el modal de Game Over los reflejan en React.

export const W = 800;
export const H = 600;

export type GameState = "playing" | "dead" | "gameover";

export interface EngineCallbacks {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export interface InputState {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

const TRIPLE_SHOT_DURATION = 10;
const TRIPLE_SPREAD = Math.PI / 12;
const POWERUP_SPAWN_CHANCE = 0.4;
const POWERUP_TTL = 12;
const POWERUP_RADIUS = 12;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function pressed(input: InputState, code: string): boolean {
  const val = input.justPressed[code];
  input.justPressed[code] = false;
  return !!val;
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  dead: boolean;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead: boolean;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  tripleShotTimer = 0;
  dead = false;

  constructor() {
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.tripleShotTimer = 0;
    this.dead = false;
  }

  update(dt: number, input: InputState) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (input.keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (input.keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!input.keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  radius: number;
  ttl: number;
  angle: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = POWERUP_RADIUS;
    this.ttl = POWERUP_TTL;
    this.angle = 0;
    this.dead = false;
  }

  update(dt: number) {
    this.ttl -= dt;
    this.angle += dt * 2;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = Math.min(1, this.ttl / 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const r = this.radius;
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(0,255,255,0.15)";
    ctx.fill();
    ctx.fillStyle = "#0ff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3\xd7", 0, 0);
    ctx.restore();
  }
}

// ── Engine ────────────────────────────────────────────────────────────────────
export class Engine {
  /** Mutado externamente por el componente al recibir eventos de teclado/táctiles */
  readonly input: InputState = { keys: {}, justPressed: {} };

  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  private ship: Ship;
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private powerups: PowerUp[] = [];
  private powerupSpawned = false;

  private score = 0;
  private lives = 3;
  private level = 1;
  private state: GameState = "playing";
  private deadTimer = 0;

  constructor(ctx: CanvasRenderingContext2D, callbacks: EngineCallbacks = {}) {
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.ship = new Ship();
    this.initGame();
  }

  private setScore(value: number) {
    if (this.score === value) return;
    this.score = value;
    this.callbacks.onScoreChange?.(this.score);
  }

  private setLives(value: number) {
    if (this.lives === value) return;
    this.lives = value;
    this.callbacks.onLivesChange?.(this.lives);
  }

  private setLevel(value: number) {
    if (this.level === value) return;
    this.level = value;
    this.callbacks.onLevelChange?.(this.level);
  }

  private spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  initGame() {
    this.ship = new Ship();
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerups = [];
    this.powerupSpawned = false;
    this.setScore(0);
    this.setLives(3);
    this.setLevel(1);
    this.state = "playing";
    this.spawnAsteroids(4);
  }

  private nextLevel() {
    this.setLevel(this.level + 1);
    this.bullets = [];
    this.particles = [];
    this.powerups = [];
    this.powerupSpawned = false;
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  private explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y));
  }

  private killShip() {
    this.explode(this.ship.x, this.ship.y, 14);
    this.ship.dead = true;
    this.setLives(this.lives - 1);
    if (this.lives <= 0) {
      this.state = "gameover";
      this.callbacks.onGameOver?.(this.score);
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  update(dt: number) {
    if (this.state === "gameover") {
      // El reinicio ahora lo controla React vía el modal de Game Over,
      // no se reinicia con Espacio como en el reference standalone.
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      return;
    }

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.state = "playing";
        this.ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed(this.input, "Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }

    this.ship.update(dt, this.input);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));
    this.particles.forEach((p) => p.update(dt));
    this.powerups.forEach((p) => p.update(dt));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.powerups = this.powerups.filter((p) => !p.dead);

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    let lastKilledX = W / 2;
    let lastKilledY = H / 2;
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          lastKilledX = a.x;
          lastKilledY = a.y;
          this.setScore(this.score + POINTS[a.size]);
          this.explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!this.powerupSpawned && Math.random() < POWERUP_SPAWN_CHANCE) {
            this.powerups.push(new PowerUp(a.x, a.y));
            this.powerupSpawned = true;
          }
        }
      }
    }
    const afterFilter = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    if (afterFilter.length === 0 && !this.powerupSpawned && this.powerups.length === 0) {
      this.powerups.push(new PowerUp(lastKilledX, lastKilledY));
      this.powerupSpawned = true;
    }
    this.asteroids = afterFilter;
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }

    // Nave vs power-up
    for (const p of this.powerups) {
      if (!p.dead && dist(this.ship, p) < this.ship.radius + p.radius) {
        p.dead = true;
        this.ship.tripleShotTimer = TRIPLE_SHOT_DURATION;
      }
    }

    // Nivel completado (esperar a que no quede power-up flotando)
    if (this.asteroids.length === 0 && this.powerups.length === 0) this.nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  private drawLifeIcon(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, W / 2, 26);

    for (let i = 0; i < this.lives; i++) this.drawLifeIcon(W - 16 - i * 22, 18);

    if (this.ship.tripleShotTimer > 0) {
      ctx.fillStyle = "#0ff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`3\xd7  ${Math.ceil(this.ship.tripleShotTimer)}s`, 14, 48);
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    this.particles.forEach((p) => p.draw(ctx));
    this.asteroids.forEach((a) => a.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.powerups.forEach((p) => p.draw(ctx));
    this.ship.draw(ctx);

    this.drawHUD();
  }
}
