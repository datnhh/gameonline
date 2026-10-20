(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const LEVELS = {
    easy: [
      [
        '#########',
        '#...#..C#',
        '#.P.B.S.#',
        '#.......#',
        '#########'
      ],
      [
        '#########',
        '#..S....#',
        '#..B..C.#',
        '#.PB.S..#',
        '#.......#',
        '#########'
      ],
      [
        '#########',
        '#C..S...#',
        '#...B...#',
        '#..P.B.S#',
        '#.......#',
        '#########'
      ],
      [
        '##########',
        '#C.......#',
        '#.S.B..P.#',
        '#...#..B.#',
        '#......S.#',
        '##########'
      ],
      [
        '##########',
        '#C..S....#',
        '#...B..S.#',
        '#..PB.B..#',
        '#.....S..#',
        '#........#',
        '##########'
      ]
    ],
    hard: [
      [
        '##########',
        '#C..S....#',
        '#...B.#..#',
        '#.S.BPB.S#',
        '#........#',
        '##########'
      ],
      [
        '##########',
        '#C.S..S..#',
        '#..B..B..#',
        '#....#...#',
        '#..P..B.S#',
        '#........#',
        '##########'
      ],
      [
        '###########',
        '#C...S....#',
        '#....B....#',
        '#..S.P.S..#',
        '#...B.B...#',
        '#.........#',
        '###########'
      ],
      [
        '###########',
        '#C..S.S...#',
        '#...B.B...#',
        '#.S..P..S.#',
        '#...B.B...#',
        '#.........#',
        '###########'
      ],
      [
        '############',
        '#C..S..S...#',
        '#...B..B...#',
        '#..#....#..#',
        '#.S.B.PB.S.#',
        '#..........#',
        '############'
      ]
    ]
  };

  function createSokobanGame(container, ctx) {
    const W = 820;
    const H = 500;

    let difficulty = 'easy';
    let levelIdx = 0;
    let score = 0;
    let movesCount = 0;
    let animId = null;

    let rows = 0;
    let cols = 0;
    let walls = [];
    let switches = [];
    let boxes = [];
    let chestPos = { r: 1, c: 1 };
    let player = { r: 1, c: 1, visR: 1, visC: 1, facing: 1 };
    let undoStack = [];
    let chestOpened = false;
    let transitionTimer = 0;
    let runeAngle = 0;
    let particles = [];

    container.innerHTML = `
      <div class="game-shell">
        <div class="game-toolbar">
          <div class="toolbar-group">
            <span style="font-weight:700;color:#94a3b8;font-size:0.82rem;">Chế độ:</span>
            <button type="button" class="pill-btn active" data-diff="easy">🌱 Dễ (1-3 Viên Đá)</button>
            <button type="button" class="pill-btn" data-diff="hard">🔥 Khó (3-4 Viên Đá)</button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="pill-btn" id="skUndoBtn">↩ Đi Lại (Z)</button>
            <button type="button" class="pill-btn" id="skResetLevelBtn">🔄 Xếp Lại Màn</button>
            <span id="skStatusBadge" style="font-size:0.84rem;color:#facc15;font-weight:800;">Màn 1/5</span>
          </div>
        </div>
        <div class="canvas-frame">
          <canvas id="sokobanCanvas" class="game-canvas" width="${W}" height="${H}"></canvas>
        </div>
        <div class="touch-controls">
          <div class="touch-cluster">
            <button type="button" class="touch-btn" data-move="left">◀ Trái</button>
            <button type="button" class="touch-btn" data-move="up">▲ Lên</button>
            <button type="button" class="touch-btn" data-move="down">▼ Xuống</button>
            <button type="button" class="touch-btn" data-move="right">Phải ▶</button>
          </div>
          <div class="touch-cluster">
            <button type="button" class="touch-btn" id="skTouchUndo">↩ Đi Lại</button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#sokobanCanvas');
    const g = canvas.getContext('2d');
    const statusBadge = container.querySelector('#skStatusBadge');
    const undoBtn = container.querySelector('#skUndoBtn');
    const resetLevelBtn = container.querySelector('#skResetLevelBtn');
    const touchUndoBtn = container.querySelector('#skTouchUndo');
    const diffBtns = container.querySelectorAll('[data-diff]');

    function loadLevel(idx) {
      const list = LEVELS[difficulty];
      levelIdx = idx % list.length;
      const raw = list[levelIdx];
      rows = raw.length;
      cols = raw[0].length;
      walls = [];
      switches = [];
      boxes = [];
      undoStack = [];
      movesCount = 0;
      chestOpened = false;
      transitionTimer = 0;

      for (let r = 0; r < rows; r++) {
        walls[r] = [];
        switches[r] = [];
        for (let c = 0; c < cols; c++) {
          const ch = raw[r][c];
          walls[r][c] = ch === '#';
          switches[r][c] = ch === 'S' || ch === '*';
          if (ch === 'B' || ch === '*') {
            boxes.push({ r, c, visR: r, visC: c });
          }
          if (ch === 'P') {
            player = { r, c, visR: r, visC: c, facing: 1 };
          }
          if (ch === 'C') {
            chestPos = { r, c };
          }
        }
      }
      updateBadge();
    }

    function updateBadge() {
      const totalLevels = LEVELS[difficulty].length;
      const activeCount = boxes.filter((b) => switches[b.r][b.c]).length;
      if (statusBadge) {
        statusBadge.textContent = `Màn ${levelIdx + 1}/${totalLevels} • Công tắc: ${activeCount}/${boxes.length} • Bước: ${movesCount}`;
      }
    }

    function findBoxAt(r, c) {
      return boxes.find((b) => b.r === r && b.c === c);
    }

    function undoMove() {
      if (chestOpened || undoStack.length === 0) return;
      const prev = undoStack.pop();
      player.r = prev.player.r;
      player.c = prev.player.c;
      player.visR = prev.player.r;
      player.visC = prev.player.c;
      player.facing = prev.player.facing;
      boxes = prev.boxes.map((b) => ({ r: b.r, c: b.c, visR: b.r, visC: b.c }));
      movesCount = Math.max(0, movesCount - 1);
      ArcadeHub.sound.click();
      updateBadge();
    }

    function tryMove(dr, dc) {
      if (chestOpened) return;
      if (dc !== 0) player.facing = dc;

      const nr = player.r + dr;
      const nc = player.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || walls[nr][nc]) {
        ArcadeHub.sound.error();
        return;
      }

      const box = findBoxAt(nr, nc);
      if (box) {
        const br = nr + dr;
        const bc = nc + dc;
        if (br < 0 || br >= rows || bc < 0 || bc >= cols || walls[br][bc] || findBoxAt(br, bc)) {
          ArcadeHub.sound.error();
          return;
        }

        // Save snapshot for Undo
        undoStack.push({
          player: { ...player },
          boxes: boxes.map((b) => ({ ...b }))
        });

        box.r = br;
        box.c = bc;
        player.r = nr;
        player.c = nc;
        movesCount++;

        if (switches[br][bc]) {
          ArcadeHub.sound.boost();
        } else {
          ArcadeHub.sound.tile();
        }
      } else {
        undoStack.push({
          player: { ...player },
          boxes: boxes.map((b) => ({ ...b }))
        });
        player.r = nr;
        player.c = nc;
        movesCount++;
        ArcadeHub.sound.move();
      }

      updateBadge();
      checkWinCondition();
    }

    function checkWinCondition() {
      const allActivated = boxes.every((b) => switches[b.r][b.c]);
      if (!allActivated) return;

      chestOpened = true;
      transitionTimer = 1.6;
      const mult = difficulty === 'hard' ? 1.6 : 1;
      const gained = Math.round((200 + Math.max(20, 120 - movesCount * 3)) * mult);
      score += gained;
      ctx.updateScore(score);
      ArcadeHub.sound.win();

      // Gold coins burst
      for (let i = 0; i < 28; i++) {
        particles.push({
          x: W / 2 + (Math.random() - 0.5) * 140,
          y: H / 2,
          vx: (Math.random() - 0.5) * 240,
          vy: -120 - Math.random() * 180,
          life: 1.4
        });
      }

      if (levelIdx === LEVELS[difficulty].length - 1) {
        ctx.submitHighScore(score, `Hoàn thành 5/5 màn (${difficulty === 'hard' ? 'KHÓ' : 'DỄ'})`);
      }
    }

    function update(dt) {
      runeAngle += dt * 1.8;
      // Smooth slide interpolation for player & crystal boxes
      const lerpRate = Math.min(1, dt * 16);
      player.visR += (player.r - player.visR) * lerpRate;
      player.visC += (player.c - player.visC) * lerpRate;
      boxes.forEach((b) => {
        if (b.visR == null) b.visR = b.r;
        if (b.visC == null) b.visC = b.c;
        b.visR += (b.r - b.visR) * lerpRate;
        b.visC += (b.c - b.visC) * lerpRate;
      });

      if (chestOpened) {
        transitionTimer -= dt;
        if (transitionTimer <= 0) {
          loadLevel(levelIdx + 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 420 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }

    function getBoardGeometry() {
      const cell = Math.min(Math.floor((W - 80) / cols), Math.floor((H - 80) / rows), 64);
      const boardW = cols * cell;
      const boardH = rows * cell;
      const startX = Math.floor((W - boardW) / 2);
      const startY = Math.floor((H - boardH) / 2);
      return { cell, startX, startY };
    }

    function render() {
      g.fillStyle = '#090d16';
      g.fillRect(0, 0, W, H);

      const { cell, startX, startY } = getBoardGeometry();

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * cell;
          const y = startY + r * cell;

          if (walls[r][c]) {
            g.fillStyle = '#334155';
            g.strokeStyle = '#475569';
            g.lineWidth = 2;
            g.fillRect(x, y, cell, cell);
            g.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
            // Brick line detail
            g.fillStyle = '#1e293b';
            g.fillRect(x + 6, y + cell / 2 - 2, cell - 12, 4);
          } else {
            g.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#172033';
            g.fillRect(x, y, cell, cell);

            if (switches[r][c]) {
              // Glowing rotating magic rune switch
              g.save();
              g.translate(x + cell / 2, y + cell / 2);
              g.rotate(runeAngle);
              g.strokeStyle = '#38bdf8';
              g.lineWidth = 2.5;
              g.setLineDash([6, 4]);
              g.beginPath();
              g.arc(0, 0, cell * 0.3, 0, Math.PI * 2);
              g.stroke();
              g.setLineDash([]);
              g.fillStyle = 'rgba(56, 189, 248, 0.28)';
              g.fill();
              g.restore();
            }
          }
        }
      }

      // Draw Treasure Chest
      {
        const cx = startX + chestPos.c * cell + cell / 2;
        const cy = startY + chestPos.r * cell + cell / 2;
        g.save();
        g.translate(cx, cy);
        g.fillStyle = chestOpened ? '#facc15' : '#b45309';
        g.strokeStyle = '#fef08a';
        g.lineWidth = 2.5;
        g.beginPath();
        g.roundRect(-cell * 0.34, -cell * 0.26, cell * 0.68, cell * 0.52, 6);
        g.fill();
        g.stroke();
        g.font = `${Math.round(cell * 0.42)}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(chestOpened ? '👑' : '🔒', 0, 2);
        g.restore();
      }

      // Draw Magic Stones (Boxes) with smooth sliding position
      boxes.forEach((b) => {
        const vr = b.visR != null ? b.visR : b.r;
        const vc = b.visC != null ? b.visC : b.c;
        const x = startX + vc * cell + cell / 2;
        const y = startY + vr * cell + cell / 2;
        const onSwitch = switches[b.r][b.c];

        g.save();
        g.translate(x, y);
        g.fillStyle = onSwitch ? '#22c55e' : '#f59e0b';
        g.strokeStyle = onSwitch ? '#bbf7d0' : '#fef08a';
        g.lineWidth = 3;
        const sz = cell * 0.72;
        g.beginPath();
        g.roundRect(-sz / 2, -sz / 2, sz, sz, 10);
        g.fill();
        g.stroke();

        g.font = `${Math.round(cell * 0.42)}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(onSwitch ? '✨' : '💎', 0, 2);
        g.restore();
      });

      // Draw Hero Knight with smooth sliding position
      {
        const vr = player.visR != null ? player.visR : player.r;
        const vc = player.visC != null ? player.visC : player.c;
        const px = startX + vc * cell + cell / 2;
        const py = startY + vr * cell + cell / 2;
        g.save();
        g.translate(px, py);

        // Cape
        g.fillStyle = '#dc2626';
        g.beginPath();
        g.arc(-player.facing * 6, 4, cell * 0.28, 0, Math.PI * 2);
        g.fill();

        // Helmet/Head
        g.fillStyle = '#38bdf8';
        g.strokeStyle = '#f8fafc';
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(0, 0, cell * 0.32, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Visor eyes
        g.fillStyle = '#090d16';
        g.fillRect(-8, -4, 16, 6);
        g.fillStyle = '#facc15';
        g.fillRect(-5 + player.facing * 2, -3, 4, 4);
        g.fillRect(2 + player.facing * 2, -3, 4, 4);

        g.restore();
      }

      // Gold coins celebration
      particles.forEach((p) => {
        g.save();
        g.fillStyle = '#facc15';
        g.strokeStyle = '#ca8a04';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(p.x, p.y, 7, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.restore();
      });

      if (chestOpened) {
        g.fillStyle = 'rgba(15, 23, 42, 0.78)';
        g.fillRect(W / 2 - 210, H / 2 - 48, 420, 96);
        g.strokeStyle = '#facc15';
        g.lineWidth = 3;
        g.strokeRect(W / 2 - 210, H / 2 - 48, 420, 96);
        g.fillStyle = '#facc15';
        g.font = '900 24px sans-serif';
        g.textAlign = 'center';
        g.fillText('🎉 KHO BÁU ĐÃ MỞ! QUA MÀN! 🎉', W / 2, H / 2 + 6);
      }
    }

    function onCanvasPointer(evt) {
      evt.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * H;

      const { cell, startX, startY } = getBoardGeometry();
      const clickC = Math.floor((x - startX) / cell);
      const clickR = Math.floor((y - startY) / cell);

      const dr = clickR - player.r;
      const dc = clickC - player.c;
      if (Math.abs(dr) + Math.abs(dc) === 1) {
        tryMove(dr, dc);
      } else if (Math.abs(dr) > Math.abs(dc)) {
        tryMove(dr > 0 ? 1 : -1, 0);
      } else if (dc !== 0) {
        tryMove(0, dc > 0 ? 1 : -1);
      }
    }

    function onKeyDown(evt) {
      if (evt.key === 'ArrowLeft' || evt.key === 'a' || evt.key === 'A') {
        evt.preventDefault();
        tryMove(0, -1);
      } else if (evt.key === 'ArrowRight' || evt.key === 'd' || evt.key === 'D') {
        evt.preventDefault();
        tryMove(0, 1);
      } else if (evt.key === 'ArrowUp' || evt.key === 'w' || evt.key === 'W') {
        evt.preventDefault();
        tryMove(-1, 0);
      } else if (evt.key === 'ArrowDown' || evt.key === 's' || evt.key === 'S') {
        evt.preventDefault();
        tryMove(1, 0);
      } else if (evt.key === 'z' || evt.key === 'Z') {
        evt.preventDefault();
        undoMove();
      }
    }

    canvas.addEventListener('mousedown', onCanvasPointer);
    canvas.addEventListener('touchstart', onCanvasPointer, { passive: false });
    global.addEventListener('keydown', onKeyDown);

    undoBtn.addEventListener('click', undoMove);
    if (touchUndoBtn) touchUndoBtn.addEventListener('click', undoMove);
    resetLevelBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      loadLevel(levelIdx);
    });

    diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextDiff = btn.getAttribute('data-diff');
        if (nextDiff === difficulty) return;
        difficulty = nextDiff;
        diffBtns.forEach((b) => b.classList.toggle('active', b === btn));
        ArcadeHub.sound.click();
        score = 0;
        ctx.updateScore(0);
        loadLevel(0);
      });
    });

    container.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-move');
        if (dir === 'left') tryMove(0, -1);
        if (dir === 'right') tryMove(0, 1);
        if (dir === 'up') tryMove(-1, 0);
        if (dir === 'down') tryMove(1, 0);
      });
    });

    let lastTime = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      update(dt);
      render();
      animId = requestAnimationFrame(loop);
    }

    loadLevel(0);
    animId = requestAnimationFrame(loop);

    return {
      restart() {
        score = 0;
        ctx.updateScore(0);
        loadLevel(0);
      },
      destroy() {
        if (animId) cancelAnimationFrame(animId);
        global.removeEventListener('keydown', onKeyDown);
      }
    };
  }

  ArcadeHub.games.sokoban = {
    init(container, ctx) {
      return createSokobanGame(container, ctx);
    }
  };
})(window);
