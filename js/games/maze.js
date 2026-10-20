(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const HERO_ROSTER = {
    spiderman: {
      id: 'spiderman',
      name: 'Người Nhện',
      suitColor: '#dc2626',
      secondaryColor: '#2563eb',
      capeColor: null,
      emblemColor: '#090d16',
      trailColor: 'rgba(248, 250, 252, 0.45)',
      particleColor: '#f8fafc'
    },
    flash: {
      id: 'flash',
      name: 'The Flash',
      suitColor: '#e11d48',
      secondaryColor: '#facc15',
      capeColor: null,
      emblemColor: '#facc15',
      trailColor: 'rgba(250, 204, 21, 0.35)',
      particleColor: '#fde047'
    },
    batman: {
      id: 'batman',
      name: 'Batman',
      suitColor: '#334155',
      secondaryColor: '#0f172a',
      capeColor: '#090d16',
      emblemColor: '#facc15',
      trailColor: 'rgba(148, 163, 184, 0.3)',
      particleColor: '#94a3b8'
    },
    superman: {
      id: 'superman',
      name: 'Superman',
      suitColor: '#2563eb',
      secondaryColor: '#dc2626',
      capeColor: '#dc2626',
      emblemColor: '#facc15',
      trailColor: 'rgba(56, 189, 248, 0.32)',
      particleColor: '#38bdf8'
    }
  };

  const DIFFICULTY_MODES = {
    easy: {
      label: 'DỄ',
      cols: 9,
      rows: 7,
      extraLoops: 5,
      dronesCount: 0,
      maxLives: 5,
      scoreMult: 1.0
    },
    hard: {
      label: 'KHÓ',
      cols: 13,
      rows: 9,
      extraLoops: 3,
      dronesCount: 3,
      maxLives: 3,
      scoreMult: 1.6
    }
  };

  function createMazeGame(container, ctx) {
    let width = 900;
    let height = 520;
    let animId = null;
    let lastTime = performance.now();

    let selectedHeroId = 'spiderman';
    let difficulty = 'easy';
    let level = 1;
    let score = 0;
    let lives = 5;
    let isGameOver = false;

    // Maze Grid State
    let cols = 9;
    let rows = 7;
    let grid = []; // grid[r][c] = { top, right, bottom, left, visited, crumb, star }
    let hintPath = [];
    let showHint = false;

    // Player Position (grid r, c + smooth visual x, y in grid units)
    let player = {
      r: 0,
      c: 0,
      visR: 0,
      visC: 0,
      facing: 1, // 1 right, -1 left
      invincible: 0
    };

    let drones = [];
    let popups = [];
    let pointerDragging = false;
    let pointerCell = null;
    let dragStepCooldown = 0;
    let celebrationTimer = 0;

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const sparks = fx.createParticles(280);
    const camShake = fx.createShake(8);
    const wallLayer = document.createElement('canvas');
    let wallLayerKey = '';
    let mazeVersion = 0;
    let lastClearBonus = 0;
    let isPaused = false;
    let sceneTime = 0;
    let overlayT = 0;
    let overlayKey = '';
    let hurtTimer = 0;
    const fireflies = Array.from({ length: 18 }, () => ({
      x: Math.random(),
      y: Math.random(),
      a: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5
    }));

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group" id="mazeHeroSelect">
          <span style="font-size:0.78rem;color:#94a3b8;font-weight:700;">Chọn Siêu Nhân:</span>
          <button type="button" class="pill-btn active" data-hero="spiderman">🕷 Người Nhện</button>
          <button type="button" class="pill-btn" data-hero="flash">⚡ The Flash</button>
          <button type="button" class="pill-btn" data-hero="batman">🦇 Batman</button>
          <button type="button" class="pill-btn" data-hero="superman">🦸 Superman</button>
        </div>
        <div class="toolbar-group">
          <button type="button" class="pill-btn active" data-diff="easy">🟢 Dễ</button>
          <button type="button" class="pill-btn" data-diff="hard">🔴 Khó (Có Robot tuần tra)</button>
          <button type="button" class="pill-btn" id="mazeHintBtn">💡 Chỉ đường</button>
          <button type="button" class="pill-btn" id="mazePauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="mazeCanvas" class="game-canvas"></canvas>
      </div>

      <div class="touch-controls">
        <div class="touch-cluster">
          <span style="font-size:0.78rem;color:#94a3b8;">
            💡 Giữ/kéo chuột theo đường mê cung hoặc bấm phím Mũi tên (WASD) để đi cứu Công Chúa 👸
          </span>
        </div>
        <div class="touch-cluster">
          <button type="button" class="touch-btn" data-move="left">◀</button>
          <button type="button" class="touch-btn" data-move="up">▲</button>
          <button type="button" class="touch-btn" data-move="down">▼</button>
          <button type="button" class="touch-btn" data-move="right">▶</button>
        </div>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#mazeCanvas');
    const g2d = canvas.getContext('2d');
    const hintBtn = shell.querySelector('#mazeHintBtn');
    const pauseBtn = shell.querySelector('#mazePauseBtn');

    function getCfg() {
      return DIFFICULTY_MODES[difficulty] || DIFFICULTY_MODES.easy;
    }

    function getHero() {
      return HERO_ROSTER[selectedHeroId] || HERO_ROSTER.spiderman;
    }

    function generateMaze() {
      const cfg = getCfg();
      cols = cfg.cols;
      rows = cfg.rows;

      grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
          top: true,
          right: true,
          bottom: true,
          left: true,
          visited: false,
          crumb: false,
          star: false
        }))
      );

      // Randomized DFS Maze Carve
      const stack = [];
      grid[0][0].visited = true;
      stack.push({ r: 0, c: 0 });

      const dirs = [
        { dr: -1, dc: 0, wall: 'top', opp: 'bottom' },
        { dr: 0, dc: 1, wall: 'right', opp: 'left' },
        { dr: 1, dc: 0, wall: 'bottom', opp: 'top' },
        { dr: 0, dc: -1, wall: 'left', opp: 'right' }
      ];

      while (stack.length > 0) {
        const cur = stack[stack.length - 1];
        const neighbors = [];

        dirs.forEach((d) => {
          const nr = cur.r + d.dr;
          const nc = cur.c + d.dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
            neighbors.push({ nr, nc, d });
          }
        });

        if (neighbors.length > 0) {
          const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
          grid[cur.r][cur.c][pick.d.wall] = false;
          grid[pick.nr][pick.nc][pick.d.opp] = false;
          grid[pick.nr][pick.nc].visited = true;
          stack.push({ r: pick.nr, c: pick.nc });
        } else {
          stack.pop();
        }
      }

      // Open a few extra walls so kids have more than one route if desired
      for (let i = 0; i < cfg.extraLoops; i++) {
        const r = 1 + Math.floor(Math.random() * (rows - 2));
        const c = 1 + Math.floor(Math.random() * (cols - 2));
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const nr = r + d.dr;
        const nc = c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          grid[r][c][d.wall] = false;
          grid[nr][nc][d.opp] = false;
        }
      }

      // Scatter collectible stars
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) continue;
          if (Math.random() < 0.22) {
            grid[r][c].star = true;
          }
        }
      }

      // Spawn Patrol Drones in Hard Mode
      drones = [];
      for (let i = 0; i < cfg.dronesCount; i++) {
        const dr = 1 + Math.floor(Math.random() * (rows - 2));
        const dc = 2 + Math.floor(Math.random() * (cols - 3));
        drones.push({
          r: dr,
          c: dc,
          visR: dr,
          visC: dc,
          stepTimer: 0.7 + i * 0.15
        });
      }

      player.r = 0;
      player.c = 0;
      player.visR = 0;
      player.visC = 0;
      player.invincible = 0;
      grid[0][0].crumb = true;
      mazeVersion += 1;
      showHint = false;
      hintBtn.classList.remove('active');
      computeShortestPath();
    }

    function computeShortestPath() {
      const queue = [{ r: player.r, c: player.c, path: [{ r: player.r, c: player.c }] }];
      const seen = new Set([player.r + ',' + player.c]);

      const moves = [
        { dr: -1, dc: 0, wall: 'top' },
        { dr: 0, dc: 1, wall: 'right' },
        { dr: 1, dc: 0, wall: 'bottom' },
        { dr: 0, dc: -1, wall: 'left' }
      ];

      while (queue.length > 0) {
        const cur = queue.shift();
        if (cur.r === rows - 1 && cur.c === cols - 1) {
          hintPath = cur.path;
          return;
        }
        moves.forEach((m) => {
          if (!grid[cur.r][cur.c][m.wall]) {
            const nr = cur.r + m.dr;
            const nc = cur.c + m.dc;
            const key = nr + ',' + nc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen.has(key)) {
              seen.add(key);
              queue.push({ r: nr, c: nc, path: [...cur.path, { r: nr, c: nc }] });
            }
          }
        });
      }
      hintPath = [];
    }

    function startNewRun() {
      const cfg = getCfg();
      level = 1;
      score = 0;
      lives = cfg.maxLives;
      isGameOver = false;
      celebrationTimer = 0;
      popups = [];
      sparks.clear();
      camShake.reset();
      hurtTimer = 0;
      setPaused(false);
      ctx.updateScore(0);
      generateMaze();
    }

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 980);
      const maxH = Math.max(360, Math.min(window.innerHeight - 220, 540));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getMazeMetrics() {
      const topHudH = 58;
      const pad = 18;
      const availW = width - pad * 2;
      const availH = height - topHudH - pad * 1.5;
      const cellSize = Math.floor(Math.min(availW / cols, availH / rows));
      const boardW = cellSize * cols;
      const boardH = cellSize * rows;
      const offsetX = Math.floor((width - boardW) / 2);
      const offsetY = topHudH + Math.floor((availH - boardH) / 2);
      return { cellSize, boardW, boardH, offsetX, offsetY };
    }

    function spawnSparkles(cx, cy, color, count) {
      sparks.burst(cx, cy, {
        count: count || 12,
        speed: [30, 120],
        life: [0.4, 0.75],
        size: [2.5, 5],
        colors: [color || '#facc15', '#ffffff']
      });
    }

    function addPopup(x, y, text, color) {
      popups.push({
        x,
        y,
        text,
        color: color || '#facc15',
        alpha: 1,
        vy: -38
      });
    }

    function tryMovePlayer(dr, dc) {
      if (isGameOver || isPaused || celebrationTimer > 0) return false;
      const r = player.r;
      const c = player.c;
      const cell = grid[r][c];

      if (dr === -1 && cell.top) return false;
      if (dr === 1 && cell.bottom) return false;
      if (dc === -1 && cell.left) return false;
      if (dc === 1 && cell.right) return false;

      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;

      if (dc !== 0) player.facing = dc > 0 ? 1 : -1;
      player.r = nr;
      player.c = nc;
      grid[nr][nc].crumb = true;
      ArcadeHub.sound.click();

      const { cellSize, offsetX, offsetY } = getMazeMetrics();
      const px = offsetX + (nc + 0.5) * cellSize;
      const py = offsetY + (nr + 0.5) * cellSize;
      spawnSparkles(px, py, getHero().particleColor, 5);

      // Collect star
      if (grid[nr][nc].star) {
        grid[nr][nc].star = false;
        const pts = Math.round(50 * getCfg().scoreMult);
        score += pts;
        ctx.updateScore(score);
        ArcadeHub.sound.move();
        addPopup(px, py - 12, `⭐ +${pts}`, '#facc15');
        sparks.burst(px, py, { count: 10, kind: 'star', speed: [60, 160], size: [3, 6], colors: ['#fde047', '#facc15', '#fff7cc'] });
        sparks.ring(px, py, { to: 34, color: '#fde047' });
      }

      if (showHint) {
        computeShortestPath();
      }

      // Check if reached Princess at (rows - 1, cols - 1)
      if (nr === rows - 1 && nc === cols - 1) {
        ArcadeHub.sound.win();
        const clearBonus = Math.round((350 + level * 80) * getCfg().scoreMult);
        score += clearBonus;
        ctx.updateScore(score);
        celebrationTimer = 1.6;
        lastClearBonus = clearBonus;
        spawnSparkles(px, py, '#f43f5e', 24);
        sparks.burst(px, py, {
          count: 46,
          kind: 'confetti',
          speed: [120, 320],
          life: [0.9, 1.5],
          size: [4, 7],
          gravity: 260,
          drag: 1.2,
          colors: ['#f472b6', '#facc15', '#38bdf8', '#4ade80', '#ffffff']
        });
        sparks.ring(px, py, { to: cellSize * 2.2, color: '#f472b6' });
        ctx.submitHighScore(
          score,
          `${getHero().name} • Màn ${level} (${getCfg().label})`
        );
      }
      return true;
    }

    function updateGame(dt) {
      if (isGameOver) return;

      if (celebrationTimer > 0) {
        celebrationTimer -= dt;
        if (celebrationTimer <= 0) {
          level += 1;
          generateMaze();
        }
      }

      if (player.invincible > 0) player.invincible -= dt;
      if (dragStepCooldown > 0) dragStepCooldown -= dt;

      // Smooth visual interpolation for Superhero
      player.visR += (player.r - player.visR) * Math.min(1, dt * 16);
      player.visC += (player.c - player.visC) * Math.min(1, dt * 16);

      // Direct Mouse / Touch Drag Guiding
      if (pointerDragging && pointerCell && dragStepCooldown <= 0) {
        const dr = Math.sign(pointerCell.r - player.r);
        const dc = Math.sign(pointerCell.c - player.c);
        let moved = false;
        if (Math.abs(pointerCell.c - player.c) >= Math.abs(pointerCell.r - player.r)) {
          if (dc !== 0) moved = tryMovePlayer(0, dc);
          if (!moved && dr !== 0) moved = tryMovePlayer(dr, 0);
        } else {
          if (dr !== 0) moved = tryMovePlayer(dr, 0);
          if (!moved && dc !== 0) moved = tryMovePlayer(0, dc);
        }
        if (moved) {
          dragStepCooldown = 0.12;
        }
      }

      // Patrol Drones in Hard Mode
      drones.forEach((d) => {
        d.stepTimer -= dt;
        if (d.stepTimer <= 0) {
          d.stepTimer = 0.65;
          const cell = grid[d.r][d.c];
          const valid = [];
          if (!cell.top) valid.push([-1, 0]);
          if (!cell.right) valid.push([0, 1]);
          if (!cell.bottom) valid.push([1, 0]);
          if (!cell.left) valid.push([0, -1]);
          if (valid.length > 0) {
            const [mr, mc] = valid[Math.floor(Math.random() * valid.length)];
            const nr = d.r + mr;
            const nc = d.c + mc;
            if (!(nr === 0 && nc === 0) && !(nr === rows - 1 && nc === cols - 1)) {
              d.r = nr;
              d.c = nc;
            }
          }
        }
        d.visR += (d.r - d.visR) * Math.min(1, dt * 10);
        d.visC += (d.c - d.visC) * Math.min(1, dt * 10);

        // Collision with Player
        if (
          player.invincible <= 0 &&
          celebrationTimer <= 0 &&
          Math.hypot(player.visR - d.visR, player.visC - d.visC) < 0.55
        ) {
          lives -= 1;
          player.invincible = 2.0;
          hurtTimer = 0.45;
          camShake.add(0.6);
          ArcadeHub.sound.hit();
          const { cellSize, offsetX, offsetY } = getMazeMetrics();
          addPopup(
            offsetX + (player.c + 0.5) * cellSize,
            offsetY + player.r * cellSize,
            '💥 CHẠM ROBOT! -1 TIM',
            '#f43f5e'
          );

          if (lives <= 0) {
            isGameOver = true;
            ArcadeHub.sound.gameOver();
            ctx.submitHighScore(
              score,
              `${getHero().name} • Màn ${level} (${getCfg().label})`
            );
          }
        }
      });

      for (let i = popups.length - 1; i >= 0; i--) {
        const pp = popups[i];
        pp.y += pp.vy * dt;
        pp.alpha -= dt * 0.85;
        if (pp.alpha <= 0) popups.splice(i, 1);
      }
    }

    // =========================================================
    // SUPERHERO & PRINCESS CHARACTER RENDERING
    // =========================================================
    function drawSuperhero(cx, cy, size, hero) {
      const r = size * 0.36;
      g2d.save();
      g2d.translate(cx, cy);
      if (player.invincible > 0 && Math.floor(sceneTime * 11) % 2 === 0) {
        g2d.globalAlpha = 0.5;
      }

      // Ground shadow
      g2d.fillStyle = 'rgba(0,0,0,0.45)';
      g2d.beginPath();
      g2d.ellipse(0, r * 0.85, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
      g2d.fill();

      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2.2;

      // Flowing Cape for Superman & Batman
      if (hero.capeColor) {
        const wave = Math.sin(sceneTime * 8) * 3;
        g2d.fillStyle = hero.capeColor;
        g2d.beginPath();
        g2d.moveTo(-r * 0.55, -r * 0.2);
        g2d.lineTo(r * 0.55, -r * 0.2);
        g2d.lineTo(r * 0.9 + wave, r * 0.85);
        g2d.lineTo(-r * 0.9 + wave, r * 0.85);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
      }

      // Torso Suit
      g2d.fillStyle = hero.suitColor;
      g2d.beginPath();
      g2d.roundRect(-r * 0.62, -r * 0.15, r * 1.24, r * 0.92, 6);
      g2d.fill();
      g2d.stroke();

      // Chest Emblem
      g2d.fillStyle = hero.emblemColor;
      g2d.beginPath();
      g2d.arc(0, r * 0.25, r * 0.26, 0, Math.PI * 2);
      g2d.fill();

      // Head / Mask
      g2d.fillStyle = hero.id === 'superman' ? '#fde68a' : hero.suitColor;
      g2d.beginPath();
      g2d.arc(0, -r * 0.45, r * 0.56, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      if (hero.id === 'spiderman') {
        // Big angled white Spider-Eyes
        g2d.fillStyle = '#ffffff';
        g2d.beginPath();
        g2d.ellipse(-r * 0.22, -r * 0.45, r * 0.2, r * 0.13, 0.25, 0, Math.PI * 2);
        g2d.ellipse(r * 0.22, -r * 0.45, r * 0.2, r * 0.13, -0.25, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
      } else if (hero.id === 'flash') {
        // Yellow Lightning Ear Wings & Visor Eyes
        g2d.fillStyle = '#facc15';
        g2d.beginPath();
        g2d.moveTo(-r * 0.55, -r * 0.45);
        g2d.lineTo(-r * 0.9, -r * 0.75);
        g2d.lineTo(-r * 0.5, -r * 0.6);
        g2d.moveTo(r * 0.55, -r * 0.45);
        g2d.lineTo(r * 0.9, -r * 0.75);
        g2d.lineTo(r * 0.5, -r * 0.6);
        g2d.fill();
        g2d.stroke();

        g2d.fillStyle = '#ffffff';
        g2d.beginPath();
        g2d.arc(-r * 0.2, -r * 0.45, r * 0.12, 0, Math.PI * 2);
        g2d.arc(r * 0.2, -r * 0.45, r * 0.12, 0, Math.PI * 2);
        g2d.fill();
      } else if (hero.id === 'batman') {
        // Pointed Bat Ears & White Slit Eyes
        g2d.fillStyle = '#0f172a';
        g2d.beginPath();
        g2d.moveTo(-r * 0.45, -r * 0.75);
        g2d.lineTo(-r * 0.35, -r * 1.25);
        g2d.lineTo(-r * 0.15, -r * 0.9);
        g2d.moveTo(r * 0.45, -r * 0.75);
        g2d.lineTo(r * 0.35, -r * 1.25);
        g2d.lineTo(r * 0.15, -r * 0.9);
        g2d.fill();
        g2d.stroke();

        g2d.fillStyle = '#ffffff';
        g2d.fillRect(-r * 0.32, -r * 0.52, r * 0.22, r * 0.1);
        g2d.fillRect(r * 0.1, -r * 0.52, r * 0.22, r * 0.1);
      } else if (hero.id === 'superman') {
        // Black Hair & S-Curl + Friendly Eyes
        g2d.fillStyle = '#090d16';
        g2d.beginPath();
        g2d.arc(0, -r * 0.58, r * 0.52, Math.PI, 0);
        g2d.fill();
        g2d.beginPath();
        g2d.arc(-r * 0.2, -r * 0.42, r * 0.09, 0, Math.PI * 2);
        g2d.arc(r * 0.2, -r * 0.42, r * 0.09, 0, Math.PI * 2);
        g2d.fill();
      }

      g2d.restore();
    }

    function drawPrincessGoal(cx, cy, size) {
      const r = size * 0.36;
      g2d.save();
      g2d.translate(cx, cy);

      // Pulsing Pink Rescue Halo
      const pulse = 1 + Math.sin(sceneTime * 6) * 0.12;
      g2d.fillStyle = 'rgba(244, 114, 182, 0.25)';
      g2d.beginPath();
      g2d.arc(0, 0, r * 1.35 * pulse, 0, Math.PI * 2);
      g2d.fill();

      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;

      // Royal Pink Gown
      g2d.fillStyle = '#ec4899';
      g2d.beginPath();
      g2d.moveTo(-r * 0.35, -r * 0.1);
      g2d.lineTo(r * 0.35, -r * 0.1);
      g2d.lineTo(r * 0.75, r * 0.85);
      g2d.lineTo(-r * 0.75, r * 0.85);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Head
      g2d.fillStyle = '#fde68a';
      g2d.beginPath();
      g2d.arc(0, -r * 0.42, r * 0.48, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Golden Crown
      g2d.fillStyle = '#facc15';
      g2d.beginPath();
      g2d.moveTo(-r * 0.38, -r * 0.78);
      g2d.lineTo(-r * 0.42, -r * 1.15);
      g2d.lineTo(-r * 0.12, -r * 0.92);
      g2d.lineTo(0, -r * 1.22);
      g2d.lineTo(r * 0.12, -r * 0.92);
      g2d.lineTo(r * 0.42, -r * 1.15);
      g2d.lineTo(r * 0.38, -r * 0.78);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      g2d.restore();
    }

    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    function drawVectorStar(cx, cy, r, fill) {
      g2d.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
        g2d.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g2d.closePath();
      g2d.fillStyle = fill;
      g2d.fill();
    }

    function drawHudHeart(x, y, s, empty) {
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(s / 20, s / 20);
      g2d.beginPath();
      g2d.moveTo(0, 6);
      g2d.bezierCurveTo(-12, -2, -10, -14, 0, -7);
      g2d.bezierCurveTo(10, -14, 12, -2, 0, 6);
      g2d.closePath();
      g2d.fillStyle = empty ? 'rgba(148, 163, 184, 0.25)' : '#f43f5e';
      g2d.fill();
      if (!empty) {
        g2d.fillStyle = 'rgba(255,255,255,0.65)';
        g2d.beginPath();
        g2d.ellipse(-4.5, -6, 2.4, 1.6, -0.6, 0, Math.PI * 2);
        g2d.fill();
      }
      g2d.restore();
    }

    // Static maze art (floor tiles + hedge walls) is cached in an offscreen canvas and
    // rebuilt only when the maze or canvas size changes.
    function rebuildWallLayer(metrics) {
      const { cellSize, boardW, boardH, offsetX, offsetY } = metrics;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      wallLayer.width = Math.max(1, Math.round(width * dpr));
      wallLayer.height = Math.max(1, Math.round(height * dpr));
      const w = wallLayer.getContext('2d');
      w.setTransform(dpr, 0, 0, dpr, 0, 0);
      w.clearRect(0, 0, width, height);

      // Soft drop shadow under the whole garden
      w.fillStyle = 'rgba(0, 0, 0, 0.45)';
      fx.roundRectPath(w, offsetX - 6, offsetY + 4, boardW + 12, boardH + 12, 14);
      w.fill();

      // Stone-path floor with subtle checker + speckles
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;
          w.fillStyle = (r + c) % 2 === 0 ? '#3f3a2e' : '#38342a';
          w.fillRect(x, y, cellSize, cellSize);
          w.fillStyle = 'rgba(255, 255, 255, 0.04)';
          w.fillRect(x + 2, y + 2, cellSize - 4, cellSize * 0.4);
          const seed = (r * 31 + c * 17) % 7;
          w.fillStyle = 'rgba(0, 0, 0, 0.18)';
          w.beginPath();
          w.arc(x + cellSize * (0.25 + seed * 0.07), y + cellSize * (0.7 - seed * 0.05), cellSize * 0.04, 0, Math.PI * 2);
          w.fill();
        }
      }

      // Hedge walls: shadow pass, side pass, then lit top pass with leaf texture
      const t = Math.max(6, cellSize * 0.2);
      const segs = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;
          if (cell.top) segs.push([x, y, x + cellSize, y]);
          if (cell.left) segs.push([x, y, x, y + cellSize]);
          if (c === cols - 1 && cell.right) segs.push([x + cellSize, y, x + cellSize, y + cellSize]);
          if (r === rows - 1 && cell.bottom) segs.push([x, y + cellSize, x + cellSize, y + cellSize]);
        }
      }
      function hedgePass(dx, dy, style, extra) {
        w.strokeStyle = style;
        w.lineWidth = t + (extra || 0);
        w.lineCap = 'round';
        w.beginPath();
        segs.forEach(([x1, y1, x2, y2]) => {
          w.moveTo(x1 + dx, y1 + dy);
          w.lineTo(x2 + dx, y2 + dy);
        });
        w.stroke();
      }
      hedgePass(t * 0.25, t * 0.55, 'rgba(0, 0, 0, 0.45)', 2);
      hedgePass(0, t * 0.35, '#14532d', 0);
      hedgePass(0, 0, '#22c55e', 0);
      hedgePass(0, -t * 0.12, '#4ade80', -t * 0.45);

      // Leaf speckles along each hedge
      segs.forEach(([x1, y1, x2, y2], idx) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(2, Math.floor(len / (t * 0.8)));
        for (let k = 0; k <= steps; k++) {
          const px = x1 + ((x2 - x1) * k) / steps;
          const py = y1 + ((y2 - y1) * k) / steps;
          const jitter = ((idx * 13 + k * 7) % 5) - 2;
          w.fillStyle = (idx + k) % 3 === 0 ? 'rgba(187, 247, 208, 0.55)' : 'rgba(21, 128, 61, 0.65)';
          w.beginPath();
          w.arc(px + jitter * 0.6, py - t * 0.1 + jitter * 0.4, t * 0.16, 0, Math.PI * 2);
          w.fill();
        }
      });

      // Little flowers on random hedge corners
      for (let r = 0; r <= rows; r += 2) {
        for (let c = 0; c <= cols; c += 3) {
          const fxp = offsetX + c * cellSize;
          const fyp = offsetY + r * cellSize;
          w.fillStyle = (r + c) % 2 === 0 ? '#f472b6' : '#fde047';
          w.beginPath();
          w.arc(fxp, fyp - t * 0.15, t * 0.2, 0, Math.PI * 2);
          w.fill();
        }
      }
      wallLayerKey = `${mazeVersion}|${width}|${height}|${cellSize}`;
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      sparks.update(dt);
      camShake.update(dt);
      if (hurtTimer > 0) hurtTimer = Math.max(0, hurtTimer - dt);
      fireflies.forEach((f) => {
        f.a += dt * f.speed;
      });
    }

    function drawScene() {
      const cfg = getCfg();
      const hero = getHero();
      const metrics = getMazeMetrics();
      const { cellSize, boardW, boardH, offsetX, offsetY } = metrics;

      // Twilight garden backdrop
      const bgGrad = g2d.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.6, '#312e81');
      bgGrad.addColorStop(1, '#14532d');
      g2d.fillStyle = bgGrad;
      g2d.fillRect(0, 0, width, height);
      fx.glow(g2d, width * 0.85, height * 0.2, Math.min(width, height) * 0.5, '#f472b6', 0.18);
      fx.glow(g2d, width * 0.1, height * 0.9, Math.min(width, height) * 0.6, '#22c55e', 0.15);

      g2d.save();
      camShake.apply(g2d);

      const key = `${mazeVersion}|${width}|${height}|${cellSize}`;
      if (key !== wallLayerKey) rebuildWallLayer(metrics);

      // Cached floor + hedges, then dynamic trail/stars/hint on top
      g2d.drawImage(wallLayer, 0, 0, width, height);

      // Breadcrumb trail: soft glowing footprints in the hero's colour
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          const cx = offsetX + (c + 0.5) * cellSize;
          const cy = offsetY + (r + 0.5) * cellSize;
          if (cell.crumb) {
            g2d.fillStyle = hero.trailColor;
            g2d.beginPath();
            g2d.arc(cx, cy, cellSize * 0.12, 0, Math.PI * 2);
            g2d.fill();
          }
          if (cell.star) {
            const bob = Math.sin(sceneTime * 3 + r * 1.3 + c) * cellSize * 0.05;
            fx.glow(g2d, cx, cy + bob, cellSize * 0.5, '#fde047', 0.45);
            g2d.save();
            g2d.translate(cx, cy + bob);
            g2d.rotate(Math.sin(sceneTime * 2 + c) * 0.25);
            drawVectorStar(0, 0, cellSize * 0.24, '#facc15');
            drawVectorStar(-cellSize * 0.03, -cellSize * 0.03, cellSize * 0.12, '#fef9c3');
            g2d.restore();
          }
        }
      }

      // Hint path: flowing golden light
      if (showHint && hintPath.length > 1) {
        g2d.save();
        g2d.lineCap = 'round';
        g2d.lineJoin = 'round';
        g2d.beginPath();
        hintPath.forEach((pt, idx) => {
          const hx = offsetX + (pt.c + 0.5) * cellSize;
          const hy = offsetY + (pt.r + 0.5) * cellSize;
          if (idx === 0) g2d.moveTo(hx, hy);
          else g2d.lineTo(hx, hy);
        });
        g2d.strokeStyle = 'rgba(250, 204, 21, 0.25)';
        g2d.lineWidth = Math.max(8, cellSize * 0.3);
        g2d.stroke();
        g2d.strokeStyle = 'rgba(254, 240, 138, 0.95)';
        g2d.lineWidth = Math.max(3, cellSize * 0.1);
        g2d.setLineDash([cellSize * 0.18, cellSize * 0.22]);
        g2d.lineDashOffset = -sceneTime * cellSize * 1.4;
        g2d.stroke();
        g2d.restore();
      }

      // Princess at the goal, framed by a glowing garden arch
      const goalX = offsetX + (cols - 0.5) * cellSize;
      const goalY = offsetY + (rows - 0.5) * cellSize;
      fx.glow(g2d, goalX, goalY, cellSize * 1.4, '#f472b6', 0.5 + Math.sin(sceneTime * 3) * 0.15);
      drawPrincessGoal(goalX, goalY, cellSize);

      // Patrol robots (hard mode): metallic body, scanning eye, danger aura
      drones.forEach((d, idx) => {
        const dx = offsetX + (d.visC + 0.5) * cellSize;
        const dy = offsetY + (d.visR + 0.5) * cellSize + Math.sin(sceneTime * 4 + idx) * cellSize * 0.04;
        const rr = cellSize * 0.28;
        g2d.save();
        g2d.translate(dx, dy);
        g2d.strokeStyle = `rgba(239, 68, 68, ${0.35 + Math.sin(sceneTime * 6 + idx) * 0.2})`;
        g2d.lineWidth = 2;
        g2d.beginPath();
        g2d.arc(0, 0, rr * 1.5, 0, Math.PI * 2);
        g2d.stroke();
        fx.contactShadow(g2d, 0, rr * 1.05, rr * 0.8, rr * 0.25, 0.4);
        const body = g2d.createRadialGradient(-rr * 0.3, -rr * 0.4, 1, 0, 0, rr);
        body.addColorStop(0, '#f1f5f9');
        body.addColorStop(0.5, '#94a3b8');
        body.addColorStop(1, '#334155');
        g2d.fillStyle = body;
        g2d.strokeStyle = '#0f172a';
        g2d.lineWidth = 2;
        g2d.beginPath();
        g2d.arc(0, 0, rr, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
        // Antenna
        g2d.beginPath();
        g2d.moveTo(0, -rr);
        g2d.lineTo(0, -rr * 1.45);
        g2d.stroke();
        fx.glow(g2d, 0, -rr * 1.5, rr * 0.5, '#ef4444', Math.sin(sceneTime * 8 + idx) > 0 ? 0.9 : 0.3);
        // Visor + scanning eye
        g2d.fillStyle = '#0f172a';
        fx.roundRectPath(g2d, -rr * 0.7, -rr * 0.3, rr * 1.4, rr * 0.5, rr * 0.25);
        g2d.fill();
        const eyeX = Math.sin(sceneTime * 3 + idx) * rr * 0.45;
        fx.glow(g2d, eyeX, -rr * 0.05, rr * 0.6, '#ef4444', 0.8);
        g2d.fillStyle = '#fecaca';
        g2d.beginPath();
        g2d.arc(eyeX, -rr * 0.05, rr * 0.12, 0, Math.PI * 2);
        g2d.fill();
        g2d.restore();
      });

      // Hero
      const px = offsetX + (player.visC + 0.5) * cellSize;
      const py = offsetY + (player.visR + 0.5) * cellSize;
      const moving = Math.abs(player.r - player.visR) + Math.abs(player.c - player.visC) > 0.02;
      const hop = moving ? -Math.abs(Math.sin(sceneTime * 18)) * cellSize * 0.06 : 0;
      fx.glow(g2d, px, py, cellSize * 0.8, hero.particleColor, 0.18);
      drawSuperhero(px, py + hop, cellSize, hero);

      sparks.draw(g2d);

      // Fireflies drifting over the garden
      g2d.save();
      g2d.globalCompositeOperation = 'lighter';
      fireflies.forEach((f) => {
        const fxp = (f.x * width + Math.sin(f.a) * 30 + width) % width;
        const fyp = (f.y * height + Math.cos(f.a * 0.7) * 20 + height) % height;
        const a = 0.35 + Math.sin(f.a * 3) * 0.35;
        if (a <= 0.05) return;
        g2d.fillStyle = `rgba(253, 230, 138, ${a})`;
        g2d.beginPath();
        g2d.arc(fxp, fyp, 1.8, 0, Math.PI * 2);
        g2d.fill();
        g2d.fillStyle = `rgba(253, 230, 138, ${a * 0.25})`;
        g2d.beginPath();
        g2d.arc(fxp, fyp, 6, 0, Math.PI * 2);
        g2d.fill();
      });
      g2d.restore();

      popups.forEach((pp) => {
        const a = Math.max(0, Math.min(1, pp.alpha));
        g2d.save();
        g2d.globalAlpha = a;
        fx.outlinedText(g2d, pp.text, pp.x, pp.y, { size: Math.max(13, Math.min(17, cellSize * 0.32)), color: pp.color });
        g2d.restore();
      });
      g2d.restore();

      // Top HUD
      g2d.save();
      fx.roundRectPath(g2d, 14, 8, width - 28, 42, 12);
      g2d.fillStyle = 'rgba(15, 23, 42, 0.82)';
      g2d.fill();
      g2d.strokeStyle = 'rgba(134, 239, 172, 0.45)';
      g2d.lineWidth = 1.5;
      g2d.stroke();
      for (let i = 0; i < cfg.maxLives; i++) {
        drawHudHeart(34 + i * 22, 30, 18, i >= lives);
      }
      g2d.textAlign = 'center';
      g2d.textBaseline = 'middle';
      const title = width < 620 ? `🏰 MÀN ${level}` : `🏰 MÀN ${level} • ${hero.name.toUpperCase()} GIẢI CỨU CÔNG CHÚA`;
      const ts = fx.fitFontSize(g2d, title, width * 0.5, 15, 10, 800);
      g2d.font = fx.font(ts, 800);
      g2d.fillStyle = '#bbf7d0';
      g2d.fillText(title, width / 2, 30);
      fx.outlinedText(g2d, `🏆 ${score.toLocaleString('vi-VN')}`, width - 26, 30, {
        size: 18,
        color: '#facc15',
        align: 'right'
      });
      g2d.restore();

      if (hurtTimer > 0) {
        fx.vignette(g2d, width, height, 0, `rgba(239, 68, 68, ${hurtTimer})`);
      }

      if (celebrationTimer > 0 && !isGameOver) {
        fx.drawBanner(g2d, width, height, '🎉 ĐÃ CỨU CÔNG CHÚA!', {
          t: 1.6 - celebrationTimer,
          duration: 1.6,
          accent: '#f472b6',
          sub: `+${lastClearBonus} điểm • Sang màn ${level + 1}`,
          size: Math.min(38, width * 0.07)
        });
      }

      const overlay = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (overlay !== overlayKey) {
        overlayKey = overlay;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '🦸',
          title: 'HẾT NĂNG LƯỢNG RỒI!',
          subtitle: `${hero.name} cần nghỉ một chút — cùng thử lại nhé!`,
          lines: [`Điểm của bé|${score.toLocaleString('vi-VN')}`, `Màn đạt được|${level}`, `Chế độ|${cfg.label}`],
          hint: 'Bấm vào màn hình để chơi lại',
          accent: '#22c55e',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để đi tiếp.',
          accent: '#22c55e',
          t: overlayT,
          backdrop: 0.55
        });
      }
    }

    function updatePointerCell(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const { cellSize, offsetX, offsetY } = getMazeMetrics();
      const c = Math.floor((x - offsetX) / cellSize);
      const r = Math.floor((y - offsetY) / cellSize);
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        pointerCell = { r, c };
      } else {
        pointerCell = null;
      }
    }

    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      if (isGameOver) {
        startNewRun();
        return;
      }
      if (isPaused) return;
      pointerDragging = true;
      updatePointerCell(evt);
    });

    canvas.addEventListener('pointermove', (evt) => {
      if (pointerDragging) {
        updatePointerCell(evt);
      }
    });

    const onPointerUp = () => {
      pointerDragging = false;
      pointerCell = null;
    };
    window.addEventListener('pointerup', onPointerUp);

    function onKeyDown(evt) {
      if (evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (evt.code === 'ArrowUp' || evt.code === 'KeyW') {
        evt.preventDefault();
        tryMovePlayer(-1, 0);
      } else if (evt.code === 'ArrowDown' || evt.code === 'KeyS') {
        evt.preventDefault();
        tryMovePlayer(1, 0);
      } else if (evt.code === 'ArrowLeft' || evt.code === 'KeyA') {
        evt.preventDefault();
        tryMovePlayer(0, -1);
      } else if (evt.code === 'ArrowRight' || evt.code === 'KeyD') {
        evt.preventDefault();
        tryMovePlayer(0, 1);
      }
    }

    // Hero Selection
    shell.querySelectorAll('[data-hero]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-hero]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedHeroId = btn.getAttribute('data-hero');
      });
    });

    // Difficulty Selection
    shell.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-diff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-diff');
        startNewRun();
      });
    });

    function setPaused(next) {
      const value = !!next && !isGameOver;
      if (value === isPaused) return;
      isPaused = value;
      if (isPaused) {
        pointerDragging = false;
        pointerCell = null;
      }
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
      pauseBtn.classList.toggle('active', isPaused);
      pauseBtn.setAttribute('aria-pressed', String(isPaused));
    }

    pauseBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      setPaused(!isPaused);
    });

    hintBtn.addEventListener('click', () => {
      showHint = !showHint;
      ArcadeHub.sound.click();
      if (showHint) computeShortestPath();
      hintBtn.classList.toggle('active', showHint);
    });

    // Touch D-Pad buttons
    shell.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('pointerdown', (evt) => {
        evt.preventDefault();
        const dir = btn.getAttribute('data-move');
        if (dir === 'up') tryMovePlayer(-1, 0);
        else if (dir === 'down') tryMovePlayer(1, 0);
        else if (dir === 'left') tryMovePlayer(0, -1);
        else if (dir === 'right') tryMovePlayer(0, 1);
      });
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      updatePresentation(dt);
      if (!isPaused) updateGame(dt);
      drawScene();
      animId = requestAnimationFrame(loop);
    }

    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);

    resizeCanvas();
    startNewRun();
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);

    return {
      restart() {
        startNewRun();
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
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('pointerup', onPointerUp);
      }
    };
  }

  ArcadeHub.games.maze = {
    init: createMazeGame
  };
})(window);
