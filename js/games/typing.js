(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const WORD_BANK_KIDS = [
    'CA', 'MEO', 'CHO', 'GA', 'VIT', 'BO', 'THO', 'KHI', 'VOI', 'HO',
    'SAO', 'HOA', 'CAY', 'MAY', 'MUA', 'NHA', 'XE', 'TAU', 'KEM', 'SUA',
    'CAT', 'DOG', 'SUN', 'SKY', 'CAR', 'BUS', 'PIG', 'COW', 'BEE', 'ANT',
    'STAR', 'FISH', 'BIRD', 'DUCK', 'BEAR', 'LION', 'FROG', 'MOON', 'TREE', 'BOOK',
    'MILK', 'CAKE', 'BALL', 'SHIP', 'BABY', 'GOLD', 'HERO', 'KING'
  ];

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const BALLOON_COLORS = [
    { main: '#f43f5e', light: '#fda4af', dark: '#be123c' },
    { main: '#3b82f6', light: '#93c5fd', dark: '#1d4ed8' },
    { main: '#10b981', light: '#6ee7b7', dark: '#047857' },
    { main: '#f59e0b', light: '#fde047', dark: '#b45309' },
    { main: '#a855f7', light: '#d8b4fe', dark: '#6d28d9' },
    { main: '#ec4899', light: '#f9a8d4', dark: '#be185d' }
  ];

  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const DIFFICULTY_MODES = {
    easy: {
      label: 'DỄ (Chữ cái đơn A-Z)',
      maxLives: 5,
      fallSpeedBase: 32,
      spawnInterval: 2.3,
      scoreMult: 1.0
    },
    hard: {
      label: 'KHÓ (Từ vựng ngắn x1.6 Điểm)',
      maxLives: 4,
      fallSpeedBase: 44,
      spawnInterval: 2.1,
      scoreMult: 1.6
    }
  };

  function createTypingGame(container, ctx) {
    let width = 920;
    let height = 540;
    let animId = null;
    let lastTime = performance.now();

    let difficulty = 'easy';
    let score = 0;
    let combo = 0;
    let poppedCount = 0;
    let lives = 5;
    let isGameOver = false;
    let isPaused = false;

    let balloons = [];
    let lockedBalloonId = null;
    let lasers = [];
    let confetti = [];
    let popups = [];
    let keyRects = []; // Interactive virtual keyboard keys on Canvas
    let lastPressedKey = '';
    let lastPressedTimer = 0;
    let spawnTimer = 0.5;
    let nextId = 1;

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#94a3b8;font-weight:700;">Chế độ luyện phím:</span>
          <button type="button" class="pill-btn active" data-diff="easy">🟢 Chế độ Dễ (Chữ cái A-Z)</button>
          <button type="button" class="pill-btn" data-diff="hard">🔴 Chế độ Khó (Gõ từ ngắn x1.6 Điểm)</button>
        </div>
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#38bdf8;font-weight:600;">
            ⌨ Gõ phím theo chữ trên bóng bay (Phím cần bấm sẽ sáng màu vàng bên dưới!)
          </span>
          <button type="button" class="pill-btn" id="typPauseBtn">⏸ Tạm dừng</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="typCanvas" class="game-canvas"></canvas>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#typCanvas');
    const g2d = canvas.getContext('2d');
    const pauseBtn = shell.querySelector('#typPauseBtn');

    function getCfg() {
      return DIFFICULTY_MODES[difficulty] || DIFFICULTY_MODES.easy;
    }

    function resetGame() {
      const cfg = getCfg();
      score = 0;
      combo = 0;
      poppedCount = 0;
      lives = cfg.maxLives;
      isGameOver = false;
      isPaused = false;
      balloons = [];
      lockedBalloonId = null;
      lasers = [];
      confetti = [];
      popups = [];
      spawnTimer = 0.4;
      ctx.updateScore(0);
      pauseBtn.textContent = '⏸ Tạm dừng';
    }

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 1020);
      const maxH = Math.max(390, Math.min(window.innerHeight - 200, 560));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnBalloon() {
      const cfg = getCfg();
      let word = '';

      // Avoid duplicate starting letters among active balloons for clearer targeting
      const activeFirstChars = new Set(balloons.map((b) => b.word.charAt(b.typedIndex)));

      if (difficulty === 'easy') {
        const candidates = LETTERS.split('').filter((ch) => !activeFirstChars.has(ch));
        const pool = candidates.length > 0 ? candidates : LETTERS.split('');
        word = pool[Math.floor(Math.random() * pool.length)];
      } else {
        const candidates = WORD_BANK_KIDS.filter((w) => !activeFirstChars.has(w.charAt(0)));
        const pool = candidates.length > 0 ? candidates : WORD_BANK_KIDS;
        word = pool[Math.floor(Math.random() * pool.length)];
      }

      const palette = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
      const speedFactor = 1 + Math.min(0.85, poppedCount * 0.025);

      balloons.push({
        id: nextId++,
        word,
        typedIndex: 0,
        x: 75 + Math.random() * (width - 150),
        y: 52,
        vy: cfg.fallSpeedBase * speedFactor * (0.88 + Math.random() * 0.24),
        swayPhase: Math.random() * Math.PI * 2,
        palette,
        radius: difficulty === 'easy' ? 32 : 38
      });
    }

    function getTargetBalloonForHint() {
      if (lockedBalloonId !== null) {
        const locked = balloons.find((b) => b.id === lockedBalloonId);
        if (locked) return locked;
      }
      if (balloons.length === 0) return null;
      // Pick the balloon closest to the bottom (highest y)
      return balloons.reduce((lowest, cur) => (cur.y > lowest.y ? cur : lowest), balloons[0]);
    }

    function spawnConfetti(x, y, mainColor) {
      const colors = [mainColor, '#facc15', '#38bdf8', '#4ade80', '#ffffff', '#f472b6'];
      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 140;
        confetti.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 35,
          w: 5 + Math.random() * 6,
          h: 4 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 12,
          color: colors[i % colors.length],
          life: 0.55 + Math.random() * 0.35
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
        vy: -40
      });
    }

    function handleCharacterInput(rawChar) {
      if (isGameOver || isPaused) return;
      const ch = String(rawChar || '').toUpperCase();
      if (!/^[A-Z]$/.test(ch)) return;

      lastPressedKey = ch;
      lastPressedTimer = 0.22;

      let target = null;
      if (lockedBalloonId !== null) {
        target = balloons.find((b) => b.id === lockedBalloonId);
        if (!target) lockedBalloonId = null;
      }

      // If locked balloon expects a different char, check if it matches locked balloon first
      if (target) {
        const expected = target.word.charAt(target.typedIndex);
        if (ch !== expected) {
          combo = 0;
          ArcadeHub.sound.error();
          addPopup(target.x, target.y + 42, `Gõ phím "${expected}" nhé!`, '#f43f5e');
          return;
        }
      } else {
        // Find lowest balloon starting with `ch`
        const matching = balloons
          .filter((b) => b.word.charAt(b.typedIndex) === ch)
          .sort((a, b) => b.y - a.y);

        if (matching.length === 0) {
          combo = 0;
          ArcadeHub.sound.error();
          return;
        }
        target = matching[0];
        lockedBalloonId = target.id;
      }

      // Hit correct character!
      target.typedIndex += 1;
      combo += 1;

      // Shoot rainbow star laser from launcher to balloon
      const keyboardTopY = height - 148;
      lasers.push({
        x1: width / 2,
        y1: keyboardTopY - 12,
        x2: target.x,
        y2: target.y,
        color: target.palette.light,
        life: 0.16
      });

      if (target.typedIndex >= target.word.length) {
        // Balloon popped!
        ArcadeHub.sound.win();
        const cfg = getCfg();
        const basePts = target.word.length * 40;
        const comboBonus = Math.min(200, combo * 10);
        const pts = Math.round((basePts + comboBonus) * cfg.scoreMult);
        score += pts;
        poppedCount += 1;
        ctx.updateScore(score);

        spawnConfetti(target.x, target.y, target.palette.main);
        addPopup(target.x, target.y - 10, `🎉 +${pts}`, '#facc15');

        balloons = balloons.filter((b) => b.id !== target.id);
        lockedBalloonId = null;
      } else {
        ArcadeHub.sound.move();
      }
    }

    function updateGame(dt) {
      if (isGameOver || isPaused) return;
      const cfg = getCfg();
      const keyboardTopY = height - 150;

      if (lastPressedTimer > 0) lastPressedTimer -= dt;

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        if (balloons.length < 6) {
          spawnBalloon();
        }
        const interval = Math.max(0.95, cfg.spawnInterval - poppedCount * 0.02);
        spawnTimer = interval;
      }

      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.y += b.vy * dt;
        b.swayPhase += dt * 2.2;
        b.x += Math.sin(b.swayPhase) * 14 * dt;

        // Reached bottom danger line above keyboard
        if (b.y + b.radius >= keyboardTopY - 10) {
          if (lockedBalloonId === b.id) lockedBalloonId = null;
          balloons.splice(i, 1);
          lives -= 1;
          combo = 0;
          ArcadeHub.sound.hit();
          addPopup(b.x, keyboardTopY - 24, '💔 RƠI MẤT BÓNG! -1 TIM', '#f43f5e');

          if (lives <= 0 && !isGameOver) {
            isGameOver = true;
            ArcadeHub.sound.gameOver();
            ctx.submitHighScore(
              score,
              `Chế độ ${cfg.label} • Đã gõ ${poppedCount} bóng`
            );
          }
        }
      }

      for (let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].life -= dt;
        if (lasers[i].life <= 0) lasers.splice(i, 1);
      }

      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 240 * dt;
        c.rot += c.vRot * dt;
        c.life -= dt;
        if (c.life <= 0) confetti.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const pp = popups[i];
        pp.y += pp.vy * dt;
        pp.alpha -= dt * 0.9;
        if (pp.alpha <= 0) popups.splice(i, 1);
      }
    }

    function drawBalloon(b, isHintTarget) {
      g2d.save();
      g2d.translate(b.x, b.y);

      // Balloon String
      g2d.strokeStyle = '#cbd5e1';
      g2d.lineWidth = 1.8;
      g2d.beginPath();
      g2d.moveTo(0, b.radius);
      g2d.quadraticCurveTo(5, b.radius + 14, -2, b.radius + 26);
      g2d.stroke();

      // Target Halo if this is the active/hint balloon
      if (isHintTarget) {
        g2d.strokeStyle = '#facc15';
        g2d.lineWidth = 3;
        g2d.setLineDash([6, 4]);
        g2d.beginPath();
        g2d.arc(0, 0, b.radius + 8, 0, Math.PI * 2);
        g2d.stroke();
        g2d.setLineDash([]);
      }

      // Glossy 3D Balloon Body
      const grad = g2d.createRadialGradient(
        -b.radius * 0.3,
        -b.radius * 0.3,
        4,
        0,
        0,
        b.radius
      );
      grad.addColorStop(0, b.palette.light);
      grad.addColorStop(0.45, b.palette.main);
      grad.addColorStop(1, b.palette.dark);

      g2d.fillStyle = grad;
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2.4;
      g2d.beginPath();
      g2d.ellipse(0, 0, b.radius * 0.92, b.radius * 1.05, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Word / Letter Badge inside Balloon
      const typedPart = b.word.slice(0, b.typedIndex);
      const nextChar = b.word.charAt(b.typedIndex);
      const restPart = b.word.slice(b.typedIndex + 1);

      g2d.font = b.word.length === 1 ? '900 26px "Segoe UI", sans-serif' : '900 19px "Segoe UI", sans-serif';
      g2d.textAlign = 'center';
      g2d.textBaseline = 'middle';

      if (b.word.length === 1) {
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 4;
        g2d.strokeText(b.word, 0, 1);
        g2d.fillStyle = '#ffffff';
        g2d.fillText(b.word, 0, 1);
      } else {
        // Multi-letter word: draw dark pill behind text for high contrast
        const pillW = Math.max(66, b.word.length * 16 + 16);
        g2d.fillStyle = 'rgba(9, 13, 22, 0.78)';
        g2d.beginPath();
        g2d.roundRect(-pillW / 2, -15, pillW, 30, 8);
        g2d.fill();

        const fullText = b.word;
        const charW = 14;
        const startX = -((fullText.length - 1) * charW) / 2;
        for (let i = 0; i < fullText.length; i++) {
          const cx = startX + i * charW;
          if (i < b.typedIndex) {
            g2d.fillStyle = '#4ade80'; // Already typed
          } else if (i === b.typedIndex) {
            g2d.fillStyle = '#facc15'; // Current key to press
          } else {
            g2d.fillStyle = '#ffffff';
          }
          g2d.fillText(fullText.charAt(i), cx, 1);
        }
      }

      g2d.restore();
    }

    function drawVisualKeyboard(expectedChar) {
      keyRects = [];
      const kbHeight = 145;
      const kbTop = height - kbHeight;

      g2d.save();
      g2d.fillStyle = 'rgba(9, 14, 28, 0.94)';
      g2d.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      g2d.lineWidth = 2;
      g2d.fillRect(0, kbTop, width, kbHeight);
      g2d.beginPath();
      g2d.moveTo(0, kbTop);
      g2d.lineTo(width, kbTop);
      g2d.stroke();

      const keyW = Math.min(54, Math.floor((width - 64) / 10.4));
      const keyH = 36;
      const gap = 5;

      KEYBOARD_ROWS.forEach((row, rowIdx) => {
        const rowWidth = row.length * keyW + (row.length - 1) * gap;
        const startX = (width - rowWidth) / 2;
        const y = kbTop + 14 + rowIdx * (keyH + 6);

        row.forEach((letter, colIdx) => {
          const x = startX + colIdx * (keyW + gap);
          const isExpected = letter === expectedChar;
          const isJustPressed = lastPressedTimer > 0 && letter === lastPressedKey;

          keyRects.push({ x, y, w: keyW, h: keyH, letter });

          // Key shadow
          g2d.fillStyle = isExpected ? '#b45309' : '#090d16';
          g2d.beginPath();
          g2d.roundRect(x, y + 3, keyW, keyH, 7);
          g2d.fill();

          // Key cap
          if (isExpected) {
            g2d.fillStyle = '#facc15';
            g2d.strokeStyle = '#ffffff';
            g2d.lineWidth = 2.4;
          } else if (isJustPressed) {
            g2d.fillStyle = '#38bdf8';
            g2d.strokeStyle = '#bae6fd';
            g2d.lineWidth = 2;
          } else {
            g2d.fillStyle = '#1e293b';
            g2d.strokeStyle = '#475569';
            g2d.lineWidth = 1.4;
          }

          const offsetY = isJustPressed ? 2 : 0;
          g2d.beginPath();
          g2d.roundRect(x, y + offsetY, keyW, keyH, 7);
          g2d.fill();
          g2d.stroke();

          g2d.fillStyle = isExpected || isJustPressed ? '#090d16' : '#f8fafc';
          g2d.font = '800 15px "Segoe UI", sans-serif';
          g2d.textAlign = 'center';
          g2d.textBaseline = 'middle';
          g2d.fillText(letter, x + keyW / 2, y + keyH / 2 + offsetY);
        });
      });

      g2d.restore();
    }

    function drawScene() {
      const cfg = getCfg();
      const keyboardTopY = height - 145;

      // Sky background
      const skyGrad = g2d.createLinearGradient(0, 0, 0, keyboardTopY);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.5, '#1e1b4b');
      skyGrad.addColorStop(1, '#312e81');
      g2d.fillStyle = skyGrad;
      g2d.fillRect(0, 0, width, keyboardTopY);

      // Determine hint balloon & expected key
      const hintBalloon = getTargetBalloonForHint();
      const expectedChar = hintBalloon
        ? hintBalloon.word.charAt(hintBalloon.typedIndex)
        : '';

      // Draw Laser Beams
      lasers.forEach((ls) => {
        g2d.save();
        g2d.strokeStyle = ls.color;
        g2d.shadowColor = ls.color;
        g2d.shadowBlur = 12;
        g2d.lineWidth = 5;
        g2d.lineCap = 'round';
        g2d.beginPath();
        g2d.moveTo(ls.x1, ls.y1);
        g2d.lineTo(ls.x2, ls.y2);
        g2d.stroke();
        g2d.restore();
      });

      // Draw Star Turret at bottom center above keyboard
      g2d.save();
      g2d.fillStyle = '#38bdf8';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.arc(width / 2, keyboardTopY, 22, Math.PI, 0);
      g2d.fill();
      g2d.stroke();
      g2d.restore();

      // Draw Balloons
      balloons.forEach((b) => {
        drawBalloon(b, hintBalloon && b.id === hintBalloon.id);
      });

      // Draw Confetti
      confetti.forEach((c) => {
        g2d.save();
        g2d.translate(c.x, c.y);
        g2d.rotate(c.rot);
        g2d.fillStyle = c.color;
        g2d.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        g2d.restore();
      });

      // Draw Popups
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

      // Top HUD inside screen
      g2d.save();
      g2d.fillStyle = 'rgba(9, 13, 24, 0.8)';
      g2d.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      g2d.lineWidth = 1.8;
      g2d.beginPath();
      g2d.roundRect(14, 10, width - 28, 46, 10);
      g2d.fill();
      g2d.stroke();

      g2d.font = '800 17px "Segoe UI", sans-serif';
      g2d.textAlign = 'left';
      const heartsStr = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, cfg.maxLives - lives));
      g2d.fillText(heartsStr, 26, 38);

      g2d.textAlign = 'center';
      g2d.fillStyle = '#facc15';
      g2d.font = '800 15px "Segoe UI", sans-serif';
      g2d.fillText(
        expectedChar
          ? `👉 PHÍM CẦN BẤM TIẾP THEO: [ ${expectedChar} ]  •  Chuỗi Combo: ${combo}`
          : `🎈 Đợi bóng bay xuất hiện...  •  Chuỗi Combo: ${combo}`,
        width / 2,
        38
      );

      g2d.textAlign = 'right';
      g2d.fillStyle = '#4ade80';
      g2d.font = '900 18px "Segoe UI", sans-serif';
      g2d.fillText(`🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`, width - 26, 38);
      g2d.restore();

      // Visual QWERTY Keyboard at the bottom
      drawVisualKeyboard(expectedChar);

      if (isGameOver || isPaused) {
        g2d.fillStyle = 'rgba(7, 11, 20, 0.84)';
        g2d.fillRect(0, 0, width, height);
        g2d.fillStyle = '#facc15';
        g2d.font = '800 30px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText(
          isGameOver ? '🎈 HOÀN THÀNH BÀI TẬP ĐÁNH PHÍM!' : '⏸ ĐANG TẠM DỪNG',
          width / 2,
          height / 2 - 24
        );
        g2d.fillStyle = '#38bdf8';
        g2d.font = '700 18px "Segoe UI", sans-serif';
        g2d.fillText(
          isGameOver
            ? `Điểm của bé: ${score.toLocaleString('vi-VN')} • Đã bắn nổ: ${poppedCount} bóng — Bấm vào màn hình để chơi lại!`
            : 'Bấm nút Tiếp tục để luyện gõ phím tiếp',
          width / 2,
          height / 2 + 18
        );
      }
    }

    function onKeyDown(evt) {
      if (evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (evt.ctrlKey || evt.altKey || evt.metaKey) return;
      if (evt.key && evt.key.length === 1 && /^[a-zA-Z]$/.test(evt.key)) {
        evt.preventDefault();
        handleCharacterInput(evt.key);
      }
    }

    // Allow clicking/touching the visual keyboard on screen as well
    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      if (isGameOver) {
        resetGame();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      for (const k of keyRects) {
        if (px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h) {
          handleCharacterInput(k.letter);
          return;
        }
      }
    });

    shell.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-diff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-diff');
        resetGame();
      });
    });

    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      ArcadeHub.sound.click();
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
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
    resetGame();
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);

    return {
      restart() {
        resetGame();
      },
      destroy() {
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onKeyDown);
      }
    };
  }

  ArcadeHub.games.typing = {
    init: createTypingGame
  };
})(window);
