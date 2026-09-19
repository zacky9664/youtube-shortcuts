(() => {
  const actionsEl = document.getElementById("actions");
  const enabledEl = document.getElementById("enabled");
  const resetEl = document.getElementById("reset");
  const statusEl = document.getElementById("status");

  /** @type {Record<string, string>} */
  let shortcuts = { ...DEFAULT_SHORTCUTS };
  let listeningId = null;
  /** @type {((event: KeyboardEvent) => void) | null} */
  let activeKeyHandler = null;

  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle("error", isError);
  }

  function conflictFor(actionId, combo) {
    if (!combo) return null;
    for (const [id, value] of Object.entries(shortcuts)) {
      if (id !== actionId && value === combo) return id;
    }
    return null;
  }

  function stopListen() {
    if (activeKeyHandler) {
      window.removeEventListener("keydown", activeKeyHandler, true);
      activeKeyHandler = null;
    }
    listeningId = null;
  }

  async function save() {
    await chrome.storage.sync.set({
      [STORAGE_KEY]: shortcuts,
      [ENABLED_KEY]: enabledEl.checked,
    });
  }

  function render() {
    actionsEl.textContent = "";
    let currentGroup = "";
    for (const meta of ACTION_META) {
      if (meta.group !== currentGroup) {
        currentGroup = meta.group;
        const g = document.createElement("div");
        g.className = "group-title";
        g.textContent = currentGroup;
        actionsEl.appendChild(g);
      }

      const row = document.createElement("div");
      row.className = "row" + (listeningId === meta.id ? " listening" : "");
      row.dataset.id = meta.id;

      const label = document.createElement("div");
      label.className = "row-label";
      label.textContent = meta.label;

      const keycap = document.createElement("button");
      keycap.type = "button";
      keycap.className = "keycap";
      keycap.textContent =
        listeningId === meta.id
          ? "キーを押してください…"
          : codeToLabel(shortcuts[meta.id] || "");
      keycap.addEventListener("click", () => startListen(meta.id));

      row.append(label, keycap);
      actionsEl.appendChild(row);
    }
  }

  function startListen(actionId) {
    stopListen();
    listeningId = actionId;
    render();
    setStatus("割り当てるキーを押してください（Esc でキャンセル）");

    const onKey = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        stopListen();
        render();
        setStatus("キャンセルしました");
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        shortcuts[actionId] = "";
        stopListen();
        await save();
        render();
        setStatus("ショートカットを解除しました");
        return;
      }

      const combo = normalizeCombo(event);
      if (!combo) return;

      const conflict = conflictFor(actionId, combo);
      if (conflict) {
        const other = ACTION_META.find((a) => a.id === conflict);
        shortcuts[conflict] = "";
        shortcuts[actionId] = combo;
        stopListen();
        await save();
        render();
        setStatus(
          `保存しました: ${codeToLabel(combo)}（「${other?.label || conflict}」から移動）`
        );
        return;
      }

      shortcuts[actionId] = combo;
      stopListen();
      await save();
      render();
      setStatus(`保存しました: ${codeToLabel(combo)}`);
    };

    activeKeyHandler = onKey;
    window.addEventListener("keydown", onKey, true);
  }

  enabledEl.addEventListener("change", async () => {
    await save();
    setStatus(enabledEl.checked ? "有効にしました" : "無効にしました");
  });

  resetEl.addEventListener("click", async () => {
    stopListen();
    shortcuts = { ...DEFAULT_SHORTCUTS };
    enabledEl.checked = true;
    await save();
    render();
    setStatus("初期設定に戻しました");
  });

  async function init() {
    const data = await chrome.storage.sync.get({
      [STORAGE_KEY]: DEFAULT_SHORTCUTS,
      [ENABLED_KEY]: true,
    });
    shortcuts = { ...DEFAULT_SHORTCUTS, ...(data[STORAGE_KEY] || {}) };
    enabledEl.checked = data[ENABLED_KEY] !== false;
    const versionEl = document.getElementById("ext-version");
    if (versionEl) {
      versionEl.textContent = chrome.runtime.getManifest().version;
    }
    render();
  }

  init();
})();
