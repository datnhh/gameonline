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
    for (let i = 0; i < Math.min(blanksCount, shuffledCoords.length); i++) {
      const [r, c] = shuffledCoords[i];
      puzzle[r][c] = 0;
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
    let timerId = null;

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
        </div>
      </div>

      <div class="sudoku-layout">
        <div id="sudokuBoard" class="sudoku-board" role="grid" aria-label="Bảng Sudoku 9x9"></div>

        <div class="sudoku-sidepanel">
          <div id="sudokuStatusMsg" style="font-size:0.86rem;font-weight:700;color:#38bdf8;text-align:center;">
            Chọn ô trống và điền số từ 1 đến 9
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
    const timerEl = shell.querySelector('#sudokuTimer');
    const mistakesEl = shell.querySelector('#sudokuMistakes');
    const hintsEl = shell.querySelector('#sudokuHints');
    const statusMsgEl = shell.querySelector('#sudokuStatusMsg');
    const noteBtn = shell.querySelector('#sudokuNoteBtn');
    const eraseBtn = shell.querySelector('#sudokuEraseBtn');
    const hintBtn = shell.querySelector('#sudokuHintBtn');

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
        if (!isFinished) {
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

    function renderBoard() {
      boardEl.innerHTML = '';
      const selVal = board[selected.r][selected.c];

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement('div');
          cell.className = 'sudoku-cell';
          if (c === 2 || c === 5) cell.classList.add('box-right');
          if (r === 2 || r === 5) cell.classList.add('box-bottom');

          const isFixed = fixedMask[r][c];
          const val = board[r][c];

          if (isFixed) {
            cell.classList.add('fixed');
          } else if (val !== 0) {
            cell.classList.add('user-filled');
            if (val !== solution[r][c]) {
              cell.classList.add('error-cell');
            }
          }

          const sameBox =
            Math.floor(r / 3) === Math.floor(selected.r / 3) &&
            Math.floor(c / 3) === Math.floor(selected.c / 3);
          if (r === selected.r && c === selected.c) {
            cell.classList.add('selected');
          } else if (r === selected.r || c === selected.c || sameBox) {
            cell.classList.add('related');
          }

          if (val !== 0 && selVal !== 0 && val === selVal) {
            cell.classList.add('same-num');
          }

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
            cell.appendChild(notesGrid);
          }

          cell.addEventListener('pointerdown', (evt) => {
            evt.preventDefault();
            selected = { r, c };
            ArcadeHub.sound.click();
            renderBoard();
          });

          boardEl.appendChild(cell);
        }
      }
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
      if (isFinished) return;
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
        }
      } else {
        mistakes += 1;
        ArcadeHub.sound.error();
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
        }
      }

      renderBoard();
    }

    function eraseSelected() {
      if (isFinished) return;
      const { r, c } = selected;
      if (fixedMask[r][c]) return;
      board[r][c] = 0;
      notes[r][c].clear();
      ArcadeHub.sound.click();
      renderBoard();
    }

    function useHint() {
      if (isFinished || hintsLeft <= 0) return;
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

    // Event bindings
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
      destroy() {
        if (timerId) clearInterval(timerId);
        window.removeEventListener('keydown', onKeyDown);
      }
    };
  }

  ArcadeHub.games.sudoku = {
    init: createSudokuGame
  };
})(window);
