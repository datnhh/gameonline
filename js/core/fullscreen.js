(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});

  let pseudoTarget = null;
  const listeners = [];

  function getNativeFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function isFullscreen() {
    return Boolean(getNativeFullscreenElement() || pseudoTarget);
  }

  function notifyChange() {
    const active = isFullscreen();
    listeners.forEach((cb) => {
      try {
        cb(active);
      } catch (_err) {
        // Ignore callback errors
      }
    });
    global.dispatchEvent(new Event('resize'));
  }

  async function enterFullscreen(targetElement) {
    const el = targetElement || document.documentElement;
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (req) {
      try {
        await req.call(el);
        notifyChange();
        return true;
      } catch (_err) {
        // Fall through to pseudo-fullscreen on mobile browsers
      }
    }

    if (el && el.classList) {
      pseudoTarget = el;
      el.classList.add('pseudo-fullscreen');
      notifyChange();
      return true;
    }
    return false;
  }

  async function exitFullscreen() {
    if (pseudoTarget) {
      pseudoTarget.classList.remove('pseudo-fullscreen');
      pseudoTarget = null;
      notifyChange();
      return true;
    }

    const exit =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;

    if (exit && getNativeFullscreenElement()) {
      try {
        await exit.call(document);
      } catch (_err) {
        // Ignore
      }
    }
    notifyChange();
    return true;
  }

  function toggle(targetElement) {
    if (isFullscreen()) {
      return exitFullscreen();
    }
    return enterFullscreen(targetElement);
  }

  function onChange(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  }

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
    (evtName) => {
      document.addEventListener(evtName, notifyChange);
    }
  );

  ArcadeHub.fullscreen = {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggle,
    onChange
  };
})(window);
