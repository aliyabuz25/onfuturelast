const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 64;
const MAP_ROWS = 10;
const MAP_COLS = 15;
const MAP = [
  'BBBBBBBBBBBBBBB',
  'BRRRRRRRRRRRRRB',
  'BRBBBRRRRBBBRRB',
  'BRRRRBRRRRBRRRB',
  'BRBBBRRRRBBBRRB',
  'BRRRRRRRPRRRRRB',
  'BRBBBRRRRBBBRRB',
  'BRRRRRRRRRRRRRB',
  'BRRRBBRRRRBBRRB',
  'BBBBBBBBBBBBBBB',
];

const missionPoints = [
  { row: 2, col: 4 },
  { row: 5, col: 8 },
  { row: 7, col: 11 },
];

const keyboard = {};

const player = {
  x: TILE_SIZE * 2.5,
  y: TILE_SIZE * 5,
  width: 28,
  height: 40,
  vx: 0,
  vy: 0,
  angle: 0,
  baseSpeed: 160,
  maxSpeed: 230,
  boostSpeed: 330,
  friction: 0.94,
  boosting: false,
  boostRemaining: 0,
  health: 100,
};

const patrol = {
  path: [
    { row: 2, col: 10 },
    { row: 3, col: 10 },
    { row: 3, col: 5 },
    { row: 6, col: 5 },
    { row: 6, col: 12 },
    { row: 8, col: 12 },
  ],
  index: 0,
  progress: 0,
  speed: 90,
  size: 32,
};

let lastTimestamp = 0;
let missionStart = performance.now();
let missionCompleted = false;
let missionStatusMessage = 'Secure 3 checkpoints';

const healthLabel = document.getElementById('health-value');
const missionLabel = document.getElementById('mission-value');
const timeLabel = document.getElementById('time-value');
let playerPulse = 0;

if (!canvas || !ctx) {
  throw new Error('Game canvas not found.');
}

function resetMission() {
  player.x = TILE_SIZE * 2.5;
  player.y = TILE_SIZE * 5;
  player.vx = 0;
  player.vy = 0;
  player.health = 100;
  player.boosting = false;
  player.boostRemaining = 0;
  player.angle = 0;
  patrol.index = 0;
  patrol.progress = 0;
  missionPoints.forEach(point => {
    point._cleared = false;
  });
  missionStart = performance.now();
  missionCompleted = false;
  missionStatusMessage = 'Secure 3 checkpoints';
  missionValueUpdater();
  healthLabel.textContent = `${player.health}%`;
}

function missionValueUpdater() {
  const visited = missionPoints.reduce((count, point) => count + (point._cleared ? 1 : 0), 0);
  if (visited === missionPoints.length) {
    missionStatusMessage = 'Mission complete. Cruise around for bonus points.';
  } else {
    missionStatusMessage = `${missionPoints.length - visited} checkpoint(s) remaining`;
  }
  missionLabel.textContent = missionStatusMessage;
}

function handleInput(dt) {
  const direction = { x: 0, y: 0 };
  if (keyboard.ArrowUp || keyboard.KeyW) direction.y -= 1;
  if (keyboard.ArrowDown || keyboard.KeyS) direction.y += 1;
  if (keyboard.ArrowLeft || keyboard.KeyA) direction.x -= 1;
  if (keyboard.ArrowRight || keyboard.KeyD) direction.x += 1;

  if (keyboard.Space && player.boostRemaining <= 0 && !player.boosting) {
    player.boosting = true;
    player.boostRemaining = 0.5; // seconds
  }

  const inputMagnitude = Math.hypot(direction.x, direction.y);
  const targetSpeed = player.boosting ? player.boostSpeed : player.maxSpeed;

  if (inputMagnitude > 0) {
    direction.x /= inputMagnitude;
    direction.y /= inputMagnitude;
    player.angle = Math.atan2(direction.y, direction.x);
    player.vx += direction.x * player.baseSpeed * dt;
    player.vy += direction.y * player.baseSpeed * dt;
  }

  player.vx *= player.friction;
  player.vy *= player.friction;

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > targetSpeed) {
    player.vx = (player.vx / speed) * targetSpeed;
    player.vy = (player.vy / speed) * targetSpeed;
  }

  if (player.boosting) {
    player.boostRemaining -= dt;
    if (player.boostRemaining <= 0) {
      player.boosting = false;
    }
  }
}

