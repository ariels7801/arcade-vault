const CANVAS_W = 800, CANVAS_H = 600;
const COLS = 10, ROWS = 6;
const BLOCK_W = 64, BLOCK_H = 24;
const BALL_SPEED_INIT = 4;
const PADDLE_SPEED_KB = 6;
const BLOCK_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink', 'gray'];
const LEVEL_ROW_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink'];

function makeLayout(fn) {
  const layout = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      layout.push(fn(row, col));
  return layout;
}

const LEVELS = [
  { speedMult: 1.0,  layout: null },
  { speedMult: 1.25, layout: makeLayout((r) => LEVEL_ROW_COLORS[r]) },
  { speedMult: 1.5,  layout: makeLayout((r, c) => (r + c) % 2 === 0 ? BLOCK_COLORS[r % BLOCK_COLORS.length] : null) },
  { speedMult: 1.75, layout: makeLayout((r, c) => (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 || r === 2) ? BLOCK_COLORS[(r * COLS + c) % BLOCK_COLORS.length] : null) },
  { speedMult: 2.0,  layout: makeLayout((r) => r % 2 === 0 ? 'hotpink' : 'red') },
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState, ball, paddle, blocks, activeExplosions;

let soundEnabled = true;
const sounds = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break:  new Audio('assets/sounds/break-sound.mp3'),
};

function playSound(name) {
  if (!soundEnabled) return;
  const s = sounds[name];
  s.currentTime = 0;
  s.play().catch(() => {});
}

function initGame() {
  paddle = {
    x: CANVAS_W / 2 - 81,
    y: CANVAS_H - 40,
    width: 162,
    height: 14,
    speed: PADDLE_SPEED_KB,
  };
  gameState = { status: 'waiting', lives: 3, score: 0, level: 1, levelCompleteTime: null };
  initLevel(1);
}

function initLevel(n) {
  gameState.level = n;
  gameState.status = 'waiting';
  gameState.levelCompleteTime = null;
  activeExplosions = [];
  const spd = BALL_SPEED_INIT * LEVELS[n - 1].speedMult;
  ball = {
    x: paddle.x + paddle.width / 2 - 8,
    y: paddle.y - 16,
    vx: spd,
    vy: -spd,
    width: 16,
    height: 16,
  };
  initBlocks(n);
}

function initBlocks(n) {
  blocks = [];
  const gridW = COLS * BLOCK_W;
  const offsetX = (CANVAS_W - gridW) / 2;
  const offsetY = 60;
  const layout = LEVELS[n - 1].layout;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col;
      let color, alive;
      if (layout === null) {
        color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
        alive = true;
      } else {
        color = layout[i] !== null ? layout[i] : 'gray';
        alive = layout[i] !== null;
      }
      blocks.push({
        x: offsetX + col * BLOCK_W,
        y: offsetY + row * BLOCK_H,
        width: BLOCK_W,
        height: BLOCK_H,
        color,
        alive,
      });
    }
  }
}

const keys = { left: false, right: false };
let mouseX = null;

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
});

canvas.addEventListener('mouseleave', () => { mouseX = null; });

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  keys.left  = true;
  if (e.key === 'ArrowRight') keys.right = true;
  if (e.key === 'm' || e.key === 'M') soundEnabled = !soundEnabled;
  if (e.key === ' ') {
    if (gameState.status === 'waiting') {
      gameState.status = 'playing';
    } else if (gameState.status === 'gameover' || gameState.status === 'victory') {
      initGame();
    }
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft')  keys.left  = false;
  if (e.key === 'ArrowRight') keys.right = false;
});

