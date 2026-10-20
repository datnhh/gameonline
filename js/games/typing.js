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
      sparks.clear();
      pops.length = 0;
      wrongTimer = 0;
      lifeLostTimer = 0;
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
          wrongKey = ch;
          wrongTimer = 0.32;
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
          wrongKey = ch;
          wrongTimer = 0.32;
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

      sparks.burst(target.x, target.y, {
        kind: 'star',
        count: 6,
        speed: [60, 180],
        life: [0.25, 0.45],
        size: [2, 3.5],
        colors: ['#fde047', '#ffffff', target.palette.light]
      });

      if (target.typedIndex >= target.word.length) {
        // Balloon popped!
        ArcadeHub.sound.win();
        pops.push({ x: target.x, y: target.y, r: target.radius, color: target.palette.main, t: 0 });
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
          lifeLostTimer = 0.45;
          sparks.burst(b.x, keyboardTopY - 12, {
            kind: 'dot',
            count: 12,
            speed: [60, 200],
            life: [0.3, 0.6],
            gravity: 300,
            colors: [b.palette.main, b.palette.dark]
          });
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

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    const fx = ArcadeHub.fx;
    const sparks = fx.createParticles(360);
    const pops = []; // balloon pop rings { x, y, r, color, t }
    let sceneTime = 0;
    let overlayT = 0;
    let overlayKey = '';
    let wrongKey = '';
    let wrongTimer = 0;
    let lifeLostTimer = 0;
    const clouds = [];
    for (let i = 0; i < 9; i++) {
      clouds.push({
        x: Math.random(),
        y: 0.12 + Math.random() * 0.5,
        s: 0.5 + Math.random() * 0.9,
        speed: 0.006 + Math.random() * 0.012,
        layer: i % 3
      });
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      sparks.update(dt);
      if (wrongTimer > 0) wrongTimer = Math.max(0, wrongTimer - dt);
      if (lifeLostTimer > 0) lifeLostTimer = Math.max(0, lifeLostTimer - dt);
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].t += dt;
        if (pops[i].t > 0.45) pops.splice(i, 1);
      }
    }

    function drawHeart(x, y, size, fill, empty) {
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(size / 20, size / 20);
      g2d.beginPath();
      g2d.moveTo(0, 6);
      g2d.bezierCurveTo(-12, -2, -10, -14, 0, -7);
      g2d.bezierCurveTo(10, -14, 12, -2, 0, 6);
      g2d.closePath();
      if (empty) {
        g2d.fillStyle = 'rgba(15, 23, 42, 0.35)';
        g2d.fill();
        g2d.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        g2d.lineWidth = 1.6;
        g2d.stroke();
      } else {
        const hg = g2d.createLinearGradient(0, -12, 0, 6);
        hg.addColorStop(0, '#fb7185');
        hg.addColorStop(1, fill || '#e11d48');
        g2d.fillStyle = hg;
        g2d.fill();
        g2d.strokeStyle = '#7f1d1d';
        g2d.lineWidth = 1.4;
        g2d.stroke();
        g2d.fillStyle = 'rgba(255,255,255,0.7)';
        g2d.beginPath();
        g2d.ellipse(-4.5, -6, 2.4, 1.6, -0.6, 0, Math.PI * 2);
        g2d.fill();
      }
      g2d.restore();
    }

    function drawCloud(cx, cy, s, alpha) {
      g2d.save();
      g2d.globalAlpha = alpha;
      g2d.fillStyle = '#ffffff';
      g2d.beginPath();
      g2d.ellipse(cx, cy, 46 * s, 18 * s, 0, 0, Math.PI * 2);
      g2d.ellipse(cx - 30 * s, cy + 4 * s, 26 * s, 14 * s, 0, 0, Math.PI * 2);
      g2d.ellipse(cx + 28 * s, cy + 3 * s, 30 * s, 15 * s, 0, 0, Math.PI * 2);
      g2d.ellipse(cx + 2 * s, cy - 12 * s, 28 * s, 18 * s, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.fillStyle = 'rgba(148, 163, 184, 0.25)';
      g2d.beginPath();
      g2d.ellipse(cx, cy + 8 * s, 50 * s, 8 * s, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.restore();
    }

    function drawBackdrop(keyboardTopY) {
      // Bright daytime sky
      const sky = g2d.createLinearGradient(0, 0, 0, keyboardTopY);
      sky.addColorStop(0, '#38bdf8');
      sky.addColorStop(0.55, '#7dd3fc');
      sky.addColorStop(1, '#fbcfe8');
      g2d.fillStyle = sky;
      g2d.fillRect(0, 0, width, keyboardTopY);

      // Sun with slowly rotating rays
      const sunX = width - 96;
      const sunY = 112;
      fx.glow(g2d, sunX, sunY, 150, '#fde047', 0.55);
      g2d.save();
      g2d.translate(sunX, sunY);
      g2d.rotate(sceneTime * 0.15);
      g2d.fillStyle = 'rgba(253, 224, 71, 0.35)';
      for (let r = 0; r < 12; r++) {
        g2d.rotate(Math.PI / 6);
        g2d.beginPath();
        g2d.moveTo(0, -36);
        g2d.lineTo(8, -70);
        g2d.lineTo(-8, -70);
        g2d.closePath();
        g2d.fill();
      }
      g2d.restore();
      const sg = g2d.createRadialGradient(sunX - 8, sunY - 8, 4, sunX, sunY, 34);
      sg.addColorStop(0, '#fffbeb');
      sg.addColorStop(1, '#facc15');
      g2d.fillStyle = sg;
      g2d.beginPath();
      g2d.arc(sunX, sunY, 32, 0, Math.PI * 2);
      g2d.fill();

      // Far clouds (layer 0) behind hills
      clouds.forEach((c) => {
        if (c.layer !== 0) return;
        const x = (((c.x + sceneTime * c.speed * 0.6) % 1.3) - 0.15) * width;
        drawCloud(x, c.y * keyboardTopY * 0.6, c.s * 0.7, 0.55);
      });

      // Rolling hills (two layers)
      const hillY = keyboardTopY - 26;
      [
        { amp: 26, freq: 0.006, off: 0, col1: '#86efac', col2: '#22c55e', lift: 40 },
        { amp: 18, freq: 0.011, off: 2, col1: '#4ade80', col2: '#15803d', lift: 6 }
      ].forEach((h) => {
        const hg = g2d.createLinearGradient(0, hillY - h.lift - h.amp, 0, keyboardTopY);
        hg.addColorStop(0, h.col1);
        hg.addColorStop(1, h.col2);
        g2d.fillStyle = hg;
        g2d.beginPath();
        g2d.moveTo(0, keyboardTopY);
        for (let x = 0; x <= width; x += 16) {
          g2d.lineTo(x, hillY - h.lift - Math.sin(x * h.freq + h.off) * h.amp);
        }
        g2d.lineTo(width, keyboardTopY);
        g2d.closePath();
        g2d.fill();
      });

      // Near clouds drifting in front
      clouds.forEach((c) => {
        if (c.layer === 0) return;
        const x = (((c.x + sceneTime * c.speed) % 1.3) - 0.15) * width;
        drawCloud(x, c.y * keyboardTopY * 0.75, c.s, c.layer === 1 ? 0.8 : 0.92);
      });

      // Danger line above the keyboard
      const pulse = 0.45 + Math.sin(sceneTime * 5) * 0.2 + lifeLostTimer;
      g2d.save();
      g2d.strokeStyle = `rgba(239, 68, 68, ${Math.min(1, pulse)})`;
      g2d.lineWidth = 3;
      g2d.setLineDash([10, 8]);
      g2d.lineDashOffset = -sceneTime * 30;
      g2d.beginPath();
      g2d.moveTo(0, keyboardTopY - 10);
      g2d.lineTo(width, keyboardTopY - 10);
      g2d.stroke();
      g2d.restore();
    }

    function drawBalloon(b, isHintTarget) {
      g2d.save();
      g2d.translate(b.x, b.y);
      const wobble = Math.sin(b.swayPhase * 1.3) * 0.04;
      const rx = b.radius * 0.92;
      const ry = b.radius * 1.05;

      // Wavy string
      g2d.strokeStyle = 'rgba(71, 85, 105, 0.85)';
      g2d.lineWidth = 1.6;
      g2d.beginPath();
      g2d.moveTo(0, ry + 6);
      const sway = Math.sin(b.swayPhase * 1.6) * 6;
      g2d.bezierCurveTo(sway, ry + 14, -sway, ry + 24, sway * 0.5, ry + 34);
      g2d.stroke();

      if (isHintTarget) {
        const pulse = 1 + Math.sin(sceneTime * 7) * 0.06;
        fx.glow(g2d, 0, 0, b.radius * 2.1, '#fde047', 0.55);
        g2d.strokeStyle = '#facc15';
        g2d.lineWidth = 3.5;
        g2d.beginPath();
        g2d.ellipse(0, 0, (rx + 9) * pulse, (ry + 9) * pulse, 0, 0, Math.PI * 2);
        g2d.stroke();
      }

      g2d.rotate(wobble);

      // Knot
      g2d.fillStyle = b.palette.dark;
      g2d.beginPath();
      g2d.moveTo(-5, ry + 7);
      g2d.lineTo(5, ry + 7);
      g2d.lineTo(0, ry - 2);
      g2d.closePath();
      g2d.fill();

      // Glossy rubber body
      const grad = g2d.createRadialGradient(-b.radius * 0.35, -b.radius * 0.4, 3, 0, 0, b.radius * 1.15);
      grad.addColorStop(0, b.palette.light);
      grad.addColorStop(0.45, b.palette.main);
      grad.addColorStop(1, b.palette.dark);
      g2d.fillStyle = grad;
      g2d.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Specular highlights
      g2d.fillStyle = 'rgba(255, 255, 255, 0.6)';
      g2d.beginPath();
      g2d.ellipse(-rx * 0.42, -ry * 0.45, rx * 0.17, ry * 0.3, -0.5, 0, Math.PI * 2);
      g2d.fill();
      g2d.fillStyle = 'rgba(255, 255, 255, 0.35)';
      g2d.beginPath();
      g2d.arc(-rx * 0.15, -ry * 0.72, 3, 0, Math.PI * 2);
      g2d.fill();
      g2d.rotate(-wobble);

      // Letter / word
      g2d.textAlign = 'center';
      g2d.textBaseline = 'middle';
      if (b.word.length === 1) {
        fx.outlinedText(g2d, b.word, 0, 2, { size: 28, color: '#ffffff', outline: 5 });
      } else {
        const pillW = Math.max(66, b.word.length * 16 + 16);
        fx.roundRectPath(g2d, -pillW / 2, -15, pillW, 30, 10);
        g2d.fillStyle = 'rgba(15, 23, 42, 0.8)';
        g2d.fill();
        g2d.font = fx.font(19, 900);
        const charW = 14;
        const startX = -((b.word.length - 1) * charW) / 2;
        for (let i = 0; i < b.word.length; i++) {
          const cx = startX + i * charW;
          const isNext = i === b.typedIndex;
          g2d.fillStyle = i < b.typedIndex ? '#4ade80' : isNext ? '#facc15' : '#ffffff';
          const lift = isNext ? Math.sin(sceneTime * 9) * 1.5 : 0;
          g2d.fillText(b.word.charAt(i), cx, 1 + lift);
        }
      }
      g2d.restore();
    }

    function drawPops() {
      pops.forEach((p) => {
        const t = p.t / 0.45;
        g2d.save();
        g2d.globalAlpha = 1 - t;
        g2d.strokeStyle = p.color;
        g2d.lineWidth = 6 * (1 - t) + 1;
        g2d.beginPath();
        g2d.arc(p.x, p.y, p.r * (1 + fx.ease.outCubic(t) * 0.9), 0, Math.PI * 2);
        g2d.stroke();
        // Comic "POP" burst
        if (t < 0.6) {
          g2d.translate(p.x, p.y);
          g2d.rotate(-0.15);
          const sc = 0.6 + fx.ease.outBack(Math.min(1, t * 3)) * 0.5;
          g2d.scale(sc, sc);
          fx.outlinedText(g2d, 'POP!', 0, 0, { size: 24, color: '#ffffff', stroke: p.color, outline: 6 });
        }
        g2d.restore();
      });
    }

    function drawVisualKeyboard(expectedChar) {
      keyRects = [];
      const kbHeight = 145;
      const kbTop = height - kbHeight;

      g2d.save();
      const deck = g2d.createLinearGradient(0, kbTop, 0, height);
      deck.addColorStop(0, '#1e293b');
      deck.addColorStop(1, '#0b1220');
      g2d.fillStyle = deck;
      g2d.fillRect(0, kbTop, width, kbHeight);
      g2d.fillStyle = 'rgba(56, 189, 248, 0.55)';
      g2d.fillRect(0, kbTop, width, 2);

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
          const isWrong = wrongTimer > 0 && letter === wrongKey;

          keyRects.push({ x, y, w: keyW, h: keyH, letter });

          const bounce = isExpected ? Math.abs(Math.sin(sceneTime * 6)) * -3 : 0;
          const press = isJustPressed ? 3 : 0;
          const shakeX = isWrong ? Math.sin(wrongTimer * 70) * 3 : 0;

          if (isExpected) {
            fx.glow(g2d, x + keyW / 2, y + keyH / 2, keyW * 1.3, '#facc15', 0.5);
          }

          // Key skirt (3D depth)
          fx.roundRectPath(g2d, x + shakeX, y + 4, keyW, keyH, 8);
          g2d.fillStyle = isExpected ? '#a16207' : isWrong ? '#9f1239' : '#020617';
          g2d.fill();

          // Key cap
          const capY = y + bounce + press;
          const cap = g2d.createLinearGradient(0, capY, 0, capY + keyH);
          if (isExpected) {
            cap.addColorStop(0, '#fef08a');
            cap.addColorStop(1, '#facc15');
          } else if (isWrong) {
            cap.addColorStop(0, '#fda4af');
            cap.addColorStop(1, '#f43f5e');
          } else if (isJustPressed) {
            cap.addColorStop(0, '#bae6fd');
            cap.addColorStop(1, '#38bdf8');
          } else {
            cap.addColorStop(0, '#334155');
            cap.addColorStop(1, '#1e293b');
          }
          fx.roundRectPath(g2d, x + shakeX, capY, keyW, keyH, 8);
          g2d.fillStyle = cap;
          g2d.fill();
          g2d.strokeStyle = isExpected ? '#ffffff' : 'rgba(148, 163, 184, 0.45)';
          g2d.lineWidth = isExpected ? 2.2 : 1.2;
          g2d.stroke();
          g2d.fillStyle = 'rgba(255, 255, 255, 0.12)';
          g2d.fillRect(x + shakeX + 5, capY + 3, keyW - 10, 2);

          g2d.fillStyle = isExpected || isJustPressed || isWrong ? '#0f172a' : '#f8fafc';
          g2d.font = fx.font(15, 800);
          g2d.textAlign = 'center';
          g2d.textBaseline = 'middle';
          g2d.fillText(letter, x + shakeX + keyW / 2, capY + keyH / 2);

          // Home-row bumps on F and J
          if (letter === 'F' || letter === 'J') {
            g2d.fillStyle = isExpected ? '#0f172a' : 'rgba(248, 250, 252, 0.6)';
            g2d.fillRect(x + shakeX + keyW / 2 - 5, capY + keyH - 7, 10, 2);
          }
        });
      });

      g2d.restore();
    }

    function drawTurret(keyboardTopY, hintBalloon) {
      const tx = width / 2;
      const ty = keyboardTopY - 4;
      const ang = hintBalloon ? Math.atan2(hintBalloon.y - ty, hintBalloon.x - tx) : -Math.PI / 2;
      g2d.save();
      g2d.translate(tx, ty);
      // Barrel aims at the current target
      g2d.save();
      g2d.rotate(ang);
      const bg = g2d.createLinearGradient(0, -7, 0, 7);
      bg.addColorStop(0, '#e0f2fe');
      bg.addColorStop(1, '#0284c7');
      g2d.fillStyle = bg;
      fx.roundRectPath(g2d, 6, -7, 34, 14, 6);
      g2d.fill();
      g2d.strokeStyle = '#0f172a';
      g2d.lineWidth = 2;
      g2d.stroke();
      g2d.restore();
      // Dome with a star badge
      const dg = g2d.createRadialGradient(-6, -10, 2, 0, 0, 26);
      dg.addColorStop(0, '#7dd3fc');
      dg.addColorStop(1, '#1d4ed8');
      g2d.fillStyle = dg;
      g2d.beginPath();
      g2d.arc(0, 0, 24, Math.PI, 0);
      g2d.closePath();
      g2d.fill();
      g2d.strokeStyle = '#0f172a';
      g2d.lineWidth = 2.5;
      g2d.stroke();
      g2d.fillStyle = '#fde047';
      g2d.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? 9 : 4;
        const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
        g2d.lineTo(Math.cos(a) * r, -11 + Math.sin(a) * r);
      }
      g2d.closePath();
      g2d.fill();
      g2d.restore();
    }

    function drawScene() {
      const cfg = getCfg();
      const keyboardTopY = height - 145;

      drawBackdrop(keyboardTopY);

      const hintBalloon = getTargetBalloonForHint();
      const expectedChar = hintBalloon ? hintBalloon.word.charAt(hintBalloon.typedIndex) : '';

      // Rainbow star beams (additive core + halo)
      g2d.save();
      g2d.globalCompositeOperation = 'lighter';
      g2d.lineCap = 'round';
      lasers.forEach((ls) => {
        const a = Math.max(0, ls.life / 0.16);
        g2d.globalAlpha = a;
        g2d.strokeStyle = ls.color;
        g2d.lineWidth = 12;
        g2d.globalAlpha = a * 0.35;
        g2d.beginPath();
        g2d.moveTo(ls.x1, ls.y1);
        g2d.lineTo(ls.x2, ls.y2);
        g2d.stroke();
        g2d.globalAlpha = a;
        g2d.strokeStyle = '#ffffff';
        g2d.lineWidth = 3.5;
        g2d.beginPath();
        g2d.moveTo(ls.x1, ls.y1);
        g2d.lineTo(ls.x2, ls.y2);
        g2d.stroke();
      });
      g2d.restore();

      drawTurret(keyboardTopY, hintBalloon);

      balloons.forEach((b) => {
        drawBalloon(b, hintBalloon && b.id === hintBalloon.id);
      });

      drawPops();

      confetti.forEach((c) => {
        g2d.save();
        g2d.translate(c.x, c.y);
        g2d.rotate(c.rot);
        g2d.scale(1, Math.cos(c.rot * 1.4));
        g2d.globalAlpha = Math.min(1, c.life * 2.5);
        g2d.fillStyle = c.color;
        g2d.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        g2d.restore();
      });
      sparks.draw(g2d);

      popups.forEach((pp) => {
        const a = Math.max(0, Math.min(1, pp.alpha));
        const pop = Math.min(1, (1 - pp.alpha) * 6);
        g2d.save();
        g2d.globalAlpha = a;
        g2d.translate(pp.x, pp.y);
        const sc = 0.7 + fx.ease.outBack(pop) * 0.3;
        g2d.scale(sc, sc);
        fx.outlinedText(g2d, pp.text, 0, 0, { size: 17, color: pp.color });
        g2d.restore();
      });

      // Top HUD: vector hearts, next key, combo meter, score
      g2d.save();
      fx.roundRectPath(g2d, 12, 10, width - 24, 48, 14);
      g2d.fillStyle = 'rgba(15, 23, 42, 0.78)';
      g2d.fill();
      g2d.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      g2d.lineWidth = 1.5;
      g2d.stroke();

      const heartShake = lifeLostTimer > 0 ? Math.sin(lifeLostTimer * 60) * 3 : 0;
      for (let i = 0; i < cfg.maxLives; i++) {
        drawHeart(32 + i * 24 + (i === lives ? heartShake : 0), 36, 20, '#e11d48', i >= lives);
      }

      const compact = width < 620;
      g2d.textAlign = 'center';
      g2d.textBaseline = 'middle';
      if (expectedChar) {
        const label = compact ? 'PHÍM:' : 'PHÍM CẦN BẤM:';
        g2d.font = fx.font(14, 800);
        const lw = g2d.measureText(label).width;
        const cx = width / 2 - (compact ? 10 : 30);
        g2d.fillStyle = '#e2e8f0';
        g2d.fillText(label, cx - 18, 35);
        const kx = cx + lw / 2 - 4;
        fx.roundRectPath(g2d, kx, 19, 32, 32, 8);
        g2d.fillStyle = '#facc15';
        g2d.fill();
        g2d.fillStyle = '#0f172a';
        g2d.font = fx.font(18, 900);
        g2d.fillText(expectedChar, kx + 16, 36);
      } else {
        g2d.font = fx.font(14, 800);
        g2d.fillStyle = '#e2e8f0';
        g2d.fillText('🎈 Đợi bóng bay xuất hiện...', width / 2, 35);
      }

      // Combo meter
      if (!compact) {
        const cx = width / 2 + 110;
        g2d.textAlign = 'left';
        g2d.font = fx.font(13, 800);
        g2d.fillStyle = combo >= 5 ? '#fb923c' : '#94a3b8';
        g2d.fillText(`${combo >= 5 ? '🔥' : '⚡'} COMBO ×${combo}`, cx, 35);
      }

      g2d.textAlign = 'right';
      fx.outlinedText(g2d, `🏆 ${score.toLocaleString('vi-VN')}`, width - 26, 35, {
        size: 18,
        color: '#4ade80',
        align: 'right'
      });
      g2d.restore();

      drawVisualKeyboard(expectedChar);

      if (lifeLostTimer > 0) {
        fx.vignette(g2d, width, height, 0, `rgba(239, 68, 68, ${lifeLostTimer})`);
      }

      const key = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (key !== overlayKey) {
        overlayKey = key;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '🎈',
          title: 'HOÀN THÀNH BÀI TẬP!',
          subtitle: 'Bé đã luyện gõ phím rất chăm chỉ — thử lại để phá kỷ lục nhé!',
          lines: [
            `Điểm của bé|${score.toLocaleString('vi-VN')}`,
            `Bóng đã bắn nổ|${poppedCount}`,
            `Chế độ|${difficulty === 'easy' ? 'Dễ' : 'Khó'}`
          ],
          hint: 'Bấm vào màn hình để chơi lại',
          accent: '#ec4899',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để luyện gõ phím tiếp.',
          accent: '#38bdf8',
          t: overlayT,
          backdrop: 0.55
        });
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

    function setPaused(next) {
      if (isGameOver && next) return;
      isPaused = next;
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
    }

    pauseBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      setPaused(!isPaused);
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      updateGame(dt);
      updatePresentation(dt);
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
      }
    };
  }

  ArcadeHub.games.typing = {
    init: createTypingGame
  };
})(window);
