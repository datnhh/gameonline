(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const DIFFICULTY_MODES = {
    easy: {
      label: 'DỄ',
      spawnIntervalBase: 2.1,
      enemySpeedMult: 0.78,
      enemyHpMult: 0.8,
      enemyDamageMult: 0.65,
      scoreMult: 1.0,
      hitBoxBonus: 12,
      startCannons: 14
    },
    hard: {
      label: 'KHÓ',
      spawnIntervalBase: 1.35,
      enemySpeedMult: 1.25,
      enemyHpMult: 1.25,
      enemyDamageMult: 1.3,
      scoreMult: 1.6,
      hitBoxBonus: 0,
      startCannons: 8
    }
  };

  function createBeachHeadGame(container, ctx) {
    let width = 920;
    let height = 540;
    let animId = null;
    let lastTime = performance.now();

    // Game State
    let difficulty = 'easy'; // 'easy' | 'hard'
    let score = 0;
    let wave = 1;
    let killsInWave = 0;
    let waveTargetKills = 12;
    let bunkerHp = 100;
    const maxHp = 100;
    let cannonAmmo = 14;
    let isGameOver = false;
    let isPaused = false;
    let autoFire = false;

    // 3D Aim & Turret State
    let aimX = 460;
    let aimY = 240;
    let isFiringMG = false;
    let mgCooldown = 0;
    let cannonCooldown = 0;
    let barrelToggle = 0;
    let recoilLeft = 0;
    let recoilRight = 0;
    let muzzleFlashTimer = 0;
    let screenShake = 0;
    let damageVignette = 0;

    // Entities in 3D space (worldX in [-1.2..1.2], worldY in [-1..0.4], z in [0.15..1.0])
    let bullets = [];
    let enemies = [];
    let enemyProjectiles = [];
    let particles = [];
    let shellCasings = [];
    let floatingTexts = [];
    let spawnTimer = 0;

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#94a3b8;font-weight:700;">Chế độ chơi:</span>
          <button type="button" class="pill-btn active" data-diff="easy">🟢 Chế độ Dễ</button>
          <button type="button" class="pill-btn" data-diff="hard">🔴 Chế độ Khó (x1.6 Điểm)</button>
        </div>
        <div class="toolbar-group">
          <button type="button" class="pill-btn" id="bhAutoFireBtn">🎯 Tự động bắn: TẮT</button>
          <button type="button" class="pill-btn" id="bhPauseBtn">⏸ Tạm dừng</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="bhCanvas" class="game-canvas"></canvas>
      </div>

      <div class="touch-controls">
        <div class="touch-cluster">
          <span style="font-size:0.78rem;color:#94a3b8;">
            💡 Di chuột/Chạm kéo để xoay tháp pháo 3D • Chuột phải hoặc Phím Space để bắn Đại Pháo
          </span>
        </div>
        <div class="touch-cluster">
          <button type="button" class="touch-btn" id="bhTouchMG">🔥 SÚNG MÁY ĐÔI</button>
          <button type="button" class="touch-btn action-danger" id="bhTouchCannon">🚀 ĐẠI PHÁO (SPACE)</button>
        </div>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#bhCanvas');
    const g2d = canvas.getContext('2d');
    const autoFireBtn = shell.querySelector('#bhAutoFireBtn');
    const pauseBtn = shell.querySelector('#bhPauseBtn');
    const touchMGBtn = shell.querySelector('#bhTouchMG');
    const touchCannonBtn = shell.querySelector('#bhTouchCannon');

    function getDiffCfg() {
      return DIFFICULTY_MODES[difficulty] || DIFFICULTY_MODES.easy;
    }

    function resetGame() {
      const cfg = getDiffCfg();
      score = 0;
      wave = 1;
      killsInWave = 0;
      waveTargetKills = 12;
      bunkerHp = 100;
      cannonAmmo = cfg.startCannons;
      isGameOver = false;
      isPaused = false;
      recoilLeft = 0;
      recoilRight = 0;
      muzzleFlashTimer = 0;
      screenShake = 0;
      damageVignette = 0;

      bullets = [];
      enemies = [];
      enemyProjectiles = [];
      particles = [];
      shellCasings = [];
      floatingTexts = [];
      spawnTimer = 0.5;
      sparks.clear();
      flashes.length = 0;
      waveBanner = null;
      hitMarker = 0;
      ctx.updateScore(0);
      updateToolbarUI();
    }

    function updateToolbarUI() {
      autoFireBtn.textContent = autoFire ? '🎯 Tự động bắn: BẬT' : '🎯 Tự động bắn: TẮT';
      autoFireBtn.classList.toggle('active', autoFire);
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
    }

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 1020);
      const maxH = Math.max(360, Math.min(window.innerHeight - 220, 560));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      aimX = width / 2;
      aimY = height * 0.44;
    }

    // 3D Projection Helper: converts (worldX, worldY, z) into screen (sx, sy, scale)
    // z = 1.0 is far horizon, z = 0.16 is right in front of the bunker
    function project3D(worldX, worldY, z) {
      const safeZ = Math.max(0.14, z);
      const scale = 0.34 / safeZ;
      const horizonY = height * 0.44;
      const camPanX = ((aimX - width * 0.5) / width) * -55;
      const camPanY = ((aimY - height * 0.44) / height) * -24;

      const sx = width * 0.5 + camPanX * (1 - safeZ * 0.4) + worldX * (width * 0.44) * scale;
      const sy = horizonY + camPanY + worldY * (height * 0.32) * scale;
      return { sx, sy, scale };
    }

    function spawnExplosion3D(sx, sy, scale, isBig) {
      const count = isBig ? 38 : 16;
      const baseScale = Math.max(0.45, Math.min(2.2, scale));

      // Shockwave ring
      particles.push({
        kind: 'ring',
        x: sx,
        y: sy,
        radius: 6 * baseScale,
        maxRadius: (isBig ? 90 : 38) * baseScale,
        alpha: 0.9,
        life: 0.32,
        color: isBig ? '#fde047' : '#38bdf8'
      });

      // Sparks, debris and a light flash (presentation only)
      sparks.burst(sx, sy, {
        kind: 'spark',
        count: isBig ? 24 : 7,
        speed: [140 * baseScale, 460 * baseScale],
        life: [0.25, 0.6],
        size: [1.4, 3],
        gravity: 320,
        drag: 1.4,
        colors: ['#fef3c7', '#fde047', '#fb923c']
      });
      if (isBig) {
        sparks.burst(sx, sy, {
          kind: 'dot',
          count: 10,
          speed: [80 * baseScale, 260 * baseScale],
          life: [0.5, 0.9],
          size: [1.6, 3.2],
          gravity: 520,
          drag: 0.6,
          additive: false,
          colors: ['#1c1917', '#292524', '#44403c']
        });
      }
      addFlash(sx, sy, (isBig ? 120 : 46) * baseScale, isBig ? '#fdba74' : '#7dd3fc', isBig ? 0.22 : 0.1);

      // Smoke & Fireballs
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (25 + Math.random() * (isBig ? 170 : 85)) * baseScale;
        const isSmoke = i % 3 === 0;
        particles.push({
          kind: isSmoke ? 'smoke' : 'fire',
          x: sx + (Math.random() - 0.5) * 12 * baseScale,
          y: sy + (Math.random() - 0.5) * 12 * baseScale,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - (isSmoke ? 35 : 15),
          radius: (isSmoke ? 10 + Math.random() * 14 : 4 + Math.random() * 9) * baseScale,
          color: isSmoke
            ? '#334155'
            : Math.random() < 0.35
            ? '#fef08a'
            : Math.random() < 0.65
            ? '#f97316'
            : '#dc2626',
          alpha: 1,
          life: isSmoke ? 0.65 + Math.random() * 0.45 : 0.28 + Math.random() * 0.35
        });
      }
    }

    function addFloatingText(x, y, text, color) {
      floatingTexts.push({
        x,
        y,
        text,
        color: color || '#fbbf24',
        alpha: 1,
        vy: -42
      });
    }

    function spawnEnemy() {
      const cfg = getDiffCfg();
      const roll = Math.random();

      if (roll < 0.11) {
        // 3D Supply Drop Crate
        enemies.push({
          type: 'supply',
          worldX: (Math.random() - 0.5) * 1.4,
          worldY: -0.95,
          z: 0.48 + Math.random() * 0.25,
          vx: (Math.random() - 0.5) * 0.08,
          vy: 0.22,
          vz: 0,
          hp: 25,
          maxHp: 25,
          baseRadius: 24,
          points: 150,
          attackCooldown: 999
        });
        return;
      }

      if (roll < 0.42) {
        // 3D Paratrooper dropping from high altitude
        enemies.push({
          type: 'para',
          worldX: (Math.random() - 0.5) * 1.5,
          worldY: -1.05,
          z: 0.38 + Math.random() * 0.38,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (0.21 + wave * 0.015) * cfg.enemySpeedMult,
          vz: -0.025 * cfg.enemySpeedMult,
          hp: (22 + wave * 4) * cfg.enemyHpMult,
          maxHp: (22 + wave * 4) * cfg.enemyHpMult,
          baseRadius: 20,
          hasChute: true,
          landed: false,
          points: Math.round(100 * cfg.scoreMult),
          attackCooldown: 2.0
        });
      } else if (roll < 0.68) {
        // 3D Attack Helicopter approaching & strafing in 3D space
        const fromLeft = Math.random() < 0.5;
        enemies.push({
          type: 'heli',
          worldX: fromLeft ? -1.35 : 1.35,
          worldY: -0.42 - Math.random() * 0.35,
          z: 0.85,
          vx: (fromLeft ? 1 : -1) * (0.35 + wave * 0.02) * cfg.enemySpeedMult,
          vy: 0,
          vz: -0.065 * cfg.enemySpeedMult,
          minZ: 0.34 + Math.random() * 0.16,
          hp: (75 + wave * 14) * cfg.enemyHpMult,
          maxHp: (75 + wave * 14) * cfg.enemyHpMult,
          baseRadius: 32,
          points: Math.round(260 * cfg.scoreMult),
          attackCooldown: 2.2
        });
      } else if (roll < 0.88 || wave < 2) {
        // 3D Armored Amphibious Tank rolling from the sea onto the beach
        enemies.push({
          type: 'tank',
          worldX: (Math.random() - 0.5) * 1.3,
          worldY: 0.04,
          z: 0.96,
          vx: 0,
          vy: 0.11 * cfg.enemySpeedMult,
          vz: -(0.075 + wave * 0.006) * cfg.enemySpeedMult,
          minZ: 0.24 + Math.random() * 0.14,
          hp: (130 + wave * 22) * cfg.enemyHpMult,
          maxHp: (130 + wave * 22) * cfg.enemyHpMult,
          baseRadius: 34,
          points: Math.round(380 * cfg.scoreMult),
          attackCooldown: 2.5,
          chargeWarn: 0
        });
      } else {
        // 3D Supersonic Strike Jet diving from the horizon
        enemies.push({
          type: 'jet',
          worldX: (Math.random() - 0.5) * 1.2,
          worldY: -0.68,
          z: 1.05,
          vx: (Math.random() - 0.5) * 0.25,
          vy: 0.08,
          vz: -0.22 * cfg.enemySpeedMult,
          minZ: 0.22,
          hp: (60 + wave * 12) * cfg.enemyHpMult,
          maxHp: (60 + wave * 12) * cfg.enemyHpMult,
          baseRadius: 28,
          points: Math.round(320 * cfg.scoreMult),
          attackCooldown: 1.6
        });
      }
    }

    function fireMachineGun() {
      if (isGameOver || isPaused) return;
      mgCooldown = 0.075;
      barrelToggle = 1 - barrelToggle;
      if (barrelToggle === 0) recoilLeft = 14;
      else recoilRight = 14;
      muzzleFlashTimer = 0.05;
      ArcadeHub.sound.shoot();

      const startX = barrelToggle === 0 ? width * 0.2 : width * 0.8;
      const startY = height - 48;
      const spreadX = (Math.random() - 0.5) * 12;
      const spreadY = (Math.random() - 0.5) * 12;

      bullets.push({
        type: 'mg',
        x: startX,
        y: startY,
        targetX: aimX + spreadX,
        targetY: aimY + spreadY,
        progress: 0,
        speed: 5.2,
        damage: 18,
        blastRadius: 24 + getDiffCfg().hitBoxBonus
      });

      // Eject 3D brass shell casing
      shellCasings.push({
        x: barrelToggle === 0 ? width * 0.14 : width * 0.86,
        y: height - 36,
        vx: (barrelToggle === 0 ? -1 : 1) * (90 + Math.random() * 60),
        vy: -140 - Math.random() * 50,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 16,
        life: 0.55
      });
    }

    function fireCannon() {
      if (isGameOver || isPaused || cannonCooldown > 0) return;
      if (cannonAmmo <= 0) {
        ArcadeHub.sound.error();
        addFloatingText(aimX, aimY - 24, 'HẾT ĐẠN ĐẠI PHÁO!', '#f43f5e');
        return;
      }

      cannonAmmo -= 1;
      cannonCooldown = 0.6;
      recoilLeft = 22;
      recoilRight = 22;
      muzzleFlashTimer = 0.12;
      screenShake = 11;
      ArcadeHub.sound.cannon();

      bullets.push({
        type: 'cannon',
        x: width * 0.5,
        y: height - 28,
        targetX: aimX,
        targetY: aimY,
        progress: 0,
        speed: 2.9,
        damage: 165,
        blastRadius: 92 + getDiffCfg().hitBoxBonus
      });
    }

    function resolveBulletImpact(b) {
      const tx = b.targetX;
      const ty = b.targetY;

      if (b.type === 'cannon') {
        spawnExplosion3D(tx, ty, 1.35, true);
        screenShake = Math.max(screenShake, 12);
        ArcadeHub.sound.explosion();
      } else {
        spawnExplosion3D(tx, ty, 0.5, false);
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const proj = project3D(e.worldX, e.worldY, e.z);
        const hitRadius = e.baseRadius * proj.scale + b.blastRadius * 0.6;
        const dist = Math.hypot(proj.sx - tx, proj.sy - ty);

        // Shoot parachute above paratrooper
        if (
          e.type === 'para' &&
          e.hasChute &&
          Math.hypot(proj.sx - tx, proj.sy - 28 * proj.scale - ty) <= hitRadius
        ) {
          e.hasChute = false;
          e.vy = 0.85;
          addFloatingText(proj.sx, proj.sy - 25, 'RÁCH DÙ!', '#38bdf8');
        }

        if (dist <= hitRadius) {
          e.hp -= b.damage;
          e.hitFlash = 0.12;
          hitMarker = 0.18;
          if (e.hp <= 0) {
            handleEnemyDestroyed(e, i, proj);
          }
        }
      }
    }

    function handleEnemyDestroyed(e, index, proj) {
      enemies.splice(index, 1);
      ArcadeHub.sound.explosion();
      spawnExplosion3D(proj.sx, proj.sy, proj.scale * 1.15, true);

      if (e.type === 'supply') {
        bunkerHp = Math.min(maxHp, bunkerHp + 28);
        cannonAmmo += 5;
        score += e.points;
        addFloatingText(proj.sx, proj.sy, '+28% GIÁP & +5 ĐẠI PHÁO', '#10b981');
      } else {
        score += e.points;
        killsInWave += 1;
        addFloatingText(proj.sx, proj.sy, `+${e.points}`, '#fbbf24');

        if (killsInWave >= waveTargetKills) {
          wave += 1;
          killsInWave = 0;
          waveTargetKills = 12 + wave * 4;
          cannonAmmo += 4;
          bunkerHp = Math.min(maxHp, bunkerHp + 18);
          ArcadeHub.sound.win();
          waveBanner = {
            text: `🌊 CHIẾN THẮNG ĐỢT ${wave - 1}!`,
            sub: `Sang đợt ${wave} • +4 đại pháo • +18% giáp`,
            t: 0
          };
        }
      }

      ctx.updateScore(score);
    }

    function updateGame(dt) {
      // Camera effects decay even while paused / game over so the overlay settles.
      if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 30);
      if (damageVignette > 0) damageVignette = Math.max(0, damageVignette - dt * 2.2);
      if (isGameOver || isPaused) return;
      const cfg = getDiffCfg();

      if (mgCooldown > 0) mgCooldown -= dt;
      if (cannonCooldown > 0) cannonCooldown -= dt;
      if (muzzleFlashTimer > 0) muzzleFlashTimer -= dt;
      if (recoilLeft > 0) recoilLeft = Math.max(0, recoilLeft - dt * 55);
      if (recoilRight > 0) recoilRight = Math.max(0, recoilRight - dt * 55);

      if ((isFiringMG || autoFire) && mgCooldown <= 0) {
        fireMachineGun();
      }

      // Spawn logic
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy();
        const baseInterval = Math.max(0.48, cfg.spawnIntervalBase - wave * 0.11);
        spawnTimer = baseInterval * (0.75 + Math.random() * 0.5);
      }

      // Player Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.progress += dt * b.speed;
        if (b.progress >= 1) {
          resolveBulletImpact(b);
          bullets.splice(i, 1);
        }
      }

      // Update 3D Enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (e.type === 'para') {
          if (!e.landed) {
            e.worldX += e.vx * dt;
            e.worldY += e.vy * dt;
            e.z = Math.max(0.28, e.z + e.vz * dt);
            const groundY = 0.26;
            if (e.worldY >= groundY) {
              e.worldY = groundY;
              if (!e.hasChute) {
                const proj = project3D(e.worldX, e.worldY, e.z);
                handleEnemyDestroyed(e, i, proj);
                continue;
              }
              e.landed = true;
            }
          }
        } else if (e.type === 'heli') {
          e.worldX += e.vx * dt;
          if (e.worldX < -1.15 && e.vx < 0) e.vx = -e.vx;
          if (e.worldX > 1.15 && e.vx > 0) e.vx = -e.vx;
          if (e.z > e.minZ) {
            e.z += e.vz * dt;
          }
        } else if (e.type === 'tank') {
          if (e.z > e.minZ) {
            e.z += e.vz * dt;
            e.worldY = Math.min(0.32, 0.04 + (0.96 - e.z) * 0.42);
          }
        } else if (e.type === 'jet') {
          e.worldX += e.vx * dt;
          e.worldY += e.vy * dt;
          e.z += e.vz * dt;
          if (e.z < 0.16) {
            enemies.splice(i, 1);
            continue;
          }
        } else if (e.type === 'supply') {
          e.worldX += e.vx * dt;
          e.worldY += e.vy * dt;
          if (e.worldY > 0.35) {
            enemies.splice(i, 1);
            continue;
          }
        }

        // Enemy firing at Bunker
        if (e.type !== 'supply') {
          const canAttack = e.type !== 'para' || e.landed;
          if (canAttack) {
            e.attackCooldown -= dt;
            if (e.attackCooldown <= 0.6 && e.type === 'tank') {
              e.chargeWarn = 1;
            }
            if (e.attackCooldown <= 0) {
              e.chargeWarn = 0;
              e.attackCooldown =
                e.type === 'tank' ? 2.5 : e.type === 'heli' ? 2.0 : e.type === 'jet' ? 1.4 : 2.7;
              const proj = project3D(e.worldX, e.worldY, e.z);
              enemyProjectiles.push({
                x: proj.sx,
                y: proj.sy,
                tx: width * (0.32 + Math.random() * 0.36),
                ty: height - 28,
                progress: 0,
                speed: e.type === 'tank' ? 1.25 : 1.5,
                damage:
                  (e.type === 'tank' ? 12 : e.type === 'heli' ? 9 : e.type === 'jet' ? 11 : 5) *
                  cfg.enemyDamageMult
              });
            }
          }
        }
      }

      // Enemy Projectiles
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const p = enemyProjectiles[i];
        p.progress += dt * p.speed;
        if (p.progress >= 1) {
          enemyProjectiles.splice(i, 1);
          bunkerHp = Math.max(0, bunkerHp - p.damage);
          screenShake = Math.max(screenShake, 9);
          damageVignette = 0.85;
          ArcadeHub.sound.hit();

          if (bunkerHp <= 0 && !isGameOver) {
            isGameOver = true;
            ArcadeHub.sound.gameOver();
            ctx.submitHighScore(
              score,
              `Chế độ ${cfg.label} • Đợt ${wave}`
            );
          }
        }
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        if (pt.kind === 'ring') {
          pt.radius += (pt.maxRadius - pt.radius) * dt * 10;
          pt.life -= dt;
          pt.alpha = Math.max(0, pt.life * 3);
        } else {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          if (pt.kind === 'fire') pt.vy += 110 * dt;
          else pt.radius += dt * 12;
          pt.life -= dt;
          pt.alpha = Math.max(0, pt.life * 1.8);
        }
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // Shell casings
      for (let i = shellCasings.length - 1; i >= 0; i--) {
        const sc = shellCasings[i];
        sc.x += sc.vx * dt;
        sc.y += sc.vy * dt;
        sc.vy += 480 * dt;
        sc.rot += sc.vRot * dt;
        sc.life -= dt;
        if (sc.life <= 0) shellCasings.splice(i, 1);
      }

      // Floating texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.alpha -= dt * 0.85;
        if (ft.alpha <= 0) floatingTexts.splice(i, 1);
      }
    }

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    const fx = ArcadeHub.fx;
    const sparks = fx.createParticles(420);
    const flashes = []; // short-lived additive light bursts { x, y, r, life, maxLife, color }
    let sceneTime = 0;
    let hitMarker = 0;
    let waveBanner = null; // { text, sub, t }
    let overlayKey = '';
    let overlayT = 0;
    const stars = [];
    const clouds = [];

    (function buildBackdrop() {
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: Math.random(),
          y: Math.random() * 0.62,
          r: Math.random() * 1.4 + 0.4,
          tw: Math.random() * Math.PI * 2
        });
      }
      for (let i = 0; i < 7; i++) {
        clouds.push({
          x: Math.random() * 1.3,
          y: 0.18 + Math.random() * 0.36,
          w: 110 + Math.random() * 170,
          h: 12 + Math.random() * 12,
          speed: 0.004 + Math.random() * 0.007,
          depth: 0.3 + Math.random() * 0.7
        });
      }
    })();

    function addFlash(x, y, r, color, life) {
      if (flashes.length > 24) flashes.shift();
      flashes.push({ x, y, r, color: color || '#fde68a', life: life || 0.16, maxLife: life || 0.16 });
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      sparks.update(dt);
      if (hitMarker > 0) hitMarker = Math.max(0, hitMarker - dt);
      for (let i = flashes.length - 1; i >= 0; i--) {
        flashes[i].life -= dt;
        if (flashes[i].life <= 0) flashes.splice(i, 1);
      }
      enemies.forEach((e) => {
        if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      });
      if (waveBanner) {
        waveBanner.t += dt;
        if (waveBanner.t > 2.2) waveBanner = null;
      }
    }

    function draw3DTank(e, proj) {
      const g = g2d;
      g.save();
      g.translate(proj.sx, proj.sy);
      g.scale(proj.scale, proj.scale);

      fx.contactShadow(g, 0, 15, 42, 9, 0.5);

      // Tracks with animated treads
      [-34, 20].forEach((tx) => {
        const trackGrad = g.createLinearGradient(tx, -2, tx + 14, 16);
        trackGrad.addColorStop(0, '#3f3f46');
        trackGrad.addColorStop(1, '#0c0a09');
        g.fillStyle = trackGrad;
        g.strokeStyle = '#020617';
        g.lineWidth = 2;
        g.beginPath();
        g.roundRect(tx, -2, 14, 18, 4);
        g.fill();
        g.stroke();
        g.strokeStyle = 'rgba(148,163,184,0.35)';
        g.lineWidth = 1;
        const phase = (sceneTime * 22) % 4;
        for (let ty = -1 + phase; ty < 16; ty += 4) {
          g.beginPath();
          g.moveTo(tx + 1, ty);
          g.lineTo(tx + 13, ty);
          g.stroke();
        }
      });

      // Sloped armoured hull with rim light from the sunset
      const hullGrad = g.createLinearGradient(0, -14, 0, 12);
      hullGrad.addColorStop(0, '#84cc16');
      hullGrad.addColorStop(0.25, '#4d7c0f');
      hullGrad.addColorStop(1, '#14240a');
      g.fillStyle = hullGrad;
      g.strokeStyle = '#020617';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-26, -12);
      g.lineTo(26, -12);
      g.lineTo(32, 10);
      g.lineTo(-32, 10);
      g.closePath();
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(253, 186, 116, 0.55)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-25, -11);
      g.lineTo(25, -11);
      g.stroke();

      // Rivets
      g.fillStyle = 'rgba(15, 23, 42, 0.7)';
      for (let rx = -22; rx <= 22; rx += 11) {
        g.beginPath();
        g.arc(rx, 4, 1.4, 0, Math.PI * 2);
        g.fill();
      }

      // Turret
      const turGrad = g.createLinearGradient(0, -26, 0, -10);
      turGrad.addColorStop(0, '#a3e635');
      turGrad.addColorStop(0.35, '#65a30d');
      turGrad.addColorStop(1, '#283f0c');
      g.fillStyle = turGrad;
      g.strokeStyle = '#020617';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-16, -12);
      g.lineTo(-12, -25);
      g.lineTo(12, -25);
      g.lineTo(16, -12);
      g.closePath();
      g.fill();
      g.stroke();

      // Barrel facing the camera
      const barrelGrad = g.createLinearGradient(-4, 0, 4, 0);
      barrelGrad.addColorStop(0, '#0f172a');
      barrelGrad.addColorStop(0.5, '#64748b');
      barrelGrad.addColorStop(1, '#0f172a');
      g.fillStyle = barrelGrad;
      g.beginPath();
      g.roundRect(-3.5, -20, 7, 18, 2);
      g.fill();
      g.stroke();

      g.fillStyle = '#020617';
      g.beginPath();
      g.arc(0, -2, 3.8, 0, Math.PI * 2);
      g.fill();
      g.restore();

      if (e.chargeWarn) {
        const pulse = 0.55 + Math.sin(sceneTime * 30) * 0.35;
        fx.glow(g, proj.sx, proj.sy - 2 * proj.scale, 26 * proj.scale, '#ef4444', pulse);
        g.fillStyle = '#fecaca';
        g.beginPath();
        g.arc(proj.sx, proj.sy - 2 * proj.scale, 3.2 * proj.scale, 0, Math.PI * 2);
        g.fill();
      }
    }

    function draw3DHeli(e, proj) {
      const g = g2d;
      const dir = e.vx > 0 ? 1 : -1;
      g.save();
      g.translate(proj.sx, proj.sy);
      g.scale(proj.scale, proj.scale);
      g.rotate(dir * 0.14);

      // Tail boom + tail rotor blur
      g.strokeStyle = '#1e293b';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, -4);
      g.lineTo(-dir * 38, -14);
      g.stroke();
      g.fillStyle = 'rgba(226, 232, 240, 0.28)';
      g.beginPath();
      g.arc(-dir * 39, -15, 8, 0, Math.PI * 2);
      g.fill();

      // Stub wings with rocket pods
      g.fillStyle = '#334155';
      g.strokeStyle = '#020617';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(-30, -4, 60, 6, 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#475569';
      [-27, 22].forEach((px) => {
        g.beginPath();
        g.roundRect(px, 1, 6, 8, 2);
        g.fill();
      });

      // Fuselage
      const bodyGrad = g.createRadialGradient(-4, -8, 2, 0, 0, 27);
      bodyGrad.addColorStop(0, '#94a3b8');
      bodyGrad.addColorStop(0.5, '#475569');
      bodyGrad.addColorStop(1, '#0f172a');
      g.fillStyle = bodyGrad;
      g.beginPath();
      g.ellipse(0, 0, 24, 13, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Canopy with specular streak
      const glassGrad = g.createLinearGradient(-10, -8, 10, 6);
      glassGrad.addColorStop(0, '#7dd3fc');
      glassGrad.addColorStop(1, '#075985');
      g.fillStyle = glassGrad;
      g.beginPath();
      g.ellipse(dir * 8, 1, 11, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(dir * 6, -1, 6, Math.PI * 1.1, Math.PI * 1.5);
      g.stroke();

      // Rotor mast + motion-blurred disc with two visible blades
      g.fillStyle = '#0f172a';
      g.fillRect(-2, -16, 4, 6);
      g.fillStyle = 'rgba(226, 232, 240, 0.16)';
      g.beginPath();
      g.ellipse(0, -16, 52, 5, 0, 0, Math.PI * 2);
      g.fill();
      const rot = sceneTime * 38;
      g.strokeStyle = 'rgba(241, 245, 249, 0.85)';
      g.lineWidth = 2.4;
      for (let b = 0; b < 2; b++) {
        const a = rot + b * Math.PI;
        g.beginPath();
        g.moveTo(-Math.cos(a) * 52, -16 - Math.sin(a) * 4);
        g.lineTo(Math.cos(a) * 52, -16 + Math.sin(a) * 4);
        g.stroke();
      }
      g.restore();

      // Blinking nav light
      if (Math.sin(sceneTime * 6 + e.worldX * 10) > 0.6) {
        fx.glow(g, proj.sx - dir * 36 * proj.scale, proj.sy - 14 * proj.scale, 10 * proj.scale + 4, '#ef4444', 0.9);
      }
    }

    function draw3DJet(e, proj) {
      const g = g2d;
      // Contrails behind the diving jet
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(226, 232, 240, 0.18)';
      g.lineWidth = Math.max(1, 3 * proj.scale);
      [-38, 38].forEach((wx) => {
        g.beginPath();
        g.moveTo(proj.sx + wx * proj.scale, proj.sy + 6 * proj.scale);
        g.lineTo(proj.sx + wx * proj.scale * 0.7, proj.sy - 60 * proj.scale);
        g.stroke();
      });
      g.restore();

      g.save();
      g.translate(proj.sx, proj.sy);
      g.scale(proj.scale, proj.scale);

      const wingGrad = g.createLinearGradient(0, -10, 0, 8);
      wingGrad.addColorStop(0, '#94a3b8');
      wingGrad.addColorStop(1, '#334155');
      g.fillStyle = wingGrad;
      g.strokeStyle = '#020617';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -10);
      g.lineTo(-42, 6);
      g.lineTo(-36, 9);
      g.lineTo(36, 9);
      g.lineTo(42, 6);
      g.closePath();
      g.fill();
      g.stroke();

      g.fillStyle = '#475569';
      g.beginPath();
      g.moveTo(-12, -2);
      g.lineTo(-18, -19);
      g.lineTo(-6, -2);
      g.moveTo(12, -2);
      g.lineTo(18, -19);
      g.lineTo(6, -2);
      g.fill();
      g.stroke();

      const noseGrad = g.createRadialGradient(-3, -2, 1, 0, 2, 15);
      noseGrad.addColorStop(0, '#64748b');
      noseGrad.addColorStop(1, '#1e293b');
      g.fillStyle = noseGrad;
      g.beginPath();
      g.ellipse(0, 2, 11, 14, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      const canopyGrad = g.createLinearGradient(0, -10, 0, 6);
      canopyGrad.addColorStop(0, '#fde68a');
      canopyGrad.addColorStop(1, '#b45309');
      g.fillStyle = canopyGrad;
      g.beginPath();
      g.ellipse(0, -2, 6, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();

      // Wingtip strobes
      const strobe = Math.sin(sceneTime * 9) > 0.3 ? 0.9 : 0.25;
      fx.glow(g, proj.sx - 42 * proj.scale, proj.sy + 6 * proj.scale, 8 * proj.scale + 3, '#ef4444', strobe);
      fx.glow(g, proj.sx + 42 * proj.scale, proj.sy + 6 * proj.scale, 8 * proj.scale + 3, '#22c55e', strobe);
    }

    function draw3DParaOrSupply(e, proj) {
      const g = g2d;
      g.save();
      g.translate(proj.sx, proj.sy);
      g.scale(proj.scale, proj.scale);
      const sway = e.landed ? 0 : Math.sin(sceneTime * 2.2 + e.worldX * 7) * 0.08;
      g.rotate(sway);

      if (e.hasChute || e.type === 'supply') {
        g.strokeStyle = 'rgba(226, 232, 240, 0.65)';
        g.lineWidth = 1.1;
        [-19, -7, 7, 19].forEach((cx) => {
          g.beginPath();
          g.moveTo(cx, -25);
          g.lineTo(0, -3);
          g.stroke();
        });

        // Ribbed canopy with alternating panels
        const isSupply = e.type === 'supply';
        for (let p = 0; p < 6; p++) {
          const a0 = Math.PI + (p / 6) * Math.PI;
          const a1 = Math.PI + ((p + 1) / 6) * Math.PI;
          g.fillStyle = isSupply
            ? p % 2 === 0
              ? '#34d399'
              : '#059669'
            : p % 2 === 0
            ? '#f1f5f9'
            : '#94a3b8';
          g.beginPath();
          g.moveTo(0, -24);
          g.arc(0, -24, 22, a0, a1);
          g.closePath();
          g.fill();
        }
        g.strokeStyle = '#020617';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, -24, 22, Math.PI, 0);
        g.closePath();
        g.stroke();
        // Canopy shading
        const shadeGrad = g.createLinearGradient(-22, -46, 22, -24);
        shadeGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
        shadeGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
        g.fillStyle = shadeGrad;
        g.beginPath();
        g.arc(0, -24, 22, Math.PI, 0);
        g.closePath();
        g.fill();
      }

      if (e.type === 'supply') {
        // Wooden supply crate with medic cross
        const crateGrad = g.createLinearGradient(-13, -6, 13, 16);
        crateGrad.addColorStop(0, '#a16207');
        crateGrad.addColorStop(1, '#713f12');
        g.fillStyle = crateGrad;
        g.strokeStyle = '#1c1917';
        g.lineWidth = 2;
        g.fillRect(-13, -6, 26, 22);
        g.strokeRect(-13, -6, 26, 22);
        g.strokeStyle = 'rgba(28, 25, 23, 0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-13, 1);
        g.lineTo(13, 1);
        g.moveTo(-13, 9);
        g.lineTo(13, 9);
        g.stroke();
        g.fillStyle = '#ffffff';
        g.fillRect(-2.5, -1, 5, 14);
        g.fillRect(-7, 3.5, 14, 5);
        g.fillStyle = '#16a34a';
        g.fillRect(-1.5, 0, 3, 12);
        g.fillRect(-6, 4.5, 12, 3);
      } else {
        // Soldier: body, arms, rifle, helmet
        g.strokeStyle = '#020617';
        g.lineWidth = 1.8;
        g.fillStyle = '#3f6212';
        g.beginPath();
        g.roundRect(-7, -2, 14, 16, 4);
        g.fill();
        g.stroke();
        g.strokeStyle = '#365314';
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-6, 1);
        g.lineTo(-11, e.hasChute ? -10 : 7);
        g.moveTo(6, 1);
        g.lineTo(11, e.hasChute ? -10 : 7);
        g.stroke();
        g.strokeStyle = '#1c1917';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-10, 10);
        g.lineTo(10, 2);
        g.stroke();
        g.fillStyle = '#fcd34d';
        g.beginPath();
        g.arc(0, -6, 4.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#1a2e05';
        g.strokeStyle = '#020617';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(0, -8, 6.5, Math.PI, 0);
        g.closePath();
        g.fill();
        g.stroke();
      }

      g.restore();
    }

    function drawTurretAndCockpit() {
      const g = g2d;
      const leftPivotX = width * 0.16;
      const rightPivotX = width * 0.84;
      const pivotY = height + 18;

      function drawGunAssembly(pivotX, recoilVal, isLeft) {
        const ang = Math.atan2(aimY - pivotY, aimX - pivotX);
        const firing = muzzleFlashTimer > 0 && ((isLeft && barrelToggle === 0) || (!isLeft && barrelToggle === 1));
        g.save();
        g.translate(pivotX, pivotY + recoilVal);
        g.rotate(ang);

        const barrelGrad = g.createLinearGradient(0, -14, 0, 14);
        barrelGrad.addColorStop(0, '#0f172a');
        barrelGrad.addColorStop(0.35, '#cbd5e1');
        barrelGrad.addColorStop(0.55, '#64748b');
        barrelGrad.addColorStop(1, '#020617');
        g.fillStyle = barrelGrad;
        g.strokeStyle = '#020617';
        g.lineWidth = 2;
        g.fillRect(10, -13, 86, 9);
        g.strokeRect(10, -13, 86, 9);
        g.fillRect(10, 4, 86, 9);
        g.strokeRect(10, 4, 86, 9);

        // Cooling jacket with vents
        const jacketGrad = g.createLinearGradient(0, -15, 0, 15);
        jacketGrad.addColorStop(0, '#475569');
        jacketGrad.addColorStop(0.5, '#334155');
        jacketGrad.addColorStop(1, '#0f172a');
        g.fillStyle = jacketGrad;
        g.fillRect(24, -15, 42, 30);
        g.strokeRect(24, -15, 42, 30);
        g.fillStyle = '#020617';
        for (let vx = 30; vx < 62; vx += 8) {
          g.beginPath();
          g.arc(vx, -8, 1.8, 0, Math.PI * 2);
          g.arc(vx, 8, 1.8, 0, Math.PI * 2);
          g.fill();
        }

        g.fillStyle = '#475569';
        g.fillRect(88, -15, 12, 13);
        g.strokeRect(88, -15, 12, 13);
        g.fillRect(88, 2, 12, 13);
        g.strokeRect(88, 2, 12, 13);

        if (firing) {
          // Star-shaped muzzle flash
          g.save();
          g.globalCompositeOperation = 'lighter';
          g.translate(106, 0);
          const len = 30 + Math.random() * 16;
          const flashGrad = g.createRadialGradient(0, 0, 1, 0, 0, len);
          flashGrad.addColorStop(0, 'rgba(255,255,255,1)');
          flashGrad.addColorStop(0.35, 'rgba(250,204,21,0.9)');
          flashGrad.addColorStop(1, 'rgba(249,115,22,0)');
          g.fillStyle = flashGrad;
          g.beginPath();
          for (let k = 0; k < 10; k++) {
            const r = k % 2 === 0 ? len : len * 0.32;
            const a = (k / 10) * Math.PI * 2;
            g.lineTo(Math.cos(a) * r * (k % 4 === 0 ? 1.4 : 1), Math.sin(a) * r * 0.7);
          }
          g.closePath();
          g.fill();
          g.restore();
        }
        g.restore();

        if (firing) {
          const tipX = pivotX + Math.cos(ang) * 104;
          const tipY = pivotY + recoilVal + Math.sin(ang) * 104;
          fx.glow(g, tipX, tipY, 120, '#f59e0b', 0.28);
        }
      }

      drawGunAssembly(leftPivotX, recoilLeft, true);
      drawGunAssembly(rightPivotX, recoilRight, false);

      // Brass casings with a specular glint
      shellCasings.forEach((sc) => {
        g.save();
        g.translate(sc.x, sc.y);
        g.rotate(sc.rot);
        const brass = g.createLinearGradient(0, -2, 0, 2);
        brass.addColorStop(0, '#fef08a');
        brass.addColorStop(1, '#a16207');
        g.fillStyle = brass;
        g.fillRect(-5, -2, 10, 4);
        g.fillStyle = '#78350f';
        g.fillRect(-5, -2, 2, 4);
        g.restore();
      });

      // Sandbag parapet + armoured dash
      const dashTop = height - 34;
      const dashGrad = g.createLinearGradient(0, dashTop, 0, height);
      dashGrad.addColorStop(0, '#1e293b');
      dashGrad.addColorStop(1, '#020617');
      g.fillStyle = dashGrad;
      g.beginPath();
      g.moveTo(0, height);
      g.lineTo(width * 0.22, dashTop);
      g.lineTo(width * 0.78, dashTop);
      g.lineTo(width, height);
      g.closePath();
      g.fill();

      const bagW = 34;
      for (let row = 0; row < 2; row++) {
        const y = dashTop - 6 + row * 11;
        const offset = row % 2 === 0 ? 0 : bagW / 2;
        for (let x = width * 0.22 + offset - bagW; x < width * 0.78 + bagW; x += bagW) {
          const bagGrad = g.createLinearGradient(0, y - 6, 0, y + 6);
          bagGrad.addColorStop(0, '#a8a29e');
          bagGrad.addColorStop(0.5, '#78716c');
          bagGrad.addColorStop(1, '#44403c');
          g.fillStyle = bagGrad;
          g.beginPath();
          g.ellipse(x, y, bagW / 2 + 1, 6.5, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, height);
      g.lineTo(width * 0.22, dashTop + 8);
      g.moveTo(width * 0.78, dashTop + 8);
      g.lineTo(width, height);
      g.stroke();
    }

    function drawGlassPanel(x, y, w, h, accent) {
      const g = g2d;
      g.save();
      g.beginPath();
      g.moveTo(x + 10, y);
      g.lineTo(x + w, y);
      g.lineTo(x + w, y + h - 10);
      g.lineTo(x + w - 10, y + h);
      g.lineTo(x, y + h);
      g.lineTo(x, y + 10);
      g.closePath();
      const bg = g.createLinearGradient(0, y, 0, y + h);
      bg.addColorStop(0, 'rgba(15, 23, 42, 0.86)');
      bg.addColorStop(1, 'rgba(2, 6, 23, 0.86)');
      g.fillStyle = bg;
      g.fill();
      g.strokeStyle = fx.rgba(accent, 0.75);
      g.lineWidth = 1.5;
      g.stroke();
      g.fillStyle = accent;
      g.fillRect(x + 10, y - 1, 30, 3);
      g.restore();
    }

    function drawTacticalHud() {
      const g = g2d;
      const cfg = getDiffCfg();
      const compact = width < 560;

      // Armour + cannon panel
      const pw = compact ? 190 : 250;
      drawGlassPanel(12, 12, pw, 72, '#38bdf8');
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
      g.font = fx.font(11, 800);
      g.fillStyle = '#94a3b8';
      g.fillText('GIÁP LÔ CỐT', 24, 30);
      const hpRatio = Math.max(0, Math.min(1, bunkerHp / maxHp));
      const hpCol = bunkerHp > 55 ? '#22c55e' : bunkerHp > 25 ? '#f59e0b' : '#ef4444';
      g.textAlign = 'right';
      g.fillStyle = hpCol;
      g.font = fx.font(13, 900);
      g.fillText(`${Math.round(bunkerHp)}%`, 12 + pw - 12, 30);

      const segs = 20;
      const barX = 24;
      const barW = pw - 36;
      const segW = barW / segs;
      const lit = Math.ceil(hpRatio * segs);
      const lowPulse = bunkerHp <= 25 ? 0.6 + Math.sin(sceneTime * 10) * 0.4 : 1;
      for (let i = 0; i < segs; i++) {
        g.fillStyle = i < lit ? fx.rgba(hpCol, i < lit ? lowPulse : 1) : 'rgba(51, 65, 85, 0.6)';
        g.fillRect(barX + i * segW, 36, segW - 2, 10);
      }

      g.textAlign = 'left';
      g.font = fx.font(11, 800);
      g.fillStyle = '#94a3b8';
      g.fillText('ĐẠI PHÁO', 24, 66);
      const pips = Math.min(cannonAmmo, compact ? 6 : 10);
      for (let i = 0; i < pips; i++) {
        const px = 90 + i * 11;
        g.fillStyle = cannonCooldown > 0 && i === pips - 1 ? '#78350f' : '#fbbf24';
        g.beginPath();
        g.roundRect(px, 57, 7, 11, 2);
        g.fill();
      }
      g.fillStyle = '#fde68a';
      g.font = fx.font(12, 900);
      g.fillText(`×${cannonAmmo}`, 90 + pips * 11 + 4, 67);
      g.textAlign = 'right';
      g.fillStyle = '#38bdf8';
      g.font = fx.font(10, 900);
      g.fillText(cfg.label, 12 + pw - 12, 66);

      // Radar with rotating sweep
      const radarR = compact ? 28 : 36;
      const radarX = width - radarR - 16;
      const radarY = radarR + 14;
      g.save();
      g.beginPath();
      g.arc(radarX, radarY, radarR, 0, Math.PI * 2);
      const radarBg = g.createRadialGradient(radarX, radarY, 2, radarX, radarY, radarR);
      radarBg.addColorStop(0, 'rgba(20, 83, 45, 0.9)');
      radarBg.addColorStop(1, 'rgba(2, 20, 10, 0.92)');
      g.fillStyle = radarBg;
      g.fill();
      g.clip();
      const sweep = sceneTime * 2.4;
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 14; k++) {
        g.fillStyle = `rgba(74, 222, 128, ${0.16 * (1 - k / 14)})`;
        g.beginPath();
        g.moveTo(radarX, radarY);
        g.arc(radarX, radarY, radarR, sweep - (k + 1) * 0.06, sweep - k * 0.06);
        g.closePath();
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgba(74, 222, 128, 0.3)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(radarX, radarY, radarR * 0.55, 0, Math.PI * 2);
      g.moveTo(radarX - radarR, radarY);
      g.lineTo(radarX + radarR, radarY);
      g.moveTo(radarX, radarY - radarR);
      g.lineTo(radarX, radarY + radarR);
      g.stroke();
      enemies.forEach((e) => {
        const bx = radarX + (e.worldX / 1.4) * (radarR - 5);
        const by = radarY + (0.5 - e.z) * (radarR * 1.4);
        g.fillStyle = e.type === 'supply' ? '#38bdf8' : '#f87171';
        g.beginPath();
        g.arc(bx, by, 2.6, 0, Math.PI * 2);
        g.fill();
      });
      g.restore();
      g.strokeStyle = '#22c55e';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(radarX, radarY, radarR, 0, Math.PI * 2);
      g.stroke();

      // Score, wave and wave progress
      const tx = radarX - radarR - 14;
      fx.outlinedText(g, `🏆 ${score.toLocaleString('vi-VN')}`, tx, 28, {
        size: compact ? 15 : 19,
        color: '#facc15',
        align: 'right',
        glow: 'rgba(250, 204, 21, 0.6)'
      });
      fx.outlinedText(g, `ĐỢT ${wave}`, tx, 52, { size: 12, color: '#e2e8f0', align: 'right', weight: 800 });
      const progW = compact ? 70 : 110;
      g.fillStyle = 'rgba(30, 41, 59, 0.85)';
      g.fillRect(tx - progW, 62, progW, 5);
      g.fillStyle = '#38bdf8';
      g.fillRect(tx - progW, 62, progW * Math.min(1, killsInWave / waveTargetKills), 5);
    }

    function drawSky(horizonY, camPanX) {
      const g = g2d;
      const sky = g.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#040714');
      sky.addColorStop(0.38, '#1e1b4b');
      sky.addColorStop(0.72, '#7c2d12');
      sky.addColorStop(0.92, '#ea580c');
      sky.addColorStop(1, '#fdba74');
      g.fillStyle = sky;
      g.fillRect(0, 0, width, horizonY);

      g.fillStyle = '#ffffff';
      stars.forEach((s) => {
        const a = (1 - s.y / 0.62) * (0.45 + 0.45 * Math.sin(sceneTime * 1.7 + s.tw));
        if (a <= 0.05) return;
        g.globalAlpha = a;
        g.fillRect(s.x * width + camPanX * 0.12, s.y * horizonY, s.r, s.r);
      });
      g.globalAlpha = 1;

      const sunX = width * 0.5 + camPanX * 0.4;
      fx.glow(g, sunX, horizonY, Math.min(320, width * 0.4), '#fb923c', 0.5);

      // God rays fanning out of the sun
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 7; r++) {
        const a = Math.PI + 0.25 + (r / 6) * (Math.PI - 0.5) + Math.sin(sceneTime * 0.15 + r) * 0.04;
        const spread = 0.05 + (r % 3) * 0.02;
        const len = horizonY * 1.4;
        g.fillStyle = 'rgba(253, 186, 116, 0.035)';
        g.beginPath();
        g.moveTo(sunX, horizonY);
        g.lineTo(sunX + Math.cos(a - spread) * len, horizonY + Math.sin(a - spread) * len);
        g.lineTo(sunX + Math.cos(a + spread) * len, horizonY + Math.sin(a + spread) * len);
        g.closePath();
        g.fill();
      }
      g.restore();

      // Sun disc (lower half is hidden by the sea drawn afterwards)
      const disc = g.createRadialGradient(sunX, horizonY - 4, 2, sunX, horizonY, 38);
      disc.addColorStop(0, '#fffbeb');
      disc.addColorStop(0.6, '#fde68a');
      disc.addColorStop(1, '#fb923c');
      g.fillStyle = disc;
      g.beginPath();
      g.arc(sunX, horizonY, 36, 0, Math.PI * 2);
      g.fill();

      // Drifting cloud banks lit from below
      clouds.forEach((c) => {
        const cx = (((c.x + sceneTime * c.speed) % 1.3) - 0.15) * width + camPanX * c.depth * 0.5;
        const cy = c.y * horizonY;
        const cg = g.createLinearGradient(0, cy - c.h, 0, cy + c.h);
        cg.addColorStop(0, 'rgba(30, 27, 75, 0.85)');
        cg.addColorStop(1, 'rgba(234, 88, 12, 0.5)');
        g.fillStyle = cg;
        g.beginPath();
        g.ellipse(cx, cy, c.w * 0.5, c.h, 0, 0, Math.PI * 2);
        g.ellipse(cx - c.w * 0.25, cy + 3, c.w * 0.32, c.h * 0.75, 0, 0, Math.PI * 2);
        g.ellipse(cx + c.w * 0.28, cy + 2, c.w * 0.3, c.h * 0.8, 0, 0, Math.PI * 2);
        g.fill();
      });

      // Distant warships with deck lights and funnel smoke
      [-220, 210].forEach((offsetX, idx) => {
        const wx = sunX + offsetX;
        g.fillStyle = '#0b1020';
        g.beginPath();
        g.moveTo(wx - 40, horizonY);
        g.lineTo(wx - 33, horizonY - 7);
        g.lineTo(wx + 34, horizonY - 7);
        g.lineTo(wx + 40, horizonY);
        g.closePath();
        g.fill();
        g.fillRect(wx - 12, horizonY - 15, 20, 8);
        g.fillRect(wx - 2, horizonY - 22, 4, 7);
        g.fillStyle = Math.sin(sceneTime * 3 + idx) > 0 ? '#fde68a' : '#f97316';
        g.fillRect(wx + 18, horizonY - 5, 2, 2);
        g.fillRect(wx - 24, horizonY - 5, 2, 2);
        g.fillStyle = 'rgba(30, 41, 59, 0.35)';
        for (let s = 0; s < 4; s++) {
          const sy = horizonY - 24 - s * 7;
          const sx = wx + s * 6 + Math.sin(sceneTime + s) * 2;
          g.beginPath();
          g.arc(sx, sy, 3 + s * 1.6, 0, Math.PI * 2);
          g.fill();
        }
      });
    }

    function drawSea(horizonY, beachY, camPanX) {
      const g = g2d;
      const seaGrad = g.createLinearGradient(0, horizonY, 0, beachY);
      seaGrad.addColorStop(0, '#0c4a6e');
      seaGrad.addColorStop(0.5, '#075985');
      seaGrad.addColorStop(1, '#0284c7');
      g.fillStyle = seaGrad;
      g.fillRect(0, horizonY, width, beachY - horizonY);

      // Horizon haze
      const haze = g.createLinearGradient(0, horizonY, 0, horizonY + 18);
      haze.addColorStop(0, 'rgba(253, 186, 116, 0.55)');
      haze.addColorStop(1, 'rgba(253, 186, 116, 0)');
      g.fillStyle = haze;
      g.fillRect(0, horizonY, width, 18);

      // Shimmering sun reflection column
      const sunX = width * 0.5 + camPanX * 0.4;
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rows = 16;
      for (let i = 0; i < rows; i++) {
        const p = i / rows;
        const y = horizonY + Math.pow(p, 1.5) * (beachY - horizonY);
        const w = (12 + p * 110) * (0.6 + 0.4 * Math.sin(sceneTime * 2.6 + i * 1.7));
        g.fillStyle = `rgba(253, 186, 116, ${0.4 * (1 - p)})`;
        g.fillRect(sunX - w / 2 + Math.sin(sceneTime * 1.3 + i) * 6, y, w, 1.5 + p * 3);
      }
      g.restore();

      // Rolling wave crests (curved, perspective-scaled)
      const waveAnim = (sceneTime * 0.12) % 1;
      for (let i = 0; i < 7; i++) {
        const p = (i + waveAnim) / 7;
        const wy = horizonY + Math.pow(p, 1.7) * (beachY - horizonY);
        const amp = 1 + p * 4;
        g.strokeStyle = `rgba(186, 230, 253, ${0.12 + p * 0.3})`;
        g.lineWidth = 0.8 + p * 2;
        g.beginPath();
        for (let x = 0; x <= width; x += 24) {
          const y = wy + Math.sin(x * 0.02 + sceneTime * 1.4 + i) * amp;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }

      // Foam where the surf meets the sand
      g.strokeStyle = `rgba(255, 255, 255, ${0.55 + Math.sin(sceneTime * 1.8) * 0.2})`;
      g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= width; x += 16) {
        const y = beachY - 2 + Math.sin(x * 0.035 + sceneTime * 1.8) * 2.5;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }

    function drawBeach(beachY, camPanX) {
      const g = g2d;
      const sandGrad = g.createLinearGradient(0, beachY, 0, height);
      sandGrad.addColorStop(0, '#78350f');
      sandGrad.addColorStop(0.08, '#b45309');
      sandGrad.addColorStop(0.35, '#92400e');
      sandGrad.addColorStop(0.75, '#451a03');
      sandGrad.addColorStop(1, '#1c1917');
      g.fillStyle = sandGrad;
      g.fillRect(0, beachY, width, height - beachY);

      // Sunset rim on the wet sand
      const rim = g.createLinearGradient(0, beachY, 0, beachY + 24);
      rim.addColorStop(0, 'rgba(253, 186, 116, 0.35)');
      rim.addColorStop(1, 'rgba(253, 186, 116, 0)');
      g.fillStyle = rim;
      g.fillRect(0, beachY, width, 24);

      const sunX = width * 0.5 + camPanX * 0.4;
      g.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      g.lineWidth = 1.5;
      for (let gx = -3; gx <= 3; gx++) {
        g.beginPath();
        g.moveTo(sunX + gx * 65, beachY);
        g.lineTo(sunX + gx * 320, height);
        g.stroke();
      }

      // Czech hedgehogs with shading and shadows
      [-0.78, -0.35, 0.38, 0.82].forEach((ox) => {
        const p = project3D(ox, 0.25, 0.42);
        g.save();
        g.translate(p.sx, p.sy);
        g.scale(p.scale, p.scale);
        fx.contactShadow(g, 4, 10, 16, 4, 0.4);
        g.lineCap = 'round';
        g.strokeStyle = '#0c0a09';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(-12, 8);
        g.lineTo(12, -12);
        g.moveTo(12, 8);
        g.lineTo(-12, -12);
        g.moveTo(0, -15);
        g.lineTo(0, 10);
        g.stroke();
        g.strokeStyle = 'rgba(253, 186, 116, 0.45)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-11, 6);
        g.lineTo(11, -12);
        g.moveTo(-1, -14);
        g.lineTo(-1, 9);
        g.stroke();
        g.restore();
      });
    }

    function drawReticle() {
      const g = g2d;
      const firing = isFiringMG || autoFire;
      const col = firing ? '#fb7185' : '#4ade80';
      const spin = sceneTime * (firing ? 4 : 1.2);
      const r = 20 + (firing ? Math.sin(sceneTime * 40) * 1.5 : 0);
      g.save();
      g.translate(aimX, aimY);
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.shadowColor = col;
      g.shadowBlur = 8;
      g.beginPath();
      g.arc(0, 0, 2, 0, Math.PI * 2);
      g.stroke();
      g.rotate(spin);
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.arc(0, 0, r, k * (Math.PI / 2) + 0.25, (k + 1) * (Math.PI / 2) - 0.25);
        g.stroke();
      }
      g.rotate(-spin);
      g.beginPath();
      g.moveTo(-30, 0);
      g.lineTo(-10, 0);
      g.moveTo(10, 0);
      g.lineTo(30, 0);
      g.moveTo(0, -30);
      g.lineTo(0, -10);
      g.moveTo(0, 10);
      g.lineTo(0, 30);
      g.stroke();

      // Cannon readiness arc
      const ready = cannonAmmo > 0 ? 1 - Math.max(0, cannonCooldown) / 0.6 : 0;
      g.shadowBlur = 0;
      g.strokeStyle = cannonAmmo > 0 ? 'rgba(251, 191, 36, 0.85)' : 'rgba(148, 163, 184, 0.4)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready);
      g.stroke();

      // Hit marker
      if (hitMarker > 0) {
        const s = 8 + (0.18 - hitMarker) * 40;
        g.strokeStyle = `rgba(255, 255, 255, ${hitMarker / 0.18})`;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-s, -s);
        g.lineTo(-s + 6, -s + 6);
        g.moveTo(s, -s);
        g.lineTo(s - 6, -s + 6);
        g.moveTo(-s, s);
        g.lineTo(-s + 6, s - 6);
        g.moveTo(s, s);
        g.lineTo(s - 6, s - 6);
        g.stroke();
      }
      g.restore();
    }

    function drawScene() {
      const g = g2d;
      g.save();
      if (screenShake > 0 && !fx.isReducedMotion()) {
        g.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      const camPanX = ((aimX - width * 0.5) / width) * -45;
      const camPanY = ((aimY - height * 0.44) / height) * -20;
      const horizonY = height * 0.44 + camPanY;
      const beachY = height * 0.64 + camPanY * 1.2;

      drawSky(horizonY, camPanX);
      drawSea(horizonY, beachY, camPanX);
      drawBeach(beachY, camPanX);

      // Enemies far -> near, with hit flash and health bars
      const sortedEnemies = enemies.slice().sort((a, b) => b.z - a.z);
      sortedEnemies.forEach((e) => {
        const proj = project3D(e.worldX, e.worldY, e.z);
        if (e.type === 'tank') draw3DTank(e, proj);
        else if (e.type === 'heli') draw3DHeli(e, proj);
        else if (e.type === 'jet') draw3DJet(e, proj);
        else draw3DParaOrSupply(e, proj);

        if (e.hitFlash > 0) {
          fx.glow(g, proj.sx, proj.sy - 4 * proj.scale, (e.baseRadius + 10) * proj.scale, '#ffffff', e.hitFlash * 4);
        }

        if (e.hp < e.maxHp && e.type !== 'supply') {
          const bw = 40 * proj.scale;
          const bh = Math.max(3, 4.5 * proj.scale);
          const bx = proj.sx - bw / 2;
          const by = proj.sy - (e.baseRadius + 16) * proj.scale;
          const ratio = Math.max(0, e.hp / e.maxHp);
          g.fillStyle = 'rgba(2, 6, 23, 0.8)';
          g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          g.fillStyle = ratio > 0.5 ? '#facc15' : '#ef4444';
          g.fillRect(bx, by, bw * ratio, bh);
        }
      });

      // Incoming enemy shells: glowing orbs with a short trail
      enemyProjectiles.forEach((p) => {
        const cx = p.x + (p.tx - p.x) * p.progress;
        const cy = p.y + (p.ty - p.y) * p.progress;
        const tp = Math.max(0, p.progress - 0.08);
        const tx = p.x + (p.tx - p.x) * tp;
        const ty = p.y + (p.ty - p.y) * tp;
        const r = 3 + p.progress * 7;
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(248, 113, 113, 0.45)';
        g.lineWidth = r;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(cx, cy);
        g.stroke();
        g.restore();
        fx.glow(g, cx, cy, r * 3.2, '#f97316', 0.55);
        g.fillStyle = '#fff7ed';
        g.beginPath();
        g.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
        g.fill();
      });

      // Player tracers (additive core + halo, no shadowBlur)
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      bullets.forEach((b) => {
        const cx = b.x + (b.targetX - b.x) * b.progress;
        const cy = b.y + (b.targetY - b.y) * b.progress;
        const tailP = Math.max(0, b.progress - (b.type === 'cannon' ? 0.22 : 0.16));
        const tx = b.x + (b.targetX - b.x) * tailP;
        const ty = b.y + (b.targetY - b.y) * tailP;
        const w = (b.type === 'cannon' ? 7 : 3.2) * (1 - b.progress * 0.45);
        g.strokeStyle = b.type === 'cannon' ? 'rgba(249, 115, 22, 0.45)' : 'rgba(56, 189, 248, 0.4)';
        g.lineWidth = w * 3;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(cx, cy);
        g.stroke();
        g.strokeStyle = b.type === 'cannon' ? '#fef3c7' : '#e0f2fe';
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(cx, cy);
        g.stroke();
      });
      g.restore();

      // Explosion particles: additive fireballs, soft smoke, glowing rings
      particles.forEach((pt) => {
        const a = Math.max(0, Math.min(1, pt.alpha));
        if (a <= 0) return;
        if (pt.kind === 'ring') {
          g.save();
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = a;
          g.strokeStyle = pt.color;
          g.lineWidth = 4 * a + 1;
          g.beginPath();
          g.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        } else if (pt.kind === 'smoke') {
          g.globalAlpha = a * 0.55;
          g.fillStyle = '#1e293b';
          g.beginPath();
          g.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        } else {
          g.save();
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = a * 0.35;
          g.fillStyle = pt.color;
          g.beginPath();
          g.arc(pt.x, pt.y, pt.radius * 2, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = a;
          g.beginPath();
          g.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }
      });
      flashes.forEach((f) => {
        fx.glow(g, f.x, f.y, f.r, f.color, 0.75 * (f.life / f.maxLife));
      });
      sparks.draw(g);

      // Floating score popups with a pop-in scale
      floatingTexts.forEach((ft) => {
        const a = Math.max(0, Math.min(1, ft.alpha));
        const pop = Math.min(1, (1 - ft.alpha) * 6);
        g.save();
        g.globalAlpha = a;
        g.translate(ft.x, ft.y);
        g.scale(0.7 + fx.ease.outBack(pop) * 0.3, 0.7 + fx.ease.outBack(pop) * 0.3);
        fx.outlinedText(g, ft.text, 0, 0, { size: 15, color: ft.color });
        g.restore();
      });

      drawTurretAndCockpit();
      drawTacticalHud();
      drawReticle();

      // Damage: red edge vignette, pulsing when armour is critical
      const critical = !isGameOver && bunkerHp <= 25 ? 0.25 + Math.sin(sceneTime * 6) * 0.12 : 0;
      const dmg = Math.max(damageVignette * 0.6, critical);
      if (dmg > 0.01) {
        fx.vignette(g, width, height, 0, `rgba(239, 68, 68, ${dmg})`);
      }

      if (waveBanner && !isGameOver) {
        fx.drawBanner(g, width, height, waveBanner.text, {
          t: waveBanner.t,
          duration: 2.2,
          accent: '#38bdf8',
          sub: waveBanner.sub,
          size: Math.min(40, width * 0.07),
          y: height * 0.3
        });
      }
      g.restore();

      // State panels are drawn outside the camera shake
      const key = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (key !== overlayKey) {
        overlayKey = key;
        overlayT = 0;
      }
      if (key) {
        if (isGameOver) {
          fx.drawStatePanel(g, width, height, {
            icon: '💥',
            title: 'LÔ CỐT THẤT THỦ!',
            subtitle: 'Đợt tấn công đã chọc thủng tuyến phòng thủ bờ biển.',
            lines: [
              `Điểm|${score.toLocaleString('vi-VN')}`,
              `Đợt đã trụ|${wave}`,
              `Chế độ|${getDiffCfg().label}`
            ],
            hint: 'Bấm vào màn hình để chơi lại',
            accent: '#f97316',
            t: overlayT
          });
        } else {
          fx.drawStatePanel(g, width, height, {
            icon: '⏸',
            title: 'TẠM DỪNG',
            subtitle: 'Nhấn Esc hoặc nút Tiếp tục để quay lại trận chiến.',
            accent: '#38bdf8',
            t: overlayT,
            backdrop: 0.55
          });
        }
      }
    }

    function updateAimFromPointer(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      aimX = Math.max(20, Math.min(width - 20, clientX - rect.left));
      aimY = Math.max(20, Math.min(height - 40, clientY - rect.top));
    }

    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      if (isGameOver) {
        resetGame();
        return;
      }
      updateAimFromPointer(evt);
      if (evt.button === 2) {
        fireCannon();
      } else {
        isFiringMG = true;
      }
    });

    canvas.addEventListener('pointermove', (evt) => {
      updateAimFromPointer(evt);
    });

    const onPointerUp = () => {
      isFiringMG = false;
    };
    window.addEventListener('pointerup', onPointerUp);

    canvas.addEventListener('contextmenu', (evt) => {
      evt.preventDefault();
    });

    // Difficulty Selection Buttons (Dễ / Khó)
    shell.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-diff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-diff');
        resetGame();
      });
    });

    autoFireBtn.addEventListener('click', () => {
      autoFire = !autoFire;
      ArcadeHub.sound.click();
      updateToolbarUI();
    });

    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      ArcadeHub.sound.click();
      updateToolbarUI();
    });

    touchMGBtn.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      isFiringMG = true;
    });
    touchMGBtn.addEventListener('pointerup', onPointerUp);
    touchMGBtn.addEventListener('pointercancel', onPointerUp);
    touchMGBtn.addEventListener('pointerleave', onPointerUp);

    touchCannonBtn.addEventListener('click', () => {
      fireCannon();
    });

    function onKeyDown(evt) {
      if (evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (evt.code === 'Space') {
        evt.preventDefault();
        fireCannon();
      }
    }

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
        if (isGameOver || isPaused) return;
        isPaused = true;
        isFiringMG = false;
        updateToolbarUI();
      },
      resume() {
        if (!isPaused) return;
        isPaused = false;
        updateToolbarUI();
      },
      isPaused() {
        return isPaused;
      },
      destroy() {
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('pointerup', onPointerUp);
      }
    };
  }

  ArcadeHub.games.beachhead = {
    init: createBeachHeadGame
  };
})(window);
