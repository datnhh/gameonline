(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const DIFFICULTY_LEVELS = {
    easy: { label: 'Dễ', blanks: 32, multiplier: 1.0, completionBonus: 800 },
    medium: { label: 'Vừa', blanks: 42, multiplier: 1.5, completionBonus: 1400 },
    hard: { label: 'Khó', blanks: 51, multiplier: 2.2, completionBonus: 2200 }
  };

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function isValidPlacement(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] === num) return false;
      }
    }
    return true;
  }

  function fillSudokuGrid(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (isValidPlacement(grid, r, c, num)) {
              grid[r][c] = num;
              if (fillSudokuGrid(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function countSudokuSolutions(grid, limit) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          let count = 0;
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(grid, r, c, num)) {
              grid[r][c] = num;
              count += countSudokuSolutions(grid, limit - count);
              grid[r][c] = 0;
              if (count >= limit) return count;
            }
          }
          return count;
        }
      }
    }
    return 1;
  }

  function generateSudoku(blanksCount) {
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillSudokuGrid(solution);

    const puzzle = solution.map((row) => row.slice());
    const coords = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        coords.push([r, c]);
      }
    }

    const shuffledCoords = shuffleArray(coords);
    let removed = 0;
    for (let i = 0; i < shuffledCoords.length && removed < blanksCount; i++) {
      const [r, c] = shuffledCoords[i];
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSudokuSolutions(puzzle, 2) !== 1) {
        puzzle[r][c] = backup;
      } else {
        removed++;
      }
    }

    return { solution, puzzle };
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function createSudokuGame(container, ctx) {
    let difficulty = 'medium';
    let solution = [];
    let board = [];
    let fixedMask = [];
    let notes = []; // 9x9 array of Set
    let selected = { r: 0, c: 0 };
    let isNoteMode = false;
    let mistakes = 0;
    let maxMistakes = 5;
    let hintsLeft = 3;
    let elapsedSeconds = 0;
    let currentScore = 0;
    let isFinished = false;
    let isPaused = false;
    let timerId = null;
    let bannerTimeoutId = null;

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span style="font-size:0.78rem;color:#94a3b8;">Độ khó:</span>
          <button type="button" class="pill-btn" data-diff="easy">Dễ</button>
          <button type="button" class="pill-btn active" data-diff="medium">Vừa</button>
          <button type="button" class="pill-btn" data-diff="hard">Khó</button>
        </div>
        <div class="toolbar-group">
          <span id="sudokuTimer" class="hud-chip">⏱ 00:00</span>
          <span id="sudokuMistakes" class="hud-chip">❌ Lỗi: 0/5</span>
          <span id="sudokuHints" class="hud-chip">💡 Gợi ý: 3</span>
          <button type="button" class="pill-btn" id="sudokuPauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
        </div>
      </div>

      <div class="sudoku-layout">
        <div class="sudoku-board-wrap" id="sudokuBoardWrap">
          <div id="sudokuBoard" class="sudoku-board" role="grid" aria-label="Bảng Sudoku 9x9"></div>
        </div>

        <div class="sudoku-sidepanel">
          <div id="sudokuStatusMsg" style="font-size:0.86rem;font-weight:700;color:#38bdf8;text-align:center;">
            Chọn ô trống và điền số từ 1 đến 9
          </div>

          <div style="background:rgba(9,14,28,0.75);border-radius:8px;padding:6px 10px;border:1px solid rgba(148,163,184,0.18);">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:#cbd5e1;margin-bottom:4px;">
              <span>Tiến độ giải bảng</span>
              <strong id="sudokuProgressText" style="color:#34d399;">0/81 (0%)</strong>
            </div>
            <div style="height:6px;background:#0f172a;border-radius:999px;overflow:hidden;">
              <div id="sudokuProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#38bdf8,#10b981);transition:width 0.25s ease;"></div>
            </div>
          </div>

          <div class="numpad-grid" id="sudokuNumpad">
            <button type="button" class="numpad-btn" data-num="1">1</button>
            <button type="button" class="numpad-btn" data-num="2">2</button>
            <button type="button" class="numpad-btn" data-num="3">3</button>
            <button type="button" class="numpad-btn" data-num="4">4</button>
            <button type="button" class="numpad-btn" data-num="5">5</button>
            <button type="button" class="numpad-btn" data-num="6">6</button>
            <button type="button" class="numpad-btn" data-num="7">7</button>
            <button type="button" class="numpad-btn" data-num="8">8</button>
            <button type="button" class="numpad-btn" data-num="9">9</button>
          </div>

          <div class="sudoku-actions-grid">
            <button type="button" id="sudokuNoteBtn" class="pill-btn" style="padding:0.65rem;">
              ✏️ Ghi chú: TẮT
            </button>
            <button type="button" id="sudokuEraseBtn" class="pill-btn" style="padding:0.65rem;">
              ⌫ Xóa ô
            </button>
            <button type="button" id="sudokuHintBtn" class="pill-btn" style="padding:0.65rem;grid-column:span 2;">
              💡 Dùng Gợi Ý (Còn 3)
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const boardEl = shell.querySelector('#sudokuBoard');
    const boardWrapEl = shell.querySelector('#sudokuBoardWrap');
    const pauseBtn = shell.querySelector('#sudokuPauseBtn');
    const timerEl = shell.querySelector('#sudokuTimer');
    const mistakesEl = shell.querySelector('#sudokuMistakes');
    const hintsEl = shell.querySelector('#sudokuHints');
    const statusMsgEl = shell.querySelector('#sudokuStatusMsg');
    const noteBtn = shell.querySelector('#sudokuNoteBtn');
    const eraseBtn = shell.querySelector('#sudokuEraseBtn');
    const hintBtn = shell.querySelector('#sudokuHintBtn');
    const progressTextEl = shell.querySelector('#sudokuProgressText');
    const progressBarEl = shell.querySelector('#sudokuProgressBar');

    function startNewGame() {
      if (timerId) clearInterval(timerId);
      const cfg = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;
      const generated = generateSudoku(cfg.blanks);

      solution = generated.solution;
      board = generated.puzzle.map((r) => r.slice());
      fixedMask = generated.puzzle.map((r) => r.map((val) => val !== 0));
      notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

      mistakes = 0;
      hintsLeft = 3;
      elapsedSeconds = 0;
      currentScore = 0;
      isFinished = false;
      isPaused = false;
      syncPauseBtn();
      if (bannerTimeoutId) clearTimeout(bannerTimeoutId);
      bannerTimeoutId = null;
      hideResultBanner();
      boardEl.classList.remove('is-solved', 'is-failed');
      boardWrapEl.classList.remove('is-paused');
      cellEls = [];
      ctx.updateScore(0);

      // Select first empty cell
      outer: for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!fixedMask[r][c]) {
            selected = { r, c };
            break outer;
          }
        }
      }

      updateHeaderIndicators();
      statusMsgEl.textContent = 'Chọn ô trống và điền số từ 1 đến 9';
      statusMsgEl.style.color = '#38bdf8';
      renderBoard();

      timerId = setInterval(() => {
        if (!isFinished && !isPaused) {
          elapsedSeconds += 1;
          timerEl.textContent = '⏱ ' + formatTime(elapsedSeconds);
        }
      }, 1000);
    }

    function updateHeaderIndicators() {
      timerEl.textContent = '⏱ ' + formatTime(elapsedSeconds);
      mistakesEl.textContent = `❌ Lỗi: ${mistakes}/${maxMistakes}`;
      hintsEl.textContent = `💡 Gợi ý: ${hintsLeft}`;
      hintBtn.textContent = `💡 Dùng Gợi Ý (Còn ${hintsLeft})`;
      noteBtn.textContent = isNoteMode ? '✏️ Ghi chú: BẬT' : '✏️ Ghi chú: TẮT';
      noteBtn.classList.toggle('active', isNoteMode);
    }

    // Cells are created once per puzzle and then updated in place: no per-render DOM rebuild
    // and a single delegated listener instead of 81 new listeners on every keystroke.
    let cellEls = [];

    function buildCells() {
      boardEl.innerHTML = '';
      cellEls = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement('div');
          cell.className = 'sudoku-cell';
          if (c === 2 || c === 5) cell.classList.add('box-right');
          if (r === 2 || r === 5) cell.classList.add('box-bottom');
          cell.dataset.idx = String(r * 9 + c);
          cell.setAttribute('role', 'gridcell');
          cell.style.setProperty('--d', String(r + c));
          boardEl.appendChild(cell);
          cellEls.push(cell);
        }
      }
    }

    function retrigger(el, cls) {
      if (!el) return;
      el.classList.remove(cls);
      // Force a reflow so the same animation can play again
      void el.offsetWidth;
      el.classList.add(cls);
    }

    function flashCompletedUnits(row, col) {
      const done = (cells) => cells.every(([r, c]) => board[r][c] === solution[r][c]);
      const rowCells = Array.from({ length: 9 }, (_, i) => [row, i]);
      const colCells = Array.from({ length: 9 }, (_, i) => [i, col]);
      const sr = Math.floor(row / 3) * 3;
      const sc = Math.floor(col / 3) * 3;
      const boxCells = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) boxCells.push([sr + r, sc + c]);
      let flashed = false;
      [rowCells, colCells, boxCells].forEach((unit) => {
        if (!done(unit)) return;
        flashed = true;
        unit.forEach(([r, c]) => {
          if (r === row && c === col) return;
          retrigger(cellEls[r * 9 + c], 'unit-flash');
        });
      });
      return flashed;
    }

    function showResultBanner(kind, title, detail) {
      hideResultBanner();
      const banner = document.createElement('div');
      banner.className = 'sudoku-result-banner' + (kind === 'fail' ? ' is-fail' : '');
      banner.setAttribute('role', 'status');
      const icon = kind === 'win' ? '🏆' : kind === 'fail' ? '💥' : '⏸';
      banner.innerHTML = `
        <div class="result-icon" aria-hidden="true">${icon}</div>
        <strong></strong>
        <p></p>
        <button type="button" class="pill-btn active" data-banner-action="${kind === 'pause' ? 'resume' : 'new'}">
          ${kind === 'pause' ? '▶ Tiếp tục' : '🔄 Chơi ván mới'}
        </button>
      `;
      banner.querySelector('strong').textContent = title;
      banner.querySelector('p').textContent = detail;
      boardWrapEl.appendChild(banner);
    }

    function hideResultBanner() {
      const old = boardWrapEl.querySelector('.sudoku-result-banner');
      if (old) old.remove();
    }

    function renderBoard() {
      if (cellEls.length !== 81) buildCells();
      const selVal = board[selected.r][selected.c];

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = cellEls[r * 9 + c];
          const isFixed = fixedMask[r][c];
          const val = board[r][c];
          const sameBox =
            Math.floor(r / 3) === Math.floor(selected.r / 3) && Math.floor(c / 3) === Math.floor(selected.c / 3);
          const isSel = r === selected.r && c === selected.c;

          cell.classList.toggle('fixed', isFixed);
          cell.classList.toggle('user-filled', !isFixed && val !== 0);
          cell.classList.toggle('error-cell', !isFixed && val !== 0 && val !== solution[r][c]);
          cell.classList.toggle('selected', isSel);
          cell.classList.toggle('related', !isSel && (r === selected.r || c === selected.c || sameBox));
          cell.classList.toggle('same-num', val !== 0 && selVal !== 0 && val === selVal);
          if (isSel) cell.setAttribute('aria-selected', 'true');
          else cell.removeAttribute('aria-selected');

          // Only touch the DOM content when it actually changed
          const key = val !== 0 ? `v${val}` : notes[r][c].size > 0 ? `n${Array.from(notes[r][c]).sort().join('')}` : '';
          if (cell.dataset.key !== key) {
            cell.dataset.key = key;
            if (val !== 0) {
              cell.textContent = String(val);
            } else if (notes[r][c].size > 0) {
              const notesGrid = document.createElement('div');
              notesGrid.className = 'sudoku-notes-grid';
              for (let n = 1; n <= 9; n++) {
                const sp = document.createElement('span');
                sp.textContent = notes[r][c].has(n) ? String(n) : '';
                notesGrid.appendChild(sp);
              }
              cell.textContent = '';
              cell.appendChild(notesGrid);
            } else {
              cell.textContent = '';
            }
          }
        }
      }

      // Progress bar & numpad remaining counts
      let solvedCells = 0;
      const digitCounts = Array(10).fill(0);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] !== 0 && board[r][c] === solution[r][c]) {
            solvedCells++;
            digitCounts[board[r][c]]++;
          }
        }
      }
      const pct = Math.round((solvedCells / 81) * 100);
      if (progressTextEl) progressTextEl.textContent = `${solvedCells}/81 (${pct}%)`;
      if (progressBarEl) progressBarEl.style.width = `${pct}%`;

      shell.querySelectorAll('[data-num]').forEach((btn) => {
        const n = Number(btn.getAttribute('data-num'));
        const rem = Math.max(0, 9 - digitCounts[n]);
        btn.innerHTML = `${n}<span style="position:absolute;bottom:3px;right:6px;font-size:0.62rem;font-weight:700;color:${rem === 0 ? '#34d399' : '#94a3b8'};">${rem === 0 ? '✓' : rem}</span>`;
        btn.classList.toggle('is-complete', rem === 0);
        btn.setAttribute('aria-label', rem === 0 ? `Số ${n} (đã đủ)` : `Số ${n} (còn ${rem})`);
      });
    }

    function clearPeerNotes(row, col, num) {
      for (let i = 0; i < 9; i++) {
        notes[row][i].delete(num);
        notes[i][col].delete(num);
      }
      const sr = Math.floor(row / 3) * 3;
      const sc = Math.floor(col / 3) * 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          notes[sr + r][sc + c].delete(num);
        }
      }
    }

    function checkCompletion() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] !== solution[r][c]) return false;
        }
      }
      return true;
    }

    function inputNumber(num) {
      if (isFinished || isPaused) return;
      const { r, c } = selected;
      if (fixedMask[r][c]) {
        statusMsgEl.textContent = 'Ô này là số đề bài cố định!';
        statusMsgEl.style.color = '#f59e0b';
        return;
      }

      if (isNoteMode) {
        if (board[r][c] !== 0) return;
        if (notes[r][c].has(num)) {
          notes[r][c].delete(num);
        } else {
          notes[r][c].add(num);
        }
        ArcadeHub.sound.click();
        renderBoard();
        return;
      }

      if (board[r][c] === solution[r][c]) return;

      board[r][c] = num;
      notes[r][c].clear();

      const cfg = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;

      if (num === solution[r][c]) {
        ArcadeHub.sound.move();
        clearPeerNotes(r, c, num);
        retrigger(cellEls[r * 9 + c], 'just-filled');
        flashCompletedUnits(r, c);
        // A correct cell can be scored only once: it is locked (no re-entry, no erase)
        const gain = Math.round(50 * cfg.multiplier);
        currentScore += gain;
        ctx.updateScore(currentScore);
        statusMsgEl.textContent = `Chính xác! +${gain} điểm`;
        statusMsgEl.style.color = '#10b981';

        if (checkCompletion()) {
          isFinished = true;
          ArcadeHub.sound.win();
          const timeBonus = Math.max(100, Math.round((900 - elapsedSeconds) * cfg.multiplier));
          const finalScore = currentScore + cfg.completionBonus + timeBonus;
          currentScore = finalScore;
          ctx.updateScore(finalScore);
          statusMsgEl.textContent = `🎉 Hoàn thành xuất sắc! Tổng: ${finalScore} điểm`;
          statusMsgEl.style.color = '#fbbf24';
          ctx.submitHighScore(
            finalScore,
            `Độ khó ${cfg.label} • ${formatTime(elapsedSeconds)}`
          );
          boardEl.classList.add('is-solved');
          const doneTime = formatTime(elapsedSeconds);
          bannerTimeoutId = setTimeout(() => {
            bannerTimeoutId = null;
            showResultBanner('win', 'HOÀN THÀNH XUẤT SẮC!', `Tổng ${finalScore.toLocaleString('vi-VN')} điểm • Thời gian ${doneTime}`);
          }, 950);
        }
      } else {
        mistakes += 1;
        ArcadeHub.sound.error();
        retrigger(cellEls[r * 9 + c], 'shake');
        currentScore = Math.max(0, currentScore - 30);
        ctx.updateScore(currentScore);
        updateHeaderIndicators();
        statusMsgEl.textContent = `Sai số! Lỗi ${mistakes}/${maxMistakes}`;
        statusMsgEl.style.color = '#f43f5e';

        if (mistakes >= maxMistakes) {
          isFinished = true;
          ArcadeHub.sound.gameOver();
          statusMsgEl.textContent = '💥 Quá 5 lần sai! Bấm Chơi lại để thử sức ván mới.';
          if (currentScore > 0) {
            ctx.submitHighScore(currentScore, `Độ khó ${cfg.label} (Chưa hoàn tất)`);
          }
          boardEl.classList.add('is-failed');
          showResultBanner('fail', 'QUÁ 5 LẦN SAI!', `Điểm: ${currentScore.toLocaleString('vi-VN')} • Thử lại một ván mới nhé`);
        }
      }

      renderBoard();
    }

    function eraseSelected() {
      if (isFinished || isPaused) return;
      const { r, c } = selected;
      if (fixedMask[r][c] || board[r][c] === solution[r][c]) return;
      board[r][c] = 0;
      notes[r][c].clear();
      ArcadeHub.sound.click();
      renderBoard();
    }

    function useHint() {
      if (isFinished || isPaused || hintsLeft <= 0) return;
      let target = selected;
      if (fixedMask[target.r][target.c] || board[target.r][target.c] === solution[target.r][target.c]) {
        // Find any unsolved cell
        let found = null;
        for (let r = 0; r < 9 && !found; r++) {
          for (let c = 0; c < 9 && !found; c++) {
            if (board[r][c] !== solution[r][c]) {
              found = { r, c };
            }
          }
        }
        if (!found) return;
        target = found;
        selected = found;
      }

      hintsLeft -= 1;
      isNoteMode = false;
      updateHeaderIndicators();
      inputNumber(solution[target.r][target.c]);
    }

    function syncPauseBtn() {
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
      pauseBtn.classList.toggle('active', isPaused);
      pauseBtn.setAttribute('aria-pressed', String(isPaused));
    }

    function setPaused(next) {
      const value = !!next && !isFinished;
      if (value === isPaused) return;
      isPaused = value;
      syncPauseBtn();
      // The board is hidden while paused so the clock cannot be gamed
      boardWrapEl.classList.toggle('is-paused', isPaused);
      if (isPaused) {
        showResultBanner('pause', 'TẠM DỪNG', 'Đồng hồ đã dừng. Bảng số được che lại cho tới khi chơi tiếp.');
      } else {
        hideResultBanner();
      }
    }

    // Event bindings
    boardEl.addEventListener('pointerdown', (evt) => {
      const cell = evt.target.closest('.sudoku-cell');
      if (!cell || isPaused) return;
      evt.preventDefault();
      const idx = Number(cell.dataset.idx);
      selected = { r: Math.floor(idx / 9), c: idx % 9 };
      ArcadeHub.sound.click();
      renderBoard();
    });

    boardEl.addEventListener('animationend', (evt) => {
      if (evt.target.classList) evt.target.classList.remove('just-filled', 'shake', 'unit-flash');
    });

    boardWrapEl.addEventListener('click', (evt) => {
      const btn = evt.target.closest('[data-banner-action]');
      if (!btn) return;
      ArcadeHub.sound.click();
      if (btn.getAttribute('data-banner-action') === 'resume') setPaused(false);
      else startNewGame();
    });

    pauseBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      setPaused(!isPaused);
    });

    shell.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-diff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-diff');
        startNewGame();
      });
    });

    shell.querySelectorAll('[data-num]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const n = Number(btn.getAttribute('data-num'));
        inputNumber(n);
      });
    });

    noteBtn.addEventListener('click', () => {
      isNoteMode = !isNoteMode;
      ArcadeHub.sound.click();
      updateHeaderIndicators();
    });

    eraseBtn.addEventListener('click', eraseSelected);
    hintBtn.addEventListener('click', useHint);

    function onKeyDown(evt) {
      if (evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (isPaused) return;
      if (evt.key >= '1' && evt.key <= '9') {
        evt.preventDefault();
        inputNumber(Number(evt.key));
      } else if (evt.key === 'Backspace' || evt.key === 'Delete' || evt.key === '0') {
        evt.preventDefault();
        eraseSelected();
      } else if (evt.key === 'n' || evt.key === 'N') {
        evt.preventDefault();
        isNoteMode = !isNoteMode;
        updateHeaderIndicators();
      } else if (evt.key === 'ArrowUp') {
        evt.preventDefault();
        selected.r = (selected.r + 8) % 9;
        renderBoard();
      } else if (evt.key === 'ArrowDown') {
        evt.preventDefault();
        selected.r = (selected.r + 1) % 9;
        renderBoard();
      } else if (evt.key === 'ArrowLeft') {
        evt.preventDefault();
        selected.c = (selected.c + 8) % 9;
        renderBoard();
      } else if (evt.key === 'ArrowRight') {
        evt.preventDefault();
        selected.c = (selected.c + 1) % 9;
        renderBoard();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    startNewGame();

    return {
      restart() {
        startNewGame();
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
        if (timerId) clearInterval(timerId);
        if (bannerTimeoutId) clearTimeout(bannerTimeoutId);
        window.removeEventListener('keydown', onKeyDown);
      }
    };
  }

  ArcadeHub.games.sudoku = {
    init: createSudokuGame
  };
})(window);
