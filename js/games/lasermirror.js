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
    let particles = [];

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
    const g = canvas.getContext('2d');
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
        for (let i = 0; i < 24; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 60 + Math.random() * 180;
          particles.push({
            x: rx,
            y: ry,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: i % 2 === 0 ? '#4ade80' : '#facc15',
            life: 1.2
          });
        }

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

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }

    function render() {
      g.fillStyle = '#090d16';
      g.fillRect(0, 0, W, H);

      const { cell, startX, startY } = getBoardGeometry();

      // Grid cells
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * cell;
          const y = startY + r * cell;
          const item = grid[r][c];

          g.fillStyle = (r + c) % 2 === 0 ? '#111827' : '#1e293b';
          g.strokeStyle = 'rgba(148, 163, 184, 0.16)';
          g.lineWidth = 1;
          g.fillRect(x, y, cell, cell);
          g.strokeRect(x, y, cell, cell);

          if (item.type === 'wall') {
            g.fillStyle = '#334155';
            g.strokeStyle = '#64748b';
            g.lineWidth = 2;
            g.beginPath();
            g.roundRect(x + 5, y + 5, cell - 10, cell - 10, 8);
            g.fill();
            g.stroke();
          } else if (item.type === 'mirror') {
            // Mirror base circle so kids know it is clickable
            g.fillStyle = 'rgba(56, 189, 248, 0.14)';
            g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            g.lineWidth = 1.5;
            g.beginPath();
            g.arc(x + cell / 2, y + cell / 2, cell * 0.38, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          }
        }
      }

      // Draw Laser Beam behind icons
      if (laserPath.length > 1) {
        g.save();
        g.strokeStyle = robotCharged ? '#4ade80' : '#f43f5e';
        g.shadowColor = robotCharged ? '#4ade80' : '#f43f5e';
        g.shadowBlur = 14;
        g.lineWidth = 6;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        laserPath.forEach((pt, idx) => {
          const px = startX + pt.c * cell + cell / 2;
          const py = startY + pt.r * cell + cell / 2;
          if (idx === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        });
        g.stroke();

        // Inner bright core
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2.2;
        g.stroke();

        // Glowing reflection nodes at mirrors along the beam
        laserPath.forEach((pt, idx) => {
          if (idx > 0 && idx < laserPath.length - 1 && grid[pt.r][pt.c].type === 'mirror') {
            const px = startX + pt.c * cell + cell / 2;
            const py = startY + pt.r * cell + cell / 2;
            g.fillStyle = '#fef08a';
            g.beginPath();
            g.arc(px, py, 5 + Math.sin(laserPulsePhase + idx) * 1.8, 0, Math.PI * 2);
            g.fill();
          }
        });
        g.restore();
      }

      // Draw Objects on top
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = startX + c * cell + cell / 2;
          const cy = startY + r * cell + cell / 2;
          const item = grid[r][c];

          if (item.type === 'emitter') {
            g.save();
            g.translate(cx, cy);
            g.fillStyle = '#dc2626';
            g.strokeStyle = '#fca5a5';
            g.lineWidth = 2.5;
            g.beginPath();
            g.roundRect(-cell * 0.36, -cell * 0.28, cell * 0.72, cell * 0.56, 8);
            g.fill();
            g.stroke();
            g.font = `${Math.round(cell * 0.4)}px sans-serif`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText('⚡', 0, 1);
            g.restore();
          } else if (item.type === 'robot') {
            g.save();
            g.translate(cx, cy);
            g.fillStyle = robotCharged ? '#16a34a' : '#1d4ed8';
            g.strokeStyle = robotCharged ? '#bbf7d0' : '#93c5fd';
            g.lineWidth = 3;
            g.beginPath();
            g.arc(0, 0, cell * 0.38, 0, Math.PI * 2);
            g.fill();
            g.stroke();
            g.font = `${Math.round(cell * 0.48)}px sans-serif`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText('🤖', 0, 2);
            g.restore();
          } else if (item.type === 'star') {
            g.font = `${Math.round(cell * 0.45)}px sans-serif`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText('⭐', cx, cy + 2);
          } else if (item.type === 'mirror') {
            g.save();
            g.translate(cx, cy);
            const ang = item.visAngle != null ? item.visAngle : item.state === 0 ? -Math.PI / 4 : Math.PI / 4;
            g.rotate(ang);
            const len = cell * 0.36;
            g.strokeStyle = '#38bdf8';
            g.lineWidth = 7;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-len, 0);
            g.lineTo(len, 0);
            g.stroke();

            g.strokeStyle = '#e0f2fe';
            g.lineWidth = 2.5;
            g.stroke();
            g.restore();
          }
        }
      }

      // Particles
      particles.forEach((p) => {
        g.save();
        g.globalAlpha = Math.min(1, p.life);
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        g.fill();
        g.restore();
      });

      if (robotCharged) {
        g.fillStyle = 'rgba(15, 23, 42, 0.85)';
        g.fillRect(W / 2 - 220, H / 2 - 44, 440, 88);
        g.strokeStyle = '#4ade80';
        g.lineWidth = 3;
        g.strokeRect(W / 2 - 220, H / 2 - 44, 440, 88);
        g.fillStyle = '#4ade80';
        g.font = '900 22px sans-serif';
        g.textAlign = 'center';
        g.fillText('⚡ ROBOT ĐÃ ĐƯỢC SẠC ĐẦY PIN! QUA MÀN! 🤖', W / 2, H / 2 + 5);
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
