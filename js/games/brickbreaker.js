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
    let particles = [];
    let stars = [];
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
            <button type="button" class="pill-btn" id="bbPauseBtn">⏸ Tạm dừng</button>
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
    const g = canvas.getContext('2d');
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
      if (pauseBtn) pauseBtn.textContent = '⏸ Tạm dừng';
      ctx.updateScore(0);
      paddle.x = W / 2;
      paddle.w = cfg.paddleWidth;
      paddle.wideTimer = 0;
      paddle.laserTimer = 0;
      powerUps = [];
      lasers = [];
      particles = [];
      buildBricksForLevel(level);
      resetBallOnPaddle();
      updateStatusUI();
    }

    function updateStatusUI() {
      if (!statusText) return;
      statusText.textContent = `Màn ${level} • Mạng: ${'❤️'.repeat(Math.max(0, lives))} • Còn ${bricks.length} viên gạch`;
    }

    function spawnBurst(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * 170;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color,
          life: 0.45 + Math.random() * 0.25
        });
      }
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
      if (br.hp > 0) {
        ArcadeHub.sound.tile();
        spawnBurst(br.x + br.w / 2, br.y + br.h / 2, '#f8fafc', 5);
        return;
      }

      const cfg = DIFFICULTY_CFG[difficulty];
      const pts = Math.round((br.theme.pts + (br.hasStar ? 50 : 0)) * cfg.scoreMult);
      score += pts;
      shakeTimer = 0.14;
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

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }

    function render() {
      // Cosmic background
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#1e1b4b');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);

      // Stars
      stars.forEach((s) => {
        g.fillStyle = `rgba(255,255,255,${s.alpha})`;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      });

      // Top HUD inside canvas
      g.fillStyle = '#38bdf8';
      g.font = '800 15px sans-serif';
      g.textAlign = 'left';
      g.fillText(`🪐 HÀNH TINH MÀN ${level}`, 24, 34);
      g.textAlign = 'right';
      g.fillStyle = '#f43f5e';
      g.fillText(`MẠNG: ${'❤️'.repeat(Math.max(0, lives))}`, W - 24, 34);

      // Bricks
      bricks.forEach((br) => {
        g.save();
        g.fillStyle = br.theme.fill;
        g.strokeStyle = br.hp > 1 ? '#f8fafc' : br.theme.border;
        g.lineWidth = br.hp > 1 ? 3 : 1.5;
        g.beginPath();
        g.roundRect(br.x, br.y, br.w, br.h, 6);
        g.fill();
        g.stroke();

        // Top gloss
        g.fillStyle = 'rgba(255,255,255,0.28)';
        g.fillRect(br.x + 4, br.y + 3, br.w - 8, 5);

        if (br.hasStar) {
          g.font = '14px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('⭐', br.x + br.w / 2, br.y + br.h / 2 + 1);
        }
        g.restore();
      });

      // Power-ups
      powerUps.forEach((pu) => {
        g.save();
        g.fillStyle = pu.type.color;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2;
        g.beginPath();
        g.roundRect(pu.x - 42, pu.y - 12, 84, 24, 12);
        g.fill();
        g.stroke();
        g.fillStyle = '#090d16';
        g.font = '800 11px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pu.type.label, pu.x, pu.y + 1);
        g.restore();
      });

      // Lasers
      g.fillStyle = '#facc15';
      lasers.forEach((ls) => {
        g.fillRect(ls.x - 2, ls.y - 8, 4, 16);
      });

      // Spaceship Paddle
      g.save();
      const px = paddle.x - paddle.w / 2;
      const pGrad = g.createLinearGradient(px, PADDLE_Y, px, PADDLE_Y + PADDLE_H);
      pGrad.addColorStop(0, '#38bdf8');
      pGrad.addColorStop(1, '#2563eb');
      g.fillStyle = pGrad;
      g.strokeStyle = '#e0f2fe';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(px, PADDLE_Y, paddle.w, PADDLE_H, 9);
      g.fill();
      g.stroke();

      if (paddle.laserTimer > 0) {
        g.fillStyle = '#facc15';
        g.fillRect(px + 6, PADDLE_Y - 6, 8, 6);
        g.fillRect(px + paddle.w - 14, PADDLE_Y - 6, 8, 6);
      }
      g.restore();

      // Balls & Comet Trails
      balls.forEach((b) => {
        if (b.trail && b.trail.length > 1) {
          b.trail.forEach((pt, idx) => {
            const ratio = (idx + 1) / b.trail.length;
            g.save();
            g.globalAlpha = ratio * 0.36;
            g.fillStyle = '#38bdf8';
            g.beginPath();
            g.arc(pt.x, pt.y, BALL_R * ratio * 0.85, 0, Math.PI * 2);
            g.fill();
            g.restore();
          });
        }
        g.save();
        const bGrad = g.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, BALL_R);
        bGrad.addColorStop(0, '#ffffff');
        bGrad.addColorStop(0.5, '#fef08a');
        bGrad.addColorStop(1, '#f97316');
        g.fillStyle = bGrad;
        g.beginPath();
        g.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        g.fill();
        g.restore();
      });

      // Particles
      particles.forEach((p) => {
        g.save();
        g.globalAlpha = Math.max(0, p.life / 0.7);
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        g.fill();
        g.restore();
      });

      if (isPaused && !isGameOver) {
        g.fillStyle = 'rgba(9, 13, 22, 0.78)';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#38bdf8';
        g.font = '900 32px sans-serif';
        g.textAlign = 'center';
        g.fillText('⏸ ĐANG TẠM DỪNG', W / 2, H / 2 - 10);
        g.fillStyle = '#e2e8f0';
        g.font = '700 16px sans-serif';
        g.fillText('Bấm nút Tiếp tục để giải cứu hành tinh!', W / 2, H / 2 + 28);
      }

      if (isGameOver) {
        g.fillStyle = 'rgba(9, 13, 22, 0.82)';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#f43f5e';
        g.font = '900 34px sans-serif';
        g.textAlign = 'center';
        g.fillText('HẾT LƯỢT BẢO VỆ!', W / 2, H / 2 - 28);
        g.fillStyle = '#f8fafc';
        g.font = '700 20px sans-serif';
        g.fillText(`Điểm của bạn: ${score} • Đạt Màn ${level}`, W / 2, H / 2 + 12);
        g.fillStyle = '#facc15';
        g.font = '700 16px sans-serif';
        g.fillText('Bấm chuột hoặc nhấn Phóng Bóng để chơi lại', W / 2, H / 2 + 50);
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
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
        ArcadeHub.sound.click();
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
