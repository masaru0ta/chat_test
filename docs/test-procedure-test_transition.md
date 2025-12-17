# test_transition.html 機能テスト手順書

**作成日**: 2025-12-17
**最終テスト実行日**: 2025-12-17
**対象ファイル**: `test_transition.html`
**テスト方法**: Playwright MCP による自動テスト（状態変化検証を含む）

---

## 前提条件

### 必要な情報
- GAS URL（スプレッドシートにデータが存在すること）
- OpenRouter API Key（LLMテスト用）
- Runware API Key（画像生成テスト用、オプション）

---

## テスト結果サマリー（2025-12-17実行）

| カテゴリ | テスト数 | PASS | FAIL | SKIP | 実行時間 | 備考 |
|----------|---------|------|------|------|----------|------|
| T1: 起動・初期状態 | 2 | 2 | 0 | 0 | ~3秒 | 高速 |
| T2: 設定保存 | 5 | 5 | 0 | 0 | ~10秒 | |
| T3: GASデータ読み込み | 8 | 8 | 0 | 0 | ~8秒 | ネットワーク依存 |
| T4: 初期設定 | 7 | 7 | 0 | 0 | ~3秒 | 高速 |
| T5: 移動機能 | 7 | 7 | 0 | 0 | ~12秒 | LLM連携含む |
| T6: サイドバー | 5 | 5 | 0 | 0 | ~12秒 | LLM連携含む |
| T7: 行為機能 | 5 | 4 | 0 | 1 | ~13秒 | LLM連携含む |
| T8: 発言・LLM連携 | 6 | 6 | 0 | 0 | ~10秒 | LLM連携 |
| **合計** | **45** | **44** | **0** | **1** | **~71秒** | |

### 発見された問題

| ID | 種別 | 内容 | 状態 |
|----|------|------|------|
| T7-5 | SKIP | 同場所にキャラクターがいない場合はテスト不可 | 仕様 |

### 実行時間による分類

**高速テスト**: T1, T4 - 合計約6秒
**中速テスト（ネットワーク依存）**: T2, T3 - 合計約18秒
**低速テスト（LLM連携）**: T5, T6, T7, T8 - 合計約47秒

---

## テスト項目一覧

### カテゴリ別サマリー

| カテゴリ | テスト数 | 内容 |
|----------|---------|------|
| T1: 起動・初期状態 | 2 | ページ読み込み、エラーなし |
| T2: 設定保存 | 5 | APIキー・URL入力、LocalStorage保存確認 |
| T3: GASデータ読み込み | 8 | データ取得、パース、キャッシュ保存 |
| T4: 初期設定 | 7 | キャラクター配置、状態変数更新、DOM反映 |
| T5: 移動機能 | 7 | メニュー表示、場所選択、状態更新、DOM反映 |
| T6: サイドバー | 5 | 開閉、状態保存、キャラ場所ボタン |
| T7: 行為機能 | 5 | メニュー表示、行為選択、状態更新 |
| T8: 発言・LLM連携 | 6 | 入力送信、ページ生成、履歴追加 |
| **合計** | **45** | |

---

## T1: 起動・初期状態

**実行時間**: ~5秒（高速）

| ID | テスト内容 | 検証方法 | 結果 |
|----|-----------|----------|------|
| T1-1 | ページ読み込み成功 | `page.title` が "Transition Test" | PASS |
| T1-2 | コンソールエラーなし | `console_messages(level=error)` が空 | PASS |

**注意**: 要素IDは `app-container` ではなく `appContainer`（キャメルケース）

---

## T2: 設定保存

**実行時間**: ~15秒

| ID | テスト内容 | 検証方法 | 結果 |
|----|-----------|----------|------|
| T2-1 | 設定モーダル表示 | 「設定」クリック → `settingsModal.classList.contains('active')` | PASS |
| T2-2 | GAS URL入力 | `#gasUrl` に値を入力 | PASS |
| T2-3 | OpenRouter APIキー入力 | `#chatApiKey` に値を入力 | PASS |
| T2-4 | Runware APIキー入力 | `#runwareApiKey` に値を入力 | PASS |
| T2-5 | LocalStorage保存確認 | 各キーが入力値と一致 | PASS |

**T2-5 詳細**:
- `transition_chat_api_key`: 保存される ✓
- `transition_runware_api_key`: 保存される ✓
- `gas_api_url`: 保存される ✓ (2025-12-17 修正済)

---

## T3: GASデータ読み込み

**実行時間**: ~8秒（ネットワーク依存）

| ID | テスト内容 | 検証方法 | 結果 | 実測値 |
|----|-----------|----------|------|--------|
| T3-1 | GAS読み込みボタンクリック | ボタンクリック実行 | PASS | - |
| T3-2 | characters配列にデータ | `evaluate: characters.length > 0` | PASS | 24 |
| T3-3 | places配列にデータ | `evaluate: places.length > 0` | PASS | 17 |
| T3-4 | actions配列にデータ | `evaluate: actions.length > 0` | PASS | 52 |
| T3-5 | relationships配列にデータ | `evaluate: relationships.length > 0` | PASS | 19 |
| T3-6 | promptTemplates にデータ | `evaluate: Object.keys(promptTemplates).length > 0` | PASS | 6 |
| T3-7 | キャッシュ保存確認 | `localStorage.getItem('transition_test_cache')` が存在 | PASS | - |
| T3-8 | モデルプルダウン更新 | `#modelSelect` の `options.length > 1` | PASS | 8 |

