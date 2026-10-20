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

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(200);
    let coins = [];
    let sceneTime = 0;
    let bumpT = 10;
    let bumpDir = { r: 0, c: 0 };
    let chestOpenAge = 0;
    let lastGained = 0;

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
    const hidpi = fx.setupHiDPICanvas(canvas, W, H);
    const g = hidpi.g;
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
        bumpT = 0;
        bumpDir = { r: dr, c: dc };
        return;
      }

      const box = findBoxAt(nr, nc);
      if (box) {
        const br = nr + dr;
        const bc = nc + dc;
        if (br < 0 || br >= rows || bc < 0 || bc >= cols || walls[br][bc] || findBoxAt(br, bc)) {
          ArcadeHub.sound.error();
          bumpT = 0;
          bumpDir = { r: dr, c: dc };
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

        const geo = getBoardGeometry();
        const bx = geo.startX + bc * geo.cell + geo.cell / 2;
        const by = geo.startY + br * geo.cell + geo.cell / 2;
        sparks.burst(bx - dc * geo.cell * 0.4, by - dr * geo.cell * 0.4 + geo.cell * 0.3, {
          count: 5,
          kind: 'smoke',
          speed: [15, 45],
          life: [0.35, 0.6],
          size: [4, 7],
          colors: ['#a8a29e', '#78716c']
        });
        if (switches[br][bc]) {
          ArcadeHub.sound.boost();
          sparks.burst(bx, by, { count: 14, kind: 'star', speed: [50, 150], size: [3, 6], colors: ['#4ade80', '#bbf7d0', '#ffffff'] });
          sparks.ring(bx, by, { from: 8, to: geo.cell * 0.9, color: '#4ade80' });
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
      lastGained = gained;
      ctx.updateScore(score);
      ArcadeHub.sound.win();

      // Gold coins burst
      for (let i = 0; i < 28; i++) {
        coins.push({
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
    }

    function getBoardGeometry() {
      const cell = Math.min(Math.floor((W - 80) / cols), Math.floor((H - 80) / rows), 64);
      const boardW = cols * cell;
      const boardH = rows * cell;
      const startX = Math.floor((W - boardW) / 2);
      const startY = Math.floor((H - boardH) / 2);
      return { cell, startX, startY };
    }

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    function cellHash(r, c) {
      const v = Math.sin(r * 127.1 + c * 311.7) * 43758.5453;
      return v - Math.floor(v);
    }

    function drawFloor(x, y, cell, r, c) {
      const h = cellHash(r, c);
      g.fillStyle = (r + c) % 2 === 0 ? '#4a3f30' : '#433829';
      g.fillRect(x, y, cell, cell);
      g.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      g.lineWidth = 1;
      g.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      g.fillStyle = 'rgba(255, 237, 213, 0.05)';
      g.fillRect(x + 2, y + 2, cell - 4, cell * 0.3);
      if (h > 0.6) {
        g.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        g.beginPath();
        g.moveTo(x + cell * 0.2, y + cell * 0.3);
        g.lineTo(x + cell * 0.45, y + cell * 0.5);
        g.lineTo(x + cell * 0.4, y + cell * 0.75);
        g.stroke();
      }
    }

    function drawWall(x, y, cell, r, c) {
      const depth = Math.round(cell * 0.2);
      const openBelow = r + 1 < rows && !walls[r + 1][c];
      const topH = openBelow ? cell - depth : cell;
      // Top face
      const tg = g.createLinearGradient(0, y, 0, y + topH);
      tg.addColorStop(0, '#6b7280');
      tg.addColorStop(1, '#4b5563');
      g.fillStyle = tg;
      g.fillRect(x, y, cell, topH);
      // Brick mortar on the top face
      g.strokeStyle = 'rgba(17, 24, 39, 0.55)';
      g.lineWidth = 1.5;
      const rowsOfBricks = 3;
      const bh = topH / rowsOfBricks;
      g.beginPath();
      for (let k = 1; k < rowsOfBricks; k++) {
        g.moveTo(x, y + k * bh);
        g.lineTo(x + cell, y + k * bh);
      }
      for (let k = 0; k < rowsOfBricks; k++) {
        const off = k % 2 === 0 ? cell * 0.5 : cell * 0.25;
        g.moveTo(x + off, y + k * bh);
        g.lineTo(x + off, y + (k + 1) * bh);
        if (k % 2 === 1) {
          g.moveTo(x + off + cell * 0.5, y + k * bh);
          g.lineTo(x + off + cell * 0.5, y + (k + 1) * bh);
        }
      }
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.12)';
      g.fillRect(x, y, cell, 2);
      // Front face where the floor is visible below
      if (openBelow) {
        g.fillStyle = '#1f2937';
        g.fillRect(x, y + topH, cell, depth);
        g.fillStyle = 'rgba(0, 0, 0, 0.35)';
        g.fillRect(x, y + cell, cell, Math.max(3, depth * 0.4));
      }
      // Moss
      const h = cellHash(r, c);
      if (h > 0.55) {
        g.fillStyle = 'rgba(74, 222, 128, 0.45)';
        g.beginPath();
        g.ellipse(x + cell * (0.2 + h * 0.5), y + topH - 3, cell * 0.16, cell * 0.06, 0, 0, Math.PI * 2);
        g.fill();
      }
    }

    function drawTorch(x, y, cell, seed) {
      const flick = 0.75 + 0.25 * Math.sin(sceneTime * 13 + seed) * Math.sin(sceneTime * 7.3 + seed * 2);
      fx.glow(g, x, y - cell * 0.12, cell * 1.6, '#f97316', 0.32 * flick);
      g.fillStyle = '#78350f';
      g.fillRect(x - 3, y - cell * 0.05, 6, cell * 0.25);
      g.fillStyle = '#fb923c';
      g.beginPath();
      g.moveTo(x, y - cell * 0.32 * flick);
      g.quadraticCurveTo(x + 7, y - cell * 0.08, x, y - cell * 0.02);
      g.quadraticCurveTo(x - 7, y - cell * 0.08, x, y - cell * 0.32 * flick);
      g.fill();
      g.fillStyle = '#fef08a';
      g.beginPath();
      g.ellipse(x, y - cell * 0.08, 2.5, 5 * flick, 0, 0, Math.PI * 2);
      g.fill();
    }

    function drawRuneSwitch(cx, cy, cell, active) {
      const col = active ? '#4ade80' : '#38bdf8';
      fx.glow(g, cx, cy, cell * 0.65, col, active ? 0.55 : 0.28);
      g.save();
      g.translate(cx, cy);
      g.strokeStyle = fx.rgba(col, 0.9);
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(0, 0, cell * 0.34, 0, Math.PI * 2);
      g.stroke();
      g.rotate(runeAngle * (active ? 2 : 1));
      g.strokeStyle = fx.rgba(col, 0.7);
      g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.moveTo(cell * 0.2, 0);
        g.lineTo(cell * 0.28, -cell * 0.05);
        g.lineTo(cell * 0.28, cell * 0.05);
        g.closePath();
        g.stroke();
      }
      g.restore();
    }

    function drawCrystal(cx, cy, cell, onSwitch) {
      const sz = cell * 0.68;
      const base = onSwitch ? '#22c55e' : '#f59e0b';
      fx.contactShadow(g, cx, cy + sz * 0.48, sz * 0.46, sz * 0.12, 0.45);
      if (onSwitch) fx.glow(g, cx, cy, cell * 0.9, '#4ade80', 0.4 + Math.sin(sceneTime * 4) * 0.1);
      g.save();
      g.translate(cx, cy);
      // Octagonal gem block
      const k = sz * 0.28;
      const hs = sz / 2;
      g.beginPath();
      g.moveTo(-hs + k, -hs);
      g.lineTo(hs - k, -hs);
      g.lineTo(hs, -hs + k);
      g.lineTo(hs, hs - k);
      g.lineTo(hs - k, hs);
      g.lineTo(-hs + k, hs);
      g.lineTo(-hs, hs - k);
      g.lineTo(-hs, -hs + k);
      g.closePath();
      const gg = g.createLinearGradient(-hs, -hs, hs, hs);
      gg.addColorStop(0, fx.shade(base, 0.45));
      gg.addColorStop(0.5, base);
      gg.addColorStop(1, fx.shade(base, -0.4));
      g.fillStyle = gg;
      g.fill();
      g.strokeStyle = fx.shade(base, -0.55);
      g.lineWidth = 2;
      g.stroke();
      // Facets
      g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-hs + k, -hs);
      g.lineTo(-sz * 0.18, -sz * 0.18);
      g.lineTo(sz * 0.18, -sz * 0.18);
      g.lineTo(hs - k, -hs);
      g.moveTo(-sz * 0.18, -sz * 0.18);
      g.lineTo(-sz * 0.18, sz * 0.18);
      g.lineTo(sz * 0.18, sz * 0.18);
      g.lineTo(sz * 0.18, -sz * 0.18);
      g.moveTo(-sz * 0.18, sz * 0.18);
      g.lineTo(-hs + k, hs);
      g.moveTo(sz * 0.18, sz * 0.18);
      g.lineTo(hs - k, hs);
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.55)';
      g.beginPath();
      g.ellipse(-sz * 0.12, -sz * 0.28, sz * 0.12, sz * 0.05, -0.4, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    function drawChest(cx, cy, cell) {
      const w = cell * 0.7;
      const h = cell * 0.44;
      const openT = chestOpened ? Math.min(1, chestOpenAge / 0.4) : 0;
      if (chestOpened) fx.glow(g, cx, cy - h * 0.3, cell * 1.4, '#facc15', 0.6);
      fx.contactShadow(g, cx, cy + h * 0.6, w * 0.5, h * 0.18, 0.45);
      g.save();
      g.translate(cx, cy);
      g.strokeStyle = '#3f1d0b';
      g.lineWidth = 2;
      // Base
      const bg = g.createLinearGradient(0, -h * 0.1, 0, h * 0.55);
      bg.addColorStop(0, '#b45309');
      bg.addColorStop(1, '#78350f');
      g.fillStyle = bg;
      fx.roundRectPath(g, -w / 2, -h * 0.1, w, h * 0.65, 4);
      g.fill();
      g.stroke();
      // Gold bands
      g.fillStyle = '#facc15';
      g.fillRect(-w / 2 + w * 0.18, -h * 0.1, w * 0.08, h * 0.65);
      g.fillRect(w / 2 - w * 0.26, -h * 0.1, w * 0.08, h * 0.65);
      // Lid (tilts back when opened)
      g.save();
      g.translate(0, -h * 0.1);
      g.scale(1, 1 - openT * 1.5);
      const lg = g.createLinearGradient(0, -h * 0.5, 0, 0);
      lg.addColorStop(0, '#d97706');
      lg.addColorStop(1, '#92400e');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(-w / 2, 0);
      g.lineTo(-w / 2, -h * 0.25);
      g.quadraticCurveTo(0, -h * 0.62, w / 2, -h * 0.25);
      g.lineTo(w / 2, 0);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
      if (chestOpened) {
        // Treasure inside
        g.fillStyle = '#fde047';
        g.beginPath();
        g.ellipse(0, -h * 0.1, w * 0.4, h * 0.16, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(-w * 0.12, -h * 0.16, 2, 0, Math.PI * 2);
        g.arc(w * 0.1, -h * 0.12, 1.6, 0, Math.PI * 2);
        g.fill();
      } else {
        // Padlock
        g.fillStyle = '#e5e7eb';
        fx.roundRectPath(g, -w * 0.09, -h * 0.02, w * 0.18, h * 0.24, 3);
        g.fill();
        g.stroke();
        g.strokeStyle = '#e5e7eb';
        g.lineWidth = 2.4;
        g.beginPath();
        g.arc(0, -h * 0.02, w * 0.06, Math.PI, 0);
        g.stroke();
        g.fillStyle = '#111827';
        g.fillRect(-1, h * 0.06, 2, h * 0.08);
      }
      g.restore();
    }

    function drawKnight(px, py, cell) {
      const moving = Math.abs(player.r - player.visR) + Math.abs(player.c - player.visC) > 0.03;
      const bob = moving && !reduced ? -Math.abs(Math.sin(sceneTime * 22)) * cell * 0.05 : Math.sin(sceneTime * 2.5) * cell * 0.012;
      const bumpX = bumpT < 0.15 && !reduced ? Math.sin((bumpT / 0.15) * Math.PI) * bumpDir.c * cell * 0.1 : 0;
      const bumpY = bumpT < 0.15 && !reduced ? Math.sin((bumpT / 0.15) * Math.PI) * bumpDir.r * cell * 0.1 : 0;
      const s = cell / 64;
      fx.contactShadow(g, px, py + cell * 0.36, cell * 0.24, cell * 0.07, 0.45);
      g.save();
      g.translate(px + bumpX, py + bob + bumpY);
      g.scale(player.facing * s, s);
      g.strokeStyle = '#0b1220';
      g.lineWidth = 2.4;
      g.lineJoin = 'round';
      // Cape
      const sway = Math.sin(sceneTime * 4) * 2;
      g.fillStyle = '#dc2626';
      g.beginPath();
      g.moveTo(-8, -6);
      g.lineTo(-20 + sway, 20);
      g.lineTo(-4, 18);
      g.closePath();
      g.fill();
      g.stroke();
      // Body armour
      const ag = g.createLinearGradient(-12, 0, 12, 0);
      ag.addColorStop(0, '#cbd5e1');
      ag.addColorStop(1, '#64748b');
      g.fillStyle = ag;
      fx.roundRectPath(g, -11, -6, 22, 24, 7);
      g.fill();
      g.stroke();
      g.fillStyle = '#facc15';
      g.fillRect(-11, 6, 22, 3);
      // Legs
      g.fillStyle = '#475569';
      g.fillRect(-9, 17, 7, 7);
      g.fillRect(2, 17, 7, 7);
      // Helmet
      const hg = g.createRadialGradient(-4, -24, 2, 0, -18, 16);
      hg.addColorStop(0, '#f1f5f9');
      hg.addColorStop(1, '#94a3b8');
      g.fillStyle = hg;
      g.beginPath();
      g.arc(0, -18, 13, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // Plume
      g.fillStyle = '#ef4444';
      g.beginPath();
      g.moveTo(-2, -30);
      g.quadraticCurveTo(-14 + sway, -42, -16 + sway, -26);
      g.quadraticCurveTo(-8, -32, -2, -30);
      g.fill();
      // Visor + eyes
      g.fillStyle = '#0b1220';
      fx.roundRectPath(g, -3, -22, 15, 7, 3);
      g.fill();
      g.fillStyle = '#fde047';
      g.fillRect(2, -20, 3, 3);
      g.fillRect(7, -20, 3, 3);
      // Shield
      g.fillStyle = '#2563eb';
      g.beginPath();
      g.moveTo(8, -2);
      g.lineTo(20, -2);
      g.lineTo(20, 8);
      g.quadraticCurveTo(14, 18, 14, 18);
      g.quadraticCurveTo(8, 12, 8, 8);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#facc15';
      g.fillRect(13, 0, 2, 12);
      g.fillRect(9.5, 4, 9, 2);
      g.restore();
    }

    function updatePresentation(dt) {
      sceneTime += dt;
      sparks.update(dt);
      if (bumpT < 10) bumpT += dt;
      if (chestOpened) chestOpenAge += dt;
      else chestOpenAge = 0;
      for (let i = coins.length - 1; i >= 0; i--) {
        const p = coins[i];
        p.vy += 420 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) coins.splice(i, 1);
      }
    }

    function render() {
      hidpi.apply();
      // Dungeon backdrop
      const bg = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
      bg.addColorStop(0, '#1c1917');
      bg.addColorStop(1, '#0a0806');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      const { cell, startX, startY } = getBoardGeometry();
      g.save();
      fx.roundRectPath(g, startX - 10, startY - 10, cols * cell + 20, rows * cell + 20, 14);
      g.fillStyle = 'rgba(0, 0, 0, 0.5)';
      g.fill();
      g.restore();

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * cell;
          const y = startY + r * cell;
          if (!walls[r][c]) {
            drawFloor(x, y, cell, r, c);
            if (switches[r][c]) {
              const active = !!findBoxAt(r, c);
              drawRuneSwitch(x + cell / 2, y + cell / 2, cell, active);
            }
          }
        }
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (walls[r][c]) drawWall(startX + c * cell, startY + r * cell, cell, r, c);
        }
      }
      // Torches on the top wall
      for (let c = 2; c < cols - 1; c += 3) {
        drawTorch(startX + c * cell + cell / 2, startY + cell * 0.55, cell, c);
      }

      drawChest(startX + chestPos.c * cell + cell / 2, startY + chestPos.r * cell + cell / 2, cell);

      boxes.forEach((b) => {
        const vr = b.visR != null ? b.visR : b.r;
        const vc = b.visC != null ? b.visC : b.c;
        drawCrystal(startX + vc * cell + cell / 2, startY + vr * cell + cell / 2, cell, switches[b.r][b.c]);
      });

      {
        const vr = player.visR != null ? player.visR : player.r;
        const vc = player.visC != null ? player.visC : player.c;
        drawKnight(startX + vc * cell + cell / 2, startY + vr * cell + cell / 2, cell);
      }

      sparks.draw(g);

      // Gold coins celebration
      coins.forEach((p) => {
        const spin = Math.abs(Math.cos(sceneTime * 10 + p.vx));
        g.fillStyle = '#facc15';
        g.strokeStyle = '#a16207';
        g.lineWidth = 1.6;
        g.beginPath();
        g.ellipse(p.x, p.y, 7 * Math.max(0.2, spin), 7, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      });

      // HUD strip
      const activeCount = boxes.filter((b) => switches[b.r][b.c]).length;
      fx.outlinedText(g, `🏛 MÀN ${levelIdx + 1}/${LEVELS[difficulty].length}`, 20, 22, { size: 15, color: '#fde68a', align: 'left' });
      fx.outlinedText(g, `💎 ${activeCount}/${boxes.length}  •  👣 ${movesCount}`, W - 20, 22, {
        size: 15,
        color: activeCount === boxes.length ? '#86efac' : '#e2e8f0',
        align: 'right'
      });
      g.fillStyle = 'rgba(226, 232, 240, 0.55)';
      g.font = fx.font(12, 600);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Đẩy đá quý lên các ô phép thuật để mở rương • Z: đi lại', W / 2, H - 16);

      fx.vignette(g, W, H, 0.35);

      if (chestOpened) {
        const last = levelIdx === LEVELS[difficulty].length - 1;
        fx.drawBanner(g, W, H, '🎉 KHO BÁU ĐÃ MỞ!', {
          t: chestOpenAge,
          duration: 1.6,
          accent: '#facc15',
          sub: last ? `+${lastGained} điểm • Hoàn thành cả ${LEVELS[difficulty].length} màn!` : `+${lastGained} điểm • Sang màn ${levelIdx + 2}`,
          size: 36
        });
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
      updatePresentation(dt);
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
