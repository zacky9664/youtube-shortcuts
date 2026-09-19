# YouTube Shortcuts

YouTube 用のカスタムキーボードショートカット Chrome 拡張機能です。

## ローカルでの読み込み

1. Chrome で `chrome://extensions` を開く
2. デベロッパーモードをオン
3. **パッケージ化されていない拡張機能を読み込む**
4. **このリポジトリのルート**（`manifest.json` がある `youtube-shortcuts`）を選ぶ
5. YouTube タブを1回リロード
6. 拡張アイコン →「キー割り当てを開く」で設定

> 親フォルダを選ぶとマニフェストエラーになります。

## 使い方

- ツールバーからオン/オフ
- オプションで各操作にキーを割り当て
- 枠をクリック → キーを押す → 自動保存
- `Esc` でキャンセル、`Backspace` で解除

## デフォルトキー

| 操作 | キー |
| --- | --- |
| 再生/一時停止 | K |
| 10秒戻る / 進む | J / L |
| 5秒戻る / 進む | ← / → |
| 音量 | ↑ / ↓ |
| ミュート | M |
| フルスクリーン | F |
| シアター | T |
| 字幕 | C |
| 速度ダウン / アップ | Shift + , / Shift + . |
| 速度をデフォルトに戻す | （未設定・オプションで割り当て） |
| 速度をデフォルトと交互切替 | （未設定・オプションで割り当て） |
| 次 / 前の動画 | Shift + N / Shift + P |

## ヒント

1. 同系統のショートカット拡張は1つだけ有効にする
2. 入力欄フォーカス中は無効（`Esc` で外す）
3. 拡張を読み込み直したら YouTube タブを1回リロード
4. 設定は Chrome 同期で他の PC にも反映される（同じ Google アカウント・同期オン）

未パッケージで読む場合は `manifest.json` の `key` により拡張 ID を固定しています（ストア用 zip では `scripts/pack.sh` が `key` を除去します）。

## Chrome Web Store

```bash
./scripts/pack.sh
python3 scripts/make-store-assets.py
```

- アップロード用 zip: `build/youtube-shortcuts-v*.zip`
- 掲載文: `store/listing-ja.md`
- スクリーンショット等: `store/assets/`
