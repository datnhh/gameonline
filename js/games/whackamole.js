(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const DIFFICULTY_MODES = {
    easy: {
      label: 'DỄ (Chuột nhô lên lâu)',
      stayDuration: 1.75,
      spawnInterval: 0.95,
      maxActive: 2,
      bunnyChance: 0.12,
      scoreMult: 1.0
    },
    hard: {
      label: 'KHÓ (Nhanh & Nhiều x1.5 Điểm)',
      stayDuration: 1.05,
      spawnInterval: 0.58,
      maxActive: 3,
      bunnyChance: 0.25,
      scoreMult: 1.5
    }
  };

  function createWhackAMoleGame(container, ctx) {
    let width = 900;
    let height = 520;
    let animId = null;
    let lastTime = performance.now();

    let difficulty = 'easy';
    let score = 0;
    let hits = 0;
    let combo = 0;
    let timeLeft = 60;
    let isGameOver = false;
    let isPaused = false;

    // 9 Holes (3x3)
    let holes = [];
    let spawnTimer = 0.5;

    // Hammer Cursor State
    let hammer = {
      x: 450,
      y: 260,
      swingTimer: 0
    };

    let popups = [];

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(240);
    const camShake = fx.createShake(7);
    let sceneTime = 0;
    let overlayT = 0;
    let overlayKey = '';
    let missFlash = 0;
    let finalT = 10;
    let finalWarned = false;
    let bestCombo = 0;
    let hammerVisible = false;
    const clouds = [
      { x: 0.08, y: 0.32, s: 0.9, speed: 0.008 },
      { x: 0.42, y: 0.2, s: 0.7, speed: 0.012 },
      { x: 0.7, y: 0.45, s: 0.6, speed: 0.01 }
    ];

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#94a3b8;font-weight:700;">Chế độ chơi:</span>
          <button type="button" class="pill-btn active" data-diff="easy">🟢 Chế độ Dễ (Cho bé tập bấm chuột)</button>
          <button type="button" class="pill-btn" data-diff="hard">🔴 Chế độ Khó (x1.5 Điểm)</button>
        </div>
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#38bdf8;font-weight:600;">
            🔨 Bấm vào Chuột Nâu &amp; Chuột Vàng • Đừng đập trúng Thỏ Trắng 🐰 nhé!
          </span>
          <button type="button" class="pill-btn" id="wamPauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="wamCanvas" class="game-canvas" style="cursor:none;"></canvas>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#wamCanvas');
    const g2d = canvas.getContext('2d');
    const pauseBtn = shell.querySelector('#wamPauseBtn');

    function getCfg() {
      return DIFFICULTY_MODES[difficulty] || DIFFICULTY_MODES.easy;
    }

    function initHoles() {
      holes = [];
      for (let i = 0; i < 9; i++) {
        holes.push({
          index: i,
          state: 'empty', // 'empty' | 'rising' | 'up' | 'sinking' | 'whacked'
          kind: 'normal', // 'normal' | 'gold' | 'bunny'
          pop: 0, // 0..1
          timer: 0
        });
      }
    }

    function resetGame() {
      score = 0;
      hits = 0;
      combo = 0;
      timeLeft = 60;
      isGameOver = false;
      isPaused = false;
      spawnTimer = 0.4;
      popups = [];
      initHoles();
      sparks.clear();
      camShake.reset();
      missFlash = 0;
      finalT = 10;
      finalWarned = false;
      bestCombo = 0;
      ctx.updateScore(0);
      syncPauseBtn();
    }

    function syncPauseBtn() {
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

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 960);
      const maxH = Math.max(360, Math.min(window.innerHeight - 200, 540));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getHoleCoordinates(index) {
      const r = Math.floor(index / 3);
      const c = index % 3;
      const startY = height * 0.36;
      const rowStep = (height - startY - 55) / 2.2;
      const y = startY + r * rowStep;

      // Perspective width: back row slightly narrower, front row wider
      const rowSpread = width * (0.24 + r * 0.035);
      const x = width * 0.5 + (c - 1) * rowSpread;
      const scale = 0.86 + r * 0.12;
      return { x, y, scale };
    }

    function spawnMole() {
      const cfg = getCfg();
      const activeCount = holes.filter((h) => h.state !== 'empty').length;
      if (activeCount >= cfg.maxActive) return;

      const emptyHoles = holes.filter((h) => h.state === 'empty');
      if (emptyHoles.length === 0) return;

      const chosen = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
      const roll = Math.random();
      if (roll < cfg.bunnyChance) {
        chosen.kind = 'bunny';
      } else if (roll < cfg.bunnyChance + 0.18) {
        chosen.kind = 'gold';
      } else {
        chosen.kind = 'normal';
      }

      chosen.state = 'rising';
      chosen.pop = 0;
      chosen.timer = cfg.stayDuration * (0.85 + Math.random() * 0.3);
    }

    function spawnHitStars(x, y, color) {
      sparks.burst(x, y, {
        count: 12,
        kind: 'star',
        speed: [80, 200],
        life: [0.35, 0.6],
        size: [4, 8],
        gravity: 260,
        drag: 1.5,
        colors: [color || '#facc15', '#ffffff']
      });
      sparks.ring(x, y, { from: 10, to: 64, color: color || '#facc15', life: 0.35 });
    }

    function addPopup(x, y, text, color) {
      popups.push({
        x,
        y,
        text,
        color: color || '#facc15',
        alpha: 1,
        vy: -45
      });
    }

    function updateGame(dt) {
      if (isGameOver || isPaused) return;
      const cfg = getCfg();

      if (hammer.swingTimer > 0) {
        hammer.swingTimer = Math.max(0, hammer.swingTimer - dt * 6.5);
      }

      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        isGameOver = true;
        ArcadeHub.sound.win();
        ctx.submitHighScore(
          score,
          `Chế độ ${cfg.label} • Đập trúng ${hits} chuột`
        );
        return;
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnMole();
        spawnTimer = cfg.spawnInterval * (0.75 + Math.random() * 0.45);
      }

      holes.forEach((h) => {
        if (h.state === 'rising') {
          h.pop = Math.min(1, h.pop + dt * 6.5);
          if (h.pop >= 1) h.state = 'up';
        } else if (h.state === 'up') {
          h.timer -= dt;
          if (h.timer <= 0) {
            h.state = 'sinking';
          }
        } else if (h.state === 'whacked') {
          h.timer -= dt;
          if (h.timer <= 0) {
            h.state = 'sinking';
          }
        } else if (h.state === 'sinking') {
          h.pop = Math.max(0, h.pop - dt * 6.0);
          if (h.pop <= 0) {
            h.state = 'empty';
          }
        }
      });

      for (let i = popups.length - 1; i >= 0; i--) {
        const pp = popups[i];
        pp.y += pp.vy * dt;
        pp.alpha -= dt * 0.9;
        if (pp.alpha <= 0) popups.splice(i, 1);
      }
    }

    function handleWhackAt(px, py) {
      if (isGameOver || isPaused) return;
      hammer.x = px;
      hammer.y = py;
      hammer.swingTimer = 1.0;

      const cfg = getCfg();
      let hitAny = false;

      // Check from front row to back row
      for (let i = 8; i >= 0; i--) {
        const h = holes[i];
        if (h.state === 'empty' || h.state === 'whacked' || h.pop < 0.25) continue;

        const pos = getHoleCoordinates(i);
        const charCenterY = pos.y - 34 * pos.scale * h.pop;
        const hitRadius = 54 * pos.scale;

        if (Math.hypot(px - pos.x, py - charCenterY) <= hitRadius) {
          hitAny = true;
          h.state = 'whacked';
          h.timer = 0.32;
          h.hitAt = sceneTime;

          if (h.kind === 'bunny') {
            combo = 0;
            score = Math.max(0, score - 25);
            ctx.updateScore(score);
            ArcadeHub.sound.error();
            missFlash = 1;
            camShake.add(0.45);
            spawnHitStars(pos.x, charCenterY, '#f43f5e');
            addPopup(pos.x, charCenterY - 25, '🐰 NHẦM THỎ TRẮNG! -25', '#f43f5e');
          } else {
            hits += 1;
            combo += 1;
            bestCombo = Math.max(bestCombo, combo);
            camShake.add(h.kind === 'gold' ? 0.35 : 0.2);
            const basePts = h.kind === 'gold' ? 90 : 35;
            const comboBonus = Math.min(60, (combo - 1) * 5);
            const pts = Math.round((basePts + comboBonus) * cfg.scoreMult);
            score += pts;
            ctx.updateScore(score);
            ArcadeHub.sound.tile();
            spawnHitStars(pos.x, charCenterY, h.kind === 'gold' ? '#facc15' : '#4ade80');
            addPopup(
              pos.x,
              charCenterY - 25,
              h.kind === 'gold' ? `👑 CHUỘT VÀNG +${pts}!` : `🔨 BỐP! +${pts}`,
              h.kind === 'gold' ? '#facc15' : '#4ade80'
            );
          }
          break;
        }
      }

      if (!hitAny) {
        ArcadeHub.sound.click();
        sparks.burst(px, py + 4, { count: 6, kind: 'smoke', speed: [20, 60], life: [0.3, 0.5], size: [4, 7], colors: ['#a16207', '#d6d3d1'] });
      }
    }

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      if (isGameOver) {
        sparks.update(dt);
        return;
      }
      sceneTime += dt;
      sparks.update(dt);
      camShake.update(dt);
      if (missFlash > 0) missFlash = Math.max(0, missFlash - dt * 2.2);
      if (finalT < 10) finalT += dt;
      if (!finalWarned && timeLeft <= 10) {
        finalWarned = true;
        finalT = 0;
      }
      clouds.forEach((c) => {
        c.x += c.speed * dt;
        if (c.x > 1.2) c.x = -0.2;
      });
    }

    function drawCloud(cx, cy, s) {
      g2d.fillStyle = 'rgba(255, 255, 255, 0.92)';
      g2d.beginPath();
      g2d.arc(cx, cy, 18 * s, 0, Math.PI * 2);
      g2d.arc(cx + 20 * s, cy - 8 * s, 22 * s, 0, Math.PI * 2);
      g2d.arc(cx + 44 * s, cy, 17 * s, 0, Math.PI * 2);
      g2d.fill();
      g2d.fillRect(cx, cy, 44 * s, 16 * s);
      g2d.fillStyle = 'rgba(186, 230, 253, 0.6)';
      fx.roundRectPath(g2d, cx - 6 * s, cy + 8 * s, 58 * s, 9 * s, 4 * s);
      g2d.fill();
    }

    function drawBackdrop() {
      const skyHeight = height * 0.24;

      // Sky
      const skyGrad = g2d.createLinearGradient(0, 0, 0, skyHeight);
      skyGrad.addColorStop(0, '#0ea5e9');
      skyGrad.addColorStop(1, '#bae6fd');
      g2d.fillStyle = skyGrad;
      g2d.fillRect(0, 0, width, skyHeight);

      // Sun with slowly turning rays
      const sunX = width * 0.86;
      const sunY = skyHeight * 0.55;
      const sunR = Math.min(34, skyHeight * 0.32);
      g2d.save();
      g2d.translate(sunX, sunY);
      g2d.rotate(sceneTime * 0.15);
      g2d.fillStyle = 'rgba(253, 224, 71, 0.35)';
      for (let k = 0; k < 12; k++) {
        g2d.rotate(Math.PI / 6);
        g2d.beginPath();
        g2d.moveTo(-5, -sunR * 1.15);
        g2d.lineTo(5, -sunR * 1.15);
        g2d.lineTo(0, -sunR * 1.8);
        g2d.closePath();
        g2d.fill();
      }
      g2d.restore();
      fx.glow(g2d, sunX, sunY, sunR * 2.6, '#fde047', 0.5);
      g2d.fillStyle = '#fde047';
      g2d.beginPath();
      g2d.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      g2d.fill();
      g2d.fillStyle = '#fef9c3';
      g2d.beginPath();
      g2d.arc(sunX - sunR * 0.25, sunY - sunR * 0.25, sunR * 0.45, 0, Math.PI * 2);
      g2d.fill();

      clouds.forEach((c) => drawCloud(c.x * width, c.y * skyHeight, c.s));

      // Distant rolling hills (two layers)
      [
        ['#86efac', 0.9, 18, 0.006],
        ['#4ade80', 1.0, 10, 0.011]
      ].forEach(([col, base, amp, freq]) => {
        g2d.fillStyle = col;
        g2d.beginPath();
        g2d.moveTo(0, skyHeight);
        for (let x = 0; x <= width + 20; x += 20) {
          g2d.lineTo(x, skyHeight * base - (Math.sin(x * freq + base * 5) + 1) * amp);
        }
        g2d.lineTo(width, skyHeight);
        g2d.closePath();
        g2d.fill();
      });

      // Meadow with mowed stripes
      const grassGrad = g2d.createLinearGradient(0, skyHeight, 0, height);
      grassGrad.addColorStop(0, '#4ade80');
      grassGrad.addColorStop(0.45, '#22c55e');
      grassGrad.addColorStop(1, '#15803d');
      g2d.fillStyle = grassGrad;
      g2d.fillRect(0, skyHeight - 10, width, height - skyHeight + 10);
      g2d.fillStyle = 'rgba(255, 255, 255, 0.06)';
      const stripeH = (height - skyHeight) / 6;
      for (let k = 0; k < 6; k += 2) {
        g2d.fillRect(0, skyHeight + k * stripeH, width, stripeH);
      }

      // Wooden fence with depth
      const railY = skyHeight - 16;
      g2d.fillStyle = 'rgba(0, 0, 0, 0.18)';
      g2d.fillRect(0, railY + 9, width, 4);
      g2d.strokeStyle = '#3f1d0b';
      g2d.lineWidth = 2;
      for (let px = 25; px < width; px += 55) {
        g2d.fillStyle = '#b45309';
        g2d.fillRect(px, railY - 12, 12, 26);
        g2d.strokeRect(px, railY - 12, 12, 26);
        g2d.fillStyle = '#f59e0b';
        g2d.fillRect(px + 2, railY - 10, 3, 22);
        g2d.fillStyle = '#b45309';
        g2d.beginPath();
        g2d.moveTo(px, railY - 12);
        g2d.lineTo(px + 6, railY - 19);
        g2d.lineTo(px + 12, railY - 12);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
      }
      g2d.fillStyle = '#d97706';
      g2d.fillRect(0, railY, width, 7);
      g2d.strokeRect(-2, railY, width + 4, 7);

      // Flowers and grass tufts (deterministic scatter)
      const hash = (n) => {
        const v = Math.sin(n * 12.9898) * 43758.5453;
        return v - Math.floor(v);
      };
      for (let i = 0; i < Math.floor(width / 30); i++) {
        const fxp = hash(i + 1) * width;
        const fyp = skyHeight + 14 + hash(i + 101) * Math.max(1, height - skyHeight - 30);
        g2d.strokeStyle = 'rgba(21, 128, 61, 0.9)';
        g2d.lineWidth = 2;
        g2d.beginPath();
        g2d.moveTo(fxp - 4, fyp);
        g2d.lineTo(fxp - 6, fyp - 7);
        g2d.moveTo(fxp, fyp);
        g2d.lineTo(fxp, fyp - 9);
        g2d.moveTo(fxp + 4, fyp);
        g2d.lineTo(fxp + 6, fyp - 7);
        g2d.stroke();
        if (i % 3 === 0) {
          g2d.fillStyle = ['#f472b6', '#fde047', '#ffffff', '#a78bfa'][i % 4];
          g2d.beginPath();
          g2d.arc(fxp, fyp - 10, 3.2, 0, Math.PI * 2);
          g2d.fill();
          g2d.fillStyle = '#facc15';
          g2d.beginPath();
          g2d.arc(fxp, fyp - 10, 1.2, 0, Math.PI * 2);
          g2d.fill();
        }
      }
    }

    function drawHoleAndCritter(h) {
      const { x, y, scale } = getHoleCoordinates(h.index);
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(scale, scale);

      // 1. Dirt mound and dark burrow
      fx.contactShadow(g2d, 0, 10, 66, 22, 0.25);
      const mound = g2d.createLinearGradient(0, -22, 0, 22);
      mound.addColorStop(0, '#a16207');
      mound.addColorStop(1, '#713f12');
      g2d.fillStyle = mound;
      g2d.strokeStyle = '#2b1606';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.ellipse(0, 0, 60, 23, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();
      const pit = g2d.createRadialGradient(0, 4, 4, 0, 2, 48);
      pit.addColorStop(0, '#000000');
      pit.addColorStop(1, '#292524');
      g2d.fillStyle = pit;
      g2d.beginPath();
      g2d.ellipse(0, 2, 48, 16, 0, 0, Math.PI * 2);
      g2d.fill();

      // 2. Critter rises out of the burrow (clipped above the lip)
      if (h.state !== 'empty' && h.pop > 0.02) {
        g2d.save();
        g2d.beginPath();
        g2d.rect(-70, -140, 140, 144);
        g2d.clip();

        const liftY = (1 - h.pop) * 78;
        g2d.translate(0, liftY);

        const isWhacked = h.state === 'whacked';
        // Squash & stretch: stretch while popping up, squash on the whack
        let sx = 1;
        let sy = 1;
        if (!reduced) {
          if (h.state === 'rising') {
            const k = Math.sin(h.pop * Math.PI) * 0.14;
            sx = 1 - k * 0.5;
            sy = 1 + k;
          } else if (isWhacked) {
            const age = Math.max(0, sceneTime - (h.hitAt || 0));
            const k = Math.max(0, 1 - age / 0.32);
            sx = 1 + 0.28 * k;
            sy = 1 - 0.32 * k;
          } else if (h.state === 'up') {
            sy = 1 + Math.sin(sceneTime * 6 + h.index) * 0.02;
          }
        }
        g2d.translate(0, 10);
        g2d.scale(sx, sy);
        g2d.translate(0, -10);

        g2d.strokeStyle = '#1c1206';
        g2d.lineWidth = 2.5;
        g2d.lineJoin = 'round';

        if (h.kind === 'bunny') {
          // Bunny ears
          const earWiggle = Math.sin(sceneTime * 5 + h.index) * 0.08;
          g2d.fillStyle = '#ffffff';
          [-1, 1].forEach((side) => {
            g2d.save();
            g2d.translate(side * 14, -50);
            g2d.rotate(side * (0.15 + earWiggle));
            g2d.beginPath();
            g2d.ellipse(0, -20, 8.5, 23, 0, 0, Math.PI * 2);
            g2d.fill();
            g2d.stroke();
            g2d.fillStyle = '#f9a8d4';
            g2d.beginPath();
            g2d.ellipse(0, -20, 4, 15, 0, 0, Math.PI * 2);
            g2d.fill();
            g2d.fillStyle = '#ffffff';
            g2d.restore();
          });
          const fur = g2d.createRadialGradient(-10, -36, 4, 0, -20, 46);
          fur.addColorStop(0, '#ffffff');
          fur.addColorStop(1, '#e2e8f0');
          g2d.fillStyle = fur;
          fx.roundRectPath(g2d, -29, -52, 58, 64, 27);
          g2d.fill();
          g2d.stroke();
          // Blush + whiskers
          g2d.fillStyle = 'rgba(244, 114, 182, 0.45)';
          g2d.beginPath();
          g2d.ellipse(-18, -22, 6, 3.5, 0, 0, Math.PI * 2);
          g2d.ellipse(18, -22, 6, 3.5, 0, 0, Math.PI * 2);
          g2d.fill();
        } else {
          const gold = h.kind === 'gold';
          const bodyCol = gold ? '#eab308' : '#a16207';
          const bodyDark = gold ? '#a16207' : '#713f12';
          const bellyCol = gold ? '#fef08a' : '#fde68a';
          if (gold) fx.glow(g2d, 0, -26, 70, '#fde047', 0.35 + Math.sin(sceneTime * 6) * 0.1);

          // Round ears
          g2d.fillStyle = bodyCol;
          [-22, 22].forEach((ex) => {
            g2d.beginPath();
            g2d.arc(ex, -48, 10, 0, Math.PI * 2);
            g2d.fill();
            g2d.stroke();
          });
          g2d.fillStyle = '#f9a8d4';
          [-22, 22].forEach((ex) => {
            g2d.beginPath();
            g2d.arc(ex, -48, 5, 0, Math.PI * 2);
            g2d.fill();
          });

          // Body with soft shading
          const fur = g2d.createRadialGradient(-12, -40, 4, 0, -16, 50);
          fur.addColorStop(0, gold ? '#fde047' : '#ca8a04');
          fur.addColorStop(0.55, bodyCol);
          fur.addColorStop(1, bodyDark);
          g2d.fillStyle = fur;
          fx.roundRectPath(g2d, -30, -56, 60, 68, 28);
          g2d.fill();
          g2d.stroke();

          // Belly patch
          g2d.fillStyle = bellyCol;
          g2d.beginPath();
          g2d.ellipse(0, -10, 20, 18, 0, 0, Math.PI * 2);
          g2d.fill();

          // Cheeks
          g2d.fillStyle = 'rgba(244, 114, 182, 0.4)';
          g2d.beginPath();
          g2d.ellipse(-19, -22, 5.5, 3.5, 0, 0, Math.PI * 2);
          g2d.ellipse(19, -22, 5.5, 3.5, 0, 0, Math.PI * 2);
          g2d.fill();

          if (gold) {
            g2d.fillStyle = '#facc15';
            g2d.beginPath();
            g2d.moveTo(-16, -54);
            g2d.lineTo(-18, -70);
            g2d.lineTo(-6, -60);
            g2d.lineTo(0, -74);
            g2d.lineTo(6, -60);
            g2d.lineTo(18, -70);
            g2d.lineTo(16, -54);
            g2d.closePath();
            g2d.fill();
            g2d.stroke();
            g2d.fillStyle = '#ef4444';
            g2d.beginPath();
            g2d.arc(0, -60, 2.6, 0, Math.PI * 2);
            g2d.fill();
            // Twinkle
            const tw = (Math.sin(sceneTime * 7) + 1) * 0.5;
            g2d.fillStyle = `rgba(255, 255, 255, ${0.4 + tw * 0.6})`;
            g2d.beginPath();
            g2d.moveTo(24, -44 - 6 * tw);
            g2d.lineTo(26, -44);
            g2d.lineTo(24 + 6 * tw, -42);
            g2d.lineTo(26, -40);
            g2d.lineTo(24, -40 + 6 * tw);
            g2d.lineTo(22, -40);
            g2d.lineTo(24 - 6 * tw, -42);
            g2d.lineTo(22, -44);
            g2d.closePath();
            g2d.fill();
          }
        }

        // Eyes: dizzy X when whacked, shiny otherwise
        if (isWhacked) {
          g2d.strokeStyle = '#1c1206';
          g2d.lineWidth = 2.8;
          [-12, 12].forEach((ex) => {
            g2d.beginPath();
            g2d.moveTo(ex - 5, -38);
            g2d.lineTo(ex + 5, -28);
            g2d.moveTo(ex + 5, -38);
            g2d.lineTo(ex - 5, -28);
            g2d.stroke();
          });
        } else {
          g2d.fillStyle = '#1c1206';
          g2d.beginPath();
          g2d.ellipse(-11, -33, 4.8, 5.6, 0, 0, Math.PI * 2);
          g2d.ellipse(11, -33, 4.8, 5.6, 0, 0, Math.PI * 2);
          g2d.fill();
          g2d.fillStyle = '#ffffff';
          g2d.beginPath();
          g2d.arc(-12.5, -35, 1.9, 0, Math.PI * 2);
          g2d.arc(9.5, -35, 1.9, 0, Math.PI * 2);
          g2d.fill();
        }

        // Whiskers
        g2d.strokeStyle = 'rgba(28, 18, 6, 0.6)';
        g2d.lineWidth = 1.2;
        g2d.beginPath();
        [-1, 1].forEach((side) => {
          g2d.moveTo(side * 9, -22);
          g2d.lineTo(side * 24, -26);
          g2d.moveTo(side * 9, -20);
          g2d.lineTo(side * 24, -19);
        });
        g2d.stroke();

        // Buck teeth & nose
        g2d.fillStyle = '#ffffff';
        g2d.strokeStyle = '#1c1206';
        g2d.lineWidth = 1.5;
        fx.roundRectPath(g2d, -5, -20, 10, 8, 2);
        g2d.fill();
        g2d.stroke();
        g2d.beginPath();
        g2d.moveTo(0, -20);
        g2d.lineTo(0, -12);
        g2d.stroke();
        g2d.fillStyle = h.kind === 'bunny' ? '#f472b6' : '#f43f5e';
        g2d.beginPath();
        g2d.ellipse(0, -23, 6, 4.5, 0, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
        g2d.fillStyle = 'rgba(255,255,255,0.7)';
        g2d.beginPath();
        g2d.arc(-2, -24.5, 1.4, 0, Math.PI * 2);
        g2d.fill();

        // Little paws resting on the rim once fully up
        if (h.pop > 0.9 && !isWhacked) {
          g2d.fillStyle = h.kind === 'bunny' ? '#ffffff' : h.kind === 'gold' ? '#eab308' : '#a16207';
          g2d.strokeStyle = '#1c1206';
          g2d.lineWidth = 2;
          [-20, 20].forEach((px) => {
            g2d.beginPath();
            g2d.ellipse(px, 6, 8, 5, 0, 0, Math.PI * 2);
            g2d.fill();
            g2d.stroke();
          });
        }

        g2d.restore();

        // Dizzy stars orbiting a whacked critter (outside the clip so they show above)
        if (isWhacked) {
          const top = -62 + liftY;
          for (let k = 0; k < 3; k++) {
            const a = sceneTime * 7 + (k / 3) * Math.PI * 2;
            const sx2 = Math.cos(a) * 26;
            const sy2 = top + Math.sin(a) * 7;
            g2d.fillStyle = k === 0 ? '#facc15' : k === 1 ? '#ffffff' : '#fde047';
            g2d.beginPath();
            for (let p = 0; p < 10; p++) {
              const rr = p % 2 === 0 ? 6 : 2.6;
              const pa = -Math.PI / 2 + (p / 10) * Math.PI * 2;
              g2d.lineTo(sx2 + Math.cos(pa) * rr, sy2 + Math.sin(pa) * rr);
            }
            g2d.closePath();
            g2d.fill();
          }
        }
      }

      // 3. Front dirt lip with grass tufts
      const lip = g2d.createLinearGradient(0, 4, 0, 22);
      lip.addColorStop(0, '#a16207');
      lip.addColorStop(1, '#78350f');
      g2d.fillStyle = lip;
      g2d.strokeStyle = '#2b1606';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.ellipse(0, 6, 60, 17, 0, 0, Math.PI);
      g2d.fill();
      g2d.stroke();
      g2d.strokeStyle = '#16a34a';
      g2d.lineWidth = 2.4;
      g2d.lineCap = 'round';
      g2d.beginPath();
      [-50, -26, 30, 52].forEach((gx, idx) => {
        const gy = 6 + Math.sqrt(Math.max(0, 1 - (gx / 60) ** 2)) * 17;
        g2d.moveTo(gx, gy);
        g2d.lineTo(gx - 3, gy - 9 - (idx % 2) * 3);
        g2d.moveTo(gx + 3, gy);
        g2d.lineTo(gx + 5, gy - 8);
      });
      g2d.stroke();

      g2d.restore();
    }

    function drawToyHammer() {
      // On touch screens there is no hover; hide the idle hammer until the first tap
      if (!hammerVisible) return;
      g2d.save();
      g2d.translate(hammer.x, hammer.y);
      const swingAng = hammer.swingTimer > 0 ? -0.85 * Math.sin(hammer.swingTimer * Math.PI) : 0.25;

      // Motion arc while swinging
      if (hammer.swingTimer > 0.2 && !reduced) {
        g2d.strokeStyle = `rgba(255, 255, 255, ${hammer.swingTimer * 0.5})`;
        g2d.lineWidth = 6;
        g2d.lineCap = 'round';
        g2d.beginPath();
        g2d.arc(0, 30, 52, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.3);
        g2d.stroke();
      }

      g2d.rotate(swingAng);
      g2d.strokeStyle = '#1c1206';
      g2d.lineWidth = 2.5;

      // Wooden handle with grain
      const wood = g2d.createLinearGradient(-6, 0, 8, 0);
      wood.addColorStop(0, '#fbbf24');
      wood.addColorStop(1, '#b45309');
      g2d.fillStyle = wood;
      fx.roundRectPath(g2d, -6, -10, 14, 54, 6);
      g2d.fill();
      g2d.stroke();
      g2d.fillStyle = '#ef4444';
      fx.roundRectPath(g2d, -7, 30, 16, 14, 5);
      g2d.fill();
      g2d.stroke();

      // Big squeaky mallet head
      const headGrad = g2d.createLinearGradient(0, -34, 0, -6);
      headGrad.addColorStop(0, '#f87171');
      headGrad.addColorStop(1, '#b91c1c');
      g2d.fillStyle = headGrad;
      fx.roundRectPath(g2d, -28, -34, 56, 28, 10);
      g2d.fill();
      g2d.stroke();
      g2d.fillStyle = 'rgba(255, 255, 255, 0.35)';
      fx.roundRectPath(g2d, -20, -31, 40, 6, 3);
      g2d.fill();

      // Yellow strike faces
      g2d.fillStyle = '#facc15';
      fx.roundRectPath(g2d, -33, -31, 8, 22, 3);
      g2d.fill();
      g2d.stroke();
      fx.roundRectPath(g2d, 25, -31, 8, 22, 3);
      g2d.fill();
      g2d.stroke();

      g2d.restore();
    }

    function drawHud() {
      const compact = width < 640;
      g2d.save();
      fx.roundRectPath(g2d, 12, 10, width - 24, 46, 14);
      g2d.fillStyle = 'rgba(9, 13, 24, 0.8)';
      g2d.fill();
      g2d.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      g2d.lineWidth = 1.5;
      g2d.stroke();

      // Timer: number + draining bar (pulses red in the last 10 seconds)
      const urgent = timeLeft <= 10 && !isGameOver;
      const pulse = urgent && !reduced ? 1 + Math.sin(sceneTime * 10) * 0.08 : 1;
      const timeText = `⏱ ${Math.ceil(timeLeft)}s`;
      fx.outlinedText(g2d, timeText, 28, 33, {
        size: (compact ? 15 : 17) * pulse,
        color: urgent ? '#fb7185' : '#7dd3fc',
        align: 'left'
      });
      const barX = compact ? 88 : 104;
      const barW = compact ? Math.max(40, width * 0.18) : Math.min(180, width * 0.2);
      fx.roundRectPath(g2d, barX, 28, barW, 8, 4);
      g2d.fillStyle = 'rgba(148, 163, 184, 0.25)';
      g2d.fill();
      fx.roundRectPath(g2d, barX, 28, Math.max(0, barW * (timeLeft / 60)), 8, 4);
      g2d.fillStyle = urgent ? '#f43f5e' : '#38bdf8';
      g2d.fill();

      // Hits + combo
      const midX = compact ? barX + barW + (width - barX - barW) * 0.4 : width / 2 + 30;
      const hitsText = compact ? `🔨 ${hits}` : `🔨 Đập trúng: ${hits}`;
      fx.outlinedText(g2d, hitsText, midX, 33, { size: compact ? 14 : 16, color: '#86efac' });
      if (combo >= 2) {
        const cx = midX + (compact ? 44 : 110);
        const cs = (compact ? 13 : 15) * (combo >= 5 && !reduced ? 1 + Math.sin(sceneTime * 12) * 0.06 : 1);
        fx.outlinedText(g2d, `x${combo}`, cx, 33, {
          size: cs,
          color: combo >= 5 ? '#f472b6' : '#fde047',
          glow: combo >= 5 ? '#f472b6' : null
        });
      }

      const scoreText = compact ? `🏆 ${score.toLocaleString('vi-VN')}` : `🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`;
      fx.outlinedText(g2d, scoreText, width - 26, 33, { size: compact ? 16 : 19, color: '#facc15', align: 'right' });
      g2d.restore();
    }

    function drawScene() {
      const cfg = getCfg();
      drawBackdrop();

      g2d.save();
      camShake.apply(g2d);
      // Back row to front row so front critters overlap the ones behind
      holes.forEach((h) => drawHoleAndCritter(h));
      sparks.draw(g2d);
      g2d.restore();

      if (missFlash > 0) {
        fx.vignette(g2d, width, height, 0, `rgba(244, 63, 94, ${missFlash * 0.6})`);
      }

      drawHud();

      // Popups above the HUD so they never get hidden behind it
      popups.forEach((pp) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, Math.min(1, pp.alpha));
        const k = reduced ? 1 : 1 + Math.max(0, pp.alpha - 0.8) * 1.2;
        g2d.translate(pp.x, pp.y);
        g2d.scale(k, k);
        fx.outlinedText(g2d, pp.text, 0, 0, { size: width < 640 ? 15 : 18, color: pp.color });
        g2d.restore();
      });

      if (finalT < 1.6 && !isGameOver) {
        fx.drawBanner(g2d, width, height, '⏰ 10 GIÂY CUỐI!', {
          t: finalT,
          duration: 1.6,
          accent: '#f43f5e',
          size: Math.min(36, width * 0.07)
        });
      }

      if (!isGameOver && !isPaused) drawToyHammer();

      const overlay = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (overlay !== overlayKey) {
        overlayKey = overlay;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '🎉',
          title: 'HẾT GIỜ ĐẬP CHUỘT!',
          subtitle: 'Bé đập chuột nhanh quá — chơi thêm ván nữa nhé!',
          lines: [
            `Điểm của bé|${score.toLocaleString('vi-VN')}`,
            `Đập trúng|${hits} chuột`,
            `Combo cao nhất|x${bestCombo}`,
            `Chế độ|${cfg.label}`
          ],
          hint: 'Bấm vào màn hình để chơi lại',
          accent: '#facc15',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để chơi tiếp.',
          accent: '#facc15',
          t: overlayT,
          backdrop: 0.55
        });
      }
    }

    function getPointerPos(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    canvas.addEventListener('pointermove', (evt) => {
      const pos = getPointerPos(evt);
      hammer.x = pos.x;
      hammer.y = pos.y;
      if (evt.pointerType === 'mouse') hammerVisible = true;
    });

    canvas.addEventListener('pointerleave', (evt) => {
      if (evt.pointerType === 'mouse') hammerVisible = false;
    });

    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      if (isGameOver) {
        resetGame();
        return;
      }
      hammerVisible = true;
      const pos = getPointerPos(evt);
      handleWhackAt(pos.x, pos.y);
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
      ArcadeHub.sound.click();
      setPaused(!isPaused);
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      updatePresentation(dt);
      updateGame(dt);
      drawScene();
      animId = requestAnimationFrame(loop);
    }

    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);

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
      }
    };
  }

  ArcadeHub.games.whackamole = {
    init: createWhackAMoleGame
  };
})(window);
