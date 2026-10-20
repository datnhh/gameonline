(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const DIFFICULTY_MODES = {
    easy: {
      label: 'DỄ (Chuột nhô lên lâu)',
      stayDuration: 1.75,
      spawnInterval: 0.95,
      maxActive: 2,
      bunnyChance: 0.12,
      scoreMult: 1.0
    },
    hard: {
      label: 'KHÓ (Nhanh & Nhiều x1.5 Điểm)',
      stayDuration: 1.05,
      spawnInterval: 0.58,
      maxActive: 3,
      bunnyChance: 0.25,
      scoreMult: 1.5
    }
  };

  function createWhackAMoleGame(container, ctx) {
    let width = 900;
    let height = 520;
    let animId = null;
    let lastTime = performance.now();

    let difficulty = 'easy';
    let score = 0;
    let hits = 0;
    let combo = 0;
    let timeLeft = 60;
    let isGameOver = false;
    let isPaused = false;

    // 9 Holes (3x3)
    let holes = [];
    let spawnTimer = 0.5;

    // Hammer Cursor State
    let hammer = {
      x: 450,
      y: 260,
      swingTimer: 0
    };

    let stars = [];
    let popups = [];

    const shell = document.createElement('div');
    shell.className = 'game-shell';
    shell.innerHTML = `
      <div class="game-toolbar">
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#94a3b8;font-weight:700;">Chế độ chơi:</span>
          <button type="button" class="pill-btn active" data-diff="easy">🟢 Chế độ Dễ (Cho bé tập bấm chuột)</button>
          <button type="button" class="pill-btn" data-diff="hard">🔴 Chế độ Khó (x1.5 Điểm)</button>
        </div>
        <div class="toolbar-group">
          <span style="font-size:0.8rem;color:#38bdf8;font-weight:600;">
            🔨 Bấm vào Chuột Nâu &amp; Chuột Vàng • Đừng đập trúng Thỏ Trắng 🐰 nhé!
          </span>
          <button type="button" class="pill-btn" id="wamPauseBtn">⏸ Tạm dừng</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas id="wamCanvas" class="game-canvas" style="cursor:none;"></canvas>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(shell);

    const canvas = shell.querySelector('#wamCanvas');
    const g2d = canvas.getContext('2d');
    const pauseBtn = shell.querySelector('#wamPauseBtn');

    function getCfg() {
      return DIFFICULTY_MODES[difficulty] || DIFFICULTY_MODES.easy;
    }

    function initHoles() {
      holes = [];
      for (let i = 0; i < 9; i++) {
        holes.push({
          index: i,
          state: 'empty', // 'empty' | 'rising' | 'up' | 'sinking' | 'whacked'
          kind: 'normal', // 'normal' | 'gold' | 'bunny'
          pop: 0, // 0..1
          timer: 0
        });
      }
    }

    function resetGame() {
      score = 0;
      hits = 0;
      combo = 0;
      timeLeft = 60;
      isGameOver = false;
      isPaused = false;
      spawnTimer = 0.4;
      stars = [];
      popups = [];
      initHoles();
      ctx.updateScore(0);
      pauseBtn.textContent = '⏸ Tạm dừng';
    }

    function resizeCanvas() {
      const maxW = Math.min(window.innerWidth - 24, 960);
      const maxH = Math.max(360, Math.min(window.innerHeight - 200, 540));
      width = Math.max(320, Math.floor(maxW));
      height = Math.floor(maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getHoleCoordinates(index) {
      const r = Math.floor(index / 3);
      const c = index % 3;
      const startY = height * 0.36;
      const rowStep = (height - startY - 55) / 2.2;
      const y = startY + r * rowStep;

      // Perspective width: back row slightly narrower, front row wider
      const rowSpread = width * (0.24 + r * 0.035);
      const x = width * 0.5 + (c - 1) * rowSpread;
      const scale = 0.86 + r * 0.12;
      return { x, y, scale };
    }

    function spawnMole() {
      const cfg = getCfg();
      const activeCount = holes.filter((h) => h.state !== 'empty').length;
      if (activeCount >= cfg.maxActive) return;

      const emptyHoles = holes.filter((h) => h.state === 'empty');
      if (emptyHoles.length === 0) return;

      const chosen = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
      const roll = Math.random();
      if (roll < cfg.bunnyChance) {
        chosen.kind = 'bunny';
      } else if (roll < cfg.bunnyChance + 0.18) {
        chosen.kind = 'gold';
      } else {
        chosen.kind = 'normal';
      }

      chosen.state = 'rising';
      chosen.pop = 0;
      chosen.timer = cfg.stayDuration * (0.85 + Math.random() * 0.3);
    }

    function spawnHitStars(x, y, color) {
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const spd = 60 + Math.random() * 80;
        stars.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 20,
          r: 4 + Math.random() * 4,
          color: color || '#facc15',
          life: 0.42
        });
      }
    }

    function addPopup(x, y, text, color) {
      popups.push({
        x,
        y,
        text,
        color: color || '#facc15',
        alpha: 1,
        vy: -45
      });
    }

    function updateGame(dt) {
      if (isGameOver || isPaused) return;
      const cfg = getCfg();

      if (hammer.swingTimer > 0) {
        hammer.swingTimer = Math.max(0, hammer.swingTimer - dt * 6.5);
      }

      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        isGameOver = true;
        ArcadeHub.sound.win();
        ctx.submitHighScore(
          score,
          `Chế độ ${cfg.label} • Đập trúng ${hits} chuột`
        );
        return;
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnMole();
        spawnTimer = cfg.spawnInterval * (0.75 + Math.random() * 0.45);
      }

      holes.forEach((h) => {
        if (h.state === 'rising') {
          h.pop = Math.min(1, h.pop + dt * 6.5);
          if (h.pop >= 1) h.state = 'up';
        } else if (h.state === 'up') {
          h.timer -= dt;
          if (h.timer <= 0) {
            h.state = 'sinking';
          }
        } else if (h.state === 'whacked') {
          h.timer -= dt;
          if (h.timer <= 0) {
            h.state = 'sinking';
          }
        } else if (h.state === 'sinking') {
          h.pop = Math.max(0, h.pop - dt * 6.0);
          if (h.pop <= 0) {
            h.state = 'empty';
          }
        }
      });

      for (let i = stars.length - 1; i >= 0; i--) {
        const st = stars[i];
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        st.life -= dt;
        if (st.life <= 0) stars.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const pp = popups[i];
        pp.y += pp.vy * dt;
        pp.alpha -= dt * 0.9;
        if (pp.alpha <= 0) popups.splice(i, 1);
      }
    }

    function handleWhackAt(px, py) {
      if (isGameOver || isPaused) return;
      hammer.x = px;
      hammer.y = py;
      hammer.swingTimer = 1.0;

      const cfg = getCfg();
      let hitAny = false;

      // Check from front row to back row
      for (let i = 8; i >= 0; i--) {
        const h = holes[i];
        if (h.state === 'empty' || h.state === 'whacked' || h.pop < 0.25) continue;

        const pos = getHoleCoordinates(i);
        const charCenterY = pos.y - 34 * pos.scale * h.pop;
        const hitRadius = 54 * pos.scale;

        if (Math.hypot(px - pos.x, py - charCenterY) <= hitRadius) {
          hitAny = true;
          h.state = 'whacked';
          h.timer = 0.32;

          if (h.kind === 'bunny') {
            combo = 0;
            score = Math.max(0, score - 25);
            ctx.updateScore(score);
            ArcadeHub.sound.error();
            spawnHitStars(pos.x, charCenterY, '#f43f5e');
            addPopup(pos.x, charCenterY - 25, '🐰 NHẦM THỎ TRẮNG! -25', '#f43f5e');
          } else {
            hits += 1;
            combo += 1;
            const basePts = h.kind === 'gold' ? 90 : 35;
            const comboBonus = Math.min(60, (combo - 1) * 5);
            const pts = Math.round((basePts + comboBonus) * cfg.scoreMult);
            score += pts;
            ctx.updateScore(score);
            ArcadeHub.sound.tile();
            spawnHitStars(pos.x, charCenterY, h.kind === 'gold' ? '#facc15' : '#4ade80');
            addPopup(
              pos.x,
              charCenterY - 25,
              h.kind === 'gold' ? `👑 CHUỘT VÀNG +${pts}!` : `🔨 BỐP! +${pts}`,
              h.kind === 'gold' ? '#facc15' : '#4ade80'
            );
          }
          break;
        }
      }

      if (!hitAny) {
        ArcadeHub.sound.click();
      }
    }

    function drawHoleAndCritter(h) {
      const { x, y, scale } = getHoleCoordinates(h.index);
      g2d.save();
      g2d.translate(x, y);
      g2d.scale(scale, scale);

      // 1. Back Dirt Rim & Dark Burrow Pit
      g2d.fillStyle = '#78350f';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.ellipse(0, 0, 58, 22, 0, 0, Math.PI * 2);
      g2d.fill();
      g2d.stroke();

      g2d.fillStyle = '#1c1917';
      g2d.beginPath();
      g2d.ellipse(0, 2, 48, 16, 0, 0, Math.PI * 2);
      g2d.fill();

      // 2. Clip region above the hole so the critter emerges from inside the burrow
      if (h.state !== 'empty' && h.pop > 0.02) {
        g2d.save();
        g2d.beginPath();
        g2d.rect(-65, -120, 130, 124);
        g2d.clip();

        const liftY = (1 - h.pop) * 78;
        g2d.translate(0, liftY);

        const isWhacked = h.state === 'whacked';

        if (h.kind === 'bunny') {
          // Cute White Bunny Ears
          g2d.fillStyle = '#ffffff';
          g2d.strokeStyle = '#090d16';
          g2d.lineWidth = 2.5;
          g2d.beginPath();
          g2d.ellipse(-14, -68, 8, 22, -0.15, 0, Math.PI * 2);
          g2d.ellipse(14, -68, 8, 22, 0.15, 0, Math.PI * 2);
          g2d.fill();
          g2d.stroke();

          g2d.fillStyle = '#f472b6';
          g2d.beginPath();
          g2d.ellipse(-14, -68, 4, 14, -0.15, 0, Math.PI * 2);
          g2d.ellipse(14, -68, 4, 14, 0.15, 0, Math.PI * 2);
          g2d.fill();

          // Bunny Head & Body
          g2d.fillStyle = '#f8fafc';
          g2d.beginPath();
          g2d.roundRect(-28, -50, 56, 60, 26);
          g2d.fill();
          g2d.stroke();
        } else {
          // Mole / Hamster Round Ears
          const bodyCol = h.kind === 'gold' ? '#eab308' : '#b45309';
          const bellyCol = h.kind === 'gold' ? '#fef08a' : '#fde68a';

          g2d.fillStyle = bodyCol;
          g2d.strokeStyle = '#090d16';
          g2d.lineWidth = 2.5;
          g2d.beginPath();
          g2d.arc(-22, -48, 10, 0, Math.PI * 2);
          g2d.arc(22, -48, 10, 0, Math.PI * 2);
          g2d.fill();
          g2d.stroke();

          // Plump Mole Body
          g2d.fillStyle = bodyCol;
          g2d.beginPath();
          g2d.roundRect(-30, -54, 60, 66, 28);
          g2d.fill();
          g2d.stroke();

          // Belly Patch
          g2d.fillStyle = bellyCol;
          g2d.beginPath();
          g2d.ellipse(0, -14, 20, 18, 0, 0, Math.PI * 2);
          g2d.fill();

          // Golden Crown for Gold Mole
          if (h.kind === 'gold') {
            g2d.fillStyle = '#facc15';
            g2d.beginPath();
            g2d.moveTo(-16, -52);
            g2d.lineTo(-18, -68);
            g2d.lineTo(-6, -58);
            g2d.lineTo(0, -72);
            g2d.lineTo(6, -58);
            g2d.lineTo(18, -68);
            g2d.lineTo(16, -52);
            g2d.closePath();
            g2d.fill();
            g2d.stroke();
          }
        }

        // Facial Expressions (Dizzy X eyes when whacked, cute eyes otherwise)
        if (isWhacked) {
          g2d.strokeStyle = '#090d16';
          g2d.lineWidth = 2.8;
          [-12, 12].forEach((ex) => {
            g2d.beginPath();
            g2d.moveTo(ex - 5, -36);
            g2d.lineTo(ex + 5, -26);
            g2d.moveTo(ex + 5, -36);
            g2d.lineTo(ex - 5, -26);
            g2d.stroke();
          });
        } else {
          g2d.fillStyle = '#090d16';
          g2d.beginPath();
          g2d.arc(-11, -32, 4.5, 0, Math.PI * 2);
          g2d.arc(11, -32, 4.5, 0, Math.PI * 2);
          g2d.fill();

          g2d.fillStyle = '#ffffff';
          g2d.beginPath();
          g2d.arc(-12.5, -33.5, 1.8, 0, Math.PI * 2);
          g2d.arc(9.5, -33.5, 1.8, 0, Math.PI * 2);
          g2d.fill();
        }

        // Pink Snout & Buck Teeth
        g2d.fillStyle = '#ffffff';
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 1.5;
        g2d.fillRect(-5, -20, 5, 7);
        g2d.strokeRect(-5, -20, 5, 7);
        g2d.fillRect(0, -20, 5, 7);
        g2d.strokeRect(0, -20, 5, 7);

        g2d.fillStyle = '#f43f5e';
        g2d.beginPath();
        g2d.ellipse(0, -23, 6, 4.5, 0, 0, Math.PI * 2);
        g2d.fill();
        g2d.stroke();

        g2d.restore();
      }

      // 3. Front Dirt Lip covering the bottom edge of the burrow
      g2d.fillStyle = '#92400e';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2.5;
      g2d.beginPath();
      g2d.ellipse(0, 6, 58, 16, 0, 0, Math.PI);
      g2d.fill();
      g2d.stroke();

      g2d.restore();
    }

    function drawToyHammer() {
      g2d.save();
      g2d.translate(hammer.x, hammer.y);
      const swingAng = hammer.swingTimer > 0 ? -0.85 * Math.sin(hammer.swingTimer * Math.PI) : 0.25;
      g2d.rotate(swingAng);

      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2.5;

      // Wooden Handle
      g2d.fillStyle = '#f59e0b';
      g2d.beginPath();
      g2d.roundRect(-6, -10, 14, 52, 6);
      g2d.fill();
      g2d.stroke();

      // Big Red Cartoon Mallet Head
      g2d.fillStyle = '#ef4444';
      g2d.beginPath();
      g2d.roundRect(-28, -34, 56, 28, 10);
      g2d.fill();
      g2d.stroke();

      // Yellow Mallet Strike Faces
      g2d.fillStyle = '#facc15';
      g2d.fillRect(-31, -30, 7, 20);
      g2d.strokeRect(-31, -30, 7, 20);
      g2d.fillRect(24, -30, 7, 20);
      g2d.strokeRect(24, -30, 7, 20);

      g2d.restore();
    }

    function drawScene() {
      // Sunny Sky & Rolling Green Meadow
      const skyHeight = height * 0.24;
      const skyGrad = g2d.createLinearGradient(0, 0, 0, skyHeight);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      g2d.fillStyle = skyGrad;
      g2d.fillRect(0, 0, width, skyHeight);

      const grassGrad = g2d.createLinearGradient(0, skyHeight, 0, height);
      grassGrad.addColorStop(0, '#4ade80');
      grassGrad.addColorStop(0.4, '#22c55e');
      grassGrad.addColorStop(1, '#15803d');
      g2d.fillStyle = grassGrad;
      g2d.fillRect(0, skyHeight - 10, width, height - skyHeight + 10);

      // Wooden Farm Fence along Horizon
      g2d.fillStyle = '#d97706';
      g2d.strokeStyle = '#090d16';
      g2d.lineWidth = 2;
      g2d.fillRect(0, skyHeight - 16, width, 7);
      g2d.strokeRect(0, skyHeight - 16, width, 7);
      for (let fx = 25; fx < width; fx += 55) {
        g2d.fillRect(fx, skyHeight - 28, 12, 26);
        g2d.strokeRect(fx, skyHeight - 28, 12, 26);
      }

      // Draw all 9 Holes & Critters from back row to front row
      holes.forEach((h) => drawHoleAndCritter(h));

      // Hit Stars & Score Popups
      stars.forEach((st) => {
        g2d.fillStyle = st.color;
        g2d.beginPath();
        g2d.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        g2d.fill();
      });

      popups.forEach((pp) => {
        g2d.save();
        g2d.globalAlpha = Math.max(0, pp.alpha);
        g2d.fillStyle = pp.color;
        g2d.strokeStyle = '#090d16';
        g2d.lineWidth = 3.5;
        g2d.font = '900 18px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.strokeText(pp.text, pp.x, pp.y);
        g2d.fillText(pp.text, pp.x, pp.y);
        g2d.restore();
      });

      // Top HUD inside screen
      g2d.save();
      g2d.fillStyle = 'rgba(9, 13, 24, 0.82)';
      g2d.strokeStyle = '#facc15';
      g2d.lineWidth = 2;
      g2d.beginPath();
      g2d.roundRect(14, 10, width - 28, 44, 10);
      g2d.fill();
      g2d.stroke();

      g2d.fillStyle = timeLeft <= 10 ? '#f43f5e' : '#38bdf8';
      g2d.font = '800 17px "Segoe UI", sans-serif';
      g2d.textAlign = 'left';
      g2d.fillText(`⏱ Thời gian: ${Math.ceil(timeLeft)} giây`, 28, 38);

      g2d.textAlign = 'center';
      g2d.fillStyle = '#4ade80';
      g2d.fillText(`🔨 Đã đập trúng: ${hits} chuột  •  Combo: x${combo}`, width / 2, 38);

      g2d.textAlign = 'right';
      g2d.fillStyle = '#facc15';
      g2d.font = '900 19px "Segoe UI", sans-serif';
      g2d.fillText(`🏆 ${score.toLocaleString('vi-VN')} ĐIỂM`, width - 28, 38);
      g2d.restore();

      // Draw Toy Hammer Cursor
      drawToyHammer();

      if (isGameOver || isPaused) {
        g2d.fillStyle = 'rgba(7, 11, 20, 0.84)';
        g2d.fillRect(0, 0, width, height);
        g2d.fillStyle = '#facc15';
        g2d.font = '800 30px "Segoe UI", sans-serif';
        g2d.textAlign = 'center';
        g2d.fillText(
          isGameOver ? '🎉 HẾT GIỜ ĐẬP CHUỘT!' : '⏸ ĐANG TẠM DỪNG',
          width / 2,
          height / 2 - 20
        );
        g2d.fillStyle = '#38bdf8';
        g2d.font = '700 18px "Segoe UI", sans-serif';
        g2d.fillText(
          isGameOver
            ? `Điểm của bé: ${score.toLocaleString('vi-VN')} • Đập trúng: ${hits} chuột — Bấm chuột vào màn hình để chơi lại!`
            : 'Bấm nút Tiếp tục để chơi tiếp',
          width / 2,
          height / 2 + 20
        );
      }
    }

    function getPointerPos(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    canvas.addEventListener('pointermove', (evt) => {
      const pos = getPointerPos(evt);
      hammer.x = pos.x;
      hammer.y = pos.y;
    });

    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      if (isGameOver) {
        resetGame();
        return;
      }
      const pos = getPointerPos(evt);
      handleWhackAt(pos.x, pos.y);
    });

    shell.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        shell.querySelectorAll('[data-diff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-diff');
        resetGame();
      });
    });

    pauseBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      ArcadeHub.sound.click();
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
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
      }
    };
  }

  ArcadeHub.games.whackamole = {
    init: createWhackAMoleGame
  };
})(window);
