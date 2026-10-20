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
    let victoryParticles = []; // { x, y, vx, vy, color, life }
    let endBannerText = '';
    let endBannerSub = '';

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
      victoryParticles = [];
      endBannerText = '';
      endBannerSub = '';
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

    function drawBoard() {
      const { size, padding, cellSize } = getCellMetrics();
      g2d.clearRect(0, 0, size, size);

      // Rich tactical obsidian board background
      const bgGrad = g2d.createRadialGradient(
        size * 0.5,
        size * 0.45,
        size * 0.08,
        size * 0.5,
        size * 0.5,
        size * 0.72
      );
      bgGrad.addColorStop(0, '#13203d');
      bgGrad.addColorStop(0.65, '#0b1326');
      bgGrad.addColorStop(1, '#060b17');
      g2d.fillStyle = bgGrad;
      g2d.fillRect(0, 0, size, size);

      // Outer beveled board frame
      g2d.strokeStyle = 'rgba(56, 189, 248, 0.38)';
      g2d.lineWidth = 2;
      g2d.strokeRect(padding - 1, padding - 1, size - padding * 2 + 2, size - padding * 2 + 2);

      // Subtle checkerboard cell depth
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r + c) % 2 === 1) {
            g2d.fillStyle = 'rgba(255, 255, 255, 0.018)';
            g2d.fillRect(padding + c * cellSize, padding + r * cellSize, cellSize, cellSize);
          }
        }
      }

      // Coordinate labels (A-O top, 1-15 left)
      g2d.fillStyle = 'rgba(148, 163, 184, 0.58)';
      g2d.font = `700 ${Math.max(9, Math.floor(cellSize * 0.31))}px sans-serif`;
      g2d.textAlign = 'center';
      g2d.textBaseline = 'middle';
      for (let i = 0; i < BOARD_SIZE; i++) {
        const colChar = String.fromCharCode(65 + i);
        g2d.fillText(colChar, padding + (i + 0.5) * cellSize, padding * 0.5);
        g2d.fillText(String(i + 1), padding * 0.48, padding + (i + 0.5) * cellSize);
      }

      // Grid lines
      g2d.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      g2d.lineWidth = 1;
      for (let i = 0; i <= BOARD_SIZE; i++) {
        const pos = padding + i * cellSize;
        g2d.beginPath();
        g2d.moveTo(padding, pos);
        g2d.lineTo(size - padding, pos);
        g2d.stroke();

        g2d.beginPath();
        g2d.moveTo(pos, padding);
        g2d.lineTo(pos, size - padding);
        g2d.stroke();
      }

      // Star points (center & tactical intersections)
      const starCoords = [3, 7, 11];
      g2d.fillStyle = 'rgba(56, 189, 248, 0.55)';
      starCoords.forEach((r) => {
        starCoords.forEach((c) => {
          const cx = padding + (c + 0.5) * cellSize;
          const cy = padding + (r + 0.5) * cellSize;
          g2d.beginPath();
          g2d.arc(cx, cy, 2.8, 0, Math.PI * 2);
          g2d.fill();
        });
      });

      // Hover cell preview with ghost token
      if (
        hoverCell &&
        !isGameOver &&
        board[hoverCell.r][hoverCell.c] === EMPTY &&
        (gameMode === 'pvp' || currentTurn === PLAYER_X)
      ) {
        const hx = padding + hoverCell.c * cellSize;
        const hy = padding + hoverCell.r * cellSize;
        const cx = hx + cellSize * 0.5;
        const cy = hy + cellSize * 0.5;
        const r = cellSize * 0.28;

        g2d.fillStyle =
          currentTurn === PLAYER_X ? 'rgba(56, 189, 248, 0.16)' : 'rgba(244, 63, 94, 0.16)';
        g2d.fillRect(hx + 1, hy + 1, cellSize - 2, cellSize - 2);

        g2d.save();
        g2d.globalAlpha = 0.42;
        g2d.strokeStyle = currentTurn === PLAYER_X ? '#38bdf8' : '#f43f5e';
        g2d.lineWidth = Math.max(2, cellSize * 0.09);
        g2d.lineCap = 'round';
        if (currentTurn === PLAYER_X) {
          g2d.beginPath();
          g2d.moveTo(cx - r, cy - r);
          g2d.lineTo(cx + r, cy + r);
          g2d.moveTo(cx + r, cy - r);
          g2d.lineTo(cx - r, cy + r);
          g2d.stroke();
        } else {
          g2d.beginPath();
          g2d.arc(cx, cy, r, 0, Math.PI * 2);
          g2d.stroke();
        }
        g2d.restore();
      }

      // Highlight last move with golden tactical brackets
      if (moveHistory.length > 0) {
        const last = moveHistory[moveHistory.length - 1];
        const lx = padding + last.c * cellSize;
        const ly = padding + last.r * cellSize;
        g2d.fillStyle = 'rgba(251, 191, 36, 0.2)';
        g2d.fillRect(lx + 1, ly + 1, cellSize - 2, cellSize - 2);
        g2d.strokeStyle = '#fbbf24';
        g2d.lineWidth = 1.8;
        g2d.strokeRect(lx + 1.5, ly + 1.5, cellSize - 3, cellSize - 3);
      }

      // Placement ripples
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

      // Draw X and O pieces with specular core
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const val = board[r][c];
          if (val === EMPTY) continue;
          const cx = padding + (c + 0.5) * cellSize;
          const cy = padding + (r + 0.5) * cellSize;
          const radius = cellSize * 0.34;

          if (val === PLAYER_X) {
            g2d.save();
            g2d.strokeStyle = '#0ea5e9';
            g2d.shadowColor = '#38bdf8';
            g2d.shadowBlur = 10;
            g2d.lineWidth = Math.max(3, cellSize * 0.13);
            g2d.lineCap = 'round';
            g2d.beginPath();
            g2d.moveTo(cx - radius, cy - radius);
            g2d.lineTo(cx + radius, cy + radius);
            g2d.moveTo(cx + radius, cy - radius);
            g2d.lineTo(cx - radius, cy + radius);
            g2d.stroke();

            // Bright core
            g2d.strokeStyle = '#e0f2fe';
            g2d.shadowBlur = 0;
            g2d.lineWidth = Math.max(1.3, cellSize * 0.045);
            g2d.stroke();
            g2d.restore();
          } else if (val === PLAYER_O) {
            g2d.save();
            g2d.strokeStyle = '#f43f5e';
            g2d.shadowColor = '#f43f5e';
            g2d.shadowBlur = 10;
            g2d.lineWidth = Math.max(3, cellSize * 0.13);
            g2d.beginPath();
            g2d.arc(cx, cy, radius, 0, Math.PI * 2);
            g2d.stroke();

            // Bright core
            g2d.strokeStyle = '#ffe4e6';
            g2d.shadowBlur = 0;
            g2d.lineWidth = Math.max(1.3, cellSize * 0.045);
            g2d.stroke();
            g2d.restore();
          }
        }
      }

      // Draw Winning Line
      if (winLine) {
        const x1 = padding + (winLine.c1 + 0.5) * cellSize;
        const y1 = padding + (winLine.r1 + 0.5) * cellSize;
        const x2 = padding + (winLine.c2 + 0.5) * cellSize;
        const y2 = padding + (winLine.r2 + 0.5) * cellSize;

        g2d.save();
        g2d.strokeStyle = '#fbbf24';
        g2d.shadowColor = '#fbbf24';
        g2d.shadowBlur = 16 + Math.sin(pulsePhase) * 6;
        g2d.lineWidth = Math.max(4.5, cellSize * 0.16);
        g2d.lineCap = 'round';
        g2d.beginPath();
        g2d.moveTo(x1, y1);
        g2d.lineTo(x2, y2);
        g2d.stroke();

        g2d.strokeStyle = '#ffffff';
        g2d.lineWidth = 2;
        g2d.stroke();
        g2d.restore();
      }

      // Victory particles
      victoryParticles.forEach((p) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, p.life);
        g2d.fillStyle = p.color;
        g2d.beginPath();
        g2d.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        g2d.fill();
        g2d.restore();
      });

      // End-of-match banner
      if (isGameOver && endBannerText) {
        g2d.save();
        g2d.fillStyle = 'rgba(9, 14, 28, 0.86)';
        g2d.strokeStyle = '#fbbf24';
        g2d.lineWidth = 2.5;
        const bw = Math.min(size - 32, 370);
        const bh = 78;
        const bx = (size - bw) / 2;
        const by = size - bh - 16;
        g2d.beginPath();
        g2d.roundRect(bx, by, bw, bh, 14);
        g2d.fill();
        g2d.stroke();

        g2d.fillStyle = '#fbbf24';
        g2d.font = '900 18px sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText(endBannerText, size / 2, by + 28);

        g2d.fillStyle = '#e2e8f0';
        g2d.font = '700 13px sans-serif';
        g2d.fillText(endBannerSub || 'Bấm vào bàn cờ để chơi ván tiếp theo!', size / 2, by + 54);
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
      const { size } = getCellMetrics();
      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        victoryParticles.push({
          x: size / 2,
          y: size / 2,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: i % 2 === 0 ? '#fbbf24' : '#38bdf8',
          life: 1.0
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

    function animateLoop() {
      let needsRedraw = false;
      if (winLine) {
        pulsePhase += 0.12;
        needsRedraw = true;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].radius += 0.045;
        ripples[i].alpha -= 0.045;
        needsRedraw = true;
        if (ripples[i].alpha <= 0) ripples.splice(i, 1);
      }
      for (let i = victoryParticles.length - 1; i >= 0; i--) {
        const p = victoryParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        needsRedraw = true;
        if (p.life <= 0) victoryParticles.splice(i, 1);
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
