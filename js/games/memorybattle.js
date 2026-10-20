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
    let isPaused = false;

    // Presentation-only state (never read by gameplay rules)
    const fx = ArcadeHub.fx;
    const reduced = fx.isReducedMotion();
    const sparks = fx.createParticles(320);
    const camShake = fx.createShake(6);
    let sceneTime = 0;
    let overlayT = 0;
    let overlayKey = '';
    let bannerT = 10;
    let bannerBonus = 0;
    let heroHpGhost = 100;
    let bossHpGhost = 180;

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
            <button type="button" class="pill-btn" id="mbPauseBtn" aria-pressed="false">⏸ Tạm dừng</button>
            <span id="mbStatusBadge" style="font-size:0.84rem;color:#facc15;font-weight:800;">Boss 1 • Lật 2 thẻ giống nhau để tung chưởng!</span>
          </div>
        </div>
        <div class="canvas-frame">
          <canvas id="memoryBattleCanvas" class="game-canvas" width="${W}" height="${H}"></canvas>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#memoryBattleCanvas');
    const hidpi = fx.setupHiDPICanvas(canvas, W, H);
    const g = hidpi.g;
    const statusBadge = container.querySelector('#mbStatusBadge');
    const peekBtn = container.querySelector('#mbPeekBtn');
    const pauseBtn = container.querySelector('#mbPauseBtn');
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
      bossHpGhost = bossHp;
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
      heroHpGhost = 100;
      isGameOver = false;
      isPaused = false;
      syncPauseBtn();
      projectiles = [];
      floatingTexts = [];
      sparks.clear();
      camShake.reset();
      bannerT = 10;
      ctx.updateScore(0);
      setupBoss(1);
    }

    function syncPauseBtn() {
      if (!pauseBtn) return;
      pauseBtn.textContent = isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
      pauseBtn.classList.toggle('active', isPaused);
      pauseBtn.setAttribute('aria-pressed', String(isPaused));
    }

    function setPaused(next) {
      const value = !!next && !isGameOver;
      if (value === isPaused) return;
      isPaused = value;
      syncPauseBtn();
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
      camShake.add(0.5);
      sparks.burst(110, 60, { count: 16, speed: [60, 200], colors: ['#f43f5e', '#fecaca'] });
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
      if (isGameOver || isPaused || previewTimer > 0 || lockTimer > 0) return;
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
          const rects = getCardRects();
          flippedIndices.forEach((fi) => {
            const rc = rects[fi];
            if (!rc) return;
            sparks.burst(rc.x + rc.w / 2, rc.y + rc.h / 2, {
              count: 12,
              kind: 'star',
              speed: [60, 180],
              size: [3, 6],
              colors: [c1.info.color, '#ffffff', '#fde047']
            });
            sparks.ring(rc.x + rc.w / 2, rc.y + rc.h / 2, { from: 10, to: rc.w * 0.7, color: c1.info.color });
          });
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
      if (isGameOver || isPaused) return;

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
          camShake.add(0.3);
          sparks.burst(pr.tx, pr.ty, { count: 18, speed: [80, 260], size: [3, 6], colors: [pr.color, '#ffffff', '#fde047'] });
          sparks.ring(pr.tx, pr.ty, { from: 10, to: 70, color: pr.color });
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
            bannerT = 0;
            bannerBonus = bonus;
            sparks.burst(W - 110, 60, {
              count: 50,
              kind: 'confetti',
              speed: [120, 340],
              life: [0.9, 1.6],
              size: [4, 7],
              gravity: 320,
              drag: 1.1,
              colors: ['#4ade80', '#facc15', '#38bdf8', '#f472b6', '#ffffff']
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

    // =========================================================
    // PRESENTATION LAYER (render-only; never changes gameplay state)
    // =========================================================
    // Card faces/backs are pre-rendered once per size so a 16-card board costs 16 drawImage calls.
    const cardSpriteCache = new Map();
    function getCardSprite(kind, info, w, h) {
      const key = `${kind}|${info ? info.id : ''}|${w}|${h}`;
      let sp = cardSpriteCache.get(key);
      if (sp) return sp;
      const dpr = hidpi.dpr;
      const pad = 6;
      const cv = document.createElement('canvas');
      cv.width = Math.round((w + pad * 2) * dpr);
      cv.height = Math.round((h + pad * 2) * dpr);
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.translate(pad, pad);
      // Drop shadow
      c.fillStyle = 'rgba(0, 0, 0, 0.45)';
      fx.roundRectPath(c, 2, 4, w, h, 12);
      c.fill();
      if (kind === 'face') {
        const fg = c.createLinearGradient(0, 0, 0, h);
        fg.addColorStop(0, '#1e293b');
        fg.addColorStop(1, '#0f172a');
        fx.roundRectPath(c, 0, 0, w, h, 12);
        c.fillStyle = fg;
        c.fill();
        // Coloured glow behind the icon
        const rg = c.createRadialGradient(w / 2, h / 2 - 8, 2, w / 2, h / 2 - 8, h * 0.6);
        rg.addColorStop(0, fx.rgba(info.color, 0.55));
        rg.addColorStop(1, fx.rgba(info.color, 0));
        c.fillStyle = rg;
        c.fillRect(0, 0, w, h);
        fx.roundRectPath(c, 1.5, 1.5, w - 3, h - 3, 11);
        c.strokeStyle = info.color;
        c.lineWidth = 3;
        c.stroke();
        fx.roundRectPath(c, 6, 6, w - 12, h - 12, 8);
        c.strokeStyle = fx.rgba(info.color, 0.35);
        c.lineWidth = 1;
        c.stroke();
        c.font = `${Math.round(Math.min(38, h * 0.4))}px ${fx.FONT_STACK}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#ffffff';
        c.fillText(info.icon, w / 2, h / 2 - 9);
        // Name ribbon
        fx.roundRectPath(c, 8, h - 25, w - 16, 18, 9);
        c.fillStyle = fx.rgba(info.color, 0.3);
        c.fill();
        c.fillStyle = '#f8fafc';
        const ns = fx.fitFontSize(c, info.name, w - 22, 12, 9, 800);
        c.font = fx.font(ns, 800);
        c.fillText(info.name, w / 2, h - 16);
        if (info.heal) {
          c.fillStyle = '#4ade80';
          c.font = fx.font(10, 900);
          c.textAlign = 'right';
          c.fillText(`+${info.heal}HP`, w - 9, 14);
        }
      } else {
        const bg = c.createLinearGradient(0, 0, w, h);
        bg.addColorStop(0, '#1d4ed8');
        bg.addColorStop(1, '#6d28d9');
        fx.roundRectPath(c, 0, 0, w, h, 12);
        c.fillStyle = bg;
        c.fill();
        // Diamond lattice
        c.save();
        fx.roundRectPath(c, 0, 0, w, h, 12);
        c.clip();
        c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        c.lineWidth = 1;
        for (let k = -h; k < w + h; k += 14) {
          c.beginPath();
          c.moveTo(k, 0);
          c.lineTo(k + h, h);
          c.moveTo(k + h, 0);
          c.lineTo(k, h);
          c.stroke();
        }
        c.restore();
        fx.roundRectPath(c, 1.5, 1.5, w - 3, h - 3, 11);
        c.strokeStyle = '#93c5fd';
        c.lineWidth = 2.5;
        c.stroke();
        // Emblem
        c.fillStyle = 'rgba(15, 23, 42, 0.45)';
        c.beginPath();
        c.arc(w / 2, h / 2, Math.min(w, h) * 0.26, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#facc15';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = '#facc15';
        c.beginPath();
        const r = Math.min(w, h) * 0.16;
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 === 0 ? r : r * 0.45;
          const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
          c.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr);
        }
        c.closePath();
        c.fill();
      }
      sp = { cv, pad };
      cardSpriteCache.set(key, sp);
      return sp;
    }

    function updatePresentation(dt) {
      overlayT += dt;
      if (isPaused) return;
      sceneTime += dt;
      sparks.update(dt);
      camShake.update(dt);
      if (bannerT < 10) bannerT += dt;
      // HP bars: the bright bar snaps, the ghost bar drains slowly behind it
      heroHpGhost = heroHpGhost > heroHp ? Math.max(heroHp, heroHpGhost - dt * 60) : heroHp;
      bossHpGhost = bossHpGhost > bossHp ? Math.max(bossHp, bossHpGhost - dt * 80) : bossHp;
      projectiles.forEach((pr) => {
        if (Math.random() < 0.7) {
          const cx = pr.x + (pr.tx - pr.x) * pr.progress;
          const cy = pr.y + Math.sin(pr.progress * Math.PI) * -28;
          sparks.spawn({
            kind: 'dot',
            x: cx,
            y: cy,
            vx: -60 + Math.random() * 30,
            vy: (Math.random() - 0.5) * 40,
            life: 0.35,
            size: 5,
            endSize: 0.5,
            color: pr.color
          });
        }
      });
    }

    function drawHpBar(x, y, w, h, hp, ghost, maxHp, fillHex, label, alignRight) {
      fx.roundRectPath(g, x, y, w, h, 8);
      g.fillStyle = '#0b1220';
      g.fill();
      g.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      g.lineWidth = 1.5;
      g.stroke();
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      const ghostRatio = Math.max(0, Math.min(1, ghost / maxHp));
      const innerW = w - 4;
      const gx = alignRight ? x + 2 + innerW * (1 - ghostRatio) : x + 2;
      const fxStart = alignRight ? x + 2 + innerW * (1 - ratio) : x + 2;
      if (ghostRatio > 0) {
        fx.roundRectPath(g, gx, y + 2, innerW * ghostRatio, h - 4, 6);
        g.fillStyle = 'rgba(254, 240, 138, 0.7)';
        g.fill();
      }
      if (ratio > 0) {
        const bg = g.createLinearGradient(0, y, 0, y + h);
        bg.addColorStop(0, fx.shade(fillHex, 0.3));
        bg.addColorStop(1, fx.shade(fillHex, -0.2));
        fx.roundRectPath(g, fxStart, y + 2, innerW * ratio, h - 4, 6);
        g.fillStyle = bg;
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.fillRect(fxStart + 4, y + 4, Math.max(0, innerW * ratio - 8), 2);
      }
      g.fillStyle = '#ffffff';
      const ls = fx.fitFontSize(g, `${label}: ${hp}/${maxHp}`, w - 12, 12, 9, 800);
      g.font = fx.font(ls, 800);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${label}: ${hp}/${maxHp}`, x + w / 2, y + h / 2 + 1);
    }

    function drawFighter(cx, cy, icon, size, color, shake, flip) {
      const sx = shake > 0 && !reduced ? Math.sin(shake * 50) * 7 : 0;
      // Pedestal
      g.save();
      g.translate(cx, cy + size * 0.55);
      g.scale(1, 0.3);
      const pg = g.createRadialGradient(0, 0, 4, 0, 0, size * 0.85);
      pg.addColorStop(0, fx.rgba(color, 0.7));
      pg.addColorStop(1, fx.rgba(color, 0));
      g.fillStyle = pg;
      g.beginPath();
      g.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      g.fill();
      g.restore();
      fx.glow(g, cx + sx, cy, size * 1.1, color, 0.35);
      g.save();
      g.translate(cx + sx, cy);
      if (flip) g.scale(-1, 1);
      g.font = `${size}px ${fx.FONT_STACK}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      g.fillText(icon, 0, 0);
      g.restore();
      if (shake > 0) {
        // Hit flash
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = Math.min(1, shake * 2);
        fx.glow(g, cx + sx, cy, size * 0.8, '#ffffff', 0.6);
        g.restore();
      }
    }

    function render() {
      const cfg = DIFFICULTY_CFG[difficulty];
      hidpi.apply();

      // Arena backdrop with perspective floor grid
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0b0820');
      bg.addColorStop(0.45, '#1e1b4b');
      bg.addColorStop(1, '#0b1020');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      fx.glow(g, 120, 70, 200, '#22c55e', 0.14);
      fx.glow(g, W - 120, 70, 220, currentBoss.color, 0.2 + Math.sin(sceneTime * 2) * 0.04);
      g.save();
      g.strokeStyle = 'rgba(129, 140, 248, 0.12)';
      g.lineWidth = 1;
      const horizon = 150;
      for (let k = -10; k <= 10; k++) {
        g.beginPath();
        g.moveTo(W / 2 + k * 18, horizon);
        g.lineTo(W / 2 + k * 120, H);
        g.stroke();
      }
      for (let k = 0; k < 8; k++) {
        const yy = horizon + Math.pow(k / 8, 1.8) * (H - horizon) + ((sceneTime * 12) % 12) * (k / 8);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(W, yy);
        g.stroke();
      }
      g.restore();

      g.save();
      camShake.apply(g);

      // Battle banner
      fx.roundRectPath(g, 24, 14, W - 48, 126, 16);
      const bb = g.createLinearGradient(0, 14, 0, 140);
      bb.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
      bb.addColorStop(1, 'rgba(30, 27, 75, 0.92)');
      g.fillStyle = bb;
      g.fill();
      g.strokeStyle = 'rgba(129, 140, 248, 0.45)';
      g.lineWidth = 1.5;
      g.stroke();

      drawFighter(110, 58 + Math.sin(sceneTime * 2.6) * 2, '🦸', 46, '#22c55e', heroShake, false);
      drawHpBar(38, 102, 220, 22, heroHp, heroHpGhost, heroMaxHp, '#22c55e', 'ĐỘI SIÊU NHÂN', false);

      fx.outlinedText(g, 'VS', W / 2, 52, { size: 30, color: '#facc15', glow: '#f97316', glowBlur: 16 });
      g.fillStyle = '#cbd5e1';
      g.font = fx.font(12, 700);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`Boss cấp ${bossLevel} • Combo x${combo}`, W / 2, 82);
      // Miss pips: how many wrong flips until the boss strikes back
      const pipN = cfg.missesPerBossAtk;
      for (let k = 0; k < pipN; k++) {
        const filled = k < missCounter;
        const px = W / 2 - ((pipN - 1) * 22) / 2 + k * 22;
        g.fillStyle = filled ? '#f43f5e' : 'rgba(148, 163, 184, 0.3)';
        g.beginPath();
        g.arc(px, 106, 7, 0, Math.PI * 2);
        g.fill();
        if (filled) fx.glow(g, px, 106, 14, '#f43f5e', 0.5);
      }
      g.fillStyle = '#94a3b8';
      g.font = fx.font(11, 700);
      g.fillText('Boss phản đòn khi đầy vạch đỏ', W / 2, 126);

      drawFighter(W - 110, 56 + Math.sin(breathPhase) * 3.5, currentBoss.icon, 54, currentBoss.color, bossShake, false);
      drawHpBar(W - 258, 102, 220, 22, bossHp, bossHpGhost, bossMaxHp, '#ef4444', currentBoss.name.toUpperCase(), true);

      // Projectiles: glowing orbs carrying the hero icon
      projectiles.forEach((pr) => {
        const cx = pr.x + (pr.tx - pr.x) * pr.progress;
        const cy = pr.y + Math.sin(pr.progress * Math.PI) * -28;
        fx.glow(g, cx, cy, 36, pr.color, 0.7);
        g.fillStyle = pr.color;
        g.beginPath();
        g.arc(cx, cy, 16, 0, Math.PI * 2);
        g.fill();
        g.font = `20px ${fx.FONT_STACK}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#ffffff';
        g.fillText(pr.icon, cx, cy + 1);
      });

      // Cards with 3D flip
      const rects = getCardRects();
      const mismatch = lockTimer > 0 ? flippedIndices : [];
      rects.forEach(({ x, y, w, h, card }, i) => {
        const anim = card.flipAnim != null ? card.flipAnim : card.flipped ? 1 : 0;
        const scaleX = Math.max(0.06, Math.abs(Math.cos(anim * Math.PI)));
        const isMiss = mismatch.includes(i);
        const shakeX = isMiss && !reduced ? Math.sin(lockTimer * 60) * 4 * Math.min(1, lockTimer * 3) : 0;
        const lift = !card.matched && anim > 0.02 && anim < 0.98 ? -6 * Math.sin(anim * Math.PI) : 0;
        g.save();
        if (card.matched) g.globalAlpha = 0.45;
        g.translate(x + w / 2 + shakeX, y + h / 2 + lift);
        g.scale(scaleX, 1);
        const sp = getCardSprite(anim >= 0.5 ? 'face' : 'back', anim >= 0.5 ? card.info : null, w, h);
        g.drawImage(sp.cv, -w / 2 - sp.pad, -h / 2 - sp.pad, w + sp.pad * 2, h + sp.pad * 2);
        if (isMiss && anim >= 0.5) {
          fx.roundRectPath(g, -w / 2, -h / 2, w, h, 12);
          g.fillStyle = 'rgba(244, 63, 94, 0.25)';
          g.fill();
        }
        g.restore();
        if (card.matched) {
          // Soft shimmer border on matched pairs
          g.save();
          g.globalAlpha = 0.5 + Math.sin(sceneTime * 3 + i) * 0.2;
          fx.roundRectPath(g, x + 1, y + 1, w - 2, h - 2, 12);
          g.strokeStyle = card.info.color;
          g.lineWidth = 2;
          g.stroke();
          g.restore();
        }
      });

      sparks.draw(g);

      floatingTexts.forEach((ft) => {
        g.save();
        g.globalAlpha = Math.max(0, Math.min(1, ft.life));
        fx.outlinedText(g, ft.text, ft.x, ft.y, { size: 18, color: ft.color });
        g.restore();
      });
      g.restore();

      // Memorise phase cue
      if (previewTimer > 0 && !isGameOver) {
        const total = peekUsed && previewTimer <= 1.4 ? 1.4 : cfg.previewTime;
        const frac = Math.max(0, Math.min(1, previewTimer / total));
        g.save();
        fx.roundRectPath(g, W / 2 - 110, 148, 220, 30, 15);
        g.fillStyle = 'rgba(15, 23, 42, 0.85)';
        g.fill();
        fx.roundRectPath(g, W / 2 - 110, 148, 220 * frac, 30, 15);
        g.fillStyle = 'rgba(250, 204, 21, 0.35)';
        g.fill();
        fx.outlinedText(g, '👁️ GHI NHỚ VỊ TRÍ THẺ!', W / 2, 163, { size: 14, color: '#fde047' });
        g.restore();
      }

      if (bannerT < 1.9 && !isGameOver) {
        fx.drawBanner(g, W, H, '🎉 HẠ GỤC BOSS!', {
          t: bannerT,
          duration: 1.9,
          accent: '#4ade80',
          sub: `+${bannerBonus} điểm • Boss mới: ${currentBoss.name}`,
          size: 38,
          y: H * 0.55
        });
      }

      const overlay = isGameOver ? 'over' : isPaused ? 'pause' : '';
      if (overlay !== overlayKey) {
        overlayKey = overlay;
        overlayT = 0;
      }
      if (isGameOver) {
        fx.drawStatePanel(g, W, H, {
          icon: '🦸',
          title: 'ĐỘI SIÊU NHÂN HẾT NĂNG LƯỢNG!',
          subtitle: 'Nghỉ một chút rồi tái đấu nhé!',
          lines: [`Điểm số|${score.toLocaleString('vi-VN')}`, `Đạt tới|Boss cấp ${bossLevel}`, `Chế độ|${cfg.label}`],
          hint: 'Bấm vào màn hình để tái đấu ngay!',
          accent: '#a855f7',
          t: overlayT
        });
      } else if (isPaused) {
        fx.drawStatePanel(g, W, H, {
          icon: '⏸',
          title: 'TẠM DỪNG',
          subtitle: 'Nhấn Esc hoặc nút Tiếp tục để chiến đấu tiếp.',
          accent: '#a855f7',
          t: overlayT,
          backdrop: 0.92
        });
      }
    }

    function onPointerDown(evt) {
      evt.preventDefault();
      if (isGameOver) {
        startNewGame();
        return;
      }
      if (isPaused) return;
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
      if (peekUsed || isGameOver || isPaused || previewTimer > 0) return;
      peekUsed = true;
      peekBtn.disabled = true;
      flippedIndices = [];
      cards.forEach((c) => {
        c.flipped = true;
      });
      previewTimer = 1.4;
      ArcadeHub.sound.boost();
    });

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (isGameOver) return;
        ArcadeHub.sound.click();
        setPaused(!isPaused);
      });
    }

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
      updatePresentation(dt);
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
