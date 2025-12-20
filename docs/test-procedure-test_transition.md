# test_transition.html 機能テスト手順書

**作成日**: 2025-12-17
**最終更新日**: 2025-12-20
**対象ファイル**: `test_transition.html`
**テスト方法**: Playwright MCP による自動テスト（状態変化検証を含む）

---

## 前提条件

### 必要な情報
- GAS URL（スプレッドシートにデータが存在すること）
- OpenRouter API Key（LLMテスト用）
- Runware API Key（画像生成テスト用、オプション）

### 必要なGASシート
- model, character, place, action, relationship, costume, personality, llm_prompt_template

---

## テスト項目一覧

### カテゴリ別サマリー

| カテゴリ | テスト数 | 内容 |
|----------|---------|------|
| T1: 起動・初期状態 | 2 | ページ読み込み、エラーなし |
| T2: 設定保存 | 5 | APIキー・URL入力、LocalStorage保存確認 |
| T3: GASデータ読み込み | 10 | データ取得、パース、キャッシュ保存 |
| T4: 初期設定 | 9 | キャラクター配置、性格重複リトライ、状態変数更新 |
| T5: 移動機能 | 7 | メニュー表示、場所選択、状態更新、DOM反映 |
| T6: サイドバー | 6 | 開閉、状態保存、キャラ場所ボタン、性格表示 |
| T7: 行為機能 | 8 | メニュー表示、行為選択、もっとボタン、次アクションボタン |
| T8: 発言・LLM連携 | 6 | 入力送信、ページ生成、履歴追加 |
| T9: ページ情報パネル | 8 | 表示、性格編集、関係性編集 |
| T10: セーブ/ロード | 6 | 保存、復元、genInfo保持、ボタン状態 |
| **合計** | **67** | |

---

## T1: 起動・初期状態

**実行時間**: ~5秒（高速）

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T1-1 | ページ読み込み成功 | `page.title` | "Transition Test" |
| T1-2 | コンソールエラーなし | `console_messages(level=error)` | 空 |

**注意**: 要素IDは `app-container` ではなく `appContainer`（キャメルケース）

---

## T2: 設定保存

**実行時間**: ~15秒

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T2-1 | 設定モーダル表示 | 「設定」クリック → `settingsModal.classList.contains('active')` | true |
| T2-2 | GAS URL入力 | `#gasUrl` に値を入力 | 入力成功 |
| T2-3 | OpenRouter APIキー入力 | `#chatApiKey` に値を入力 | 入力成功 |
| T2-4 | Runware APIキー入力 | `#runwareApiKey` に値を入力 | 入力成功 |
| T2-5 | LocalStorage保存確認 | 各キーが入力値と一致 | 一致 |

**T2-5 詳細**:
- `transition_chat_api_key`: 保存される
- `transition_runware_api_key`: 保存される
- `gas_api_url`: 保存される

---

## T3: GASデータ読み込み

**実行時間**: ~8秒（ネットワーク依存）

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T3-1 | GAS読み込みボタンクリック | ボタンクリック実行 | 成功 |
| T3-2 | characters配列にデータ | `evaluate: characters.length > 0` | true |
| T3-3 | places配列にデータ | `evaluate: places.length > 0` | true |
| T3-4 | actions配列にデータ | `evaluate: actions.length > 0` | true |
| T3-5 | relationships配列にデータ | `evaluate: relationships.length > 0` | true |
| T3-6 | costumes配列にデータ | `evaluate: costumes.length > 0` | true |
| T3-7 | personalities配列にデータ | `evaluate: personalities.length > 0` | true |
| T3-8 | promptTemplates にデータ | `evaluate: Object.keys(promptTemplates).length > 0` | true |
| T3-9 | キャッシュ保存確認 | `localStorage.getItem('transition_test_cache')` | 存在 |
| T3-10 | モデルプルダウン更新 | `#modelSelect` の `options.length > 1` | true |

---

## T4: 初期設定

**実行時間**: ~3秒（高速）

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T4-1 | 初期設定ボタンクリック | ボタンクリック実行 | 成功 |
| T4-2 | characterStatus[0] 設定 | `evaluate: characterStatus[0].characterIndex >= 0` | true |
| T4-3 | characterStatus[0] 場所設定 | `evaluate: characterStatus[0].placeIndex >= 0` | true |
| T4-4 | userState 場所設定 | `evaluate: userState.placeIndex >= 0` | true |
| T4-5 | キャラ名DOM更新 | `#char1-name` のテキスト | "未選択"以外 |
| T4-6 | キャラ場所DOM更新 | `#char1-place` のテキスト | "未選択"以外 |
| T4-7 | キャラ性格DOM表示 | `#char1-personality` のテキスト | "性格：xxx" 形式 |
| T4-8 | ユーザー場所DOM更新 | `#user-place` のテキスト | "未選択"以外 |
| T4-9 | 性格重複なし確認 | 選択されたキャラの性格IDがすべて異なる | true（リトライ機能） |

