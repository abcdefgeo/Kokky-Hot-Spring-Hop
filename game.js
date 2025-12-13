const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ===============================
   VIRTUAL SCREEN
================================ */
const VIRTUAL_WIDTH = 390;
const VIRTUAL_HEIGHT = 844;

let scale = 1, offsetX = 0, offsetY = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  scale = Math.min(canvas.width / VIRTUAL_WIDTH, canvas.height / VIRTUAL_HEIGHT);
  offsetX = (canvas.width - VIRTUAL_WIDTH * scale) / 2;
  offsetY = (canvas.height - VIRTUAL_HEIGHT * scale) / 2;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ===============================
   ASSETS
================================ */
const kokkyImg = new Image(); kokkyImg.src = "kokky.png";
const woodImg = new Image(); woodImg.src = "wood.png";
const mountainsImg = new Image(); mountainsImg.src = "mountains.png";
const steamImg = new Image(); steamImg.src = "steam.png";

/* ===============================
   PLAYER
================================ */
const player = {
  x: 80,
  y: VIRTUAL_HEIGHT / 2,
  w: 48,
  h: 48,
  vy: 0
};

const GRAVITY = 0.5;
const JUMP = -8;

/* ===============================
   OBSTACLES
================================ */
let obstacles = [];
const OBSTACLE_WIDTH = 70;
const GAP = 170;
const SPEED = 2.5;
const SPAWN_DISTANCE = 270;
let spawnX = 0;

/* ===============================
   STATE
================================ */
let started = false;
let gameOver = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;

/* ===============================
   INPUT
================================ */
function jump() {
  if (!localStorage.getItem("playerId")) return;

  if (gameOver) {
    resetGame();
    return;
  }

  if (!started) {
    started = true;
    spawnX = VIRTUAL_WIDTH + OBSTACLE_WIDTH + 40;
  }

  player.vy = JUMP;
  hopSteam.push({
    x: player.x + player.w / 2,
    y: player.y + player.h - 4,
    life: 14
  });
}

window.addEventListener("keydown", e => e.code === "Space" && jump());
canvas.addEventListener("touchstart", e => { e.preventDefault(); jump(); });

/* ===============================
   HELPERS
================================ */
function spawnObstacle() {
  const minY = 120;
  const maxY = VIRTUAL_HEIGHT - GAP - 220;
  const gapY = Math.random() * (maxY - minY) + minY;
  obstacles.push({ x: spawnX, gapY, passed: false });
  spawnX += SPAWN_DISTANCE;
}

function hit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function resetGame() {
  player.y = VIRTUAL_HEIGHT / 2;
  player.vy = 0;
  obstacles = [];
  score = 0;
  started = false;
  gameOver = false;
}

/* ===============================
   VISUAL ELEMENTS
================================ */
// stars
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * VIRTUAL_WIDTH,
  y: Math.random() * VIRTUAL_HEIGHT * 0.6,
  r: Math.random() * 1.4 + 0.6,
  c: Math.random() < 0.7 ? "#ffd966" : "#ffffff"
}));

// snow (bigger)
const snow = Array.from({ length: 35 }, () => ({
  x: Math.random() * VIRTUAL_WIDTH,
  y: Math.random() * VIRTUAL_HEIGHT,
  s: Math.random() * 0.4 + 0.3,
  r: Math.random() * 1.5 + 1
}));

// hop steam
let hopSteam = [];

// mountain scroll
let mountainX = 0;

// steam scroll
let steamX = 0;

/* ===============================
   DRAW HELPERS
================================ */
function drawMoon() {
  const x = 300, y = 120, r = 36;

  // glow
  const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.6);
  g.addColorStop(0, "rgba(255,245,210,0.9)");
  g.addColorStop(1, "rgba(255,245,210,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // moon body
  ctx.fillStyle = "#f3e6b3";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // craters
  const craters = [
    { x: x - 10, y: y - 6, r: 5 },
    { x: x + 8, y: y + 4, r: 4 },
    { x: x - 2, y: y + 10, r: 3 }
  ];

  ctx.fillStyle = "rgba(210,200,160,0.6)";
  craters.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawObstacle(obs) {
  ctx.drawImage(woodImg, obs.x, 0, OBSTACLE_WIDTH, obs.gapY);
  ctx.drawImage(
    woodImg,
    obs.x,
    obs.gapY + GAP,
    OBSTACLE_WIDTH,
    VIRTUAL_HEIGHT - (obs.gapY + GAP)
  );
}

/* ===============================
   MAIN LOOP
================================ */
function loop() {
  ctx.fillStyle = "#02040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // stars
  stars.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  drawMoon();

  // snow
  snow.forEach(f => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    if (!gameOver) {
      f.y += f.s;
      if (f.y > VIRTUAL_HEIGHT) f.y = 0;
    }
  });

  // mountains (farther away)
  ctx.drawImage(mountainsImg, mountainX, 520, VIRTUAL_WIDTH, 180);
  ctx.drawImage(mountainsImg, mountainX + VIRTUAL_WIDTH, 520, VIRTUAL_WIDTH, 180);
  if (!gameOver) {
    mountainX -= 0.15;
    if (mountainX <= -VIRTUAL_WIDTH) mountainX = 0;
  }

  // gravity always active (no floating)
  if (!gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  // obstacles
  if (started && !gameOver) {
    if (obstacles.length === 0 ||
        spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE) {
      spawnObstacle();
    }
  }

  obstacles.forEach(obs => {
    if (!gameOver) obs.x -= SPEED;
    drawObstacle(obs);

    if (!obs.passed && obs.x + OBSTACLE_WIDTH < player.x) {
      obs.passed = true;
      score++;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
      }
    }

    const hitBox = {
      x: player.x + 6,
      y: player.y + 6,
      w: player.w - 12,
      h: player.h - 12
    };

    const topBox = { x: obs.x, y: 0, w: OBSTACLE_WIDTH, h: obs.gapY };
    const botBox = { x: obs.x, y: obs.gapY + GAP, w: OBSTACLE_WIDTH, h: VIRTUAL_HEIGHT };

    if (!gameOver && (hit(hitBox, topBox) || hit(hitBox, botBox))) {
      gameOver = true;
    }
  });

  // hop steam (closer + lighter)
  hopSteam.forEach(p => {
    ctx.fillStyle = `rgba(255,255,255,${p.life / 20})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    p.life--;
  });
  hopSteam = hopSteam.filter(p => p.life > 0);

  // bottom steam
  ctx.globalAlpha = 0.55;
  ctx.drawImage(steamImg, steamX, VIRTUAL_HEIGHT - 120);
  ctx.drawImage(steamImg, steamX + VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 120);
  ctx.globalAlpha = 1;
  if (!gameOver) {
    steamX -= 0.15;
    if (steamX <= -VIRTUAL_WIDTH) steamX = 0;
  }

  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

  ctx.fillStyle = "#fff";
  ctx.font = "20px Handjet";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${score}  Best: ${bestScore}`, VIRTUAL_WIDTH / 2, 30);

  ctx.restore();
  requestAnimationFrame(loop);
}

loop();
