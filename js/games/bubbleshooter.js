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
    let particles = [];
    let floatingTexts = [];
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
    const g = canvas.getContext('2d');
    const infoBadge = container.querySelector('#bsInfoBadge');
    const swapBtn = container.querySelector('#bsSwapBtn');
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
      activeShot = null;
      fallingBubbles = [];
      particles = [];
      floatingTexts = [];
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

    function swapBubbles() {
      if (isGameOver || activeShot) return;
      const tmp = currentColor;
      currentColor = nextColor;
      nextColor = tmp;
      ArcadeHub.sound.click();
    }

    function fireBubble() {
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

    function spawnBurst(x, y, hexColor, count) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 180;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: hexColor,
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.7,
          r: 3 + Math.random() * 4
        });
      }
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
        floatingTexts.push({
          x: LAUNCHER_X,
          y: H / 2,
          text: `🎉 QUA MÀN +${bonus}!`,
          color: '#facc15',
          life: 1.4
        });
        ArcadeHub.sound.win();
        level++;
        initLevel(false);
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
      if (isGameOver) return;

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

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Floating texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 38 * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }
    }

    function drawEggBubble(x, y, colorIdx, scale) {
      const cObj = BUBBLE_COLORS[colorIdx] || BUBBLE_COLORS[0];
      const r = RADIUS * (scale || 1);

      g.save();
      g.translate(x, y);

      const grad = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
      grad.addColorStop(0, cObj.light);
      grad.addColorStop(0.55, cObj.hex);
      grad.addColorStop(1, cObj.dark);

      g.beginPath();
      g.arc(0, 0, r - 1, 0, Math.PI * 2);
      g.fillStyle = grad;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.stroke();

      // Glossy highlight
      g.beginPath();
      g.ellipse(-r * 0.32, -r * 0.32, r * 0.28, r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,255,255,0.65)';
      g.fill();

      // Cute icon inside egg
      g.font = `${Math.round(r * 0.85)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(cObj.symbol, 0, 1);

      g.restore();
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

        if (simY - RADIUS <= PLAY_TOP) break;

        // Stop laser if hitting existing bubble
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
          g.beginPath();
          g.arc(simX, simY, 3.2, 0, Math.PI * 2);
          g.fillStyle = cObj.hex;
          g.fill();
        }
        if (hitGrid) break;
      }
      g.restore();
    }

    function drawCuteDino() {
      g.save();
      g.translate(LAUNCHER_X - 68, LAUNCHER_Y - 8);

      // Dino tail
      g.fillStyle = '#22c55e';
      g.beginPath();
      g.moveTo(-18, 12);
      g.quadraticCurveTo(-38, 4, -34, -8);
      g.quadraticCurveTo(-22, 2, -12, 4);
      g.fill();

      // Dino body
      g.fillStyle = '#4ade80';
      g.strokeStyle = '#14532d';
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(0, 4, 20, 24, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Belly
      g.fillStyle = '#fef08a';
      g.beginPath();
      g.ellipse(4, 6, 11, 16, 0, 0, Math.PI * 2);
      g.fill();

      // Head
      g.fillStyle = '#4ade80';
      g.beginPath();
      g.arc(4, -22, 16, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Eye
      g.fillStyle = '#0f172a';
      g.beginPath();
      g.arc(10, -25, 3.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(11, -26.5, 1.3, 0, Math.PI * 2);
      g.fill();

      // Cute spikes
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

    function render() {
      // Background
      const bgGrad = g.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#1e1b4b');
      g.fillStyle = bgGrad;
      g.fillRect(0, 0, W, H);

      // Side panels decoration
      g.fillStyle = 'rgba(30, 41, 59, 0.7)';
      g.fillRect(0, 0, PLAY_LEFT, H);
      g.fillRect(PLAY_RIGHT, 0, W - PLAY_RIGHT, H);

      // Playfield frame
      g.fillStyle = 'rgba(15, 23, 42, 0.92)';
      g.fillRect(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - PLAY_TOP);
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 3;
      g.strokeRect(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - PLAY_TOP);

      // Danger line
      g.save();
      g.setLineDash([8, 6]);
      g.strokeStyle = 'rgba(244, 63, 94, 0.75)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(PLAY_LEFT + 6, DANGER_Y);
      g.lineTo(PLAY_RIGHT - 6, DANGER_Y);
      g.stroke();
      g.restore();

      // Side HUD info
      g.fillStyle = '#f8fafc';
      g.font = '800 16px sans-serif';
      g.textAlign = 'center';
      g.fillText('MÀN CHƠI', 75, 55);
      g.fillStyle = '#facc15';
      g.font = '900 34px sans-serif';
      g.fillText(String(level), 75, 95);

      g.fillStyle = '#cbd5e1';
      g.font = '700 14px sans-serif';
      g.fillText('TRỨNG TIẾP', 75, 165);
      drawEggBubble(75, 205, nextColor, 1.05);

      g.fillStyle = '#94a3b8';
      g.font = '600 12px sans-serif';
      g.fillText('Nhấn SPACE', 75, 250);
      g.fillText('để đổi trứng', 75, 268);

      // Right sidebar instructions
      const rightCenter = (PLAY_RIGHT + W) / 2;
      g.fillStyle = '#38bdf8';
      g.font = '800 15px sans-serif';
      g.fillText('HƯỚNG DẪN', rightCenter, 55);
      g.fillStyle = '#cbd5e1';
      g.font = '600 12.5px sans-serif';
      g.fillText('• Rê chuột ngắm', rightCenter, 88);
      g.fillText('• Bấm chuột bắn', rightCenter, 112);
      g.fillText('• Ghép ≥ 3 trứng', rightCenter, 136);
      g.fillText('  cùng màu để nổ!', rightCenter, 156);

      // Grid bubbles
      for (let r = 0; r < MAX_ROWS; r++) {
        for (let c = 0; c < getColCount(r); c++) {
          if (grid[r][c] != null) {
            const pos = gridToPixel(r, c);
            drawEggBubble(pos.x, pos.y, grid[r][c], 1);
          }
        }
      }

      // Falling bubbles
      fallingBubbles.forEach((fb) => {
        drawEggBubble(fb.x, fb.y, fb.color, 0.95);
      });

      // Aiming laser
      drawAimLaser();

      // Launcher Dino & Cannon
      drawCuteDino();

      const clampedAngle = Math.max(-Math.PI + 0.18, Math.min(-0.18, aimAngle));
      g.save();
      g.translate(LAUNCHER_X, LAUNCHER_Y);
      g.rotate(clampedAngle + Math.PI / 2);
      g.fillStyle = '#334155';
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 2.5;
      g.beginPath();
      g.roundRect(-14, -42, 28, 42, 8);
      g.fill();
      g.stroke();
      g.restore();

      // Current loaded egg or active flying egg
      if (activeShot) {
        drawEggBubble(activeShot.x, activeShot.y, activeShot.color, 1);
      } else {
        drawEggBubble(LAUNCHER_X, LAUNCHER_Y, currentColor, 1);
      }

      // Particles
      particles.forEach((p) => {
        g.save();
        g.globalAlpha = Math.max(0, p.life / p.maxLife);
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
        g.restore();
      });

      // Floating texts
      floatingTexts.forEach((ft) => {
        g.save();
        g.globalAlpha = Math.min(1, ft.life);
        g.font = '800 18px sans-serif';
        g.fillStyle = ft.color;
        g.textAlign = 'center';
        g.fillText(ft.text, ft.x, ft.y);
        g.restore();
      });

      if (isGameOver) {
        g.fillStyle = 'rgba(9, 13, 22, 0.82)';
        g.fillRect(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - PLAY_TOP);
        g.fillStyle = '#f43f5e';
        g.font = '900 34px sans-serif';
        g.textAlign = 'center';
        g.fillText('TRỨNG ĐÃ CHẠM VẠCH!', LAUNCHER_X, H / 2 - 30);
        g.fillStyle = '#f8fafc';
        g.font = '700 20px sans-serif';
        g.fillText(`Tổng điểm: ${score} • Đạt Màn ${level}`, LAUNCHER_X, H / 2 + 12);
        g.fillStyle = '#facc15';
        g.font = '700 16px sans-serif';
        g.fillText('Bấm chuột hoặc nhấn Chơi Lại để bắt đầu ván mới', LAUNCHER_X, H / 2 + 52);
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
