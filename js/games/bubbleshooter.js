(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const BUBBLE_COLORS = [
    { id: 'red', hex: '#f43f5e', light: '#fda4af', dark: '#9f1239', symbol: '🔥' },
    { id: 'blue', hex: '#38bdf8', light: '#bae6fd', dark: '#0369a1', symbol: '💧' },
    { id: 'green', hex: '#22c55e', light: '#bbf7d0', dark: '#166534', symbol: '🍀' },
    { id: 'yellow', hex: '#facc15', light: '#fef08a', dark: '#854d0e', symbol: '⭐' },
    { id: 'purple', hex: '#a855f7', light: '#e9d5ff', dark: '#581c87', symbol: '🔮' },
    { id: 'orange', hex: '#fb923c', light: '#fed7aa', dark: '#9a3412', symbol: '☀️' }
  ];

  const DIFFICULTY_CFG = {
    easy: {
      label: 'DỄ',
      colorCount: 4,
      initialRows: 4,
      shotsPerDrop: 9,
      showFullLaser: true,
      scoreMult: 1
    },
    hard: {
      label: 'KHÓ',
      colorCount: 6,
      initialRows: 5,
      shotsPerDrop: 6,
      showFullLaser: false,
      scoreMult: 1.5
    }
  };

  function createBubbleShooterGame(container, ctx) {
    const W = 820;
    const H = 540;
    const PLAY_LEFT = 150;
    const PLAY_RIGHT = 670;
    const PLAY_TOP = 24;
    const PLAY_BOTTOM = 468;
    const DANGER_Y = 415;

    const COLS = 11;
    const MAX_ROWS = 12;
    const RADIUS = 22;
    const ROW_HEIGHT = Math.round(RADIUS * Math.sqrt(3)); // ~38px
    const LAUNCHER_X = (PLAY_LEFT + PLAY_RIGHT) / 2;
    const LAUNCHER_Y = 478;
    const SHOT_SPEED = 780;

    let difficulty = 'easy';
    let level = 1;
    let score = 0;
    let shotsUntilDrop = DIFFICULTY_CFG.easy.shotsPerDrop;
    let isGameOver = false;
    let isPaused = false;
    let animId = null;
    let lastTime = performance.now();

    // Grid: grid[r][c] = colorIndex or null
    // Row parity (rowOffsetParity + r) % 2 === 1 shifts row right by RADIUS
    let grid = [];
    let rowParityOffset = 0;

    let aimAngle = -Math.PI / 2; // Straight up
    let currentColor = 0;
    let nextColor = 1;
    let activeShot = null; // { x, y, vx, vy, color }
    let fallingBubbles = []; // { x, y, vx, vy, color }
    let floatingTexts = [];

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(360);
    const camShake = fx.createShake(6);
    let sceneTime = 0;
    let overlayT = 0;
    let overlayKey = '';
    let levelBannerT = 10;
    let levelBannerBonus = 0;
    const bgStars = Array.from({ length: 40 }, () => ({
      x: Math.random() * 820,
      y: Math.random() * 260,
      r: Math.random() < 0.2 ? 2 : 1,
      tw: Math.random() * 6
    }));
    let keys = { left: false, right: false };

    // DOM Setup
    container.innerHTML = `
      <div class="game-shell">
        <div class="game-toolbar">
          <div class="toolbar-group">
            <span style="font-weight:700;color:#94a3b8;font-size:0.82rem;">Chế độ:</span>
            <button type="button" class="pill-btn active" data-diff="easy">🌱 Dễ (4 Màu + Tia Ngắm)</button>
            <button type="button" class="pill-btn" data-diff="hard">🔥 Khó (6 Màu + Nhanh)</button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="pill-btn" id="bsSwapBtn" title="Đổi trứng đang cầm với trứng dự bị (Phím Space)">🔄 Đổi Trứng (Space)</button>
            <button type="button" class="pill-btn" id="bsPauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
            <span id="bsInfoBadge" style="font-size:0.82rem;color:#38bdf8;font-weight:700;">Màn 1 • Ghép 3 trứng cùng màu!</span>
          </div>
        </div>
        <div class="canvas-frame">
          <canvas id="bubbleCanvas" class="game-canvas" width="${W}" height="${H}"></canvas>
        </div>
        <div class="touch-controls">
          <div class="touch-cluster">
            <button type="button" class="touch-btn" id="bsTouchLeft">◀ Ngắm Trái</button>
            <button type="button" class="touch-btn" id="bsTouchRight">Ngắm Phải ▶</button>
          </div>
          <div class="touch-cluster">
            <button type="button" class="touch-btn" id="bsTouchSwap">🔄 Đổi</button>
            <button type="button" class="touch-btn" id="bsTouchShoot" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);">🥚 BẮN TRỨNG</button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#bubbleCanvas');
    const hidpi = fx.setupHiDPICanvas(canvas, W, H);
    const g = hidpi.g;
    const infoBadge = container.querySelector('#bsInfoBadge');
    const swapBtn = container.querySelector('#bsSwapBtn');
    const pauseBtn = container.querySelector('#bsPauseBtn');
    const diffBtns = container.querySelectorAll('[data-diff]');

    function isOddRow(r) {
      return (r + rowParityOffset) % 2 === 1;
    }

    function getColCount(r) {
      return isOddRow(r) ? COLS - 1 : COLS;
    }

    function gridToPixel(r, c) {
      const odd = isOddRow(r);
      const x = PLAY_LEFT + RADIUS + c * (RADIUS * 2) + (odd ? RADIUS : 0);
      const y = PLAY_TOP + RADIUS + r * ROW_HEIGHT;
      return { x, y };
    }

    function getAvailableColorsInGrid() {
      const cfg = DIFFICULTY_CFG[difficulty];
      const present = new Set();
      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < getColCount(r); c++) {
          if (grid[r] && grid[r][c] != null) {
            present.add(grid[r][c]);
          }
        }
      }
      if (present.size === 0) {
        for (let i = 0; i < cfg.colorCount; i++) present.add(i);
      }
      return Array.from(present);
    }

    function randomColor() {
      const pool = getAvailableColorsInGrid();
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function initLevel(resetScore) {
      const cfg = DIFFICULTY_CFG[difficulty];
      if (resetScore) {
        score = 0;
        level = 1;
        ctx.updateScore(0);
      }
      isGameOver = false;
      isPaused = false;
      syncPauseBtn();
      activeShot = null;
      fallingBubbles = [];
      floatingTexts = [];
      if (resetScore) {
        sparks.clear();
        camShake.reset();
        levelBannerT = 10;
      }
      rowParityOffset = 0;
      shotsUntilDrop = cfg.shotsPerDrop;

      grid = [];
      const startRows = Math.min(MAX_ROWS - 4, cfg.initialRows + Math.floor((level - 1) / 2));
      for (let r = 0; r < MAX_ROWS; r++) {
        grid[r] = [];
        const colsInRow = getColCount(r);
        for (let c = 0; c < colsInRow; c++) {
          if (r < startRows) {
            grid[r][c] = Math.floor(Math.random() * cfg.colorCount);
          } else {
            grid[r][c] = null;
          }
        }
      }

      currentColor = randomColor();
      nextColor = randomColor();
      updateInfoBadge();
    }

    function updateInfoBadge() {
      if (infoBadge) {
        infoBadge.textContent = `Màn ${level} • Hạ trần sau: ${shotsUntilDrop} phát bắn`;
      }
    }

    function syncPauseBtn() {
      if (!pauseBtn) return;
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
      pauseBtn.classList.toggle('active', isPaused);
      pauseBtn.setAttribute('aria-pressed', String(isPaused));
    }

    function setPaused(next) {
      const value = !!next && !isGameOver;
      if (value === isPaused) return;
      isPaused = value;
      if (isPaused) {
        keys.left = false;
        keys.right = false;
      }
      syncPauseBtn();
    }

    function swapBubbles() {
      if (isGameOver || isPaused || activeShot) return;
      const tmp = currentColor;
      currentColor = nextColor;
      nextColor = tmp;
      ArcadeHub.sound.click();
    }

    function fireBubble() {
      if (isPaused) return;
      if (isGameOver) {
        initLevel(true);
        return;
      }
      if (activeShot) return;

      const clampedAngle = Math.max(-Math.PI + 0.18, Math.min(-0.18, aimAngle));
      activeShot = {
        x: LAUNCHER_X,
        y: LAUNCHER_Y,
        vx: Math.cos(clampedAngle) * SHOT_SPEED,
        vy: Math.sin(clampedAngle) * SHOT_SPEED,
        color: currentColor
      };
      currentColor = nextColor;
      nextColor = randomColor();
      ArcadeHub.sound.shoot();
    }

    function getNeighbors(r, c) {
      const odd = isOddRow(r);
      const deltas = odd
        ? [
            [0, -1],
            [0, 1],
            [-1, 0],
            [-1, 1],
            [1, 0],
            [1, 1]
          ]
        : [
            [0, -1],
            [0, 1],
            [-1, -1],
            [-1, 0],
            [1, -1],
            [1, 0]
          ];

      const list = [];
      for (let i = 0; i < deltas.length; i++) {
        const nr = r + deltas[i][0];
        const nc = c + deltas[i][1];
        if (nr >= 0 && nr < MAX_ROWS && nc >= 0 && nc < getColCount(nr)) {
          list.push({ r: nr, c: nc });
        }
      }
      return list;
    }

    function findMatchingCluster(startR, startC, targetColor) {
      const visited = new Set();
      const queue = [{ r: startR, c: startC }];
      const cluster = [];
      visited.add(`${startR},${startC}`);

      while (queue.length > 0) {
        const cur = queue.shift();
        cluster.push(cur);
        const neighbors = getNeighbors(cur.r, cur.c);
        for (let i = 0; i < neighbors.length; i++) {
          const nb = neighbors[i];
          const key = `${nb.r},${nb.c}`;
          if (!visited.has(key) && grid[nb.r] && grid[nb.r][nb.c] === targetColor) {
            visited.add(key);
            queue.push(nb);
          }
        }
      }
      return cluster;
    }

    function dropFloatingClusters() {
      const anchored = new Set();
      const queue = [];

      for (let c = 0; c < getColCount(0); c++) {
        if (grid[0][c] != null) {
          anchored.add(`0,${c}`);
          queue.push({ r: 0, c });
        }
      }

      while (queue.length > 0) {
        const cur = queue.shift();
        const neighbors = getNeighbors(cur.r, cur.c);
        for (let i = 0; i < neighbors.length; i++) {
          const nb = neighbors[i];
          const key = `${nb.r},${nb.c}`;
          if (!anchored.has(key) && grid[nb.r] && grid[nb.r][nb.c] != null) {
            anchored.add(key);
            queue.push(nb);
          }
        }
      }

      let droppedCount = 0;
      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < getColCount(r); c++) {
          const key = `${r},${c}`;
          if (grid[r][c] != null && !anchored.has(key)) {
            const pos = gridToPixel(r, c);
            const colIdx = grid[r][c];
            grid[r][c] = null;
            droppedCount++;
            fallingBubbles.push({
              x: pos.x,
              y: pos.y,
              vx: (Math.random() - 0.5) * 90,
              vy: -60 - Math.random() * 60,
              color: colIdx
            });
          }
        }
      }
      return droppedCount;
    }

    function pushNewTopRow() {
      const cfg = DIFFICULTY_CFG[difficulty];
      rowParityOffset = (rowParityOffset + 1) % 2;
      const newRow = [];
      const colsInNew = getColCount(0);
      for (let c = 0; c < colsInNew; c++) {
        newRow.push(Math.floor(Math.random() * cfg.colorCount));
      }
      grid.pop();
      grid.unshift(newRow);
      // Ensure all rows match their new column counts
      for (let r = 0; r < MAX_ROWS; r++) {
        const maxC = getColCount(r);
        while (grid[r].length < maxC) grid[r].push(null);
        if (grid[r].length > maxC) grid[r].length = maxC;
      }
    }

    function checkGridState() {
      let remaining = 0;
      let reachedDanger = false;

      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < getColCount(r); c++) {
          if (grid[r][c] != null) {
            remaining++;
            const pos = gridToPixel(r, c);
            if (pos.y + RADIUS >= DANGER_Y) {
              reachedDanger = true;
            }
          }
        }
      }

      if (reachedDanger) {
        isGameOver = true;
        ArcadeHub.sound.gameOver();
        ctx.submitHighScore(score, `Màn ${level} (${DIFFICULTY_CFG[difficulty].label})`);
        return;
      }

      if (remaining === 0) {
        const bonus = Math.round(300 * DIFFICULTY_CFG[difficulty].scoreMult);
        score += bonus;
        ctx.updateScore(score);
        ArcadeHub.sound.win();
        level++;
        initLevel(false);
        levelBannerT = 0;
        levelBannerBonus = bonus;
        sparks.burst(LAUNCHER_X, H * 0.4, {
          count: 50,
          kind: 'confetti',
          speed: [140, 360],
          life: [0.9, 1.6],
          size: [4, 7],
          gravity: 300,
          drag: 1.2,
          colors: ['#f43f5e', '#38bdf8', '#22c55e', '#facc15', '#a855f7', '#ffffff']
        });
      }
    }

    function snapBubbleToGrid(shot) {
      let bestR = 0;
      let bestC = 0;
      let bestDist = Infinity;

      for (let r = 0; r < MAX_ROWS; r++) {
        const colsInRow = getColCount(r);
        for (let c = 0; c < colsInRow; c++) {
          if (grid[r][c] != null) continue;
          const pos = gridToPixel(r, c);
          const dist = Math.hypot(shot.x - pos.x, shot.y - pos.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestR = r;
            bestC = c;
          }
        }
      }

      grid[bestR][bestC] = shot.color;
      const snapPos = gridToPixel(bestR, bestC);
      ArcadeHub.sound.tile();

      const cluster = findMatchingCluster(bestR, bestC, shot.color);
      const cfg = DIFFICULTY_CFG[difficulty];

      if (cluster.length >= 3) {
        cluster.forEach((cell) => {
          const p = gridToPixel(cell.r, cell.c);
          const cObj = BUBBLE_COLORS[grid[cell.r][cell.c]] || BUBBLE_COLORS[0];
          spawnBurst(p.x, p.y, cObj.hex, 10);
          grid[cell.r][cell.c] = null;
        });

        const dropped = dropFloatingClusters();
        camShake.add(Math.min(0.55, 0.12 + cluster.length * 0.04 + dropped * 0.05));
        const gained = Math.round((cluster.length * 25 + dropped * 45) * cfg.scoreMult);
        score += gained;
        ctx.updateScore(score);

        floatingTexts.push({
          x: snapPos.x,
          y: snapPos.y - 10,
          text: dropped > 0 ? `+${gained} (Rơi +${dropped}!)` : `+${gained}`,
          color: '#4ade80',
          life: 1.0
        });
        ArcadeHub.sound.explosion();
      } else {
        shotsUntilDrop--;
        if (shotsUntilDrop <= 0) {
          shotsUntilDrop = cfg.shotsPerDrop;
          pushNewTopRow();
          ArcadeHub.sound.hit();
        }
      }

      // Make sure currentColor is still valid if a color was wiped out
      const validPool = getAvailableColorsInGrid();
      if (!validPool.includes(currentColor)) currentColor = randomColor();
      if (!validPool.includes(nextColor)) nextColor = randomColor();

      updateInfoBadge();
      checkGridState();
    }

    function update(dt) {
      if (isGameOver || isPaused) return;

      if (keys.left) {
        aimAngle = Math.max(-Math.PI + 0.18, aimAngle - 1.8 * dt);
      }
      if (keys.right) {
        aimAngle = Math.min(-0.18, aimAngle + 1.8 * dt);
      }

      if (activeShot) {
        activeShot.x += activeShot.vx * dt;
        activeShot.y += activeShot.vy * dt;

        // Bounce left/right walls
        if (activeShot.x - RADIUS <= PLAY_LEFT) {
          activeShot.x = PLAY_LEFT + RADIUS;
          activeShot.vx = Math.abs(activeShot.vx);
          ArcadeHub.sound.move();
        } else if (activeShot.x + RADIUS >= PLAY_RIGHT) {
          activeShot.x = PLAY_RIGHT - RADIUS;
          activeShot.vx = -Math.abs(activeShot.vx);
          ArcadeHub.sound.move();
        }

        // Check ceiling collision
        if (activeShot.y - RADIUS <= PLAY_TOP) {
          activeShot.y = PLAY_TOP + RADIUS;
          const finished = activeShot;
          activeShot = null;
          snapBubbleToGrid(finished);
        } else {
          // Check bubble collision
          let hit = false;
          for (let r = 0; r < MAX_ROWS && !hit; r++) {
            for (let c = 0; c < getColCount(r); c++) {
              if (grid[r][c] == null) continue;
              const pos = gridToPixel(r, c);
              const dist = Math.hypot(activeShot.x - pos.x, activeShot.y - pos.y);
              if (dist <= RADIUS * 1.86) {
                hit = true;
                break;
              }
            }
          }
          if (hit) {
            const finished = activeShot;
            activeShot = null;
            snapBubbleToGrid(finished);
          }
        }
      }

      // Falling unanchored bubbles
      for (let i = fallingBubbles.length - 1; i >= 0; i--) {
        const fb = fallingBubbles[i];
        fb.vy += 680 * dt;
        fb.x += fb.vx * dt;
        fb.y += fb.vy * dt;
        if (fb.y > H + 30) {
          const cObj = BUBBLE_COLORS[fb.color] || BUBBLE_COLORS[0];
          spawnBurst(fb.x, PLAY_BOTTOM, cObj.hex, 6);
          fallingBubbles.splice(i, 1);
        }
      }

      // Floating texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 38 * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }
    }

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    // Each colour also has its own vector symbol so colour-blind players can still match.
    function drawEggSymbol(gx, id, r) {
      gx.save();
      gx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      gx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      gx.lineWidth = Math.max(1, r * 0.06);
      gx.beginPath();
      const s = r * 0.42;
      if (id === 'red') {
        // Flame
        gx.moveTo(0, -s);
        gx.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.55, s * 0.6);
        gx.quadraticCurveTo(0, s * 1.05, -s * 0.55, s * 0.6);
        gx.quadraticCurveTo(-s * 0.9, -s * 0.1, 0, -s);
      } else if (id === 'blue') {
        // Water drop
        gx.moveTo(0, -s);
        gx.quadraticCurveTo(s * 0.8, s * 0.1, s * 0.6, s * 0.5);
        gx.arc(0, s * 0.42, s * 0.6, 0.15, Math.PI - 0.15);
        gx.quadraticCurveTo(-s * 0.8, s * 0.1, 0, -s);
      } else if (id === 'green') {
        // Leaf
        gx.moveTo(-s * 0.8, s * 0.8);
        gx.quadraticCurveTo(-s, -s * 0.6, s * 0.8, -s * 0.8);
        gx.quadraticCurveTo(s * 0.7, s * 0.9, -s * 0.8, s * 0.8);
      } else if (id === 'yellow') {
        // Star
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 === 0 ? s : s * 0.45;
          const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
          gx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        gx.closePath();
      } else if (id === 'purple') {
        // Crystal
        gx.moveTo(0, -s);
        gx.lineTo(s * 0.7, -s * 0.2);
        gx.lineTo(0, s);
        gx.lineTo(-s * 0.7, -s * 0.2);
        gx.closePath();
      } else {
        // Sun
        gx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          gx.moveTo(Math.cos(a) * s * 0.68, Math.sin(a) * s * 0.68);
          gx.arc(Math.cos(a) * s * 0.82, Math.sin(a) * s * 0.82, s * 0.14, 0, Math.PI * 2);
        }
      }
      gx.fill();
      gx.stroke();
      gx.restore();
    }

    // Pre-rendered egg sprites (one per colour) — far cheaper than gradients + text per bubble per frame
    const eggSprites = BUBBLE_COLORS.map((cObj) => {
      const pad = 4;
      const size = RADIUS * 2 + pad * 2;
      const dpr = hidpi.dpr;
      const cv = document.createElement('canvas');
      cv.width = Math.round(size * dpr);
      cv.height = Math.round(size * dpr);
      const gx = cv.getContext('2d');
      gx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gx.translate(size / 2, size / 2);
      const r = RADIUS;
      // Soft drop shadow
      gx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      gx.beginPath();
      gx.ellipse(1.5, 3, r - 1, r - 2, 0, 0, Math.PI * 2);
      gx.fill();
      const grad = gx.createRadialGradient(-r * 0.3, -r * 0.38, r * 0.12, 0, 0, r);
      grad.addColorStop(0, cObj.light);
      grad.addColorStop(0.55, cObj.hex);
      grad.addColorStop(1, cObj.dark);
      gx.fillStyle = grad;
      gx.beginPath();
      gx.arc(0, 0, r - 1, 0, Math.PI * 2);
      gx.fill();
      // Rim light
      gx.lineWidth = 2;
      gx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      gx.stroke();
      // Speckles like a dino egg
      gx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      [
        [0.35, 0.3, 0.09],
        [-0.15, 0.55, 0.07],
        [0.55, -0.1, 0.06]
      ].forEach(([sx, sy, sr]) => {
        gx.beginPath();
        gx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2);
        gx.fill();
      });
      drawEggSymbol(gx, cObj.id, r);
      // Glossy highlight
      gx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      gx.beginPath();
      gx.ellipse(-r * 0.36, -r * 0.4, r * 0.26, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
      gx.fill();
      return { cv, size };
    });

    function drawEggBubble(x, y, colorIdx, scale) {
      const sp = eggSprites[colorIdx] || eggSprites[0];
      const s = sp.size * (scale || 1);
      g.drawImage(sp.cv, x - s / 2, y - s / 2, s, s);
    }

    function spawnBurst(x, y, hexColor, count) {
      sparks.ring(x, y, { from: RADIUS * 0.4, to: RADIUS * 2.4, color: hexColor, life: 0.4 });
      sparks.burst(x, y, {
        count,
        speed: [60, 240],
        life: [0.4, 0.75],
        size: [2.5, 5],
        colors: [hexColor, '#ffffff']
      });
      // Eggshell fragments
      sparks.burst(x, y, {
        count: Math.max(2, Math.round(count * 0.4)),
        kind: 'confetti',
        speed: [80, 200],
        life: [0.6, 1],
        size: [4, 7],
        gravity: 520,
        drag: 0.8,
        colors: ['#fef3c7', hexColor]
      });
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      sparks.update(dt);
      camShake.update(dt);
      if (levelBannerT < 10) levelBannerT += dt;
    }

    function getLowestBubbleY() {
      let lowest = PLAY_TOP;
      for (let r = MAX_ROWS - 1; r >= 0; r--) {
        for (let c = 0; c < getColCount(r); c++) {
          if (grid[r][c] != null) return gridToPixel(r, c).y + RADIUS;
        }
      }
      return lowest;
    }

    function drawAimLaser() {
      if (activeShot || isGameOver) return;
      const cfg = DIFFICULTY_CFG[difficulty];
      const clampedAngle = Math.max(-Math.PI + 0.18, Math.min(-0.18, aimAngle));

      let simX = LAUNCHER_X;
      let simY = LAUNCHER_Y;
      let dx = Math.cos(clampedAngle);
      let dy = Math.sin(clampedAngle);
      const maxSteps = cfg.showFullLaser ? 95 : 22;
      const stepSize = 9;

      g.save();
      const cObj = BUBBLE_COLORS[currentColor] || BUBBLE_COLORS[0];
      let endX = simX;
      let endY = simY;
      let ended = false;
      for (let i = 1; i <= maxSteps; i++) {
        simX += dx * stepSize;
        simY += dy * stepSize;

        if (simX - RADIUS <= PLAY_LEFT) {
          simX = PLAY_LEFT + RADIUS;
          dx = Math.abs(dx);
        } else if (simX + RADIUS >= PLAY_RIGHT) {
          simX = PLAY_RIGHT - RADIUS;
          dx = -Math.abs(dx);
        }

        if (simY - RADIUS <= PLAY_TOP) {
          ended = true;
          break;
        }

        let hitGrid = false;
        for (let r = 0; r < MAX_ROWS; r++) {
          for (let c = 0; c < getColCount(r); c++) {
            if (grid[r][c] == null) continue;
            const pos = gridToPixel(r, c);
            if (Math.hypot(simX - pos.x, simY - pos.y) <= RADIUS * 1.85) {
              hitGrid = true;
              break;
            }
          }
          if (hitGrid) break;
        }

        if (i % 2 === 0) {
          // Dots fade out along the path and gently march forward
          const fade = 1 - i / (maxSteps + 8);
          const pulse = 0.75 + 0.25 * Math.sin(sceneTime * 10 - i * 0.6);
          g.globalAlpha = Math.max(0.15, fade) * pulse;
          g.beginPath();
          g.arc(simX, simY, 3.4, 0, Math.PI * 2);
          g.fillStyle = cObj.light;
          g.fill();
        }
        endX = simX;
        endY = simY;
        if (hitGrid) {
          ended = true;
          break;
        }
      }
      // Ghost egg where the shot will stop (only when the full guide is shown)
      if (ended && cfg.showFullLaser) {
        g.globalAlpha = 0.5 + Math.sin(sceneTime * 6) * 0.15;
        g.strokeStyle = cObj.light;
        g.lineWidth = 2;
        g.setLineDash([4, 4]);
        g.beginPath();
        g.arc(endX, endY, RADIUS - 2, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
      }
      g.restore();
    }

    function drawCuteDino() {
      g.save();
      g.translate(LAUNCHER_X - 70, LAUNCHER_Y - 6);
      const breathe = 1 + Math.sin(sceneTime * 2.4) * 0.025;
      const recoil = activeShot ? 1 : 0;
      g.scale(1, breathe);
      fx.contactShadow(g, 0, 28, 26, 6, 0.35);

      // Tail
      g.fillStyle = '#16a34a';
      g.strokeStyle = '#14532d';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-16, 14);
      g.quadraticCurveTo(-42, 10 + Math.sin(sceneTime * 3) * 3, -40, -6);
      g.quadraticCurveTo(-24, 4, -12, 2);
      g.closePath();
      g.fill();
      g.stroke();

      // Body
      const bodyGrad = g.createRadialGradient(-6, -6, 4, 0, 4, 28);
      bodyGrad.addColorStop(0, '#86efac');
      bodyGrad.addColorStop(1, '#22c55e');
      g.fillStyle = bodyGrad;
      g.beginPath();
      g.ellipse(0, 4, 20, 24, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Belly
      g.fillStyle = '#fef08a';
      g.beginPath();
      g.ellipse(4, 7, 11, 16, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(161, 98, 7, 0.35)';
      g.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(-4, k * 8 - 4);
        g.lineTo(12, k * 8 - 4);
        g.stroke();
      }

      // Head (looks toward the aim direction)
      const look = Math.cos(Math.max(-Math.PI + 0.18, Math.min(-0.18, aimAngle))) * 3;
      g.fillStyle = '#4ade80';
      g.strokeStyle = '#14532d';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(4 + look, -22 - recoil * 2, 16, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Eye with blink
      const blink = Math.sin(sceneTime * 1.3) > 0.97;
      g.fillStyle = '#0f172a';
      if (blink) {
        g.fillRect(6 + look, -26, 9, 2);
      } else {
        g.beginPath();
        g.arc(10 + look, -25, 3.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(11.2 + look, -26.6, 1.4, 0, Math.PI * 2);
        g.fill();
      }
      // Cheek + smile
      g.fillStyle = 'rgba(244, 114, 182, 0.5)';
      g.beginPath();
      g.ellipse(14 + look, -17, 3.5, 2.2, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#14532d';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(10 + look, -18, 4, 0.3, 1.4);
      g.stroke();

      // Spikes
      g.fillStyle = '#f97316';
      [-34, -24, -14].forEach((sy) => {
        g.beginPath();
        g.moveTo(-12, sy);
        g.lineTo(-21, sy + 4);
        g.lineTo(-12, sy + 8);
        g.closePath();
        g.fill();
      });

      g.restore();
    }

    function drawSideCard(x, y, w, h, title, accent) {
      fx.roundRectPath(g, x, y, w, h, 14);
      g.fillStyle = 'rgba(15, 23, 42, 0.72)';
      g.fill();
      g.strokeStyle = fx.rgba(accent, 0.5);
      g.lineWidth = 1.5;
      g.stroke();
      if (title) {
        g.fillStyle = accent;
        g.font = fx.font(12, 800);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(title, x + w / 2, y + 18);
      }
    }

    function drawBackdrop() {
      // Twilight prehistoric valley
      const bgGrad = g.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.55, '#4c1d95');
      bgGrad.addColorStop(1, '#0f766e');
      g.fillStyle = bgGrad;
      g.fillRect(0, 0, W, H);

      g.fillStyle = '#ffffff';
      bgStars.forEach((st) => {
        g.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(sceneTime * 1.5 + st.tw));
        g.fillRect(st.x, st.y, st.r, st.r);
      });
      g.globalAlpha = 1;

      // Volcanoes peeking from both sides, with a lava glow
      [
        [70, 1],
        [W - 70, -1]
      ].forEach(([vx, dir]) => {
        fx.glow(g, vx, H - 215, 70, '#f97316', 0.35 + Math.sin(sceneTime * 2 + vx) * 0.08);
        g.fillStyle = '#1e1336';
        g.beginPath();
        g.moveTo(vx - 110, H);
        g.lineTo(vx - 22, H - 210);
        g.lineTo(vx + 22, H - 210);
        g.lineTo(vx + 110, H);
        g.closePath();
        g.fill();
        g.fillStyle = '#f97316';
        g.beginPath();
        g.moveTo(vx - 20, H - 208);
        g.lineTo(vx + 20, H - 208);
        g.lineTo(vx + 8 * dir, H - 180);
        g.closePath();
        g.fill();
      });

      // Ferns along the bottom
      g.strokeStyle = 'rgba(20, 83, 45, 0.9)';
      g.lineWidth = 3;
      g.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const fxp = (i / 15) * W;
        const sway = Math.sin(sceneTime * 1.4 + i) * 3;
        g.beginPath();
        g.moveTo(fxp, H);
        g.quadraticCurveTo(fxp + 6 + sway, H - 24, fxp + 18 + sway, H - 34 - (i % 3) * 6);
        g.moveTo(fxp, H);
        g.quadraticCurveTo(fxp - 6 + sway, H - 20, fxp - 16 + sway, H - 28 - (i % 2) * 6);
        g.stroke();
      }
    }

    function render() {
      const cfg = DIFFICULTY_CFG[difficulty];
      hidpi.apply();
      drawBackdrop();

      // Side cards
      drawSideCard(14, 18, PLAY_LEFT - 28, 92, 'MÀN CHƠI', '#facc15');
      fx.outlinedText(g, String(level), PLAY_LEFT / 2, 70, { size: 36, color: '#facc15' });

      drawSideCard(14, 124, PLAY_LEFT - 28, 150, 'TRỨNG TIẾP', '#7dd3fc');
      // Nest
      g.fillStyle = '#92400e';
      g.beginPath();
      g.ellipse(PLAY_LEFT / 2, 222, 34, 12, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#d97706';
      g.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.arc(PLAY_LEFT / 2, 226 - k, 30 - k * 2, Math.PI * 0.1, Math.PI * 0.9);
        g.stroke();
      }
      drawEggBubble(PLAY_LEFT / 2, 200 + Math.sin(sceneTime * 2.4) * 2, nextColor, 1.05);
      g.fillStyle = '#94a3b8';
      g.font = fx.font(11, 600);
      g.textAlign = 'center';
      g.fillText('SPACE / 🔄 để đổi', PLAY_LEFT / 2, 256);

      // Ceiling drop countdown as pips
      drawSideCard(14, 288, PLAY_LEFT - 28, 82, 'HẠ TRẦN SAU', '#fb7185');
      const pipCount = cfg.shotsPerDrop;
      const pipW = Math.min(12, (PLAY_LEFT - 56) / pipCount - 3);
      const pipsTotal = pipCount * (pipW + 3) - 3;
      for (let k = 0; k < pipCount; k++) {
        const on = k < shotsUntilDrop;
        fx.roundRectPath(g, PLAY_LEFT / 2 - pipsTotal / 2 + k * (pipW + 3), 320, pipW, 14, 3);
        g.fillStyle = on ? (shotsUntilDrop <= 2 ? '#fb7185' : '#4ade80') : 'rgba(148, 163, 184, 0.25)';
        g.fill();
      }
      g.fillStyle = '#e2e8f0';
      g.font = fx.font(12, 700);
      g.fillText(`${shotsUntilDrop} phát`, PLAY_LEFT / 2, 352);

      const rightX = PLAY_RIGHT + 14;
      const rightW = W - PLAY_RIGHT - 28;
      const rightCenter = PLAY_RIGHT + (W - PLAY_RIGHT) / 2;
      drawSideCard(rightX, 18, rightW, 152, 'HƯỚNG DẪN', '#38bdf8');
      g.fillStyle = '#cbd5e1';
      g.font = fx.font(12, 600);
      g.textAlign = 'center';
      g.fillText('• Rê chuột ngắm', rightCenter, 54);
      g.fillText('• Bấm chuột bắn', rightCenter, 78);
      g.fillText('• Ghép ≥ 3 trứng', rightCenter, 102);
      g.fillText('cùng màu để nổ!', rightCenter, 122);
      g.fillText('• Rơi chùm: thưởng!', rightCenter, 146);

      drawSideCard(rightX, 184, rightW, 30 + Math.ceil(cfg.colorCount / 3) * 40, 'MÀU TRỨNG', '#c084fc');
      for (let k = 0; k < cfg.colorCount; k++) {
        const ex = rightCenter + ((k % 3) - 1) * 36;
        const ey = 230 + Math.floor(k / 3) * 40;
        drawEggBubble(ex, ey, k, 0.7);
      }

      g.save();
      camShake.apply(g);

      // Glass playfield
      fx.roundRectPath(g, PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - PLAY_TOP, 16);
      const fieldGrad = g.createLinearGradient(0, PLAY_TOP, 0, PLAY_BOTTOM);
      fieldGrad.addColorStop(0, 'rgba(15, 23, 42, 0.94)');
      fieldGrad.addColorStop(1, 'rgba(30, 27, 75, 0.9)');
      g.fillStyle = fieldGrad;
      g.fill();
      const frameGrad = g.createLinearGradient(PLAY_LEFT, 0, PLAY_RIGHT, 0);
      frameGrad.addColorStop(0, '#38bdf8');
      frameGrad.addColorStop(0.5, '#a855f7');
      frameGrad.addColorStop(1, '#22c55e');
      g.strokeStyle = frameGrad;
      g.lineWidth = 3;
      g.stroke();

      // Danger zone: red band that heats up as the eggs get closer
      const lowY = getLowestBubbleY();
      const heat = Math.max(0, Math.min(1, (lowY - (DANGER_Y - ROW_HEIGHT * 4)) / (ROW_HEIGHT * 4)));
      const dz = g.createLinearGradient(0, DANGER_Y - 40, 0, DANGER_Y + 4);
      dz.addColorStop(0, 'rgba(244, 63, 94, 0)');
      dz.addColorStop(1, `rgba(244, 63, 94, ${0.08 + heat * (0.3 + Math.sin(sceneTime * 8) * 0.1)})`);
      g.fillStyle = dz;
      g.fillRect(PLAY_LEFT + 2, DANGER_Y - 40, PLAY_RIGHT - PLAY_LEFT - 4, 44);
      g.save();
      g.setLineDash([8, 6]);
      g.lineDashOffset = -sceneTime * 20;
      g.strokeStyle = `rgba(244, 63, 94, ${0.55 + heat * 0.4})`;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(PLAY_LEFT + 8, DANGER_Y);
      g.lineTo(PLAY_RIGHT - 8, DANGER_Y);
      g.stroke();
      g.restore();

      // Stone ceiling
      g.fillStyle = '#334155';
      fx.roundRectPath(g, PLAY_LEFT + 2, PLAY_TOP + 1, PLAY_RIGHT - PLAY_LEFT - 4, 6, 3);
      g.fill();

      // Grid eggs (gentle idle wobble on the bottom-most rows when close to danger)
      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < getColCount(r); c++) {
          if (grid[r][c] != null) {
            const pos = gridToPixel(r, c);
            const jitter = heat > 0.6 && !reduced ? Math.sin(sceneTime * 30 + r + c) * heat : 0;
            drawEggBubble(pos.x + jitter, pos.y, grid[r][c], 1);
          }
        }
      }

      fallingBubbles.forEach((fb) => {
        drawEggBubble(fb.x, fb.y, fb.color, 0.95);
      });

      drawAimLaser();
      drawCuteDino();

      // Stone cannon
      const clampedAngle = Math.max(-Math.PI + 0.18, Math.min(-0.18, aimAngle));
      g.save();
      g.translate(LAUNCHER_X, LAUNCHER_Y);
      g.rotate(clampedAngle + Math.PI / 2);
      const barrel = g.createLinearGradient(-14, 0, 14, 0);
      barrel.addColorStop(0, '#475569');
      barrel.addColorStop(0.5, '#94a3b8');
      barrel.addColorStop(1, '#334155');
      g.fillStyle = barrel;
      g.strokeStyle = '#0f172a';
      g.lineWidth = 2.5;
      fx.roundRectPath(g, -14, -44, 28, 44, 8);
      g.fill();
      g.stroke();
      g.fillStyle = '#facc15';
      fx.roundRectPath(g, -16, -46, 32, 8, 4);
      g.fill();
      g.stroke();
      g.restore();
      // Base
      g.fillStyle = '#1e293b';
      g.strokeStyle = '#0f172a';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(LAUNCHER_X, LAUNCHER_Y + 14, 34, 12, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      if (activeShot) {
        // Motion trail
        g.save();
        g.globalCompositeOperation = 'lighter';
        const cObj = BUBBLE_COLORS[activeShot.color] || BUBBLE_COLORS[0];
        for (let k = 1; k <= 4; k++) {
          g.globalAlpha = 0.18 - k * 0.035;
          g.beginPath();
          g.arc(activeShot.x - activeShot.vx * 0.012 * k, activeShot.y - activeShot.vy * 0.012 * k, RADIUS - k * 2, 0, Math.PI * 2);
          g.fillStyle = cObj.hex;
          g.fill();
        }
        g.restore();
        drawEggBubble(activeShot.x, activeShot.y, activeShot.color, 1);
      } else if (!isGameOver) {
        drawEggBubble(LAUNCHER_X, LAUNCHER_Y, currentColor, 1 + Math.sin(sceneTime * 4) * 0.03);
      }

      sparks.draw(g);

      floatingTexts.forEach((ft) => {
        g.save();
        g.globalAlpha = Math.max(0, Math.min(1, ft.life));
        fx.outlinedText(g, ft.text, ft.x, ft.y, { size: 18, color: ft.color });
        g.restore();
      });
      g.restore();

      if (levelBannerT < 1.8 && !isGameOver) {
        fx.drawBanner(g, W, H, `🎉 QUA MÀN ${level - 1}!`, {
          t: levelBannerT,
          duration: 1.8,
          accent: '#facc15',
          sub: `+${levelBannerBonus} điểm • Màn ${level} bắt đầu`,
          size: 36
        });
      }

      const overlay = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (overlay !== overlayKey) {
        overlayKey = overlay;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g, W, H, {
          icon: '🦖',
          title: 'TRỨNG ĐÃ CHẠM VẠCH!',
          subtitle: 'Khủng long nhỏ cần bạn giúp thêm lần nữa.',
          lines: [`Tổng điểm|${score.toLocaleString('vi-VN')}`, `Đạt màn|${level}`, `Chế độ|${cfg.label}`],
          hint: 'Bấm chuột hoặc nhấn Chơi Lại để bắt đầu ván mới',
          accent: '#f43f5e',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g, W, H, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để bắn trứng tiếp.',
          accent: '#a855f7',
          t: overlayT,
          backdrop: 0.55
        });
      }
    }

    function getCanvasPos(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * W,
        y: ((clientY - rect.top) / rect.height) * H
      };
    }

    function updateAimFromPoint(pt) {
      const dx = pt.x - LAUNCHER_X;
      const dy = Math.min(-25, pt.y - LAUNCHER_Y);
      aimAngle = Math.atan2(dy, dx);
    }

    function onMouseMove(evt) {
      updateAimFromPoint(getCanvasPos(evt));
    }

    function onMouseDown(evt) {
      if (evt.button !== 0) return;
      updateAimFromPoint(getCanvasPos(evt));
      fireBubble();
    }

    function onTouchStart(evt) {
      evt.preventDefault();
      updateAimFromPoint(getCanvasPos(evt));
    }

    function onTouchMove(evt) {
      evt.preventDefault();
      updateAimFromPoint(getCanvasPos(evt));
    }

    function onTouchEnd(evt) {
      evt.preventDefault();
      fireBubble();
    }

    function onKeyDown(evt) {
      if (evt.key === 'ArrowLeft' || evt.key === 'a' || evt.key === 'A') {
        keys.left = true;
      } else if (evt.key === 'ArrowRight' || evt.key === 'd' || evt.key === 'D') {
        keys.right = true;
      } else if (evt.key === 'ArrowUp' || evt.key === 'w' || evt.key === 'W' || evt.key === 'Enter') {
        evt.preventDefault();
        fireBubble();
      } else if (evt.key === ' ') {
        evt.preventDefault();
        swapBubbles();
      }
    }

    function onKeyUp(evt) {
      if (evt.key === 'ArrowLeft' || evt.key === 'a' || evt.key === 'A') {
        keys.left = false;
      } else if (evt.key === 'ArrowRight' || evt.key === 'd' || evt.key === 'D') {
        keys.right = false;
      }
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    global.addEventListener('keydown', onKeyDown);
    global.addEventListener('keyup', onKeyUp);

    swapBtn.addEventListener('click', swapBubbles);
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (isGameOver) return;
        ArcadeHub.sound.click();
        setPaused(!isPaused);
      });
    }

    diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextDiff = btn.getAttribute('data-diff');
        if (nextDiff === difficulty) return;
        difficulty = nextDiff;
        diffBtns.forEach((b) => b.classList.toggle('active', b === btn));
        ArcadeHub.sound.click();
        initLevel(true);
      });
    });

    // Touch bar buttons
    const btnLeft = container.querySelector('#bsTouchLeft');
    const btnRight = container.querySelector('#bsTouchRight');
    const btnSwap = container.querySelector('#bsTouchSwap');
    const btnShoot = container.querySelector('#bsTouchShoot');

    function bindHold(btn, keyName) {
      if (!btn) return;
      const start = (e) => {
        e.preventDefault();
        keys[keyName] = true;
      };
      const end = (e) => {
        e.preventDefault();
        keys[keyName] = false;
      };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
    }

    bindHold(btnLeft, 'left');
    bindHold(btnRight, 'right');
    if (btnSwap) btnSwap.addEventListener('click', swapBubbles);
    if (btnShoot) btnShoot.addEventListener('click', fireBubble);

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      updatePresentation(dt);
      update(dt);
      render();
      animId = requestAnimationFrame(loop);
    }

    initLevel(true);
    animId = requestAnimationFrame(loop);

    return {
      restart() {
        initLevel(true);
      },
      pause() {
        setPaused(true);
      },
      resume() {
        setPaused(false);
      },
      isPaused() {
        return isPaused;
      },
      destroy() {
        if (animId) cancelAnimationFrame(animId);
        global.removeEventListener('keydown', onKeyDown);
        global.removeEventListener('keyup', onKeyUp);
      }
    };
  }

  ArcadeHub.games.bubbleshooter = {
    init(container, ctx) {
      return createBubbleShooterGame(container, ctx);
    }
  };
})(window);
