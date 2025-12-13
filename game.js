const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* =====================================================
   VIRTUAL SCREEN (PHONE SIZE)
===================================================== */
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

/* =====================================================
   VISUAL CONSTANTS (LOCKED)
===================================================== */
const SKY_TOP = "#0A1633";
const SKY_BOTTOM = "#000814";

// mountains "farther" (smaller + lower)
const MOUNTAIN_Y = 560;
const MOUNTAIN_H = 155;

/* =====================================================
   PLAYER SELECTION (LOCKED)
===================================================== */
const modal = document.getElementById("playerModal");
const teamButtons = document.getElementById("teamButtons");
const idSelect = document.getElementById("idSelect");
const selectRow = document.getElementById("selectRow");
const confirmBtn = document.getElementById("confirmPlayer");

let selectedTeam = null;
let selectedId = null;

const teamData = {
  W: [5,8,9,18,19,22,28,29,30,34,"A","B"],
  R: [1,4,6,7,11,13,20,21,27,31,40,"A","B"],
  G: [10,12,14,23,24,26,35,36,37,39,"A","B"],
  B: [2,3,15,16,17,25,32,33,38,41,"A","B"],
};

function ensureModalState() {
  const pid = localStorage.getItem("playerId");
  modal.style.display = pid ? "none" : "flex";
  confirmBtn.disabled = true;
  idSelect.innerHTML = `<option value="">Select</option>`;
  idSelect.value = "";
  selectRow.classList.add("hidden");
  selectedTeam = null;
  selectedId = null;
}
ensureModalState();

teamButtons.addEventListener("click", e => {
  if (!e.target.dataset.team) return;

  selectedTeam = e.target.dataset.team;
  selectedId = null;

  confirmBtn.disabled = true;
  idSelect.innerHTML = `<option value="">Select</option>`;
  idSelect.value = "";
  selectRow.classList.remove("hidden");

  if (selectedTeam === "Guest") {
    addOption("0", "0");
  } else if (selectedTeam === "Admin") {
    addOption("G", "G");
    addOption("S", "S");
  } else {
    teamData[selectedTeam].forEach(id => {
      addOption(id, (id === "A" || id === "B") ? `${id} (ALT)` : id);
    });
  }
});

function addOption(value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  idSelect.appendChild(opt);
}

idSelect.addEventListener("change", () => {
  selectedId = idSelect.value;
  confirmBtn.disabled = !selectedId;
});

confirmBtn.onclick = () => {
  const pid = (selectedTeam === "Guest") ? "Guest" : `${selectedTeam}-${selectedId}`;
  localStorage.setItem("playerId", pid);
  modal.style.display = "none";
};

/* =====================================================
   ASSETS
===================================================== */
const kokkyImg = new Image(); kokkyImg.src = "kokky.png";
const woodImg = new Image(); woodImg.src = "wood.png";
const mountainsImg = new Image(); mountainsImg.src = "mountains.png";
const steamImg = new Image(); steamImg.src = "steam.png";

/* wood tiling pattern (prevents stretching) */
let woodPattern = null;
woodImg.onload = () => {
  woodPattern = ctx.createPattern(woodImg, "repeat");
};

/* =====================================================
   PLAYER
===================================================== */
const player = {
  x: 80,
  y: VIRTUAL_HEIGHT / 2,
  w: 48,
  h: 48,
  vy: 0
};

const GRAVITY = 0.5;
const JUMP = -8;

/* =====================================================
   OBSTACLES
===================================================== */
let obstacles = [];
const OBSTACLE_WIDTH = 70;
const GAP = 170;
const SPEED = 2.5;
const SPAWN_DISTANCE = 270;
let spawnX = 0;

/* =====================================================
   GAME STATE
===================================================== */
let started = false;
let gameOver = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;

/* =====================================================
   INPUT
===================================================== */
function doJumpAction() {
  // restart behavior: next tap resets + immediately starts with a jump
  if (gameOver) {
    resetGame();
    started = true;
    spawnX = VIRTUAL_WIDTH + OBSTACLE_WIDTH + 40;
  }

  if (!started) {
    started = true;
    spawnX = VIRTUAL_WIDTH + OBSTACLE_WIDTH + 40;
  }

  player.vy = JUMP;

  // hop steam near foot
  hopSteam.push({
    x: player.x + player.w * 0.55,
    y: player.y + player.h - 3,
    life: 14
  });
}

function jump() {
  if (!localStorage.getItem("playerId")) return; // must select player first
  doJumpAction();
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") jump();
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  jump();
}, { passive: false });

/* =====================================================
   HELPERS
===================================================== */
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

/* =====================================================
   VISUAL ELEMENTS (STARS / SNOW / LAYERS)
===================================================== */
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * VIRTUAL_WIDTH,
  y: Math.random() * VIRTUAL_HEIGHT * 0.6,
  r: Math.random() * 1.4 + 0.6,
  c: Math.random() < 0.7 ? "#ffd966" : "#ffffff"
}));

