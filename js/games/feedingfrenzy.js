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

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const shade = fx.shade;
    const sparks = fx.createParticles(260);
    const camShake = fx.createShake(9);
    let sceneTime = 0;
    let overlayT = 0;
    // Skips redraws once the pause panel has settled (the scene is frozen while paused)
    const idleGate = fx.createIdleGate();
    let overlayKey = '';
    let hurtTimer = 0;
    let evolveT = 10;
    const motes = Array.from({ length: 36 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vy: 0.008 + Math.random() * 0.02,
      r: 1 + Math.random() * 1.6,
      a: 0.25 + Math.random() * 0.45
    }));
    const corals = [
      { x: 0.07, kind: 'fan', s: 46, color: '#fb7185' },
      { x: 0.24, kind: 'brain', s: 40, color: '#f97316' },
      { x: 0.46, kind: 'fan', s: 36, color: '#c084fc' },
      { x: 0.68, kind: 'brain', s: 34, color: '#f472b6' },
      { x: 0.9, kind: 'fan', s: 50, color: '#facc15' }
    ];

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
          <button type="button" class="pill-btn" id="ffPauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
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
      sparks.clear();
      camShake.reset();
      hurtTimer = 0;
      evolveT = 10;
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
          sparks.burst(pr.x, pr.y, { count: 14, kind: 'star', speed: [60, 180], size: [3, 6], colors: ['#f0abfc', '#ffffff', '#fde047'] });
          sparks.ring(pr.x, pr.y, { to: 48, color: '#f0abfc' });
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
            sparks.burst(f.x, f.y, { count: 10, speed: [40, 150], size: [2, 4.5], colors: [f.bodyColor, f.stripeColor, '#ffffff'] });

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
              evolveT = 0;
              sparks.burst(player.x, player.y, {
                count: 40,
                kind: 'confetti',
                speed: [120, 300],
                life: [0.8, 1.4],
                size: [4, 7],
                gravity: 120,
                drag: 1.4,
                colors: [newTier.bodyColor, newTier.stripeColor, '#facc15', '#ffffff']
              });
              sparks.ring(player.x, player.y, { to: newTier.radius * 3, color: newTier.bodyColor });
            }
          } else if (player.invincibleTimer <= 0) {
            // Bitten by a bigger predator fish
            lives -= 1;
            player.invincibleTimer = 2.4;
            ArcadeHub.sound.hit();
            hurtTimer = 0.5;
            camShake.add(0.55);
            sparks.burst(player.x, player.y, { count: 12, speed: [60, 180], colors: ['#f43f5e', '#fecaca'] });
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
        b.x += Math.sin(sceneTime * 4 + b.wobble) * 15 * dt;
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
    // CARTOON OCEAN & FISH DRAWING (render-only)
    // =========================================================
    // Each size tier gets its own silhouette so kids can read "big vs small" at a glance.
    const FISH_SHAPES = [
      { rx: 1.0, ry: 0.82, tail: 'round', dorsal: 'normal', pattern: 'bands' }, // clownfish
      { rx: 1.12, ry: 0.68, tail: 'fork', dorsal: 'normal', pattern: 'scales' }, // goldfish
      { rx: 0.92, ry: 0.92, tail: 'round', dorsal: 'tall', pattern: 'bands' }, // angelfish
      { rx: 1.0, ry: 0.9, tail: 'round', dorsal: 'normal', pattern: 'spots' }, // puffer
      { rx: 1.25, ry: 0.6, tail: 'fork', dorsal: 'shark', pattern: 'belly', snout: true } // shark
    ];

    function fishBodyPath(rx, ry, shape) {
      g2d.beginPath();
      if (shape.snout) {
        g2d.moveTo(rx * 1.12, ry * 0.12);
        g2d.quadraticCurveTo(rx * 0.75, -ry * 1.15, -rx * 0.4, -ry * 0.92);
        g2d.quadraticCurveTo(-rx * 1.05, -ry * 0.45, -rx * 1.0, 0);
        g2d.quadraticCurveTo(-rx * 1.05, ry * 0.5, -rx * 0.4, ry * 0.88);
        g2d.quadraticCurveTo(rx * 0.75, ry * 1.0, rx * 1.12, ry * 0.12);
        g2d.closePath();
      } else {
        g2d.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      }
    }

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
        helperRingColor,
        tier,
        danger
      } = opts;
      const R = radius;
      const shape = FISH_SHAPES[(tier || 1) - 1] || FISH_SHAPES[0];
      const rx = R * shape.rx;
      const ry = R * shape.ry;
      const outline = '#0b1220';

      g2d.save();
      g2d.translate(x, y);

      // Helper ring in Easy Mode for kids to easily spot edible fish
      if (helperRingColor) {
        g2d.strokeStyle = helperRingColor;
        g2d.lineWidth = 2;
        g2d.setLineDash([5, 4]);
        g2d.lineDashOffset = -sceneTime * 12;
        g2d.beginPath();
        g2d.arc(0, 0, R * 1.32, 0, Math.PI * 2);
        g2d.stroke();
        g2d.setLineDash([]);
      }

      g2d.scale(facingRight ? 1 : -1, 1);
      if (angle) g2d.rotate(angle);

      const wag = Math.sin(tailPhase) * R * 0.22;
      g2d.lineJoin = 'round';
      g2d.lineCap = 'round';
      g2d.strokeStyle = outline;
      g2d.lineWidth = Math.max(1.6, R * 0.075);

      // 1. Tail fin
      const tx = -rx * 0.88;
      g2d.fillStyle = finColor;
      g2d.beginPath();
      g2d.moveTo(tx + R * 0.12, 0);
      if (shape.tail === 'fork') {
        g2d.lineTo(tx - R * 0.72, -R * 0.66 + wag);
        g2d.lineTo(tx - R * 0.42, wag * 0.4);
        g2d.lineTo(tx - R * 0.72, R * 0.66 + wag);
      } else {
        g2d.lineTo(tx - R * 0.68, -R * 0.6 + wag);
        g2d.quadraticCurveTo(tx - R * 0.38, wag * 0.5, tx - R * 0.68, R * 0.6 + wag);
      }
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // 2. Dorsal (and ventral) fins
      g2d.beginPath();
      if (shape.dorsal === 'shark') {
        g2d.moveTo(-rx * 0.3, -ry * 0.88);
        g2d.lineTo(-rx * 0.05, -ry * 1.8);
        g2d.quadraticCurveTo(rx * 0.08, -ry * 1.15, rx * 0.32, -ry * 0.85);
      } else if (shape.dorsal === 'tall') {
        g2d.moveTo(-rx * 0.5, -ry * 0.7);
        g2d.quadraticCurveTo(-rx * 0.35, -ry * 2.0 + wag * 0.3, rx * 0.25, -ry * 0.86);
      } else {
        g2d.moveTo(-rx * 0.38, -ry * 0.84);
        g2d.quadraticCurveTo(0, -ry * 1.5, rx * 0.36, -ry * 0.8);
      }
      g2d.closePath();
      g2d.fill();
      g2d.stroke();
      if (shape.dorsal === 'tall') {
        g2d.beginPath();
        g2d.moveTo(-rx * 0.5, ry * 0.7);
        g2d.quadraticCurveTo(-rx * 0.35, ry * 1.9 - wag * 0.3, rx * 0.2, ry * 0.86);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
      }

      // 3. Glossy body
      const bodyGrad = g2d.createRadialGradient(-rx * 0.25, -ry * 0.4, R * 0.1, 0, 0, R * 1.2);
      bodyGrad.addColorStop(0, stripeColor);
      bodyGrad.addColorStop(0.4, bodyColor);
      bodyGrad.addColorStop(1, finColor);
      fishBodyPath(rx, ry, shape);
      g2d.fillStyle = bodyGrad;
      g2d.fill();

      // Pattern clipped to the body
      g2d.save();
      g2d.clip();
      if (shape.pattern === 'bands') {
        [-0.38, 0.22].forEach((bx) => {
          g2d.fillStyle = 'rgba(11, 18, 32, 0.55)';
          g2d.fillRect(rx * bx - R * 0.13, -ry, R * 0.26, ry * 2);
          g2d.fillStyle = stripeColor;
          g2d.fillRect(rx * bx - R * 0.09, -ry, R * 0.18, ry * 2);
        });
      } else if (shape.pattern === 'scales') {
        g2d.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        g2d.lineWidth = Math.max(1, R * 0.05);
        const step = R * 0.32;
        for (let sx = -rx * 0.6; sx < rx * 0.4; sx += step) {
          for (let sy = -ry; sy < ry; sy += step) {
            g2d.beginPath();
            g2d.arc(sx, sy, step * 0.5, -1.2, 1.2);
            g2d.stroke();
          }
        }
      } else if (shape.pattern === 'spots') {
        g2d.fillStyle = shade(finColor, -0.25);
        [
          [-0.45, -0.35, 0.13],
          [-0.1, 0.45, 0.11],
          [0.15, -0.5, 0.09],
          [-0.6, 0.2, 0.1],
          [0.35, 0.35, 0.08]
        ].forEach(([sx, sy, sr]) => {
          g2d.beginPath();
          g2d.arc(rx * sx, ry * sy, R * sr, 0, Math.PI * 2);
          g2d.fill();
        });
      } else if (shape.pattern === 'belly') {
        g2d.fillStyle = '#f1f5f9';
        g2d.beginPath();
        g2d.ellipse(rx * 0.1, ry * 0.75, rx * 1.1, ry * 0.55, 0, 0, Math.PI * 2);
        g2d.fill();
      }
      // Top sheen
      g2d.fillStyle = 'rgba(255, 255, 255, 0.24)';
      g2d.beginPath();
      g2d.ellipse(-rx * 0.05, -ry * 0.52, rx * 0.62, ry * 0.2, -0.08, 0, Math.PI * 2);
      g2d.fill();
      g2d.restore();

      fishBodyPath(rx, ry, shape);
      g2d.strokeStyle = outline;
      g2d.lineWidth = Math.max(1.6, R * 0.075);
      g2d.stroke();

      // Gill line
      g2d.strokeStyle = 'rgba(11, 18, 32, 0.35)';
      g2d.lineWidth = Math.max(1, R * 0.05);
      g2d.beginPath();
      g2d.arc(rx * 0.2, 0, ry * 0.62, -0.9, 0.9);
      g2d.stroke();

      // 4. Side pectoral fin (flaps with the tail)
      g2d.fillStyle = finColor;
      g2d.strokeStyle = outline;
      g2d.lineWidth = Math.max(1.4, R * 0.06);
      g2d.beginPath();
      g2d.ellipse(-rx * 0.08, ry * 0.3, R * 0.28, R * 0.15, 0.45 + Math.sin(tailPhase) * 0.2, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // 5. Mouth (opens when eating); predators show little teeth
      const mouthX = shape.snout ? rx * 0.8 : rx * 0.78;
      const mouthY = shape.snout ? ry * 0.35 : ry * 0.14;
      g2d.lineWidth = Math.max(1.4, R * 0.06);
      if (mouthOpen && mouthOpen > 0.1) {
        g2d.fillStyle = '#7f1d1d';
        g2d.beginPath();
        g2d.arc(mouthX, mouthY, R * 0.24 * mouthOpen, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
      } else {
        g2d.beginPath();
        g2d.arc(mouthX - R * 0.08, mouthY - R * 0.02, R * 0.15, 0.2, 1.3);
        g2d.stroke();
      }
      if (danger) {
        g2d.fillStyle = '#ffffff';
        for (let k = 0; k < 3; k++) {
          const tx2 = mouthX - R * 0.22 + k * R * 0.1;
          g2d.beginPath();
          g2d.moveTo(tx2, mouthY);
          g2d.lineTo(tx2 + R * 0.05, mouthY + R * 0.1);
          g2d.lineTo(tx2 + R * 0.1, mouthY);
          g2d.closePath();
          g2d.fill();
        }
      }

      // 6. Big expressive eye
      const eyeX = rx * (shape.snout ? 0.55 : 0.45);
      const eyeY = -ry * 0.24;
      const eyeR = Math.max(4, R * (shape.snout ? 0.17 : 0.24));
      g2d.fillStyle = '#ffffff';
      g2d.strokeStyle = outline;
      g2d.lineWidth = Math.max(1.4, R * 0.06);
      g2d.beginPath();
      g2d.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();
      g2d.fillStyle = '#0b1220';
      g2d.beginPath();
      g2d.arc(eyeX + eyeR * 0.22, eyeY, eyeR * 0.54, 0, Math.PI * 2);
      g2d.fill();
      g2d.fillStyle = '#ffffff';
      g2d.beginPath();
      g2d.arc(eyeX + eyeR * 0.36, eyeY - eyeR * 0.26, eyeR * 0.22, 0, Math.PI * 2);
      g2d.fill();
      if (danger) {
        // Angry brow: "this one is bigger than you"
        g2d.strokeStyle = outline;
        g2d.lineWidth = Math.max(2, R * 0.09);
        g2d.beginPath();
        g2d.moveTo(eyeX - eyeR * 1.1, eyeY - eyeR * 1.45);
        g2d.lineTo(eyeX + eyeR * 0.95, eyeY - eyeR * 0.85);
        g2d.stroke();
      } else if (isPlayer) {
        g2d.fillStyle = 'rgba(244, 114, 182, 0.45)';
        g2d.beginPath();
        g2d.ellipse(eyeX - eyeR * 0.2, eyeY + eyeR * 1.5, eyeR * 0.6, eyeR * 0.32, 0, 0, Math.PI * 2);
        g2d.fill();
      }

      // Crown for the player fish (scales with size)
      if (isPlayer) {
        const k = Math.max(0.8, R / 24);
        const cy = -ry - (shape.dorsal === 'shark' ? R * 0.35 : R * 0.1);
        g2d.save();
        g2d.translate(-rx * 0.05, cy);
        g2d.scale(k, k);
        g2d.fillStyle = '#facc15';
        g2d.strokeStyle = outline;
        g2d.lineWidth = 1.8;
        g2d.beginPath();
        g2d.moveTo(-10, 0);
        g2d.lineTo(-12, -11);
        g2d.lineTo(-4, -5);
        g2d.lineTo(0, -13);
        g2d.lineTo(4, -5);
        g2d.lineTo(12, -11);
        g2d.lineTo(10, 0);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
        g2d.fillStyle = '#f43f5e';
        g2d.beginPath();
        g2d.arc(0, -5, 1.8, 0, Math.PI * 2);
        g2d.fill();
        g2d.restore();
      }

      g2d.restore();
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

    function drawInGameHud() {
      const pTier = getCurrentTier();
      const nextTier = EVOLUTION_TIERS[currentTierIdx + 1];
      const compact = width < 640;

      g2d.save();
      fx.roundRectPath(g2d, 12, 10, width - 24, 52, 14);
      g2d.fillStyle = 'rgba(4, 20, 40, 0.74)';
      g2d.fill();
      g2d.strokeStyle = 'rgba(125, 211, 252, 0.45)';
      g2d.lineWidth = 1.5;
      g2d.stroke();

      const maxLives = getCfg().maxLives;
      const hs = compact ? 14 : 18;
      for (let i = 0; i < maxLives; i++) {
        drawHudHeart(30 + i * (hs + 4), 36, hs, i >= lives);
      }
      const heartsW = maxLives * (hs + 4) + 24;

      const scoreSize = compact ? 16 : 20;
      const scoreText = compact ? `🏆 ${score.toLocaleString('vi-VN')}` : `🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`;
      g2d.font = fx.font(scoreSize, 900);
      const scoreW = g2d.measureText(scoreText).width;
      fx.outlinedText(g2d, scoreText, width - 26, 36, { size: scoreSize, color: '#facc15', align: 'right' });

      // Evolution progress bar fills the space between hearts and score
      const barX = 14 + heartsW;
      const barW = Math.max(60, Math.min(280, width - barX - scoreW - 48));
      const barY = 19;
      const barH = 12;
      let progress = 1;
      if (nextTier) {
        const prevNeed = pTier.needEat;
        progress = (eatenCount - prevNeed) / Math.max(1, nextTier.needEat - prevNeed);
      }
      progress = Math.max(0.04, Math.min(1, progress));
      fx.roundRectPath(g2d, barX, barY, barW, barH, 6);
      g2d.fillStyle = 'rgba(15, 23, 42, 0.9)';
      g2d.fill();
      const progGrad = g2d.createLinearGradient(barX, 0, barX + barW, 0);
      progGrad.addColorStop(0, '#22c55e');
      progGrad.addColorStop(1, '#facc15');
      fx.roundRectPath(g2d, barX, barY, barW * progress, barH, 6);
      g2d.fillStyle = progGrad;
      g2d.fill();
      g2d.fillStyle = 'rgba(255,255,255,0.35)';
      g2d.fillRect(barX + 4, barY + 2, Math.max(0, barW * progress - 8), 2);

      const label = nextTier
        ? compact
          ? `Cấp ${pTier.tier} • ${eatenCount}/${nextTier.needEat}`
          : `🐟 Cấp ${pTier.tier}: ${pTier.name} (${eatenCount}/${nextTier.needEat} để lên Cấp ${nextTier.tier})`
        : compact
        ? `👑 Cấp tối đa`
        : `👑 CẤP TỐI ĐA: ${pTier.name} (Nuốt mọi loài cá!)`;
      const ls = fx.fitFontSize(g2d, label, barW + 40, 12, 9, 700);
      g2d.font = fx.font(ls, 700);
      g2d.textAlign = 'left';
      g2d.textBaseline = 'middle';
      g2d.fillStyle = '#e0f2fe';
      g2d.fillText(label, barX, barY + barH + 12);
      g2d.restore();
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused || isGameOver) {
        // Particles still settle on the game-over screen; nothing moves while paused
        if (isGameOver) sparks.update(dt);
        return;
      }
      sceneTime += dt;
      sparks.update(dt);
      camShake.update(dt);
      if (hurtTimer > 0) hurtTimer = Math.max(0, hurtTimer - dt);
      if (evolveT < 10) evolveT += dt;
      motes.forEach((m) => {
        m.y -= m.vy * dt;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
      });
    }

    function drawBackdrop() {
      // Ocean: bright surface to deep blue
      const oceanGrad = g2d.createLinearGradient(0, 0, 0, height);
      oceanGrad.addColorStop(0, '#22d3ee');
      oceanGrad.addColorStop(0.18, '#0ea5e9');
      oceanGrad.addColorStop(0.6, '#0369a1');
      oceanGrad.addColorStop(1, '#0b2545');
      g2d.fillStyle = oceanGrad;
      g2d.fillRect(0, 0, width, height);

      // Surface caustics: wavy light lines near the top
      g2d.save();
      g2d.strokeStyle = 'rgba(224, 242, 254, 0.18)';
      g2d.lineWidth = 2;
      for (let row = 0; row < 3; row++) {
        g2d.beginPath();
        const baseY = 70 + row * 18;
        for (let x = 0; x <= width; x += 16) {
          const yy = baseY + Math.sin(x * 0.035 + sceneTime * (1.4 + row * 0.3) + row) * 4;
          if (x === 0) g2d.moveTo(x, yy);
          else g2d.lineTo(x, yy);
        }
        g2d.stroke();
      }
      g2d.restore();

      // God rays
      g2d.save();
      g2d.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const rx = width * (0.12 + i * 0.19) + Math.sin(sceneTime * 0.6 + i) * 30;
        const rayGrad = g2d.createLinearGradient(rx, 0, rx + 60, height * 0.85);
        rayGrad.addColorStop(0, 'rgba(186, 230, 253, 0.16)');
        rayGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
        g2d.fillStyle = rayGrad;
        g2d.beginPath();
        g2d.moveTo(rx - 26, 0);
        g2d.lineTo(rx + 26, 0);
        g2d.lineTo(rx + 120, height * 0.85);
        g2d.lineTo(rx - 40, height * 0.85);
        g2d.closePath();
        g2d.fill();
      }
      g2d.restore();

      // Distant fish school silhouettes (pure decoration, behind everything)
      g2d.save();
      g2d.fillStyle = 'rgba(8, 47, 73, 0.35)';
      for (let s = 0; s < 2; s++) {
        const span = width + 260;
        const dir = s === 0 ? 1 : -1;
        const baseX = (((sceneTime * (18 + s * 8) + s * 400) % span) + span) % span - 130;
        const sx = dir > 0 ? baseX : width - baseX;
        const sy = height * (0.35 + s * 0.2);
        for (let k = 0; k < 9; k++) {
          const fxp = sx - dir * (k % 3) * 16 - dir * Math.floor(k / 3) * 9;
          const fyp = sy + (Math.floor(k / 3) - 1) * 12 + Math.sin(sceneTime * 2 + k) * 2;
          g2d.beginPath();
          g2d.ellipse(fxp, fyp, 6, 2.6, 0, 0, Math.PI * 2);
          g2d.moveTo(fxp - dir * 5, fyp);
          g2d.lineTo(fxp - dir * 10, fyp - 3);
          g2d.lineTo(fxp - dir * 10, fyp + 3);
          g2d.fill();
        }
      }
      g2d.restore();

      // Far reef silhouettes
      g2d.fillStyle = 'rgba(8, 47, 73, 0.55)';
      g2d.beginPath();
      g2d.moveTo(0, height);
      for (let x = 0; x <= width + 40; x += 40) {
        g2d.lineTo(x, height - 70 - (Math.sin(x * 0.011) + 1) * 22 - (x % 120 === 0 ? 14 : 0));
      }
      g2d.lineTo(width, height);
      g2d.closePath();
      g2d.fill();

      // Plankton motes
      g2d.fillStyle = 'rgba(224, 242, 254, 0.5)';
      motes.forEach((m) => {
        g2d.globalAlpha = m.a;
        g2d.fillRect(m.x * width + Math.sin(sceneTime + m.x * 10) * 6, m.y * height, m.r, m.r);
      });
      g2d.globalAlpha = 1;

      // Sandy seabed
      const sandGrad = g2d.createLinearGradient(0, height - 44, 0, height);
      sandGrad.addColorStop(0, '#fde68a');
      sandGrad.addColorStop(1, '#b45309');
      g2d.fillStyle = sandGrad;
      g2d.beginPath();
      g2d.moveTo(0, height - 28);
      for (let sx = 0; sx <= width; sx += 80) {
        g2d.quadraticCurveTo(sx + 40, height - 38 - Math.sin(sx * 0.02) * 6, sx + 80, height - 28);
      }
      g2d.lineTo(width, height);
      g2d.lineTo(0, height);
      g2d.closePath();
      g2d.fill();
      // Pebbles
      for (let i = 0; i < Math.floor(width / 38); i++) {
        const px = (i * 97.3) % width;
        const py = height - 14 + ((i * 7) % 9) - 4;
        g2d.fillStyle = i % 3 === 0 ? 'rgba(120, 53, 15, 0.45)' : 'rgba(255, 251, 235, 0.45)';
        g2d.beginPath();
        g2d.ellipse(px, py, 3 + (i % 3), 2, 0, 0, Math.PI * 2);
        g2d.fill();
      }

      // Corals
      corals.forEach((c) => {
        const cx = c.x * width;
        const cy = height - 26;
        g2d.save();
        g2d.translate(cx, cy);
        if (c.kind === 'fan') {
          g2d.strokeStyle = c.color;
          g2d.lineWidth = 3;
          g2d.lineCap = 'round';
          for (let k = -3; k <= 3; k++) {
            const a = -Math.PI / 2 + k * 0.28 + Math.sin(sceneTime * 1.2 + c.x * 9) * 0.04;
            g2d.beginPath();
            g2d.moveTo(0, 0);
            g2d.quadraticCurveTo(Math.cos(a) * c.s * 0.5, Math.sin(a) * c.s * 0.6, Math.cos(a) * c.s, Math.sin(a) * c.s);
            g2d.stroke();
          }
        } else {
          g2d.fillStyle = c.color;
          g2d.strokeStyle = 'rgba(11, 18, 32, 0.5)';
          g2d.lineWidth = 2;
          g2d.beginPath();
          g2d.ellipse(0, -c.s * 0.3, c.s * 0.6, c.s * 0.42, 0, Math.PI, 0);
          g2d.closePath();
          g2d.fill();
          g2d.stroke();
          g2d.strokeStyle = 'rgba(255,255,255,0.35)';
          g2d.lineWidth = 1.5;
          for (let k = 0; k < 3; k++) {
            g2d.beginPath();
            g2d.arc(0, -c.s * 0.3, c.s * (0.18 + k * 0.13), Math.PI * 1.1, Math.PI * 1.9);
            g2d.stroke();
          }
        }
        g2d.restore();
      });

      // Swaying seaweed with tapered two-tone strands
      seaweeds.forEach((sw) => {
        const pts = [];
        let cx = sw.x;
        let cy = height - 22;
        pts.push([cx, cy]);
        for (let s = 1; s <= sw.segments; s++) {
          cx += Math.sin(sceneTime * 2.5 + sw.phase + s * 0.6) * 7;
          cy -= sw.segLen;
          pts.push([cx, cy]);
        }
        g2d.save();
        g2d.lineCap = 'round';
        g2d.lineJoin = 'round';
        [
          [10, shade(sw.color, -0.35)],
          [6, sw.color],
          [2, 'rgba(187, 247, 208, 0.6)']
        ].forEach(([lw, col]) => {
          g2d.strokeStyle = col;
          g2d.lineWidth = lw;
          g2d.beginPath();
          pts.forEach(([px, py], idx) => (idx === 0 ? g2d.moveTo(px, py) : g2d.lineTo(px, py)));
          g2d.stroke();
        });
        g2d.restore();
      });
    }

    function drawScene() {
      const cfg = getCfg();
      const pTier = getCurrentTier();

      drawBackdrop();

      g2d.save();
      camShake.apply(g2d);

      // Bonus pearls in open clam shells
      pearls.forEach((pr) => {
        const blink = pr.life < 2.5 && Math.floor(sceneTime * 6) % 2 === 0;
        g2d.save();
        g2d.globalAlpha = blink ? 0.45 : 1;
        fx.glow(g2d, pr.x, pr.y - 2, 34, '#f0abfc', 0.45 + Math.sin(sceneTime * 4) * 0.15);
        g2d.strokeStyle = '#0b1220';
        g2d.lineWidth = 2;
        // Lower shell
        g2d.fillStyle = '#7e22ce';
        g2d.beginPath();
        g2d.ellipse(pr.x, pr.y + 5, 19, 8, 0, 0, Math.PI);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
        // Upper shell (open lid)
        g2d.fillStyle = '#a855f7';
        g2d.beginPath();
        g2d.ellipse(pr.x, pr.y - 6, 18, 9, 0, Math.PI, 0);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
        const pGrad = g2d.createRadialGradient(pr.x - 3, pr.y - 1, 1, pr.x, pr.y + 2, pr.r * 0.75);
        pGrad.addColorStop(0, '#ffffff');
        pGrad.addColorStop(0.6, '#fbcfe8');
        pGrad.addColorStop(1, '#e879f9');
        g2d.fillStyle = pGrad;
        g2d.beginPath();
        g2d.arc(pr.x, pr.y + 2, pr.r * 0.7, 0, Math.PI * 2);
        g2d.fill();
        g2d.restore();
      });

      // Target cursor (helps kids see where they are guiding the fish)
      if (!isGameOver) {
        const pulse = 1 + Math.sin(sceneTime * 5) * 0.12;
        g2d.save();
        g2d.strokeStyle = 'rgba(250, 204, 21, 0.7)';
        g2d.lineWidth = 2;
        g2d.beginPath();
        g2d.arc(player.targetX, player.targetY, 12 * pulse, 0, Math.PI * 2);
        g2d.stroke();
        g2d.fillStyle = '#facc15';
        g2d.beginPath();
        g2d.arc(player.targetX, player.targetY, 3.5, 0, Math.PI * 2);
        g2d.fill();
        g2d.restore();
      }

      // NPC fishes
      npcFishes.forEach((f) => {
        const canEat = pTier.tier >= f.tier;
        let ringCol = null;
        if (cfg.showHelperRings) {
          ringCol = canEat ? 'rgba(74, 222, 128, 0.6)' : 'rgba(248, 113, 113, 0.5)';
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
          helperRingColor: ringCol,
          tier: f.tier,
          danger: !canEat
        });
      });

      // Player fish
      g2d.save();
      if (player.invincibleTimer > 0 && Math.floor(sceneTime * 11) % 2 === 0) {
        g2d.globalAlpha = 0.55;
      }
      if (player.boostTimer > 0) {
        fx.glow(g2d, player.x, player.y, pTier.radius * 2, '#fde047', 0.35);
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
        helperRingColor: null,
        tier: pTier.tier,
        danger: false
      });
      g2d.restore();

      // Rising air bubbles with a highlight
      bubbles.forEach((b) => {
        g2d.strokeStyle = 'rgba(224, 242, 254, 0.75)';
        g2d.fillStyle = 'rgba(224, 242, 254, 0.14)';
        g2d.lineWidth = 1.3;
        g2d.beginPath();
        g2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
        g2d.fillStyle = 'rgba(255, 255, 255, 0.8)';
        g2d.beginPath();
        g2d.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.8, b.r * 0.25), 0, Math.PI * 2);
        g2d.fill();
      });

      sparks.draw(g2d);

      // Score popups
      popups.forEach((pp) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, Math.min(1, pp.alpha));
        fx.outlinedText(g2d, pp.text, pp.x, pp.y, { size: pp.size, color: pp.color });
        g2d.restore();
      });
      g2d.restore();

      // Depth vignette + hurt flash
      fx.vignette(g2d, width, height, 0.35);
      if (hurtTimer > 0) {
        fx.vignette(g2d, width, height, 0, `rgba(239, 68, 68, ${hurtTimer * 0.9})`);
      }

      drawInGameHud();

      if (evolveT < 2 && !isGameOver) {
        fx.drawBanner(g2d, width, height, `🌟 TIẾN HÓA CẤP ${pTier.tier}!`, {
          t: evolveT,
          duration: 2,
          accent: pTier.bodyColor,
          sub: pTier.name,
          size: Math.min(40, width * 0.075)
        });
      }

      const overlay = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (overlay !== overlayKey) {
        overlayKey = overlay;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '🐳',
          title: 'KẾT THÚC CHUYẾN PHIÊU LƯU!',
          subtitle: 'Bé bơi giỏi lắm — cùng lặn tiếp nhé!',
          lines: [
            `Điểm của bé|${score.toLocaleString('vi-VN')}`,
            `Cá đã ăn|${eatenCount}`,
            `Cấp đạt được|${pTier.tier} • ${pTier.name}`
          ],
          hint: 'Bấm vào màn hình để chơi lại',
          accent: '#38bdf8',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để bơi tiếp.',
          accent: '#38bdf8',
          t: overlayT,
          backdrop: 0.55
        });
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
      if (isPaused) return;
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
      ArcadeHub.sound.click();
      setPaused(!isPaused);
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (idleGate.shouldSkip(isPaused && !isGameOver && overlayKey === 'pause' && overlayT >= 0.6, canvas, now)) {
        animId = requestAnimationFrame(loop);
        return;
      }
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

  ArcadeHub.games.feedingfrenzy = {
    init: createFeedingFrenzyGame
  };
})(window);
