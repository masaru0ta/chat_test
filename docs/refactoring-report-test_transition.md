# test_transition.html リファクタリング調査報告

**調査日**: 2025-12-17
**最終更新**: 2025-12-17
**対象ファイル**: `test_transition.html`

---

## 対応状況サマリー

| 優先度 | 項目数 | 完了 | 未対応 | 進捗 |
|--------|--------|------|--------|------|
| 高 | 4 | 4 | 0 | ✅ 100% |
| 中 | 7 | 6 | 1 | ✅ 86% |
| 低 | 11 | 9 | 2 | 🔄 82% |

### 実施済みコミット

| コミット | 日付 | 内容 | 変更量 |
|---------|------|------|--------|
| `bfc34a8` | 2025-12-17 | 未使用コード削除（優先度高） | +12/-411 |
| `ddf1064` | 2025-12-17 | 関係性更新ロジック共通化 | +32/-43 |
| `840a1a2` | 2025-12-17 | generatePages()分割 | +117/-102 |
| `6c1f996` | 2025-12-17 | 優先度中リファクタリング | +95/-134 |

**総削減行数**: 約446行

---

## 概要

| 項目 | 値（調査時） | 値（現在） |
|------|-------------|-----------|
| 総行数 | 約3700行 | 約3300行 |
| CSS | 約980行 | 約980行 |
| HTML | 約170行 | 約150行 |
| JavaScript | 約2540行 | 約2170行 |
| 外部JS | 6ファイル | 7ファイル |

**注**: 行番号は調査時点のもの。リファクタリング後は変動あり。

### 外部JS依存
- `js/constants.js`
- `js/gas-api.js`
- `js/storage.js`
- `js/data-parser.js`
- `js/ui-utils.js`
- `js/prompt-utils.js`
- `js/runware-api.js`

---

## 改善案（優先度順）

### 優先度：高（バグ・不具合の原因になりうる）

| # | 問題 | 状態 | 対応内容 |
|---|------|------|----------|
| 1 | **未使用関数`sendToGrok()`** | ✅ 完了 | 削除済み（`bfc34a8`） |
| 2 | **`updatePageIndicator()`** | ✅ 完了 | 関数と呼び出し箇所を削除（`bfc34a8`） |
| 3 | **旧コマンドエリアのHTML残存** | ✅ 完了 | HTML・関連JS関数を削除（`bfc34a8`） |
| 4 | **`transitions`変数が未使用** | ✅ 完了 | 削除済み（`bfc34a8`） |

### 優先度：中（メンテナンス性・可読性）

| # | 問題 | 状態 | 詳細 |
|---|------|------|------|
| 5 | **巨大関数`generatePages()`** | ✅ 完了 | 3関数に分割（`ddf1064`, `840a1a2`） |
| 6 | **巨大関数`buildCombinedPrompt()`** | ✅ 完了 | `buildRelationshipInfoPrompt()`で関係性構築を共通化（`6c1f996`） |
| 7 | **DOMContentLoaded が肥大化** | ✅ 完了 | 3関数に分割: `initVisualViewport()`, `restoreSettings()`, `initKeyboardNavigation()`（`6c1f996`） |
| 8 | **関係性更新ロジックの重複** | ✅ 完了 | `updateCharacterRelationship()`に共通化（`ddf1064`） |
| 9 | **グローバル変数の乱立** | ⏳ 未対応 | 30以上のグローバル変数。リスク高のため見送り |
| 10 | **ストレージキー定数の分散** | ✅ 完了 | `constants.js`のSTORAGE_KEYSに統合（`6c1f996`） |
| 11 | **LLM_MODELS のハードコード** | ✅ 完了 | `constants.js`に移動（`6c1f996`） |

### 優先度：低（削除可能な未使用コード）

| # | 種類 | 関数/変数名 | 状態 |
|---|------|------------|------|
| 12 | 未使用関数 | `sendToGrok()` | ✅ 削除済み（#1と重複） |
| 13 | 未使用関数 | `addAssistantMessage()` | ✅ 削除済み（`bfc34a8`） |
| 14 | 未使用関数 | `hideCommandSelect()`, `showCommandSelect()` | ✅ 削除済み（`bfc34a8`） |
| 15 | 未使用関数 | `toggleTargetType()` | ✅ 削除済み（`bfc34a8`） |
| 16 | 未使用関数 | `toggleCommandType()`, `setCommandType()` | ✅ 削除済み（`bfc34a8`） |
| 17 | 未使用関数 | `runSelectedAction()` | ✅ 削除済み（`bfc34a8`） |
| 18 | 未使用関数 | `clearChat()` | ✅ 削除済み（`bfc34a8`） |
| 19 | デバッグ用 | `dumpHistory()` | ✅ 削除済み（`bfc34a8`） |
| 20 | コンソール専用 | `addStateChangeMessage()` 等 | ✅ 削除済み（`bfc34a8`） |
| 21 | 未使用CSS | `.command-area`系、`.chat-header`等 | ⏳ 未対応 |
| 22 | 未使用変数 | `currentState` | ⏳ 未対応（後方互換用として残存） |

