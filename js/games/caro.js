(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const BOARD_SIZE = 15;
  const EMPTY = 0;
  const PLAYER_X = 1;
  const PLAYER_O = 2;

  const DIFFICULTY_CONFIG = {
    easy: { label: 'Dễ', baseScore: 600, defenseWeight: 0.75, randomness: 0.25 },
    medium: { label: 'Vừa', baseScore: 1000, defenseWeight: 1.05, randomness: 0.06 },
    hard: { label: 'Khó', baseScore: 1500, defenseWeight: 1.25, randomness: 0.0 }
  };

  function createCaroGame(container, ctx) {
    let board = [];
    let moveHistory = [];
    let currentTurn = PLAYER_X;
    let gameMode = 'ai'; // 'ai' | 'pvp'
    let difficulty = 'medium';
    let isGameOver = false;
    let winLine = null; // { r1, c1, r2, c2 }
    let hoverCell = null;
    let winStreak = 0;
    let currentScore = 0;
    let aiTimeout = null;
    let animFrame = null;
    let pulsePhase = 0;
    let ripples = []; // { r, c, radius, maxRadius, color, alpha }
    let endBannerText = '';
    let endBannerSub = '';

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(260);
    const placeTimes = new Map(); // cellIndex -> placement time (s)
    let lastPlaceAt = -10;
    let winLineAt = -10;
    let endAt = -10;
    let endTone = '';

    // UI Structure
    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <button type="button" class="pill-btn active" data-mode="ai">🤖 Đấu với Máy (Tính điểm Top 3)</button>
          <button type="button" class="pill-btn" data-mode="pvp">👥 2 Người chung máy</button>
        </div>
        <div class="toolbar-group" id="caroDiffGroup">
          <span style="font-size:0.78rem;color:#94a3b8;">Độ khó:</span>
          <button type="button" class="pill-btn" data-diff="easy">Dễ</button>
          <button type="button" class="pill-btn active" data-diff="medium">Vừa</button>
          <button type="button" class="pill-btn" data-diff="hard">Khó</button>
        </div>
        <div class="toolbar-group">
          <span id="caroTurnStatus" style="font-size:0.85rem;font-weight:700;color:#38bdf8;">Lượt của bạn (X)</span>
          <button type="button" class="pill-btn" id="caroUndoBtn">↶ Đi lại</button>
        </div>
      </div>
      <div class="canvas-frame">
        <canvas id="caroCanvas" class="game-canvas"></canvas>
      </div>
    `;
    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#caroCanvas');
    const g2d = canvas.getContext('2d');
    const turnStatusEl = shell.querySelector('#caroTurnStatus');
    const diffGroupEl = shell.querySelector('#caroDiffGroup');
    const undoBtn = shell.querySelector('#caroUndoBtn');

    function initBoard() {
      if (aiTimeout) {
        clearTimeout(aiTimeout);
        aiTimeout = null;
      }
      board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
      moveHistory = [];
      currentTurn = PLAYER_X;
      isGameOver = false;
      winLine = null;
      hoverCell = null;
      ripples = [];
      endBannerText = '';
      endBannerSub = '';
      endTone = '';
      placeTimes.clear();
      sparks.clear();
      updateStatusText();
      resizeCanvas();
    }

    function resizeCanvas() {
      const maxDim = Math.min(window.innerWidth - 36, window.innerHeight - 230, 560);
      const size = Math.max(300, Math.floor(maxDim));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBoard();
    }

    function updateStatusText(customText, color) {
      if (customText) {
        turnStatusEl.textContent = customText;
        turnStatusEl.style.color = color || '#fbbf24';
        return;
      }
      if (gameMode === 'ai') {
        if (currentTurn === PLAYER_X) {
          turnStatusEl.textContent = `Lượt của ${ctx.getPlayerName()} (X) • Chuỗi thắng: ${winStreak}`;
          turnStatusEl.style.color = '#38bdf8';
        } else {
          turnStatusEl.textContent = 'Máy đang suy nghĩ (O)...';
          turnStatusEl.style.color = '#f43f5e';
        }
      } else {
        turnStatusEl.textContent =
          currentTurn === PLAYER_X ? 'Lượt Người chơi 1 (X)' : 'Lượt Người chơi 2 (O)';
        turnStatusEl.style.color = currentTurn === PLAYER_X ? '#38bdf8' : '#f43f5e';
      }
    }

    function getCellMetrics() {
      const size = parseFloat(canvas.style.width) || 480;
      const padding = 28;
      const gridSpan = size - padding * 2;
      const cellSize = gridSpan / BOARD_SIZE;
      return { size, padding, cellSize };
    }

    function drawPiece(val, cx, cy, radius, scale) {
      const rr = radius * scale;
      const lw = Math.max(3, radius * 0.38);
      g2d.save();
      g2d.lineCap = 'round';
      g2d.lineJoin = 'round';
      const path = () => {
        g2d.beginPath();
        if (val === PLAYER_X) {
          g2d.moveTo(cx - rr, cy - rr);
          g2d.lineTo(cx + rr, cy + rr);
          g2d.moveTo(cx + rr, cy - rr);
          g2d.lineTo(cx - rr, cy + rr);
        } else {
          g2d.arc(cx, cy, rr, 0, Math.PI * 2);
        }
      };
      const base = val === PLAYER_X ? '#38bdf8' : '#f43f5e';
      const deep = val === PLAYER_X ? '#0369a1' : '#9f1239';
      const core = val === PLAYER_X ? '#e0f2fe' : '#ffe4e6';
      // Soft halo (cheap wide translucent stroke instead of shadowBlur)
      path();
      g2d.strokeStyle = fx.rgba(base, 0.18);
      g2d.lineWidth = lw * 2.4;
      g2d.stroke();
      // Body with a slight 3D offset
      g2d.translate(0, 1.2);
      path();
      g2d.strokeStyle = deep;
      g2d.lineWidth = lw;
      g2d.stroke();
      g2d.translate(0, -1.2);
      path();
      g2d.strokeStyle = base;
      g2d.lineWidth = lw * 0.86;
      g2d.stroke();
      path();
      g2d.strokeStyle = core;
      g2d.lineWidth = Math.max(1.2, lw * 0.3);
      g2d.stroke();
      g2d.restore();
    }

    function drawBoard() {
      const { size, padding, cellSize } = getCellMetrics();
      const now = performance.now() / 1000;
      g2d.clearRect(0, 0, size, size);

      // Obsidian tactical board
      const bgGrad = g2d.createRadialGradient(size * 0.5, size * 0.42, size * 0.08, size * 0.5, size * 0.5, size * 0.75);
      bgGrad.addColorStop(0, '#15244a');
      bgGrad.addColorStop(0.65, '#0b1326');
      bgGrad.addColorStop(1, '#050913');
      g2d.fillStyle = bgGrad;
      g2d.fillRect(0, 0, size, size);

      // Inset playing surface
      fx.roundRectPath(g2d, padding - 6, padding - 6, size - padding * 2 + 12, size - padding * 2 + 12, 10);
      g2d.fillStyle = 'rgba(2, 6, 23, 0.45)';
      g2d.fill();
      const frame = g2d.createLinearGradient(0, padding, size, size - padding);
      frame.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
      frame.addColorStop(1, 'rgba(244, 63, 94, 0.45)');
      g2d.strokeStyle = frame;
      g2d.lineWidth = 2;
      g2d.stroke();

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r + c) % 2 === 1) {
            g2d.fillStyle = 'rgba(255, 255, 255, 0.022)';
            g2d.fillRect(padding + c * cellSize, padding + r * cellSize, cellSize, cellSize);
          }
        }
      }

      g2d.fillStyle = 'rgba(148, 163, 184, 0.6)';
      g2d.font = fx.font(Math.max(9, Math.floor(cellSize * 0.31)), 700);
      g2d.textAlign = 'center';
      g2d.textBaseline = 'middle';
      for (let i = 0; i < BOARD_SIZE; i++) {
        g2d.fillText(String.fromCharCode(65 + i), padding + (i + 0.5) * cellSize, padding * 0.42);
        g2d.fillText(String(i + 1), padding * 0.42, padding + (i + 0.5) * cellSize);
      }

      g2d.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      g2d.lineWidth = 1;
      g2d.beginPath();
      for (let i = 0; i <= BOARD_SIZE; i++) {
        const pos = padding + i * cellSize;
        g2d.moveTo(padding, pos);
        g2d.lineTo(size - padding, pos);
        g2d.moveTo(pos, padding);
        g2d.lineTo(pos, size - padding);
      }
      g2d.stroke();

      const starCoords = [3, 7, 11];
      g2d.fillStyle = 'rgba(56, 189, 248, 0.6)';
      starCoords.forEach((r) => {
        starCoords.forEach((c) => {
          g2d.beginPath();
          g2d.arc(padding + (c + 0.5) * cellSize, padding + (r + 0.5) * cellSize, 2.6, 0, Math.PI * 2);
          g2d.fill();
        });
      });

      // Hover ghost
      if (
        hoverCell &&
        !isGameOver &&
        board[hoverCell.r][hoverCell.c] === EMPTY &&
        (gameMode === 'pvp' || currentTurn === PLAYER_X)
      ) {
        const hx = padding + hoverCell.c * cellSize;
        const hy = padding + hoverCell.r * cellSize;
        g2d.fillStyle = currentTurn === PLAYER_X ? 'rgba(56, 189, 248, 0.14)' : 'rgba(244, 63, 94, 0.14)';
        fx.roundRectPath(g2d, hx + 1.5, hy + 1.5, cellSize - 3, cellSize - 3, 4);
        g2d.fill();
        g2d.save();
        g2d.globalAlpha = 0.38;
        drawPiece(currentTurn, hx + cellSize / 2, hy + cellSize / 2, cellSize * 0.28, 1);
        g2d.restore();
      }

      // Last move marker
      if (moveHistory.length > 0) {
        const last = moveHistory[moveHistory.length - 1];
        const lx = padding + last.c * cellSize;
        const ly = padding + last.r * cellSize;
        g2d.fillStyle = 'rgba(251, 191, 36, 0.16)';
        fx.roundRectPath(g2d, lx + 1, ly + 1, cellSize - 2, cellSize - 2, 4);
        g2d.fill();
        g2d.strokeStyle = '#fbbf24';
        g2d.lineWidth = 1.6;
        const k = cellSize * 0.28;
        g2d.beginPath();
        [
          [lx + 2, ly + 2, 1, 1],
          [lx + cellSize - 2, ly + 2, -1, 1],
          [lx + 2, ly + cellSize - 2, 1, -1],
          [lx + cellSize - 2, ly + cellSize - 2, -1, -1]
        ].forEach(([bx, by, sx, sy]) => {
          g2d.moveTo(bx + sx * k, by);
          g2d.lineTo(bx, by);
          g2d.lineTo(bx, by + sy * k);
        });
        g2d.stroke();
      }

      ripples.forEach((rp) => {
        const rx = padding + (rp.c + 0.5) * cellSize;
        const ry = padding + (rp.r + 0.5) * cellSize;
        g2d.save();
        g2d.globalAlpha = Math.max(0, rp.alpha);
        g2d.strokeStyle = rp.color;
        g2d.lineWidth = 2.2;
        g2d.beginPath();
        g2d.arc(rx, ry, rp.radius * cellSize, 0, Math.PI * 2);
        g2d.stroke();
        g2d.restore();
      });

      // Pieces (pop in with a little overshoot)
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const val = board[r][c];
          if (val === EMPTY) continue;
          const placedAt = placeTimes.get(r * BOARD_SIZE + c);
          let scale = 1;
          if (placedAt != null && !reduced) {
            const t = Math.min(1, (now - placedAt) / 0.32);
            scale = t >= 1 ? 1 : 0.3 + fx.ease.outBack(t) * 0.7;
          }
          drawPiece(val, padding + (c + 0.5) * cellSize, padding + (r + 0.5) * cellSize, cellSize * 0.32, scale);
        }
      }

      // Winning line: draws itself in, then shimmers
      if (winLine) {
        const x1 = padding + (winLine.c1 + 0.5) * cellSize;
        const y1 = padding + (winLine.r1 + 0.5) * cellSize;
        const x2 = padding + (winLine.c2 + 0.5) * cellSize;
        const y2 = padding + (winLine.r2 + 0.5) * cellSize;
        const prog = reduced ? 1 : Math.min(1, (now - winLineAt) / 0.45);
        const ex = x1 + (x2 - x1) * prog;
        const ey = y1 + (y2 - y1) * prog;
        g2d.save();
        g2d.lineCap = 'round';
        [
          [Math.max(14, cellSize * 0.5), 'rgba(251, 191, 36, 0.18)'],
          [Math.max(6, cellSize * 0.2), '#fbbf24'],
          [2, '#ffffff']
        ].forEach(([lw, col]) => {
          g2d.strokeStyle = col;
          g2d.lineWidth = lw;
          g2d.beginPath();
          g2d.moveTo(x1, y1);
          g2d.lineTo(ex, ey);
          g2d.stroke();
        });
        if (prog >= 1) {
          const tt = ((now - winLineAt) * 0.8) % 1;
          fx.glow(g2d, x1 + (x2 - x1) * tt, y1 + (y2 - y1) * tt, cellSize * 0.9, '#fde68a', 0.7);
        }
        g2d.restore();
      }

      sparks.draw(g2d);

      // End-of-match card at the bottom (keeps the final board visible)
      if (isGameOver && endBannerText) {
        const appear = reduced ? 1 : Math.min(1, (now - endAt) / 0.35);
        const accent = endTone === 'win' ? '#10b981' : endTone === 'lose' ? '#f43f5e' : endTone === 'draw' ? '#94a3b8' : '#fbbf24';
        g2d.save();
        g2d.globalAlpha = appear;
        const bw = Math.min(size - 32, 390);
        const bh = 80;
        const bx = (size - bw) / 2;
        const by = size - bh - 16 + (1 - fx.ease.outCubic(appear)) * 24;
        fx.roundRectPath(g2d, bx, by, bw, bh, 16);
        g2d.fillStyle = 'rgba(9, 14, 28, 0.9)';
        g2d.fill();
        g2d.strokeStyle = accent;
        g2d.lineWidth = 2.5;
        g2d.stroke();
        fx.roundRectPath(g2d, bx, by, bw, 5, 3);
        g2d.fillStyle = accent;
        g2d.fill();
        const ts = fx.fitFontSize(g2d, endBannerText, bw - 28, 19, 12, 900);
        fx.outlinedText(g2d, endBannerText, size / 2, by + 30, { size: ts, color: endTone === 'lose' ? '#fda4af' : '#fde68a' });
        g2d.fillStyle = '#e2e8f0';
        const ss = fx.fitFontSize(g2d, endBannerSub || 'Bấm vào bàn cờ để chơi ván tiếp theo!', bw - 28, 13, 10, 700);
        g2d.font = fx.font(ss, 700);
        g2d.textAlign = 'center';
        g2d.textBaseline = 'middle';
        g2d.fillText(endBannerSub || 'Bấm vào bàn cờ để chơi ván tiếp theo!', size / 2, by + 56);
        g2d.restore();
      }
    }

    function checkWin(r, c, player) {
      const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1]
      ];

      for (const [dr, dc] of dirs) {
        let count = 1;
        let r1 = r;
        let c1 = c;
        let r2 = r;
        let c2 = c;

        let nr = r - dr;
        let nc = c - dc;
        while (
          nr >= 0 &&
          nr < BOARD_SIZE &&
          nc >= 0 &&
          nc < BOARD_SIZE &&
          board[nr][nc] === player
        ) {
          count++;
          r1 = nr;
          c1 = nc;
          nr -= dr;
          nc -= dc;
        }

        nr = r + dr;
        nc = c + dc;
        while (
          nr >= 0 &&
          nr < BOARD_SIZE &&
          nc >= 0 &&
          nc < BOARD_SIZE &&
          board[nr][nc] === player
        ) {
          count++;
          r2 = nr;
          c2 = nc;
          nr += dr;
          nc += dc;
        }

        if (count >= 5) {
          return { r1, c1, r2, c2 };
        }
      }
      return null;
    }

    function evaluateLineScore(count, openEnds) {
      if (count >= 5) return 1000000;
      if (openEnds === 0) return 0;
      if (count === 4) return openEnds === 2 ? 120000 : 18000;
      if (count === 3) return openEnds === 2 ? 9000 : 800;
      if (count === 2) return openEnds === 2 ? 650 : 90;
      if (count === 1) return openEnds === 2 ? 40 : 8;
      return 0;
    }

    function evaluateCellForPlayer(r, c, player) {
      const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1]
      ];
      let total = 0;

      for (const [dr, dc] of dirs) {
        let count = 1;
        let openEnds = 0;

        let nr = r - dr;
        let nc = c - dc;
        while (
          nr >= 0 &&
          nr < BOARD_SIZE &&
          nc >= 0 &&
          nc < BOARD_SIZE &&
          board[nr][nc] === player
        ) {
          count++;
          nr -= dr;
          nc -= dc;
        }
        if (
          nr >= 0 &&
          nr < BOARD_SIZE &&
          nc >= 0 &&
          nc < BOARD_SIZE &&
          board[nr][nc] === EMPTY
        ) {
          openEnds++;
        }

        nr = r + dr;
        nc = c + dc;
        while (
          nr >= 0 &&
          nr < BOARD_SIZE &&
          nc >= 0 &&
          nc < BOARD_SIZE &&
          board[nr][nc] === player
        ) {
          count++;
          nr += dr;
          nc += dc;
        }
        if (
          nr >= 0 &&
          nr < BOARD_SIZE &&
          nc >= 0 &&
          nc < BOARD_SIZE &&
          board[nr][nc] === EMPTY
        ) {
          openEnds++;
        }

        total += evaluateLineScore(count, openEnds);
      }

      // Slight preference for center proximity
      const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
      total += Math.max(0, 14 - centerDist);
      return total;
    }

    function pickAiMove() {
      const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
      let bestScore = -1;
      let candidates = [];

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c] !== EMPTY) continue;

          // Only consider cells near existing moves (unless board is empty)
          let hasNeighbor = moveHistory.length === 0;
          for (let dr = -2; dr <= 2 && !hasNeighbor; dr++) {
            for (let dc = -2; dc <= 2 && !hasNeighbor; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (
                nr >= 0 &&
                nr < BOARD_SIZE &&
                nc >= 0 &&
                nc < BOARD_SIZE &&
                board[nr][nc] !== EMPTY
              ) {
                hasNeighbor = true;
              }
            }
          }
          if (!hasNeighbor) continue;

          const attackScore = evaluateCellForPlayer(r, c, PLAYER_O);
          const defenseScore = evaluateCellForPlayer(r, c, PLAYER_X);

          // Immediate win or block priority
          let combined = attackScore + defenseScore * cfg.defenseWeight;
          if (attackScore >= 1000000) combined = 5000000;
          else if (defenseScore >= 1000000) combined = 4000000;

          if (cfg.randomness > 0) {
            combined *= 1 + (Math.random() * 2 - 1) * cfg.randomness;
          }

          if (combined > bestScore) {
            bestScore = combined;
            candidates = [{ r, c }];
          } else if (Math.abs(combined - bestScore) < 1e-4) {
            candidates.push({ r, c });
          }
        }
      }

      if (candidates.length === 0) {
        return { r: 7, c: 7 };
      }
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function placeMove(r, c) {
      if (isGameOver || board[r][c] !== EMPTY) return;

      board[r][c] = currentTurn;
      moveHistory.push({ r, c, player: currentTurn });
      lastPlaceAt = performance.now() / 1000;
      placeTimes.set(r * BOARD_SIZE + c, lastPlaceAt);
      {
        const m = getCellMetrics();
        sparks.burst(m.padding + (c + 0.5) * m.cellSize, m.padding + (r + 0.5) * m.cellSize, {
          count: 6,
          speed: [30, 90],
          life: [0.25, 0.45],
          size: [1.5, 3],
          colors: [currentTurn === PLAYER_X ? '#7dd3fc' : '#fda4af', '#ffffff']
        });
      }
      ripples.push({
        r,
        c,
        radius: 0.25,
        color: currentTurn === PLAYER_X ? '#38bdf8' : '#f43f5e',
        alpha: 0.9
      });
      ArcadeHub.sound.tile();

      const winningCoords = checkWin(r, c, currentTurn);
      if (winningCoords) {
        isGameOver = true;
        winLine = winningCoords;
        handleMatchEnd(currentTurn);
        drawBoard();
        return;
      }

      if (moveHistory.length >= BOARD_SIZE * BOARD_SIZE) {
        isGameOver = true;
        updateStatusText('Hòa cờ! Bàn cờ đã kín.', '#cbd5e1');
        endBannerText = '🤝 HÒA CỜ!';
        endBannerSub = 'Bàn cờ đã kín • Bấm vào bàn cờ để chơi ván mới';
        endTone = 'draw';
        endAt = performance.now() / 1000;
        drawBoard();
        return;
      }

      currentTurn = currentTurn === PLAYER_X ? PLAYER_O : PLAYER_X;
      updateStatusText();
      drawBoard();

      if (gameMode === 'ai' && currentTurn === PLAYER_O && !isGameOver) {
        aiTimeout = setTimeout(() => {
          const aiMove = pickAiMove();
          placeMove(aiMove.r, aiMove.c);
        }, 260);
      }
    }

    function handleMatchEnd(winner) {
      const { size, padding, cellSize } = getCellMetrics();
      const nowS = performance.now() / 1000;
      winLineAt = nowS;
      endAt = nowS;
      endTone = gameMode === 'pvp' ? 'pvp' : winner === PLAYER_X ? 'win' : 'lose';
      const lineColor = winner === PLAYER_X ? '#38bdf8' : '#f43f5e';
      if (winLine) {
        // Sparkles on every stone of the winning five
        const steps = Math.max(Math.abs(winLine.r2 - winLine.r1), Math.abs(winLine.c2 - winLine.c1));
        const sr = Math.sign(winLine.r2 - winLine.r1);
        const sc = Math.sign(winLine.c2 - winLine.c1);
        for (let k = 0; k <= steps; k++) {
          const px = padding + (winLine.c1 + sc * k + 0.5) * cellSize;
          const py = padding + (winLine.r1 + sr * k + 0.5) * cellSize;
          sparks.burst(px, py, { count: 8, kind: 'star', speed: [40, 140], life: [0.5, 0.9], size: [2.5, 5], colors: ['#fde68a', lineColor, '#ffffff'] });
        }
      }
      if (endTone !== 'lose') {
        sparks.burst(size / 2, size * 0.45, {
          count: 46,
          kind: 'confetti',
          speed: [120, 320],
          life: [0.9, 1.6],
          size: [4, 7],
          gravity: 300,
          drag: 1.2,
          colors: ['#fbbf24', '#38bdf8', '#f43f5e', '#10b981', '#ffffff']
        });
      }

      if (gameMode === 'pvp') {
        ArcadeHub.sound.win();
        const winnerLabel = winner === PLAYER_X ? 'Người chơi 1 (X)' : 'Người chơi 2 (O)';
        endBannerText = `🎉 ${winnerLabel} CHIẾN THẮNG!`;
        endBannerSub = 'Bấm vào bàn cờ để bắt đầu ván mới';
        updateStatusText(`🎉 ${winnerLabel} chiến thắng!`, '#fbbf24');
        return;
      }

      if (winner === PLAYER_X) {
        ArcadeHub.sound.win();
        winStreak += 1;
        const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
        const playerMovesCount = Math.ceil(moveHistory.length / 2);
        const speedBonus = Math.max(100, (45 - playerMovesCount) * 25);
        const streakBonus = (winStreak - 1) * 250;
        const matchPoints = cfg.baseScore + speedBonus + streakBonus;
        currentScore += matchPoints;

        endBannerText = `🏆 BẠN THẮNG! +${matchPoints} ĐIỂM`;
        endBannerSub = `Chuỗi thắng: ${winStreak} • Bấm vào bàn cờ để đấu tiếp!`;
        ctx.updateScore(currentScore);
        updateStatusText(
          `🏆 Bạn thắng! +${matchPoints} điểm (Tổng: ${currentScore})`,
          '#10b981'
        );
        ctx.submitHighScore(
          currentScore,
          `Độ khó ${cfg.label} • Chuỗi ${winStreak} thắng`
        );
      } else {
        ArcadeHub.sound.gameOver();
        winStreak = 0;
        endBannerText = '💥 MÁY (O) ĐÃ CHIẾN THẮNG!';
        endBannerSub = 'Bấm vào bàn cờ để phục thù ngay!';
        updateStatusText('💥 Máy (O) đã chiến thắng! Hãy bấm Chơi lại.', '#f43f5e');
      }
    }

    function getBoardCoordsFromEvent(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const { padding, cellSize } = getCellMetrics();

      const c = Math.floor((x - padding) / cellSize);
      const r = Math.floor((y - padding) / cellSize);
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        return { r, c };
      }
      return null;
    }

    canvas.addEventListener('mousemove', (evt) => {
      const cell = getBoardCoordsFromEvent(evt);
      if (
        (!hoverCell && cell) ||
        (hoverCell && (!cell || hoverCell.r !== cell.r || hoverCell.c !== cell.c))
      ) {
        hoverCell = cell;
        drawBoard();
      }
    });

    canvas.addEventListener('mouseleave', () => {
      hoverCell = null;
      drawBoard();
    });

    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      if (isGameOver) {
        initBoard();
        return;
      }
      if (gameMode === 'ai' && currentTurn !== PLAYER_X) return;
      const cell = getBoardCoordsFromEvent(evt);
      if (cell) {
        placeMove(cell.r, cell.c);
      }
    });

    // Mode & Difficulty Toolbar Events
    shell.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.getAttribute('data-mode');
        diffGroupEl.style.display = gameMode === 'ai' ? 'flex' : 'none';
        winStreak = 0;
        currentScore = 0;
        ctx.updateScore(0);
        initBoard();
      });
    });

    shell.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-diff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-diff');
        initBoard();
      });
    });

    undoBtn.addEventListener('click', () => {
      if (isGameOver || moveHistory.length === 0) return;
      if (gameMode === 'ai') {
        if (currentTurn !== PLAYER_X || moveHistory.length < 2) return;
        const m1 = moveHistory.pop();
        const m2 = moveHistory.pop();
        board[m1.r][m1.c] = EMPTY;
        board[m2.r][m2.c] = EMPTY;
      } else {
        const last = moveHistory.pop();
        board[last.r][last.c] = EMPTY;
        currentTurn = last.player;
      }
      ArcadeHub.sound.click();
      updateStatusText();
      drawBoard();
    });

    let lastTick = performance.now();
    function animateLoop() {
      const tick = performance.now();
      const dt = Math.min(0.05, (tick - lastTick) / 1000);
      lastTick = tick;
      const nowS = tick / 1000;
      let needsRedraw = false;
      if (winLine) {
        pulsePhase += 0.12;
        needsRedraw = true;
      }
      if (sparks.count > 0) {
        sparks.update(dt);
        needsRedraw = true;
      }
      if (nowS - lastPlaceAt < 0.4 || (isGameOver && nowS - endAt < 0.45)) {
        needsRedraw = true;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].radius += 0.045;
        ripples[i].alpha -= 0.045;
        needsRedraw = true;
        if (ripples[i].alpha <= 0) ripples.splice(i, 1);
      }
      if (needsRedraw) {
        drawBoard();
      }
      animFrame = requestAnimationFrame(animateLoop);
    }

    const onWindowResize = () => resizeCanvas();
    window.addEventListener('resize', onWindowResize);

    initBoard();
    animateLoop();

    return {
      restart() {
        winStreak = 0;
        currentScore = 0;
        ctx.updateScore(0);
        initBoard();
      },
      destroy() {
        if (aiTimeout) clearTimeout(aiTimeout);
        if (animFrame) cancelAnimationFrame(animFrame);
        window.removeEventListener('resize', onWindowResize);
      }
    };
  }

  ArcadeHub.games.caro = {
    init: createCaroGame
  };
})(window);
