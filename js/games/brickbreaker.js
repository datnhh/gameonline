(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const DIFFICULTY_CFG = {
    easy: {
      label: 'DỄ',
      paddleWidth: 148,
      ballSpeed: 360,
      lives: 5,
      dropChance: 0.36,
      scoreMult: 1
    },
    hard: {
      label: 'KHÓ',
      paddleWidth: 104,
      ballSpeed: 470,
      lives: 3,
      dropChance: 0.25,
      scoreMult: 1.5
    }
  };

  const BRICK_THEMES = [
    { fill: '#f43f5e', border: '#fda4af', pts: 20 },
    { fill: '#fb923c', border: '#fed7aa', pts: 25 },
    { fill: '#facc15', border: '#fef08a', pts: 30 },
    { fill: '#22c55e', border: '#bbf7d0', pts: 35 },
    { fill: '#38bdf8', border: '#bae6fd', pts: 40 },
    { fill: '#a855f7', border: '#e9d5ff', pts: 50 }
  ];

  const POWERUP_TYPES = [
    { id: 'wide', label: '↔️ VÁN RỘNG', color: '#38bdf8' },
    { id: 'multiball', label: '🔮 X3 BÓNG', color: '#a855f7' },
    { id: 'laser', label: '⚡ SÚNG LASER', color: '#facc15' },
    { id: 'life', label: '❤️ +1 MẠNG', color: '#f43f5e' }
  ];

  function createBrickBreakerGame(container, ctx) {
    const W = 840;
    const H = 520;
    const PADDLE_Y = 472;
    const PADDLE_H = 18;
    const BALL_R = 9;

    let difficulty = 'easy';
    let level = 1;
    let score = 0;
    let lives = 5;
    let isGameOver = false;
    let isPaused = false;
    let shakeTimer = 0;
    let levelClearPending = false;
    let animId = null;
    let lastTime = performance.now();

    let paddle = {
      x: W / 2,
      w: DIFFICULTY_CFG.easy.paddleWidth,
      wideTimer: 0,
      laserTimer: 0,
      laserCooldown: 0
    };

    let balls = [];
    let bricks = [];
    let powerUps = [];
    let lasers = [];
    let stars = [];

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const sparks = fx.createParticles(420);
    const camShake = fx.createShake(7);
    let sceneTime = 0;
    let overlayT = 0;
    // Skips redraws once the pause panel has settled (the scene is frozen while paused)
    const idleGate = fx.createIdleGate();
    let overlayKey = '';
    let levelBannerT = 10;
    let levelBannerBonus = 0;
    let lifeLostT = 10;
    let keys = { left: false, right: false };

    for (let i = 0; i < 55; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1 + Math.random() * 2,
        alpha: 0.25 + Math.random() * 0.65
      });
    }

    container.innerHTML = `
      <div class="game-shell">
        <div class="game-toolbar">
          <div class="toolbar-group">
            <span style="font-weight:700;color:#94a3b8;font-size:0.82rem;">Chế độ:</span>
            <button type="button" class="pill-btn active" data-diff="easy">🌱 Dễ (Ván Rộng • 5 Tim)</button>
            <button type="button" class="pill-btn" data-diff="hard">🔥 Khó (Tốc Độ Cao • 3 Tim)</button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="pill-btn" id="bbPauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
            <span id="bbStatusText" style="font-size:0.82rem;color:#facc15;font-weight:700;">Bấm Chuột hoặc Phím Space để phóng bóng!</span>
          </div>
        </div>
        <div class="canvas-frame">
          <canvas id="brickCanvas" class="game-canvas" width="${W}" height="${H}"></canvas>
        </div>
        <div class="touch-controls">
          <div class="touch-cluster">
            <button type="button" class="touch-btn" id="bbLeftBtn">◀ Sang Trái</button>
            <button type="button" class="touch-btn" id="bbRightBtn">Sang Phải ▶</button>
          </div>
          <div class="touch-cluster">
            <button type="button" class="touch-btn" id="bbLaunchBtn" style="background:linear-gradient(135deg,#0284c7,#4f46e5);">🚀 PHÓNG BÓNG</button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#brickCanvas');
    const hidpi = fx.setupHiDPICanvas(canvas, W, H);
    const g = hidpi.g;
    const statusText = container.querySelector('#bbStatusText');
    const pauseBtn = container.querySelector('#bbPauseBtn');
    const diffBtns = container.querySelectorAll('[data-diff]');

    function resetBallOnPaddle() {
      balls = [
        {
          x: paddle.x,
          y: PADDLE_Y - BALL_R - 2,
          vx: 0,
          vy: 0,
          stuck: true,
          trail: []
        }
      ];
    }

    function launchStuckBalls() {
      if (isGameOver) {
        startNewGame();
        return;
      }
      if (isPaused) return;
      const spd = DIFFICULTY_CFG[difficulty].ballSpeed;
      let launched = false;
      balls.forEach((b) => {
        if (b.stuck) {
          b.stuck = false;
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
          b.vx = Math.cos(angle) * spd;
          b.vy = Math.sin(angle) * spd;
          launched = true;
        }
      });
      if (launched) {
        ArcadeHub.sound.shoot();
      }
    }

    function buildBricksForLevel(lvl) {
      bricks = [];
      const rows = Math.min(7, 4 + Math.floor((lvl - 1) / 2));
      const cols = 10;
      const padX = 52;
      const padTop = 64;
      const gap = 8;
      const bw = Math.floor((W - padX * 2 - gap * (cols - 1)) / cols);
      const bh = 26;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Pattern variations by level
          if (lvl % 3 === 2 && (r + c) % 4 === 0) continue;
          if (lvl % 3 === 0 && c === 4 && r > 0 && r < rows - 1) continue;

          const themeIdx = (r + lvl - 1) % BRICK_THEMES.length;
          const hp = difficulty === 'hard' && r === 0 ? 2 : 1;
          const hasStar = (r === 1 && (c === 2 || c === cols - 3));

          bricks.push({
            x: padX + c * (bw + gap),
            y: padTop + r * (bh + gap),
            w: bw,
            h: bh,
            hp,
            maxHp: hp,
            theme: BRICK_THEMES[themeIdx],
            hasStar
          });
        }
      }
    }

    function startNewGame() {
      const cfg = DIFFICULTY_CFG[difficulty];
      score = 0;
      level = 1;
      lives = cfg.lives;
      isGameOver = false;
      isPaused = false;
      shakeTimer = 0;
      levelClearPending = false;
      syncPauseBtn();
      sparks.clear();
      camShake.reset();
      levelBannerT = 10;
      lifeLostT = 10;
      ctx.updateScore(0);
      paddle.x = W / 2;
      paddle.w = cfg.paddleWidth;
      paddle.wideTimer = 0;
      paddle.laserTimer = 0;
      powerUps = [];
      lasers = [];
      buildBricksForLevel(level);
      resetBallOnPaddle();
      updateStatusUI();
    }

    function updateStatusUI() {
      if (!statusText) return;
      statusText.textContent = `Màn ${level} • Mạng: ${'❤️'.repeat(Math.max(0, lives))} • Còn ${bricks.length} viên gạch`;
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

    function applyPowerUp(typeId) {
      const cfg = DIFFICULTY_CFG[difficulty];
      ArcadeHub.sound.boost();
      if (typeId === 'wide') {
        paddle.wideTimer = 12;
        paddle.w = Math.round(cfg.paddleWidth * 1.45);
      } else if (typeId === 'laser') {
        paddle.laserTimer = 10;
      } else if (typeId === 'life') {
        lives = Math.min(7, lives + 1);
        updateStatusUI();
      } else if (typeId === 'multiball') {
        const base = balls[0];
        if (base) {
          if (base.stuck) launchStuckBalls();
          const spd = cfg.ballSpeed;
          [-0.42, 0.42].forEach((offset) => {
            const ang = -Math.PI / 2 + offset;
            balls.push({
              x: base.x,
              y: base.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              stuck: false
            });
          });
        }
      }
    }

    function hitBrick(index) {
      const br = bricks[index];
      br.hp--;
      br.flashAt = sceneTime;
      if (br.hp > 0) {
        ArcadeHub.sound.tile();
        spawnBurst(br.x + br.w / 2, br.y + br.h / 2, '#f8fafc', 5);
        return;
      }

      const cfg = DIFFICULTY_CFG[difficulty];
      const pts = Math.round((br.theme.pts + (br.hasStar ? 50 : 0)) * cfg.scoreMult);
      score += pts;
      shakeTimer = 0.14;
      camShake.add(br.hasStar ? 0.32 : 0.18);
      ctx.updateScore(score);
      spawnBurst(br.x + br.w / 2, br.y + br.h / 2, br.theme.fill, 12);
      ArcadeHub.sound.explosion();

      if (Math.random() < cfg.dropChance || br.hasStar) {
        const pType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerUps.push({
          x: br.x + br.w / 2,
          y: br.y + br.h / 2,
          vy: 145,
          type: pType
        });
      }

      bricks.splice(index, 1);
      updateStatusUI();

      if (bricks.length === 0) {
        // Defer the level transition: hitBrick runs inside the laser/ball loops,
        // and replacing those arrays mid-iteration crashes the game loop.
        levelClearPending = true;
      }
    }

    function completeLevel() {
      levelClearPending = false;
      const cfg = DIFFICULTY_CFG[difficulty];
      const levelBonus = Math.round(250 * cfg.scoreMult);
      score += levelBonus;
      ctx.updateScore(score);
      ArcadeHub.sound.win();
      level++;
      powerUps = [];
      lasers = [];
      buildBricksForLevel(level);
      resetBallOnPaddle();
      updateStatusUI();
      levelBannerT = 0;
      levelBannerBonus = levelBonus;
      sparks.burst(W / 2, H * 0.4, {
        count: 60,
        kind: 'confetti',
        speed: [160, 380],
        life: [0.9, 1.6],
        size: [4, 7],
        gravity: 320,
        drag: 1.1,
        colors: BRICK_THEMES.map((t) => t.fill).concat(['#ffffff'])
      });
    }

    function update(dt) {
      if (isGameOver || isPaused) return;
      if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - dt);

      const cfg = DIFFICULTY_CFG[difficulty];
      const moveSpeed = 560;
      if (keys.left) paddle.x -= moveSpeed * dt;
      if (keys.right) paddle.x += moveSpeed * dt;
      paddle.x = Math.max(paddle.w / 2 + 12, Math.min(W - paddle.w / 2 - 12, paddle.x));

      // Timers
      if (paddle.wideTimer > 0) {
        paddle.wideTimer -= dt;
        if (paddle.wideTimer <= 0) {
          paddle.w = cfg.paddleWidth;
        }
      }

      if (paddle.laserTimer > 0) {
        paddle.laserTimer -= dt;
        paddle.laserCooldown -= dt;
        if (paddle.laserCooldown <= 0) {
          paddle.laserCooldown = 0.36;
          lasers.push({ x: paddle.x - paddle.w / 2 + 10, y: PADDLE_Y - 6, vy: -520 });
          lasers.push({ x: paddle.x + paddle.w / 2 - 10, y: PADDLE_Y - 6, vy: -520 });
          ArcadeHub.sound.shoot();
        }
      }

      // Update lasers
      for (let i = lasers.length - 1; i >= 0; i--) {
        const ls = lasers[i];
        ls.y += ls.vy * dt;
        if (ls.y < 0) {
          lasers.splice(i, 1);
          continue;
        }
        let hit = false;
        for (let bIdx = bricks.length - 1; bIdx >= 0; bIdx--) {
          const br = bricks[bIdx];
          if (ls.x >= br.x && ls.x <= br.x + br.w && ls.y >= br.y && ls.y <= br.y + br.h) {
            hitBrick(bIdx);
            hit = true;
            break;
          }
        }
        if (hit) lasers.splice(i, 1);
      }
      if (levelClearPending) completeLevel();

      // Update balls
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        if (b.stuck) {
          b.x = paddle.x;
          b.y = PADDLE_Y - BALL_R - 2;
          continue;
        }

        if (!b.trail) b.trail = [];
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 7) b.trail.shift();

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Walls
        if (b.x - BALL_R <= 10) {
          b.x = 10 + BALL_R;
          b.vx = Math.abs(b.vx);
          ArcadeHub.sound.move();
        } else if (b.x + BALL_R >= W - 10) {
          b.x = W - 10 - BALL_R;
          b.vx = -Math.abs(b.vx);
          ArcadeHub.sound.move();
        }
        if (b.y - BALL_R <= 10) {
          b.y = 10 + BALL_R;
          b.vy = Math.abs(b.vy);
          ArcadeHub.sound.move();
        }

        // Paddle collision
        if (
          b.vy > 0 &&
          b.y + BALL_R >= PADDLE_Y &&
          b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
          b.x >= paddle.x - paddle.w / 2 - 4 &&
          b.x <= paddle.x + paddle.w / 2 + 4
        ) {
          const rel = (b.x - paddle.x) / (paddle.w / 2);
          const bounceAngle = rel * 1.08; // up to ~62 deg from vertical
          const spd = cfg.ballSpeed * (1 + Math.min(0.25, (level - 1) * 0.04));
          b.vx = Math.sin(bounceAngle) * spd;
          b.vy = -Math.cos(bounceAngle) * spd;
          b.y = PADDLE_Y - BALL_R - 1;
          ArcadeHub.sound.tile();
        }

        // Brick collisions
        for (let bIdx = bricks.length - 1; bIdx >= 0; bIdx--) {
          const br = bricks[bIdx];
          const closestX = Math.max(br.x, Math.min(b.x, br.x + br.w));
          const closestY = Math.max(br.y, Math.min(b.y, br.y + br.h));
          const dx = b.x - closestX;
          const dy = b.y - closestY;

          if (dx * dx + dy * dy <= BALL_R * BALL_R) {
            if (Math.abs(dx) > Math.abs(dy)) {
              b.vx = -b.vx;
            } else {
              b.vy = -b.vy;
            }
            hitBrick(bIdx);
            break;
          }
        }

        // Bottom out
        if (b.y - BALL_R > H) {
          balls.splice(i, 1);
        }
      }
      if (levelClearPending) completeLevel();

      if (balls.length === 0) {
        lives--;
        lifeLostT = 0;
        camShake.add(0.5);
        updateStatusUI();
        if (lives <= 0) {
          isGameOver = true;
          ArcadeHub.sound.gameOver();
          ctx.submitHighScore(score, `Màn ${level} (${DIFFICULTY_CFG[difficulty].label})`);
        } else {
          ArcadeHub.sound.error();
          resetBallOnPaddle();
        }
      }

      // Power-ups falling
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.y += pu.vy * dt;
        if (
          pu.y + 12 >= PADDLE_Y &&
          pu.y - 12 <= PADDLE_Y + PADDLE_H &&
          pu.x >= paddle.x - paddle.w / 2 - 14 &&
          pu.x <= paddle.x + paddle.w / 2 + 14
        ) {
          applyPowerUp(pu.type.id);
          powerUps.splice(i, 1);
          continue;
        }
        if (pu.y > H + 20) {
          powerUps.splice(i, 1);
        }
      }
    }

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    function spawnBurst(x, y, color, count) {
      sparks.burst(x, y, {
        count,
        speed: [60, 220],
        life: [0.35, 0.7],
        size: [2, 4],
        colors: [color, '#ffffff']
      });
      if (count >= 10) {
        // Brick shards with gravity
        sparks.burst(x, y, {
          count: Math.round(count * 0.6),
          kind: 'confetti',
          speed: [90, 240],
          life: [0.6, 1.0],
          size: [4, 8],
          gravity: 620,
          drag: 0.6,
          colors: [color, fx.shade(color, -0.25)]
        });
        sparks.ring(x, y, { from: 6, to: 46, color, life: 0.35 });
      }
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      sparks.update(dt);
      camShake.update(dt);
      if (levelBannerT < 10) levelBannerT += dt;
      if (lifeLostT < 10) lifeLostT += dt;
      if (!isGameOver && paddle.laserTimer > 0 && Math.random() < 0.5) {
        sparks.spawn({
          kind: 'dot',
          x: paddle.x + (Math.random() - 0.5) * paddle.w * 0.6,
          y: PADDLE_Y + PADDLE_H + 2,
          vx: (Math.random() - 0.5) * 20,
          vy: 60 + Math.random() * 60,
          life: 0.3,
          size: 2.5,
          endSize: 0.5,
          color: '#facc15'
        });
      }
    }

    function drawHeart(x, y, s, empty) {
      g.save();
      g.translate(x, y);
      g.scale(s / 20, s / 20);
      g.beginPath();
      g.moveTo(0, 6);
      g.bezierCurveTo(-12, -2, -10, -14, 0, -7);
      g.bezierCurveTo(10, -14, 12, -2, 0, 6);
      g.closePath();
      g.fillStyle = empty ? 'rgba(148, 163, 184, 0.25)' : '#f43f5e';
      g.fill();
      if (!empty) {
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.beginPath();
        g.ellipse(-4.5, -6, 2.4, 1.6, -0.6, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }

    function drawStarShape(cx, cy, r, fill) {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    }

    function drawBackdrop() {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#05060f');
      grad.addColorStop(0.6, '#140f35');
      grad.addColorStop(1, '#1e1b4b');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);

      // Nebula clouds
      fx.glow(g, W * 0.78, H * 0.28, 260, '#7c3aed', 0.22);
      fx.glow(g, W * 0.2, H * 0.6, 220, '#0ea5e9', 0.16);
      fx.glow(g, W * 0.55, H * 0.85, 200, '#db2777', 0.12);

      // Twinkling stars (two parallax depths)
      stars.forEach((s, idx) => {
        const tw = 0.6 + 0.4 * Math.sin(sceneTime * (1 + (idx % 5) * 0.4) + idx);
        const drift = idx % 2 === 0 ? sceneTime * 4 : sceneTime * 9;
        const sy = (s.y + drift) % H;
        g.fillStyle = `rgba(255,255,255,${s.alpha * tw})`;
        g.fillRect(s.x, sy, s.r, s.r);
      });

      // Ringed planet in the corner
      const plX = 96;
      const plY = H - 70;
      fx.glow(g, plX, plY, 120, '#38bdf8', 0.18);
      const plGrad = g.createRadialGradient(plX - 20, plY - 22, 6, plX, plY, 58);
      plGrad.addColorStop(0, '#93c5fd');
      plGrad.addColorStop(0.6, '#4f46e5');
      plGrad.addColorStop(1, '#1e1b4b');
      g.save();
      g.globalAlpha = 0.75;
      g.strokeStyle = 'rgba(196, 181, 253, 0.55)';
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(plX, plY, 92, 18, -0.25, Math.PI, Math.PI * 2);
      g.stroke();
      g.fillStyle = plGrad;
      g.beginPath();
      g.arc(plX, plY, 56, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(plX, plY, 92, 18, -0.25, 0, Math.PI);
      g.stroke();
      g.restore();

      // Force-field walls
      g.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(10, H);
      g.lineTo(10, 10);
      g.lineTo(W - 10, 10);
      g.lineTo(W - 10, H);
      g.stroke();
    }

    function drawBrick(br) {
      const t = br.theme;
      const x = br.x;
      const y = br.y;
      const flash = br.flashAt != null ? Math.max(0, 1 - (sceneTime - br.flashAt) / 0.18) : 0;
      // Body gradient
      const bg = g.createLinearGradient(0, y, 0, y + br.h);
      bg.addColorStop(0, fx.shade(t.fill, 0.25));
      bg.addColorStop(0.55, t.fill);
      bg.addColorStop(1, fx.shade(t.fill, -0.35));
      fx.roundRectPath(g, x, y, br.w, br.h, 6);
      g.fillStyle = bg;
      g.fill();
      // Bevel highlights
      g.fillStyle = 'rgba(255, 255, 255, 0.32)';
      fx.roundRectPath(g, x + 4, y + 3, br.w - 8, 5, 2.5);
      g.fill();
      g.fillStyle = 'rgba(0, 0, 0, 0.22)';
      g.fillRect(x + 4, y + br.h - 5, br.w - 8, 2);
      // Outline
      fx.roundRectPath(g, x, y, br.w, br.h, 6);
      g.strokeStyle = br.maxHp > 1 ? '#e2e8f0' : t.border;
      g.lineWidth = br.maxHp > 1 ? 2.6 : 1.4;
      g.stroke();
      if (br.maxHp > 1) {
        // Armoured brick: rivets, cracks once damaged
        g.fillStyle = '#e2e8f0';
        [
          [x + 6, y + br.h / 2],
          [x + br.w - 6, y + br.h / 2]
        ].forEach(([rx, ry]) => {
          g.beginPath();
          g.arc(rx, ry, 2.2, 0, Math.PI * 2);
          g.fill();
        });
        if (br.hp < br.maxHp) {
          g.strokeStyle = 'rgba(15, 23, 42, 0.75)';
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(x + br.w * 0.35, y + 2);
          g.lineTo(x + br.w * 0.45, y + br.h * 0.45);
          g.lineTo(x + br.w * 0.38, y + br.h * 0.7);
          g.lineTo(x + br.w * 0.5, y + br.h - 2);
          g.moveTo(x + br.w * 0.45, y + br.h * 0.45);
          g.lineTo(x + br.w * 0.62, y + br.h * 0.35);
          g.stroke();
        }
      }
      if (br.hasStar) {
        fx.glow(g, x + br.w / 2, y + br.h / 2, 26, '#fde047', 0.35 + Math.sin(sceneTime * 5) * 0.12);
        drawStarShape(x + br.w / 2, y + br.h / 2 + 1, 8.5, '#fef08a');
        drawStarShape(x + br.w / 2, y + br.h / 2 + 1, 4, '#ffffff');
      }
      if (flash > 0) {
        fx.roundRectPath(g, x, y, br.w, br.h, 6);
        g.fillStyle = `rgba(255, 255, 255, ${flash * 0.7})`;
        g.fill();
      }
    }

    function drawPowerUpIcon(id, cx, cy) {
      g.save();
      g.translate(cx, cy);
      g.fillStyle = '#0b1220';
      g.strokeStyle = '#0b1220';
      g.lineWidth = 2.2;
      g.lineCap = 'round';
      if (id === 'wide') {
        g.beginPath();
        g.moveTo(-7, 0);
        g.lineTo(7, 0);
        g.moveTo(-7, 0);
        g.lineTo(-3, -4);
        g.moveTo(-7, 0);
        g.lineTo(-3, 4);
        g.moveTo(7, 0);
        g.lineTo(3, -4);
        g.moveTo(7, 0);
        g.lineTo(3, 4);
        g.stroke();
      } else if (id === 'multiball') {
        [
          [-4, 2],
          [4, 2],
          [0, -4]
        ].forEach(([bx, by]) => {
          g.beginPath();
          g.arc(bx, by, 3, 0, Math.PI * 2);
          g.fill();
        });
      } else if (id === 'laser') {
        g.beginPath();
        g.moveTo(2, -7);
        g.lineTo(-4, 1);
        g.lineTo(0, 1);
        g.lineTo(-2, 7);
        g.lineTo(4, -1);
        g.lineTo(0, -1);
        g.closePath();
        g.fill();
      } else {
        g.restore();
        drawHeart(cx, cy + 1, 15, false);
        return;
      }
      g.restore();
    }

    function drawPowerUp(pu) {
      const id = pu.type.id;
      const label = pu.type.label.replace(/^\S+\s/, '');
      g.save();
      fx.glow(g, pu.x, pu.y, 40, pu.type.color, 0.35);
      fx.roundRectPath(g, pu.x - 46, pu.y - 13, 92, 26, 13);
      const cg = g.createLinearGradient(0, pu.y - 13, 0, pu.y + 13);
      cg.addColorStop(0, fx.shade(pu.type.color, 0.35));
      cg.addColorStop(1, fx.shade(pu.type.color, -0.15));
      g.fillStyle = cg;
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.stroke();
      // Moving shine
      g.save();
      g.clip();
      const shineX = pu.x - 60 + ((sceneTime * 120) % 140);
      g.fillStyle = 'rgba(255, 255, 255, 0.35)';
      g.beginPath();
      g.moveTo(shineX, pu.y - 14);
      g.lineTo(shineX + 10, pu.y - 14);
      g.lineTo(shineX - 2, pu.y + 14);
      g.lineTo(shineX - 12, pu.y + 14);
      g.closePath();
      g.fill();
      g.restore();
      // Icon bubble + label
      g.fillStyle = 'rgba(255, 255, 255, 0.85)';
      g.beginPath();
      g.arc(pu.x - 32, pu.y, 9.5, 0, Math.PI * 2);
      g.fill();
      drawPowerUpIcon(id, pu.x - 32, pu.y);
      g.fillStyle = '#0b1220';
      g.font = fx.font(10.5, 900);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, pu.x + 8, pu.y + 1);
      g.restore();
    }

    function drawPaddle() {
      const px = paddle.x - paddle.w / 2;
      const wide = paddle.wideTimer > 0;
      // Engine flames
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const ex of [px + paddle.w * 0.25, px + paddle.w * 0.75]) {
        const fl = 10 + Math.sin(sceneTime * 30 + ex) * 3;
        const fg = g.createLinearGradient(0, PADDLE_Y + PADDLE_H, 0, PADDLE_Y + PADDLE_H + fl);
        fg.addColorStop(0, 'rgba(125, 211, 252, 0.9)');
        fg.addColorStop(1, 'rgba(56, 189, 248, 0)');
        g.fillStyle = fg;
        g.beginPath();
        g.moveTo(ex - 6, PADDLE_Y + PADDLE_H - 2);
        g.lineTo(ex + 6, PADDLE_Y + PADDLE_H - 2);
        g.lineTo(ex, PADDLE_Y + PADDLE_H + fl);
        g.closePath();
        g.fill();
      }
      g.restore();
      fx.glow(g, paddle.x, PADDLE_Y + PADDLE_H / 2, paddle.w * 0.7, wide ? '#22d3ee' : '#38bdf8', 0.22);

      const pGrad = g.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
      pGrad.addColorStop(0, '#e0f2fe');
      pGrad.addColorStop(0.35, wide ? '#22d3ee' : '#38bdf8');
      pGrad.addColorStop(1, '#1d4ed8');
      g.fillStyle = pGrad;
      g.strokeStyle = '#0b1220';
      g.lineWidth = 2;
      fx.roundRectPath(g, px, PADDLE_Y, paddle.w, PADDLE_H, 9);
      g.fill();
      g.stroke();
      // Cockpit dome
      g.fillStyle = 'rgba(15, 23, 42, 0.85)';
      g.beginPath();
      g.ellipse(paddle.x, PADDLE_Y + 3, 14, 7, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = 'rgba(125, 211, 252, 0.8)';
      g.beginPath();
      g.ellipse(paddle.x - 4, PADDLE_Y, 4, 2, -0.3, 0, Math.PI * 2);
      g.fill();
      // Running lights
      g.fillStyle = Math.sin(sceneTime * 6) > 0 ? '#f43f5e' : '#4ade80';
      g.fillRect(px + 6, PADDLE_Y + PADDLE_H / 2 - 1.5, 4, 3);
      g.fillRect(px + paddle.w - 10, PADDLE_Y + PADDLE_H / 2 - 1.5, 4, 3);

      if (paddle.laserTimer > 0) {
        g.fillStyle = '#facc15';
        g.strokeStyle = '#0b1220';
        g.lineWidth = 1.5;
        [px + 6, px + paddle.w - 14].forEach((cx) => {
          fx.roundRectPath(g, cx, PADDLE_Y - 8, 8, 9, 2);
          g.fill();
          g.stroke();
          fx.glow(g, cx + 4, PADDLE_Y - 8, 10, '#facc15', 0.6);
        });
      }
    }

    function drawBall(b) {
      if (b.trail && b.trail.length > 1) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        b.trail.forEach((pt, idx) => {
          const ratio = (idx + 1) / b.trail.length;
          g.globalAlpha = ratio * 0.4;
          g.fillStyle = '#fb923c';
          g.beginPath();
          g.arc(pt.x, pt.y, BALL_R * ratio * 0.9, 0, Math.PI * 2);
          g.fill();
        });
        g.restore();
      }
      fx.glow(g, b.x, b.y, BALL_R * 3.2, '#fb923c', 0.45);
      const bGrad = g.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BALL_R);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.45, '#fef08a');
      bGrad.addColorStop(1, '#f97316');
      g.fillStyle = bGrad;
      g.beginPath();
      g.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      g.fill();
    }

    function drawHud() {
      const cfg = DIFFICULTY_CFG[difficulty];
      fx.roundRectPath(g, 18, 14, W - 36, 36, 12);
      g.fillStyle = 'rgba(5, 6, 15, 0.7)';
      g.fill();
      g.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      g.lineWidth = 1.5;
      g.stroke();
      fx.outlinedText(g, `🪐 HÀNH TINH ${level}`, 32, 33, { size: 15, color: '#7dd3fc', align: 'left' });
      g.fillStyle = '#cbd5e1';
      g.font = fx.font(12, 700);
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(`Còn ${bricks.length} viên`, 190, 33);

      // Active power-up timers
      let tx = 300;
      [
        [paddle.wideTimer, 12, '#38bdf8', 'VÁN RỘNG'],
        [paddle.laserTimer, 10, '#facc15', 'LASER']
      ].forEach(([tLeft, total, col, name]) => {
        if (tLeft <= 0) return;
        g.fillStyle = col;
        g.font = fx.font(11, 800);
        g.fillText(name, tx, 28);
        fx.roundRectPath(g, tx, 36, 72, 5, 2.5);
        g.fillStyle = 'rgba(148, 163, 184, 0.25)';
        g.fill();
        fx.roundRectPath(g, tx, 36, 72 * Math.max(0, tLeft / total), 5, 2.5);
        g.fillStyle = col;
        g.fill();
        tx += 92;
      });

      const maxShown = Math.max(cfg.lives, lives);
      for (let i = 0; i < maxShown; i++) {
        drawHeart(W - 36 - i * 22, 33, 17, i >= lives);
      }
    }

    function render() {
      hidpi.apply();
      drawBackdrop();

      g.save();
      camShake.apply(g);

      bricks.forEach(drawBrick);
      powerUps.forEach(drawPowerUp);

      // Lasers: glowing beams
      g.save();
      g.globalCompositeOperation = 'lighter';
      lasers.forEach((ls) => {
        g.fillStyle = 'rgba(250, 204, 21, 0.35)';
        g.fillRect(ls.x - 4, ls.y - 12, 8, 24);
        g.fillStyle = '#fef9c3';
        g.fillRect(ls.x - 1.5, ls.y - 10, 3, 20);
      });
      g.restore();

      drawPaddle();
      balls.forEach(drawBall);
      sparks.draw(g);
      g.restore();

      drawHud();

      // Launch hint while the ball sits on the paddle
      if (!isGameOver && !isPaused && balls.some((b) => b.stuck)) {
        g.save();
        g.globalAlpha = 0.65 + Math.sin(sceneTime * 4) * 0.3;
        fx.outlinedText(g, 'Bấm chuột / Space để phóng bóng', W / 2, PADDLE_Y - 46, { size: 15, color: '#fde68a' });
        g.restore();
      }

      if (lifeLostT < 0.6) {
        fx.vignette(g, W, H, 0, `rgba(244, 63, 94, ${(1 - lifeLostT / 0.6) * 0.75})`);
      }
      if (lifeLostT < 1.4 && !isGameOver) {
        fx.drawBanner(g, W, H, '💥 MẤT 1 MẠNG!', { t: lifeLostT, duration: 1.4, accent: '#f43f5e', size: 30, y: H * 0.55 });
      }
      if (levelBannerT < 1.9 && !isGameOver) {
        fx.drawBanner(g, W, H, `🚀 GIẢI CỨU HÀNH TINH ${level - 1}!`, {
          t: levelBannerT,
          duration: 1.9,
          accent: '#38bdf8',
          sub: `+${levelBannerBonus} điểm • Bay tới hành tinh ${level}`,
          size: 34
        });
      }

      const overlay = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (overlay !== overlayKey) {
        overlayKey = overlay;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g, W, H, {
          icon: '🛸',
          title: 'HẾT LƯỢT BẢO VỆ!',
          subtitle: 'Phi thuyền cần nạp năng lượng — cất cánh lại nhé.',
          lines: [
            `Điểm của bạn|${score.toLocaleString('vi-VN')}`,
            `Đạt hành tinh|${level}`,
            `Chế độ|${DIFFICULTY_CFG[difficulty].label}`
          ],
          hint: 'Bấm chuột hoặc nhấn Phóng Bóng để chơi lại',
          accent: '#38bdf8',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g, W, H, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để giải cứu hành tinh.',
          accent: '#38bdf8',
          t: overlayT,
          backdrop: 0.55
        });
      }
    }

    function setPaddleFromEvent(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const x = ((clientX - rect.left) / rect.width) * W;
      paddle.x = Math.max(paddle.w / 2 + 12, Math.min(W - paddle.w / 2 - 12, x));
    }

    function onMouseMove(evt) {
      setPaddleFromEvent(evt);
    }

    function onMouseDown() {
      launchStuckBalls();
    }

    function onTouchStart(evt) {
      evt.preventDefault();
      setPaddleFromEvent(evt);
      launchStuckBalls();
    }

    function onTouchMove(evt) {
      evt.preventDefault();
      setPaddleFromEvent(evt);
    }

    function onKeyDown(evt) {
      if (evt.key === 'ArrowLeft' || evt.key === 'a' || evt.key === 'A') {
        keys.left = true;
      } else if (evt.key === 'ArrowRight' || evt.key === 'd' || evt.key === 'D') {
        keys.right = true;
      } else if (evt.key === ' ' || evt.key === 'ArrowUp' || evt.key === 'Enter') {
        evt.preventDefault();
        launchStuckBalls();
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
    global.addEventListener('keydown', onKeyDown);
    global.addEventListener('keyup', onKeyUp);

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
        startNewGame();
      });
    });

    const leftBtn = container.querySelector('#bbLeftBtn');
    const rightBtn = container.querySelector('#bbRightBtn');
    const launchBtn = container.querySelector('#bbLaunchBtn');

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

    bindHold(leftBtn, 'left');
    bindHold(rightBtn, 'right');
    if (launchBtn) launchBtn.addEventListener('click', launchStuckBalls);

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (idleGate.shouldSkip(isPaused && !isGameOver && overlayKey === 'pause' && overlayT >= 0.6, canvas, now)) {
        animId = requestAnimationFrame(loop);
        return;
      }
      updatePresentation(dt);
      update(dt);
      render();
      animId = requestAnimationFrame(loop);
    }

    startNewGame();
    animId = requestAnimationFrame(loop);

    return {
      restart() {
        startNewGame();
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

  ArcadeHub.games.brickbreaker = {
    init(container, ctx) {
      return createBrickBreakerGame(container, ctx);
    }
  };
})(window);