---

## 外部化候補（JS分離）

| # | 機能 | 行範囲 | 提案ファイル名 | 説明 |
|---|------|--------|---------------|------|
| 23 | ロック画面 | L1608-1725 | `js/lock-screen.js` | パスワード入力、テンキー、表示/非表示 |
| 24 | タイプライター | L1300-1346, L2463-2895 | `js/typewriter.js` | テキスト逐次表示、追記タイプライター |
| 25 | ページ管理 | L2383-2776 | `js/page-manager.js` | ページ追加、表示、ナビゲーション |
| 26 | LLM呼び出し | L3562-3693 | `js/llm-api.js` | OpenRouter API、ストリーミング処理 |
| 27 | 状態管理 | characterStatus, userState等 | `js/state-manager.js` | キャラクター・ユーザー状態の一元管理 |

---

## その他の問題

### デバッグコードの残存

```javascript
// L3044-3046
window._streamDisplayStarted = false;
window._chunkCallbackStarted = false;
window._displayTextLogged = false;

// L3623
window._chunkLogCount = 0;
```

本番環境では不要。削除またはDEBUGフラグでの制御が望ましい。

### マジックストリング

```javascript
'rel_001'           // L1186, L2661 - デフォルト関係性ID
'101号室 玄関'      // L2672 - ユーザー初期位置
```

定数化して`constants.js`に移動すべき。

### 非効率なコード

1. **`characterStatus.findIndex()` の重複呼び出し**
   - 同じ条件で複数回検索している箇所あり
   - 結果をキャッシュすべき

2. **ループ内での `getElementById()` 繰り返し**
   - `updateCharacterStatusDisplay()`内で毎回DOM検索
   - 要素参照をキャッシュすべき

3. **キャッシュ保存時の全データJSON化**
   - `saveCachedData()`で毎回全データをJSON.stringify
   - 差分更新の検討

---

## 未使用コード詳細

### 削除済み関数（`bfc34a8`で対応）

以下の未使用関数はすべて削除済み:

- `sendToGrok()` - 存在しない要素を参照していた
- `addAssistantMessage()` - 未使用
- `hideCommandSelect()`, `showCommandSelect()` - 旧コマンドエリア用
- `toggleTargetType()` - 未使用
- `toggleCommandType()`, `setCommandType()` - 旧コマンドエリア用
- `runSelectedAction()` - 未使用
- `clearChat()` - 未使用
- `dumpHistory()` - デバッグ用
- `addStateChangeMessage()`, `addActionMessage()`, `addTransitionMessage()` - console.logラッパー

### 未使用CSS一覧（未対応）

| セレクタ | 行 | 理由 |
|---------|-----|------|
| `.command-area` (モバイル版) | L774-791 | HTML要素が`display:none` |
| `.command-row` (モバイル版) | L786-788 | 同上 |
| `#command-input` (モバイル版) | L789-791 | 同上 |
| `.chat-header` | L207-215 | HTMLに要素なし |
| `.input-focused` 関連 | L197-205 | JSで参照されるが効果なし |

---

## 推奨アクション順序

### Phase 1: クリーンアップ（低リスク） ✅ 完了
1. ✅ 未使用関数の削除（`bfc34a8`）
2. ✅ 未使用変数の削除（`bfc34a8`）
3. ⏳ 未使用CSSの削除
4. ⏳ デバッグコードの整理

### Phase 2: 定数統合 ✅ 完了
1. ✅ ストレージキー定数を`constants.js`に移動（`6c1f996`）
2. ✅ `LLM_MODELS`を`constants.js`に移動（`6c1f996`）
3. ⏳ マジックストリングの定数化

### Phase 3: コード整理 ✅ 完了
1. ✅ 重複コードの共通化（`ddf1064`）
2. ✅ 巨大関数の分割（`840a1a2`, `6c1f996`）
3. ✅ 初期化処理の整理（`6c1f996`）

### Phase 4: 外部ファイル化 ⏳ 未着手
1. ⏳ ロック画面を`js/lock-screen.js`に分離
2. ⏳ タイプライターを`js/typewriter.js`に分離
3. ⏳ ページ管理を`js/page-manager.js`に分離
4. ⏳ LLM呼び出しを`js/llm-api.js`に分離

---

## 注意事項

- 各変更後は必ず動作確認を行うこと
- 一度に大量の変更を行わず、段階的に実施すること
- 削除前に他のHTMLファイルでの使用有無を確認すること
