# test_transition.html 外部ファイル化設計

**作成日**: 2025-12-17
**目標**: 1ファイル1000行未満

---

## 現状分析

| セクション | 行数 | 内容 |
|-----------|------|------|
| CSS (インライン) | ~980行 | 1-1139行内 |
| HTML | ~160行 | 1-1139行内 |
| Script imports | 7行 | 1140-1146行 |
| JavaScript | ~2163行 | 1147-3310行 |
| **合計** | **~3313行** | |

---

## 提案ファイル構成

### 新規作成ファイル

| ファイル | 推定行数 | 内容 |
|---------|---------|------|
| `css/transition.css` | ~980行 | インラインCSSを外部化 |
| `js/transition-state.js` | ~150行 | 状態変数、初期化 |
| `js/transition-ui.js` | ~350行 | メニュー、設定、サイドバー |
| `js/transition-page.js` | ~450行 | ページ管理、タイプライター |
| `js/transition-llm.js` | ~400行 | LLM呼び出し、プロンプト構築 |
| `js/transition-core.js` | ~500行 | コアロジック（移動、行為、generatePages） |
| `js/lock-screen.js` | ~100行 | ロック画面 |

### 変更後のtest_transition.html

| セクション | 推定行数 |
|-----------|---------|
| HTML構造 | ~160行 |
| Script imports | ~15行 |
| イベントハンドラ・初期化 | ~100行 |
| **合計** | **~275行** |

---

## 詳細設計

### 1. css/transition.css (~980行)

現在のインラインCSS全体を移動。

```html
<!-- Before -->
<style>
    html, body { ... }
    ...
</style>

<!-- After -->
<link rel="stylesheet" href="css/transition.css">
```

---

### 2. js/transition-state.js (~150行)

**責務**: グローバル状態の定義と初期化

```javascript
// 状態変数
const TransitionState = {
    // データストア
    models: {},
    characters: [],
    places: [],
    actions: [],
    relationships: [],
    promptTemplates: {},

    // ユーザー・キャラクター状態
    currentState: { characterIndex: -1, placeIndex: -1, actionIndex: -1 },
    userState: { placeIndex: -1 },
    characterStatus: [],

    // UI状態
    currentCommandType: 'speech',
    pages: [],
    currentPageIndex: -1,
    chatHistory: [],
    actionHistory: [],

    // 設定
    characterCount: 2,
    imageGenEnabled: true,
    llmLogEnabled: false,
    selectedModelId: '',
    selectedLLMModelId: 'x-ai/grok-4.1-fast',
    moveWithCompanion: false,
    isLoading: false,
    sidebarCollapsed: false,

    // タイプライター
    typewriter: {
        buffer: '',
        displayed: '',
        timer: null,
        pageIndex: -1
    }
};
```

**含む関数**:
- `initCharacterStatus(count)`
- `updateCharacterStatusArray()`
- `saveCachedData()`
- `loadCachedData()`

---

### 3. js/transition-ui.js (~350行)

**責務**: UI操作（メニュー、設定、サイドバー）

**含む関数**:
- `openMoveMenu()`, `closeMoveMenu()`, `selectMoveDestination()`
- `openActionMenu()`, `closeActionMenu()`
- `openSettings()`, `closeSettings()`
- `toggleSidebar()`, `initSidebarState()`
- `toggleImageGen()`, `updateImageGenButton()`
- `toggleLLMLog()`, `updateLLMLogButton()`
- `toggleMoveMode()`, `updateMoveModeButton()`
- `saveChatApiKey()`, `saveRunwareApiKey()`, `saveGasUrl()`
- `updateModelSelect()`, `onModelSelect()`, `onLLMModelSelect()`, `initLLMModelSelect()`
- `onCharacterCountChange()`, `initCharacterCount()`
- `renderCharacterSections()`
- `updateCharacterStatusDisplay()`, `updateUserStatusDisplay()`

---

### 4. js/transition-page.js (~450行)

**責務**: ページ表示、タイプライター、ダイアログ

**含む関数**:
- `showLoading()`, `hideLoading()`
- `showStatusLLM()`, `hideStatusLLM()`
- `showStatusImage()`, `hideStatusImage()`
- `startTypewriter()`, `stopTypewriter()`, `appendToTypewriter()`, `typewriterTick()`, `waitForTypewriter()`
- `updatePageStatus()`
- `addPage()`, `showPage()`, `nextPage()`, `prevPage()`, `goToLatestPage()`
- `startPageTypewriter()`
- `addPage1()`, `addPage2()`, `updatePageText()`
- `addDialogue()`, `startAppendTypewriter()`
- `addSystemMessage()`, `addCommandMessage()`

