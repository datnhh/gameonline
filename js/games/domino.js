(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  // Màu sắc chấm tròn (pips) theo phong cách Domino truyền thống cao cấp
  const PIP_COLORS = {
    1: '#dc2626',
    2: '#0f172a',
    3: '#0f172a',
    4: '#dc2626',
    5: '#0f172a',
    6: '#0f172a'
  };

  function createFullDeck() {
    const deck = [];
    let id = 1;
    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        deck.push({ id: id++, a, b });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    return deck;
  }

  function sumPips(hand) {
    return hand.reduce((acc, t) => acc + t.a + t.b, 0);
  }

  /**
   * Trả về tọa độ tương đối [-1..1] của các chấm trên 1 nửa quân cờ.
   */
  function getPipOffsets(val, isHorizontalHalf) {
    const d = 0.54;
    switch (val) {
      case 1:
        return [[0, 0]];
      case 2:
        return [
          [-d, -d],
          [d, d]
        ];
      case 3:
        return [
          [-d, -d],
          [0, 0],
          [d, d]
        ];
      case 4:
        return [
          [-d, -d],
          [d, -d],
          [-d, d],
          [d, d]
        ];
      case 5:
        return [
          [-d, -d],
          [d, -d],
          [0, 0],
          [-d, d],
          [d, d]
        ];
      case 6:
        return isHorizontalHalf
          ? [
              [-d, -d * 0.85],
              [0, -d * 0.85],
              [d, -d * 0.85],
              [-d, d * 0.85],
              [0, d * 0.85],
              [d, d * 0.85]
            ]
          : [
              [-d * 0.85, -d],
              [d * 0.85, -d],
              [-d * 0.85, 0],
              [d * 0.85, 0],
              [-d * 0.85, d],
              [d * 0.85, d]
            ];
      default:
        return [];
    }
  }

  /**
   * Tạo SVG hiển thị quân cờ Domino thẳng đứng với các chấm tròn thực tế cho khay bài người chơi
   */
  function createHandTileSvg(topVal, bottomVal) {
    const w = 48;
    const h = 94;
    const halfH = h / 2;
    const r = 3.9;

    function renderHalfCircles(val, centerY) {
      const offsets = getPipOffsets(val, false);
      const col = PIP_COLORS[val] || '#0f172a';
      const spanX = 24;
      const spanY = 24;
      return offsets
        .map(([ox, oy]) => {
          const cx = (w / 2 + ox * (spanX / 2)).toFixed(1);
          const cy = (centerY + oy * (spanY / 2)).toFixed(1);
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" />`;
        })
        .join('');
    }

    return `
      <svg class="domino-tile-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="6" fill="none" stroke="rgba(148,163,184,0.35)" stroke-width="1"/>
        ${renderHalfCircles(topVal, halfH / 2 + 1)}
        <line x1="6" y1="${halfH}" x2="${w - 6}" y2="${halfH}" stroke="#334155" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="${w / 2}" cy="${halfH}" r="2.3" fill="#d97706" stroke="#78350f" stroke-width="0.7"/>
        ${renderHalfCircles(bottomVal, halfH + halfH / 2 - 1)}
      </svg>
    `;
  }

  function createDominoGame(container, ctx) {
    let playerHand = [];
    let aiHand = [];
    let boneyard = [];

    // Cấu trúc bàn cờ thực tế: 1 quân gốc ở giữa + nhánh Trái + nhánh Phải
    let centerTile = null;
    let leftBranch = [];
    let rightBranch = [];

    let leftEnd = null;
    let rightEnd = null;
    let turn = 'player';
    let selectedTileId = null;
    let consecutivePasses = 0;
    let isRoundOver = false;
    let sessionScore = 0;
    let roundsWon = 0;
    let aiTimer = null;

    // Vùng tương tác trên mặt bàn Canvas
    let endHitZones = { left: null, right: null };
    let boneyardHitBoxes = []; // Array of { x, y, w, h, slotIndex }
    let hoveredBoneSlot = -1;
    let passButtonRect = null;

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(160);
    let lastPlaced = null; // { side: 'left'|'right'|'center', at, burst }
    let roundResult = null; // { winner, reason, gained }
    let roundOverAt = 0;
    const renderedIds = new Set();
    let animUntil = 0;
    let animRaf = null;
    let lastAnimTick = 0;
    let feltPattern = null;

    // Redraw continuously only while something is animating, then go idle again
    function kickAnim(duration) {
      animUntil = Math.max(animUntil, performance.now() / 1000 + duration);
      if (animRaf) return;
      lastAnimTick = performance.now();
      const step = () => {
        const t = performance.now();
        const dt = Math.min(0.05, (t - lastAnimTick) / 1000);
        lastAnimTick = t;
        sparks.update(dt);
        drawCanvas();
        if (t / 1000 < animUntil || sparks.count > 0) {
          animRaf = requestAnimationFrame(step);
        } else {
          animRaf = null;
        }
      };
      animRaf = requestAnimationFrame(step);
    }

    function getFeltPattern() {
      if (feltPattern) return feltPattern;
      const tile = document.createElement('canvas');
      tile.width = 96;
      tile.height = 96;
      const tg = tile.getContext('2d');
      for (let i = 0; i < 520; i++) {
        tg.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.07)';
        tg.fillRect(Math.random() * 96, Math.random() * 96, 1, 1);
      }
      feltPattern = g2d.createPattern(tile, 'repeat');
      return feltPattern;
    }

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span class="hud-chip">🤖 Bài Máy: <strong id="dominoAiCount">7</strong></span>
          <span class="hud-chip">🀫 Cờ Nọc bên phải: <strong id="dominoBoneCount">14</strong></span>
          <span class="hud-chip">🏆 Ván thắng: <strong id="dominoRoundsWon">0</strong></span>
        </div>
        <div class="toolbar-group">
          <span id="dominoStatusText" style="font-size:0.86rem;font-weight:700;color:#38bdf8;">
            Lượt của bạn: Chọn quân cờ để đánh hoặc bấm rút cờ Nọc bên phải bàn
          </span>
        </div>
        <div class="toolbar-group">
          <button type="button" class="pill-btn" id="dominoPlaceLeftBtn" hidden>⬅ Nối Đầu Trái</button>
          <button type="button" class="pill-btn" id="dominoPlaceRightBtn" hidden>Nối Đầu Phải ➡</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="dominoCanvas" class="game-canvas"></canvas>
      </div>

      <div class="domino-tray">
        <div class="domino-tray-header">
          <span>Quân cờ của bạn (Viền xanh lá = Đánh được ngay • Hết nước hãy bấm rút quân Nọc ở cột bên phải bàn)</span>
          <span id="dominoEndsInfo">Hai đầu bàn: ---</span>
        </div>
        <div id="dominoHandList" class="domino-hand-list"></div>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#dominoCanvas');
    const g2d = canvas.getContext('2d');
    const aiCountEl = shell.querySelector('#dominoAiCount');
    const boneCountEl = shell.querySelector('#dominoBoneCount');
    const roundsWonEl = shell.querySelector('#dominoRoundsWon');
    const statusTextEl = shell.querySelector('#dominoStatusText');
    const endsInfoEl = shell.querySelector('#dominoEndsInfo');
    const handListEl = shell.querySelector('#dominoHandList');
    const placeLeftBtn = shell.querySelector('#dominoPlaceLeftBtn');
    const placeRightBtn = shell.querySelector('#dominoPlaceRightBtn');

    function isBoardEmpty() {
      return centerTile === null;
    }

    function startNewRound() {
      if (aiTimer) clearTimeout(aiTimer);
      const deck = createFullDeck();
      playerHand = deck.slice(0, 7);
      aiHand = deck.slice(7, 14);
      boneyard = deck.slice(14);
      centerTile = null;
      leftBranch = [];
      rightBranch = [];
      leftEnd = null;
      rightEnd = null;
      turn = 'player';
      selectedTileId = null;
      consecutivePasses = 0;
      isRoundOver = false;
      hoveredBoneSlot = -1;
      lastPlaced = null;
      roundResult = null;
      renderedIds.clear();
      sparks.clear();

      placeLeftBtn.hidden = true;
      placeRightBtn.hidden = true;
      updateUI();
      resizeCanvas();
    }

    function canTilePlay(tile) {
      if (isBoardEmpty()) {
        return { left: true, right: true };
      }
      const matchLeft = tile.a === leftEnd || tile.b === leftEnd;
      const matchRight = tile.a === rightEnd || tile.b === rightEnd;
      return { left: matchLeft, right: matchRight };
    }

    function hasAnyPlayable(hand) {
      return hand.some((t) => {
        const res = canTilePlay(t);
        return res.left || res.right;
      });
    }

    function playTileOnBoard(tile, side) {
      lastPlaced = { side: isBoardEmpty() ? 'center' : side, at: performance.now() / 1000, burst: false };
      kickAnim(0.6);
      if (isBoardEmpty()) {
        centerTile = {
          leftVal: tile.a,
          rightVal: tile.b,
          isDouble: tile.a === tile.b
        };
        leftEnd = tile.a;
        rightEnd = tile.b;
        return;
      }

      if (side === 'left') {
        const innerVal = leftEnd;
        const outerVal = tile.a === leftEnd ? tile.b : tile.a;
        leftBranch.push({
          innerVal,
          outerVal,
          isDouble: tile.a === tile.b
        });
        leftEnd = outerVal;
      } else {
        const innerVal = rightEnd;
        const outerVal = tile.a === rightEnd ? tile.b : tile.a;
        rightBranch.push({
          innerVal,
          outerVal,
          isDouble: tile.a === tile.b
        });
        rightEnd = outerVal;
      }
    }

    function executePlayerMove(tile, side) {
      if (isRoundOver || turn !== 'player') return;
      playTileOnBoard(tile, side);
      playerHand = playerHand.filter((t) => t.id !== tile.id);
      selectedTileId = null;
      placeLeftBtn.hidden = true;
      placeRightBtn.hidden = true;
      consecutivePasses = 0;

      ArcadeHub.sound.tile();
      const movePts = (tile.a + tile.b) * 10 + 25;
      sessionScore += movePts;
      ctx.updateScore(sessionScore);

      if (playerHand.length === 0) {
        finishRound('player', 'Hết cờ trên tay!');
        return;
      }

      turn = 'ai';
      updateUI();
      drawCanvas();
      aiTimer = setTimeout(runAiTurn, 550);
    }

    function handleTileClick(tile) {
      if (isRoundOver || turn !== 'player') return;
      const playability = canTilePlay(tile);
      if (!playability.left && !playability.right) {
        ArcadeHub.sound.error();
        statusTextEl.textContent =
          'Quân cờ này không khớp! Hãy chọn quân viền xanh hoặc bấm rút Nọc ở dãy bên phải bàn.';
        statusTextEl.style.color = '#f43f5e';
        return;
      }

      if (isBoardEmpty()) {
        executePlayerMove(tile, 'right');
        return;
      }

      if (playability.left && playability.right && leftEnd !== rightEnd) {
        selectedTileId = tile.id;
        placeLeftBtn.hidden = false;
        placeRightBtn.hidden = false;
        placeLeftBtn.textContent = `⬅ Nối Đầu Trái (${leftEnd} chấm)`;
        placeRightBtn.textContent = `Nối Đầu Phải (${rightEnd} chấm) ➡`;
        statusTextEl.textContent =
          'Quân cờ khớp cả 2 đầu! Bấm trực tiếp vào Đầu Trái / Phải trên bàn hoặc nút bên trên.';
        statusTextEl.style.color = '#fbbf24';
        renderHand();
        drawCanvas();
        return;
      }

      executePlayerMove(tile, playability.left ? 'left' : 'right');
    }

    function handleDrawFromBoneyard() {
      if (isRoundOver || turn !== 'player') return;

      // Ràng buộc: Nếu trên tay còn quân đánh được thì không cho rút Nọc
      if (hasAnyPlayable(playerHand)) {
        ArcadeHub.sound.error();
        statusTextEl.textContent =
          'Trên tay bạn vẫn còn quân cờ đánh được (viền xanh lá) — Không được rút Nọc!';
        statusTextEl.style.color = '#f59e0b';
        ctx.showToast('Bạn còn quân đánh được trên tay, không thể rút Nọc!');
        return;
      }

      if (boneyard.length > 0) {
        const drawn = boneyard.pop();
        playerHand.push(drawn);
        ArcadeHub.sound.tile();

        const canPlayDrawn = canTilePlay(drawn);
        if (canPlayDrawn.left || canPlayDrawn.right) {
          statusTextEl.textContent =
            'Bạn vừa rút được quân cờ đánh được ngay! Hãy bấm vào quân cờ mới trên khay.';
          statusTextEl.style.color = '#10b981';
        } else {
          statusTextEl.textContent = `Bạn vừa rút 1 quân từ Nọc (Còn ${boneyard.length} quân Nọc).`;
          statusTextEl.style.color = '#38bdf8';
        }
        updateUI();
        drawCanvas();
      } else {
        ArcadeHub.sound.click();
        consecutivePasses += 1;
        if (consecutivePasses >= 2) {
          resolveBlockedGame();
          return;
        }
        statusTextEl.textContent = 'Nọc đã hết và bạn không có nước đi — Đã bỏ lượt.';
        turn = 'ai';
        updateUI();
        drawCanvas();
        aiTimer = setTimeout(runAiTurn, 550);
      }
    }

    placeLeftBtn.addEventListener('click', () => {
      const tile = playerHand.find((t) => t.id === selectedTileId);
      if (tile) executePlayerMove(tile, 'left');
    });

    placeRightBtn.addEventListener('click', () => {
      const tile = playerHand.find((t) => t.id === selectedTileId);
      if (tile) executePlayerMove(tile, 'right');
    });

    // Tương tác chuột / cảm ứng trên mặt bàn Canvas (Bấm vào dãy cờ Nọc bên phải hoặc bấm chọn Đầu Trái/Phải)
    function getCanvasMousePos(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    canvas.addEventListener('pointermove', (evt) => {
      const pos = getCanvasMousePos(evt);
      let foundSlot = -1;
      const canDrawNow = turn === 'player' && !isRoundOver && !hasAnyPlayable(playerHand);
      if (canDrawNow) {
        for (const box of boneyardHitBoxes) {
          if (
            pos.x >= box.x &&
            pos.x <= box.x + box.w &&
            pos.y >= box.y &&
            pos.y <= box.y + box.h
          ) {
            foundSlot = box.slotIndex;
            break;
          }
        }
      }
      if (foundSlot !== hoveredBoneSlot) {
        hoveredBoneSlot = foundSlot;
        canvas.style.cursor = foundSlot !== -1 ? 'pointer' : 'default';
        drawCanvas();
      }
    });

    canvas.addEventListener('pointerleave', () => {
      if (hoveredBoneSlot !== -1) {
        hoveredBoneSlot = -1;
        canvas.style.cursor = 'default';
        drawCanvas();
      }
    });

    canvas.addEventListener('pointerdown', (evt) => {
      if (isRoundOver) {
        evt.preventDefault();
        startNewRound();
        return;
      }
      if (turn !== 'player') return;
      const pos = getCanvasMousePos(evt);

      // 1. Kiểm tra xem người chơi có bấm vào quân bài Nọc ở dãy bên phải không
      for (const box of boneyardHitBoxes) {
        if (
          pos.x >= box.x &&
          pos.x <= box.x + box.w &&
          pos.y >= box.y &&
          pos.y <= box.y + box.h
        ) {
          evt.preventDefault();
          handleDrawFromBoneyard();
          return;
        }
      }

      // 2. Kiểm tra nút Bỏ Lượt trên bàn khi Nọc = 0 và không có quân đánh
      if (
        passButtonRect &&
        pos.x >= passButtonRect.x &&
        pos.x <= passButtonRect.x + passButtonRect.w &&
        pos.y >= passButtonRect.y &&
        pos.y <= passButtonRect.y + passButtonRect.h
      ) {
        evt.preventDefault();
        handleDrawFromBoneyard();
        return;
      }

      // 3. Kiểm tra bấm vào Đầu Trái / Đầu Phải khi đang chọn quân khớp cả 2 đầu
      if (selectedTileId) {
        const tile = playerHand.find((t) => t.id === selectedTileId);
        if (!tile) return;

        if (
          endHitZones.left &&
          Math.hypot(pos.x - endHitZones.left.x, pos.y - endHitZones.left.y) <= endHitZones.left.r
        ) {
          executePlayerMove(tile, 'left');
        } else if (
          endHitZones.right &&
          Math.hypot(pos.x - endHitZones.right.x, pos.y - endHitZones.right.y) <=
            endHitZones.right.r
        ) {
          executePlayerMove(tile, 'right');
        }
      }
    });

    function runAiTurn() {
      if (isRoundOver) return;

      while (!hasAnyPlayable(aiHand) && boneyard.length > 0) {
        aiHand.push(boneyard.pop());
      }

      const candidates = [];
      aiHand.forEach((tile) => {
        const p = canTilePlay(tile);
        if (p.left) candidates.push({ tile, side: 'left', weight: tile.a + tile.b });
        if (p.right && (!p.left || leftEnd !== rightEnd)) {
          candidates.push({ tile, side: 'right', weight: tile.a + tile.b });
        }
      });

      if (candidates.length === 0) {
        consecutivePasses += 1;
        if (consecutivePasses >= 2) {
          resolveBlockedGame();
          return;
        }
        statusTextEl.textContent = 'Máy không có quân hợp lệ và phải bỏ lượt! Tới lượt bạn.';
        statusTextEl.style.color = '#10b981';
        turn = 'player';
        updateUI();
        drawCanvas();
        return;
      }

      candidates.sort((a, b) => b.weight - a.weight);
      const chosen = candidates[0];
      playTileOnBoard(chosen.tile, chosen.side);
      aiHand = aiHand.filter((t) => t.id !== chosen.tile.id);
      consecutivePasses = 0;
      ArcadeHub.sound.tile();

      if (aiHand.length === 0) {
        finishRound('ai', 'Máy đã đánh hết bài!');
        return;
      }

      turn = 'player';
      const playerHasMove = hasAnyPlayable(playerHand);
      if (!playerHasMove && boneyard.length > 0) {
        statusTextEl.textContent =
          'Bạn chưa có quân khớp — Hãy bấm vào dãy cờ Nọc bên phải bàn để rút thêm!';
        statusTextEl.style.color = '#fbbf24';
      } else {
        statusTextEl.textContent = `Máy vừa nối vào nhánh ${chosen.side === 'left' ? 'Trái' : 'Phải'}. Tới lượt bạn!`;
        statusTextEl.style.color = '#38bdf8';
      }
      updateUI();
      drawCanvas();
    }

    function resolveBlockedGame() {
      const pSum = sumPips(playerHand);
      const aSum = sumPips(aiHand);
      if (pSum <= aSum) {
        finishRound('player', `Cả 2 bên khóa đầu! Bạn thắng đếm chấm (${pSum} so với ${aSum})`);
      } else {
        finishRound('ai', `Cả 2 bên khóa đầu! Máy thắng đếm chấm (${aSum} so với ${pSum})`);
      }
    }

    function finishRound(winner, reason) {
      isRoundOver = true;
      placeLeftBtn.hidden = true;
      placeRightBtn.hidden = true;

      if (winner === 'player') {
        ArcadeHub.sound.win();
        roundsWon += 1;
        const aiPipBonus = sumPips(aiHand) * 35;
        const roundBonus = 500 + aiPipBonus;
        sessionScore += roundBonus;
        ctx.updateScore(sessionScore);
        roundResult = { winner, reason, gained: roundBonus };

        statusTextEl.textContent = `🎉 Bạn thắng ván này (${reason})! +${roundBonus} điểm`;
        statusTextEl.style.color = '#fbbf24';
        ctx.submitHighScore(sessionScore, `${roundsWon} ván thắng Domino`);
      } else {
        ArcadeHub.sound.gameOver();
        roundResult = { winner, reason, gained: 0 };
        statusTextEl.textContent = `💥 ${reason} Bấm "Chơi lại" trên thanh trên để sang ván tiếp.`;
        statusTextEl.style.color = '#f43f5e';
        if (sessionScore > 0) {
          ctx.submitHighScore(sessionScore, `${roundsWon} ván thắng Domino`);
        }
      }

      roundOverAt = performance.now() / 1000;
      kickAnim(0.7);
      updateUI();
      drawCanvas();
    }

    function updateUI() {
      aiCountEl.textContent = String(aiHand.length);
      boneCountEl.textContent = String(boneyard.length);
      roundsWonEl.textContent = String(roundsWon);

      if (isBoardEmpty()) {
        endsInfoEl.textContent = 'Hai đầu bàn: Tự do (Đánh quân bất kỳ để mở bàn)';
      } else {
        endsInfoEl.textContent = `Đầu Trái: ${leftEnd} chấm • Đầu Phải: ${rightEnd} chấm`;
      }

      renderHand();
    }

    function renderHand() {
      handListEl.innerHTML = '';
      let dealIndex = 0;
      playerHand.forEach((tile) => {
        const playability = canTilePlay(tile);
        const playable =
          (playability.left || playability.right) && turn === 'player' && !isRoundOver;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'domino-tile-btn';
        btn.title = `Quân cờ ${tile.a} - ${tile.b}`;
        if (playable) btn.classList.add('playable');
        if (tile.id === selectedTileId) btn.classList.add('selected');
        // Only freshly dealt / drawn tiles play the deal-in animation
        if (!renderedIds.has(tile.id)) {
          btn.classList.add('is-new');
          btn.style.setProperty('--i', String(dealIndex++));
        }

        btn.innerHTML = createHandTileSvg(tile.a, tile.b);
        btn.addEventListener('click', () => handleTileClick(tile));
        handListEl.appendChild(btn);
      });
      renderedIds.clear();
      playerHand.forEach((tile) => renderedIds.add(tile.id));
    }

    function resizeCanvas() {
      const w = Math.min(window.innerWidth - 28, 980);
      const h = Math.max(310, Math.min(window.innerHeight - 320, 450));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCanvas();
    }

    function computePhysicalBoardLayout() {
      if (isBoardEmpty()) return { placements: [], leftTip: null, rightTip: null };

      const placements = [];
      const MAX_HALF_SPAN_X = 6.5;

      let leftStartCursorX;
      let rightStartCursorX;

      if (centerTile.isDouble) {
        placements.push({
          cx: 0,
          cy: 0,
          w: 1,
          h: 2,
          orientation: 'vertical',
          val1: centerTile.leftVal,
          val2: centerTile.rightVal,
          tag: leftBranch.length === 0 && rightBranch.length === 0 ? 'both' : 'center'
        });
        leftStartCursorX = -0.5;
        rightStartCursorX = 0.5;
      } else {
        placements.push({
          cx: 0,
          cy: 0,
          w: 2,
          h: 1,
          orientation: 'horizontal',
          val1: centerTile.leftVal,
          val2: centerTile.rightVal,
          tag: leftBranch.length === 0 && rightBranch.length === 0 ? 'both' : 'center'
        });
        leftStartCursorX = -1.0;
        rightStartCursorX = 1.0;
      }

      function traceBranch(branchTiles, initialCursorX, initialDirX, turnDirY, branchEndTag) {
        let cursorX = initialCursorX;
        let rowY = 0;
        let dirX = initialDirX;
        let justTurned = false;
        let tipCoord = {
          x: initialCursorX + initialDirX * 0.45,
          y: 0
        };

        branchTiles.forEach((tile, idx) => {
          const isLast = idx === branchTiles.length - 1;
          const tag = isLast ? branchEndTag : null;

          const willExceedEdge =
            (dirX > 0 && cursorX + 2.0 > MAX_HALF_SPAN_X) ||
            (dirX < 0 && cursorX - 2.0 < -MAX_HALF_SPAN_X);

          if (willExceedEdge && !justTurned) {
            const cornerX = cursorX - dirX * 0.5;
            const cornerCy = rowY + turnDirY * 1.5;

            const topVal = turnDirY > 0 ? tile.innerVal : tile.outerVal;
            const bottomVal = turnDirY > 0 ? tile.outerVal : tile.innerVal;

            placements.push({
              cx: cornerX,
              cy: cornerCy,
              w: 1,
              h: 2,
              orientation: 'vertical',
              val1: topVal,
              val2: bottomVal,
              tag
            });

            rowY = rowY + turnDirY * 2.0;
            dirX = -dirX;
            cursorX = cornerX + dirX * 0.5;
            justTurned = true;
            tipCoord = {
              x: cornerX,
              y: cornerCy + turnDirY * 1.15
            };
            return;
          }

          const wasCorner = justTurned;
          justTurned = false;

          const safeFromEdgeForVerticalDouble =
            !wasCorner &&
            idx > 0 &&
            dirX * (cursorX + dirX * 3.0) <= MAX_HALF_SPAN_X &&
            dirX * (cursorX - dirX * 1.5) >= -MAX_HALF_SPAN_X;

          if (tile.isDouble && safeFromEdgeForVerticalDouble) {
            const cx = cursorX + dirX * 0.5;
            placements.push({
              cx,
              cy: rowY,
              w: 1,
              h: 1.76,
              orientation: 'vertical',
              val1: tile.innerVal,
              val2: tile.outerVal,
              tag
            });
            cursorX += dirX * 1.0;
            tipCoord = {
              x: cursorX + dirX * 0.4,
              y: rowY
            };
          } else {
            const cx = cursorX + dirX * 1.0;
            const leftHalfVal = dirX > 0 ? tile.innerVal : tile.outerVal;
            const rightHalfVal = dirX > 0 ? tile.outerVal : tile.innerVal;

            placements.push({
              cx,
              cy: rowY,
              w: 2,
              h: 1,
              orientation: 'horizontal',
              val1: leftHalfVal,
              val2: rightHalfVal,
              tag
            });
            cursorX += dirX * 2.0;
            tipCoord = {
              x: cursorX + dirX * 0.4,
              y: rowY
            };
          }
        });

        return tipCoord;
      }

      const leftTip = traceBranch(leftBranch, leftStartCursorX, -1, -1, 'leftEnd');
      const rightTip = traceBranch(rightBranch, rightStartCursorX, +1, +1, 'rightEnd');

      return { placements, leftTip, rightTip };
    }

    function drawSingleHalfPips(cx, cy, squareSize, val, isHorizontalTile) {
      if (!val || val <= 0) return;
      const offsets = getPipOffsets(val, isHorizontalTile);
      g2d.fillStyle = PIP_COLORS[val] || '#0f172a';
      const span = squareSize * 0.64;
      const pipRadius = Math.max(1.8, squareSize * 0.098);

      const pipColor = PIP_COLORS[val] || '#0f172a';
      offsets.forEach(([ox, oy]) => {
        const px = cx + ox * (span / 2);
        const py = cy + oy * (span / 2);
        g2d.fillStyle = pipColor;
        g2d.beginPath();
        g2d.arc(px, py, pipRadius, 0, Math.PI * 2);
        g2d.fill();
        // Tiny rim highlight makes the pip read as drilled into the tile
        g2d.fillStyle = 'rgba(255, 255, 255, 0.55)';
        g2d.beginPath();
        g2d.arc(px + pipRadius * 0.25, py + pipRadius * 0.35, pipRadius * 0.35, 0, Math.PI * 2);
        g2d.fill();
      });
    }

    function drawPhysicalDominoTile(item, unitPx) {
      const x = item.cx * unitPx - (item.w * unitPx) / 2;
      const y = item.cy * unitPx - (item.h * unitPx) / 2;
      const w = item.w * unitPx;
      const h = item.h * unitPx;
      const pad = Math.max(1.2, unitPx * 0.035);

      const rx = x + pad;
      const ry = y + pad;
      const rw = w - pad * 2;
      const rh = h - pad * 2;
      const cornerRadius = Math.max(4, unitPx * 0.16);

      g2d.save();

      const newestTag = lastPlaced
        ? lastPlaced.side === 'left'
          ? 'leftEnd'
          : lastPlaced.side === 'right'
          ? 'rightEnd'
          : 'both'
        : null;
      if (newestTag && item.tag === newestTag) {
        const t = Math.min(1, (performance.now() / 1000 - lastPlaced.at) / 0.32);
        if (t < 1 && !reduced) {
          const k = 1.35 - 0.35 * fx.ease.outCubic(t);
          const ccx = x + w / 2;
          const ccy = y + h / 2;
          g2d.translate(ccx, ccy);
          g2d.scale(k, k);
          g2d.translate(-ccx, -ccy);
          g2d.globalAlpha = Math.min(1, t * 3);
        }
        if (t >= 0.9 && !lastPlaced.burst) {
          lastPlaced.burst = true;
          sparks.burst(x + w / 2, y + h / 2, {
            count: 12,
            kind: 'star',
            speed: [40, 140],
            life: [0.35, 0.7],
            size: [2, 4.5],
            colors: ['#fde68a', '#ffffff', '#34d399']
          });
        }
      }

      g2d.fillStyle = 'rgba(0, 0, 0, 0.42)';
      g2d.beginPath();
      g2d.roundRect(rx + 2, ry + 3.5, rw, rh, cornerRadius);
      g2d.fill();

      const faceGrad = g2d.createLinearGradient(rx, ry, rx + rw, ry + rh);
      faceGrad.addColorStop(0, '#fffdf5');
      faceGrad.addColorStop(1, '#e5dfd0');
      g2d.fillStyle = faceGrad;

      if (item.tag === 'leftEnd') {
        g2d.strokeStyle = '#38bdf8';
        g2d.lineWidth = 2.6;
      } else if (item.tag === 'rightEnd') {
        g2d.strokeStyle = '#10b981';
        g2d.lineWidth = 2.6;
      } else if (item.tag === 'both') {
        g2d.strokeStyle = '#fbbf24';
        g2d.lineWidth = 2.6;
      } else {
        g2d.strokeStyle = '#64748b';
        g2d.lineWidth = 1.4;
      }

      g2d.beginPath();
      g2d.roundRect(rx, ry, rw, rh, cornerRadius);
      g2d.fill();
      g2d.stroke();
      // Bevel highlight along the top edge
      g2d.fillStyle = 'rgba(255, 255, 255, 0.7)';
      g2d.fillRect(rx + cornerRadius, ry + 1.5, rw - cornerRadius * 2, Math.max(1.2, unitPx * 0.05));

      const isHoriz = item.orientation === 'horizontal';
      g2d.strokeStyle = '#334155';
      g2d.lineWidth = Math.max(1.4, unitPx * 0.055);

      if (isHoriz) {
        g2d.beginPath();
        g2d.moveTo(rx + rw / 2, ry + 4);
        g2d.lineTo(rx + rw / 2, ry + rh - 4);
        g2d.stroke();

        drawSingleHalfPips(rx + rw * 0.25, ry + rh * 0.5, rh, item.val1, true);
        drawSingleHalfPips(rx + rw * 0.75, ry + rh * 0.5, rh, item.val2, true);
      } else {
        g2d.beginPath();
        g2d.moveTo(rx + 4, ry + rh / 2);
        g2d.lineTo(rx + rw - 4, ry + rh / 2);
        g2d.stroke();

        drawSingleHalfPips(rx + rw * 0.5, ry + rh * 0.25, rw, item.val1, false);
        drawSingleHalfPips(rx + rw * 0.5, ry + rh * 0.75, rw, item.val2, false);
      }

      g2d.fillStyle = '#d97706';
      g2d.beginPath();
      g2d.arc(rx + rw / 2, ry + rh / 2, Math.max(1.5, unitPx * 0.055), 0, Math.PI * 2);
      g2d.fill();

      g2d.restore();
    }

    /**
     * Vẽ 1 quân bài Domino úp mặt (3D) trong dãy Nọc bên phải bàn cờ
     */
    function drawFaceDownBoneTile(x, y, w, h, isHighlighted, isTopOfStack) {
      g2d.save();

      // Đổ bóng và cạnh dày 3D của quân cờ úp
      g2d.fillStyle = 'rgba(0, 0, 0, 0.5)';
      g2d.beginPath();
      g2d.roundRect(x + 2, y + 4, w, h, 6);
      g2d.fill();

      // Cạnh dày màu ngà sẫm
      g2d.fillStyle = '#94a3b8';
      g2d.beginPath();
      g2d.roundRect(x, y + 2.5, w, h, 6);
      g2d.fill();

      // Mặt lưng quân cờ úp
      const backGrad = g2d.createLinearGradient(x, y, x + w, y + h);
      if (isHighlighted && isTopOfStack) {
        backGrad.addColorStop(0, '#1e3a8a');
        backGrad.addColorStop(1, '#0f172a');
      } else {
        backGrad.addColorStop(0, '#1e293b');
        backGrad.addColorStop(1, '#090d16');
      }
      g2d.fillStyle = backGrad;
      g2d.strokeStyle = isHighlighted && isTopOfStack ? '#fbbf24' : '#cbd5e1';
      g2d.lineWidth = isHighlighted && isTopOfStack ? 2.2 : 1.4;

      g2d.beginPath();
      g2d.roundRect(x, y, w, h, 6);
      g2d.fill();
      g2d.stroke();

      // Hoa văn khung viền & kim cương vàng ở mặt lưng quân cờ
      g2d.strokeStyle =
        isHighlighted && isTopOfStack
          ? 'rgba(251, 191, 36, 0.75)'
          : 'rgba(148, 163, 184, 0.35)';
      g2d.lineWidth = 1;
      g2d.strokeRect(x + 4, y + 4, w - 8, h - 8);

      const cx = x + w / 2;
      const cy = y + h / 2;
      g2d.fillStyle = isHighlighted && isTopOfStack ? '#fbbf24' : '#d97706';
      g2d.beginPath();
      g2d.moveTo(cx, cy - 6);
      g2d.lineTo(cx + 8, cy);
      g2d.lineTo(cx, cy + 6);
      g2d.lineTo(cx - 8, cy);
      g2d.closePath();
      g2d.fill();

      g2d.restore();
    }

    /**
     * Vẽ khu vực DÃY CỜ NỌC nằm ở bên phải mặt bàn:
     * - Tối đa 5 vị trí dàn theo chiều dọc.
     * - Nếu số quân Nọc <= 5: dàn đúng từng quân rời (5, 4, 3, 2, 1), rút 1 quân là bớt đi 1 quân.
     * - Nếu số quân Nọc > 5: chia đều vào 5 vị trí và vẽ XẾP CHỒNG 3D lên nhau kèm số lượng trong chồng.
     */
    function drawRightSideBoneyard(w, h) {
      boneyardHitBoxes = [];
      passButtonRect = null;

      const panelW = 128;
      const panelX = w - panelW - 12;
      const panelY = 16;
      const panelH = h - 32;

      g2d.save();

      // Khung khay Nọc bên phải mặt bàn
      g2d.fillStyle = 'rgba(5, 22, 14, 0.72)';
      g2d.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      g2d.lineWidth = 1.5;
      g2d.beginPath();
      g2d.roundRect(panelX, panelY, panelW, panelH, 10);
      g2d.fill();
      g2d.stroke();

      // Tiêu đề khay Nọc
      g2d.fillStyle = '#fbbf24';
      g2d.font = '800 12px "Segoe UI", sans-serif';
      g2d.textAlign = 'center';
      g2d.fillText(`CỜ NỌC (${boneyard.length})`, panelX + panelW / 2, panelY + 20);

      const needDrawNow =
        turn === 'player' && !isRoundOver && !hasAnyPlayable(playerHand) && boneyard.length > 0;

      g2d.fillStyle = needDrawNow ? '#4ade80' : '#64748b';
      g2d.font = '600 10.5px "Segoe UI", sans-serif';
      g2d.fillText(
        needDrawNow ? '👆 Bấm vào cờ để rút!' : '🔒 Còn quân đánh được',
        panelX + panelW / 2,
        panelY + 35
      );

      const total = boneyard.length;
      if (total === 0) {
        g2d.fillStyle = 'rgba(148, 163, 184, 0.55)';
        g2d.font = '600 12px "Segoe UI", sans-serif';
        g2d.fillText('Đã hết Nọc', panelX + panelW / 2, panelY + panelH / 2 - 15);

        // Nếu hết Nọc và người chơi không còn nước đi -> hiện nút Bỏ Lượt ngay trên khay
        if (turn === 'player' && !isRoundOver && !hasAnyPlayable(playerHand)) {
          const btnW = panelW - 20;
          const btnH = 38;
          const bx = panelX + 10;
          const by = panelY + panelH / 2 + 5;
          passButtonRect = { x: bx, y: by, w: btnW, h: btnH };

          g2d.fillStyle = '#e11d48';
          g2d.strokeStyle = '#fda4af';
          g2d.lineWidth = 2;
          g2d.beginPath();
          g2d.roundRect(bx, by, btnW, btnH, 8);
          g2d.fill();
          g2d.stroke();

          g2d.fillStyle = '#ffffff';
          g2d.font = '700 12px "Segoe UI", sans-serif';
          g2d.fillText('⏭ BỎ LƯỢT', bx + btnW / 2, by + 23);
        }
        g2d.restore();
        return;
      }

      // Tính số lượng vị trí dàn ra (tối đa 5 vị trí)
      const slotCount = Math.min(5, total);
      const slotStacks = [];

      if (total <= 5) {
        for (let i = 0; i < total; i++) {
          slotStacks.push(1);
        }
      } else {
        const base = Math.floor(total / 5);
        const rem = total % 5;
        for (let i = 0; i < 5; i++) {
          slotStacks.push(base + (i < rem ? 1 : 0));
        }
      }

      const listTopY = panelY + 46;
      const listUsableH = panelH - 54;
      const slotStepY = listUsableH / 5;
      const tileW = 64;
      const tileH = Math.min(34, slotStepY - 12);

      slotStacks.forEach((stackSize, slotIdx) => {
        const baseX = panelX + (panelW - tileW) / 2 + (stackSize > 1 ? 4 : 0);
        const baseY = listTopY + slotIdx * slotStepY + (slotStepY - tileH) / 2 + (stackSize > 1 ? 4 : 0);
        const isHovered = hoveredBoneSlot === slotIdx;

        // Vẽ các lớp quân cờ xếp chồng từ dưới lên trên
        for (let layer = 0; layer < stackSize; layer++) {
          const isTop = layer === stackSize - 1;
          const lift = isTop && isHovered ? -3 : 0;
          const lx = baseX - layer * 4;
          const ly = baseY - layer * 4 + lift;
          drawFaceDownBoneTile(lx, ly, tileW, tileH, isHovered || needDrawNow, isTop);
        }

        // Nếu chồng có > 1 quân cờ, hiển thị huy hiệu số lượng quân trong chồng (VD: x3, x2)
        if (stackSize > 1) {
          const topX = baseX - (stackSize - 1) * 4;
          const topY = baseY - (stackSize - 1) * 4;
          const badgeX = topX + tileW - 4;
          const badgeY = topY + 4;

          g2d.fillStyle = '#dc2626';
          g2d.strokeStyle = '#ffffff';
          g2d.lineWidth = 1.5;
          g2d.beginPath();
          g2d.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
          g2d.fill();
          g2d.stroke();

          g2d.fillStyle = '#ffffff';
          g2d.font = '800 10px "Segoe UI", sans-serif';
          g2d.textAlign = 'center';
          g2d.fillText(`x${stackSize}`, badgeX, badgeY + 3.5);
        }

        // Lưu vùng bấm (HitBox) cho vị trí cờ Nọc này
        boneyardHitBoxes.push({
          x: baseX - (stackSize - 1) * 4 - 4,
          y: baseY - (stackSize - 1) * 4 - 4,
          w: tileW + (stackSize - 1) * 4 + 8,
          h: tileH + (stackSize - 1) * 4 + 8,
          slotIndex: slotIdx
        });
      });

      g2d.restore();
    }

    function drawCanvas() {
      const w = parseFloat(canvas.style.width) || 920;
      const h = parseFloat(canvas.style.height) || 380;
      g2d.clearRect(0, 0, w, h);

      // Vùng mặt bàn bên trái dành cho chuỗi cờ (chừa cột 142px bên phải cho Dãy Cờ Nọc)
      const boneyardReservedW = 144;
      const playAreaW = w - boneyardReservedW;

      // Mặt bàn nỉ xanh lá đậm sang trọng
      const feltGrad = g2d.createRadialGradient(
        playAreaW / 2,
        h / 2,
        30,
        playAreaW / 2,
        h / 2,
        w * 0.72
      );
      feltGrad.addColorStop(0, '#0f5132');
      feltGrad.addColorStop(0.7, '#0a3622');
      feltGrad.addColorStop(1, '#062014');
      g2d.fillStyle = feltGrad;
      g2d.fillRect(0, 0, w, h);
      g2d.fillStyle = getFeltPattern();
      g2d.fillRect(0, 0, w, h);

      // Viền gỗ quanh mặt bàn
      const rim = g2d.createLinearGradient(0, 0, 0, h);
      rim.addColorStop(0, '#8b5a2b');
      rim.addColorStop(1, '#4a2c12');
      g2d.strokeStyle = rim;
      g2d.lineWidth = 8;
      g2d.strokeRect(4, 4, w - 8, h - 8);
      g2d.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      g2d.lineWidth = 1.5;
      g2d.strokeRect(10, 10, w - 20, h - 20);

      // Vẽ hàng bài úp của Máy ở mép trên phần bàn chơi
      const aiBackW = 20;
      const aiBackH = 34;
      const aiTotalW = aiHand.length * (aiBackW + 5);
      const aiStartX = (playAreaW - aiTotalW) / 2;
      for (let i = 0; i < aiHand.length; i++) {
        const bx = aiStartX + i * (aiBackW + 5);
        const by = 16;
        const backGrad = g2d.createLinearGradient(bx, by, bx + aiBackW, by + aiBackH);
        backGrad.addColorStop(0, '#334155');
        backGrad.addColorStop(1, '#0f172a');
        g2d.fillStyle = 'rgba(0, 0, 0, 0.35)';
        g2d.beginPath();
        g2d.roundRect(bx + 1.5, by + 2.5, aiBackW, aiBackH, 4);
        g2d.fill();
        g2d.fillStyle = backGrad;
        g2d.strokeStyle = '#94a3b8';
        g2d.lineWidth = 1.2;
        g2d.beginPath();
        g2d.roundRect(bx, by, aiBackW, aiBackH, 4);
        g2d.fill();
        g2d.stroke();
        g2d.strokeStyle = 'rgba(251, 191, 36, 0.55)';
        g2d.beginPath();
        g2d.roundRect(bx + 3, by + 3, aiBackW - 6, aiBackH - 6, 2);
        g2d.stroke();
      }

      // Vẽ Dãy Cờ Nọc ở bên phải mặt bàn
      drawRightSideBoneyard(w, h);

      if (isBoardEmpty()) {
        g2d.fillStyle = 'rgba(248, 250, 252, 0.8)';
        const hint = 'Bàn cờ đang trống — Hãy bấm chọn 1 quân cờ bên dưới để đặt ra giữa bàn!';
        g2d.font = fx.font(fx.fitFontSize(g2d, hint, playAreaW - 40, 15, 10, 600), 600);
        g2d.textAlign = 'center';
        g2d.fillText(hint, playAreaW / 2, h / 2 + 12);
        drawRoundResult(w, h);
        return;
      }

      const layout = computePhysicalBoardLayout();
      const placements = layout.placements;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      placements.forEach((p) => {
        minX = Math.min(minX, p.cx - p.w / 2);
        maxX = Math.max(maxX, p.cx + p.w / 2);
        minY = Math.min(minY, p.cy - p.h / 2);
        maxY = Math.max(maxY, p.cy + p.h / 2);
      });

      const worldW = Math.max(4, maxX - minX + 1.8);
      const worldH = Math.max(3, maxY - minY + 1.8);

      const usableW = playAreaW - 36;
      const usableH = h - 76;
      const unitPx = Math.max(18, Math.min(38, Math.min(usableW / worldW, usableH / worldH)));

      const worldCenterX = (minX + maxX) / 2;
      const worldCenterY = (minY + maxY) / 2;
      const screenCenterX = playAreaW / 2;
      const screenCenterY = 58 + usableH / 2;

      g2d.save();
      g2d.translate(
        screenCenterX - worldCenterX * unitPx,
        screenCenterY - worldCenterY * unitPx
      );

      placements.forEach((item) => {
        drawPhysicalDominoTile(item, unitPx);
      });

      endHitZones = { left: null, right: null };
      if (layout.leftTip && layout.rightTip) {
        const lx = screenCenterX + (layout.leftTip.x - worldCenterX) * unitPx;
        const ly = screenCenterY + (layout.leftTip.y - worldCenterY) * unitPx;
        const rx = screenCenterX + (layout.rightTip.x - worldCenterX) * unitPx;
        const ry = screenCenterY + (layout.rightTip.y - worldCenterY) * unitPx;

        endHitZones.left = { x: lx, y: ly, r: unitPx * 0.85 };
        endHitZones.right = { x: rx, y: ry, r: unitPx * 0.85 };

        if (selectedTileId) {
          g2d.fillStyle = 'rgba(56, 189, 248, 0.28)';
          g2d.strokeStyle = '#38bdf8';
          g2d.lineWidth = 2;
          g2d.beginPath();
          g2d.arc(
            layout.leftTip.x * unitPx,
            layout.leftTip.y * unitPx,
            unitPx * 0.55,
            0,
            Math.PI * 2
          );
          g2d.fill();
          g2d.stroke();

          g2d.fillStyle = 'rgba(16, 185, 129, 0.28)';
          g2d.strokeStyle = '#10b981';
          g2d.beginPath();
          g2d.arc(
            layout.rightTip.x * unitPx,
            layout.rightTip.y * unitPx,
            unitPx * 0.55,
            0,
            Math.PI * 2
          );
          g2d.fill();
          g2d.stroke();
        }
      }

      sparks.draw(g2d);
      g2d.restore();
      drawRoundResult(w, h);
    }

    function drawRoundResult(w, h) {
      if (!isRoundOver || !roundResult) return;
      const won = roundResult.winner === 'player';
      fx.drawStatePanel(g2d, w, h, {
        icon: won ? '🏆' : '🎲',
        title: won ? 'BẠN THẮNG VÁN NÀY!' : 'MÁY THẮNG VÁN NÀY',
        subtitle: roundResult.reason,
        lines: [
          won ? `Điểm ván|+${roundResult.gained.toLocaleString('vi-VN')}` : 'Điểm ván|+0',
          `Tổng điểm|${sessionScore.toLocaleString('vi-VN')}`,
          `Ván thắng|${roundsWon}`,
          `Chấm còn lại (Bạn / Máy)|${sumPips(playerHand)} / ${sumPips(aiHand)}`
        ],
        hint: 'Bấm vào bàn cờ để chia ván mới',
        accent: won ? '#10b981' : '#f43f5e',
        t: performance.now() / 1000 - roundOverAt,
        backdrop: 0.6
      });
    }

    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    startNewRound();

    return {
      restart() {
        startNewRound();
      },
      destroy() {
        if (aiTimer) clearTimeout(aiTimer);
        if (animRaf) cancelAnimationFrame(animRaf);
        window.removeEventListener('resize', onResize);
      }
    };
  }

  ArcadeHub.games.domino = {
    init: createDominoGame
  };
})(window);
