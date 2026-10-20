(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const DIFFICULTY_CFG = {
    easy: {
      label: 'DỄ',
      stepInterval: 0.23,
      wrapWalls: true,
      lives: 5,
      scoreMult: 1
    },
    hard: {
      label: 'KHÓ',
      stepInterval: 0.15,
      wrapWalls: false,
      lives: 3,
      scoreMult: 1.5
    }
  };

  const APPLE_PALETTE = [
    { fill: '#ef4444', stroke: '#fecaca' },
    { fill: '#f59e0b', stroke: '#fde68a' },
    { fill: '#a855f7', stroke: '#e9d5ff' }
  ];

  function createMathSnakeGame(container, ctx) {
    const COLS = 18;
    const ROWS = 11;
    const CELL = 42;
    const HEADER_H = 68;
    const W = COLS * CELL; // 756
    const H = ROWS * CELL + HEADER_H; // 530

    let difficulty = 'easy';
    let score = 0;
    let streak = 0;
    let lives = 5;
    let isGameOver = false;
    let isPaused = false;
    let animId = null;
    let lastTime = performance.now();
    let stepTimer = 0;
    let wingPhase = 0;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let question = { text: '2 + 3 = ?', answer: 5 };
    let apples = []; // { x, y, value, isCorrect, colorIdx }
    let floatingTexts = [];

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(260);
    const camShake = fx.createShake(6);
    let prevSnake = [];
    let sceneTime = 0;
    let overlayT = 0;
    let overlayKey = '';
    let hurtT = 10;
    let questionT = 10;

    container.innerHTML = `
      <div class="game-shell">
        <div class="game-toolbar">
          <div class="toolbar-group">
            <span style="font-weight:700;color:#94a3b8;font-size:0.82rem;">Chế độ:</span>
            <button type="button" class="pill-btn active" data-diff="easy">🌱 Dễ (Cộng Trừ ≤ 10 • Xuyên Tường)</button>
            <button type="button" class="pill-btn" data-diff="hard">🔥 Khó (Cộng Trừ Nhân • Tường Đá)</button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="pill-btn" id="msPauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
            <span id="msPromptBadge" style="font-size:0.9rem;color:#facc15;font-weight:800;">🐉 Điều khiển Rồng Con ăn quả táo có kết quả đúng!</span>
          </div>
        </div>
        <div class="canvas-frame">
          <canvas id="mathSnakeCanvas" class="game-canvas" width="${W}" height="${H}"></canvas>
        </div>
        <div class="touch-controls">
          <div class="touch-cluster">
            <button type="button" class="touch-btn" data-dir="left">◀ Trái</button>
            <button type="button" class="touch-btn" data-dir="up">▲ Lên</button>
            <button type="button" class="touch-btn" data-dir="down">▼ Xuống</button>
            <button type="button" class="touch-btn" data-dir="right">Phải ▶</button>
          </div>
          <div class="touch-cluster">
            <span style="font-size:0.8rem;color:#cbd5e1;">Mẹo: Bấm trực tiếp vào ô trên sân để Rồng tự rẽ hướng!</span>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#mathSnakeCanvas');
    const hidpi = fx.setupHiDPICanvas(canvas, W, H);
    const g = hidpi.g;
    const promptBadge = container.querySelector('#msPromptBadge');
    const pauseBtn = container.querySelector('#msPauseBtn');
    const diffBtns = container.querySelectorAll('[data-diff]');

    function generateMathQuestion() {
      if (difficulty === 'easy') {
        const isAdd = Math.random() < 0.6;
        if (isAdd) {
          const a = 1 + Math.floor(Math.random() * 6);
          const b = 1 + Math.floor(Math.random() * (10 - a));
          return { text: `${a} + ${b} = ?`, answer: a + b };
        } else {
          const a = 3 + Math.floor(Math.random() * 8);
          const b = 1 + Math.floor(Math.random() * (a - 1));
          return { text: `${a} - ${b} = ?`, answer: a - b };
        }
      } else {
        const roll = Math.random();
        if (roll < 0.4) {
          const a = 4 + Math.floor(Math.random() * 14);
          const b = 3 + Math.floor(Math.random() * 12);
          return { text: `${a} + ${b} = ?`, answer: a + b };
        } else if (roll < 0.72) {
          const a = 10 + Math.floor(Math.random() * 15);
          const b = 2 + Math.floor(Math.random() * (a - 3));
          return { text: `${a} - ${b} = ?`, answer: a - b };
        } else {
          const a = 2 + Math.floor(Math.random() * 8);
          const b = 2 + Math.floor(Math.random() * 6);
          return { text: `${a} × ${b} = ?`, answer: a * b };
        }
      }
    }

    function isCellOccupied(cx, cy) {
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === cx && snake[i].y === cy) return true;
      }
      for (let i = 0; i < apples.length; i++) {
        if (apples[i].x === cx && apples[i].y === cy) return true;
      }
      // Keep 2 cells in front of dragon head free on spawn
      if (snake.length > 0) {
        const dist = Math.abs(snake[0].x - cx) + Math.abs(snake[0].y - cy);
        if (dist <= 2) return true;
      }
      return false;
    }

    function spawnQuestionAndApples() {
      question = generateMathQuestion();
      apples = [];

      const usedValues = new Set([question.answer]);
      const values = [question.answer];

      while (values.length < 3) {
        const delta = (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
        const candidate = Math.max(0, question.answer + delta);
        if (!usedValues.has(candidate)) {
          usedValues.add(candidate);
          values.push(candidate);
        }
      }

      values.forEach((val, idx) => {
        let tries = 0;
        let gx = 2;
        let gy = 2;
        do {
          gx = 1 + Math.floor(Math.random() * (COLS - 2));
          gy = 1 + Math.floor(Math.random() * (ROWS - 2));
          tries++;
        } while (isCellOccupied(gx, gy) && tries < 80);

        apples.push({
          x: gx,
          y: gy,
          value: val,
          isCorrect: idx === 0,
          colorIdx: idx % APPLE_PALETTE.length
        });
      });

      if (promptBadge) {
        promptBadge.textContent = `🧮 Phép tính: ${question.text} • Chuỗi đúng: ${streak} 🔥`;
      }
      questionT = 0;
    }

    function startNewGame() {
      const cfg = DIFFICULTY_CFG[difficulty];
      score = 0;
      streak = 0;
      lives = cfg.lives;
      isGameOver = false;
      isPaused = false;
      syncPauseBtn();
      stepTimer = 0;
      sparks.clear();
      camShake.reset();
      hurtT = 10;
      ctx.updateScore(0);

      snake = [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 }
      ];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      floatingTexts = [];
      prevSnake = snake.map((p) => ({ x: p.x, y: p.y }));
      spawnQuestionAndApples();
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
      syncPauseBtn();
    }

    function spawnBurst(px, py, color) {
      sparks.burst(px, py, { count: 14, speed: [45, 185], life: [0.4, 0.7], size: [2.5, 5], colors: [color, '#ffffff'] });
      sparks.ring(px, py, { from: 6, to: 40, color, life: 0.4 });
    }

    function loseLife(reasonText) {
      lives--;
      streak = 0;
      hurtT = 0;
      camShake.add(0.45);
      ArcadeHub.sound.error();
      const head = snake[0];
      const px = head.x * CELL + CELL / 2;
      const py = HEADER_H + head.y * CELL + CELL / 2;

      floatingTexts.push({
        x: Math.max(90, Math.min(W - 90, px)),
        y: Math.max(HEADER_H + 30, py),
        text: reasonText,
        color: '#f43f5e',
        life: 1.2
      });

      if (lives <= 0) {
        isGameOver = true;
        ArcadeHub.sound.gameOver();
        ctx.submitHighScore(score, `Chuỗi ${streak} • ${DIFFICULTY_CFG[difficulty].label}`);
      }
    }

    function stepSnake() {
      const cfg = DIFFICULTY_CFG[difficulty];
      dir = { x: nextDir.x, y: nextDir.y };

      let nx = snake[0].x + dir.x;
      let ny = snake[0].y + dir.y;

      if (cfg.wrapWalls) {
        if (nx < 0) nx = COLS - 1;
        if (nx >= COLS) nx = 0;
        if (ny < 0) ny = ROWS - 1;
        if (ny >= ROWS) ny = 0;
      } else {
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
          loseLife('💥 Đụng tường đá! -1 ❤️');
          if (!isGameOver) {
            const len = Math.min(snake.length, 5);
            snake = Array.from({ length: len }, (_, idx) => ({ x: 6 - idx, y: 5 }));
            prevSnake = snake.map((p) => ({ x: p.x, y: p.y }));
            dir = { x: 1, y: 0 };
            nextDir = { x: 1, y: 0 };
          }
          return;
        }
      }

      // Check self collision (ignoring tail tip)
      for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === nx && snake[i].y === ny) {
          loseLife('💥 Chạm đuôi! -1 ❤️');
          if (snake.length > 3) snake.splice(3);
          return;
        }
      }

      snake.unshift({ x: nx, y: ny });

      // Check apple collision
      let ateCorrect = false;
      for (let i = apples.length - 1; i >= 0; i--) {
        const ap = apples[i];
        if (ap.x === nx && ap.y === ny) {
          const px = nx * CELL + CELL / 2;
          const py = HEADER_H + ny * CELL + CELL / 2;

          if (ap.isCorrect) {
            ateCorrect = true;
            streak++;
            const gained = Math.round((50 + Math.min(50, streak * 10)) * cfg.scoreMult);
            score += gained;
            ctx.updateScore(score);
            ArcadeHub.sound.win();
            spawnBurst(px, py, '#4ade80');
            sparks.burst(px, py, {
              count: 18,
              kind: 'confetti',
              speed: [100, 260],
              life: [0.7, 1.2],
              size: [4, 7],
              gravity: 300,
              drag: 1.2,
              colors: ['#facc15', '#4ade80', '#38bdf8', '#f472b6']
            });
            floatingTexts.push({
              x: px,
              y: py,
              text: `ĐÚNG RỒI! +${gained}`,
              color: '#4ade80',
              life: 1.1
            });
            spawnQuestionAndApples();
          } else {
            apples.splice(i, 1);
            spawnBurst(px, py, '#f43f5e');
            loseLife(`SAI RỒI (${ap.value})! -1 ❤️`);
          }
          break;
        }
      }

      if (!ateCorrect) {
        snake.pop();
      } else if (snake.length > 14) {
        // Keep dragon manageable for kids
        snake.pop();
      }
    }

    function update(dt) {
      if (isGameOver || isPaused) return;
      wingPhase += dt * 10;

      const cfg = DIFFICULTY_CFG[difficulty];
      stepTimer += dt;
      if (stepTimer >= cfg.stepInterval) {
        stepTimer -= cfg.stepInterval;
        prevSnake = snake.map((p) => ({ x: p.x, y: p.y }));
        stepSnake();
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 35 * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }
    }

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      sparks.update(dt);
      camShake.update(dt);
      if (hurtT < 10) hurtT += dt;
      if (questionT < 10) questionT += dt;
    }

    function cellCenter(p) {
      return { x: p.x * CELL + CELL / 2, y: HEADER_H + p.y * CELL + CELL / 2 };
    }

    // Smoothly interpolated segment positions between the previous and current grid step
    function getVisualSegments() {
      const cfg = DIFFICULTY_CFG[difficulty];
      const t = isGameOver ? 1 : Math.max(0, Math.min(1, stepTimer / cfg.stepInterval));
      const e = t * t * (3 - 2 * t);
      return snake.map((seg, i) => {
        const cur = cellCenter(seg);
        const prevSeg = prevSnake.length ? prevSnake[Math.min(i, prevSnake.length - 1)] : seg;
        const prev = cellCenter(prevSeg);
        // Wrapping through a wall: snap instead of sliding across the whole board
        if (Math.abs(prevSeg.x - seg.x) + Math.abs(prevSeg.y - seg.y) > 1) return { x: cur.x, y: cur.y, jump: true };
        return { x: prev.x + (cur.x - prev.x) * e, y: prev.y + (cur.y - prev.y) * e, jump: false };
      });
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

    function drawField() {
      const cfg = DIFFICULTY_CFG[difficulty];
      // Meadow checkerboard
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          g.fillStyle = (r + c) % 2 === 0 ? '#166534' : '#15803d';
          g.fillRect(c * CELL, HEADER_H + r * CELL, CELL, CELL);
        }
      }
      // Soft light from the top-left
      const light = g.createLinearGradient(0, HEADER_H, W, H);
      light.addColorStop(0, 'rgba(254, 249, 195, 0.12)');
      light.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
      g.fillStyle = light;
      g.fillRect(0, HEADER_H, W, ROWS * CELL);
      // Grass tufts and tiny flowers (fixed pattern)
      for (let k = 0; k < 40; k++) {
        const fxp = ((k * 97.13) % COLS) * CELL + ((k * 13) % CELL);
        const fyp = HEADER_H + ((k * 53.7) % ROWS) * CELL + ((k * 29) % CELL);
        g.strokeStyle = 'rgba(74, 222, 128, 0.45)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(fxp - 3, fyp);
        g.lineTo(fxp - 4, fyp - 5);
        g.moveTo(fxp, fyp);
        g.lineTo(fxp, fyp - 6);
        g.moveTo(fxp + 3, fyp);
        g.lineTo(fxp + 4, fyp - 5);
        g.stroke();
        if (k % 4 === 0) {
          g.fillStyle = k % 8 === 0 ? 'rgba(253, 224, 71, 0.8)' : 'rgba(255, 255, 255, 0.75)';
          g.beginPath();
          g.arc(fxp + 6, fyp - 6, 2, 0, Math.PI * 2);
          g.fill();
        }
      }
      if (!cfg.wrapWalls) {
        // Stone wall border for hard mode
        const top = HEADER_H;
        const bottom = HEADER_H + ROWS * CELL;
        g.fillStyle = '#57534e';
        g.strokeStyle = '#1c1917';
        g.lineWidth = 1.5;
        const stones = [];
        for (let x = 0; x < W; x += 18) stones.push([x, top], [x, bottom - 7]);
        for (let y = top + 7; y < bottom - 7; y += 18) stones.push([0, y], [W - 7, y]);
        stones.forEach(([sx, sy], idx) => {
          const horizontal = sy === top || sy === bottom - 7;
          fx.roundRectPath(g, sx, sy, horizontal ? 16 : 7, horizontal ? 7 : 16, 3);
          g.fillStyle = idx % 3 === 0 ? '#78716c' : '#57534e';
          g.fill();
          g.stroke();
        });
        // Red warning glow on the inside edge
        g.strokeStyle = `rgba(239, 68, 68, ${0.25 + Math.sin(sceneTime * 3) * 0.1})`;
        g.lineWidth = 2;
        g.strokeRect(8, top + 8, W - 16, ROWS * CELL - 16);
      } else {
        // Easy mode: shimmering portal edges show you can pass through
        g.strokeStyle = `rgba(125, 211, 252, ${0.35 + Math.sin(sceneTime * 2.5) * 0.15})`;
        g.lineWidth = 3;
        g.setLineDash([10, 8]);
        g.lineDashOffset = -sceneTime * 24;
        g.strokeRect(1.5, HEADER_H + 1.5, W - 3, ROWS * CELL - 3);
        g.setLineDash([]);
      }
    }

    function drawApple(ap, idx) {
      const c = cellCenter(ap);
      const pal = APPLE_PALETTE[ap.colorIdx];
      const appear = Math.min(1, questionT / 0.35);
      const scale = reduced ? 1 : fx.ease.outBack(appear);
      const bob = reduced ? 0 : Math.sin(sceneTime * 3 + idx * 1.7) * 2;
      g.save();
      g.translate(c.x, c.y + bob);
      g.scale(scale, scale);
      fx.contactShadow(g, 0, 17 - bob, 13, 4, 0.3);
      // Stem + leaf
      g.strokeStyle = '#713f12';
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, -13);
      g.quadraticCurveTo(1, -18, 3, -20);
      g.stroke();
      g.fillStyle = '#4ade80';
      g.beginPath();
      g.ellipse(7, -17, 6.5, 3.2, -0.5, 0, Math.PI * 2);
      g.fill();
      // Body with two lobes
      const body = g.createRadialGradient(-5, -5, 2, 0, 1, 18);
      body.addColorStop(0, fx.shade(pal.fill, 0.35));
      body.addColorStop(0.6, pal.fill);
      body.addColorStop(1, fx.shade(pal.fill, -0.35));
      g.fillStyle = body;
      g.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -11);
      g.bezierCurveTo(10, -18, 20, -6, 15, 6);
      g.bezierCurveTo(12, 15, 4, 18, 0, 15);
      g.bezierCurveTo(-4, 18, -12, 15, -15, 6);
      g.bezierCurveTo(-20, -6, -10, -18, 0, -11);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.45)';
      g.beginPath();
      g.ellipse(-7, -5, 3.5, 5.5, 0.4, 0, Math.PI * 2);
      g.fill();
      fx.outlinedText(g, String(ap.value), 0, 3, { size: ap.value >= 100 ? 13 : 16, color: '#ffffff', outline: 3.5 });
      g.restore();
    }

    function drawDragon(vis) {
      if (!vis.length) return;
      // Body path (broken where the dragon wraps through a wall)
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const passes = [
        [30, '#052e16'],
        [26, '#16a34a'],
        [14, '#4ade80']
      ];
      passes.forEach(([lw, col]) => {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        vis.forEach((p, i) => {
          if (i === 0 || p.jump || (vis[i - 1] && Math.hypot(p.x - vis[i - 1].x, p.y - vis[i - 1].y) > CELL * 1.5)) {
            g.moveTo(p.x, p.y);
          } else {
            g.lineTo(p.x, p.y);
          }
        });
        g.stroke();
      });
      g.restore();

      // Belly scales + back spikes
      for (let i = vis.length - 1; i >= 1; i--) {
        const p = vis[i];
        const ratio = 1 - (i / (vis.length + 4)) * 0.35;
        g.fillStyle = 'rgba(254, 240, 138, 0.85)';
        g.beginPath();
        g.ellipse(p.x, p.y + 2, 6 * ratio, 4 * ratio, 0, 0, Math.PI * 2);
        g.fill();
        if (i % 2 === 1) {
          g.fillStyle = '#f97316';
          g.beginPath();
          g.moveTo(p.x - 4, p.y - 10 * ratio);
          g.lineTo(p.x, p.y - 17 * ratio);
          g.lineTo(p.x + 4, p.y - 10 * ratio);
          g.closePath();
          g.fill();
        }
      }

      // Wings on the shoulder segment
      if (vis.length > 1) {
        const sh = vis[1];
        const flap = Math.sin(wingPhase) * 0.5;
        g.save();
        g.translate(sh.x, sh.y);
        [-1, 1].forEach((side) => {
          g.save();
          g.scale(side, 1);
          g.rotate(-0.4 + flap * 0.4);
          g.fillStyle = 'rgba(253, 224, 71, 0.95)';
          g.strokeStyle = '#a16207';
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(4, -4);
          g.quadraticCurveTo(22, -26, 26, -6);
          g.quadraticCurveTo(18, -8, 16, 0);
          g.quadraticCurveTo(10, -4, 4, -4);
          g.closePath();
          g.fill();
          g.stroke();
          g.restore();
        });
        g.restore();
      }

      // Head, rotated to face the travel direction
      const h = vis[0];
      const ang = Math.atan2(dir.y, dir.x);
      g.save();
      g.translate(h.x, h.y);
      g.rotate(ang);
      // Horns
      g.fillStyle = '#facc15';
      g.strokeStyle = '#a16207';
      g.lineWidth = 1.5;
      [-1, 1].forEach((side) => {
        g.beginPath();
        g.moveTo(-6, side * 10);
        g.lineTo(-16, side * 17);
        g.lineTo(-3, side * 14);
        g.closePath();
        g.fill();
        g.stroke();
      });
      const headGrad = g.createRadialGradient(4, -5, 2, 0, 0, 20);
      headGrad.addColorStop(0, '#86efac');
      headGrad.addColorStop(1, '#16a34a');
      g.fillStyle = headGrad;
      g.strokeStyle = '#052e16';
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(2, 0, 19, 16, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // Snout + nostrils
      g.fillStyle = '#4ade80';
      g.beginPath();
      g.ellipse(14, 0, 8, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#052e16';
      g.beginPath();
      g.arc(18, -3, 1.4, 0, Math.PI * 2);
      g.arc(18, 3, 1.4, 0, Math.PI * 2);
      g.fill();
      // Eyes (look forward)
      [-1, 1].forEach((side) => {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(4, side * 7, 5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#0b1220';
        g.beginPath();
        g.arc(6, side * 7, 2.6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(6.8, side * 7 - 1.2, 1, 0, Math.PI * 2);
        g.fill();
      });
      g.restore();
      // Little fire puff right after a correct answer
      if (questionT < 0.45 && score > 0 && streak > 0) {
        const k = questionT / 0.45;
        fx.glow(g, h.x + Math.cos(ang) * (22 + k * 18), h.y + Math.sin(ang) * (22 + k * 18), 16 * (1 - k) + 4, '#f97316', 0.8 * (1 - k));
      }
    }

    function drawHeader() {
      const cfg = DIFFICULTY_CFG[difficulty];
      const hg = g.createLinearGradient(0, 0, 0, HEADER_H);
      hg.addColorStop(0, '#0f172a');
      hg.addColorStop(1, '#1e293b');
      g.fillStyle = hg;
      g.fillRect(0, 0, W, HEADER_H);
      g.fillStyle = 'rgba(56, 189, 248, 0.35)';
      g.fillRect(0, HEADER_H - 2, W, 2);

      // Question card (pops when a new question arrives)
      const pop = reduced ? 1 : 1 + Math.max(0, 1 - questionT / 0.35) * 0.12;
      g.save();
      g.translate(W / 2, 35);
      g.scale(pop, pop);
      fx.roundRectPath(g, -160, -24, 320, 48, 14);
      const qg = g.createLinearGradient(0, -24, 0, 24);
      qg.addColorStop(0, '#312e81');
      qg.addColorStop(1, '#1e1b4b');
      g.fillStyle = qg;
      g.fill();
      g.strokeStyle = '#facc15';
      g.lineWidth = 2.5;
      g.stroke();
      fx.outlinedText(g, `🍎 ${question.text}`, 0, 1, { size: 26, color: '#fde047' });
      g.restore();

      for (let i = 0; i < cfg.lives; i++) {
        drawHeart(26 + i * 24, 35, 19, i >= lives);
      }

      const hot = streak >= 3;
      fx.outlinedText(g, `🔥 ${streak}`, W - 22, 26, {
        size: hot && !reduced ? 20 + Math.sin(sceneTime * 8) * 1.5 : 20,
        color: hot ? '#fb923c' : '#86efac',
        align: 'right',
        glow: hot ? '#f97316' : null
      });
      g.fillStyle = '#94a3b8';
      g.font = fx.font(11, 700);
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      g.fillText('CHUỖI ĐÚNG', W - 22, 50);
    }

    function render() {
      hidpi.apply();
      drawHeader();

      g.save();
      camShake.apply(g);
      drawField();
      apples.forEach(drawApple);
      drawDragon(getVisualSegments());
      sparks.draw(g);
      floatingTexts.forEach((ft) => {
        g.save();
        g.globalAlpha = Math.max(0, Math.min(1, ft.life));
        fx.outlinedText(g, ft.text, ft.x, ft.y, { size: 18, color: ft.color });
        g.restore();
      });
      g.restore();

      if (hurtT < 0.5) {
        g.save();
        g.beginPath();
        g.rect(0, HEADER_H, W, ROWS * CELL);
        g.clip();
        fx.vignette(g, W, H, 0, `rgba(239, 68, 68, ${(1 - hurtT / 0.5) * 0.7})`);
        g.restore();
      }

      const overlay = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (overlay !== overlayKey) {
        overlayKey = overlay;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g, W, H, {
          icon: '🐉',
          title: 'KẾT THÚC HÀNH TRÌNH SĂN TÁO!',
          subtitle: 'Rồng Con đã cố gắng hết sức — thử lại nhé!',
          lines: [`Tổng điểm|${score.toLocaleString('vi-VN')}`, `Chế độ|${DIFFICULTY_CFG[difficulty].label}`],
          hint: 'Bấm vào màn hình hoặc nhấn Chơi Lại để bắt đầu ván mới',
          accent: '#22c55e',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g, W, H, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để Rồng Con bay tiếp.',
          accent: '#22c55e',
          t: overlayT,
          backdrop: 0.55
        });
      }
    }

    function setDirection(nx, ny) {
      if (isPaused) return;
      if (nx === -dir.x && ny === -dir.y) return;
      nextDir = { x: nx, y: ny };
    }

    function steerTowardCanvasPoint(evt) {
      if (isGameOver) {
        startNewGame();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * H;
      if (y < HEADER_H) return;

      const head = snake[0];
      const hx = head.x * CELL + CELL / 2;
      const hy = HEADER_H + head.y * CELL + CELL / 2;
      const dx = x - hx;
      const dy = y - hy;

      if (Math.abs(dx) > Math.abs(dy)) {
        const wantX = dx > 0 ? 1 : -1;
        if (wantX !== -dir.x) {
          setDirection(wantX, 0);
        } else {
          setDirection(0, dy >= 0 ? 1 : -1);
        }
      } else {
        const wantY = dy > 0 ? 1 : -1;
        if (wantY !== -dir.y) {
          setDirection(0, wantY);
        } else {
          setDirection(dx >= 0 ? 1 : -1, 0);
        }
      }
    }

    function onKeyDown(evt) {
      if (evt.key === 'ArrowLeft' || evt.key === 'a' || evt.key === 'A') {
        evt.preventDefault();
        setDirection(-1, 0);
      } else if (evt.key === 'ArrowRight' || evt.key === 'd' || evt.key === 'D') {
        evt.preventDefault();
        setDirection(1, 0);
      } else if (evt.key === 'ArrowUp' || evt.key === 'w' || evt.key === 'W') {
        evt.preventDefault();
        setDirection(0, -1);
      } else if (evt.key === 'ArrowDown' || evt.key === 's' || evt.key === 'S') {
        evt.preventDefault();
        setDirection(0, 1);
      }
    }

    canvas.addEventListener('mousedown', steerTowardCanvasPoint);
    canvas.addEventListener(
      'touchstart',
      (evt) => {
        evt.preventDefault();
        steerTowardCanvasPoint(evt);
      },
      { passive: false }
    );
    global.addEventListener('keydown', onKeyDown);

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

    container.querySelectorAll('[data-dir]').forEach((btn) => {
      const handleDir = (evt) => {
        evt.preventDefault();
        const d = btn.getAttribute('data-dir');
        if (d === 'left') setDirection(-1, 0);
        if (d === 'right') setDirection(1, 0);
        if (d === 'up') setDirection(0, -1);
        if (d === 'down') setDirection(0, 1);
      };
      btn.addEventListener('mousedown', handleDir);
      btn.addEventListener('touchstart', handleDir, { passive: false });
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
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
      }
    };
  }

  ArcadeHub.games.mathsnake = {
    init(container, ctx) {
      return createMathSnakeGame(container, ctx);
    }
  };
})(window);
