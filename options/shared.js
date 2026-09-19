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

const ACTION_META = [
  { id: "playPause", label: "再生 / 一時停止", group: "再生" },
  { id: "seekBack", label: "10秒戻る", group: "シーク" },
  { id: "seekForward", label: "10秒進む", group: "シーク" },
  { id: "seekBackSmall", label: "5秒戻る", group: "シーク" },
  { id: "seekForwardSmall", label: "5秒進む", group: "シーク" },
  { id: "volumeUp", label: "音量アップ", group: "音声" },
  { id: "volumeDown", label: "音量ダウン", group: "音声" },
  { id: "mute", label: "ミュート切替", group: "音声" },
  { id: "fullscreen", label: "フルスクリーン", group: "表示" },
  { id: "theater", label: "シアターモード", group: "表示" },
  { id: "captions", label: "字幕オン/オフ", group: "表示" },
  { id: "speedDown", label: "再生速度を下げる", group: "速度" },
  { id: "speedUp", label: "再生速度を上げる", group: "速度" },
  { id: "speedDefault", label: "再生速度をデフォルトに戻す", group: "速度" },
  {
    id: "speedToggleDefault",
    label: "再生速度をデフォルトと交互に切替",
    group: "速度",
  },
  { id: "nextVideo", label: "次の動画", group: "ナビ" },
  { id: "prevVideo", label: "前の動画", group: "ナビ" },
];

const STORAGE_KEY = "shortcuts";
const ENABLED_KEY = "enabled";

function codeToLabel(combo) {
  if (!combo) return "未設定";
  return combo
    .split("+")
    .map((part) => {
      const map = {
        Ctrl: "Ctrl",
        Alt: "Alt",
        Shift: "Shift",
        Meta: "⌘/Meta",
        Space: "Space",
        ArrowLeft: "←",
        ArrowRight: "→",
        ArrowUp: "↑",
        ArrowDown: "↓",
        Comma: ",",
        Period: ".",
        Slash: "/",
        Semicolon: ";",
        Quote: "'",
        BracketLeft: "[",
        BracketRight: "]",
        Backslash: "\\",
        Minus: "-",
        Equal: "=",
        Backquote: "`",
      };
      if (map[part]) return map[part];
      if (part.startsWith("Key") && part.length === 4) return part.slice(3);
      if (part.startsWith("Digit") && part.length === 6) return part.slice(5);
      return part;
    })
    .join(" + ");
}

function normalizeCombo(event) {
  const parts = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  if (
    event.code.startsWith("Control") ||
    event.code.startsWith("Shift") ||
    event.code.startsWith("Alt") ||
    event.code.startsWith("Meta")
  ) {
    return "";
  }
  parts.push(event.code);
  return parts.join("+");
}
