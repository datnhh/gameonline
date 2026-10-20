(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  function createRoadRashGame(container, ctx) {
    let width = 920;
    let height = 540;
    let animId = null;
    let lastTime = performance.now();

    // Road & Bike State
    // The track is stretched 2.5x (curves keep their duration) because the road now scrolls
    // 2.5x faster, which is what makes the bike feel fast.
    const TRACK_STRETCH = 2.5;
    const TOTAL_SEGMENTS = Math.round(260 * TRACK_STRETCH);
    const SEGMENT_LENGTH = 180;
    // trackPos advanced per unit of speed per second
    const ROAD_SCROLL = 4.6 * TRACK_STRETCH;
    // Entities (cars, rivals) live in z units of 32 per road segment. Moving them at
    // (their speed - your speed) * Z_PER_SPEED keeps them in step with the road surface: a car
    // parked on the road drifts towards you exactly as fast as the lane markings, and a slower
    // car is visibly overtaken instead of reversing into you.
    const Z_PER_SEGMENT = 32;
    const Z_PER_SPEED = (ROAD_SCROLL / SEGMENT_LENGTH) * Z_PER_SEGMENT;
    // Rival speeds as a fraction of the player's top speed (traffic: DIFFICULTY_CFG.carSpeed)
    const RIVAL_SPEED_RANGE = [0.65, 0.85];
    let segments = [];
    let skylineBuildings = [];
    // The skyline (about 1,000 lit windows) is painted once into a repeating strip and blitted
    let skylineLayer = null;
    let canvasDpr = 1;
    const SKYLINE_SPAN = 1400;
    const SKYLINE_STRIP_H = 200; // tallest building (170) + spire (24) + stroke

    let trackPos = 0;
    let playerX = 0; // -1.35 to +1.35 (mặt đường chính từ -1 đến +1)
    let speed = 0;
    // "hard" keeps the original tuning; "easy" is slower and more forgiving
    const DIFFICULTY_CFG = {
      // carSpeed: traffic speed range as a fraction of maxSpeed (slower cars = more cars per minute)
      easy: { label: 'Dễ', maxSpeed: 250, nitroMaxSpeed: 340, carDamage: 12, rivalDamage: 3, curvePull: 0.24, carSpeed: [0.38, 0.55] },
      hard: { label: 'Khó', maxSpeed: 310, nitroMaxSpeed: 420, carDamage: 22, rivalDamage: 6, curvePull: 0.4, carSpeed: [0.22, 0.4] }
    };
    let difficulty = 'easy';
    let maxSpeed = DIFFICULTY_CFG.easy.maxSpeed;
    let nitroMaxSpeed = DIFFICULTY_CFG.easy.nitroMaxSpeed;

    // Cars, bikers and the player bike scale with the canvas width so they keep their size
    // relative to the road on every screen.
    const SPRITE_REF_WIDTH = 1000;
    const CAR_HALF_W = 46; // drawn half-width of a traffic car (sprite units)
    const BIKE_HALF_W = 22; // drawn half-width of a biker (sprite units)
    const COLLIDE_Z = 120;
    // Road perspective at the depth where collisions are tested (same formula as drawScene)
    const COLLIDE_PERSP = 1 / (1 + (COLLIDE_Z / 32 / 68) * 6.5);
    const LANES = [-0.62, 0, 0.62];
    const CAR_SPACING = 380;

    function spriteScale() {
      return Math.max(0.6, Math.min(1, width / SPRITE_REF_WIDTH));
    }

    // Collision reach in road units (|x| = 1 is the road edge): the drawn half-widths of the
    // other sprite and the player bike, so a hit happens exactly when they overlap on screen.
    function collisionReach(otherHalfW) {
      return (spriteScale() * (otherHalfW * 1.45 + (BIKE_HALF_W * 1.15) / COLLIDE_PERSP)) / (width * 0.56);
    }
    let bikeHp = 100;
    let nitroFuel = 100;
    let score = 0;
    let distanceKm = 0;
    let knockouts = 0;
    let isGameOver = false;
    let isPaused = false;
    let autoThrottle = true;

    // Presentation-only state (never read by gameplay)
    const fx = ArcadeHub.fx;
    const sparks = fx.createParticles(360);
    const camShake = fx.createShake(14);
    let sceneTime = 0;
    let overlayT = 0;
    // Skips redraws once the pause panel has settled (the scene is frozen while paused)
    const idleGate = fx.createIdleGate();
    let exhaustTimer = 0;
    const skyStars = [];
    for (let i = 0; i < 60; i++) {
      skyStars.push({ x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.3 + 0.4, tw: Math.random() * 6.28 });
    }

    // Combat & Comic Effects
    let leanAngle = 0;
    let kickTimer = 0;
    let kickSide = 1; // -1 left, +1 right
    let hurtFlash = 0;
    let statusBanner = '';
    let bannerTimer = 0;
    let comicPopups = []; // Array of { x, y, text, subtext, color, scale, life }

    // Input State
    const keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      nitro: false
    };

    // Traffic & Rival Bikers
    let rivals = [];
    let cars = [];

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#94a3b8;font-weight:700;">Chế độ:</span>
          <button type="button" class="pill-btn active" data-diff="easy">🟢 Dễ (Chạy chậm • Ít mất máu)</button>
          <button type="button" class="pill-btn" data-diff="hard">🔴 Khó (Tốc độ cao)</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="rrCanvas" class="game-canvas"></canvas>
      </div>

      <div class="touch-controls">
        <div class="touch-cluster">
          <button type="button" class="touch-btn" id="rrBtnLeft">◀ RẼ TRÁI</button>
          <button type="button" class="touch-btn" id="rrBtnRight">RẼ PHẢI ▶</button>
          <button type="button" class="pill-btn active" id="rrAutoGasBtn" style="height:50px;">⚙ Tự giữ ga: BẬT</button>
          <button type="button" class="pill-btn" id="rrPauseBtn" style="height:50px;" aria-label="Tạm dừng / Tiếp tục">⏸ Dừng</button>
        </div>
        <div class="touch-cluster">
          <button type="button" class="touch-btn action-danger" id="rrBtnKick">🦵 TUNG CÚ ĐÁ (SPACE)</button>
          <button type="button" class="touch-btn action-boost" id="rrBtnNitro">⚡ NITRO (SHIFT)</button>
        </div>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#rrCanvas');
    const g2d = canvas.getContext('2d');
    const autoGasBtn = shell.querySelector('#rrAutoGasBtn');
    const btnLeft = shell.querySelector('#rrBtnLeft');
    const btnRight = shell.querySelector('#rrBtnRight');
    const btnKick = shell.querySelector('#rrBtnKick');
    const btnNitro = shell.querySelector('#rrBtnNitro');
    const pauseBtn = shell.querySelector('#rrPauseBtn');

    function releaseAllKeys() {
      Object.keys(keys).forEach((k) => {
        keys[k] = false;
      });
      shell.querySelectorAll('.touch-btn.pressed').forEach((b) => b.classList.remove('pressed'));
    }

    function setPaused(next) {
      if (isGameOver && next) return;
      isPaused = next;
      if (isPaused) releaseAllKeys();
      pauseBtn.textContent = isPaused ? '▶ Chạy' : '⏸ Dừng';
      pauseBtn.classList.toggle('active', isPaused);
    }

    function buildSkyline() {
      skylineBuildings = [];
      let curX = -80;
      while (curX < 1400) {
        const bw = 38 + Math.floor(Math.random() * 52);
        const bh = 55 + Math.floor(Math.random() * 115);
        const spire = Math.random() < 0.35;
        const tint =
          Math.random() < 0.5 ? '#1e1b4b' : Math.random() < 0.5 ? '#172554' : '#311042';
        skylineBuildings.push({ x: curX, w: bw, h: bh, spire, tint, seed: Math.floor(Math.random() * 1000) });
        curX += bw - 4;
      }
    }

    // Paint every building once into a strip that tiles every SKYLINE_SPAN px; the extra 120px
    // holds buildings that spill past the end (the strip is drawn twice, see drawScene).
    function buildSkylineLayer() {
      const stripW = SKYLINE_SPAN + 120;
      const layer = document.createElement('canvas');
      layer.width = Math.ceil(stripW * canvasDpr);
      layer.height = Math.ceil(SKYLINE_STRIP_H * canvasDpr);
      const lg = layer.getContext('2d');
      lg.scale(canvasDpr, canvasDpr);
      const baseY = SKYLINE_STRIP_H;
      skylineBuildings.forEach((b) => {
        const bx = ((b.x % SKYLINE_SPAN) + SKYLINE_SPAN) % SKYLINE_SPAN;
        const by = baseY - b.h;
        const bGrad = lg.createLinearGradient(0, by, 0, baseY);
        bGrad.addColorStop(0, b.tint);
        bGrad.addColorStop(1, '#0a0418');
        lg.fillStyle = bGrad;
        lg.strokeStyle = '#090d16';
        lg.lineWidth = 2;
        lg.fillRect(bx, by, b.w, b.h);
        lg.strokeRect(bx, by, b.w, b.h);
        if (b.spire) {
          lg.fillStyle = b.tint;
          lg.beginPath();
          lg.moveTo(bx + b.w * 0.5, by - 24);
          lg.lineTo(bx + b.w * 0.3, by);
          lg.lineTo(bx + b.w * 0.7, by);
          lg.closePath();
          lg.fill();
          lg.stroke();
        }
        // Window grid: same deterministic pattern as before (offsets are exact integers here)
        for (let oy = 8; oy < b.h - 8; oy += 11) {
          for (let ox = 6; ox < b.w - 6; ox += 9) {
            const hsh = (ox * 7 + oy * 13 + b.seed) % 11;
            if (hsh > 3) continue;
            lg.fillStyle = hsh === 0 ? 'rgba(56, 189, 248, 0.75)' : 'rgba(253, 224, 71, 0.6)';
            lg.fillRect(bx + ox, by + oy, 4, 5);
          }
        }
      });
      skylineLayer = { canvas: layer, w: stripW, dpr: canvasDpr };
    }

    function buildTrack() {
      segments = [];
      const buildingPalettes = [
        { wall: '#b91c1c', side: '#7f1d1d', roof: '#f59e0b', awning: '#2563eb' },
        { wall: '#1d4ed8', side: '#1e3a8a', roof: '#38bdf8', awning: '#ef4444' },
        { wall: '#b45309', side: '#78350f', roof: '#fde047', awning: '#10b981' },
        { wall: '#6d28d9', side: '#4c1d95', roof: '#c084fc', awning: '#f97316' },
        { wall: '#334155', side: '#0f172a', roof: '#94a3b8', awning: '#eab308' }
      ];

      for (let i = 0; i < TOTAL_SEGMENTS; i++) {
        let curve = 0;
        const u = i / TRACK_STRETCH; // position on the original 260-segment layout
        if (u > 20 && u < 68) curve = 1.55;
        else if (u >= 88 && u < 135) curve = -1.85;
        else if (u >= 155 && u < 192) curve = 1.35;
        else if (u >= 205 && u < 240) curve = -1.45;

        let leftProp = null;
        let rightProp = null;

        if (i % 7 === 0) {
          leftProp = {
            type: 'building',
            floors: 2 + (i % 3),
            palette: buildingPalettes[i % buildingPalettes.length]
          };
        } else if (i % 7 === 3) {
          leftProp = { type: 'palm' };
        } else if (i % 5 === 0) {
          leftProp = { type: 'lamp' };
        }

        if ((i + 3) % 7 === 0) {
          rightProp = {
            type: 'building',
            floors: 2 + ((i + 2) % 3),
            palette: buildingPalettes[(i + 2) % buildingPalettes.length]
          };
        } else if ((i + 3) % 7 === 3) {
          rightProp = { type: 'palm' };
        } else if (i % 14 === 0) {
          rightProp = { type: 'billboard' };
        } else if (i % 5 === 0) {
          rightProp = { type: 'lamp' };
        }

        segments.push({
          index: i,
          curve,
          leftProp,
          rightProp
        });
      }
    }

    function addComicPopup(x, y, text, subtext, color) {
      comicPopups.push({
        x,
        y,
        text,
        subtext: subtext || '',
        color: color || '#fbbf24',
        scale: 0.4,
        life: 1.15
      });
    }

    function resetGame() {
      const cfg = DIFFICULTY_CFG[difficulty];
      maxSpeed = cfg.maxSpeed;
      nitroMaxSpeed = cfg.nitroMaxSpeed;
      buildSkyline();
      skylineLayer = null;
      buildTrack();
      trackPos = 0;
      playerX = 0;
      speed = 0;
      bikeHp = 100;
      nitroFuel = 100;
      score = 0;
      distanceKm = 0;
      knockouts = 0;
      isGameOver = false;
      leanAngle = 0;
      kickTimer = 0;
      hurtFlash = 0;
      comicPopups = [];
      sparks.clear();
      camShake.reset();
      if (pauseBtn) setPaused(false);
      statusBanner = '🏁 ÁP SÁT ĐỐI THỦ & BẤM SPACE ĐỂ TUNG CÚ ĐÁ MARVEL SMASH!';
      bannerTimer = 3.5;

      rivals = [
        {
          zOffset: 420,
          x: -0.45,
          speed: maxSpeed * 0.7,
          suitColor: '#9333ea',
          accentColor: '#22c55e',
          bikeColor: '#581c87',
          name: 'GREEN VIPER',
          knocked: 0
        },
        {
          zOffset: 860,
          x: 0.42,
          speed: maxSpeed * 0.76,
          suitColor: '#dc2626',
          accentColor: '#facc15',
          bikeColor: '#991b1b',
          name: 'PYRO RIDER',
          knocked: 0
        },
        {
          zOffset: 1320,
          x: -0.15,
          speed: maxSpeed * 0.82,
          suitColor: '#1e293b',
          accentColor: '#38bdf8',
          bikeColor: '#0f172a',
          name: 'VENOM BIKER',
          knocked: 0
        }
      ];

      cars = [
        { zOffset: 620, x: -0.62, speed: randomCarSpeed(), bodyColor: '#ef4444', roofColor: '#fca5a5', kind: 'sedan' },
        { zOffset: 1080, x: 0.62, speed: randomCarSpeed(), bodyColor: '#eab308', roofColor: '#fef08a', kind: 'taxi' },
        { zOffset: 1540, x: 0.0, speed: randomCarSpeed(), bodyColor: '#2563eb', roofColor: '#93c5fd', kind: 'suv' },
        { zOffset: 2000, x: -0.62, speed: randomCarSpeed(), bodyColor: '#10b981', roofColor: '#a7f3d0', kind: 'van' }
      ];

      ctx.updateScore(0);
    }

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 1020);
      const maxH = Math.max(360, Math.min(window.innerHeight - 205, 580));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasDpr = dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function triggerKick() {
      if (isGameOver || isPaused || kickTimer > 0) return;
      kickTimer = 0.36;
      ArcadeHub.sound.shoot();

      let hitAny = false;
      rivals.forEach((rv) => {
        if (rv.knocked > 0) return;
        const zDiff = Math.abs(rv.zOffset - 125);
        const xDiff = rv.x - playerX;
        if (zDiff < 115 && Math.abs(xDiff) < 0.45) {
          hitAny = true;
          kickSide = xDiff >= 0 ? 1 : -1;
          rv.knocked = 1.6;
          rv.vxKnock = kickSide * 1.65;
          knockouts += 1;
          score += 350;
          ArcadeHub.sound.explosion();
          camShake.add(0.45);
          sparks.burst(width * 0.5 + kickSide * 70, height - 90, {
            kind: 'star',
            count: 14,
            speed: [160, 420],
            life: [0.3, 0.6],
            size: [2, 4],
            colors: ['#fde047', '#ffffff', '#fb923c']
          });
          addComicPopup(
            width * 0.5 + kickSide * 120,
            height - 155,
            'SMASH!!',
            `+350 HẠ GỤC ${rv.name}`,
            '#fbbf24'
          );
        }
      });

      if (!hitAny) {
        kickSide = keys.left ? -1 : 1;
      }
    }

    // Respawn a traffic car ahead without walling off the road: cars close in depth must leave
    // at least one lane free, otherwise the new car is pushed further back.
    function laneOf(x) {
      let best = LANES[0];
      LANES.forEach((l) => {
        if (Math.abs(l - x) < Math.abs(best - x)) best = l;
      });
      return best;
    }

    function randomCarSpeed() {
      const [lo, hi] = DIFFICULTY_CFG[difficulty].carSpeed;
      return maxSpeed * (lo + Math.random() * (hi - lo));
    }

    function placeCar(car, z) {
      car.speed = randomCarSpeed();
      let zNew = z;
      for (let tries = 0; tries < 4; tries++) {
        const near = cars.filter((o) => o !== car && Math.abs(o.zOffset - zNew) < CAR_SPACING);
        const used = new Set(near.map((o) => laneOf(o.x)));
        const free = LANES.filter((l) => !used.has(l));
        if (free.length >= 2) {
          car.zOffset = zNew;
          car.x = free[Math.floor(Math.random() * free.length)];
          return;
        }
        zNew = Math.max(...near.map((o) => o.zOffset)) + CAR_SPACING;
      }
      car.zOffset = zNew;
      car.x = LANES[Math.floor(Math.random() * LANES.length)];
    }

    function updateGame(dt) {
      if (isGameOver || isPaused) return;

      if (kickTimer > 0) kickTimer = Math.max(0, kickTimer - dt);
      if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt * 2.5);
      if (bannerTimer > 0) bannerTimer = Math.max(0, bannerTimer - dt);

      for (let i = comicPopups.length - 1; i >= 0; i--) {
        const cp = comicPopups[i];
        cp.scale = Math.min(1.15, cp.scale + dt * 4.5);
        cp.y -= dt * 28;
        cp.life -= dt;
        if (cp.life <= 0) comicPopups.splice(i, 1);
      }

      // Acceleration & Nitro
      const usingNitro = keys.nitro && nitroFuel > 4;
      const targetMax = usingNitro ? nitroMaxSpeed : maxSpeed;

      if (usingNitro) {
        nitroFuel = Math.max(0, nitroFuel - dt * 30);
      } else {
        nitroFuel = Math.min(100, nitroFuel + dt * 11);
      }

      if (keys.down) {
        speed = Math.max(0, speed - dt * 230);
      } else if (keys.up || autoThrottle || usingNitro) {
        const accel = usingNitro ? 200 : 120;
        if (speed < targetMax) {
          speed = Math.min(targetMax, speed + dt * accel);
        } else {
          speed = Math.max(targetMax, speed - dt * 95);
        }
      } else {
        speed = Math.max(0, speed - dt * 75);
      }

      // Off-road slowdown
      if (Math.abs(playerX) > 1.04) {
        speed = Math.max(75, speed - dt * 155);
      }

      const forwardStep = speed * dt * ROAD_SCROLL;
      trackPos += forwardStep;
      distanceKm += (speed * dt) / 3600;
      score += Math.round(speed * dt * 0.65);

      const currentSegIdx = Math.floor(trackPos / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
      const currentSeg = segments[currentSegIdx];

      // Centrifugal pull on curves
      const speedRatio = speed / maxSpeed;
      playerX -= currentSeg.curve * speedRatio * dt * DIFFICULTY_CFG[difficulty].curvePull;

      // Steering
      const steerPower = 1.6 * dt * Math.max(0.35, speedRatio);
      if (keys.left) {
        playerX -= steerPower;
        leanAngle = Math.max(-1, leanAngle - dt * 6.5);
      } else if (keys.right) {
        playerX += steerPower;
        leanAngle = Math.min(1, leanAngle + dt * 6.5);
      } else {
        leanAngle *= Math.pow(0.06, dt);
      }

      playerX = Math.max(-1.42, Math.min(1.42, playerX));

      // Rivals update
      rivals.forEach((rv) => {
        if (rv.knocked > 0) {
          // A knocked-down bike lies still on the road, so it slides back with the asphalt
          rv.knocked -= dt;
          rv.x += (rv.vxKnock || 1) * dt;
          rv.zOffset -= speed * dt * Z_PER_SPEED;
        } else {
          rv.zOffset += (rv.speed - speed) * dt * Z_PER_SPEED;
          rv.x += Math.sin(performance.now() * 0.0022 + rv.speed) * dt * 0.26;
          rv.x = Math.max(-0.85, Math.min(0.85, rv.x));

          if (Math.abs(rv.zOffset - COLLIDE_Z) < 48 && Math.abs(rv.x - playerX) < collisionReach(BIKE_HALF_W)) {
            const pushDir = playerX >= rv.x ? 1 : -1;
            playerX += pushDir * 0.25;
            rv.x -= pushDir * 0.25;
            bikeHp = Math.max(0, bikeHp - DIFFICULTY_CFG[difficulty].rivalDamage);
            hurtFlash = 0.65;
            camShake.add(0.3);
            sparks.burst(width * 0.5 - pushDir * 30, height - 60, {
              kind: 'spark',
              count: 12,
              speed: [180, 420],
              life: [0.2, 0.45],
              gravity: 600,
              colors: ['#fde047', '#fb923c', '#ffffff']
            });
            ArcadeHub.sound.hit();
            addComicPopup(width * 0.5, height - 150, 'BAM!', `-${DIFFICULTY_CFG[difficulty].rivalDamage}% GIÁP`, '#f43f5e');
            if (bikeHp <= 0 && !isGameOver) {
              isGameOver = true;
              ArcadeHub.sound.gameOver();
              ctx.submitHighScore(score, `${distanceKm.toFixed(1)} km • ${knockouts} K.O. • ${DIFFICULTY_CFG[difficulty].label}`);
            }
          }
        }

        if (rv.zOffset < -120 || rv.zOffset > 2200) {
          rv.zOffset = 1450 + Math.random() * 650;
          rv.x = (Math.random() - 0.5) * 1.4;
          rv.knocked = 0;
          rv.speed = maxSpeed * (RIVAL_SPEED_RANGE[0] + Math.random() * (RIVAL_SPEED_RANGE[1] - RIVAL_SPEED_RANGE[0]));
        }
      });

      // Traffic cars update
      cars.forEach((car) => {
        car.zOffset += (car.speed - speed) * dt * Z_PER_SPEED;

        if (Math.abs(car.zOffset - COLLIDE_Z) < 55 && Math.abs(car.x - playerX) < collisionReach(CAR_HALF_W)) {
          ArcadeHub.sound.explosion();
          speed = Math.max(55, speed * 0.35);
          bikeHp = Math.max(0, bikeHp - DIFFICULTY_CFG[difficulty].carDamage);
          hurtFlash = 1.0;
          camShake.add(0.85);
          sparks.burst(width * 0.5, height - 70, {
            kind: 'spark',
            count: 26,
            speed: [220, 560],
            life: [0.25, 0.6],
            gravity: 700,
            colors: ['#fef3c7', '#fde047', '#f97316']
          });
          sparks.burst(width * 0.5, height - 70, {
            kind: 'smoke',
            count: 10,
            speed: [30, 110],
            life: [0.6, 1.1],
            size: [10, 18],
            colors: ['#334155', '#1e293b']
          });
          placeCar(car, 1650 + Math.random() * 500);
          addComicPopup(width * 0.5, height * 0.52, 'CRASH!!', `-${DIFFICULTY_CFG[difficulty].carDamage}% ĐỘ BỀN XE`, '#ef4444');

          if (bikeHp <= 0 && !isGameOver) {
            isGameOver = true;
            ArcadeHub.sound.gameOver();
            ctx.submitHighScore(score, `${distanceKm.toFixed(1)} km • ${knockouts} K.O. • ${DIFFICULTY_CFG[difficulty].label}`);
          }
        }

        if (car.zOffset < -100) {
          placeCar(car, 1650 + Math.random() * 600);
          score += 50;
        }
      });

      ctx.updateScore(score);
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      camShake.update(dt);
      sparks.update(dt);
      if (isGameOver) return;

      // Exhaust: grey puffs normally, blue flame sparks with nitro, dust when off-road
      const nitroOn = keys.nitro && nitroFuel > 4;
      exhaustTimer -= dt;
      if (exhaustTimer <= 0 && speed > 20) {
        exhaustTimer = nitroOn ? 0.016 : 0.07;
        const lean = leanAngle * 0.28;
        const k = spriteScale();
        [-18, 18].forEach((ex) => {
          const px = width * 0.5 + (Math.cos(lean) * ex + Math.sin(lean) * 20) * k;
          const py = height - 18 - 21 * k;
          if (nitroOn) {
            sparks.spawn({
              kind: 'dot',
              x: px,
              y: py + 6,
              vx: (Math.random() - 0.5) * 50,
              vy: 160 + Math.random() * 120,
              life: 0.22,
              size: 4 + Math.random() * 3,
              endSize: 0.5,
              color: Math.random() < 0.5 ? '#38bdf8' : '#a855f7'
            });
          } else {
            sparks.spawn({
              kind: 'smoke',
              x: px,
              y: py + 4,
              vx: (Math.random() - 0.5) * 30,
              vy: 40 + Math.random() * 30,
              life: 0.5,
              size: 3,
              endSize: 11,
              color: '#94a3b8',
              alpha: 0.5
            });
          }
        });
        if (Math.abs(playerX) > 1.04) {
          sparks.burst(width * 0.5, height - 22, {
            kind: 'smoke',
            count: 2,
            speed: [40, 120],
            life: [0.4, 0.8],
            size: [6, 10],
            angle: Math.PI / 2,
            spread: 1.6,
            colors: ['#a16207', '#78716c']
          });
        }
      }
    }

    // ====================================================
    // MARVEL COMIC CEL-SHADED DRAWING HELPERS
    // ====================================================
    // Buildings nearer than this scale are painted live (crisp, few of them); the rest come
    // from sprites painted at this scale.
    const BUILDING_SPRITE_SCALE = 0.7;

    function drawComicBuilding(x, y, scale, prop, isLeft) {
      if (scale > BUILDING_SPRITE_SCALE) {
        paintComicBuilding(g2d, x, y, scale, prop, isLeft);
        return;
      }
      // Bounds in unit-scale pixels: facade, cornice lip (4 wide, 7 high), side wall, ink
      const w = 135;
      const h = 85 + prop.floors * 38;
      const depthW = 36;
      const bounds = isLeft
        ? { x0: -w - 7, y0: -h - 10, x1: depthW + 3, y1: 3 }
        : { x0: -depthW - 3, y0: -h - 10, x1: w + 7, y1: 3 };
      const sprite = getCachedSprite(
        `building|${prop.palette.wall}|${prop.floors}|${isLeft ? 'L' : 'R'}`,
        bounds,
        BUILDING_SPRITE_SCALE,
        (g) => paintComicBuilding(g, 0, 0, 1, prop, isLeft)
      );
      blitSprite(sprite, x, y, scale, false, 0);
    }

    function paintComicBuilding(g, x, y, scale, prop, isLeft) {
      const w = 135 * scale;
      const h = (85 + prop.floors * 38) * scale;
      const depthW = 36 * scale;
      const pal = prop.palette;

      g.save();
      const frontX = isLeft ? x - w : x;
      const frontY = y - h;

      // 3D Side Wall (hướng về phía mặt đường)
      g.fillStyle = pal.side;
      g.strokeStyle = '#090d16';
      g.lineWidth = Math.max(1.2, 2.8 * scale);
      g.beginPath();
      if (isLeft) {
        g.moveTo(frontX + w, frontY);
        g.lineTo(frontX + w + depthW, frontY + depthW * 0.45);
        g.lineTo(frontX + w + depthW, y);
        g.lineTo(frontX + w, y);
      } else {
        g.moveTo(frontX, frontY);
        g.lineTo(frontX - depthW, frontY + depthW * 0.45);
        g.lineTo(frontX - depthW, y);
        g.lineTo(frontX, y);
      }
      g.closePath();
      g.fill();
      g.stroke();

      // Main Front Facade
      g.fillStyle = pal.wall;
      g.fillRect(frontX, frontY, w, h);
      g.strokeRect(frontX, frontY, w, h);

      // Rooftop cornice lip
      g.fillStyle = pal.roof;
      g.fillRect(frontX - 4 * scale, frontY - 7 * scale, w + 8 * scale, 8 * scale);
      g.strokeRect(frontX - 4 * scale, frontY - 7 * scale, w + 8 * scale, 8 * scale);

      // Lit Comic Windows
      const cols = 3;
      const rows = prop.floors + 1;
      const winW = (w * 0.56) / cols;
      const winH = (h * 0.55) / rows;
      const gapX = (w - cols * winW) / (cols + 1);
      const gapY = (h * 0.72 - rows * winH) / (rows + 1);

      // Windows never overlap, so they are batched: one fill per colour, then one outline pass
      // (outlines are skipped on far buildings where the ink would be wider than the window).
      ['#fef08a', '#38bdf8'].forEach((color, parity) => {
        g.beginPath();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if ((r + c) % 2 !== parity) continue;
            g.rect(frontX + gapX + c * (winW + gapX), frontY + 12 * scale + r * (winH + gapY), winW, winH);
          }
        }
        g.fillStyle = color;
        g.fill();
      });
      if (winW >= 5) {
        g.beginPath();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            g.rect(frontX + gapX + c * (winW + gapX), frontY + 12 * scale + r * (winH + gapY), winW, winH);
          }
        }
        g.stroke();
      }

      // Ground Floor Storefront Awning
      const awnH = 14 * scale;
      g.fillStyle = pal.awning;
      g.fillRect(frontX + 6 * scale, y - awnH * 1.9, w - 12 * scale, awnH);
      g.strokeRect(frontX + 6 * scale, y - awnH * 1.9, w - 12 * scale, awnH);

      g.restore();
    }

    // Static roadside props are painted once into sprites at the largest on-screen size and
    // blitted afterwards; the right-hand side uses the same sprite mirrored.
    const PROP_REF_SCALE = 1.4; // >= the biggest propScale drawScene produces (about 1.32)
    const PROP_BOUNDS = {
      palm: { x0: -45, y0: -185, x1: 70, y1: 15 },
      lamp: { x0: -10, y0: -165, x1: 62, y1: 8 }
    };

    function paintPalmTree(g) {
      // Curved Trunk with bold comic outline
      g.strokeStyle = '#090d16';
      g.lineWidth = 14;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(14, -55, 6, -115);
      g.stroke();

      g.strokeStyle = '#92400e';
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(14, -55, 6, -115);
      g.stroke();

      // Palm Fronds
      const crownX = 6;
      const crownY = -115;
      const angles = [-2.4, -1.8, -1.1, -0.4, 0.25];
      angles.forEach((ang, i) => {
        g.save();
        g.translate(crownX, crownY);
        g.rotate(ang);
        g.fillStyle = i % 2 === 0 ? '#16a34a' : '#22c55e';
        g.strokeStyle = '#090d16';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(26, -14, 52, 6);
        g.quadraticCurveTo(24, 2, 0, 0);
        g.fill();
        g.stroke();
        g.restore();
      });
    }

    function paintStreetLamp(g) {
      const dir = 1;
      g.strokeStyle = '#090d16';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, -130);
      g.lineTo(dir * 34, -138);
      g.stroke();

      g.strokeStyle = '#cbd5e1';
      g.lineWidth = 3;
      g.stroke();

      // Lamp Head & Glow
      g.fillStyle = '#fef08a';
      g.beginPath();
      g.arc(dir * 34, -136, 7, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = 'rgba(254, 240, 138, 0.22)';
      g.beginPath();
      g.arc(dir * 34, -136, 22, 0, Math.PI * 2);
      g.fill();
    }


    // Static road art (palms, lamps, rival bikers, traffic cars, far buildings) is painted once
    // into sprites and blitted. A sprite is painted at `refScale` times the screen pixel ratio
    // and only ever drawn at that size or smaller, so it stays sharp. Least recently used
    // sprites are dropped beyond SPRITE_CACHE_MAX (2 props + 3 bikers + 3 cars + ~20 buildings).
    const SPRITE_CACHE_MAX = 28;
    const spriteCache = new Map();

    function getCachedSprite(key, bounds, refScale, paint) {
      const fullKey = `${key}@${canvasDpr}`;
      let sprite = spriteCache.get(fullKey);
      if (sprite) {
        spriteCache.delete(fullKey);
        spriteCache.set(fullKey, sprite);
        return sprite;
      }
      const k = refScale * canvasDpr;
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil((bounds.x1 - bounds.x0) * k));
      cv.height = Math.max(1, Math.ceil((bounds.y1 - bounds.y0) * k));
      const sg = cv.getContext('2d');
      sg.scale(k, k);
      sg.translate(-bounds.x0, -bounds.y0);
      paint(sg);
      sprite = { canvas: cv, x: bounds.x0, y: bounds.y0, w: cv.width / k, h: cv.height / k };
      spriteCache.set(fullKey, sprite);
      if (spriteCache.size > SPRITE_CACHE_MAX) spriteCache.delete(spriteCache.keys().next().value);
      return sprite;
    }

    function blitSprite(sprite, x, y, scale, mirror, rotation) {
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(mirror ? -scale : scale, scale);
      if (rotation) g2d.rotate(rotation);
      g2d.imageSmoothingQuality = 'high';
      g2d.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h);
      g2d.restore();
    }

    function drawPropSprite(kind, x, y, scale, isLeft) {
      const sprite = getCachedSprite(kind, PROP_BOUNDS[kind], PROP_REF_SCALE, kind === 'palm' ? paintPalmTree : paintStreetLamp);
      blitSprite(sprite, x, y, scale, !isLeft, 0);
    }

    function drawComicPalmTree(x, y, scale, isLeft) {
      drawPropSprite('palm', x, y, scale, isLeft);
    }

    function drawStreetLamp(x, y, scale, isLeft) {
      drawPropSprite('lamp', x, y, scale, isLeft);
    }

    function drawBillboard(x, y, scale) {
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(scale, scale);

      // Pillars
      g2d.fillStyle = '#334155';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 3;
      g2d.fillRect(-35, -55, 10, 55);
      g2d.strokeRect(-35, -55, 10, 55);
      g2d.fillRect(25, -55, 10, 55);
      g2d.strokeRect(25, -55, 10, 55);

      // Board Panel
      g2d.fillStyle = '#dc2626';
      g2d.fillRect(-68, -115, 136, 62);
      g2d.strokeRect(-68, -115, 136, 62);

      g2d.fillStyle = '#facc15';
      g2d.beginPath();
      g2d.moveTo(-62, -60);
      g2d.lineTo(-10, -110);
      g2d.lineTo(62, -110);
      g2d.lineTo(15, -60);
      g2d.closePath();
      g2d.fill();

      g2d.fillStyle = '#ffffff';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 3;
      g2d.font = `900 18px ${fx.FONT_STACK}`;
      g2d.textAlign = 'center';
      g2d.strokeText('MARVEL SPEED', 0, -78);
      g2d.fillText('MARVEL SPEED', 0, -78);

      g2d.restore();
    }

    const VEHICLE_REF_SCALE = 1.4; // >= the largest entity scale (about 1.3)
    const CAR_BOUNDS = { x0: -52, y0: -70, x1: 52, y1: 10 };

    function paintTrafficCar(g, car) {

      // Ground Shadow
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.beginPath();
      g.ellipse(0, -2, 48, 10, 0, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = '#090d16';
      g.lineWidth = 3.2;

      // Left & Right Tires
      g.fillStyle = '#0f172a';
      g.beginPath();
      g.roundRect(-44, -18, 16, 18, 4);
      g.roundRect(28, -18, 16, 18, 4);
      g.fill();
      g.stroke();

      // Lower Chassis Body
      g.fillStyle = car.bodyColor;
      g.beginPath();
      g.roundRect(-46, -42, 92, 28, 7);
      g.fill();
      g.stroke();

      // Cel-shaded highlight band on body
      g.fillStyle = 'rgba(255,255,255,0.24)';
      g.fillRect(-42, -40, 84, 7);

      // Upper Cabin / Roof
      g.fillStyle = car.roofColor;
      g.beginPath();
      g.moveTo(-30, -42);
      g.lineTo(-22, -66);
      g.lineTo(22, -66);
      g.lineTo(30, -42);
      g.closePath();
      g.fill();
      g.stroke();

      // Rear Windshield with comic reflection slash
      g.fillStyle = '#1e293b';
      g.beginPath();
      g.moveTo(-24, -44);
      g.lineTo(-18, -62);
      g.lineTo(18, -62);
      g.lineTo(24, -44);
      g.closePath();
      g.fill();
      g.stroke();

      g.strokeStyle = 'rgba(186, 230, 253, 0.65)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-12, -46);
      g.lineTo(-4, -60);
      g.moveTo(-2, -46);
      g.lineTo(6, -60);
      g.stroke();

      // Glowing Tail Lights & License Plate
      g.strokeStyle = '#090d16';
      g.lineWidth = 2;
      g.fillStyle = '#ff1e42';
      g.fillRect(-41, -33, 18, 9);
      g.strokeRect(-41, -33, 18, 9);
      g.fillRect(23, -33, 18, 9);
      g.strokeRect(23, -33, 18, 9);

      // License plate
      g.fillStyle = '#facc15';
      g.fillRect(-11, -31, 22, 9);
      g.strokeRect(-11, -31, 22, 9);

      // Rear Bumper
      g.fillStyle = '#334155';
      g.beginPath();
      g.roundRect(-48, -19, 96, 7, 3);
      g.fill();
      g.stroke();

    }

    function drawDetailedTrafficCar(car, proj) {
      const sprite = getCachedSprite(`car|${car.bodyColor}|${car.roofColor}`, CAR_BOUNDS, VEHICLE_REF_SCALE, (g) =>
        paintTrafficCar(g, car)
      );
      blitSprite(sprite, proj.x, proj.y, proj.scale, false, 0);
    }

    const BIKER_BOUNDS = { x0: -50, y0: -126, x1: 50, y1: 12 };

    function paintBiker(g, opts) {
      // Ground Shadow
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.beginPath();
      g.ellipse(0, -2, 32, 9, 0, 0, Math.PI * 2);
      g.fill();

      // Kick Action Leg + Comic Motion Arc
      if (opts.kicking) {
        const dir = opts.kickSide || 1;
        g.fillStyle = 'rgba(250, 204, 21, 0.45)';
        g.beginPath();
        g.arc(dir * 26, -54, 34, -0.7, 0.7, dir < 0);
        g.fill();

        g.strokeStyle = '#090d16';
        g.lineWidth = 3.2;
        g.fillStyle = opts.suitColor;
        g.beginPath();
        g.roundRect(dir > 0 ? 8 : -54, -60, 46, 15, 6);
        g.fill();
        g.stroke();

        // Armored Boot
        g.fillStyle = opts.accentColor;
        g.beginPath();
        g.roundRect(dir > 0 ? 46 : -64, -67, 18, 24, 5);
        g.fill();
        g.stroke();
      }

      // Nitro Flame Exhausts
      if (opts.nitroActive) {
        [-16, 16].forEach((ex) => {
          g.fillStyle = '#38bdf8';
          g.beginPath();
          g.moveTo(ex - 6, -18);
          g.lineTo(ex + 6, -18);
          g.lineTo(ex, 16 + Math.random() * 18);
          g.closePath();
          g.fill();

          g.fillStyle = '#fef08a';
          g.beginPath();
          g.moveTo(ex - 3, -18);
          g.lineTo(ex + 3, -18);
          g.lineTo(ex, 4 + Math.random() * 8);
          g.closePath();
          g.fill();
        });
      }

      g.strokeStyle = '#090d16';
      g.lineWidth = 3.2;

      // Dual Chrome Exhaust Pipes
      g.fillStyle = '#94a3b8';
      g.beginPath();
      g.roundRect(-22, -34, 9, 18, 4);
      g.roundRect(13, -34, 9, 18, 4);
      g.fill();
      g.stroke();

      // Wide Racing Rear Tire with Treads
      g.fillStyle = '#0f172a';
      g.beginPath();
      g.roundRect(-14, -42, 28, 42, 8);
      g.fill();
      g.stroke();

      g.strokeStyle = '#334155';
      g.lineWidth = 2;
      for (let ty = -34; ty <= -8; ty += 7) {
        g.beginPath();
        g.moveTo(-10, ty);
        g.lineTo(10, ty);
        g.stroke();
      }

      g.strokeStyle = '#090d16';
      g.lineWidth = 3.2;

      // Rider Legs / Knee Guards gripping bike
      g.fillStyle = '#1e293b';
      g.beginPath();
      g.ellipse(-20, -48, 8, 18, 0.2, 0, Math.PI * 2);
      g.ellipse(20, -48, 8, 18, -0.2, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Sportbike Sculpted Tail Fairing
      g.fillStyle = opts.bikeColor;
      g.beginPath();
      g.moveTo(-24, -44);
      g.lineTo(-18, -68);
      g.lineTo(18, -68);
      g.lineTo(24, -44);
      g.closePath();
      g.fill();
      g.stroke();

      // Glowing LED Tail Light
      g.fillStyle = '#ff1e42';
      g.beginPath();
      g.roundRect(-11, -62, 22, 8, 3);
      g.fill();
      g.stroke();

      // Handlebars & Side Mirrors
      g.strokeStyle = '#090d16';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-34, -82);
      g.lineTo(34, -82);
      g.stroke();

      g.fillStyle = '#38bdf8';
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(-36, -88, 7, 4, -0.3, 0, Math.PI * 2);
      g.ellipse(36, -88, 7, 4, 0.3, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Rider Muscular Marvel-Style Armored Torso
      g.fillStyle = opts.suitColor;
      g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(-16, -64);
      g.lineTo(-26, -94);
      g.lineTo(26, -94);
      g.lineTo(16, -64);
      g.closePath();
      g.fill();
      g.stroke();

      // Shoulder Armor Pads & Heroic Emblem on Back
      g.fillStyle = opts.accentColor;
      g.beginPath();
      g.ellipse(-25, -90, 9, 6, -0.4, 0, Math.PI * 2);
      g.ellipse(25, -90, 9, 6, 0.4, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Spine Star / Chevron Emblem
      g.fillStyle = opts.accentColor;
      g.beginPath();
      g.moveTo(0, -89);
      g.lineTo(9, -78);
      g.lineTo(0, -69);
      g.lineTo(-9, -78);
      g.closePath();
      g.fill();
      g.stroke();

      // Aerodynamic Racing Helmet with Glossy Visor Rim
      g.fillStyle = opts.helmetColor || opts.suitColor;
      g.beginPath();
      g.arc(0, -105, 15, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Helmet Comic Highlight Stripe
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(-5, -110, 4.5, 0, Math.PI * 2);
      g.fill();

    }

    // The player bike is painted live (lean, kick, nitro flames)
    function drawDetailedBiker(projX, projY, scale, opts) {
      g2d.save();
      g2d.translate(projX, projY);
      g2d.scale(scale, scale);
      if (opts.lean) {
        g2d.rotate(opts.lean);
      }
      paintBiker(g2d, opts);
      g2d.restore();
    }

    // Rival bikers never kick or use nitro: one sprite per rider, rotated when knocked over
    function drawRivalBiker(rv, proj) {
      const sprite = getCachedSprite(`biker|${rv.suitColor}|${rv.accentColor}|${rv.bikeColor}`, BIKER_BOUNDS, VEHICLE_REF_SCALE, (g) =>
        paintBiker(g, {
          suitColor: rv.suitColor,
          accentColor: rv.accentColor,
          bikeColor: rv.bikeColor,
          helmetColor: '#f8fafc',
          kicking: false,
          nitroActive: false
        })
      );
      const lean = rv.knocked > 0 ? 0.85 * (rv.vxKnock > 0 ? 1 : -1) : 0;
      blitSprite(sprite, proj.x, proj.y, proj.scale, false, lean);
    }

    // ====================================================
    // IN-CANVAS MARVEL HUD DASHBOARD (TỐC ĐỘ, MÁU, NITRO, ĐIỂM)
    // ====================================================
    function drawInGameHud() {
      g2d.save();
      // Narrow canvases (phones) get a proportionally smaller HUD so panels never overlap.
      const hudK = Math.max(0.62, Math.min(1, width / 760));

      // 1. TOP-LEFT PANEL: MÁU (HP) & NITRO BARS
      const panelX = 16;
      const panelY = 14;
      g2d.save();
      g2d.translate(panelX, panelY);
      g2d.scale(hudK, hudK);
      g2d.translate(-panelX, -panelY);

      // Slanted Comic Backing Box
      g2d.fillStyle = 'rgba(9, 13, 22, 0.82)';
      g2d.strokeStyle = '#38bdf8';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.moveTo(panelX, panelY);
      g2d.lineTo(panelX + 250, panelY);
      g2d.lineTo(panelX + 236, panelY + 76);
      g2d.lineTo(panelX, panelY + 76);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // HP Bar (MÁU / GIÁP XE)
      const hpRatio = Math.max(0, Math.min(1, bikeHp / 100));
      const hpColor =
        bikeHp > 55 ? '#22c55e' : bikeHp > 25 ? '#f59e0b' : '#ef4444';

      g2d.fillStyle = '#ffffff';
      g2d.font = `800 12px ${fx.FONT_STACK}`;
      g2d.textAlign = 'left';
      g2d.fillText(`🛡 MÁU / ĐỘ BỀN XE: ${Math.round(bikeHp)}%`, panelX + 12, panelY + 21);

      g2d.fillStyle = '#1e293b';
      g2d.fillRect(panelX + 12, panelY + 26, 210, 14);
      g2d.fillStyle = hpColor;
      g2d.fillRect(panelX + 12, panelY + 26, 210 * hpRatio, 14);
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;
      g2d.strokeRect(panelX + 12, panelY + 26, 210, 14);

      // Nitro Bar (NĂNG LƯỢNG NITRO)
      const nitroRatio = Math.max(0, Math.min(1, nitroFuel / 100));
      g2d.fillStyle = '#38bdf8';
      g2d.fillText(`⚡ NITRO BOOST: ${Math.round(nitroFuel)}%`, panelX + 12, panelY + 55);

      g2d.fillStyle = '#1e293b';
      g2d.fillRect(panelX + 12, panelY + 59, 198, 11);
      const nitroGrad = g2d.createLinearGradient(panelX + 12, 0, panelX + 210, 0);
      nitroGrad.addColorStop(0, '#0284c7');
      nitroGrad.addColorStop(1, '#a855f7');
      g2d.fillStyle = nitroGrad;
      g2d.fillRect(panelX + 12, panelY + 59, 198 * nitroRatio, 11);
      g2d.strokeRect(panelX + 12, panelY + 59, 198, 11);
      if (keys.nitro && nitroFuel > 4) {
        fx.glow(g2d, panelX + 12 + 198 * nitroRatio, panelY + 64, 26, '#38bdf8', 0.7);
      }
      g2d.restore();

      // 2. TOP-RIGHT PANEL: ĐIỂM SỐ, QUÃNG ĐƯỜNG & HẠ GỤC (K.O.)
      const rightW = 240;
      const rightX = width - rightW - 16;
      g2d.save();
      g2d.translate(width - 16, panelY);
      g2d.scale(hudK, hudK);
      g2d.translate(-(width - 16), -panelY);
      g2d.fillStyle = 'rgba(9, 13, 22, 0.82)';
      g2d.strokeStyle = '#facc15';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.moveTo(rightX + 14, panelY);
      g2d.lineTo(rightX + rightW, panelY);
      g2d.lineTo(rightX + rightW, panelY + 76);
      g2d.lineTo(rightX, panelY + 76);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      g2d.textAlign = 'right';
      g2d.fillStyle = '#facc15';
      g2d.font = `900 18px ${fx.FONT_STACK}`;
      g2d.fillText(`🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`, rightX + rightW - 12, panelY + 26);

      g2d.fillStyle = '#f8fafc';
      g2d.font = `700 13px ${fx.FONT_STACK}`;
      g2d.fillText(
        `🛣 Quãng đường: ${distanceKm.toFixed(2)} km`,
        rightX + rightW - 12,
        panelY + 48
      );

      g2d.fillStyle = '#fb7185';
      g2d.fillText(
        `🥊 Hạ gục Biker: ${knockouts} K.O.`,
        rightX + rightW - 12,
        panelY + 67
      );
      g2d.restore();

      // 3. BOTTOM-RIGHT SPEEDOMETER DIAL (ĐỒNG HỒ TỐC ĐỘ KM/H TRONG MÀN HÌNH)
      const dialCx = width - 82;
      const dialCy = height - 68;
      const dialR = 54;
      g2d.save();
      g2d.translate(width - 16, height - 14);
      g2d.scale(hudK, hudK);
      g2d.translate(-(width - 16), -(height - 14));
      if (keys.nitro && nitroFuel > 4) {
        fx.glow(g2d, dialCx, dialCy, dialR * 1.8, '#f43f5e', 0.35);
      }

      g2d.fillStyle = 'rgba(9, 13, 22, 0.86)';
      g2d.strokeStyle = keys.nitro && nitroFuel > 4 ? '#f43f5e' : '#38bdf8';
      g2d.lineWidth = 3;
      g2d.beginPath();
      g2d.arc(dialCx, dialCy, dialR, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Speedometer Arc Ticks
      const startAng = Math.PI * 0.75;
      const endAng = Math.PI * 2.25;
      g2d.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      g2d.lineWidth = 5;
      g2d.beginPath();
      g2d.arc(dialCx, dialCy, dialR - 9, startAng, endAng);
      g2d.stroke();

      const spdFraction = Math.min(1, speed / nitroMaxSpeed);
      const activeEndAng = startAng + (endAng - startAng) * spdFraction;
      g2d.strokeStyle = spdFraction > 0.76 ? '#ef4444' : '#22c55e';
      g2d.lineWidth = 6;
      g2d.beginPath();
      g2d.arc(dialCx, dialCy, dialR - 9, startAng, activeEndAng);
      g2d.stroke();

      // Needle
      const needleAng = activeEndAng;
      g2d.strokeStyle = '#facc15';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.moveTo(dialCx, dialCy);
      g2d.lineTo(
        dialCx + Math.cos(needleAng) * (dialR - 14),
        dialCy + Math.sin(needleAng) * (dialR - 14)
      );
      g2d.stroke();

      // Digital Speed Text
      g2d.fillStyle = '#ffffff';
      g2d.font = `900 20px ${fx.FONT_STACK}`;
      g2d.textAlign = 'center';
      g2d.fillText(String(Math.round(speed)), dialCx, dialCy + 18);
      g2d.fillStyle = '#94a3b8';
      g2d.font = `700 10px ${fx.FONT_STACK}`;
      g2d.fillText('KM/H', dialCx, dialCy + 31);
      g2d.restore();

      g2d.restore();
    }

    function drawComicBurstPopup(cp) {
      g2d.save();
      g2d.translate(cp.x, cp.y);
      g2d.scale(cp.scale, cp.scale);

      // Jagged Comic Starburst Polygon
      const spikes = 12;
      const outerR = 54;
      const innerR = 34;
      g2d.fillStyle = cp.color;
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 3.5;
      g2d.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const ang = (i * Math.PI) / spikes;
        const px = Math.cos(ang) * r * 1.35;
        const py = Math.sin(ang) * r * 0.78;
        if (i === 0) g2d.moveTo(px, py);
        else g2d.lineTo(px, py);
      }
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      g2d.fillStyle = '#ffffff';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 4;
      g2d.font = `italic 900 22px ${fx.FONT_STACK}`;
      g2d.textAlign = 'center';
      g2d.strokeText(cp.text, 0, 4);
      g2d.fillText(cp.text, 0, 4);

      if (cp.subtext) {
        g2d.font = `800 11px ${fx.FONT_STACK}`;
        g2d.fillStyle = '#fef08a';
        g2d.strokeText(cp.subtext, 0, 22);
        g2d.fillText(cp.subtext, 0, 22);
      }

      g2d.restore();
    }

    function drawScene() {
      const horizonY = Math.floor(height * 0.43);
      g2d.save();
      camShake.apply(g2d);

      // 1. Synthwave sunset sky with stars
      const skyGrad = g2d.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#050816');
      skyGrad.addColorStop(0.4, '#3b0764');
      skyGrad.addColorStop(0.78, '#be123c');
      skyGrad.addColorStop(1, '#f97316');
      g2d.fillStyle = skyGrad;
      g2d.fillRect(0, 0, width, horizonY);

      g2d.fillStyle = '#ffffff';
      skyStars.forEach((st) => {
        const a = (1 - st.y / 0.55) * (0.4 + 0.4 * Math.sin(sceneTime * 2 + st.tw));
        if (a <= 0.05) return;
        g2d.globalAlpha = a;
        g2d.fillRect(st.x * width, st.y * horizonY, st.r, st.r);
      });
      g2d.globalAlpha = 1;

      // Striped retro sun with bloom
      const sunX = width * 0.5;
      const sunR = Math.min(70, width * 0.09);
      const sunY = horizonY - sunR * 0.35;
      fx.glow(g2d, sunX, sunY, sunR * 3.2, '#f97316', 0.55);
      g2d.save();
      g2d.beginPath();
      g2d.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      g2d.clip();
      const sunGrad = g2d.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.5, '#fb923c');
      sunGrad.addColorStop(1, '#db2777');
      g2d.fillStyle = sunGrad;
      g2d.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
      g2d.fillStyle = '#7c1d3f';
      for (let k = 0; k < 6; k++) {
        const band = sunY + sunR * (0.05 + k * 0.17);
        g2d.fillRect(sunX - sunR, band, sunR * 2, 1.5 + k * 1.3);
      }
      g2d.restore();

      // Far neon mountain ridge (slow parallax, follows road curves a little)
      const curveDrift = segments.length
        ? segments[Math.floor(trackPos / SEGMENT_LENGTH) % TOTAL_SEGMENTS].curve * 6
        : 0;
      const ridgeShift = (((trackPos / TRACK_STRETCH) * 0.008 + curveDrift * 10) % 360 + 360) % 360;
      g2d.fillStyle = '#1e0b3a';
      g2d.strokeStyle = 'rgba(244, 114, 182, 0.7)';
      g2d.lineWidth = 1.5;
      g2d.beginPath();
      g2d.moveTo(0, horizonY);
      for (let x = -360; x <= width + 360; x += 60) {
        const px = x - ridgeShift;
        const peak = 26 + ((Math.sin(x * 0.013) + 1) * 0.5) * 34 + ((x / 60) % 2 === 0 ? 0 : 14);
        g2d.lineTo(px, horizonY - peak);
      }
      g2d.lineTo(width, horizonY);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Parallax city skyline: pre-painted strip tiled every SKYLINE_SPAN px (continuous wrap)
      if (!skylineLayer || skylineLayer.dpr !== canvasDpr) buildSkylineLayer();
      const parallaxOffset = (trackPos / TRACK_STRETCH) * 0.04 + curveDrift * 4;
      const tileX = ((((-parallaxOffset) % SKYLINE_SPAN) + SKYLINE_SPAN) % SKYLINE_SPAN) - 120;
      const stripY = horizonY - SKYLINE_STRIP_H;
      [tileX, tileX - SKYLINE_SPAN].forEach((x0) => {
        if (x0 > width || x0 + skylineLayer.w < 0) return;
        // Snap to device pixels so the small windows stay crisp
        const sx = Math.round(x0 * canvasDpr) / canvasDpr;
        g2d.drawImage(skylineLayer.canvas, sx, stripY, skylineLayer.w, SKYLINE_STRIP_H);
      });
      // Blinking spire lights stay live
      skylineBuildings.forEach((b) => {
        if (!b.spire || Math.sin(sceneTime * 3 + b.seed) <= 0.2) return;
        const bx = ((((b.x - parallaxOffset) % SKYLINE_SPAN) + SKYLINE_SPAN) % SKYLINE_SPAN) - 120;
        if (bx > width + 20 || bx + b.w < -20) return;
        fx.glow(g2d, bx + b.w * 0.5, horizonY - b.h - 24, 8, '#ef4444', 0.9);
      });

      // Horizon haze line
      const haze = g2d.createLinearGradient(0, horizonY - 14, 0, horizonY + 6);
      haze.addColorStop(0, 'rgba(249, 115, 22, 0)');
      haze.addColorStop(1, 'rgba(249, 115, 22, 0.45)');
      g2d.fillStyle = haze;
      g2d.fillRect(0, horizonY - 14, width, 20);

      // 2. Pseudo-3D Road Projection
      const baseSegIdx = Math.floor(trackPos / SEGMENT_LENGTH);
      const subSegOffset = (trackPos % SEGMENT_LENGTH) / SEGMENT_LENGTH;
      const roadSlices = 68;

      let accumCurve = 0;
      let curveStep = 0;

      const sliceData = [];
      for (let i = 1; i <= roadSlices; i++) {
        const seg = segments[(baseSegIdx + i) % TOTAL_SEGMENTS];
        const depth = (i - subSegOffset) / roadSlices;
        const perspective = 1 / (1 + depth * 6.5);
        const screenY = horizonY + (height - horizonY) * perspective;
        const roadHalfWidth = width * 0.56 * perspective;

        // The nearest segment is partly behind the camera: fade its bend out as it passes so
        // the road does not snap sideways each time a segment drops off on a curve.
        curveStep += seg.curve * 0.45 * (i === 1 ? 1 - subSegOffset : 1);
        accumCurve += curveStep * (1 - perspective);
        const centerX = width * 0.5 - playerX * roadHalfWidth + accumCurve;

        sliceData.push({
          seg,
          screenY,
          roadHalfWidth,
          centerX,
          perspective,
          curveX: accumCurve
        });
      }

      // Road surface, batched by colour. Props stand on their slice line and only extend
      // upwards, so nearer road slices never cover them: the whole road can go first and the
      // props are then painted far -> near on top, keeping their mutual overlap order.
      const roadTop = sliceData[sliceData.length - 1].screenY;
      const roadBottom = sliceData[0].screenY + 1.5;
      g2d.fillStyle = '#0f172a';
      g2d.fillRect(0, roadTop, width, roadBottom - roadTop);
      const groundAlt = new Path2D();
      const curb = [new Path2D(), new Path2D()];
      const asphalt = [new Path2D(), new Path2D()];
      const ink = new Path2D();
      const laneMarks = new Path2D();
      const quad = (path, x1, y1, x2, y2, x3, y3, x4, y4) => {
        path.moveTo(x1, y1);
        path.lineTo(x2, y2);
        path.lineTo(x3, y3);
        path.lineTo(x4, y4);
        path.closePath();
      };
      // A stroked segment of width w as a filled quad, so all edges share one fill call
      const thickLine = (path, ax, ay, bx, by, w) => {
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const nx = (-(by - ay) / len) * (w / 2);
        const ny = ((bx - ax) / len) * (w / 2);
        quad(path, ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny);
      };

      for (let i = sliceData.length - 1; i > 0; i--) {
        const far = sliceData[i];
        const near = sliceData[i - 1];
        const segIndex = far.seg.index;
        const alt = segIndex % 2 === 0 ? 1 : 0;

        // Urban Sidewalk / Ground (the other colour is the backdrop filled above)
        if (alt) groundAlt.rect(0, far.screenY, width, near.screenY - far.screenY);

        // Sidewalk Curb (Red/Yellow Comic Curbs)
        const farCurb = far.roadHalfWidth * 1.15;
        const nearCurb = near.roadHalfWidth * 1.15;
        quad(
          curb[alt],
          far.centerX - farCurb, far.screenY,
          far.centerX + farCurb, far.screenY,
          near.centerX + nearCurb, near.screenY,
          near.centerX - nearCurb, near.screenY
        );

        // Main Asphalt Highway
        quad(
          asphalt[alt],
          far.centerX - far.roadHalfWidth, far.screenY,
          far.centerX + far.roadHalfWidth, far.screenY,
          near.centerX + near.roadHalfWidth, near.screenY,
          near.centerX - near.roadHalfWidth, near.screenY
        );

        // Bold Comic Road Edge Ink Lines
        const inkW = Math.max(1, 3 * far.perspective);
        thickLine(ink, far.centerX - far.roadHalfWidth, far.screenY, near.centerX - near.roadHalfWidth, near.screenY, inkW);
        thickLine(ink, far.centerX + far.roadHalfWidth, far.screenY, near.centerX + near.roadHalfWidth, near.screenY, inkW);

        // Lane Dividers (2 lanes)
        if (segIndex % 3 === 0) {
          [-0.33, 0.33].forEach((laneOffset) => {
            const fxl = far.centerX + far.roadHalfWidth * laneOffset;
            const nxl = near.centerX + near.roadHalfWidth * laneOffset;
            const lwF = Math.max(1, far.roadHalfWidth * 0.025);
            const lwN = Math.max(1.5, near.roadHalfWidth * 0.025);
            quad(laneMarks, fxl - lwF, far.screenY, fxl + lwF, far.screenY, nxl + lwN, near.screenY, nxl - lwN, near.screenY);
          });
        }
      }

      g2d.fillStyle = '#1e293b';
      g2d.fill(groundAlt);
      g2d.fillStyle = '#facc15';
      g2d.fill(curb[0]);
      g2d.fillStyle = '#ef4444';
      g2d.fill(curb[1]);
      g2d.fillStyle = '#475569';
      g2d.fill(asphalt[0]);
      g2d.fillStyle = '#334155';
      g2d.fill(asphalt[1]);
      g2d.fillStyle = '#090d16';
      g2d.fill(ink);
      g2d.fillStyle = '#f8fafc';
      g2d.fill(laneMarks);

      for (let i = sliceData.length - 1; i > 0; i--) {
        const far = sliceData[i];

        // Roadside Buildings, Streetlamps, Palm Trees & Billboards
        const propScale = far.perspective * 1.45;
        if (far.seg.leftProp && propScale > 0.08) {
          const lx = far.centerX - far.roadHalfWidth * 1.32;
          const lp = far.seg.leftProp;
          if (lp.type === 'building') {
            drawComicBuilding(lx, far.screenY, propScale, lp, true);
          } else if (lp.type === 'palm') {
            drawComicPalmTree(lx, far.screenY, propScale, true);
          } else if (lp.type === 'lamp') {
            drawStreetLamp(far.centerX - far.roadHalfWidth * 1.16, far.screenY, propScale, true);
          }
        }

        if (far.seg.rightProp && propScale > 0.08) {
          const rx = far.centerX + far.roadHalfWidth * 1.32;
          const rp = far.seg.rightProp;
          if (rp.type === 'building') {
            drawComicBuilding(rx, far.screenY, propScale, rp, false);
          } else if (rp.type === 'palm') {
            drawComicPalmTree(rx, far.screenY, propScale, false);
          } else if (rp.type === 'billboard') {
            drawBillboard(far.centerX + far.roadHalfWidth * 1.55, far.screenY, propScale);
          } else if (rp.type === 'lamp') {
            drawStreetLamp(far.centerX + far.roadHalfWidth * 1.16, far.screenY, propScale, false);
          }
        }
      }

      // Helper to project vehicles & bikers onto the road
      const spriteK = spriteScale();
      // Continuous projection: an entity zOffset/Z_PER_SEGMENT segments ahead uses the same
      // perspective formula as the road slices, and the road bend is interpolated between the
      // two slices around it, so it glides instead of snapping from slice to slice.
      function projectEntity(zOffset, xLane) {
        if (zOffset < 40) return null;
        const dist = zOffset / Z_PER_SEGMENT; // segments ahead of the player
        const f = dist + subSegOffset; // fractional slice number (slice i sits at i - subSegOffset)
        if (f >= roadSlices) return null;
        const j = Math.floor(f);
        const t = f - j;
        const curveA = j >= 1 ? sliceData[j - 1].curveX : 0;
        const curveB = sliceData[Math.min(j, roadSlices - 1)].curveX;
        const perspective = 1 / (1 + (dist / roadSlices) * 6.5);
        const roadHalfWidth = width * 0.56 * perspective;
        return {
          x: width * 0.5 - playerX * roadHalfWidth + curveA + (curveB - curveA) * t + xLane * roadHalfWidth,
          y: horizonY + (height - horizonY) * perspective,
          scale: perspective * 1.45 * spriteK
        };
      }

      // Collect and sort all dynamic road entities from back to front
      const renderQueue = [];
      cars.forEach((car) => {
        const proj = projectEntity(car.zOffset, car.x);
        if (proj) renderQueue.push({ z: car.zOffset, kind: 'car', data: car, proj });
      });
      rivals.forEach((rv) => {
        const proj = projectEntity(rv.zOffset, rv.x);
        if (proj) renderQueue.push({ z: rv.zOffset, kind: 'rival', data: rv, proj });
      });

      renderQueue.sort((a, b) => b.z - a.z);

      renderQueue.forEach((item) => {
        if (item.kind === 'car') {
          drawDetailedTrafficCar(item.data, item.proj);
        } else {
          drawRivalBiker(item.data, item.proj);
        }
      });

      // 3. Draw Player Hero Superbike in Foreground
      drawDetailedBiker(width * 0.5, height - 18, 1.15 * spriteK, {
        suitColor: '#1d4ed8', // Heroic Marvel Blue
        accentColor: '#ef4444', // Crimson Armor & Boots
        bikeColor: '#dc2626', // Red/Gold Superbike
        helmetColor: '#1e40af',
        lean: leanAngle * 0.28,
        kicking: kickTimer > 0,
        kickSide,
        nitroActive: keys.nitro && nitroFuel > 4
      });

      sparks.draw(g2d);

      // Comic Speed Lines at high speed / Nitro (intensity follows speed)
      if (speed > 260 && !fx.isReducedMotion()) {
        const intensity = Math.min(1, (speed - 260) / 140);
        g2d.save();
        g2d.strokeStyle =
          keys.nitro && nitroFuel > 4
            ? `rgba(56, 189, 248, ${0.25 + intensity * 0.35})`
            : `rgba(255, 255, 255, ${0.08 + intensity * 0.2})`;
        g2d.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 + sceneTime * 10;
          const r1 = Math.min(width, height) * 0.36;
          const r2 = Math.max(width, height) * 0.75;
          g2d.beginPath();
          g2d.moveTo(width * 0.5 + Math.cos(ang) * r1, height * 0.5 + Math.sin(ang) * r1);
          g2d.lineTo(width * 0.5 + Math.cos(ang) * r2, height * 0.5 + Math.sin(ang) * r2);
          g2d.stroke();
        }
        g2d.restore();
      }

      // Nitro bloom: cool tint at the screen edges
      if (keys.nitro && nitroFuel > 4 && !isGameOver) {
        fx.vignette(g2d, width, height, 0, 'rgba(56, 189, 248, 0.28)');
      }

      // 4. Draw Comic Action Starbursts ("SMASH!!", "CRASH!!", "BAM!")
      comicPopups.forEach((cp) => drawComicBurstPopup(cp));
      g2d.restore();

      // 5. Draw In-Screen HUD (Máu, Nitro, Tốc độ, Điểm, Quãng đường)
      drawInGameHud();

      // Status Banner (fits the canvas width, fades out)
      if (bannerTimer > 0 && statusBanner) {
        const bw = Math.min(width - 32, 460);
        const by = Math.max(98, 14 + 82 * Math.max(0.62, Math.min(1, width / 760)) + 8);
        g2d.save();
        g2d.globalAlpha = Math.min(1, bannerTimer / 0.4);
        fx.roundRectPath(g2d, width * 0.5 - bw / 2, by, bw, 30, 15);
        g2d.fillStyle = 'rgba(9, 13, 22, 0.9)';
        g2d.fill();
        g2d.strokeStyle = '#facc15';
        g2d.lineWidth = 2;
        g2d.stroke();
        g2d.fillStyle = '#fef08a';
        g2d.textAlign = 'center';
        g2d.textBaseline = 'middle';
        const fs = fx.fitFontSize(g2d, statusBanner, bw - 24, 13, 9, 800);
        g2d.font = fx.font(fs, 800);
        g2d.fillText(statusBanner, width * 0.5, by + 15);
        g2d.restore();
      }

      // Hurt flash: red edges rather than a flat full-screen tint
      if (hurtFlash > 0) {
        fx.vignette(g2d, width, height, 0, `rgba(239, 68, 68, ${Math.min(0.85, hurtFlash * 0.75)})`);
        g2d.fillStyle = `rgba(239, 68, 68, ${hurtFlash * 0.12})`;
        g2d.fillRect(0, 0, width, height);
      }

      // Pause / Game Over panels
      const key = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (key !== drawScene.lastKey) {
        drawScene.lastKey = key;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '💥',
          title: 'MÔ-TÔ HỎNG NẶNG!',
          subtitle: 'Cuộc đua kết thúc — hãy thử lại để phá kỷ lục.',
          lines: [
            `Điểm|${score.toLocaleString('vi-VN')}`,
            `Quãng đường|${distanceKm.toFixed(2)} km`,
            `Hạ gục|${knockouts} biker`
          ],
          hint: 'Chạm màn hình hoặc bấm "Chơi lại"',
          accent: '#f43f5e',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g2d, width, height, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để quay lại đường đua.',
          accent: '#a855f7',
          t: overlayT,
          backdrop: 0.55
        });
      }
    }

    // Input Bindings
    function onKeyDown(evt) {
      if (evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (evt.code === 'ArrowLeft' || evt.code === 'KeyA') keys.left = true;
      if (evt.code === 'ArrowRight' || evt.code === 'KeyD') keys.right = true;
      if (evt.code === 'ArrowUp' || evt.code === 'KeyW') keys.up = true;
      if (evt.code === 'ArrowDown' || evt.code === 'KeyS') keys.down = true;
      if (evt.code === 'ShiftLeft' || evt.code === 'ShiftRight' || evt.code === 'KeyZ') {
        keys.nitro = true;
      }
      if (evt.code === 'Space' || evt.code === 'KeyX') {
        evt.preventDefault();
        triggerKick();
      }
    }

    function onKeyUp(evt) {
      if (evt.code === 'ArrowLeft' || evt.code === 'KeyA') keys.left = false;
      if (evt.code === 'ArrowRight' || evt.code === 'KeyD') keys.right = false;
      if (evt.code === 'ArrowUp' || evt.code === 'KeyW') keys.up = false;
      if (evt.code === 'ArrowDown' || evt.code === 'KeyS') keys.down = false;
      if (evt.code === 'ShiftLeft' || evt.code === 'ShiftRight' || evt.code === 'KeyZ') {
        keys.nitro = false;
      }
    }

    function bindHoldButton(btn, keyName) {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        keys[keyName] = true;
        btn.classList.add('pressed');
      });
      const release = () => {
        keys[keyName] = false;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    }

    bindHoldButton(btnLeft, 'left');
    bindHoldButton(btnRight, 'right');
    bindHoldButton(btnNitro, 'nitro');

    btnKick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      triggerKick();
    });

    autoGasBtn.addEventListener('click', () => {
      autoThrottle = !autoThrottle;
      ArcadeHub.sound.click();
      autoGasBtn.textContent = autoThrottle ? '⚙ Tự giữ ga: BẬT' : '⚙ Tự giữ ga: TẮT';
      autoGasBtn.classList.toggle('active', autoThrottle);
    });

    canvas.addEventListener('pointerdown', () => {
      if (isGameOver) resetGame();
    });

    pauseBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      setPaused(!isPaused);
    });

    shell.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-diff]').forEach((b) => b.classList.toggle('active', b === btn));
        difficulty = btn.getAttribute('data-diff');
        resetGame();
      });
    });

    const onBlur = () => releaseAllKeys();
    window.addEventListener('blur', onBlur);

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (idleGate.shouldSkip(isPaused && !isGameOver && drawScene.lastKey === 'pause' && overlayT >= 0.6, canvas, now)) {
        animId = requestAnimationFrame(loop);
        return;
      }
      updateGame(dt);
      updatePresentation(dt);
      drawScene();
      animId = requestAnimationFrame(loop);
    }

    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

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
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
    };
  }

  ArcadeHub.games.roadrash = {
    init: createRoadRashGame
  };
})(window);
