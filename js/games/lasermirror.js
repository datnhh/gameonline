(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  // Directions: 0 = Up, 1 = Right, 2 = Down, 3 = Left
  const DR = [-1, 0, 1, 0];
  const DC = [0, 1, 0, -1];

  // Mirror state 0: '/'  | Mirror state 1: '\'
  const REFLECT_SLASH = [1, 0, 3, 2];
  const REFLECT_BACKSLASH = [3, 2, 1, 0];

  const DIFFICULTY_CFG = {
    easy: {
      label: 'DỄ',
      cols: 8,
      rows: 6,
      targetTurns: 3,
      decoyMirrors: 1,
      wallBlocks: 2,
      scoreMult: 1
    },
    hard: {
      label: 'KHÓ',
      cols: 10,
      rows: 7,
      targetTurns: 5,
      decoyMirrors: 4,
      wallBlocks: 5,
      scoreMult: 1.5
    }
  };

  function createLaserMirrorGame(container, ctx) {
    const W = 820;
    const H = 510;

    let difficulty = 'easy';
    let level = 1;
    let score = 0;
    let moves = 0;
    let animId = null;
    let lastTime = performance.now();

    let rows = 6;
    let cols = 8;
    let emitter = { r: 2, c: 0, dir: 1 };
    let robot = { r: 4, c: 7 };
    let grid = []; // grid[r][c] = { type: 'empty'|'emitter'|'robot'|'mirror'|'wall'|'star', state: 0|1, solutionState: 0|1 }
    let laserPath = []; // [{ r, c }]
    let litStars = 0;
    let totalStars = 0;
    let robotCharged = false;
    let winTimer = 0;
    let laserPulsePhase = 0;

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(260);
    let sceneTime = 0;
    let hintCell = null;
    let hintFlashT = 10;

    container.innerHTML = `
      <div class="game-shell">
        <div class="game-toolbar">
          <div class="toolbar-group">
            <span style="font-weight:700;color:#94a3b8;font-size:0.82rem;">Chế độ:</span>
            <button type="button" class="pill-btn active" data-diff="easy">🌱 Dễ (Lưới 8x6 • Ít Gương)</button>
            <button type="button" class="pill-btn" data-diff="hard">🔥 Khó (Lưới 10x7 • Nhiều Gương Giả)</button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="pill-btn" id="lmHintBtn">💡 Gợi Ý Xoay 1 Gương</button>
            <button type="button" class="pill-btn" id="lmNewPuzzleBtn">🔄 Đổi Màn Khác</button>
            <span id="lmStatusBadge" style="font-size:0.84rem;color:#facc15;font-weight:800;">Màn 1 • Bấm vào gương để xoay góc 45°!</span>
          </div>
        </div>
        <div class="canvas-frame">
          <canvas id="laserMirrorCanvas" class="game-canvas" width="${W}" height="${H}"></canvas>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#laserMirrorCanvas');
    const hidpi = fx.setupHiDPICanvas(canvas, W, H);
    const g = hidpi.g;
    const statusBadge = container.querySelector('#lmStatusBadge');
    const hintBtn = container.querySelector('#lmHintBtn');
    const newPuzzleBtn = container.querySelector('#lmNewPuzzleBtn');
    const diffBtns = container.querySelectorAll('[data-diff]');

    function requiredMirrorState(inDir, outDir) {
      if (REFLECT_SLASH[inDir] === outDir) return 0;
      if (REFLECT_BACKSLASH[inDir] === outDir) return 1;
      return 0;
    }

    function generateGuaranteedPuzzle() {
      const cfg = DIFFICULTY_CFG[difficulty];
      cols = cfg.cols;
      rows = cfg.rows;
      moves = 0;
      robotCharged = false;
      winTimer = 0;

      for (let attempt = 0; attempt < 60; attempt++) {
        grid = Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => ({ type: 'empty', state: 0, solutionState: null }))
        );

        const visited = new Set();
        const startR = 1 + Math.floor(Math.random() * (rows - 2));
        emitter = { r: startR, c: 0, dir: 1 };
        grid[startR][0].type = 'emitter';
        visited.add(`${startR},0`);

        let curR = startR;
        let curC = 0;
        let curDir = 1;
        let turnsMade = 0;
        const straightCells = [];
        const mirrorCells = [];
        let ok = true;

        for (let t = 0; t <= cfg.targetTurns; t++) {
          const isLastSegment = t === cfg.targetTurns;
          const maxSteps = isLastSegment ? 4 : 3;
          const steps = 1 + Math.floor(Math.random() * maxSteps);

          let actualSteps = 0;
          for (let s = 0; s < steps; s++) {
            const nr = curR + DR[curDir];
            const nc = curC + DC[curDir];
            if (nr < 0 || nr >= rows || nc < 1 || nc >= cols || visited.has(`${nr},${nc}`)) {
              break;
            }
            curR = nr;
            curC = nc;
            visited.add(`${curR},${curC}`);
            actualSteps++;
            if (s < steps - 1) {
              straightCells.push({ r: curR, c: curC });
            }
          }

          if (actualSteps === 0) {
            ok = false;
            break;
          }

          if (isLastSegment) {
            robot = { r: curR, c: curC };
            grid[curR][curC].type = 'robot';
          } else {
            // Choose a perpendicular turn that has at least 1 valid cell ahead
            const perpDirs = curDir % 2 === 1 ? [0, 2] : [1, 3];
            if (Math.random() < 0.5) perpDirs.reverse();
            let chosenDir = -1;
            for (let d of perpDirs) {
              const testR = curR + DR[d];
              const testC = curC + DC[d];
              if (
                testR >= 0 &&
                testR < rows &&
                testC >= 1 &&
                testC < cols &&
                !visited.has(`${testR},${testC}`)
              ) {
                chosenDir = d;
                break;
              }
            }
            if (chosenDir === -1) {
              ok = false;
              break;
            }

            const solState = requiredMirrorState(curDir, chosenDir);
            grid[curR][curC] = {
              type: 'mirror',
              state: solState,
              solutionState: solState
            };
            mirrorCells.push({ r: curR, c: curC });
            curDir = chosenDir;
            turnsMade++;
          }
        }

        if (ok && turnsMade === cfg.targetTurns && mirrorCells.length >= 2) {
          // Place stars along straight segments
          totalStars = 0;
          for (let i = 0; i < straightCells.length && totalStars < 3; i++) {
            const sc = straightCells[i];
            if (grid[sc.r][sc.c].type === 'empty') {
              grid[sc.r][sc.c].type = 'star';
              totalStars++;
            }
          }

          // Place decoy mirrors and walls on unvisited cells
          let decoysLeft = cfg.decoyMirrors;
          let wallsLeft = cfg.wallBlocks;
          for (let r = 0; r < rows; r++) {
            for (let c = 1; c < cols; c++) {
              if (!visited.has(`${r},${c}`) && grid[r][c].type === 'empty') {
                if (decoysLeft > 0 && Math.random() < 0.18) {
                  grid[r][c] = {
                    type: 'mirror',
                    state: Math.random() < 0.5 ? 0 : 1,
                    solutionState: null
                  };
                  decoysLeft--;
                } else if (wallsLeft > 0 && Math.random() < 0.2) {
                  grid[r][c] = { type: 'wall', state: 0, solutionState: null };
                  wallsLeft--;
                }
              }
            }
          }

          // Scramble solution mirrors so at least 2 are flipped wrong initially
          mirrorCells.forEach((mc, idx) => {
            if (idx % 2 === 0 || idx === mirrorCells.length - 1) {
              grid[mc.r][mc.c].state = 1 - grid[mc.r][mc.c].solutionState;
            }
          });

          recalculateLaser();
          if (!robotCharged) {
            return;
          }
          // If still accidentally solved, flip first mirror
          const m0 = mirrorCells[0];
          grid[m0.r][m0.c].state = 1 - grid[m0.r][m0.c].state;
          recalculateLaser();
          return;
        }
      }
    }

    function recalculateLaser() {
      laserPath = [{ r: emitter.r, c: emitter.c }];
      let r = emitter.r;
      let c = emitter.c;
      let dir = emitter.dir;
      litStars = 0;
      let hitRobot = false;
      const seenStates = new Set();

      for (let step = 0; step < 120; step++) {
        const nr = r + DR[dir];
        const nc = c + DC[dir];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
          break;
        }
        const stateKey = `${nr},${nc},${dir}`;
        if (seenStates.has(stateKey)) break;
        seenStates.add(stateKey);

        r = nr;
        c = nc;
        laserPath.push({ r, c });

        const cell = grid[r][c];
        if (cell.type === 'wall' || cell.type === 'emitter') {
          break;
        } else if (cell.type === 'star') {
          litStars++;
        } else if (cell.type === 'robot') {
          hitRobot = true;
          break;
        } else if (cell.type === 'mirror') {
          dir = cell.state === 0 ? REFLECT_SLASH[dir] : REFLECT_BACKSLASH[dir];
        }
      }

      if (statusBadge) {
        statusBadge.textContent = `Màn ${level} • Sao sáng: ${litStars}/${totalStars} ⭐ • Xoay gương: ${moves} lần`;
      }

      if (hitRobot && !robotCharged) {
        robotCharged = true;
        winTimer = 1.65;
        const cfg = DIFFICULTY_CFG[difficulty];
        const gained = Math.round((150 + litStars * 40 + Math.max(10, 60 - moves * 5)) * cfg.scoreMult);
        score += gained;
        ctx.updateScore(score);
        ArcadeHub.sound.win();

        const geom = getBoardGeometry();
        const rx = geom.startX + robot.c * geom.cell + geom.cell / 2;
        const ry = geom.startY + robot.r * geom.cell + geom.cell / 2;
        sparks.burst(rx, ry, { count: 24, kind: 'star', speed: [60, 240], life: [0.6, 1.1], size: [3, 6], colors: ['#4ade80', '#facc15', '#ffffff'] });
        sparks.burst(rx, ry, {
          count: 36,
          kind: 'confetti',
          speed: [120, 300],
          life: [0.9, 1.5],
          size: [4, 7],
          gravity: 300,
          drag: 1.2,
          colors: ['#4ade80', '#facc15', '#38bdf8', '#f472b6']
        });
        sparks.ring(rx, ry, { from: 10, to: geom.cell * 2, color: '#4ade80', life: 0.5 });

        if (level % 3 === 0) {
          ctx.submitHighScore(score, `Màn ${level} (${cfg.label})`);
        }
      }
    }

    function getBoardGeometry() {
      const cell = Math.min(Math.floor((W - 80) / cols), Math.floor((H - 70) / rows), 66);
      const boardW = cols * cell;
      const boardH = rows * cell;
      const startX = Math.floor((W - boardW) / 2);
      const startY = Math.floor((H - boardH) / 2);
      return { cell, startX, startY };
    }

    function update(dt) {
      laserPulsePhase += dt * 6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const item = grid[r] && grid[r][c];
          if (item && item.type === 'mirror') {
            const targetAng = item.state === 0 ? -Math.PI / 4 : Math.PI / 4;
            if (item.visAngle == null) item.visAngle = targetAng;
            item.visAngle += (targetAng - item.visAngle) * Math.min(1, dt * 16);
          }
        }
      }

      if (robotCharged) {
        winTimer -= dt;
        if (winTimer <= 0) {
          level++;
          generateGuaranteedPuzzle();
        }
      }
    }

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    function drawStarShape(cx, cy, r, fill) {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    }

    function updatePresentation(dt) {
      sceneTime += dt;
      sparks.update(dt);
      if (hintFlashT < 10) hintFlashT += dt;
      // Impact sparks where the beam stops (wall or board edge)
      if (!robotCharged && laserPath.length > 1 && Math.random() < 0.5) {
        const geo = getBoardGeometry();
        const end = laserPath[laserPath.length - 1];
        const px = geo.startX + end.c * geo.cell + geo.cell / 2;
        const py = geo.startY + end.r * geo.cell + geo.cell / 2;
        sparks.spawn({
          kind: 'spark',
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 180,
          vy: (Math.random() - 0.5) * 180,
          life: 0.25,
          size: 2,
          endSize: 0.5,
          color: Math.random() < 0.5 ? '#fda4af' : '#fef08a'
        });
      }
    }

    function drawBackdrop() {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0b1324');
      bg.addColorStop(1, '#060a14');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      // Circuit traces
      g.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      g.lineWidth = 2;
      for (let k = 0; k < 14; k++) {
        const y = 20 + k * 36;
        const x0 = (k * 97) % 200;
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + 120, y);
        g.lineTo(x0 + 140, y + 20);
        g.lineTo(x0 + 260, y + 20);
        g.stroke();
        g.beginPath();
        g.moveTo(W - x0, y + 10);
        g.lineTo(W - x0 - 100, y + 10);
        g.lineTo(W - x0 - 120, y - 10);
        g.stroke();
      }
      // Data pulses travelling along a few traces
      g.fillStyle = 'rgba(125, 211, 252, 0.5)';
      for (let k = 0; k < 4; k++) {
        const y = 20 + (k * 3 + 1) * 36;
        const x0 = (((k * 3 + 1) * 97) % 200);
        const px = x0 + ((sceneTime * 60 + k * 50) % 120);
        g.fillRect(px - 3, y - 1.5, 6, 3);
      }
      fx.glow(g, W / 2, H / 2, W * 0.45, '#1d4ed8', 0.12);
    }

    function drawTile(x, y, cell, r, c) {
      const tg = g.createLinearGradient(x, y, x + cell, y + cell);
      tg.addColorStop(0, (r + c) % 2 === 0 ? '#1e293b' : '#1a2335');
      tg.addColorStop(1, '#111827');
      g.fillStyle = tg;
      g.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      g.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      g.lineWidth = 1;
      g.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      // Corner screws
      g.fillStyle = 'rgba(148, 163, 184, 0.22)';
      [
        [x + 5, y + 5],
        [x + cell - 5, y + 5],
        [x + 5, y + cell - 5],
        [x + cell - 5, y + cell - 5]
      ].forEach(([sx, sy]) => {
        g.beginPath();
        g.arc(sx, sy, 1.4, 0, Math.PI * 2);
        g.fill();
      });
    }

    function drawWallBlock(x, y, cell) {
      const pad = 4;
      fx.roundRectPath(g, x + pad, y + pad, cell - pad * 2, cell - pad * 2, 7);
      const wg = g.createLinearGradient(0, y, 0, y + cell);
      wg.addColorStop(0, '#475569');
      wg.addColorStop(1, '#1e293b');
      g.fillStyle = wg;
      g.fill();
      g.save();
      g.clip();
      // Hazard stripes
      g.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      g.lineWidth = 5;
      for (let k = -cell; k < cell * 2; k += 14) {
        g.beginPath();
        g.moveTo(x + k, y + cell - pad - 8);
        g.lineTo(x + k + 8, y + cell - pad);
        g.stroke();
      }
      g.restore();
      fx.roundRectPath(g, x + pad, y + pad, cell - pad * 2, cell - pad * 2, 7);
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 1.5;
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.15)';
      g.fillRect(x + pad + 4, y + pad + 3, cell - pad * 2 - 8, 3);
    }

    function drawEmitter(cx, cy, cell) {
      g.save();
      g.translate(cx, cy);
      const bw = cell * 0.74;
      const bh = cell * 0.52;
      const eg = g.createLinearGradient(0, -bh / 2, 0, bh / 2);
      eg.addColorStop(0, '#f87171');
      eg.addColorStop(1, '#7f1d1d');
      fx.roundRectPath(g, -bw / 2, -bh / 2, bw, bh, 8);
      g.fillStyle = eg;
      g.fill();
      g.strokeStyle = '#0b1220';
      g.lineWidth = 2;
      g.stroke();
      // Cooling fins
      g.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      g.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(-bw / 2 + 6 + k * 7, -bh / 2 + 5);
        g.lineTo(-bw / 2 + 6 + k * 7, bh / 2 - 5);
        g.stroke();
      }
      // Lens
      const lensX = bw / 2 - 2;
      fx.glow(g, lensX, 0, cell * 0.5, '#f43f5e', 0.6 + Math.sin(sceneTime * 8) * 0.15);
      g.fillStyle = '#fecdd3';
      g.beginPath();
      g.arc(lensX, 0, cell * 0.11, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    function drawRobot(cx, cy, cell) {
      const charged = robotCharged;
      const hop = charged && !reduced ? -Math.abs(Math.sin(sceneTime * 9)) * cell * 0.1 : Math.sin(sceneTime * 2) * 1.5;
      const s = cell / 66;
      if (charged) fx.glow(g, cx, cy, cell, '#4ade80', 0.55);
      fx.contactShadow(g, cx, cy + cell * 0.36, cell * 0.24, cell * 0.06, 0.4);
      g.save();
      g.translate(cx, cy + hop);
      g.scale(s, s);
      g.strokeStyle = '#0b1220';
      g.lineWidth = 2.4;
      // Antenna
      g.beginPath();
      g.moveTo(0, -22);
      g.lineTo(0, -30);
      g.stroke();
      g.fillStyle = charged ? '#4ade80' : Math.sin(sceneTime * 4) > 0 ? '#f43f5e' : '#7f1d1d';
      g.beginPath();
      g.arc(0, -32, 4, 0, Math.PI * 2);
      g.fill();
      // Head
      const hg = g.createLinearGradient(0, -22, 0, 4);
      hg.addColorStop(0, '#e2e8f0');
      hg.addColorStop(1, '#94a3b8');
      fx.roundRectPath(g, -18, -22, 36, 24, 8);
      g.fillStyle = hg;
      g.fill();
      g.stroke();
      // Face screen
      fx.roundRectPath(g, -13, -17, 26, 14, 5);
      g.fillStyle = '#0b1220';
      g.fill();
      g.strokeStyle = charged ? '#4ade80' : '#7dd3fc';
      g.lineWidth = 2;
      if (charged) {
        // Happy ^^ eyes
        g.beginPath();
        g.moveTo(-8, -9);
        g.lineTo(-5, -12);
        g.lineTo(-2, -9);
        g.moveTo(2, -9);
        g.lineTo(5, -12);
        g.lineTo(8, -9);
        g.stroke();
      } else {
        g.fillStyle = '#7dd3fc';
        g.fillRect(-8, -12, 4, 4);
        g.fillRect(4, -12, 4, 4);
      }
      // Body with battery meter
      g.strokeStyle = '#0b1220';
      g.lineWidth = 2.4;
      fx.roundRectPath(g, -15, 4, 30, 20, 6);
      g.fillStyle = '#64748b';
      g.fill();
      g.stroke();
      fx.roundRectPath(g, -10, 8, 20, 11, 2);
      g.fillStyle = '#0b1220';
      g.fill();
      const charge = charged ? 1 : 0.15 + 0.1 * Math.sin(sceneTime * 3);
      g.fillStyle = charged ? '#4ade80' : '#f43f5e';
      g.fillRect(-8, 10, 16 * charge, 7);
      g.fillStyle = '#0b1220';
      g.fillRect(10, 11, 2, 5);
      g.restore();
    }

    function drawMirror(cx, cy, cell, item, isHint) {
      // Rotating base disc (shows it is clickable)
      const pulse = 0.5 + 0.5 * Math.sin(sceneTime * 3 + cx * 0.05);
      g.fillStyle = 'rgba(15, 23, 42, 0.85)';
      g.beginPath();
      g.arc(cx, cy, cell * 0.38, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = isHint ? `rgba(250, 204, 21, ${0.6 + pulse * 0.4})` : `rgba(56, 189, 248, ${0.35 + pulse * 0.2})`;
      g.lineWidth = isHint ? 2.5 : 1.5;
      g.beginPath();
      g.arc(cx, cy, cell * 0.38, 0, Math.PI * 2);
      g.stroke();
      g.save();
      g.translate(cx, cy);
      const ang = item.visAngle != null ? item.visAngle : item.state === 0 ? -Math.PI / 4 : Math.PI / 4;
      g.rotate(ang);
      const len = cell * 0.36;
      // Frame
      fx.roundRectPath(g, -len - 2, -5, len * 2 + 4, 10, 4);
      g.fillStyle = '#334155';
      g.fill();
      // Reflective slab
      const mg = g.createLinearGradient(0, -4, 0, 4);
      mg.addColorStop(0, '#f0f9ff');
      mg.addColorStop(0.5, '#7dd3fc');
      mg.addColorStop(1, '#0369a1');
      fx.roundRectPath(g, -len, -3.5, len * 2, 7, 3);
      g.fillStyle = mg;
      g.fill();
      // Moving glint
      const gx = ((sceneTime * 0.8 + cx * 0.01) % 1) * len * 2 - len;
      g.fillStyle = 'rgba(255, 255, 255, 0.8)';
      g.fillRect(gx, -3, 4, 6);
      // Pivot bolt
      g.fillStyle = '#e2e8f0';
      g.beginPath();
      g.arc(0, 0, 2.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    function drawLaser(cell, startX, startY) {
      if (laserPath.length < 2) return;
      const col = robotCharged ? '#4ade80' : '#f43f5e';
      const pts = laserPath.map((pt) => [startX + pt.c * cell + cell / 2, startY + pt.r * cell + cell / 2]);
      // Start at the lens rather than the emitter centre
      pts[0] = [pts[0][0] + cell * 0.35, pts[0][1]];
      const tracePath = () => {
        g.beginPath();
        pts.forEach(([px, py], idx) => (idx === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
      };
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      const flicker = reduced ? 1 : 0.85 + Math.sin(sceneTime * 30) * 0.15;
      [
        [18, 0.12],
        [10, 0.28],
        [5, 0.7]
      ].forEach(([lw, a]) => {
        tracePath();
        g.strokeStyle = fx.rgba(col, a * flicker);
        g.lineWidth = lw;
        g.stroke();
      });
      tracePath();
      g.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      g.lineWidth = 2;
      g.stroke();
      // Energy flowing along the beam
      if (!reduced) {
        tracePath();
        g.setLineDash([6, 18]);
        g.lineDashOffset = -sceneTime * 120;
        g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        g.lineWidth = 3.5;
        g.stroke();
        g.setLineDash([]);
      }
      g.restore();
      // Flares where the beam bounces off a mirror
      laserPath.forEach((pt, idx) => {
        if (idx > 0 && idx < laserPath.length - 1 && grid[pt.r][pt.c].type === 'mirror') {
          const px = startX + pt.c * cell + cell / 2;
          const py = startY + pt.r * cell + cell / 2;
          fx.glow(g, px, py, 22 + Math.sin(laserPulsePhase + idx) * 4, '#fef08a', 0.8);
        }
      });
    }

    function render() {
      const cfg = DIFFICULTY_CFG[difficulty];
      hidpi.apply();
      drawBackdrop();

      const { cell, startX, startY } = getBoardGeometry();
      // Board chassis
      fx.roundRectPath(g, startX - 10, startY - 10, cols * cell + 20, rows * cell + 20, 14);
      g.fillStyle = '#0f172a';
      g.fill();
      g.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      g.lineWidth = 2;
      g.stroke();

      const onBeam = new Set(laserPath.map((p) => `${p.r},${p.c}`));
      const hintKey = hintCell && hintFlashT < 1.2 ? `${hintCell.r},${hintCell.c}` : '';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * cell;
          const y = startY + r * cell;
          drawTile(x, y, cell, r, c);
          if (grid[r][c].type === 'wall') drawWallBlock(x, y, cell);
        }
      }

      drawLaser(cell, startX, startY);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = startX + c * cell + cell / 2;
          const cy = startY + r * cell + cell / 2;
          const item = grid[r][c];
          if (item.type === 'emitter') {
            drawEmitter(cx, cy, cell);
          } else if (item.type === 'robot') {
            drawRobot(cx, cy, cell);
          } else if (item.type === 'star') {
            const lit = onBeam.has(`${r},${c}`);
            if (lit) {
              fx.glow(g, cx, cy, cell * 0.7, '#facc15', 0.7);
              g.save();
              g.translate(cx, cy);
              g.rotate(reduced ? 0 : sceneTime * 1.5);
              drawStarShape(0, 0, cell * 0.24, '#facc15');
              drawStarShape(0, 0, cell * 0.12, '#fffbeb');
              g.restore();
            } else {
              drawStarShape(cx, cy, cell * 0.22, 'rgba(148, 163, 184, 0.35)');
              g.strokeStyle = 'rgba(203, 213, 225, 0.45)';
              g.lineWidth = 1.2;
              g.stroke();
            }
          } else if (item.type === 'mirror') {
            drawMirror(cx, cy, cell, item, `${r},${c}` === hintKey);
          }
        }
      }

      sparks.draw(g);

      // HUD
      fx.outlinedText(g, `🔬 MÀN ${level}`, 22, 20, { size: 15, color: '#7dd3fc', align: 'left' });
      g.save();
      for (let k = 0; k < totalStars; k++) {
        drawStarShape(W / 2 - ((totalStars - 1) * 22) / 2 + k * 22, 20, 8, k < litStars ? '#facc15' : 'rgba(148, 163, 184, 0.35)');
      }
      g.restore();
      fx.outlinedText(g, `↻ ${moves} lần xoay`, W - 22, 20, { size: 14, color: '#e2e8f0', align: 'right' });
      g.fillStyle = 'rgba(203, 213, 225, 0.6)';
      g.font = fx.font(12, 600);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`Bấm vào gương để xoay • Dẫn tia laser tới robot (${cfg.label})`, W / 2, H - 14);

      if (robotCharged) {
        fx.drawBanner(g, W, H, '⚡ ROBOT ĐÃ SẠC ĐẦY PIN!', {
          t: 1.65 - winTimer,
          duration: 1.65,
          accent: '#4ade80',
          sub: `Sao sáng ${litStars}/${totalStars} • Qua màn ${level}`,
          size: 34
        });
      }
    }

    function onCanvasPointer(evt) {
      evt.preventDefault();
      if (robotCharged) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * H;

      const { cell, startX, startY } = getBoardGeometry();
      const c = Math.floor((x - startX) / cell);
      const r = Math.floor((y - startY) / cell);

      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        const item = grid[r][c];
        if (item.type === 'mirror') {
          item.state = 1 - item.state;
          moves++;
          ArcadeHub.sound.click();
          sparks.ring(startX + c * cell + cell / 2, startY + r * cell + cell / 2, { from: cell * 0.2, to: cell * 0.55, color: '#7dd3fc', life: 0.3 });
          recalculateLaser();
        }
      }
    }

    canvas.addEventListener('mousedown', onCanvasPointer);
    canvas.addEventListener('touchstart', onCanvasPointer, { passive: false });

    hintBtn.addEventListener('click', () => {
      if (robotCharged) return;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const item = grid[r][c];
          if (item.type === 'mirror' && item.solutionState != null && item.state !== item.solutionState) {
            item.state = item.solutionState;
            ArcadeHub.sound.boost();
            hintCell = { r, c };
            hintFlashT = 0;
            recalculateLaser();
            return;
          }
        }
      }
    });

    newPuzzleBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      generateGuaranteedPuzzle();
    });

    diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextDiff = btn.getAttribute('data-diff');
        if (nextDiff === difficulty) return;
        difficulty = nextDiff;
        diffBtns.forEach((b) => b.classList.toggle('active', b === btn));
        ArcadeHub.sound.click();
        level = 1;
        score = 0;
        ctx.updateScore(0);
        generateGuaranteedPuzzle();
      });
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      updatePresentation(dt);
      update(dt);
      render();
      animId = requestAnimationFrame(loop);
    }

    generateGuaranteedPuzzle();
    animId = requestAnimationFrame(loop);

    return {
      restart() {
        level = 1;
        score = 0;
        ctx.updateScore(0);
        generateGuaranteedPuzzle();
      },
      destroy() {
        if (animId) cancelAnimationFrame(animId);
      }
    };
  }

  ArcadeHub.games.lasermirror = {
    init(container, ctx) {
      return createLaserMirrorGame(container, ctx);
    }
  };
})(window);
