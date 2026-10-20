(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const DIFFICULTY_CONFIG = {
    easy: {
      label: 'DỄ (Tập rê chuột)',
      maxLives: 5,
      enemySpeedMult: 0.65,
      playerFollowSpeed: 7.5,
      scoreMult: 1.0,
      showHelperRings: true
    },
    hard: {
      label: 'KHÓ (x1.5 Điểm)',
      maxLives: 3,
      enemySpeedMult: 1.18,
      playerFollowSpeed: 9.0,
      scoreMult: 1.5,
      showHelperRings: false
    }
  };

  const EVOLUTION_TIERS = [
    { tier: 1, name: 'Cá Hề Nhỏ', radius: 20, needEat: 0, bodyColor: '#f97316', stripeColor: '#ffffff', finColor: '#ea580c' },
    { tier: 2, name: 'Cá Vàng Ánh Kim', radius: 28, needEat: 8, bodyColor: '#facc15', stripeColor: '#fde047', finColor: '#ca8a04' },
    { tier: 3, name: 'Cá Thiên Thần', radius: 37, needEat: 20, bodyColor: '#38bdf8', stripeColor: '#bae6fd', finColor: '#0284c7' },
    { tier: 4, name: 'Cá Hồng Ngọc', radius: 47, needEat: 36, bodyColor: '#ec4899', stripeColor: '#fbcfe8', finColor: '#be185d' },
    { tier: 5, name: 'Cá Mập Vua', radius: 60, needEat: 55, bodyColor: '#6366f1', stripeColor: '#e0e7ff', finColor: '#4338ca' }
  ];

  const NPC_SPECIES = [
    { tier: 1, radius: 13, speed: 68, points: 25, bodyColor: '#4ade80', tailColor: '#16a34a', stripeColor: '#bbf7d0' },
    { tier: 2, radius: 23, speed: 82, points: 50, bodyColor: '#38bdf8', tailColor: '#0284c7', stripeColor: '#e0f2fe' },
    { tier: 3, radius: 33, speed: 95, points: 90, bodyColor: '#c084fc', tailColor: '#7e22ce', stripeColor: '#f3e8ff' },
    { tier: 4, radius: 44, speed: 108, points: 150, bodyColor: '#fb7185', tailColor: '#be123c', stripeColor: '#ffe4e6' },
    { tier: 5, radius: 56, speed: 120, points: 250, bodyColor: '#ef4444', tailColor: '#7f1d1d', stripeColor: '#fecaca' }
  ];

  function createFeedingFrenzyGame(container, ctx) {
    let width = 920;
    let height = 530;
    let animId = null;
    let lastTime = performance.now();

    let difficulty = 'easy';
    let score = 0;
    let eatenCount = 0;
    let currentTierIdx = 0;
    let lives = 5;
    let isGameOver = false;
    let isPaused = false;

    // Player Fish State
    let player = {
      x: 460,
      y: 265,
      vx: 0,
      vy: 0,
      targetX: 460,
      targetY: 265,
      facingRight: true,
      angle: 0,
      tailPhase: 0,
      mouthOpen: 0,
      invincibleTimer: 0,
      boostTimer: 0
    };

    let npcFishes = [];
    let bubbles = [];
    let pearls = [];
    let popups = [];
    let seaweeds = [];
    let spawnTimer = 0;
    let pearlTimer = 5;

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#94a3b8;font-weight:700;">Chế độ luyện chuột:</span>
          <button type="button" class="pill-btn active" data-diff="easy">🟢 Chế độ Dễ (Cho bé tập chuột)</button>
          <button type="button" class="pill-btn" data-diff="hard">🔴 Chế độ Khó (x1.5 Điểm)</button>
        </div>
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#38bdf8;font-weight:600;">
            🖱 Di chuyển chuột để dẫn đường cho cá • Bấm chuột trái để bơi vọt nhanh!
          </span>
          <button type="button" class="pill-btn" id="ffPauseBtn">⏸ Tạm dừng</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="ffCanvas" class="game-canvas"></canvas>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#ffCanvas');
    const g2d = canvas.getContext('2d');
    const pauseBtn = shell.querySelector('#ffPauseBtn');

    function getCfg() {
      return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
    }

    function getCurrentTier() {
      return EVOLUTION_TIERS[currentTierIdx] || EVOLUTION_TIERS[0];
    }

    function initSeaweeds() {
      seaweeds = [];
      const count = 14;
      for (let i = 0; i < count; i++) {
        seaweeds.push({
          x: 40 + (i / (count - 1)) * (width - 80) + (Math.random() - 0.5) * 25,
          segments: 5 + Math.floor(Math.random() * 4),
          segLen: 12 + Math.random() * 6,
          color: i % 2 === 0 ? '#10b981' : '#059669',
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function resetGame() {
      const cfg = getCfg();
      score = 0;
      eatenCount = 0;
      currentTierIdx = 0;
      lives = cfg.maxLives;
      isGameOver = false;
      isPaused = false;

      player.x = width / 2;
      player.y = height / 2;
      player.targetX = width / 2;
      player.targetY = height / 2;
      player.vx = 0;
      player.vy = 0;
      player.invincibleTimer = 1.5;
      player.boostTimer = 0;

      npcFishes = [];
      bubbles = [];
      pearls = [];
      popups = [];
      spawnTimer = 0.2;
      pearlTimer = 4.0;

      initSeaweeds();
      for (let i = 0; i < 8; i++) {
        spawnNpcFish(true);
      }
      ctx.updateScore(0);
      pauseBtn.textContent = '⏸ Tạm dừng';
    }

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 1020);
      const maxH = Math.max(360, Math.min(window.innerHeight - 200, 560));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      initSeaweeds();
    }

    function addPopup(x, y, text, color, size) {
      popups.push({
        x,
        y,
        text,
        color: color || '#fef08a',
        size: size || 16,
        alpha: 1,
        vy: -42
      });
    }

    function spawnBubble(x, y, r) {
      bubbles.push({
        x,
        y,
        r: r || 3 + Math.random() * 5,
        vy: -35 - Math.random() * 45,
        wobble: Math.random() * Math.PI * 2
      });
    }

    function spawnNpcFish(initialRandomX) {
      const cfg = getCfg();
      const playerTier = getCurrentTier().tier;

      // Ensure plenty of edible smaller/equal fish (72% edible, 28% bigger predator)
      let chosenTier = 1;
      if (Math.random() < 0.72) {
        chosenTier = 1 + Math.floor(Math.random() * playerTier);
      } else {
        chosenTier = Math.min(5, playerTier + 1 + (Math.random() < 0.3 ? 1 : 0));
      }

      const spec = NPC_SPECIES[chosenTier - 1] || NPC_SPECIES[0];
      const fromLeft = Math.random() < 0.5;
      const startX = initialRandomX
        ? 60 + Math.random() * (width - 120)
        : fromLeft
        ? -spec.radius * 2
        : width + spec.radius * 2;
      const startY = 85 + Math.random() * (height - 155);
      const dir = fromLeft ? 1 : -1;
      const spd = spec.speed * cfg.enemySpeedMult * (0.82 + Math.random() * 0.36);

      npcFishes.push({
        tier: spec.tier,
        radius: spec.radius,
        points: spec.points,
        bodyColor: spec.bodyColor,
        tailColor: spec.tailColor,
        stripeColor: spec.stripeColor,
        x: startX,
        y: startY,
        vx: dir * spd,
        vy: (Math.random() - 0.5) * 22,
        facingRight: dir > 0,
        tailPhase: Math.random() * Math.PI * 2
      });
    }

    function updateGame(dt) {
      if (isGameOver || isPaused) return;
      const cfg = getCfg();
      const pTier = getCurrentTier();

      if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
      if (player.boostTimer > 0) player.boostTimer -= dt;
      if (player.mouthOpen > 0) player.mouthOpen = Math.max(0, player.mouthOpen - dt * 3.5);

      // Smooth spring-like movement toward mouse cursor
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.hypot(dx, dy);

      const boostMult = player.boostTimer > 0 ? 1.65 : 1.0;
      const followRate = cfg.playerFollowSpeed * boostMult;

      player.vx = dx * followRate;
      player.vy = dy * followRate;

      // Clamp max speed so movement feels natural and smooth for kids
      const maxSpd = (360 + currentTierIdx * 25) * boostMult;
      const curSpd = Math.hypot(player.vx, player.vy);
      if (curSpd > maxSpd) {
        player.vx = (player.vx / curSpd) * maxSpd;
        player.vy = (player.vy / curSpd) * maxSpd;
      }

      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Keep inside tank bounds
      player.x = Math.max(pTier.radius, Math.min(width - pTier.radius, player.x));
      player.y = Math.max(72 + pTier.radius, Math.min(height - 32 - pTier.radius, player.y));

      if (Math.abs(dx) > 4) {
        player.facingRight = dx > 0;
      }
      player.angle = Math.max(-0.45, Math.min(0.45, (player.vy / 320) * (player.facingRight ? 1 : -1)));
      player.tailPhase += dt * (8 + Math.min(14, curSpd * 0.04));

      if (player.boostTimer > 0 && Math.random() < 0.45) {
        spawnBubble(
          player.x + (player.facingRight ? -pTier.radius : pTier.radius),
          player.y,
          2.5 + Math.random() * 3
        );
      }

      // Spawn NPC fishes
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        if (npcFishes.length < 15) {
          spawnNpcFish(false);
        }
        spawnTimer = 0.75 + Math.random() * 0.55;
      }

      // Spawn Bonus Pearls on seabed
      pearlTimer -= dt;
      if (pearlTimer <= 0) {
        if (pearls.length < 2) {
          pearls.push({
            x: 90 + Math.random() * (width - 180),
            y: height - 34,
            r: 12,
            life: 9.0
          });
        }
        pearlTimer = 7 + Math.random() * 5;
      }

      // Check Pearl collection
      for (let i = pearls.length - 1; i >= 0; i--) {
        const pr = pearls[i];
        pr.life -= dt;
        if (pr.life <= 0) {
          pearls.splice(i, 1);
          continue;
        }
        if (Math.hypot(player.x - pr.x, player.y - pr.y) <= pTier.radius + pr.r) {
          pearls.splice(i, 1);
          const pts = Math.round(150 * cfg.scoreMult);
          score += pts;
          ctx.updateScore(score);
          ArcadeHub.sound.win();
          addPopup(pr.x, pr.y - 15, `🦪 NGỌC TRAI +${pts}!`, '#38bdf8', 18);
        }
      }

      // Update NPC Fishes & Collisions
      for (let i = npcFishes.length - 1; i >= 0; i--) {
        const f = npcFishes[i];
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.tailPhase += dt * 9;

        if (f.y < 80 + f.radius) f.vy = Math.abs(f.vy);
        if (f.y > height - 45 - f.radius) f.vy = -Math.abs(f.vy);

        // Despawn if far off-screen
        if (f.x < -140 || f.x > width + 140) {
          npcFishes.splice(i, 1);
          continue;
        }

        const distToPlayer = Math.hypot(player.x - f.x, player.y - f.y);
        const canEat = pTier.tier >= f.tier;

        // Open mouth when close to an edible fish
        if (canEat && distToPlayer < pTier.radius + f.radius + 26) {
          player.mouthOpen = Math.max(player.mouthOpen, 0.6);
        }

        if (distToPlayer < pTier.radius * 0.82 + f.radius * 0.78) {
          if (canEat) {
            // Eat the smaller fish!
            npcFishes.splice(i, 1);
            player.mouthOpen = 1.0;
            eatenCount += 1;
            const gained = Math.round(f.points * cfg.scoreMult);
            score += gained;
            ctx.updateScore(score);
            ArcadeHub.sound.move();
            addPopup(f.x, f.y, `+${gained}`, '#4ade80', 16);

            for (let b = 0; b < 4; b++) {
              spawnBubble(f.x, f.y, 2 + Math.random() * 4);
            }

            // Check Evolution Tier Up!
            if (
              currentTierIdx < EVOLUTION_TIERS.length - 1 &&
              eatenCount >= EVOLUTION_TIERS[currentTierIdx + 1].needEat
            ) {
              currentTierIdx += 1;
              const newTier = getCurrentTier();
              ArcadeHub.sound.win();
              addPopup(
                player.x,
                player.y - 35,
                `🌟 TIẾN HÓA CẤP ${newTier.tier}: ${newTier.name.toUpperCase()}!`,
                '#facc15',
                20
              );
            }
          } else if (player.invincibleTimer <= 0) {
            // Bitten by a bigger predator fish
            lives -= 1;
            player.invincibleTimer = 2.4;
            ArcadeHub.sound.hit();
            addPopup(player.x, player.y - 25, '💥 CÁ LỚN CẮN! -1 TIM', '#f43f5e', 18);

            // Gentle knockback away from predator
            const pushAng = Math.atan2(player.y - f.y, player.x - f.x);
            player.x += Math.cos(pushAng) * 42;
            player.y += Math.sin(pushAng) * 42;

            if (lives <= 0 && !isGameOver) {
              isGameOver = true;
              ArcadeHub.sound.gameOver();
              ctx.submitHighScore(
                score,
                `Cấp ${pTier.tier} (${pTier.name}) • Đã ăn ${eatenCount} cá`
              );
            }
          }
        }
      }

      // Ambient rising bubbles
      if (Math.random() < 0.08) {
        spawnBubble(40 + Math.random() * (width - 80), height - 25);
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += b.vy * dt;
        b.x += Math.sin(performance.now() * 0.004 + b.wobble) * 15 * dt;
        if (b.y < 55) bubbles.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const pp = popups[i];
        pp.y += pp.vy * dt;
        pp.alpha -= dt * 0.85;
        if (pp.alpha <= 0) popups.splice(i, 1);
      }
    }

    // =========================================================
    // CARTOON OCEAN & FISH DRAWING
    // =========================================================
    function drawCartoonFish(opts) {
      const {
        x,
        y,
        radius,
        facingRight,
        angle,
        tailPhase,
        bodyColor,
        stripeColor,
        finColor,
        mouthOpen,
        isPlayer,
        helperRingColor
      } = opts;

      g2d.save();
      g2d.translate(x, y);

      // Helper ring in Easy Mode for kids to easily spot edible fish
      if (helperRingColor) {
        g2d.strokeStyle = helperRingColor;
        g2d.lineWidth = 2;
        g2d.setLineDash([5, 4]);
        g2d.beginPath();
        g2d.arc(0, 0, radius * 1.28, 0, Math.PI * 2);
        g2d.stroke();
        g2d.setLineDash([]);
      }

      g2d.scale(facingRight ? 1 : -1, 1);
      if (angle) g2d.rotate(angle);

      const wag = Math.sin(tailPhase) * radius * 0.22;

      // 1. Wagging Tail Fin
      g2d.fillStyle = finColor;
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2.4;
      g2d.beginPath();
      g2d.moveTo(-radius * 0.85, 0);
      g2d.lineTo(-radius * 1.55, -radius * 0.65 + wag);
      g2d.quadraticCurveTo(-radius * 1.25, wag * 0.5, -radius * 1.55, radius * 0.65 + wag);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // 2. Dorsal Fin (Top)
      g2d.fillStyle = finColor;
      g2d.beginPath();
      g2d.moveTo(-radius * 0.35, -radius * 0.68);
      g2d.quadraticCurveTo(0, -radius * 1.18, radius * 0.35, -radius * 0.65);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // 3. Plump Glossy Fish Body
      const bodyGrad = g2d.createRadialGradient(
        -radius * 0.2,
        -radius * 0.25,
        radius * 0.15,
        0,
        0,
        radius * 1.15
      );
      bodyGrad.addColorStop(0, stripeColor);
      bodyGrad.addColorStop(0.35, bodyColor);
      bodyGrad.addColorStop(1, finColor);

      g2d.fillStyle = bodyGrad;
      g2d.beginPath();
      g2d.ellipse(0, 0, radius * 1.08, radius * 0.78, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Decorative Stripes
      g2d.strokeStyle = stripeColor;
      g2d.lineWidth = Math.max(2, radius * 0.14);
      g2d.lineCap = 'round';
      g2d.beginPath();
      g2d.arc(-radius * 0.1, 0, radius * 0.55, -0.85, 0.85);
      g2d.stroke();

      // 4. Mouth (opens when eating)
      g2d.fillStyle = '#7f1d1d';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;
      if (mouthOpen && mouthOpen > 0.1) {
        g2d.beginPath();
        g2d.arc(radius * 0.78, radius * 0.12, radius * 0.24 * mouthOpen, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
      } else {
        g2d.beginPath();
        g2d.arc(radius * 0.7, radius * 0.1, radius * 0.16, 0.2, 1.3);
        g2d.stroke();
      }

      // 5. Big Expressive Cartoon Eye
      const eyeX = radius * 0.48;
      const eyeY = -radius * 0.2;
      const eyeR = Math.max(4, radius * 0.24);
      g2d.fillStyle = '#ffffff';
      g2d.beginPath();
      g2d.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      g2d.fillStyle = '#090d16';
      g2d.beginPath();
      g2d.arc(eyeX + eyeR * 0.22, eyeY, eyeR * 0.52, 0, Math.PI * 2);
      g2d.fill();

      g2d.fillStyle = '#ffffff';
      g2d.beginPath();
      g2d.arc(eyeX + eyeR * 0.35, eyeY - eyeR * 0.25, eyeR * 0.22, 0, Math.PI * 2);
      g2d.fill();

      // 6. Side Pectoral Fin
      g2d.fillStyle = finColor;
      g2d.beginPath();
      g2d.ellipse(-radius * 0.08, radius * 0.22, radius * 0.28, radius * 0.16, 0.45, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Crown for Player Fish
      if (isPlayer) {
        g2d.fillStyle = '#facc15';
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 1.8;
        const cy = -radius * 0.85;
        g2d.beginPath();
        g2d.moveTo(-10, cy);
        g2d.lineTo(-12, cy - 11);
        g2d.lineTo(-4, cy - 5);
        g2d.lineTo(0, cy - 13);
        g2d.lineTo(4, cy - 5);
        g2d.lineTo(12, cy - 11);
        g2d.lineTo(10, cy);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
      }

      g2d.restore();
    }

    function drawInGameHud() {
      const pTier = getCurrentTier();
      const nextTier = EVOLUTION_TIERS[currentTierIdx + 1];

      g2d.save();
      // Top translucent HUD Bar
      g2d.fillStyle = 'rgba(7, 18, 38, 0.78)';
      g2d.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.roundRect(14, 10, width - 28, 52, 12);
      g2d.fill();
      g2d.stroke();

      // Hearts (Mạng)
      g2d.font = '800 18px "Segoe UI", sans-serif';
      g2d.textAlign = 'left';
      const heartsStr = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, getCfg().maxLives - lives));
      g2d.fillText(heartsStr, 28, 42);

      // Evolution Progress Bar
      const barX = 185;
      const barY = 22;
      const barW = 240;
      const barH = 14;
      let progress = 1;
      if (nextTier) {
        const prevNeed = pTier.needEat;
        progress = (eatenCount - prevNeed) / Math.max(1, nextTier.needEat - prevNeed);
      }

      g2d.fillStyle = '#e2e8f0';
      g2d.font = '700 12px "Segoe UI", sans-serif';
      g2d.fillText(
        nextTier
          ? `🐟 Cấp ${pTier.tier}: ${pTier.name} (${eatenCount}/${nextTier.needEat} để lên Cấp ${nextTier.tier})`
          : `👑 CẤP TỐI ĐA: ${pTier.name} (Nuốt mọi loài cá!)`,
        barX,
        barY + 28
      );

      g2d.fillStyle = '#1e293b';
      g2d.beginPath();
      g2d.roundRect(barX, barY, barW, barH, 7);
      g2d.fill();

      const progGrad = g2d.createLinearGradient(barX, 0, barX + barW, 0);
      progGrad.addColorStop(0, '#22c55e');
      progGrad.addColorStop(1, '#facc15');
      g2d.fillStyle = progGrad;
      g2d.beginPath();
      g2d.roundRect(barX, barY, barW * Math.max(0.05, Math.min(1, progress)), barH, 7);
      g2d.fill();

      // Score on Right
      g2d.textAlign = 'right';
      g2d.fillStyle = '#facc15';
      g2d.font = '900 20px "Segoe UI", sans-serif';
      g2d.fillText(`🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`, width - 28, 43);

      g2d.restore();
    }

    function drawScene() {
      const cfg = getCfg();
      const pTier = getCurrentTier();

      // 1. Deep Ocean Gradient Background
      const oceanGrad = g2d.createLinearGradient(0, 0, 0, height);
      oceanGrad.addColorStop(0, '#0284c7');
      oceanGrad.addColorStop(0.35, '#0369a1');
      oceanGrad.addColorStop(0.85, '#0c4a6e');
      oceanGrad.addColorStop(1, '#082f49');
      g2d.fillStyle = oceanGrad;
      g2d.fillRect(0, 0, width, height);

      // Shimmering Sunbeams (God Rays)
      g2d.save();
      for (let i = 0; i < 5; i++) {
        const rx = width * (0.15 + i * 0.18) + Math.sin(performance.now() * 0.0006 + i) * 30;
        const rayGrad = g2d.createLinearGradient(rx, 0, rx + 60, height * 0.85);
        rayGrad.addColorStop(0, 'rgba(186, 230, 253, 0.22)');
        rayGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
        g2d.fillStyle = rayGrad;
        g2d.beginPath();
        g2d.moveTo(rx - 28, 0);
        g2d.lineTo(rx + 28, 0);
        g2d.lineTo(rx + 120, height * 0.85);
        g2d.lineTo(rx - 40, height * 0.85);
        g2d.closePath();
        g2d.fill();
      }
      g2d.restore();

      // 2. Sandy Seabed & Swaying Seaweeds
      const sandGrad = g2d.createLinearGradient(0, height - 42, 0, height);
      sandGrad.addColorStop(0, '#fcd34d');
      sandGrad.addColorStop(1, '#d97706');
      g2d.fillStyle = sandGrad;
      g2d.beginPath();
      g2d.moveTo(0, height - 28);
      for (let sx = 0; sx <= width; sx += 80) {
        g2d.quadraticCurveTo(
          sx + 40,
          height - 36 - Math.sin(sx * 0.02) * 6,
          sx + 80,
          height - 28
        );
      }
      g2d.lineTo(width, height);
      g2d.lineTo(0, height);
      g2d.closePath();
      g2d.fill();

      // Swaying Seaweed Plants
      const nowSec = performance.now() * 0.0025;
      seaweeds.forEach((sw) => {
        g2d.save();
        g2d.strokeStyle = sw.color;
        g2d.lineWidth = 9;
        g2d.lineCap = 'round';
        g2d.beginPath();
        let cx = sw.x;
        let cy = height - 22;
        g2d.moveTo(cx, cy);
        for (let s = 1; s <= sw.segments; s++) {
          cx += Math.sin(nowSec + sw.phase + s * 0.6) * 7;
          cy -= sw.segLen;
          g2d.lineTo(cx, cy);
        }
        g2d.stroke();
        g2d.restore();
      });

      // Bonus Glowing Pearls on Seabed
      pearls.forEach((pr) => {
        g2d.save();
        g2d.fillStyle = '#7e22ce';
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 2;
        g2d.beginPath();
        g2d.ellipse(pr.x, pr.y + 5, 18, 8, 0, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();

        const pGrad = g2d.createRadialGradient(pr.x - 3, pr.y - 3, 2, pr.x, pr.y, pr.r);
        pGrad.addColorStop(0, '#ffffff');
        pGrad.addColorStop(0.6, '#f0abfc');
        pGrad.addColorStop(1, '#c084fc');
        g2d.fillStyle = pGrad;
        g2d.beginPath();
        g2d.arc(pr.x, pr.y - 2, pr.r, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
        g2d.restore();
      });

      // 3. Draw Target Cursor Ring (helps kids see where their mouse is guiding the fish)
      g2d.save();
      g2d.strokeStyle = 'rgba(250, 204, 21, 0.65)';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.arc(player.targetX, player.targetY, 12, 0, Math.PI * 2);
      g2d.stroke();
      g2d.fillStyle = '#facc15';
      g2d.beginPath();
      g2d.arc(player.targetX, player.targetY, 3.5, 0, Math.PI * 2);
      g2d.fill();
      g2d.restore();

      // 4. Draw NPC Fishes
      npcFishes.forEach((f) => {
        const canEat = pTier.tier >= f.tier;
        let ringCol = null;
        if (cfg.showHelperRings) {
          ringCol = canEat ? 'rgba(74, 222, 128, 0.55)' : 'rgba(248, 113, 113, 0.45)';
        }
        drawCartoonFish({
          x: f.x,
          y: f.y,
          radius: f.radius,
          facingRight: f.vx >= 0,
          angle: 0,
          tailPhase: f.tailPhase,
          bodyColor: f.bodyColor,
          stripeColor: f.stripeColor,
          finColor: f.tailColor,
          mouthOpen: 0,
          isPlayer: false,
          helperRingColor: ringCol
        });
      });

      // 5. Draw Player Fish
      g2d.save();
      if (player.invincibleTimer > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
        g2d.globalAlpha = 0.55;
      }
      drawCartoonFish({
        x: player.x,
        y: player.y,
        radius: pTier.radius,
        facingRight: player.facingRight,
        angle: player.angle,
        tailPhase: player.tailPhase,
        bodyColor: pTier.bodyColor,
        stripeColor: pTier.stripeColor,
        finColor: pTier.finColor,
        mouthOpen: player.mouthOpen,
        isPlayer: true,
        helperRingColor: null
      });
      g2d.restore();

      // 6. Rising Air Bubbles
      bubbles.forEach((b) => {
        g2d.save();
        g2d.strokeStyle = 'rgba(224, 242, 254, 0.75)';
        g2d.fillStyle = 'rgba(224, 242, 254, 0.18)';
        g2d.lineWidth = 1.4;
        g2d.beginPath();
        g2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
        g2d.restore();
      });

      // 7. Score Popups
      popups.forEach((pp) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, pp.alpha);
        g2d.fillStyle = pp.color;
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 3;
        g2d.font = `900 ${pp.size}px "Segoe UI", sans-serif`;
        g2d.textAlign = 'center';
        g2d.strokeText(pp.text, pp.x, pp.y);
        g2d.fillText(pp.text, pp.x, pp.y);
        g2d.restore();
      });

      // 8. In-Game Top HUD
      drawInGameHud();

      if (isGameOver || isPaused) {
        g2d.fillStyle = 'rgba(7, 15, 32, 0.82)';
        g2d.fillRect(0, 0, width, height);
        g2d.fillStyle = '#facc15';
        g2d.font = '800 30px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText(
          isGameOver ? '🐳 KẾT THÚC CHUYẾN PHIÊU LƯU ĐẠI DƯƠNG!' : '⏸ ĐANG TẠM DỪNG',
          width / 2,
          height / 2 - 20
        );
        g2d.fillStyle = '#38bdf8';
        g2d.font = '700 18px "Segoe UI", sans-serif';
        g2d.fillText(
          isGameOver
            ? `Điểm của bé: ${score.toLocaleString('vi-VN')} • Đã ăn: ${eatenCount} cá — Bấm chuột vào màn hình để chơi lại!`
            : 'Bấm nút Tiếp tục để bơi tiếp',
          width / 2,
          height / 2 + 22
        );
      }
    }

    function updateTargetFromPointer(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      player.targetX = Math.max(24, Math.min(width - 24, clientX - rect.left));
      player.targetY = Math.max(76, Math.min(height - 32, clientY - rect.top));
    }

    canvas.addEventListener('pointermove', (evt) => {
      updateTargetFromPointer(evt);
    });

    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      if (isGameOver) {
        resetGame();
        return;
      }
      updateTargetFromPointer(evt);
      player.boostTimer = 0.42;
      ArcadeHub.sound.boost();
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
      }
    };
  }

  ArcadeHub.games.feedingfrenzy = {
    init: createFeedingFrenzyGame
  };
})(window);
