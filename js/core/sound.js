(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});

  let audioCtx = null;
  let enabled = ArcadeHub.storage ? ArcadeHub.storage.isSoundEnabled() : true;

  function ensureContext() {
    if (!enabled) return null;
    const AudioContextClass = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      try {
        audioCtx = new AudioContextClass();
      } catch (_err) {
        return null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, gainVal, slideToFreq) {
    const ctx = ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slideToFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideToFreq), now + duration);
      }

      gain.gain.setValueAtTime(gainVal || 0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (_err) {
      // Ignore audio errors on restricted devices
    }
  }

  function playNoise(duration, gainVal) {
    const ctx = ensureContext();
    if (!ctx) return;

    try {
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainVal || 0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(ctx.currentTime);
      whiteNoise.stop(ctx.currentTime + duration);
    } catch (_err) {
      // Ignore audio errors
    }
  }

  const sound = {
    isEnabled() {
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      if (ArcadeHub.storage) {
        ArcadeHub.storage.setSoundEnabled(enabled);
      }
      if (enabled) {
        sound.click();
      }
      return enabled;
    },
    click() {
      playTone(520, 'triangle', 0.06, 0.08, 680);
    },
    move() {
      playTone(380, 'sine', 0.07, 0.09, 540);
    },
    tile() {
      playTone(300, 'triangle', 0.08, 0.12, 190);
    },
    error() {
      playTone(210, 'sawtooth', 0.18, 0.1, 130);
    },
    shoot() {
      playTone(280, 'square', 0.07, 0.07, 95);
    },
    cannon() {
      playNoise(0.24, 0.22);
      playTone(130, 'sawtooth', 0.22, 0.14, 42);
    },
    explosion() {
      playNoise(0.35, 0.25);
      playTone(110, 'triangle', 0.3, 0.16, 35);
    },
    hit() {
      playTone(170, 'sawtooth', 0.11, 0.12, 75);
    },
    boost() {
      playTone(260, 'sawtooth', 0.18, 0.08, 620);
    },
    pop() {
      playTone(620, 'sine', 0.09, 0.1, 1180);
    },
    coin() {
      playTone(988, 'square', 0.05, 0.05);
      setTimeout(() => playTone(1318, 'square', 0.09, 0.05), 55);
    },
    whoosh() {
      playNoise(0.16, 0.08);
    },
    levelUp() {
      const notes = [392, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        setTimeout(() => {
          playTone(n, 'square', 0.12, 0.06, n * 1.01);
        }, idx * 70);
      });
    },
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        setTimeout(() => {
          playTone(n, 'triangle', 0.18, 0.12, n * 1.03);
        }, idx * 90);
      });
    },
    gameOver() {
      const notes = [392, 349.23, 311.13, 261.63];
      notes.forEach((n, idx) => {
        setTimeout(() => {
          playTone(n, 'sawtooth', 0.2, 0.09, n * 0.94);
        }, idx * 110);
      });
    }
  };

  ArcadeHub.sound = sound;
})(window);
