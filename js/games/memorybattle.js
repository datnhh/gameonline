(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});
  ArcadeHub.games = ArcadeHub.games || {};

  const HERO_CARDS = [
    { id: 'spider', icon: '🕷️', name: 'Người Nhện', color: '#ef4444', dmg: 35 },
    { id: 'flash', icon: '⚡', name: 'Tia Chớp', color: '#facc15', dmg: 35 },
    { id: 'bat', icon: '🦇', name: 'Người Dơi', color: '#64748b', dmg: 35 },
    { id: 'super', icon: '🛡️', name: 'Siêu Nhân', color: '#3b82f6', dmg: 40 },
    { id: 'heal', icon: '💖', name: 'Tim Hồi Máu', color: '#ec4899', dmg: 25, heal: 20 },
    { id: 'star', icon: '🌟', name: 'Siêu Sao', color: '#a855f7', dmg: 40 },
    { id: 'fire', icon: '🔥', name: 'Phượng Hoàng', color: '#f97316', dmg: 40 },
    { id: 'ice', icon: '❄️', name: 'Băng Giá', color: '#06b6d4', dmg: 35 }
  ];

  const BOSSES = [
    { name: 'Quái Vật Mực Vũ Trụ', icon: '🐙', maxHp: 180, color: '#a855f7' },
    { name: 'Robot Hủy Diệt', icon: '👾', maxHp: 220, color: '#ef4444' },
    { name: 'Rồng Lửa Hắc Ám', icon: '🐲', maxHp: 260, color: '#f97316' }
  ];

  const DIFFICULTY_CFG = {
    easy: {
      label: 'DỄ',
      pairs: 6,
      cols: 4,
      rows: 3,
      previewTime: 1.8,
      missesPerBossAtk: 3,
      bossAtkDmg: 15,
      scoreMult: 1
    },
    hard: {
      label: 'KHÓ',
      pairs: 8,
      cols: 4,
      rows: 4,
      previewTime: 1.1,
      missesPerBossAtk: 2,
      bossAtkDmg: 22,
      scoreMult: 1.5
    }
  };

  function createMemoryBattleGame(container, ctx) {
    const W = 820;
    const H = 530;

    let difficulty = 'easy';
    let bossLevel = 1;
    let score = 0;
    let combo = 0;
    let missCounter = 0;
    let heroHp = 100;
    let heroMaxHp = 100;
    let bossHp = 180;
    let bossMaxHp = 180;
    let currentBoss = BOSSES[0];

    let cards = [];
    let flippedIndices = [];
    let lockTimer = 0;
    let previewTimer = 0;
    let isGameOver = false;
    let animId = null;
    let lastTime = performance.now();

    let projectiles = []; // { x, y, tx, ty, color, icon, progress }
    let floatingTexts = [];
    let bossShake = 0;
    let heroShake = 0;
    let breathPhase = 0;

    container.innerHTML = `
      <div class="game-shell">
        <div class="game-toolbar">
          <div class="toolbar-group">
            <span style="font-weight:700;color:#94a3b8;font-size:0.82rem;">Chế độ:</span>
            <button type="button" class="pill-btn active" data-diff="easy">🌱 Dễ (12 Thẻ • Nhìn Trước Lâu)</button>
            <button type="button" class="pill-btn" data-diff="hard">🔥 Khó (16 Thẻ • Boss Mạnh)</button>
          </div>
          <div class="toolbar-group">
            <button type="button" class="pill-btn" id="mbPeekBtn">👁️ Soi Thẻ (1 Lần/Màn)</button>
            <span id="mbStatusBadge" style="font-size:0.84rem;color:#facc15;font-weight:800;">Boss 1 • Lật 2 thẻ giống nhau để tung chưởng!</span>
          </div>
        </div>
        <div class="canvas-frame">
          <canvas id="memoryBattleCanvas" class="game-canvas" width="${W}" height="${H}"></canvas>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#memoryBattleCanvas');
    const g = canvas.getContext('2d');
    const statusBadge = container.querySelector('#mbStatusBadge');
    const peekBtn = container.querySelector('#mbPeekBtn');
    const diffBtns = container.querySelectorAll('[data-diff]');
    let peekUsed = false;

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    function buildDeck() {
      const cfg = DIFFICULTY_CFG[difficulty];
      const pool = HERO_CARDS.slice(0, cfg.pairs);
      const pairList = [];
      pool.forEach((item) => {
        pairList.push({ ...item });
        pairList.push({ ...item });
      });
      shuffle(pairList);

      cards = pairList.map((info, index) => ({
        index,
        info,
        flipped: true,
        matched: false,
        flipAnim: 1
      }));
      flippedIndices = [];
      lockTimer = 0;
      previewTimer = cfg.previewTime;
      peekUsed = false;
      if (peekBtn) peekBtn.disabled = false;
    }

    function setupBoss(lvl) {
      const template = BOSSES[(lvl - 1) % BOSSES.length];
      currentBoss = template;
      bossMaxHp = Math.round(template.maxHp + (lvl - 1) * 35);
      bossHp = bossMaxHp;
      buildDeck();
      updateBadge();
    }

    function startNewGame() {
      score = 0;
      combo = 0;
      missCounter = 0;
      bossLevel = 1;
      heroMaxHp = 100;
      heroHp = 100;
      isGameOver = false;
      projectiles = [];
      floatingTexts = [];
      ctx.updateScore(0);
      setupBoss(1);
    }

    function updateBadge() {
      if (statusBadge) {
        statusBadge.textContent = `Boss Cấp ${bossLevel}: ${currentBoss.name} • Combo: ${combo}x`;
      }
    }

    function getCardRects() {
      const cfg = DIFFICULTY_CFG[difficulty];
      const topAreaH = 152;
      const availW = W - 90;
      const availH = H - topAreaH - 26;
      const gap = 12;
      const cw = Math.min(136, Math.floor((availW - gap * (cfg.cols - 1)) / cfg.cols));
      const ch = Math.min(96, Math.floor((availH - gap * (cfg.rows - 1)) / cfg.rows));
      const totalW = cfg.cols * cw + (cfg.cols - 1) * gap;
      const totalH = cfg.rows * ch + (cfg.rows - 1) * gap;
      const startX = Math.floor((W - totalW) / 2);
      const startY = topAreaH + Math.floor((availH - totalH) / 2);

      return cards.map((card, i) => {
        const r = Math.floor(i / cfg.cols);
        const c = i % cfg.cols;
        return {
          x: startX + c * (cw + gap),
          y: startY + r * (ch + gap),
          w: cw,
          h: ch,
          card
        };
      });
    }

    function triggerHeroAttack(cardInfo) {
      const cfg = DIFFICULTY_CFG[difficulty];
      combo++;
      const totalDmg = cardInfo.dmg + (combo - 1) * 8;
      const pts = Math.round((60 + combo * 15) * cfg.scoreMult);
      score += pts;
      ctx.updateScore(score);

      if (cardInfo.heal) {
        heroHp = Math.min(heroMaxHp, heroHp + cardInfo.heal);
        floatingTexts.push({
          x: 155,
          y: 65,
          text: `+${cardInfo.heal} HP 💖`,
          color: '#4ade80',
          life: 1.1
        });
      }

      projectiles.push({
        x: 170,
        y: 78,
        tx: W - 170,
        ty: 78,
        color: cardInfo.color,
        icon: cardInfo.icon,
        dmg: totalDmg,
        progress: 0
      });

      ArcadeHub.sound.shoot();
      updateBadge();
    }

    function triggerBossAttack() {
      const cfg = DIFFICULTY_CFG[difficulty];
      heroHp = Math.max(0, heroHp - cfg.bossAtkDmg);
      heroShake = 0.35;
      ArcadeHub.sound.hit();
      floatingTexts.push({
        x: 155,
        y: 85,
        text: `-${cfg.bossAtkDmg} HP 💥`,
        color: '#f43f5e',
        life: 1.1
      });

      if (heroHp <= 0) {
        isGameOver = true;
        ArcadeHub.sound.gameOver();
        ctx.submitHighScore(score, `Đạt Boss ${bossLevel} (${cfg.label})`);
      }
    }

    function checkDeckCleared() {
      if (cards.every((c) => c.matched) && bossHp > 0) {
        buildDeck();
      }
    }

    function onCardClick(idx) {
      if (isGameOver || previewTimer > 0 || lockTimer > 0) return;
      const card = cards[idx];
      if (!card || card.flipped || card.matched) return;

      card.flipped = true;
      flippedIndices.push(idx);
      ArcadeHub.sound.click();

      if (flippedIndices.length === 2) {
        const c1 = cards[flippedIndices[0]];
        const c2 = cards[flippedIndices[1]];

        if (c1.info.id === c2.info.id) {
          c1.matched = true;
          c2.matched = true;
          flippedIndices = [];
          triggerHeroAttack(c1.info);
        } else {
          combo = 0;
          missCounter++;
          lockTimer = 0.72;
          ArcadeHub.sound.error();
          if (missCounter >= DIFFICULTY_CFG[difficulty].missesPerBossAtk) {
            missCounter = 0;
            triggerBossAttack();
          }
          updateBadge();
        }
      }
    }

    function update(dt) {
      if (isGameOver) return;

      if (previewTimer > 0) {
        previewTimer -= dt;
        if (previewTimer <= 0) {
          cards.forEach((c) => {
            if (!c.matched) c.flipped = false;
          });
        }
      }

      if (lockTimer > 0) {
        lockTimer -= dt;
        if (lockTimer <= 0) {
          flippedIndices.forEach((i) => {
            if (cards[i]) cards[i].flipped = false;
          });
          flippedIndices = [];
        }
      }

      if (bossShake > 0) bossShake = Math.max(0, bossShake - dt);
      if (heroShake > 0) heroShake = Math.max(0, heroShake - dt);
      breathPhase += dt * 3.2;

      cards.forEach((c) => {
        const target = c.flipped || c.matched ? 1 : 0;
        if (c.flipAnim == null) c.flipAnim = target;
        c.flipAnim += (target - c.flipAnim) * Math.min(1, dt * 14);
      });

      // Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const pr = projectiles[i];
        pr.progress += dt * 2.8;
        if (pr.progress >= 1) {
          bossHp = Math.max(0, bossHp - pr.dmg);
          bossShake = 0.35;
          ArcadeHub.sound.explosion();
          floatingTexts.push({
            x: W - 165,
            y: 68,
            text: `-${pr.dmg} HP!`,
            color: '#facc15',
            life: 1.0
          });
          projectiles.splice(i, 1);

          if (bossHp <= 0) {
            const bonus = Math.round(250 * DIFFICULTY_CFG[difficulty].scoreMult);
            score += bonus;
            ctx.updateScore(score);
            ArcadeHub.sound.win();
            floatingTexts.push({
              x: W / 2,
              y: 80,
              text: `🎉 HẠ GỤC BOSS +${bonus} ĐIỂM!`,
              color: '#4ade80',
              life: 1.5
            });
            bossLevel++;
            heroHp = Math.min(heroMaxHp, heroHp + 30);
            setupBoss(bossLevel);
          } else {
            checkDeckCleared();
          }
        }
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 32 * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }
    }

    function drawHpBar(x, y, w, h, hp, maxHp, fillHex, label) {
      g.fillStyle = '#0f172a';
      g.strokeStyle = '#475569';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(x, y, w, h, 8);
      g.fill();
      g.stroke();

      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      if (ratio > 0) {
        g.fillStyle = fillHex;
        g.beginPath();
        g.roundRect(x + 2, y + 2, (w - 4) * ratio, h - 4, 6);
        g.fill();
      }

      g.fillStyle = '#ffffff';
      g.font = '800 12px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${label}: ${hp}/${maxHp}`, x + w / 2, y + h / 2 + 1);
    }

    function render() {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#090d16');
      bg.addColorStop(1, '#1e1b4b');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      // Top RPG Battle Arena Banner
      g.fillStyle = 'rgba(15, 23, 42, 0.9)';
      g.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(24, 14, W - 48, 126, 14);
      g.fill();
      g.stroke();

      // Left: Superhero Squad
      const hx = 95 + (heroShake > 0 ? Math.sin(heroShake * 50) * 6 : 0);
      g.font = '44px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🦸‍♂️', hx, 62);
      drawHpBar(38, 102, 220, 22, heroHp, heroMaxHp, '#22c55e', 'ĐỘI SIÊU NHÂN');

      // Center VS badge
      g.fillStyle = '#facc15';
      g.font = '900 22px sans-serif';
      g.fillText('⚡ VS ⚡', W / 2, 62);
      g.fillStyle = '#94a3b8';
      g.font = '700 13px sans-serif';
      const remMiss = DIFFICULTY_CFG[difficulty].missesPerBossAtk - missCounter;
      g.fillText(`Boss phản đòn sau ${remMiss} lần lật sai`, W / 2, 108);

      // Right: Space Boss
      const bx = W - 95 + (bossShake > 0 ? Math.sin(bossShake * 50) * 7 : 0);
      const by = 60 + Math.sin(breathPhase) * 3.5;
      g.font = '50px sans-serif';
      g.fillText(currentBoss.icon, bx, by);
      drawHpBar(W - 258, 102, 220, 22, bossHp, bossMaxHp, '#ef4444', currentBoss.name.toUpperCase());

      // Projectiles
      projectiles.forEach((pr) => {
        const cx = pr.x + (pr.tx - pr.x) * pr.progress;
        const cy = pr.y + Math.sin(pr.progress * Math.PI) * -28;
        g.save();
        g.fillStyle = pr.color;
        g.beginPath();
        g.arc(cx, cy, 18, 0, Math.PI * 2);
        g.fill();
        g.font = '22px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pr.icon, cx, cy);
        g.restore();
      });

      // Cards Grid with 3D Flip Animation
      const rects = getCardRects();
      rects.forEach(({ x, y, w, h, card }) => {
        g.save();
        if (card.matched) {
          g.globalAlpha = 0.42;
        }

        const anim = card.flipAnim != null ? card.flipAnim : card.flipped ? 1 : 0;
        const scaleX = Math.max(0.06, Math.abs(Math.cos(anim * Math.PI)));
        g.translate(x + w / 2, y + h / 2);
        g.scale(scaleX, 1);
        g.translate(-(x + w / 2), -(y + h / 2));

        if (anim >= 0.5) {
          g.fillStyle = '#1e293b';
          g.strokeStyle = card.info.color;
          g.lineWidth = 3;
          g.beginPath();
          g.roundRect(x, y, w, h, 12);
          g.fill();
          g.stroke();

          g.font = '34px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(card.info.icon, x + w / 2, y + h / 2 - 10);

          g.fillStyle = '#f8fafc';
          g.font = '800 12px sans-serif';
          g.fillText(card.info.name, x + w / 2, y + h - 16);
        } else {
          const backGrad = g.createLinearGradient(x, y, x + w, y + h);
          backGrad.addColorStop(0, '#1d4ed8');
          backGrad.addColorStop(1, '#4f46e5');
          g.fillStyle = backGrad;
          g.strokeStyle = '#60a5fa';
          g.lineWidth = 2.5;
          g.beginPath();
          g.roundRect(x, y, w, h, 12);
          g.fill();
          g.stroke();

          g.fillStyle = 'rgba(255,255,255,0.85)';
          g.font = '900 26px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('⭐', x + w / 2, y + h / 2);
        }
        g.restore();
      });

      // Floating texts
      floatingTexts.forEach((ft) => {
        g.save();
        g.globalAlpha = Math.min(1, ft.life);
        g.font = '900 18px sans-serif';
        g.fillStyle = ft.color;
        g.textAlign = 'center';
        g.fillText(ft.text, ft.x, ft.y);
        g.restore();
      });

      if (isGameOver) {
        g.fillStyle = 'rgba(9, 13, 22, 0.85)';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#f43f5e';
        g.font = '900 32px sans-serif';
        g.textAlign = 'center';
        g.fillText('ĐỘI SIÊU NHÂN ĐÃ HẾT NĂNG LƯỢNG!', W / 2, H / 2 - 26);
        g.fillStyle = '#f8fafc';
        g.font = '700 20px sans-serif';
        g.fillText(`Điểm số: ${score} • Đạt tới Boss Cấp ${bossLevel}`, W / 2, H / 2 + 14);
        g.fillStyle = '#facc15';
        g.font = '700 16px sans-serif';
        g.fillText('Bấm vào màn hình để tái đấu ngay!', W / 2, H / 2 + 52);
      }
    }

    function onPointerDown(evt) {
      evt.preventDefault();
      if (isGameOver) {
        startNewGame();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const px = ((clientX - rect.left) / rect.width) * W;
      const py = ((clientY - rect.top) / rect.height) * H;

      const rects = getCardRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
          onCardClick(i);
          break;
        }
      }
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });

    peekBtn.addEventListener('click', () => {
      if (peekUsed || isGameOver || previewTimer > 0) return;
      peekUsed = true;
      peekBtn.disabled = true;
      flippedIndices = [];
      cards.forEach((c) => {
        c.flipped = true;
      });
      previewTimer = 1.4;
      ArcadeHub.sound.boost();
    });

    diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextDiff = btn.getAttribute('data-diff');
        if (nextDiff === difficulty) return;
        difficulty = nextDiff;
        diffBtns.forEach((b) => b.classList.toggle('active', b === btn));
        ArcadeHub.sound.click();
        startNewGame();
      });
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      update(dt);
      render();
      animId = requestAnimationFrame(loop);
    }

    startNewGame();
    animId = requestAnimationFrame(loop);

    return {
      restart() {
        startNewGame();
      },
      destroy() {
        if (animId) cancelAnimationFrame(animId);
      }
    };
  }

  ArcadeHub.games.memorybattle = {
    init(container, ctx) {
      return createMemoryBattleGame(container, ctx);
    }
  };
})(window);
