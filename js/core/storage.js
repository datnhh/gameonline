(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});

  const STORAGE_KEYS = {
    PLAYER_NAME: 'cyberarcade_player_name_v1',
    LEADERBOARDS: 'cyberarcade_leaderboards_v1',
    SOUND_ENABLED: 'cyberarcade_sound_enabled_v1'
  };

  const memoryFallback = {};

  function safeGetItem(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (_err) {
      return Object.prototype.hasOwnProperty.call(memoryFallback, key)
        ? memoryFallback[key]
        : null;
    }
  }

  function safeSetItem(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (_err) {
      memoryFallback[key] = String(value);
    }
  }

  function sanitizeName(rawName) {
    if (typeof rawName !== 'string') return '';
    return rawName.replace(/\s+/g, ' ').trim().slice(0, 18);
  }

  function getPlayerName() {
    const saved = safeGetItem(STORAGE_KEYS.PLAYER_NAME);
    return sanitizeName(saved || '');
  }

  function setPlayerName(newName) {
    const clean = sanitizeName(newName);
    if (clean.length < 2) {
      return { ok: false, name: '' };
    }
    safeSetItem(STORAGE_KEYS.PLAYER_NAME, clean);
    return { ok: true, name: clean };
  }

  function loadAllLeaderboards() {
    const raw = safeGetItem(STORAGE_KEYS.LEADERBOARDS);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
      return {};
    }
  }

  function saveAllLeaderboards(data) {
    safeSetItem(STORAGE_KEYS.LEADERBOARDS, JSON.stringify(data));
  }

  function getTop3(gameId) {
    const all = loadAllLeaderboards();
    const list = Array.isArray(all[gameId]) ? all[gameId] : [];
    return list
      .filter((item) => item && typeof item.score === 'number' && !Number.isNaN(item.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  function getBestScore(gameId) {
    const top = getTop3(gameId);
    return top.length > 0 ? top[0].score : 0;
  }

  /**
   * Lưu điểm mới vào bảng xếp hạng của một game và giữ lại Top 3 cao nhất.
   * runId (tùy chọn): mã của một lượt chơi nhiều ván. Điểm mới thay thế dòng cũ cùng
   * runId thay vì thêm dòng mới, để một lượt chơi không chiếm nhiều chỗ trong Top 3.
   */
  function submitScore(gameId, rawScore, detailText, runId) {
    const numericScore = Math.max(0, Math.round(Number(rawScore) || 0));
    if (numericScore <= 0) {
      return {
        isTop3: false,
        rank: null,
        top3: getTop3(gameId)
      };
    }

    const playerName = getPlayerName() || 'Người chơi';
    const all = loadAllLeaderboards();
    let currentList = Array.isArray(all[gameId]) ? all[gameId] : [];

    let previousRank = null;
    if (runId) {
      const prevIndex = currentList.findIndex((item) => item && item.runId === runId);
      if (prevIndex !== -1) {
        const prev = currentList[prevIndex];
        if (prev.score >= numericScore) {
          // Same run, no improvement: keep the existing entry untouched
          return { isTop3: true, rank: prevIndex + 1, rankImproved: false, entry: prev, top3: currentList };
        }
        previousRank = prevIndex + 1;
        currentList = currentList.filter((_item, idx) => idx !== prevIndex);
      }
    }

    const newEntry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: playerName,
      score: numericScore,
      detail: detailText ? String(detailText).slice(0, 40) : '',
      timestamp: Date.now()
    };
    if (runId) newEntry.runId = String(runId);

    const updated = [...currentList, newEntry]
      .filter((item) => item && typeof item.score === 'number' && !Number.isNaN(item.score))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.timestamp || 0) - (b.timestamp || 0);
      })
      .slice(0, 3);

    all[gameId] = updated;
    saveAllLeaderboards(all);

    const rankIndex = updated.findIndex((item) => item.id === newEntry.id);
    const rank = rankIndex !== -1 ? rankIndex + 1 : null;
    return {
      isTop3: rankIndex !== -1,
      rank,
      rankImproved: rank !== null && (previousRank === null || rank < previousRank),
      entry: newEntry,
      top3: updated
    };
  }

  function getStatsSummary(gameIds) {
    const all = loadAllLeaderboards();
    let totalRecords = 0;
    let topOneForCurrentPlayer = 0;
    const currentName = getPlayerName().toLowerCase();

    gameIds.forEach((id) => {
      const list = Array.isArray(all[id]) ? all[id] : [];
      totalRecords += list.length;
      if (
        currentName &&
        list.length > 0 &&
        String(list[0].name || '').toLowerCase() === currentName
      ) {
        topOneForCurrentPlayer += 1;
      }
    });

    return {
      totalRecords,
      topOneForCurrentPlayer
    };
  }

  function isSoundEnabled() {
    const val = safeGetItem(STORAGE_KEYS.SOUND_ENABLED);
    return val === null ? true : val === 'true';
  }

  function setSoundEnabled(enabled) {
    safeSetItem(STORAGE_KEYS.SOUND_ENABLED, enabled ? 'true' : 'false');
  }

  ArcadeHub.storage = {
    getPlayerName,
    setPlayerName,
    getTop3,
    getBestScore,
    submitScore,
    getStatsSummary,
    isSoundEnabled,
    setSoundEnabled
  };
})(window);
