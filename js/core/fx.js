(function (global) {
  'use strict';

  /**
   * Shared presentation helpers for canvas games: HiDPI canvas setup, pooled
   * particles, camera shake, floating score text, state panels and easing.
   * Nothing in here touches gameplay state — games call these from their
   * render/update code only.
   */
  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});

  const FONT_STACK = '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------------------
  // Reduced motion
  // ---------------------------------------------------------------------------
  const motionQuery = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = Boolean(motionQuery && motionQuery.matches);
  if (motionQuery) {
    const onMotionChange = (evt) => {
      reducedMotion = evt.matches;
    };
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
    else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
  }

  function isReducedMotion() {
    return reducedMotion;
  }

  // ---------------------------------------------------------------------------
  // Math & easing
  // ---------------------------------------------------------------------------
  const ease = {
    linear: (t) => t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: (t) => {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    }
  };

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Frame-rate independent exponential approach: move `current` toward `target`. */
  function damp(current, target, sharpness, dt) {
    return lerp(current, target, 1 - Math.exp(-sharpness * dt));
  }

  // ---------------------------------------------------------------------------
  // Color helpers (hex "#rrggbb" or "#rgb")
  // ---------------------------------------------------------------------------
  const colorCache = new Map();

  function parseHex(hex) {
    if (colorCache.has(hex)) return colorCache.get(hex);
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    const rgb = Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    colorCache.set(hex, rgb);
    return rgb;
  }

  function rgba(hex, alpha) {
    const c = parseHex(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
  }

  /** amount > 0 lightens toward white, < 0 darkens toward black (range -1..1). */
  function shade(hex, amount) {
    const c = parseHex(hex);
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    const r = Math.round((t - c[0]) * p + c[0]);
    const g = Math.round((t - c[1]) * p + c[1]);
    const b = Math.round((t - c[2]) * p + c[2]);
    return `rgb(${r},${g},${b})`;
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------
  function font(size, weight) {
    return `${weight || 800} ${Math.round(size)}px ${FONT_STACK}`;
  }

  /** Split text into lines that fit maxWidth using the context's current font. */
  function wrapText(g, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (g.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /** Shrink font size until a single line fits maxWidth. Returns the size used. */
  function fitFontSize(g, text, maxWidth, size, minSize, weight) {
    let s = size;
    g.font = font(s, weight);
    while (s > minSize && g.measureText(text).width > maxWidth) {
      s -= 1;
      g.font = font(s, weight);
    }
    return s;
  }

  /** Bold game text with dark outline + optional glow (readable on any background). */
  function outlinedText(g, text, x, y, opts) {
    const o = opts || {};
    g.save();
    g.font = font(o.size || 20, o.weight || 900);
    g.textAlign = o.align || 'center';
    g.textBaseline = o.baseline || 'middle';
    g.lineJoin = 'round';
    g.lineWidth = o.outline != null ? o.outline : Math.max(3, (o.size || 20) * 0.2);
    g.strokeStyle = o.stroke || 'rgba(4,7,17,0.92)';
    g.strokeText(text, x, y);
    if (o.glow) {
      g.shadowColor = o.glow;
      g.shadowBlur = o.glowBlur || 14;
    }
    g.fillStyle = o.color || '#ffffff';
    g.fillText(text, x, y);
    g.restore();
  }

  // ---------------------------------------------------------------------------
  // Canvas helpers
  // ---------------------------------------------------------------------------
  /**
   * Make a fixed logical-size canvas crisp on HiDPI screens without changing the
   * game's coordinate system: backing store is W*dpr x H*dpr and the context is
   * pre-scaled, so all existing draw calls keep using logical units.
   * Call `apply()` again if the game ever resets the transform.
   */
  function setupHiDPICanvas(canvas, logicalW, logicalH) {
    const g = canvas.getContext('2d');
    const dpr = Math.min(2, Math.max(1, global.devicePixelRatio || 1));
    canvas.width = Math.round(logicalW * dpr);
    canvas.height = Math.round(logicalH * dpr);
    canvas.style.width = `${logicalW}px`;
    canvas.style.aspectRatio = `${logicalW} / ${logicalH}`;
    canvas.classList.add('is-fixed-canvas');
    function apply() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    apply();
    return { g, dpr, apply };
  }

  function roundRectPath(g, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  function vignette(g, w, h, strength, color) {
    const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, color || `rgba(0,0,0,${strength == null ? 0.55 : strength})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }

  /** Soft additive light blob — cheap glow without shadowBlur. */
  function glow(g, x, y, radius, hex, alpha) {
    const grad = g.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, rgba(hex, alpha == null ? 0.6 : alpha));
    grad.addColorStop(1, rgba(hex, 0));
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = grad;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    g.restore();
  }

  /** Elliptical contact shadow under an object. */
  function contactShadow(g, x, y, rx, ry, alpha) {
    g.save();
    g.fillStyle = `rgba(0,0,0,${alpha == null ? 0.35 : alpha})`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  // ---------------------------------------------------------------------------
  // Particle system (pooled; no allocations per frame once warmed up)
  // ---------------------------------------------------------------------------
  /**
   * kinds: 'dot' (glowing circle), 'spark' (streak along velocity), 'confetti'
   * (spinning quad), 'ring' (expanding shockwave), 'smoke' (growing soft puff),
   * 'star' (4-point twinkle).
   */
  function createParticles(capacity) {
    const cap = capacity || 400;
    const pool = new Array(cap);
    for (let i = 0; i < cap; i++) {
      pool[i] = { active: false };
    }
    let cursor = 0;
    let liveCount = 0;

    function spawn(p) {
      // Reuse the next slot; if the pool is full the oldest particle is recycled.
      const slot = pool[cursor];
      cursor = (cursor + 1) % cap;
      if (!slot.active) liveCount++;
      slot.active = true;
      slot.kind = p.kind || 'dot';
      slot.x = p.x;
      slot.y = p.y;
      slot.vx = p.vx || 0;
      slot.vy = p.vy || 0;
      slot.gravity = p.gravity || 0;
      slot.drag = p.drag == null ? 0 : p.drag;
      slot.life = p.life || 0.6;
      slot.maxLife = slot.life;
      slot.size = p.size || 3;
      slot.endSize = p.endSize == null ? slot.size : p.endSize;
      slot.color = p.color || '#ffffff';
      slot.additive = p.additive !== false && slot.kind !== 'smoke' && slot.kind !== 'confetti';
      slot.rot = p.rot || Math.random() * TAU;
      slot.vrot = p.vrot == null ? (Math.random() - 0.5) * 12 : p.vrot;
      slot.alpha = p.alpha == null ? 1 : p.alpha;
      slot.width = p.width || 2;
      return slot;
    }

    /** Radial burst. opts: {count, speed:[min,max], life:[min,max], size:[min,max], colors[], kind, gravity, drag, spread, angle} */
    function burst(x, y, opts) {
      const o = opts || {};
      let count = o.count || 14;
      if (reducedMotion) count = Math.max(1, Math.round(count * 0.35));
      const sp = o.speed || [60, 220];
      const lf = o.life || [0.35, 0.75];
      const sz = o.size || [2, 4.5];
      const colors = o.colors || [o.color || '#ffffff'];
      const spread = o.spread == null ? TAU : o.spread;
      const baseAngle = o.angle == null ? 0 : o.angle;
      for (let i = 0; i < count; i++) {
        const ang = baseAngle + (spread === TAU ? Math.random() * TAU : (Math.random() - 0.5) * spread);
        const speed = sp[0] + Math.random() * (sp[1] - sp[0]);
        const size = sz[0] + Math.random() * (sz[1] - sz[0]);
        spawn({
          kind: o.kind || 'dot',
          x: x + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0),
          y: y + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0),
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          gravity: o.gravity || 0,
          drag: o.drag == null ? 2.2 : o.drag,
          life: lf[0] + Math.random() * (lf[1] - lf[0]),
          size,
          endSize: o.endSize != null ? o.endSize : o.kind === 'smoke' ? size * 3 : size * 0.2,
          color: colors[(Math.random() * colors.length) | 0],
          additive: o.additive,
          width: o.width
        });
      }
    }

    function ring(x, y, opts) {
      const o = opts || {};
      spawn({
        kind: 'ring',
        x,
        y,
        life: o.life || 0.45,
        size: o.from || 6,
        endSize: o.to || 60,
        color: o.color || '#ffffff',
        width: o.width || 3,
        additive: o.additive
      });
    }

    function update(dt) {
      if (liveCount === 0) return;
      for (let i = 0; i < cap; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          liveCount--;
          continue;
        }
        if (p.drag) {
          const k = Math.exp(-p.drag * dt);
          p.vx *= k;
          p.vy *= k;
        }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
      }
    }

    function draw(g) {
      if (liveCount === 0) return;
      g.save();
      for (let i = 0; i < cap; i++) {
        const p = pool[i];
        if (!p.active) continue;
        const t = 1 - p.life / p.maxLife; // 0 -> 1
        const size = p.size + (p.endSize - p.size) * (p.kind === 'ring' ? ease.outCubic(t) : t);
        const a = p.alpha * (p.kind === 'ring' || p.kind === 'smoke' ? 1 - t : Math.min(1, (1 - t) * 1.6));
        if (a <= 0.01 || size <= 0.05) continue;
        g.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
        g.globalAlpha = a;
        if (p.kind === 'dot') {
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(p.x, p.y, size, 0, TAU);
          g.fill();
          if (p.additive && size > 1.5) {
            g.globalAlpha = a * 0.28;
            g.beginPath();
            g.arc(p.x, p.y, size * 2.4, 0, TAU);
            g.fill();
          }
        } else if (p.kind === 'spark') {
          const len = Math.min(26, Math.hypot(p.vx, p.vy) * 0.045 + size);
          const ang = Math.atan2(p.vy, p.vx);
          g.strokeStyle = p.color;
          g.lineWidth = Math.max(1, size * 0.7);
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
          g.stroke();
        } else if (p.kind === 'confetti') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.scale(1, Math.cos(p.rot * 1.7));
          g.fillStyle = p.color;
          g.fillRect(-size, -size * 0.55, size * 2, size * 1.1);
          g.restore();
        } else if (p.kind === 'ring') {
          g.strokeStyle = p.color;
          g.lineWidth = Math.max(0.5, p.width * (1 - t));
          g.beginPath();
          g.arc(p.x, p.y, size, 0, TAU);
          g.stroke();
        } else if (p.kind === 'smoke') {
          g.globalAlpha = a * 0.45;
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(p.x, p.y, size, 0, TAU);
          g.fill();
        } else if (p.kind === 'star') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot * 0.3);
          g.fillStyle = p.color;
          g.beginPath();
          for (let k = 0; k < 8; k++) {
            const r = k % 2 === 0 ? size * 1.6 : size * 0.45;
            const ang = (k / 8) * TAU;
            g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
          }
          g.closePath();
          g.fill();
          g.restore();
        }
      }
      g.restore();
    }

    function clear() {
      for (let i = 0; i < cap; i++) pool[i].active = false;
      liveCount = 0;
    }

    return {
      spawn,
      burst,
      ring,
      update,
      draw,
      clear,
      get count() {
        return liveCount;
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Camera shake (trauma model: shake = trauma^2, decays linearly)
  // ---------------------------------------------------------------------------
  function createShake(maxOffset) {
    const max = maxOffset || 10;
    let trauma = 0;
    let time = 0;
    return {
      add(amount) {
        if (reducedMotion) return;
        trauma = Math.min(1, trauma + amount);
      },
      update(dt) {
        time += dt;
        trauma = Math.max(0, trauma - dt * 1.6);
      },
      /** Translate the context; call inside save()/restore(). */
      apply(g) {
        if (trauma <= 0) return;
        const s = trauma * trauma * max;
        g.translate(Math.sin(time * 67.3) * s, Math.cos(time * 53.1) * s);
      },
      reset() {
        trauma = 0;
      },
      get value() {
        return trauma;
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Floating "juice" text (score popups, combo callouts)
  // ---------------------------------------------------------------------------
  function createFloatingTexts(capacity) {
    const cap = capacity || 24;
    const items = [];

    function add(x, y, text, opts) {
      const o = opts || {};
      if (items.length >= cap) items.shift();
      items.push({
        x,
        y,
        text: String(text),
        color: o.color || '#fde047',
        size: o.size || 20,
        life: o.life || 0.9,
        maxLife: o.life || 0.9,
        rise: o.rise == null ? 46 : o.rise,
        glow: o.glow || null
      });
    }

    function update(dt) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.life -= dt;
        if (it.life <= 0) items.splice(i, 1);
      }
    }

    function draw(g) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const t = 1 - it.life / it.maxLife;
        const pop = t < 0.18 ? ease.outBack(t / 0.18) : 1;
        const alpha = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
        g.save();
        g.globalAlpha = Math.max(0, alpha);
        g.translate(it.x, it.y - ease.outCubic(t) * it.rise);
        g.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
        outlinedText(g, it.text, 0, 0, { size: it.size, color: it.color, glow: it.glow });
        g.restore();
      }
    }

    function clear() {
      items.length = 0;
    }

    return { add, update, draw, clear };
  }

  // ---------------------------------------------------------------------------
  // State panel (pause / game over / victory / level clear) drawn on canvas
  // ---------------------------------------------------------------------------
  /**
   * opts: {
   *   title, subtitle, lines[] (stat rows "Label|Value"), hint,
   *   accent (#hex), icon (emoji), tone: 'pause'|'over'|'win'|'info',
   *   t (seconds since shown, drives entrance animation), backdrop (0..1)
   * }
   */
  function drawStatePanel(g, w, h, opts) {
    const o = opts || {};
    const accent = o.accent || '#38bdf8';
    const t = o.t == null ? 1 : o.t;
    const enter = reducedMotion ? 1 : clamp(t / 0.38, 0, 1);
    const e = ease.outBack(enter);

    g.save();
    // Backdrop
    g.globalAlpha = clamp(enter * 1.4, 0, 1);
    g.fillStyle = `rgba(3,6,16,${o.backdrop == null ? 0.66 : o.backdrop})`;
    g.fillRect(0, 0, w, h);
    vignette(g, w, h, 0.5);
    g.globalAlpha = 1;

    const pw = Math.min(w - 32, 440);
    const titleSize = clamp(pw * 0.085, 22, 36);
    g.font = font(15, 700);
    const subLines = o.subtitle ? wrapText(g, o.subtitle, pw - 56) : [];
    const rows = o.lines || [];
    const ph =
      (o.icon ? 58 : 18) +
      titleSize +
      18 +
      subLines.length * 21 +
      (rows.length ? rows.length * 30 + 14 : 0) +
      (o.hint ? 50 : 18);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;

    g.translate(w / 2, h / 2);
    g.scale(0.86 + 0.14 * e, 0.86 + 0.14 * e);
    g.translate(-w / 2, -h / 2 + (1 - enter) * 18);
    g.globalAlpha = enter;

    // Glow halo
    glow(g, w / 2, py + ph / 2, pw * 0.75, accent, 0.22);

    // Panel body
    roundRectPath(g, px, py, pw, ph, 20);
    const body = g.createLinearGradient(0, py, 0, py + ph);
    body.addColorStop(0, 'rgba(22,32,60,0.97)');
    body.addColorStop(1, 'rgba(9,14,30,0.97)');
    g.fillStyle = body;
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 30;
    g.shadowOffsetY = 12;
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 1.5;
    g.strokeStyle = rgba(accent, 0.65);
    g.stroke();
    // Top accent bar
    g.save();
    roundRectPath(g, px, py, pw, ph, 20);
    g.clip();
    const bar = g.createLinearGradient(px, 0, px + pw, 0);
    bar.addColorStop(0, rgba(accent, 0));
    bar.addColorStop(0.5, accent);
    bar.addColorStop(1, rgba(accent, 0));
    g.fillStyle = bar;
    g.fillRect(px, py, pw, 3);
    g.restore();

    let cy = py + 18;
    if (o.icon) {
      g.font = `40px ${FONT_STACK}`;
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const bob = reducedMotion ? 0 : Math.sin(t * 3) * 3;
      g.fillText(o.icon, w / 2, cy + 20 + bob);
      cy += 46;
    }

    // Title with gradient fill
    const fitted = fitFontSize(g, o.title || '', pw - 40, titleSize, 16, 900);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(2,4,12,0.9)';
    g.strokeText(o.title || '', w / 2, cy + fitted / 2);
    const tg = g.createLinearGradient(0, cy, 0, cy + fitted);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(1, shade(accent, 0.35));
    g.fillStyle = tg;
    g.shadowColor = rgba(accent, 0.8);
    g.shadowBlur = 16;
    g.fillText(o.title || '', w / 2, cy + fitted / 2);
    g.shadowColor = 'transparent';
    cy += fitted + 14;

    if (subLines.length) {
      g.font = font(15, 700);
      g.fillStyle = '#cbd5e1';
      subLines.forEach((line) => {
        g.fillText(line, w / 2, cy + 8);
        cy += 21;
      });
    }

    if (rows.length) {
      cy += 8;
      rows.forEach((row) => {
        const parts = String(row).split('|');
        roundRectPath(g, px + 22, cy, pw - 44, 25, 8);
        g.fillStyle = 'rgba(148,163,184,0.09)';
        g.fill();
        g.font = font(13, 700);
        g.textAlign = 'left';
        g.fillStyle = '#94a3b8';
        g.fillText(parts[0], px + 34, cy + 13);
        g.textAlign = 'right';
        g.font = font(14, 900);
        g.fillStyle = '#f8fafc';
        g.fillText(parts[1] || '', px + pw - 34, cy + 13);
        g.textAlign = 'center';
        cy += 30;
      });
    }

    if (o.hint) {
      cy += 12;
      const pulse = reducedMotion ? 1 : 0.75 + Math.sin(t * 4.2) * 0.25;
      g.font = font(14, 800);
      const hw = Math.min(pw - 40, g.measureText(o.hint).width + 36);
      roundRectPath(g, w / 2 - hw / 2, cy, hw, 32, 16);
      const hb = g.createLinearGradient(0, cy, 0, cy + 32);
      hb.addColorStop(0, rgba(accent, 0.95));
      hb.addColorStop(1, shade(accent, -0.35));
      g.fillStyle = hb;
      g.globalAlpha = enter * pulse;
      g.fill();
      g.globalAlpha = enter;
      g.fillStyle = '#ffffff';
      const hintSize = fitFontSize(g, o.hint, hw - 20, 14, 10, 800);
      g.font = font(hintSize, 800);
      g.fillText(o.hint, w / 2, cy + 16);
    }

    g.restore();
  }

  /** Big centred banner (LEVEL UP / COMBO) that scales in and fades out. t in seconds, dur total. */
  function drawBanner(g, w, h, text, opts) {
    const o = opts || {};
    const dur = o.duration || 1.4;
    const t = clamp((o.t || 0) / dur, 0, 1);
    const inT = clamp(t / 0.22, 0, 1);
    const outT = clamp((t - 0.75) / 0.25, 0, 1);
    const scale = reducedMotion ? 1 : 0.55 + ease.outBack(inT) * 0.45 + outT * 0.1;
    const alpha = Math.min(inT * 1.5, 1) * (1 - outT);
    if (alpha <= 0) return;
    const accent = o.accent || '#fde047';
    const y = o.y == null ? h * 0.42 : o.y;
    g.save();
    g.globalAlpha = alpha;
    // Light band behind
    const band = g.createLinearGradient(0, 0, w, 0);
    band.addColorStop(0, rgba(accent, 0));
    band.addColorStop(0.5, rgba(accent, 0.28));
    band.addColorStop(1, rgba(accent, 0));
    g.fillStyle = band;
    const bandH = (o.size || 38) * 1.9;
    g.fillRect(0, y - bandH / 2, w, bandH);
    g.translate(w / 2, y);
    g.scale(scale, scale);
    const size = fitFontSize(g, text, w * 0.86, o.size || 38, 14, 900);
    outlinedText(g, text, 0, 0, { size, color: o.color || '#ffffff', glow: accent, glowBlur: 22, outline: size * 0.22 });
    if (o.sub) {
      outlinedText(g, o.sub, 0, size * 0.95, { size: Math.max(12, size * 0.42), color: shade(accent, 0.3), weight: 800 });
    }
    g.restore();
  }

  ArcadeHub.fx = {
    FONT_STACK,
    TAU,
    ease,
    clamp,
    lerp,
    damp,
    rgba,
    shade,
    font,
    wrapText,
    fitFontSize,
    outlinedText,
    setupHiDPICanvas,
    roundRectPath,
    vignette,
    glow,
    contactShadow,
    createParticles,
    createShake,
    createFloatingTexts,
    drawStatePanel,
    drawBanner,
    isReducedMotion
  };
})(window);