// bigger snow
const snow = Array.from({ length: 35 }, () => ({
  x: Math.random() * VIRTUAL_WIDTH,
  y: Math.random() * VIRTUAL_HEIGHT,
  s: Math.random() * 0.4 + 0.3,
  r: Math.random() * 1.5 + 1
}));

let hopSteam = [];
let mountainX = 0;
let steamX = 0;

/* =====================================================
   DRAW HELPERS
===================================================== */
function drawSkyGradient() {
  // gradient ends at the start of mountains for a seamless transition
  const yEnd = offsetY + MOUNTAIN_Y * scale;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, yEnd);
  skyGrad.addColorStop(0, SKY_TOP);
  skyGrad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawMoon() {
  // your moon code (adapted to virtual W)
  ctx.save();
  const W = VIRTUAL_WIDTH;
  const moonX = W - 80;
  const moonY = 80;
  const moonR = 26;

  const moonGrad = ctx.createRadialGradient(
    moonX - 8, moonY - 8, 4,
    moonX, moonY, moonR + 6
  );
  moonGrad.addColorStop(0, "#fff9d9");
  moonGrad.addColorStop(1, "#bba86a");

  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#d8c78a";
  ctx.beginPath();
  ctx.arc(moonX - 8, moonY - 6, 6, 0, Math.PI * 2);
  ctx.arc(moonX + 5, moonY + 4, 4, 0, Math.PI * 2);
  ctx.arc(moonX + 10, moonY - 10, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs) {
  // tiled wood (no stretching)
  if (woodPattern) {
    ctx.save();
    ctx.fillStyle = woodPattern;

    // top
    ctx.translate(obs.x, 0);
    ctx.fillRect(0, 0, OBSTACLE_WIDTH, obs.gapY);

    // bottom
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(obs.x, obs.gapY + GAP);
    ctx.fillRect(0, 0, OBSTACLE_WIDTH, VIRTUAL_HEIGHT - (obs.gapY + GAP));

    ctx.restore();
  } else {
    // fallback while image loads
    ctx.drawImage(woodImg, obs.x, 0, OBSTACLE_WIDTH, obs.gapY);
    ctx.drawImage(
      woodImg,
      obs.x,
      obs.gapY + GAP,
      OBSTACLE_WIDTH,
      VIRTUAL_HEIGHT - (obs.gapY + GAP)
    );
  }
}

/* =====================================================
   MAIN LOOP
===================================================== */
function loop() {
  // background in real canvas space (so it fills the whole browser)
  drawSkyGradient();

  // scaled/centered phone game
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // stars (fixed)
  stars.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // moon behind obstacles
  drawMoon();

  // snow (bigger)
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
  ctx.drawImage(mountainsImg, mountainX, MOUNTAIN_Y, VIRTUAL_WIDTH, MOUNTAIN_H);
  ctx.drawImage(mountainsImg, mountainX + VIRTUAL_WIDTH, MOUNTAIN_Y, VIRTUAL_WIDTH, MOUNTAIN_H);
  if (!gameOver) {
    mountainX -= 0.15;
    if (mountainX <= -VIRTUAL_WIDTH) mountainX = 0;
  }

  // gravity active once a player is selected (no floating)
  const hasPlayer = !!localStorage.getItem("playerId");
  if (hasPlayer && !gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  // spawn obstacles only after first jump/start
  if (started && !gameOver) {
    if (obstacles.length === 0 ||
        spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE) {
      spawnObstacle();
    }
  }

  // obstacles + scoring + collision
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
      gameOver = true; // freeze the scene
    }
  });

  // ceiling/floor also freeze
  if (!gameOver && hasPlayer) {
    if (player.y < 0 || player.y + player.h > VIRTUAL_HEIGHT) {
      gameOver = true;
    }
  }

  // hop steam (more transparent, closer to foot)
  hopSteam.forEach(p => {
    ctx.fillStyle = `rgba(255,255,255,${p.life / 24})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    p.life--;
  });
  hopSteam = hopSteam.filter(p => p.life > 0);

  // bottom steam (soft, slow)
  ctx.globalAlpha = 0.55;
  ctx.drawImage(steamImg, steamX, VIRTUAL_HEIGHT - 120);
  ctx.drawImage(steamImg, steamX + VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 120);
  ctx.globalAlpha = 1;
  if (!gameOver) {
    steamX -= 0.15;
    if (steamX <= -VIRTUAL_WIDTH) steamX = 0;
  }

  // player
  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

  // minimal UI text (TEMP)
  ctx.fillStyle = "#fff";
  ctx.font = "20px Handjet";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${score}  Best: ${bestScore}`, VIRTUAL_WIDTH / 2, 30);

  ctx.restore();
  requestAnimationFrame(loop);
}

loop();
