(() => {
  "use strict";

  const STORAGE_KEY = "shortcuts";
  const ENABLED_KEY = "enabled";
  const TOAST_MS = 1400;

  const DEFAULT_SHORTCUTS = {
    playPause: "KeyK",
    seekBack: "KeyJ",
    seekForward: "KeyL",
    seekBackSmall: "ArrowLeft",
    seekForwardSmall: "ArrowRight",
    volumeUp: "ArrowUp",
    volumeDown: "ArrowDown",
    mute: "KeyM",
    fullscreen: "KeyF",
    theater: "KeyT",
    captions: "KeyC",
    speedDown: "Shift+Comma",
    speedUp: "Shift+Period",
    speedDefault: "",
    speedToggleDefault: "",
    nextVideo: "Shift+KeyN",
    prevVideo: "Shift+KeyP",
  };

  const SEEK_SECONDS = {
    seekBack: -10,
    seekForward: 10,
    seekBackSmall: -5,
    seekForwardSmall: 5,
  };

  const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const DEFAULT_RATE = 1;

  /** @type {Record<string, string>} */
  let shortcuts = { ...DEFAULT_SHORTCUTS };
  let enabled = true;
  let bound = false;
  let lastUrl = location.href;
  let moviePlayer = null;
  /** Last non-default rate for toggle-with-default. */
  let savedNonDefaultRate = 1.5;

  function normalizeCombo(event) {
    const parts = [];
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");
    // Ignore bare modifiers
    if (
      event.code === "ControlLeft" ||
      event.code === "ControlRight" ||
      event.code === "ShiftLeft" ||
      event.code === "ShiftRight" ||
      event.code === "AltLeft" ||
      event.code === "AltRight" ||
      event.code === "MetaLeft" ||
      event.code === "MetaRight"
    ) {
      return "";
    }
    parts.push(event.code);
    return parts.join("+");
  }

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    const el = target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]'
    );
    return Boolean(el);
  }

  function getMoviePlayer() {
    if (moviePlayer && document.contains(moviePlayer)) return moviePlayer;
    moviePlayer =
      document.getElementById("movie_player") ||
      document.querySelector(".html5-video-player");
    return moviePlayer;
  }

  function getVideo() {
    const player = getMoviePlayer();
    if (!player) return null;
    return player.querySelector("video");
  }

  function ensurePlayerApi() {
    const player = getMoviePlayer();
    if (!player) return null;
    // YouTube player API methods exist on the movie_player element
    if (typeof player.playVideo === "function") return player;
    return player;
  }

  function showToast(text) {
    let root = document.getElementById("ysr-toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ysr-toast-root";
      Object.assign(root.style, {
        position: "fixed",
        left: "50%",
        bottom: "72px",
        transform: "translateX(-50%)",
        zIndex: "2147483646",
        pointerEvents: "none",
        fontFamily:
          '"Segoe UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
      });
      (document.documentElement || document.body).appendChild(root);
    }
    root.textContent = "";
    const toast = document.createElement("div");
    Object.assign(toast.style, {
      background: "rgba(15, 15, 15, 0.88)",
      color: "#fff",
      padding: "10px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      letterSpacing: "0.02em",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      opacity: "0",
      transition: "opacity 120ms ease",
    });
    toast.textContent = text;
    root.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 160);
    }, TOAST_MS);
  }

  function seekBy(seconds) {
    const player = ensurePlayerApi();
    const video = getVideo();
    if (player && typeof player.seekBy === "function") {
      player.seekBy(seconds);
    } else if (video) {
      video.currentTime = Math.max(0, video.currentTime + seconds);
    } else {
      return false;
    }
    const label = seconds > 0 ? `+${seconds}秒` : `${seconds}秒`;
    showToast(label);
    return true;
  }

  function togglePlay() {
    const player = ensurePlayerApi();
    const video = getVideo();
    if (player && typeof player.getPlayerState === "function") {
      // 1 = playing, 2 = paused
      if (player.getPlayerState() === 1) {
        player.pauseVideo();
        showToast("一時停止");
      } else {
        player.playVideo();
        showToast("再生");
      }
      return true;
    }
    if (!video) return false;
    if (video.paused) {
      video.play();
      showToast("再生");
    } else {
      video.pause();
      showToast("一時停止");
    }
    return true;
  }

  function adjustVolume(delta) {
    const player = ensurePlayerApi();
    const video = getVideo();
    if (player && typeof player.setVolume === "function") {
      const current =
        typeof player.getVolume === "function" ? player.getVolume() : 100;
      const next = Math.max(0, Math.min(100, current + delta));
      player.setVolume(next);
      if (next > 0 && typeof player.unMute === "function") player.unMute();
      showToast(`音量 ${Math.round(next)}%`);
      return true;
    }
    if (!video) return false;
    video.volume = Math.max(0, Math.min(1, video.volume + delta / 100));
    video.muted = video.volume === 0;
    showToast(`音量 ${Math.round(video.volume * 100)}%`);
    return true;
  }

  function toggleMute() {
    const player = ensurePlayerApi();
    const video = getVideo();
    if (player && typeof player.isMuted === "function") {
      if (player.isMuted()) {
        player.unMute();
        showToast("ミュート解除");
      } else {
        player.mute();
        showToast("ミュート");
      }
      return true;
    }
    if (!video) return false;
    video.muted = !video.muted;
    showToast(video.muted ? "ミュート" : "ミュート解除");
    return true;
  }

  function toggleFullscreen() {
    const player = ensurePlayerApi();
    if (player && typeof player.toggleFullscreen === "function") {
      player.toggleFullscreen();
      return true;
    }
    const video = getVideo();
    if (!video) return false;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      (video.parentElement || video).requestFullscreen?.();
    }
    return true;
  }

  function toggleTheater() {
    const btn =
      document.querySelector(".ytp-size-button") ||
      document.querySelector('button[aria-label*="シアター"]') ||
      document.querySelector('button[aria-label*="Theater"]') ||
      document.querySelector('button[title*="Theater"]');
    if (btn) {
      btn.click();
      return true;
    }
    const player = ensurePlayerApi();
    if (player && typeof player.setSizeStyle === "function") {
      // fallback: no-op toast
      showToast("シアター切替ボタンが見つかりません");
      return false;
    }
    showToast("シアター切替ボタンが見つかりません");
    return false;
  }

  function toggleCaptions() {
    const player = ensurePlayerApi();
    if (player && typeof player.toggleSubtitlesOn === "function") {
      // Prefer clicking the button for reliable toggle
    }
    const btn =
      document.querySelector(".ytp-subtitles-button") ||
      document.querySelector('button[aria-label*="字幕"]') ||
      document.querySelector('button[aria-label*="Subtitles"]') ||
      document.querySelector('button[aria-label*="Captions"]');
    if (btn) {
      btn.click();
      showToast("字幕");
      return true;
    }
    showToast("字幕ボタンが見つかりません");
    return false;
  }

  function getPlaybackRate() {
    const video = getVideo();
    const player = ensurePlayerApi();
    return (
      (player && typeof player.getPlaybackRate === "function"
        ? player.getPlaybackRate()
        : null) ??
      video?.playbackRate ??
      DEFAULT_RATE
    );
  }

  function setPlaybackRate(next) {
    const video = getVideo();
    const player = ensurePlayerApi();
    if (player && typeof player.setPlaybackRate === "function") {
      player.setPlaybackRate(next);
    } else if (video) {
      video.playbackRate = next;
    } else {
      return false;
    }
    if (Math.abs(next - DEFAULT_RATE) > 0.001) {
      savedNonDefaultRate = next;
    }
    showToast(`${next}x`);
    return true;
  }

  function isDefaultRate(rate) {
    return Math.abs(rate - DEFAULT_RATE) < 0.001;
  }

  function changeSpeed(direction) {
    const rate = getPlaybackRate();
    const idx = SPEED_STEPS.findIndex((s) => Math.abs(s - rate) < 0.001);
    let nextIdx;
    if (idx === -1) {
      nextIdx =
        direction > 0
          ? SPEED_STEPS.findIndex((s) => s > rate)
          : [...SPEED_STEPS].reverse().findIndex((s) => s < rate);
      if (direction < 0 && nextIdx !== -1) {
        nextIdx = SPEED_STEPS.length - 1 - nextIdx;
      }
      if (nextIdx === -1) nextIdx = direction > 0 ? SPEED_STEPS.length - 1 : 0;
    } else {
      nextIdx = Math.max(0, Math.min(SPEED_STEPS.length - 1, idx + direction));
    }
    return setPlaybackRate(SPEED_STEPS[nextIdx]);
  }

  function resetSpeed() {
    return setPlaybackRate(DEFAULT_RATE);
  }

  function toggleSpeedDefault() {
    const rate = getPlaybackRate();
    if (!isDefaultRate(rate)) {
      savedNonDefaultRate = rate;
      return setPlaybackRate(DEFAULT_RATE);
    }
    return setPlaybackRate(savedNonDefaultRate);
  }

  function clickNav(selectorList) {
    for (const sel of selectorList) {
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        return true;
      }
    }
    return false;
  }

  function nextVideo() {
    const ok = clickNav([
      ".ytp-next-button",
      'a.ytp-next-button',
      'a[aria-label*="次"]',
      'a[aria-label*="Next"]',
      'button[aria-label*="次"]',
      'button[aria-label*="Next"]',
    ]);
    if (ok) showToast("次の動画");
    else showToast("次の動画ボタンが見つかりません");
    return ok;
  }

  function prevVideo() {
    // YouTube rarely exposes prev; try history back on watch page as fallback
    const ok = clickNav([
      ".ytp-prev-button",
      'a.ytp-prev-button',
      'a[aria-label*="前"]',
      'a[aria-label*="Previous"]',
      'button[aria-label*="前"]',
      'button[aria-label*="Previous"]',
    ]);
    if (ok) {
      showToast("前の動画");
      return true;
    }
    if (/\/watch/.test(location.pathname)) {
      history.back();
      showToast("戻る");
      return true;
    }
    showToast("前の動画ボタンが見つかりません");
    return false;
  }

  const ACTIONS = {
    playPause: togglePlay,
    seekBack: () => seekBy(SEEK_SECONDS.seekBack),
    seekForward: () => seekBy(SEEK_SECONDS.seekForward),
    seekBackSmall: () => seekBy(SEEK_SECONDS.seekBackSmall),
    seekForwardSmall: () => seekBy(SEEK_SECONDS.seekForwardSmall),
    volumeUp: () => adjustVolume(5),
    volumeDown: () => adjustVolume(-5),
    mute: toggleMute,
    fullscreen: toggleFullscreen,
    theater: toggleTheater,
    captions: toggleCaptions,
    speedDown: () => changeSpeed(-1),
    speedUp: () => changeSpeed(1),
    speedDefault: resetSpeed,
    speedToggleDefault: toggleSpeedDefault,
    nextVideo,
    prevVideo,
  };

  function findActionForEvent(event) {
    const combo = normalizeCombo(event);
    if (!combo) return null;
    for (const [action, binding] of Object.entries(shortcuts)) {
      if (binding === combo) return action;
    }
    return null;
  }

  function onKeyDown(event) {
    if (!enabled) return;
    if (event.defaultPrevented) return;
    if (event.isComposing) return;
    if (isEditableTarget(event.target)) return;

    // Only act on watch / shorts / embedded player pages with a video
    const path = location.pathname;
    const isWatchLike =
      path === "/watch" ||
      path.startsWith("/watch") ||
      path.startsWith("/shorts") ||
      path.startsWith("/live") ||
      Boolean(getMoviePlayer());
    if (!isWatchLike) return;

    const action = findActionForEvent(event);
    if (!action) return;

    // Prefer our handler; stop YouTube's duplicate handling for the same key
    const fn = ACTIONS[action];
    if (!fn) return;
    const handled = fn();
    if (handled !== false) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }
  }

  function refreshPlayerRef() {
    moviePlayer = null;
    getMoviePlayer();
  }

  function onNavigated() {
    if (location.href === lastUrl) {
      refreshPlayerRef();
      return;
    }
    lastUrl = location.href;
    refreshPlayerRef();
  }

  function installNavigationHooks() {
    // YouTube fires these on SPA route changes
    document.addEventListener("yt-navigate-finish", onNavigated, true);
    document.addEventListener("yt-page-data-updated", onNavigated, true);
    window.addEventListener("yt-navigate-finish", onNavigated, true);

    // History API patches as a belt-and-suspenders fallback
    const wrap = (type) => {
      const original = history[type];
      history[type] = function (...args) {
        const ret = original.apply(this, args);
        queueMicrotask(onNavigated);
        return ret;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", onNavigated, true);

    // URL observer for any missed navigation
    setInterval(() => {
      if (location.href !== lastUrl) onNavigated();
    }, 800);
  }

  function bindKeys() {
    if (bound) return;
    // Capture on window only (avoid double-firing with document)
    window.addEventListener("keydown", onKeyDown, true);
    bound = true;
  }

  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get({
        [STORAGE_KEY]: DEFAULT_SHORTCUTS,
        [ENABLED_KEY]: true,
      });
      shortcuts = { ...DEFAULT_SHORTCUTS, ...(data[STORAGE_KEY] || {}) };
      enabled = data[ENABLED_KEY] !== false;
    } catch {
      shortcuts = { ...DEFAULT_SHORTCUTS };
      enabled = true;
    }
  }

  function watchSettings() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" && area !== "local") return;
      if (changes[STORAGE_KEY]) {
        shortcuts = {
          ...DEFAULT_SHORTCUTS,
          ...(changes[STORAGE_KEY].newValue || {}),
        };
      }
      if (changes[ENABLED_KEY]) {
        enabled = changes[ENABLED_KEY].newValue !== false;
      }
    });
  }

  async function init() {
    await loadSettings();
    watchSettings();
    bindKeys();
    installNavigationHooks();
    refreshPlayerRef();

    // Re-acquire player when DOM swaps the player node
    const obs = new MutationObserver(() => {
      if (!moviePlayer || !document.contains(moviePlayer)) {
        refreshPlayerRef();
      }
    });
    const startObs = () => {
      if (document.documentElement) {
        obs.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      }
    };
    if (document.documentElement) startObs();
    else document.addEventListener("DOMContentLoaded", startObs, { once: true });
  }

  init();
})();
