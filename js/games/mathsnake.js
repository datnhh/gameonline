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
    let animId = null;
    let lastTime = performance.now();
    let stepTimer = 0;

    let snake = [];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let question = { text: '2 + 3 = ?', answer: 5 };
    let apples = []; // { x, y, value, isCorrect, colorIdx }
    let floatingTexts = [];
    let particles = [];

    container.innerHTML = `
      <div class="game-shell">
        <div class="game-toolbar">
          <div class="toolbar-group">
            <span style="font-weight:700;color:#94a3b8;font-size:0.82rem;">Chế độ:</span>
            <button type="button" class="pill-btn active" data-diff="easy">🌱 Dễ (Cộng Trừ ≤ 10 • Xuyên Tường)</button>
            <button type="button" class="pill-btn" data-diff="hard">🔥 Khó (Cộng Trừ Nhân • Tường Đá)</button>
          </div>
          <div class="toolbar-group">
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
    const g = canvas.getContext('2d');
    const promptBadge = container.querySelector('#msPromptBadge');
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
    }

    function startNewGame() {
      const cfg = DIFFICULTY_CFG[difficulty];
      score = 0;
      streak = 0;
      lives = cfg.lives;
      isGameOver = false;
      stepTimer = 0;
      ctx.updateScore(0);

      snake = [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 }
      ];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      floatingTexts = [];
      particles = [];
      spawnQuestionAndApples();
    }

    function spawnBurst(px, py, color) {
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 140;
        particles.push({
          x: px,
          y: py,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color,
          life: 0.5
        });
      }
    }

    function loseLife(reasonText) {
      lives--;
      streak = 0;
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
          // Bounce direction back inside
          nextDir = { x: -dir.x, y: -dir.y };
          dir = { x: nextDir.x, y: nextDir.y };
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
      if (isGameOver) return;

      const cfg = DIFFICULTY_CFG[difficulty];
      stepTimer += dt;
      if (stepTimer >= cfg.stepInterval) {
        stepTimer -= cfg.stepInterval;
        stepSnake();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 35 * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }
    }

    function render() {
      // Top math banner
      g.fillStyle = '#0f172a';
      g.fillRect(0, 0, W, HEADER_H);

      g.fillStyle = '#1e293b';
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 2.5;
      g.beginPath();
      g.roundRect(W / 2 - 155, 10, 310, 48, 12);
      g.fill();
      g.stroke();

      g.fillStyle = '#facc15';
      g.font = '900 26px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`🍎 ${question.text}`, W / 2, 35);

      g.textAlign = 'left';
      g.fillStyle = '#f43f5e';
      g.font = '800 16px sans-serif';
      g.fillText(`Mạng: ${'❤️'.repeat(Math.max(0, lives))}`, 18, 35);

      g.textAlign = 'right';
      g.fillStyle = '#4ade80';
      g.fillText(`Chuỗi đúng: ${streak} 🔥`, W - 18, 35);

      // Checkerboard grassy playfield
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          g.fillStyle = (r + c) % 2 === 0 ? '#064e3b' : '#065f46';
          g.fillRect(c * CELL, HEADER_H + r * CELL, CELL, CELL);
        }
      }

      // Hard mode stone border indicator
      if (!DIFFICULTY_CFG[difficulty].wrapWalls) {
        g.strokeStyle = '#ef4444';
        g.lineWidth = 5;
        g.strokeRect(2.5, HEADER_H + 2.5, W - 5, ROWS * CELL - 5);
      }

      // Draw Apples with big numbers
      apples.forEach((ap) => {
        const cx = ap.x * CELL + CELL / 2;
        const cy = HEADER_H + ap.y * CELL + CELL / 2;
        const pal = APPLE_PALETTE[ap.colorIdx];

        g.save();
        g.translate(cx, cy);

        // Leaf
        g.fillStyle = '#4ade80';
        g.beginPath();
        g.ellipse(4, -15, 6, 3, -0.4, 0, Math.PI * 2);
        g.fill();

        // Apple body
        g.fillStyle = pal.fill;
        g.strokeStyle = pal.stroke;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(0, 1, 16, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Number inside apple
        g.fillStyle = '#ffffff';
        g.font = '900 16px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(ap.value), 0, 2);

        g.restore();
      });

      // Draw Dragon Snake
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const cx = seg.x * CELL + CELL / 2;
        const cy = HEADER_H + seg.y * CELL + CELL / 2;

        g.save();
        g.translate(cx, cy);

        if (i === 0) {
          // Dragon Head
          g.fillStyle = '#22c55e';
          g.strokeStyle = '#fef08a';
          g.lineWidth = 2.5;
          g.beginPath();
          g.arc(0, 0, 18, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Cute dragon horns
          g.fillStyle = '#facc15';
          g.beginPath();
          g.arc(-8, -14, 4, 0, Math.PI * 2);
          g.arc(8, -14, 4, 0, Math.PI * 2);
          g.fill();

          // Eyes
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(-6, -3, 4.5, 0, Math.PI * 2);
          g.arc(6, -3, 4.5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#090d16';
          g.beginPath();
          g.arc(-6 + dir.x * 1.5, -3 + dir.y * 1.5, 2.2, 0, Math.PI * 2);
          g.arc(6 + dir.x * 1.5, -3 + dir.y * 1.5, 2.2, 0, Math.PI * 2);
          g.fill();
        } else {
          const ratio = 1 - (i / (snake.length + 4)) * 0.35;
          g.fillStyle = i % 2 === 0 ? '#4ade80' : '#16a34a';
          g.strokeStyle = '#052e16';
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(0, 0, 15 * ratio, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
        g.restore();
      }

      // Particles
      particles.forEach((p) => {
        g.save();
        g.globalAlpha = Math.max(0, p.life * 2);
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, 4, 0, Math.PI * 2);
        g.fill();
        g.restore();
      });

      // Floating texts
      floatingTexts.forEach((ft) => {
        g.save();
        g.globalAlpha = Math.min(1, ft.life);
        g.font = '900 18px sans-serif';
        g.fillStyle = ft.color;
        g.textAlign = 'center';
        g.fillText(ft.text, ft.x, ft.y);
        g.restore();
      });

      if (isGameOver) {
        g.fillStyle = 'rgba(9, 13, 22, 0.84)';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#facc15';
        g.font = '900 32px sans-serif';
        g.textAlign = 'center';
        g.fillText('KẾT THÚC HÀNH TRÌNH SĂN TÁO!', W / 2, H / 2 - 28);
        g.fillStyle = '#f8fafc';
        g.font = '700 20px sans-serif';
        g.fillText(`Tổng điểm: ${score}`, W / 2, H / 2 + 12);
        g.fillStyle = '#38bdf8';
        g.font = '700 16px sans-serif';
        g.fillText('Bấm vào màn hình hoặc nhấn Chơi Lại để bắt đầu ván mới', W / 2, H / 2 + 50);
      }
    }

    function setDirection(nx, ny) {
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
      }
    };
  }

  ArcadeHub.games.mathsnake = {
    init(container, ctx) {
      return createMathSnakeGame(container, ctx);
    }
  };
})(window);