---

## T4: 初期設定

**実行時間**: ~3秒（高速）

| ID | テスト内容 | 検証方法 | 結果 | 実測値 |
|----|-----------|----------|------|--------|
| T4-1 | 初期設定ボタンクリック | ボタンクリック実行 | PASS | - |
| T4-2 | characterStatus[0] 設定 | `evaluate: characterStatus[0].characterIndex >= 0` | PASS | 6 |
| T4-3 | characterStatus[0] 場所設定 | `evaluate: characterStatus[0].placeIndex >= 0` | PASS | 16 |
| T4-4 | userState 場所設定 | `evaluate: userState.placeIndex >= 0` | PASS | 2 |
| T4-5 | キャラ名DOM更新 | `#char1-name` のテキストが "未選択" でない | PASS | "兎田ぺこら" |
| T4-6 | キャラ場所DOM更新 | `#char1-place` のテキストが "未選択" でない | PASS | "駅前の広場" |
| T4-7 | ユーザー場所DOM更新 | `#user-place` のテキストが "未選択" でない | PASS | "101号室 玄関" |

---

## T5: 移動機能

**実行時間**: ~12秒（LLM連携含む）

| ID | テスト内容 | 検証方法 | 結果 |
|----|-----------|----------|------|
| T5-1 | 移動メニュー表示 | 「移動」クリック → `#moveMenu` 表示 | PASS |
| T5-2 | 移動先リスト存在 | 移動先アイテムが1つ以上存在 | PASS (14箇所) |
| T5-3 | 現在地マーク表示 | 「(現在地)」表示あり | PASS |
| T5-4 | 移動先選択 | 現在地以外の移動先をクリック | PASS |
| T5-5 | userState更新 | `evaluate: userState.placeIndex` が変化 | PASS (16→2) |
| T5-6 | ユーザー場所DOM更新 | `#user-place` のテキストが変化 | PASS |
| T5-7 | ページ生成 | `evaluate: pages.length` が増加 | PASS (2→3) |

---

## T6: サイドバー

**実行時間**: ~12秒（LLM連携含む - キャラ場所ボタンで移動発生）

| ID | テスト内容 | 検証方法 | 結果 |
|----|-----------|----------|------|
| T6-1 | サイドバー閉じる | ≡クリック → `sidebar-collapsed` クラス追加 | PASS |
| T6-2 | サイドバー開く | 再クリック → `sidebar-collapsed` クラス削除 | PASS |
| T6-3 | 状態LocalStorage保存 | `localStorage.getItem('transition_sidebar_collapsed')` | PASS ("yes"/"no") |
| T6-4 | キャラ場所ボタンクリック | キャラの場所ボタンをクリック | PASS |
| T6-5 | ユーザー位置移動 | `userState.placeIndex` が `characterStatus[0].placeIndex` と一致 | PASS |

---


## T7: 行為機能

**実行時間**: ~13秒（LLM連携含む）

| ID | テスト内容 | 検証方法 | 結果 |
|----|-----------|----------|------|
| T7-1 | 行為メニュー表示 | 「行為」クリック → `#actionMenu` 表示 | PASS |
| T7-2 | 行為リスト存在 | 行為アイテムが1つ以上存在 | PASS (35+) |
| T7-3 | 行為選択 | 1番上の行為アイテムをクリック | PASS |
| T7-4 | currentState更新 | `evaluate: currentState.actionIndex >= 0` | PASS (-1→0) |
| T7-5 | キャラアクション更新 | `evaluate: characterStatus[n].actionIndex` が変化 | **SKIP** |

**T7-5**: 同じ場所にキャラクターがいない場合はスキップ

---


## T8: 発言・LLM連携

**実行時間**: ~10秒（LLM連携）

| ID | テスト内容 | 検証方法 | 結果 |
|----|-----------|----------|------|
| T8-1 | キャラクターが居る場所で入力欄にテキスト入力 | `#command-input` に値を入力 | PASS |
| T8-2 | Enterで送信 | Enterキー押下 | PASS |
| T8-3 | 入力欄クリア | `#command-input` の値が空 | PASS |
| T8-4 | ページ生成/更新 | `evaluate: pages.length` を確認 | PASS |
| T8-5 | 履歴追加 | `evaluate: chatHistory.length` が増加 | PASS (8→10) |
| T8-6 | ページ表示 | `#page-view` 内にコンテンツ存在 | PASS |

**注意**: 発言はキャラクターと同じ場所にいる必要あり。いない場合は「この場所には誰もいません」と表示される。

---

## テスト実行順序

```
1. T1: 起動確認
2. T2: 設定入力（APIキー、GAS URL）
3. T3: GASデータ読み込み
4. T4: 初期設定実行
5. T5: 移動機能
6. T6: サイドバー動作
7. T7: 行為機能
8. T8: 発言・LLM連携（※API使用、キャラと同場所必要）
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
  userPlaceIndex: userState.placeIndex,
  char1CharIndex: characterStatus[0]?.characterIndex,
  char1PlaceIndex: characterStatus[0]?.placeIndex,
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
  imageGenEnabled: localStorage.getItem('transition_image_gen_enabled')
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
T1 → T2 → T3 → T4
```

**推定実行時間**: ~24秒（フルテストの約34%）

---

## 既知の問題

1. **発言機能の前提条件** (T8)
   - キャラクターと同じ場所にいないと発言できない
   - 「この場所には誰もいません」エラーが出る
   - これは仕様として正常動作