function isBlockedAt(x, y) {
  const checkPoints = [
    { x: x - player.width / 2, y: y - player.height / 2 },
    { x: x + player.width / 2, y: y - player.height / 2 },
    { x: x - player.width / 2, y: y + player.height / 2 },
    { x: x + player.width / 2, y: y + player.height / 2 },
  ];

  for (const point of checkPoints) {
    const col = Math.floor(point.x / TILE_SIZE);
    const row = Math.floor(point.y / TILE_SIZE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
    const tile = MAP[row][col];
    if (tile === 'B') return true;
  }
  return false;
}

function updatePlayer(dt) {
  handleInput(dt);
  const nextX = player.x + player.vx * dt;
  const nextY = player.y + player.vy * dt;

  if (!isBlockedAt(nextX, player.y)) player.x = nextX;
  if (!isBlockedAt(player.x, nextY)) player.y = nextY;

  missionPoints.forEach(point => {
    if (point._cleared) return;
    const targetX = point.col * TILE_SIZE + TILE_SIZE / 2;
    const targetY = point.row * TILE_SIZE + TILE_SIZE / 2;
    const distance = Math.hypot(player.x - targetX, player.y - targetY);
    if (distance < 32) {
      point._cleared = true;
      missionValueUpdater();
    }
  });

  const visited = missionPoints.filter(point => point._cleared).length;
  missionCompleted = visited === missionPoints.length;
}

function updatePatrol(dt) {
  const patrolPoint = patrol.path[patrol.index];
  const nextIndex = (patrol.index + 1) % patrol.path.length;
  const nextPoint = patrol.path[nextIndex];

  const currentX = patrolPoint.col * TILE_SIZE + TILE_SIZE / 2;
  const currentY = patrolPoint.row * TILE_SIZE + TILE_SIZE / 2;
  const nextX = nextPoint.col * TILE_SIZE + TILE_SIZE / 2;
  const nextY = nextPoint.row * TILE_SIZE + TILE_SIZE / 2;

  const pathLength = Math.max(Math.hypot(nextX - currentX, nextY - currentY), 0.1);
  const travel = patrol.speed * dt;

  patrol.progress += travel;
  if (patrol.progress >= pathLength) {
    patrol.progress -= pathLength;
    patrol.index = nextIndex;
  }
}

function drawMap() {
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tile = MAP[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      if (tile === 'B') {
        ctx.fillStyle = '#1f2933';
      } else if (tile === 'P') {
        ctx.fillStyle = '#0f7c46';
      } else {
        ctx.fillStyle = '#181f27';
      }
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      if (tile === 'R') {
        ctx.fillStyle = '#0f131c';
        ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
      }
    }
  }
}

function drawGridLines() {
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= MAP_COLS * TILE_SIZE; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_ROWS * TILE_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= MAP_ROWS * TILE_SIZE; y += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_COLS * TILE_SIZE, y);
    ctx.stroke();
  }
}

function drawMissionPoints() {
  missionPoints.forEach(point => {
    const centerX = point.col * TILE_SIZE + TILE_SIZE / 2;
    const centerY = point.row * TILE_SIZE + TILE_SIZE / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
    ctx.fillStyle = point._cleared ? 'rgba(100,255,150,0.25)' : 'rgba(100,255,150,0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(-player.width / 2 + 3, -player.height / 2 + 3, player.width - 6, player.height - 6);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(-6, -player.height / 2 + 5, 12, 8);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-player.width / 2 + 1, -player.height / 2 + 4, 4, 10);
  ctx.fillRect(player.width / 2 - 5, -player.height / 2 + 4, 4, 10);
  ctx.restore();
}

function drawPatrol() {
  const nextIndex = (patrol.index + 1) % patrol.path.length;
  const current = patrol.path[patrol.index];
  const next = patrol.path[nextIndex];
  const startX = current.col * TILE_SIZE + TILE_SIZE / 2;
  const startY = current.row * TILE_SIZE + TILE_SIZE / 2;
  const endX = next.col * TILE_SIZE + TILE_SIZE / 2;
  const endY = next.row * TILE_SIZE + TILE_SIZE / 2;
  const segmentLength = Math.max(Math.hypot(endX - startX, endY - startY), 0.1);
  const progress = (patrol.progress % segmentLength) / segmentLength;
  const patrolX = startX + (endX - startX) * progress;
  const patrolY = startY + (endY - startY) * progress;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(patrolX, patrolY, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.arc(patrolX, patrolY, 11, 0, Math.PI * 2);
  ctx.fill();
}

function detectPatrolCollision() {
  const nextIndex = (patrol.index + 1) % patrol.path.length;
  const current = patrol.path[patrol.index];
  const next = patrol.path[nextIndex];
  const startX = current.col * TILE_SIZE + TILE_SIZE / 2;
  const startY = current.row * TILE_SIZE + TILE_SIZE / 2;
  const endX = next.col * TILE_SIZE + TILE_SIZE / 2;
  const endY = next.row * TILE_SIZE + TILE_SIZE / 2;
  const segmentLength = Math.max(Math.hypot(endX - startX, endY - startY), 0.1);
  const progress = (patrol.progress % segmentLength) / segmentLength;
  const patrolX = startX + (endX - startX) * progress;
  const patrolY = startY + (endY - startY) * progress;
  const distance = Math.hypot(player.x - patrolX, player.y - patrolY);
  if (distance < 30) {
    player.health = Math.max(0, player.health - 0.1);
    healthLabel.textContent = `${player.health.toFixed(0)}%`;
  }
}

function drawBoostTrail() {
  if (!player.boosting) return;
  ctx.save();
  ctx.globalAlpha = 0.2 + (player.boostRemaining / 0.5) * 0.4;
  ctx.strokeStyle = 'rgba(248, 113, 16, 0.8)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x - Math.cos(player.angle) * 30, player.y - Math.sin(player.angle) * 30);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawGridLines();
  drawMissionPoints();
  drawBoostTrail();
  drawPlayer();
  drawPatrol();
  if (missionCompleted) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, canvas.height / 2 - 38, canvas.width, 76);
    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 28px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MISSION COMPLETE', canvas.width / 2, canvas.height / 2 + 10);
  }
}

function update(dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  updatePlayer(dt);
  updatePatrol(dt);
  detectPatrolCollision();
  playerPulse += dt;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function loop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  update(delta);
  draw();
  const elapsed = timestamp - missionStart;
  timeLabel.textContent = formatTime(elapsed);

  missionValueUpdater();

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  keyboard[event.code] = true;
  if (event.code === 'Enter') {
    resetMission();
  }
});
window.addEventListener('keyup', (event) => {
  keyboard[event.code] = false;
});

canvas.width = MAP_COLS * TILE_SIZE;
canvas.height = MAP_ROWS * TILE_SIZE;
resetMission();
requestAnimationFrame(loop);