**T4-9 詳細**:
```javascript
// 性格重複チェック
() => {
  const personalityIds = characterStatus
    .filter(s => s.characterIndex >= 0)
    .map(s => characters[s.characterIndex]?.personality)
    .filter(p => p);
  return new Set(personalityIds).size === personalityIds.length;
}
```

---

## T5: 移動機能

**実行時間**: ~12秒（LLM連携含む）

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T5-1 | 移動メニュー表示 | 「移動」クリック → `#moveMenu` 表示 | display: flex |
| T5-2 | 移動先リスト存在 | 移動先アイテムが1つ以上存在 | true |
| T5-3 | 二人で移動セクション | キャラと同場所時にセクション表示 | 表示 |
| T5-4 | 一人で移動セクション | 常に表示 | 表示 |
| T5-5 | 移動先選択 | 移動先をクリック | 成功 |
| T5-6 | userState更新 | `evaluate: userState.placeIndex` が変化 | 変化 |
| T5-7 | ページ生成 | `evaluate: pages.length` が増加 | 増加 |

---

## T6: サイドバー

**実行時間**: ~12秒（LLM連携含む）

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T6-1 | サイドバー閉じる | ≡クリック → `sidebar-collapsed` クラス | 追加 |
| T6-2 | サイドバー開く | 再クリック → `sidebar-collapsed` クラス | 削除 |
| T6-3 | 状態LocalStorage保存 | `localStorage.getItem('transition_sidebar_collapsed')` | "yes"/"no" |
| T6-4 | キャラ場所ボタンクリック | キャラの場所ボタンをクリック | 移動実行 |
| T6-5 | ユーザー位置移動 | `userState.placeIndex` が `characterStatus[0].placeIndex` と一致 | 一致 |
| T6-6 | 性格表示確認 | `#char1-personality` に性格名表示 | "性格：xxx" 形式 |

---

## T7: 行為機能

**実行時間**: ~15秒（LLM連携含む）

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T7-1 | 行為メニュー表示 | 「行為」クリック → `#actionMenu` 表示 | display: flex |
| T7-2 | 行為リスト存在 | 行為アイテムが1つ以上存在 | true |
| T7-3 | 行為選択 | 行為アイテムをクリック | 成功 |
| T7-4 | currentState更新 | `evaluate: currentState.actionIndex >= 0` | true |
| T7-5 | キャラアクション更新 | 同場所のキャラの`actionIndex`が変化 | 変化（同場所時） |
| T7-6 | もっとボタン表示 | `char_page_count >= 2`のアクション後 | `.more-button`存在 |
| T7-7 | 次アクションボタン表示 | `next_action`定義アクション後 | `.next-action-button`存在 |
| T7-8 | ボタン横並び | 両ボタン表示時 | `.page-action-buttons`内に並列 |

**T7-6, T7-7 詳細**:
```javascript
// ボタン存在確認
() => ({
  moreButton: document.querySelector('.more-button') !== null,
  nextActionButton: document.querySelector('.next-action-button') !== null,
  buttonContainer: document.querySelector('.page-action-buttons') !== null
})
```

---

## T8: 発言・LLM連携

**実行時間**: ~10秒（LLM連携）

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T8-1 | テキスト入力 | `#command-input` に値を入力 | 入力成功 |
| T8-2 | Enterで送信 | Enterキー押下 | 送信実行 |
| T8-3 | 入力欄クリア | `#command-input` の値 | 空 |
| T8-4 | ページ生成/更新 | `evaluate: pages.length` | 増加 |
| T8-5 | 履歴追加 | `evaluate: chatHistory.length` | 増加 |
| T8-6 | ページ表示 | `#page-view` 内にコンテンツ | 存在 |

**注意**: 発言はキャラクターと同じ場所にいる必要あり。

---

## T9: ページ情報パネル

**実行時間**: ~15秒

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T9-1 | テキスト非表示 | ページ中央クリック | `.text-hidden`クラス追加 |
| T9-2 | 情報ボタン表示 | テキスト非表示時 | `#infoButton`表示 |
| T9-3 | パネル表示 | 情報ボタンクリック | `#pageInfoPanel`表示 |
| T9-4 | 性格表示 | パネル内に性格情報 | 性格名・説明表示 |
| T9-5 | 性格編集ボタン | `#pers-desc-edit-btn` | 存在 |
| T9-6 | 関係性編集ボタン | `#rel-desc-edit-btn` | 存在 |
| T9-7 | 発展条件編集ボタン | `#rel-req-edit-btn` | 存在 |
| T9-8 | パネル閉じる | ×ボタンクリック | パネル非表示 |

**T9-4 詳細（性格表示確認）**:
```javascript
() => {
  const panel = document.getElementById('pageInfoContent');
  return panel?.innerHTML.includes('性格');
}
```

---

## T10: セーブ/ロード

**実行時間**: ~10秒

| ID | テスト内容 | 検証方法 | 期待値 |
|----|-----------|----------|--------|
| T10-1 | セーブ実行 | 「セーブ」ボタンクリック | 成功メッセージ |
| T10-2 | LocalStorage保存 | `localStorage.getItem('transition_game_save')` | 存在 |
| T10-3 | ロード実行 | 「ロード」ボタンクリック | 成功メッセージ |
| T10-4 | 状態復元 | `characterStatus`, `userState`, `pages`復元 | 一致 |
| T10-5 | genInfo復元 | `pages[n].genInfo`が存在 | 存在 |
| T10-6 | 情報ボタン存在 | ロード後に`#infoButton`存在 | 存在 |

