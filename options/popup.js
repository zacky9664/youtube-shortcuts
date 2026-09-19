(() => {
  const enabledEl = document.getElementById("enabled");
  const statusEl = document.getElementById("status");
  const openBtn = document.getElementById("open-options");

  chrome.storage.sync.get({ enabled: true }, (data) => {
    enabledEl.checked = data.enabled !== false;
  });

  enabledEl.addEventListener("change", async () => {
    await chrome.storage.sync.set({ enabled: enabledEl.checked });
    statusEl.textContent = enabledEl.checked ? "有効にしました" : "無効にしました";
  });

  openBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
})();