---

### 5. js/transition-llm.js (~400行)

**責務**: LLM連携、プロンプト構築、レスポンスパース

**含む関数**:
- `callLLM()`
- `buildRelationshipInfoPrompt()`
- `buildCombinedPrompt()`
- `buildPage1Prompt()`
- `cleanNarrative()`
- `parseCombinedResponse()`
- `parseConversationResponse()`
- `createStreamChunkHandler()`

---

### 6. js/transition-core.js (~500行)

**責務**: コアロジック（移動、行為、ページ生成）

**含む関数**:
- `executeCommand()`
- `executeMove()`
- `executeAction()`, `selectAction()`
- `generatePages()`
- `handleConversationMode()`
- `startImageGenerationAsync()`
- `generateCharacterImage()`
- `updateCharacterRelationship()`
- `startInitialSetup()`
- `moveToCharacterLocation()`
- `getCharacterAtUserLocation()`
- `loadAllFromGas()`, `updateAllSelects()`

---

### 7. js/lock-screen.js (~100行)

**責務**: ロック画面機能

**含む関数**:
- `getLockPassword()`, `saveLockPassword()`
- `showLockScreen()`, `hideLockScreen()`
- `onNumpadInput()`, `onNumpadBackspace()`
- `checkLockPassword()`
- `initLockScreen()`

---

## 依存関係

```
test_transition.html
├── css/common.css
├── css/transition.css (NEW)
├── js/constants.js
├── js/gas-api.js
├── js/storage.js
├── js/data-parser.js
├── js/ui-utils.js
├── js/prompt-utils.js
├── js/runware-api.js
├── js/transition-state.js (NEW)
├── js/transition-page.js (NEW)
├── js/transition-ui.js (NEW)
├── js/transition-llm.js (NEW)
├── js/transition-core.js (NEW)
└── js/lock-screen.js (NEW)
```

**読み込み順序** (依存関係を考慮):
1. constants.js
2. storage.js, gas-api.js, data-parser.js
3. ui-utils.js, prompt-utils.js, runware-api.js
4. transition-state.js (状態定義)
5. transition-page.js (ページ管理)
6. transition-ui.js (UI)
7. transition-llm.js (LLM)
8. transition-core.js (コアロジック)
9. lock-screen.js

---

## 実装順序（推奨）

### Phase 1: CSS外部化 (低リスク)
1. `css/transition.css` を作成
2. インラインCSSを移動
3. テスト

### Phase 2: ロック画面分離 (低リスク)
1. `js/lock-screen.js` を作成
2. 関数を移動
3. テスト

### Phase 3: 状態管理分離
1. `js/transition-state.js` を作成
2. 変数と状態管理関数を移動
3. グローバル参照を調整
4. テスト

### Phase 4: ページ管理分離
1. `js/transition-page.js` を作成
2. 関数を移動
3. テスト

### Phase 5: UI分離
1. `js/transition-ui.js` を作成
2. 関数を移動
3. テスト

### Phase 6: LLM分離
1. `js/transition-llm.js` を作成
2. 関数を移動
3. テスト

### Phase 7: コア分離
1. `js/transition-core.js` を作成
2. 残りの関数を移動
3. テスト

---

## リスク評価

| Phase | リスク | 理由 |
|-------|--------|------|
| 1 (CSS) | 低 | 独立した変更 |
| 2 (ロック画面) | 低 | 自己完結した機能 |
| 3 (状態) | 中 | グローバル変数の参照変更が必要 |
| 4 (ページ) | 中 | 多くの関数が相互依存 |
| 5 (UI) | 中 | DOM操作が多い |
| 6 (LLM) | 低 | 比較的独立 |
| 7 (コア) | 高 | 複雑な依存関係 |

---

## 注意事項

1. **グローバル変数の参照**
   - 状態変数を`TransitionState`オブジェクトにまとめる場合、全参照を更新する必要がある
   - または、互換性のためエイリアスを作成: `const pages = TransitionState.pages;`

2. **関数の相互依存**
   - `generatePages()`は多くの関数を呼び出す
   - 読み込み順序を正しく設定する必要がある

3. **イベントハンドラ**
   - HTML内のonclick等はそのまま動作する（グローバル関数として公開される）

4. **テスト**
   - 各Phase完了後に必ず全機能テストを実施