**T10-4 詳細（状態復元確認）**:
```javascript
// セーブ前の状態を記録
const beforeSave = {
  charCount: characterStatus.length,
  userPlace: userState.placeIndex,
  pagesCount: pages.length
};

// ロード後に比較
() => ({
  charCountMatch: characterStatus.length === beforeSave.charCount,
  userPlaceMatch: userState.placeIndex === beforeSave.userPlace,
  pagesCountMatch: pages.length === beforeSave.pagesCount
})
```

---

## テスト実行順序

```
1. T1: 起動確認
2. T2: 設定入力（APIキー、GAS URL）
3. T3: GASデータ読み込み
4. T4: 初期設定実行
5. T5: 移動機能
6. T6: サイドバー動作
7. T7: 行為機能（もっとボタン、次アクションボタン含む）
8. T8: 発言・LLM連携
9. T9: ページ情報パネル
10. T10: セーブ/ロード
```

---

## 検証用コード例

### 状態変数の確認
```javascript
// Playwright evaluate で実行
() => ({
  charactersCount: characters.length,
  placesCount: places.length,
  actionsCount: actions.length,
  relationshipsCount: relationships.length,
  costumesCount: costumes.length,
  personalitiesCount: personalities.length,
  userPlaceIndex: userState.placeIndex,
  char1CharIndex: characterStatus[0]?.characterIndex,
  char1PlaceIndex: characterStatus[0]?.placeIndex,
  char1Personality: characterStatus[0]?.characterIndex >= 0
    ? characters[characterStatus[0].characterIndex]?.personality
    : null,
  pagesCount: pages.length,
  currentPage: currentPageIndex,
  imageGenEnabled: imageGenEnabled
})
```

### DOM内容の確認
```javascript
() => ({
  char1Name: document.getElementById('char1-name')?.textContent,
  char1Place: document.getElementById('char1-place')?.textContent,
  char1Personality: document.getElementById('char1-personality')?.textContent,
  char1Costume: document.getElementById('char1-costume')?.textContent,
  userPlace: document.getElementById('user-place')?.textContent
})
```

### LocalStorageの確認
```javascript
() => ({
  cache: localStorage.getItem('transition_test_cache') !== null,
  apiKey: localStorage.getItem('transition_chat_api_key') !== null,
  runwareApiKey: localStorage.getItem('transition_runware_api_key') !== null,
  gasUrl: localStorage.getItem('gas_api_url'),
  sidebarState: localStorage.getItem('transition_sidebar_collapsed'),
  imageGenEnabled: localStorage.getItem('transition_image_gen_enabled'),
  gameSave: localStorage.getItem('transition_game_save') !== null
})
```

### ページ情報の確認
```javascript
() => ({
  hasGenInfo: pages.length > 0 && pages[0].genInfo !== null,
  lastPageGenInfo: pages.length > 0 ? pages[pages.length - 1].genInfo : null,
  moreButtonExists: document.querySelector('.more-button') !== null,
  nextActionButtonExists: document.querySelector('.next-action-button') !== null,
  infoButtonExists: document.getElementById('infoButton') !== null
})
```

---

## 判定基準

| 結果 | 条件 |
|------|------|
| **PASS** | 期待値と一致、状態が正しく変化 |
| **FAIL** | 期待値と不一致、状態が変化しない |
| **SKIP** | 前提条件を満たさない（データなし等） |
| **PARTIAL** | 一部機能のみ動作 |
| **ERROR** | 例外発生、コンソールエラー |

---

## 高速テスト実行（LLM省略版）

LLM連携を省略して高速にテストする場合は、以下のテストのみ実行:

```
T1 → T2 → T3 → T4 → T6(1-3のみ) → T10
```

**推定実行時間**: ~30秒

---

## 既知の問題・仕様

1. **発言機能の前提条件** (T8)
   - キャラクターと同じ場所にいないと発言できない
   - 「この場所には誰もいません」エラーが出る
   - これは仕様として正常動作

2. **もっとボタンのロード後動作** (T7-6, T10)
   - ロード後はもっとボタン・次アクションボタンは復元されない
   - クロージャで保持している情報が失われるため
   - これは仕様として許容

3. **性格重複リトライ** (T4-9)
   - 最大3回リトライ
   - 3回で解決できない場合はそのまま続行
   - コンソールにログ出力

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-17 | 初版作成（T1-T8） |
| 2025-12-20 | T3: costumes, personalities追加 |
| 2025-12-20 | T4: 性格表示・重複リトライ追加 |
| 2025-12-20 | T6: 性格表示確認追加 |
| 2025-12-20 | T7: もっとボタン・次アクションボタン追加 |
| 2025-12-20 | T9: ページ情報パネル新規追加 |
| 2025-12-20 | T10: セーブ/ロード新規追加 |
