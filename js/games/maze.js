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
    let particles = [];
    let popups = [];
    let pointerDragging = false;
    let pointerCell = null;
    let dragStepCooldown = 0;
    let celebrationTimer = 0;

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
      particles = [];
      popups = [];
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
      for (let i = 0; i < (count || 12); i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 90;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: 2.5 + Math.random() * 3.5,
          color: color || '#facc15',
          life: 0.45 + Math.random() * 0.3
        });
      }
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
      if (isGameOver || celebrationTimer > 0) return false;
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
        spawnSparkles(px, py, '#f43f5e', 32);
        addPopup(
          width / 2,
          height / 2,
          `🎉 ĐÃ CỨU CÔNG CHÚA! +${clearBonus} ĐIỂM (SANG MÀN ${level + 1})`,
          '#facc15'
        );
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

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) particles.splice(i, 1);
      }

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
      if (player.invincible > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
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
        const wave = Math.sin(performance.now() * 0.008) * 3;
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
      const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.12;
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

    function drawScene() {
      const cfg = getCfg();
      const hero = getHero();
      const { cellSize, boardW, boardH, offsetX, offsetY } = getMazeMetrics();

      // Background
      const bgGrad = g2d.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#1e1b4b');
      g2d.fillStyle = bgGrad;
      g2d.fillRect(0, 0, width, height);

      // Top HUD inside Canvas
      g2d.save();
      g2d.fillStyle = 'rgba(9, 13, 24, 0.84)';
      g2d.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      g2d.lineWidth = 1.8;
      g2d.beginPath();
      g2d.roundRect(14, 8, width - 28, 42, 10);
      g2d.fill();
      g2d.stroke();

      g2d.font = '800 16px "Segoe UI", sans-serif';
      g2d.textAlign = 'left';
      const heartsStr = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, cfg.maxLives - lives));
      g2d.fillText(heartsStr, 26, 35);

      g2d.textAlign = 'center';
      g2d.fillStyle = '#38bdf8';
      g2d.font = '800 15px "Segoe UI", sans-serif';
      g2d.fillText(
        `🏰 MÀN ${level} • ${hero.name.toUpperCase()} GIẢI CỨU CÔNG CHÚA`,
        width / 2,
        34
      );

      g2d.textAlign = 'right';
      g2d.fillStyle = '#facc15';
      g2d.font = '900 18px "Segoe UI", sans-serif';
      g2d.fillText(`🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`, width - 26, 35);
      g2d.restore();

      // Maze Floor
      g2d.fillStyle = '#1e293b';
      g2d.fillRect(offsetX, offsetY, boardW, boardH);

      // Draw Breadcrumbs & Stars
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          const cx = offsetX + (c + 0.5) * cellSize;
          const cy = offsetY + (r + 0.5) * cellSize;

          if (cell.crumb) {
            g2d.fillStyle = hero.trailColor;
            g2d.beginPath();
            g2d.arc(cx, cy, cellSize * 0.14, 0, Math.PI * 2);
            g2d.fill();
          }

          if (cell.star) {
            g2d.fillStyle = '#facc15';
            g2d.font = `${Math.floor(cellSize * 0.42)}px sans-serif`;
            g2d.textAlign = 'center';
            g2d.textBaseline = 'middle';
            g2d.fillText('⭐', cx, cy);
          }
        }
      }

      // Draw Hint Path if enabled
      if (showHint && hintPath.length > 1) {
        g2d.save();
        g2d.strokeStyle = 'rgba(250, 204, 21, 0.78)';
        g2d.lineWidth = Math.max(4, cellSize * 0.14);
        g2d.setLineDash([8, 6]);
        g2d.lineCap = 'round';
        g2d.lineJoin = 'round';
        g2d.beginPath();
        hintPath.forEach((pt, idx) => {
          const hx = offsetX + (pt.c + 0.5) * cellSize;
          const hy = offsetY + (pt.r + 0.5) * cellSize;
          if (idx === 0) g2d.moveTo(hx, hy);
          else g2d.lineTo(hx, hy);
        });
        g2d.stroke();
        g2d.restore();
      }

      // Draw Maze Walls (3D Neon Stone Hedge Style)
      g2d.strokeStyle = '#38bdf8';
      g2d.lineWidth = 4;
      g2d.lineCap = 'round';
      g2d.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;
          if (cell.top) {
            g2d.moveTo(x, y);
            g2d.lineTo(x + cellSize, y);
          }
          if (cell.right) {
            g2d.moveTo(x + cellSize, y);
            g2d.lineTo(x + cellSize, y + cellSize);
          }
          if (cell.bottom) {
            g2d.moveTo(x, y + cellSize);
            g2d.lineTo(x + cellSize, y + cellSize);
          }
          if (cell.left) {
            g2d.moveTo(x, y);
            g2d.lineTo(x, y + cellSize);
          }
        }
      }
      g2d.stroke();

      // Draw Princess at Goal Cell (rows - 1, cols - 1)
      const goalX = offsetX + (cols - 0.5) * cellSize;
      const goalY = offsetY + (rows - 0.5) * cellSize;
      drawPrincessGoal(goalX, goalY, cellSize);

      // Draw Patrol Drones (Hard Mode)
      drones.forEach((d) => {
        const dx = offsetX + (d.visC + 0.5) * cellSize;
        const dy = offsetY + (d.visR + 0.5) * cellSize;
        g2d.save();
        g2d.translate(dx, dy);
        g2d.fillStyle = '#ef4444';
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 2;
        g2d.beginPath();
        g2d.arc(0, 0, cellSize * 0.28, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
        g2d.fillStyle = '#fef08a';
        g2d.beginPath();
        g2d.arc(0, -2, cellSize * 0.1, 0, Math.PI * 2);
        g2d.fill();
        g2d.restore();
      });

      // Draw Player Superhero
      const px = offsetX + (player.visC + 0.5) * cellSize;
      const py = offsetY + (player.visR + 0.5) * cellSize;
      drawSuperhero(px, py, cellSize, hero);

      // Particles & Popups
      particles.forEach((pt) => {
        g2d.fillStyle = pt.color;
        g2d.beginPath();
        g2d.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        g2d.fill();
      });

      popups.forEach((pp) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, pp.alpha);
        g2d.fillStyle = pp.color;
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 3;
        g2d.font = '800 16px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.strokeText(pp.text, pp.x, pp.y);
        g2d.fillText(pp.text, pp.x, pp.y);
        g2d.restore();
      });

      if (isGameOver) {
        g2d.fillStyle = 'rgba(7, 11, 20, 0.84)';
        g2d.fillRect(0, 0, width, height);
        g2d.fillStyle = '#facc15';
        g2d.font = '800 28px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText('🦸 SIÊU NHÂN ĐÃ HẾT NĂNG LƯỢNG!', width / 2, height / 2 - 20);
        g2d.fillStyle = '#38bdf8';
        g2d.font = '700 18px "Segoe UI", sans-serif';
        g2d.fillText(
          `Điểm của bé: ${score.toLocaleString('vi-VN')} (Màn ${level}) — Bấm vào màn hình để chơi lại!`,
          width / 2,
          height / 2 + 20
        );
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
      updateGame(dt);
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
