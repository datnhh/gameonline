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
          addFloatingText(
            width / 2,
            height * 0.3,
            `🌊 CHIẾN THẮNG ĐỢT ${wave - 1}! SANG ĐỢT ${wave} (+4 PHÁO)`,
            '#38bdf8'
          );
        }
      }

      ctx.updateScore(score);
    }

    function updateGame(dt) {
      if (isGameOver || isPaused) return;
      const cfg = getDiffCfg();

      if (mgCooldown > 0) mgCooldown -= dt;
      if (cannonCooldown > 0) cannonCooldown -= dt;
      if (muzzleFlashTimer > 0) muzzleFlashTimer -= dt;
      if (recoilLeft > 0) recoilLeft = Math.max(0, recoilLeft - dt * 55);
      if (recoilRight > 0) recoilRight = Math.max(0, recoilRight - dt * 55);
      if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 30);
      if (damageVignette > 0) damageVignette = Math.max(0, damageVignette - dt * 2.2);

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
    // 3D MILITARY MODELS & ENVIRONMENT RENDERING
    // =========================================================
    function draw3DTank(e, proj) {
      g2d.save();
      g2d.translate(proj.sx, proj.sy);
      g2d.scale(proj.scale, proj.scale);

      // Ground shadow
      g2d.fillStyle = 'rgba(0,0,0,0.55)';
      g2d.beginPath();
      g2d.ellipse(0, 14, 38, 10, 0, 0, Math.PI * 2);
      g2d.fill();

      // Left & Right Heavy Tracks with Treads
      g2d.fillStyle = '#1c1917';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.roundRect(-34, -2, 14, 18, 3);
      g2d.roundRect(20, -2, 14, 18, 3);
      g2d.fill();
      g2d.stroke();

      // Sloped 3D Armored Hull
      const hullGrad = g2d.createLinearGradient(-30, -14, 30, 12);
      hullGrad.addColorStop(0, '#4d7c0f');
      hullGrad.addColorStop(0.5, '#3f6212');
      hullGrad.addColorStop(1, '#1a2e05');
      g2d.fillStyle = hullGrad;
      g2d.beginPath();
      g2d.moveTo(-26, -12);
      g2d.lineTo(26, -12);
      g2d.lineTo(32, 10);
      g2d.lineTo(-32, 10);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // 3D Turret Dome
      const turGrad = g2d.createLinearGradient(-18, -26, 18, -10);
      turGrad.addColorStop(0, '#65a30d');
      turGrad.addColorStop(1, '#365314');
      g2d.fillStyle = turGrad;
      g2d.beginPath();
      g2d.moveTo(-16, -12);
      g2d.lineTo(-12, -25);
      g2d.lineTo(12, -25);
      g2d.lineTo(16, -12);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Main Cannon Barrel pointing toward player camera
      g2d.fillStyle = '#1e293b';
      g2d.beginPath();
      g2d.roundRect(-3.5, -20, 7, 18, 2);
      g2d.fill();
      g2d.stroke();

      // Muzzle Bore & Firing Warning Glow
      g2d.fillStyle = e.chargeWarn ? '#ef4444' : '#090d16';
      g2d.beginPath();
      g2d.arc(0, -2, e.chargeWarn ? 5.5 : 3.5, 0, Math.PI * 2);
      g2d.fill();

      g2d.restore();
    }

    function draw3DHeli(e, proj) {
      g2d.save();
      g2d.translate(proj.sx, proj.sy);
      g2d.scale(proj.scale, proj.scale);
      g2d.rotate(e.vx > 0 ? 0.14 : -0.14);

      // Tail boom
      g2d.strokeStyle = '#1e293b';
      g2d.lineWidth = 5;
      g2d.beginPath();
      g2d.moveTo(0, -4);
      g2d.lineTo(e.vx > 0 ? -36 : 36, -14);
      g2d.stroke();

      // Rocket Pods Stub Wings
      g2d.fillStyle = '#334155';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;
      g2d.fillRect(-30, -4, 60, 6);
      g2d.strokeRect(-30, -4, 60, 6);

      // Fuselage Body
      const bodyGrad = g2d.createRadialGradient(-4, -6, 3, 0, 0, 26);
      bodyGrad.addColorStop(0, '#64748b');
      bodyGrad.addColorStop(1, '#1e293b');
      g2d.fillStyle = bodyGrad;
      g2d.beginPath();
      g2d.ellipse(0, 0, 24, 13, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Armored Glass Cockpit Canopy
      const glassGrad = g2d.createLinearGradient(-10, -8, 10, 6);
      glassGrad.addColorStop(0, '#38bdf8');
      glassGrad.addColorStop(1, '#0284c7');
      g2d.fillStyle = glassGrad;
      g2d.beginPath();
      g2d.ellipse(e.vx > 0 ? 8 : -8, 1, 11, 8, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Spinning 3D Motion-Blurred Main Rotor Disc
      const rotorW = 48;
      g2d.fillStyle = 'rgba(226, 232, 240, 0.25)';
      g2d.beginPath();
      g2d.ellipse(0, -16, rotorW, 4, 0, 0, Math.PI * 2);
      g2d.fill();

      const bladeSpan = Math.sin(performance.now() * 0.045) * rotorW;
      g2d.strokeStyle = '#f8fafc';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.moveTo(-bladeSpan, -16);
      g2d.lineTo(bladeSpan, -16);
      g2d.stroke();

      g2d.restore();
    }

    function draw3DJet(e, proj) {
      g2d.save();
      g2d.translate(proj.sx, proj.sy);
      g2d.scale(proj.scale, proj.scale);

      // Swept Delta Wings
      g2d.fillStyle = '#475569';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.moveTo(0, -10);
      g2d.lineTo(-42, 6);
      g2d.lineTo(42, 6);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Twin Vertical Stabilizers
      g2d.beginPath();
      g2d.moveTo(-12, -2);
      g2d.lineTo(-18, -18);
      g2d.lineTo(-6, -2);
      g2d.moveTo(12, -2);
      g2d.lineTo(18, -18);
      g2d.lineTo(6, -2);
      g2d.fill();
      g2d.stroke();

      // Jet Nose Cone & Canopy
      g2d.fillStyle = '#334155';
      g2d.beginPath();
      g2d.ellipse(0, 2, 11, 14, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      g2d.fillStyle = '#fbbf24';
      g2d.beginPath();
      g2d.ellipse(0, -2, 6, 8, 0, 0, Math.PI * 2);
      g2d.fill();

      g2d.restore();
    }

    function draw3DParaOrSupply(e, proj) {
      g2d.save();
      g2d.translate(proj.sx, proj.sy);
      g2d.scale(proj.scale, proj.scale);

      if (e.hasChute || e.type === 'supply') {
        // Suspension cords
        g2d.strokeStyle = 'rgba(226, 232, 240, 0.7)';
        g2d.lineWidth = 1.2;
        [-18, -6, 6, 18].forEach((cx) => {
          g2d.beginPath();
          g2d.moveTo(cx, -24);
          g2d.lineTo(0, -2);
          g2d.stroke();
        });

        // 3D Ribbed Military Canopy
        const chuteGrad = g2d.createRadialGradient(-5, -34, 4, 0, -26, 24);
        if (e.type === 'supply') {
          chuteGrad.addColorStop(0, '#34d399');
          chuteGrad.addColorStop(1, '#065f46');
        } else {
          chuteGrad.addColorStop(0, '#f8fafc');
          chuteGrad.addColorStop(1, '#64748b');
        }
        g2d.fillStyle = chuteGrad;
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 1.8;
        g2d.beginPath();
        g2d.arc(0, -24, 21, Math.PI, 0);
        g2d.closePath();
        g2d.fill();
        g2d.stroke();
      }

      if (e.type === 'supply') {
        // 3D Military Supply Crate
        g2d.fillStyle = '#047857';
        g2d.strokeStyle = '#a7f3d0';
        g2d.lineWidth = 2;
        g2d.fillRect(-13, -6, 26, 22);
        g2d.strokeRect(-13, -6, 26, 22);
        g2d.fillStyle = '#ffffff';
        g2d.font = '900 14px sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText('+', 0, 10);
      } else {
        // 3D Soldier with Helmet & Rifle
        g2d.fillStyle = '#3f6212';
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 1.8;
        g2d.beginPath();
        g2d.roundRect(-7, -2, 14, 16, 4);
        g2d.fill();
        g2d.stroke();

        // Helmet
        g2d.fillStyle = '#1a2e05';
        g2d.beginPath();
        g2d.arc(0, -7, 6.5, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();
      }

      g2d.restore();
    }

    function drawTacticalHudAndTurret() {
      const cfg = getDiffCfg();

      // 1. 3D Twin-Linked Bofors/Vulcan Turret Barrels with Perspective Aiming
      const leftPivotX = width * 0.16;
      const rightPivotX = width * 0.84;
      const pivotY = height + 18;

      function draw3DGunAssembly(pivotX, recoilVal, isLeft) {
        const ang = Math.atan2(aimY - pivotY, aimX - pivotX);
        g2d.save();
        g2d.translate(pivotX, pivotY + recoilVal);
        g2d.rotate(ang);

        // Muzzle Flash Glow
        if (muzzleFlashTimer > 0 && ((isLeft && barrelToggle === 0) || (!isLeft && barrelToggle === 1))) {
          const flashGrad = g2d.createRadialGradient(98, 0, 2, 98, 0, 36);
          flashGrad.addColorStop(0, '#ffffff');
          flashGrad.addColorStop(0.4, '#facc15');
          flashGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
          g2d.fillStyle = flashGrad;
          g2d.beginPath();
          g2d.arc(98, 0, 36, 0, Math.PI * 2);
          g2d.fill();
        }

        // Twin Barrels with Metallic Cylindrical Shading
        const barrelGrad = g2d.createLinearGradient(0, -14, 0, 14);
        barrelGrad.addColorStop(0, '#1e293b');
        barrelGrad.addColorStop(0.45, '#94a3b8');
        barrelGrad.addColorStop(1, '#090d16');

        g2d.fillStyle = barrelGrad;
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 2;
        g2d.fillRect(10, -13, 86, 9);
        g2d.strokeRect(10, -13, 86, 9);
        g2d.fillRect(10, 4, 86, 9);
        g2d.strokeRect(10, 4, 86, 9);

        // Perforated Cooling Jacket & Muzzle Brake
        g2d.fillStyle = '#334155';
        g2d.fillRect(24, -15, 42, 30);
        g2d.strokeRect(24, -15, 42, 30);

        g2d.fillStyle = '#475569';
        g2d.fillRect(88, -15, 12, 13);
        g2d.strokeRect(88, -15, 12, 13);
        g2d.fillRect(88, 2, 12, 13);
        g2d.strokeRect(88, 2, 12, 13);

        g2d.restore();
      }

      draw3DGunAssembly(leftPivotX, recoilLeft, true);
      draw3DGunAssembly(rightPivotX, recoilRight, false);

      // Ejected Brass Shell Casings
      shellCasings.forEach((sc) => {
        g2d.save();
        g2d.translate(sc.x, sc.y);
        g2d.rotate(sc.rot);
        g2d.fillStyle = '#facc15';
        g2d.strokeStyle = '#78350f';
        g2d.lineWidth = 1;
        g2d.fillRect(-5, -2, 10, 4);
        g2d.strokeRect(-5, -2, 10, 4);
        g2d.restore();
      });

      // 2. Armored 3D Bunker Cockpit Frame & Sandbag Foreground
      const dashGrad = g2d.createLinearGradient(0, height - 42, 0, height);
      dashGrad.addColorStop(0, '#1e293b');
      dashGrad.addColorStop(1, '#090d16');
      g2d.fillStyle = dashGrad;
      g2d.strokeStyle = '#38bdf8';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.moveTo(0, height);
      g2d.lineTo(width * 0.22, height - 34);
      g2d.lineTo(width * 0.78, height - 34);
      g2d.lineTo(width, height);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // 3. In-Screen Tactical Military HUD (Top-Left: Armor & Cannon, Top-Right: Radar & Wave)
      g2d.save();

      // Top-Left HUD Box
      g2d.fillStyle = 'rgba(9, 13, 22, 0.82)';
      g2d.strokeStyle = '#38bdf8';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.roundRect(14, 12, 245, 76, 8);
      g2d.fill();
      g2d.stroke();

      const hpRatio = Math.max(0, Math.min(1, bunkerHp / maxHp));
      const hpCol = bunkerHp > 55 ? '#22c55e' : bunkerHp > 25 ? '#f59e0b' : '#ef4444';
      g2d.fillStyle = '#ffffff';
      g2d.font = '800 12px "Segoe UI", sans-serif';
      g2d.textAlign = 'left';
      g2d.fillText(`🛡 GIÁP LÔ CỐT: ${Math.round(bunkerHp)}%`, 26, 31);

      g2d.fillStyle = '#1e293b';
      g2d.fillRect(26, 36, 218, 13);
      g2d.fillStyle = hpCol;
      g2d.fillRect(26, 36, 218 * hpRatio, 13);
      g2d.strokeStyle = '#090d16';
      g2d.strokeRect(26, 36, 218, 13);

      g2d.fillStyle = '#fbbf24';
      g2d.font = '800 12px "Segoe UI", sans-serif';
      g2d.fillText(`🚀 ĐẠN ĐẠI PHÁO: ${cannonAmmo} VIÊN`, 26, 70);
      g2d.fillStyle = '#38bdf8';
      g2d.textAlign = 'right';
      g2d.fillText(`[${cfg.label}]`, 246, 70);

      // Top-Right Radar & Wave Box
      const radarX = width - 78;
      const radarY = 50;
      const radarR = 36;

      g2d.fillStyle = 'rgba(6, 28, 18, 0.85)';
      g2d.strokeStyle = '#22c55e';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.arc(radarX, radarY, radarR, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Radar rings
      g2d.strokeStyle = 'rgba(34, 197, 94, 0.3)';
      g2d.lineWidth = 1;
      g2d.beginPath();
      g2d.arc(radarX, radarY, radarR * 0.55, 0, Math.PI * 2);
      g2d.moveTo(radarX - radarR, radarY);
      g2d.lineTo(radarX + radarR, radarY);
      g2d.moveTo(radarX, radarY - radarR);
      g2d.lineTo(radarX, radarY + radarR);
      g2d.stroke();

      // Enemy Blips on Radar
      enemies.forEach((e) => {
        const bx = radarX + (e.worldX / 1.4) * (radarR - 5);
        const by = radarY + (0.5 - e.z) * (radarR * 1.4);
        g2d.fillStyle = e.type === 'supply' ? '#38bdf8' : '#ef4444';
        g2d.beginPath();
        g2d.arc(bx, by, 3, 0, Math.PI * 2);
        g2d.fill();
      });

      // Score & Wave Display next to Radar
      g2d.textAlign = 'right';
      g2d.fillStyle = '#facc15';
      g2d.font = '900 18px "Segoe UI", sans-serif';
      g2d.fillText(`🏆 ${score.toLocaleString('vi-VN')}`, radarX - radarR - 14, 34);
      g2d.fillStyle = '#f8fafc';
      g2d.font = '700 13px "Segoe UI", sans-serif';
      g2d.fillText(
        `🌊 Đợt ${wave} (${killsInWave}/${waveTargetKills})`,
        radarX - radarR - 14,
        56
      );

      g2d.restore();
    }

    function drawScene() {
      g2d.save();
      if (screenShake > 0) {
        g2d.translate(
          (Math.random() - 0.5) * screenShake,
          (Math.random() - 0.5) * screenShake
        );
      }

      const camPanX = ((aimX - width * 0.5) / width) * -45;
      const camPanY = ((aimY - height * 0.44) / height) * -20;
      const horizonY = height * 0.44 + camPanY;
      const beachY = height * 0.64 + camPanY * 1.2;

      // 1. Realistic 3D Atmospheric Sky
      const skyGrad = g2d.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#070b19');
      skyGrad.addColorStop(0.45, '#1e1b4b');
      skyGrad.addColorStop(0.82, '#9a3412');
      skyGrad.addColorStop(1, '#fb923c');
      g2d.fillStyle = skyGrad;
      g2d.fillRect(0, 0, width, horizonY);

      // Volumetric Sunset Glow
      const sunX = width * 0.5 + camPanX * 0.4;
      const sunGrad = g2d.createRadialGradient(sunX, horizonY, 6, sunX, horizonY, 110);
      sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
      sunGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.4)');
      sunGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      g2d.fillStyle = sunGrad;
      g2d.beginPath();
      g2d.arc(sunX, horizonY, 110, Math.PI, 0);
      g2d.fill();

      // Distant Naval Warships on Horizon
      [-220, 210].forEach((offsetX) => {
        const wx = sunX + offsetX;
        g2d.fillStyle = '#0f172a';
        g2d.beginPath();
        g2d.moveTo(wx - 38, horizonY);
        g2d.lineTo(wx - 32, horizonY - 7);
        g2d.lineTo(wx + 32, horizonY - 7);
        g2d.lineTo(wx + 38, horizonY);
        g2d.closePath();
        g2d.fill();
        g2d.fillRect(wx - 10, horizonY - 15, 18, 8);
      });

      // 2. 3D Perspective Ocean with Animated Wave Lines
      const seaGrad = g2d.createLinearGradient(0, horizonY, 0, beachY);
      seaGrad.addColorStop(0, '#082f49');
      seaGrad.addColorStop(0.6, '#0369a1');
      seaGrad.addColorStop(1, '#0ea5e9');
      g2d.fillStyle = seaGrad;
      g2d.fillRect(0, horizonY, width, beachY - horizonY);

      const waveAnim = (performance.now() * 0.0004) % 1;
      g2d.strokeStyle = 'rgba(186, 230, 253, 0.35)';
      for (let i = 0; i < 6; i++) {
        const p = (i + waveAnim) / 6;
        const wy = horizonY + Math.pow(p, 1.7) * (beachY - horizonY);
        g2d.lineWidth = 0.8 + p * 2.2;
        g2d.beginPath();
        g2d.moveTo(0, wy);
        g2d.lineTo(width, wy);
        g2d.stroke();
      }

      // 3. 3D Fortified Sandy Beach & Czech Hedgehog Tank Traps
      const sandGrad = g2d.createLinearGradient(0, beachY, 0, height);
      sandGrad.addColorStop(0, '#92400e');
      sandGrad.addColorStop(0.25, '#78350f');
      sandGrad.addColorStop(0.7, '#451a03');
      sandGrad.addColorStop(1, '#1c1917');
      g2d.fillStyle = sandGrad;
      g2d.fillRect(0, beachY, width, height - beachY);

      // Perspective grid lines on beach for 3D depth cue
      g2d.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      g2d.lineWidth = 1.5;
      for (let gx = -3; gx <= 3; gx++) {
        g2d.beginPath();
        g2d.moveTo(sunX + gx * 65, beachY);
        g2d.lineTo(sunX + gx * 320, height);
        g2d.stroke();
      }

      // Steel Tank Obstacles (Czech Hedgehogs) on Beach
      [-0.78, -0.35, 0.38, 0.82].forEach((ox) => {
        const p = project3D(ox, 0.25, 0.42);
        g2d.save();
        g2d.translate(p.sx, p.sy);
        g2d.scale(p.scale, p.scale);
        g2d.strokeStyle = '#1c1917';
        g2d.lineWidth = 4;
        g2d.beginPath();
        g2d.moveTo(-12, 8);
        g2d.lineTo(12, -12);
        g2d.moveTo(12, 8);
        g2d.lineTo(-12, -12);
        g2d.moveTo(0, -15);
        g2d.lineTo(0, 10);
        g2d.stroke();
        g2d.restore();
      });

      // 4. Sort and Draw 3D Enemies from Far (large z) to Near (small z)
      const sortedEnemies = enemies.slice().sort((a, b) => b.z - a.z);
      sortedEnemies.forEach((e) => {
        const proj = project3D(e.worldX, e.worldY, e.z);
        if (e.type === 'tank') draw3DTank(e, proj);
        else if (e.type === 'heli') draw3DHeli(e, proj);
        else if (e.type === 'jet') draw3DJet(e, proj);
        else draw3DParaOrSupply(e, proj);

        // 3D Scaled Health Bar above damaged enemies
        if (e.hp < e.maxHp && e.type !== 'supply') {
          const bw = 38 * proj.scale;
          const bh = Math.max(3, 4.5 * proj.scale);
          const bx = proj.sx - bw / 2;
          const by = proj.sy - (e.baseRadius + 14) * proj.scale;
          g2d.fillStyle = 'rgba(0,0,0,0.7)';
          g2d.fillRect(bx, by, bw, bh);
          g2d.fillStyle = '#ef4444';
          g2d.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), bh);
        }
      });

      // 5. Enemy Incoming Shells (3D growing spheres)
      enemyProjectiles.forEach((p) => {
        const cx = p.x + (p.tx - p.x) * p.progress;
        const cy = p.y + (p.ty - p.y) * p.progress;
        const r = 3 + p.progress * 7;
        g2d.fillStyle = '#fef08a';
        g2d.beginPath();
        g2d.arc(cx, cy, r, 0, Math.PI * 2);
        g2d.fill();
        g2d.strokeStyle = '#ef4444';
        g2d.lineWidth = 2;
        g2d.stroke();
      });

      // 6. Player 3D Perspective Tracer Bullets
      bullets.forEach((b) => {
        const cx = b.x + (b.targetX - b.x) * b.progress;
        const cy = b.y + (b.targetY - b.y) * b.progress;
        const tailP = Math.max(0, b.progress - 0.16);
        const tx = b.x + (b.targetX - b.x) * tailP;
        const ty = b.y + (b.targetY - b.y) * tailP;

        g2d.save();
        g2d.strokeStyle = b.type === 'cannon' ? '#facc15' : '#38bdf8';
        g2d.shadowColor = b.type === 'cannon' ? '#f97316' : '#38bdf8';
        g2d.shadowBlur = 10;
        g2d.lineWidth = (b.type === 'cannon' ? 6 : 3) * (1 - b.progress * 0.45);
        g2d.lineCap = 'round';
        g2d.beginPath();
        g2d.moveTo(tx, ty);
        g2d.lineTo(cx, cy);
        g2d.stroke();
        g2d.restore();
      });

      // 7. Volumetric Explosions & Smoke Particles
      particles.forEach((pt) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, pt.alpha);
        if (pt.kind === 'ring') {
          g2d.strokeStyle = pt.color;
          g2d.lineWidth = 3;
          g2d.beginPath();
          g2d.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          g2d.stroke();
        } else {
          g2d.fillStyle = pt.color;
          g2d.beginPath();
          g2d.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          g2d.fill();
        }
        g2d.restore();
      });

      // Floating Score Popups
      floatingTexts.forEach((ft) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, ft.alpha);
        g2d.fillStyle = ft.color;
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 3;
        g2d.font = '800 15px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.strokeText(ft.text, ft.x, ft.y);
        g2d.fillText(ft.text, ft.x, ft.y);
        g2d.restore();
      });

      // 8. Foreground 3D Gun Turret, Radar & HUD
      drawTacticalHudAndTurret();

      // 9. Illuminated Military Optical Sight Reticle
      g2d.save();
      g2d.strokeStyle = isFiringMG || autoFire ? '#f43f5e' : '#4ade80';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.arc(aimX, aimY, 20, 0, Math.PI * 2);
      g2d.arc(aimX, aimY, 2, 0, Math.PI * 2);
      g2d.moveTo(aimX - 28, aimY);
      g2d.lineTo(aimX - 9, aimY);
      g2d.moveTo(aimX + 9, aimY);
      g2d.lineTo(aimX + 28, aimY);
      g2d.moveTo(aimX, aimY - 28);
      g2d.lineTo(aimX, aimY - 9);
      g2d.moveTo(aimX, aimY + 9);
      g2d.lineTo(aimX, aimY + 28);
      g2d.stroke();
      g2d.restore();

      // Red Damage Flash
      if (damageVignette > 0) {
        g2d.fillStyle = `rgba(239, 68, 68, ${damageVignette * 0.32})`;
        g2d.fillRect(0, 0, width, height);
      }

      // Game Over / Pause Overlay
      if (isGameOver || isPaused) {
        g2d.fillStyle = 'rgba(7, 11, 20, 0.82)';
        g2d.fillRect(0, 0, width, height);
        g2d.fillStyle = '#facc15';
        g2d.font = '800 30px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText(
          isGameOver ? '💥 LÔ CỐT PHÒNG THỦ THẤT THỦ!' : '⏸ ĐANG TẠM DỪNG',
          width / 2,
          height / 2 - 20
        );
        g2d.fillStyle = '#38bdf8';
        g2d.font = '600 18px "Segoe UI", sans-serif';
        g2d.fillText(
          isGameOver
            ? `Chế độ ${getDiffCfg().label} • Điểm: ${score.toLocaleString('vi-VN')} (Đợt ${wave}) — Bấm vào màn hình để chơi lại`
            : 'Bấm nút Tiếp tục để quay lại trận chiến',
          width / 2,
          height / 2 + 20
        );
      }

      g2d.restore();
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

    window.addEventListener('pointerup', () => {
      isFiringMG = false;
    });

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
    touchMGBtn.addEventListener('pointerup', () => {
      isFiringMG = false;
    });

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

  ArcadeHub.games.beachhead = {
    init: createBeachHeadGame
  };
})(window);
