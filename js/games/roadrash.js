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
    const TOTAL_SEGMENTS = 260;
    const SEGMENT_LENGTH = 180;
    let segments = [];
    let skylineBuildings = [];

    let trackPos = 0;
    let playerX = 0; // -1.35 to +1.35 (mặt đường chính từ -1 đến +1)
    let speed = 0;
    const maxSpeed = 310;
    const nitroMaxSpeed = 420;
    let bikeHp = 100;
    let nitroFuel = 100;
    let score = 0;
    let distanceKm = 0;
    let knockouts = 0;
    let isGameOver = false;
    let autoThrottle = true;

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
      <div class="canvas-frame">
        <canvas id="rrCanvas" class="game-canvas"></canvas>
      </div>

      <div class="touch-controls">
        <div class="touch-cluster">
          <button type="button" class="touch-btn" id="rrBtnLeft">◀ RẼ TRÁI</button>
          <button type="button" class="touch-btn" id="rrBtnRight">RẼ PHẢI ▶</button>
          <button type="button" class="pill-btn active" id="rrAutoGasBtn" style="height:52px;">⚙ Tự giữ ga: BẬT</button>
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

    function buildSkyline() {
      skylineBuildings = [];
      let curX = -80;
      while (curX < 1400) {
        const bw = 38 + Math.floor(Math.random() * 52);
        const bh = 55 + Math.floor(Math.random() * 115);
        const spire = Math.random() < 0.35;
        const tint =
          Math.random() < 0.5 ? '#1e1b4b' : Math.random() < 0.5 ? '#172554' : '#311042';
        skylineBuildings.push({ x: curX, w: bw, h: bh, spire, tint });
        curX += bw - 4;
      }
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
        if (i > 20 && i < 68) curve = 1.55;
        else if (i >= 88 && i < 135) curve = -1.85;
        else if (i >= 155 && i < 192) curve = 1.35;
        else if (i >= 205 && i < 240) curve = -1.45;

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
      buildSkyline();
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
      statusBanner = '🏁 ÁP SÁT ĐỐI THỦ & BẤM SPACE ĐỂ TUNG CÚ ĐÁ MARVEL SMASH!';
      bannerTimer = 3.5;

      rivals = [
        {
          zOffset: 420,
          x: -0.45,
          speed: 235,
          suitColor: '#9333ea',
          accentColor: '#22c55e',
          bikeColor: '#581c87',
          name: 'GREEN VIPER',
          knocked: 0
        },
        {
          zOffset: 860,
          x: 0.42,
          speed: 255,
          suitColor: '#dc2626',
          accentColor: '#facc15',
          bikeColor: '#991b1b',
          name: 'PYRO RIDER',
          knocked: 0
        },
        {
          zOffset: 1320,
          x: -0.15,
          speed: 268,
          suitColor: '#1e293b',
          accentColor: '#38bdf8',
          bikeColor: '#0f172a',
          name: 'VENOM BIKER',
          knocked: 0
        }
      ];

      cars = [
        { zOffset: 620, x: -0.58, speed: 150, bodyColor: '#ef4444', roofColor: '#fca5a5', kind: 'sedan' },
        { zOffset: 1120, x: 0.56, speed: 165, bodyColor: '#eab308', roofColor: '#fef08a', kind: 'taxi' },
        { zOffset: 1640, x: 0.0, speed: 142, bodyColor: '#2563eb', roofColor: '#93c5fd', kind: 'suv' }
      ];

      ctx.updateScore(0);
    }

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 1020);
      const maxH = Math.max(360, Math.min(window.innerHeight - 205, 580));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function triggerKick() {
      if (isGameOver || kickTimer > 0) return;
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

    function updateGame(dt) {
      if (isGameOver) return;

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

      const forwardStep = speed * dt * 4.6;
      trackPos += forwardStep;
      distanceKm += (speed * dt) / 3600;
      score += Math.round(speed * dt * 0.65);

      const currentSegIdx = Math.floor(trackPos / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
      const currentSeg = segments[currentSegIdx];

      // Centrifugal pull on curves
      const speedRatio = speed / maxSpeed;
      playerX -= currentSeg.curve * speedRatio * dt * 0.4;

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
        const relSpeed = rv.speed - speed;
        rv.zOffset += relSpeed * dt * 3.8;

        if (rv.knocked > 0) {
          rv.knocked -= dt;
          rv.x += (rv.vxKnock || 1) * dt;
          rv.zOffset -= speed * dt * 1.4;
        } else {
          rv.x += Math.sin(performance.now() * 0.0022 + rv.speed) * dt * 0.26;
          rv.x = Math.max(-0.85, Math.min(0.85, rv.x));

          if (Math.abs(rv.zOffset - 120) < 48 && Math.abs(rv.x - playerX) < 0.23) {
            const pushDir = playerX >= rv.x ? 1 : -1;
            playerX += pushDir * 0.25;
            rv.x -= pushDir * 0.25;
            bikeHp = Math.max(0, bikeHp - 6);
            hurtFlash = 0.65;
            ArcadeHub.sound.hit();
            addComicPopup(width * 0.5, height - 150, 'BAM!', '-6% GIÁP', '#f43f5e');
          }
        }

        if (rv.zOffset < -120 || rv.zOffset > 2200) {
          rv.zOffset = 1450 + Math.random() * 650;
          rv.x = (Math.random() - 0.5) * 1.4;
          rv.knocked = 0;
          rv.speed = 225 + Math.random() * 65;
        }
      });

      // Traffic cars update
      cars.forEach((car) => {
        const relSpeed = car.speed - speed;
        car.zOffset += relSpeed * dt * 4.0;

        if (Math.abs(car.zOffset - 120) < 55 && Math.abs(car.x - playerX) < 0.29) {
          ArcadeHub.sound.explosion();
          speed = Math.max(55, speed * 0.35);
          bikeHp = Math.max(0, bikeHp - 22);
          hurtFlash = 1.0;
          car.zOffset = 1650 + Math.random() * 500;
          addComicPopup(width * 0.5, height * 0.52, 'CRASH!!', '-22% ĐỘ BỀN XE', '#ef4444');

          if (bikeHp <= 0 && !isGameOver) {
            isGameOver = true;
            ArcadeHub.sound.gameOver();
            ctx.submitHighScore(score, `${distanceKm.toFixed(1)} km • ${knockouts} K.O.`);
          }
        }

        if (car.zOffset < -100) {
          car.zOffset = 1650 + Math.random() * 600;
          const lanes = [-0.62, 0, 0.62];
          car.x = lanes[Math.floor(Math.random() * lanes.length)];
          score += 50;
        }
      });

      ctx.updateScore(score);
    }

    // ====================================================
    // MARVEL COMIC CEL-SHADED DRAWING HELPERS
    // ====================================================
    function drawComicBuilding(x, y, scale, prop, isLeft) {
      const w = 135 * scale;
      const h = (85 + prop.floors * 38) * scale;
      const depthW = 36 * scale;
      const pal = prop.palette;

      g2d.save();
      const frontX = isLeft ? x - w : x;
      const frontY = y - h;

      // 3D Side Wall (hướng về phía mặt đường)
      g2d.fillStyle = pal.side;
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = Math.max(1.2, 2.8 * scale);
      g2d.beginPath();
      if (isLeft) {
        g2d.moveTo(frontX + w, frontY);
        g2d.lineTo(frontX + w + depthW, frontY + depthW * 0.45);
        g2d.lineTo(frontX + w + depthW, y);
        g2d.lineTo(frontX + w, y);
      } else {
        g2d.moveTo(frontX, frontY);
        g2d.lineTo(frontX - depthW, frontY + depthW * 0.45);
        g2d.lineTo(frontX - depthW, y);
        g2d.lineTo(frontX, y);
      }
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Main Front Facade
      g2d.fillStyle = pal.wall;
      g2d.fillRect(frontX, frontY, w, h);
      g2d.strokeRect(frontX, frontY, w, h);

      // Rooftop cornice lip
      g2d.fillStyle = pal.roof;
      g2d.fillRect(frontX - 4 * scale, frontY - 7 * scale, w + 8 * scale, 8 * scale);
      g2d.strokeRect(frontX - 4 * scale, frontY - 7 * scale, w + 8 * scale, 8 * scale);

      // Lit Comic Windows
      const cols = 3;
      const rows = prop.floors + 1;
      const winW = (w * 0.56) / cols;
      const winH = (h * 0.55) / rows;
      const gapX = (w - cols * winW) / (cols + 1);
      const gapY = (h * 0.72 - rows * winH) / (rows + 1);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = frontX + gapX + c * (winW + gapX);
          const wy = frontY + 12 * scale + r * (winH + gapY);
          g2d.fillStyle = (r + c) % 2 === 0 ? '#fef08a' : '#38bdf8';
          g2d.fillRect(wx, wy, winW, winH);
          g2d.strokeRect(wx, wy, winW, winH);
        }
      }

      // Ground Floor Storefront Awning
      const awnH = 14 * scale;
      g2d.fillStyle = pal.awning;
      g2d.fillRect(frontX + 6 * scale, y - awnH * 1.9, w - 12 * scale, awnH);
      g2d.strokeRect(frontX + 6 * scale, y - awnH * 1.9, w - 12 * scale, awnH);

      g2d.restore();
    }

    function drawComicPalmTree(x, y, scale, isLeft) {
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(scale * (isLeft ? 1 : -1), scale);

      // Curved Trunk with bold comic outline
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 14;
      g2d.lineCap = 'round';
      g2d.beginPath();
      g2d.moveTo(0, 0);
      g2d.quadraticCurveTo(14, -55, 6, -115);
      g2d.stroke();

      g2d.strokeStyle = '#92400e';
      g2d.lineWidth = 9;
      g2d.beginPath();
      g2d.moveTo(0, 0);
      g2d.quadraticCurveTo(14, -55, 6, -115);
      g2d.stroke();

      // Palm Fronds
      const crownX = 6;
      const crownY = -115;
      const angles = [-2.4, -1.8, -1.1, -0.4, 0.25];
      angles.forEach((ang, i) => {
        g2d.save();
        g2d.translate(crownX, crownY);
        g2d.rotate(ang);
        g2d.fillStyle = i % 2 === 0 ? '#16a34a' : '#22c55e';
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 2.5;
        g2d.beginPath();
        g2d.moveTo(0, 0);
        g2d.quadraticCurveTo(26, -14, 52, 6);
        g2d.quadraticCurveTo(24, 2, 0, 0);
        g2d.fill();
        g2d.stroke();
        g2d.restore();
      });

      g2d.restore();
    }

    function drawStreetLamp(x, y, scale, isLeft) {
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(scale, scale);
      const dir = isLeft ? 1 : -1;

      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 6;
      g2d.beginPath();
      g2d.moveTo(0, 0);
      g2d.lineTo(0, -130);
      g2d.lineTo(dir * 34, -138);
      g2d.stroke();

      g2d.strokeStyle = '#cbd5e1';
      g2d.lineWidth = 3;
      g2d.stroke();

      // Lamp Head & Glow
      g2d.fillStyle = '#fef08a';
      g2d.beginPath();
      g2d.arc(dir * 34, -136, 7, 0, Math.PI * 2);
      g2d.fill();

      g2d.fillStyle = 'rgba(254, 240, 138, 0.22)';
      g2d.beginPath();
      g2d.arc(dir * 34, -136, 22, 0, Math.PI * 2);
      g2d.fill();
      g2d.restore();
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
      g2d.font = '900 18px "Segoe UI", sans-serif';
      g2d.textAlign = 'center';
      g2d.strokeText('MARVEL SPEED', 0, -78);
      g2d.fillText('MARVEL SPEED', 0, -78);

      g2d.restore();
    }

    function drawDetailedTrafficCar(car, proj) {
      g2d.save();
      g2d.translate(proj.x, proj.y);
      g2d.scale(proj.scale, proj.scale);

      // Ground Shadow
      g2d.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g2d.beginPath();
      g2d.ellipse(0, -2, 48, 10, 0, 0, Math.PI * 2);
      g2d.fill();

      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 3.2;

      // Left & Right Tires
      g2d.fillStyle = '#0f172a';
      g2d.beginPath();
      g2d.roundRect(-44, -18, 16, 18, 4);
      g2d.roundRect(28, -18, 16, 18, 4);
      g2d.fill();
      g2d.stroke();

      // Lower Chassis Body
      g2d.fillStyle = car.bodyColor;
      g2d.beginPath();
      g2d.roundRect(-46, -42, 92, 28, 7);
      g2d.fill();
      g2d.stroke();

      // Cel-shaded highlight band on body
      g2d.fillStyle = 'rgba(255,255,255,0.24)';
      g2d.fillRect(-42, -40, 84, 7);

      // Upper Cabin / Roof
      g2d.fillStyle = car.roofColor;
      g2d.beginPath();
      g2d.moveTo(-30, -42);
      g2d.lineTo(-22, -66);
      g2d.lineTo(22, -66);
      g2d.lineTo(30, -42);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Rear Windshield with comic reflection slash
      g2d.fillStyle = '#1e293b';
      g2d.beginPath();
      g2d.moveTo(-24, -44);
      g2d.lineTo(-18, -62);
      g2d.lineTo(18, -62);
      g2d.lineTo(24, -44);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      g2d.strokeStyle = 'rgba(186, 230, 253, 0.65)';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.moveTo(-12, -46);
      g2d.lineTo(-4, -60);
      g2d.moveTo(-2, -46);
      g2d.lineTo(6, -60);
      g2d.stroke();

      // Glowing Tail Lights & License Plate
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;
      g2d.fillStyle = '#ff1e42';
      g2d.fillRect(-41, -33, 18, 9);
      g2d.strokeRect(-41, -33, 18, 9);
      g2d.fillRect(23, -33, 18, 9);
      g2d.strokeRect(23, -33, 18, 9);

      // License plate
      g2d.fillStyle = '#facc15';
      g2d.fillRect(-11, -31, 22, 9);
      g2d.strokeRect(-11, -31, 22, 9);

      // Rear Bumper
      g2d.fillStyle = '#334155';
      g2d.beginPath();
      g2d.roundRect(-48, -19, 96, 7, 3);
      g2d.fill();
      g2d.stroke();

      g2d.restore();
    }

    function drawDetailedBiker(projX, projY, scale, opts) {
      g2d.save();
      g2d.translate(projX, projY);
      g2d.scale(scale, scale);
      if (opts.lean) {
        g2d.rotate(opts.lean);
      }

      // Ground Shadow
      g2d.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g2d.beginPath();
      g2d.ellipse(0, -2, 32, 9, 0, 0, Math.PI * 2);
      g2d.fill();

      // Kick Action Leg + Comic Motion Arc
      if (opts.kicking) {
        const dir = opts.kickSide || 1;
        g2d.fillStyle = 'rgba(250, 204, 21, 0.45)';
        g2d.beginPath();
        g2d.arc(dir * 26, -54, 34, -0.7, 0.7, dir < 0);
        g2d.fill();

        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 3.2;
        g2d.fillStyle = opts.suitColor;
        g2d.beginPath();
        g2d.roundRect(dir > 0 ? 8 : -54, -60, 46, 15, 6);
        g2d.fill();
        g2d.stroke();

        // Armored Boot
        g2d.fillStyle = opts.accentColor;
        g2d.beginPath();
        g2d.roundRect(dir > 0 ? 46 : -64, -67, 18, 24, 5);
        g2d.fill();
        g2d.stroke();
      }

      // Nitro Flame Exhausts
      if (opts.nitroActive) {
        [-16, 16].forEach((ex) => {
          g2d.fillStyle = '#38bdf8';
          g2d.beginPath();
          g2d.moveTo(ex - 6, -18);
          g2d.lineTo(ex + 6, -18);
          g2d.lineTo(ex, 16 + Math.random() * 18);
          g2d.closePath();
          g2d.fill();

          g2d.fillStyle = '#fef08a';
          g2d.beginPath();
          g2d.moveTo(ex - 3, -18);
          g2d.lineTo(ex + 3, -18);
          g2d.lineTo(ex, 4 + Math.random() * 8);
          g2d.closePath();
          g2d.fill();
        });
      }

      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 3.2;

      // Dual Chrome Exhaust Pipes
      g2d.fillStyle = '#94a3b8';
      g2d.beginPath();
      g2d.roundRect(-22, -34, 9, 18, 4);
      g2d.roundRect(13, -34, 9, 18, 4);
      g2d.fill();
      g2d.stroke();

      // Wide Racing Rear Tire with Treads
      g2d.fillStyle = '#0f172a';
      g2d.beginPath();
      g2d.roundRect(-14, -42, 28, 42, 8);
      g2d.fill();
      g2d.stroke();

      g2d.strokeStyle = '#334155';
      g2d.lineWidth = 2;
      for (let ty = -34; ty <= -8; ty += 7) {
        g2d.beginPath();
        g2d.moveTo(-10, ty);
        g2d.lineTo(10, ty);
        g2d.stroke();
      }

      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 3.2;

      // Rider Legs / Knee Guards gripping bike
      g2d.fillStyle = '#1e293b';
      g2d.beginPath();
      g2d.ellipse(-20, -48, 8, 18, 0.2, 0, Math.PI * 2);
      g2d.ellipse(20, -48, 8, 18, -0.2, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Sportbike Sculpted Tail Fairing
      g2d.fillStyle = opts.bikeColor;
      g2d.beginPath();
      g2d.moveTo(-24, -44);
      g2d.lineTo(-18, -68);
      g2d.lineTo(18, -68);
      g2d.lineTo(24, -44);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Glowing LED Tail Light
      g2d.fillStyle = '#ff1e42';
      g2d.beginPath();
      g2d.roundRect(-11, -62, 22, 8, 3);
      g2d.fill();
      g2d.stroke();

      // Handlebars & Side Mirrors
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 4;
      g2d.beginPath();
      g2d.moveTo(-34, -82);
      g2d.lineTo(34, -82);
      g2d.stroke();

      g2d.fillStyle = '#38bdf8';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.ellipse(-36, -88, 7, 4, -0.3, 0, Math.PI * 2);
      g2d.ellipse(36, -88, 7, 4, 0.3, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Rider Muscular Marvel-Style Armored Torso
      g2d.fillStyle = opts.suitColor;
      g2d.lineWidth = 3.2;
      g2d.beginPath();
      g2d.moveTo(-16, -64);
      g2d.lineTo(-26, -94);
      g2d.lineTo(26, -94);
      g2d.lineTo(16, -64);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Shoulder Armor Pads & Heroic Emblem on Back
      g2d.fillStyle = opts.accentColor;
      g2d.beginPath();
      g2d.ellipse(-25, -90, 9, 6, -0.4, 0, Math.PI * 2);
      g2d.ellipse(25, -90, 9, 6, 0.4, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Spine Star / Chevron Emblem
      g2d.fillStyle = opts.accentColor;
      g2d.beginPath();
      g2d.moveTo(0, -89);
      g2d.lineTo(9, -78);
      g2d.lineTo(0, -69);
      g2d.lineTo(-9, -78);
      g2d.closePath();
      g2d.fill();
      g2d.stroke();

      // Aerodynamic Racing Helmet with Glossy Visor Rim
      g2d.fillStyle = opts.helmetColor || opts.suitColor;
      g2d.beginPath();
      g2d.arc(0, -105, 15, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      // Helmet Comic Highlight Stripe
      g2d.fillStyle = '#ffffff';
      g2d.beginPath();
      g2d.arc(-5, -110, 4.5, 0, Math.PI * 2);
      g2d.fill();

      g2d.restore();
    }

    // ====================================================
    // IN-CANVAS MARVEL HUD DASHBOARD (TỐC ĐỘ, MÁU, NITRO, ĐIỂM)
    // ====================================================
    function drawInGameHud() {
      g2d.save();

      // 1. TOP-LEFT PANEL: MÁU (HP) & NITRO BARS
      const panelX = 16;
      const panelY = 14;

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
      g2d.font = '800 12px "Segoe UI", sans-serif';
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

      // 2. TOP-RIGHT PANEL: ĐIỂM SỐ, QUÃNG ĐƯỜNG & HẠ GỤC (K.O.)
      const rightW = 240;
      const rightX = width - rightW - 16;
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
      g2d.font = '900 18px "Segoe UI", sans-serif';
      g2d.fillText(`🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`, rightX + rightW - 12, panelY + 26);

      g2d.fillStyle = '#f8fafc';
      g2d.font = '700 13px "Segoe UI", sans-serif';
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

      // 3. BOTTOM-RIGHT SPEEDOMETER DIAL (ĐỒNG HỒ TỐC ĐỘ KM/H TRONG MÀN HÌNH)
      const dialCx = width - 82;
      const dialCy = height - 68;
      const dialR = 54;

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
      g2d.font = '900 20px "Segoe UI", sans-serif';
      g2d.textAlign = 'center';
      g2d.fillText(String(Math.round(speed)), dialCx, dialCy + 18);
      g2d.fillStyle = '#94a3b8';
      g2d.font = '700 10px "Segoe UI", sans-serif';
      g2d.fillText('KM/H', dialCx, dialCy + 31);

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
      g2d.font = 'italic 900 22px "Segoe UI", sans-serif';
      g2d.textAlign = 'center';
      g2d.strokeText(cp.text, 0, 4);
      g2d.fillText(cp.text, 0, 4);

      if (cp.subtext) {
        g2d.font = '800 11px "Segoe UI", sans-serif';
        g2d.fillStyle = '#fef08a';
        g2d.strokeText(cp.subtext, 0, 22);
        g2d.fillText(cp.subtext, 0, 22);
      }

      g2d.restore();
    }

    function drawScene() {
      const horizonY = Math.floor(height * 0.43);

      // 1. Marvel Sunset Sky Gradient
      const skyGrad = g2d.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#090d1e');
      skyGrad.addColorStop(0.45, '#3b0764');
      skyGrad.addColorStop(0.8, '#be123c');
      skyGrad.addColorStop(1, '#f97316');
      g2d.fillStyle = skyGrad;
      g2d.fillRect(0, 0, width, horizonY);

      // Comic Sun & Speed Sunbeams
      const sunX = width * 0.5;
      const sunY = horizonY - 18;
      g2d.fillStyle = 'rgba(254, 240, 138, 0.88)';
      g2d.beginPath();
      g2d.arc(sunX, sunY, 52, Math.PI, 0);
      g2d.fill();

      // Parallax City Skyscrapers Silhouette
      const parallaxOffset = ((trackPos * 0.04) % 400);
      skylineBuildings.forEach((b) => {
        const bx = ((b.x - parallaxOffset + 1600) % 1400) - 120;
        const by = horizonY - b.h;
        g2d.fillStyle = b.tint;
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 2;
        g2d.fillRect(bx, by, b.w, b.h);
        g2d.strokeRect(bx, by, b.w, b.h);

        if (b.spire) {
          g2d.beginPath();
          g2d.moveTo(bx + b.w * 0.5, by - 24);
          g2d.lineTo(bx + b.w * 0.3, by);
          g2d.lineTo(bx + b.w * 0.7, by);
          g2d.closePath();
          g2d.fill();
          g2d.stroke();
        }
      });

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

        curveStep += seg.curve * 0.45;
        accumCurve += curveStep * (1 - perspective);
        const centerX = width * 0.5 - playerX * roadHalfWidth * 0.85 + accumCurve;

        sliceData.push({
          seg,
          screenY,
          roadHalfWidth,
          centerX,
          perspective,
          zDist: i * 32
        });
      }

      // Render Road Slices from Far to Near
      for (let i = sliceData.length - 1; i > 0; i--) {
        const far = sliceData[i];
        const near = sliceData[i - 1];
        const segIndex = far.seg.index;
        const isAlt = segIndex % 2 === 0;

        // Urban Sidewalk / Ground
        g2d.fillStyle = isAlt ? '#1e293b' : '#0f172a';
        g2d.fillRect(0, far.screenY, width, near.screenY - far.screenY + 1.5);

        // Sidewalk Curb (Red/Yellow Comic Curbs)
        const farCurb = far.roadHalfWidth * 1.15;
        const nearCurb = near.roadHalfWidth * 1.15;
        g2d.fillStyle = isAlt ? '#ef4444' : '#facc15';
        g2d.beginPath();
        g2d.moveTo(far.centerX - farCurb, far.screenY);
        g2d.lineTo(far.centerX + farCurb, far.screenY);
        g2d.lineTo(near.centerX + nearCurb, near.screenY);
        g2d.lineTo(near.centerX - nearCurb, near.screenY);
        g2d.closePath();
        g2d.fill();

        // Main Asphalt Highway
        g2d.fillStyle = isAlt ? '#334155' : '#475569';
        g2d.beginPath();
        g2d.moveTo(far.centerX - far.roadHalfWidth, far.screenY);
        g2d.lineTo(far.centerX + far.roadHalfWidth, far.screenY);
        g2d.lineTo(near.centerX + near.roadHalfWidth, near.screenY);
        g2d.lineTo(near.centerX - near.roadHalfWidth, near.screenY);
        g2d.closePath();
        g2d.fill();

        // Bold Comic Road Edge Ink Lines
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = Math.max(1, 3 * far.perspective);
        g2d.beginPath();
        g2d.moveTo(far.centerX - far.roadHalfWidth, far.screenY);
        g2d.lineTo(near.centerX - near.roadHalfWidth, near.screenY);
        g2d.moveTo(far.centerX + far.roadHalfWidth, far.screenY);
        g2d.lineTo(near.centerX + near.roadHalfWidth, near.screenY);
        g2d.stroke();

        // Lane Dividers (2 lanes)
        if (segIndex % 3 === 0) {
          g2d.fillStyle = '#f8fafc';
          [-0.33, 0.33].forEach((laneOffset) => {
            const fx = far.centerX + far.roadHalfWidth * laneOffset;
            const nx = near.centerX + near.roadHalfWidth * laneOffset;
            const lwF = Math.max(1, far.roadHalfWidth * 0.025);
            const lwN = Math.max(1.5, near.roadHalfWidth * 0.025);
            g2d.beginPath();
            g2d.moveTo(fx - lwF, far.screenY);
            g2d.lineTo(fx + lwF, far.screenY);
            g2d.lineTo(nx + lwN, near.screenY);
            g2d.lineTo(nx - lwN, near.screenY);
            g2d.closePath();
            g2d.fill();
          });
        }

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
      function projectEntity(zOffset, xLane) {
        if (zOffset < 40 || zOffset > 2050) return null;
        const idx = Math.min(sliceData.length - 1, Math.max(0, Math.floor(zOffset / 32)));
        const s = sliceData[idx];
        return {
          x: s.centerX + xLane * s.roadHalfWidth,
          y: s.screenY,
          scale: s.perspective * 1.45
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
          const rv = item.data;
          drawDetailedBiker(item.proj.x, item.proj.y, item.proj.scale, {
            suitColor: rv.suitColor,
            accentColor: rv.accentColor,
            bikeColor: rv.bikeColor,
            helmetColor: '#f8fafc',
            lean: rv.knocked > 0 ? 0.85 * (rv.vxKnock > 0 ? 1 : -1) : 0,
            kicking: false,
            nitroActive: false
          });
        }
      });

      // 3. Draw Player Hero Superbike in Foreground
      drawDetailedBiker(width * 0.5, height - 18, 1.15, {
        suitColor: '#1d4ed8', // Heroic Marvel Blue
        accentColor: '#ef4444', // Crimson Armor & Boots
        bikeColor: '#dc2626', // Red/Gold Superbike
        helmetColor: '#1e40af',
        lean: leanAngle * 0.28,
        kicking: kickTimer > 0,
        kickSide,
        nitroActive: keys.nitro && nitroFuel > 4
      });

      // Comic Speed Lines at high speed / Nitro
      if (speed > 280) {
        g2d.save();
        g2d.strokeStyle =
          keys.nitro && nitroFuel > 4
            ? 'rgba(56, 189, 248, 0.45)'
            : 'rgba(255, 255, 255, 0.22)';
        g2d.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 + performance.now() * 0.01;
          const r1 = Math.min(width, height) * 0.36;
          const r2 = Math.max(width, height) * 0.75;
          g2d.beginPath();
          g2d.moveTo(width * 0.5 + Math.cos(ang) * r1, height * 0.5 + Math.sin(ang) * r1);
          g2d.lineTo(width * 0.5 + Math.cos(ang) * r2, height * 0.5 + Math.sin(ang) * r2);
          g2d.stroke();
        }
        g2d.restore();
      }

      // 4. Draw Comic Action Starbursts ("SMASH!!", "CRASH!!", "BAM!")
      comicPopups.forEach((cp) => drawComicBurstPopup(cp));

      // 5. Draw In-Screen HUD (Máu, Nitro, Tốc độ, Điểm, Quãng đường)
      drawInGameHud();

      // Status Banner
      if (bannerTimer > 0 && statusBanner) {
        g2d.fillStyle = 'rgba(9, 13, 22, 0.88)';
        g2d.strokeStyle = '#facc15';
        g2d.lineWidth = 2;
        g2d.fillRect(width * 0.5 - 220, 98, 440, 30);
        g2d.strokeRect(width * 0.5 - 220, 98, 440, 30);
        g2d.fillStyle = '#fef08a';
        g2d.font = '800 13px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText(statusBanner, width * 0.5, 118);
      }

      // Hurt Red Flash
      if (hurtFlash > 0) {
        g2d.fillStyle = `rgba(239, 68, 68, ${hurtFlash * 0.35})`;
        g2d.fillRect(0, 0, width, height);
      }

      // Game Over Overlay
      if (isGameOver) {
        g2d.fillStyle = 'rgba(7, 11, 20, 0.85)';
        g2d.fillRect(0, 0, width, height);
        g2d.fillStyle = '#facc15';
        g2d.font = 'italic 900 32px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText('💥 CHIẾC MÔ-TÔ ĐÃ HỎNG NẶNG!', width / 2, height / 2 - 22);
        g2d.fillStyle = '#ffffff';
        g2d.font = '700 18px "Segoe UI", sans-serif';
        g2d.fillText(
          `Điểm: ${score.toLocaleString('vi-VN')} • Quãng đường: ${distanceKm.toFixed(2)} km • Hạ gục: ${knockouts} Biker`,
          width / 2,
          height / 2 + 16
        );
        g2d.fillStyle = '#38bdf8';
        g2d.font = '600 15px "Segoe UI", sans-serif';
        g2d.fillText('Chạm vào màn hình hoặc bấm nút "Chơi lại" để đua ván mới', width / 2, height / 2 + 48);
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
    window.addEventListener('keyup', onKeyUp);

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
        window.removeEventListener('keyup', onKeyUp);
      }
    };
  }

  ArcadeHub.games.roadrash = {
    init: createRoadRashGame
  };
})(window);