function update() {
  // Mover paleta
  if (mouseX !== null) {
    paddle.x = Math.max(0, Math.min(CANVAS_W - paddle.width, mouseX - paddle.width / 2));
  } else {
    if (keys.left)  paddle.x = Math.max(0, paddle.x - paddle.speed);
    if (keys.right) paddle.x = Math.min(CANVAS_W - paddle.width, paddle.x + paddle.speed);
  }

  // Nivel completado: esperar 2s y avanzar
  if (gameState.status === 'level_complete') {
    if (performance.now() - gameState.levelCompleteTime >= 2000) {
      initLevel(gameState.level + 1);
    }
    return;
  }

  // Pelota pegada a paleta en estado waiting
  if (gameState.status === 'waiting') {
    ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
    ball.y = paddle.y - ball.height;
    return;
  }

  if (gameState.status !== 'playing') return;

  // Mover pelota
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Rebote paredes laterales
  if (ball.x <= 0) { ball.x = 0; ball.vx = Math.abs(ball.vx); playSound('bounce'); }
  if (ball.x + ball.width >= CANVAS_W) { ball.x = CANVAS_W - ball.width; ball.vx = -Math.abs(ball.vx); playSound('bounce'); }

  // Rebote techo
  if (ball.y <= 0) { ball.y = 0; ball.vy = Math.abs(ball.vy); playSound('bounce'); }

  // Colisión pelota–paleta
  if (
    ball.vy > 0 &&
    ball.x + ball.width > paddle.x &&
    ball.x < paddle.x + paddle.width &&
    ball.y + ball.height >= paddle.y &&
    ball.y + ball.height <= paddle.y + paddle.height + Math.abs(ball.vy)
  ) {
    ball.y = paddle.y - ball.height;
    ball.vy = -Math.abs(ball.vy);
    playSound('bounce');
  }

  // Colisión pelota–bloques (AABB)
  for (const b of blocks) {
    if (!b.alive) continue;
    if (
      ball.x + ball.width > b.x &&
      ball.x < b.x + b.width &&
      ball.y + ball.height > b.y &&
      ball.y < b.y + b.height
    ) {
      b.alive = false;
      gameState.score += 10;
      playSound('break');
      activeExplosions.push({ x: b.x, y: b.y, width: b.width, height: b.height, color: b.color, startTime: performance.now() });

      const overlapLeft   = ball.x + ball.width - b.x;
      const overlapRight  = b.x + b.width - ball.x;
      const overlapTop    = ball.y + ball.height - b.y;
      const overlapBottom = b.y + b.height - ball.y;
      const minH = Math.min(overlapLeft, overlapRight);
      const minV = Math.min(overlapTop, overlapBottom);

      if (minH < minV) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }
      break;
    }
  }

  // Pelota cae fuera del canvas inferior
  if (ball.y > CANVAS_H) {
    gameState.lives--;
    if (gameState.lives <= 0) {
      gameState.status = 'gameover';
    } else {
      gameState.status = 'waiting';
      const spd = BALL_SPEED_INIT * LEVELS[gameState.level - 1].speedMult;
      ball.vx = spd;
      ball.vy = -spd;
    }
  }

  // Victoria / avance de nivel
  if (blocks.every(b => !b.alive)) {
    if (gameState.level < 5) {
      gameState.status = 'level_complete';
      gameState.levelCompleteTime = performance.now();
    } else {
      gameState.status = 'victory';
    }
  }

  activeExplosions = activeExplosions.filter(
    e => performance.now() - e.startTime < EXPLOSION_DURATION * EXPLOSION_FRAMES[e.color].length
  );
}

function draw() {
  // Fondo negro
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Bloques
  for (const b of blocks) {
    if (b.alive) drawSprite(ctx, 'block_' + b.color, b.x, b.y, b.width, b.height);
  }

  // Explosiones
  const now = performance.now();
  for (const e of activeExplosions) {
    const frameIdx = Math.min(
      Math.floor((now - e.startTime) / EXPLOSION_DURATION),
      EXPLOSION_FRAMES[e.color].length - 1
    );
    drawFrame(ctx, EXPLOSION_FRAMES[e.color][frameIdx], e.x, e.y, e.width, e.height);
  }

  // Paleta
  drawSprite(ctx, 'paddle', paddle.x, paddle.y, paddle.width, paddle.height);

  // Pelota
  drawSprite(ctx, 'ball', ball.x, ball.y, ball.width, ball.height);

  // HUD
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.fillText('Puntaje: ' + gameState.score, CANVAS_W - 140, 20);
  ctx.fillText('Nivel: ' + gameState.level + '/5', CANVAS_W - 140, 40);
  ctx.fillText('M: ' + (soundEnabled ? 'ON ' : 'OFF'), CANVAS_W - 140, 60);
  for (let i = 0; i < gameState.lives; i++) {
    drawSprite(ctx, 'ball', 10 + i * 20, 8, 16, 16);
  }

  // Overlay nivel completado
  if (gameState.status === 'level_complete') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('¡Nivel ' + gameState.level + ' completado!', CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.font = '20px monospace';
    ctx.fillText('Siguiente nivel en breve...', CANVAS_W / 2, CANVAS_H / 2 + 30);
    ctx.textAlign = 'left';
  }

  // Overlay game over / victoria
  if (gameState.status === 'gameover' || gameState.status === 'victory') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    const msg = gameState.status === 'victory' ? '¡Victoria!' : 'Game Over';
    ctx.fillText(msg, CANVAS_W / 2, CANVAS_H / 2 - 20);

    ctx.font = '20px monospace';
    ctx.fillText('Presioná Espacio para reiniciar', CANVAS_W / 2, CANVAS_H / 2 + 30);
    ctx.textAlign = 'left';
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  initGame();
  requestAnimationFrame(loop);
});
