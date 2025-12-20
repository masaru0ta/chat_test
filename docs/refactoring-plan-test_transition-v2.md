# test_transition.html リファクタリング計画 v2

**作成日**: 2025-12-20
**対象ファイル**: `test_transition.html`
**前回レポート**: `refactoring-report-test_transition.md` (2025-12-17)

---

## 現状分析

### ファイルサイズ比較

| 項目 | 前回調査時 | 現在 | 変化 |
|------|-----------|------|------|
| test_transition.html | 約3300行 | 2053行 | -1247行 |
| 外部JS (transition系) | 0行 | 1718行 | +1718行 |
| 総JavaScript量 | 約2540行 | 約3580行 | +1040行 |

**注**: 総行数は増加しているが、機能追加（性格管理、もっとボタン、ページ情報パネル等）による正当な増加。

### 外部JS構成（11ファイル）

| ファイル | 行数 | 役割 |
|----------|------|------|
| transition-llm.js | 727行 | LLMプロンプト構築・パース |
| transition-ui.js | 564行 | UI更新・表示制御 |
| transition-page.js | 427行 | ページ追加・タイプライター |
| lock-screen.js | 150行 | ロック画面 |
| constants.js | - | 定数定義 |
| gas-api.js | - | GAS通信 |
| storage.js | - | ストレージ操作 |
| data-parser.js | - | データパース |
| ui-utils.js | - | UI汎用ユーティリティ |
| prompt-utils.js | - | プロンプト操作 |
| runware-api.js | - | 画像生成API |

### インラインJavaScript構成（約1860行）

| 機能ブロック | 行範囲 | 行数 | 備考 |
|-------------|--------|------|------|
| グローバル変数 | 196-244 | 50 | データストア・状態管理 |
| キャッシュ管理 | 246-290 | 45 | |
| ストレージキーエイリアス | 296-305 | 10 | **冗長** |
| 移動・行為実行 | 308-382 | 75 | |
| Visual Viewport | 384-423 | 40 | |
| 設定管理 | 426-618 | 195 | **外部化候補** |
| キーボードナビ | 621-635 | 15 | |
| 初期化 | 638-651 | 15 | |
| GAS読み込み | 653-697 | 45 | |
| アクション実行 | 699-889 | 190 | **外部化候補** |
| デバッグコード | 891-906 | 15 | **削除候補** |
| 会話処理 | 908-986 | 80 | |
| 初期設定 | 988-1123 | 135 | |
| **ページ生成** | 1139-1506 | **370** | **最大・要分割** |
| 画像生成 | 1508-1609 | 100 | **重複あり** |
| セーブ/ロード | 1611-1689 | 80 | **外部化候補** |
| **ページ情報表示** | 1691-1991 | **300** | **巨大・要分割** |
| 構図指定画像生成 | 2003-2048 | 45 | **重複あり** |

---

## 問題点と改善案

### 優先度：高（コード品質・バグリスク）

| # | 問題 | 詳細 | 提案 |
|---|------|------|------|
| 1 | **showPageInfo() が300行超** | L1691-1991。HTML生成、フィールド編集、プロンプト再現が混在 | 3-4関数に分割 |
| 2 | **画像生成関数の重複** | generateCharacterImage()とgenerateCharacterImageWithComposition()が類似 | 1関数に統合 |
| 3 | **デバッグコードの残存** | clearChat(), dumpHistory(), window._stream* フラグ | 削除またはDEBUGフラグ化 |
| 4 | **マジックストリングの散在** | 'rel_001', 'rel_302', '101号室 玄関' 等 | constants.js に集約 |

### 優先度：中（メンテナンス性）

| # | 問題 | 詳細 | 提案 |
|---|------|------|------|
| 5 | **generatePages() が225行** | L1139-1364。複数モードの分岐が複雑 | モード別にヘルパー関数化 |
| 6 | **設定管理関数の散在** | restoreSettings, loadSettingsFromGas, saveSettingsToGas, checkAndSyncSettings | js/settings-manager.js に外部化 |
| 7 | **アクション実行関数群** | executeAction, applyActionEffect, parseEffectString 等 | transition-ui.js に移動 |
| 8 | **セーブ/ロード関数** | saveGameState, loadGameState (80行) | js/save-manager.js または storage.js に移動 |
| 9 | **冗長なストレージキーエイリアス** | L296-305。constants.jsのSTORAGE_KEYSと重複 | 直接参照に変更して削除 |

### 優先度：低（最適化・整理）

| # | 問題 | 詳細 | 提案 |
|---|------|------|------|
| 10 | **GAS読み込みの重複パターン** | loadAllFromGas()とcheckAndSyncSettings()で類似コード | 共通関数化 |
| 11 | **グローバル変数の乱立** | 30以上のグローバル変数 | 状態オブジェクトへの集約（リスク高） |
| 12 | **updateAllSelects() が空関数** | L695-697。「プルダウン削除済み」コメントのみ | 削除 |

---

## 具体的なリファクタリング計画

### Phase 1: 巨大関数の分割（優先度高・リスク中）

#### 1-1. showPageInfo() の分割

現在の構成（約300行）:
```
showPageInfo()
├── 基本情報セクションHTML生成 (~10行)
├── 生成パラメータセクションHTML生成 (~80行)
│   ├── キャラクター情報
│   ├── パーソナリティ情報+編集UI
│   ├── 場所・アクション情報
│   ├── 関係性情報+編集UI
├── LLMプロンプト再現セクション (~50行)
├── 画像生成セクション (~50行)
├── setupFieldEditor() 定義 (~50行)
└── 各フィールドへのsetupFieldEditor適用 (~15行)
```

提案する分割:
```javascript
// ページ情報HTML生成
function buildPageInfoHtml(page, genInfo) { ... }  // ~100行

// セクション別ヘルパー
function buildBasicInfoSection(page, pageIndex) { ... }  // ~15行
function buildGenParamsSection(genInfo) { ... }  // ~60行
function buildLLMPromptSection(genInfo) { ... }  // ~50行
function buildImageGenSection(genInfo) { ... }  // ~50行

// フィールド編集（既存、外部に移動可能）
function setupFieldEditor(...) { ... }  // ~50行

// メイン関数（HTMLセット+イベントバインド）
function showPageInfo() { ... }  // ~30行
```

#### 1-2. 画像生成関数の統合

現状:
```javascript
// L1561-1609 (50行)
async function generateCharacterImage(character, place, actionIndex, costumeId, relationshipId) {
    // 構図タグ自動選択
    const compositionTag = getCompositionTag(actions, actionIndex);
    // ... buildImageGenPrompt → generateImage
}

// L2003-2048 (45行)
async function generateCharacterImageWithComposition(charAtLocation, place, actionIndex, compositionTag, promptPrefix = '') {
    // 構図タグ指定、promptPrefix対応
    // ... buildImageGenPrompt → generateImage
}
```

統合案:
```javascript
// 1つの関数に統合（オプション引数で分岐）
async function generateCharacterImage(options) {
    // options: { character, charAtLocation, place, actionIndex,
    //            costumeId, relationshipId, compositionTag, promptPrefix }
    const character = options.character || options.charAtLocation?.character;
    const costumeId = options.costumeId || options.charAtLocation?.status?.costumeId;
    const relationshipId = options.relationshipId || options.charAtLocation?.status?.relationshipId;
    const compositionTag = options.compositionTag || getCompositionTag(actions, options.actionIndex);
    // ... 共通処理
}
```

---

### Phase 2: 外部ファイル化（優先度中・リスク低）

#### 2-1. js/settings-manager.js 新規作成

移動対象:
- `restoreSettings()` (L426-446)
- `loadSettingsFromGas()` (L448-518)
- `saveSettingsToGas()` (L520-559)
- `checkAndSyncSettings()` (L561-618)

合計: 約170行

#### 2-2. js/save-manager.js 新規作成

移動対象:
- `saveGameState()` (L1611-1631)
- `loadGameState()` (L1634-1689)

合計: 約80行

#### 2-3. transition-ui.js への移動

移動対象:
- `executeAction()` (L699-762)
- `addNextActionButton()` (L764-780)
- `appendNextActionButtonToPage()` (L783-818)
- `applyActionEffect()` (L820-860)
- `parseEffectString()` (L862-889)
- `getOrCreateButtonContainer()` (L1366-1383)
- `addMoreButton()` (L1385-1412)

合計: 約150行

---

### Phase 3: コード削除・整理（優先度低・リスク低）

#### 3-1. 削除対象

| 項目 | 行 | 理由 |
|------|-----|------|
| `clearChat()` | L891-900 | 未使用 |
| `dumpHistory()` | L902-906 | デバッグ専用 |
| `updateAllSelects()` | L695-697 | 空関数 |
| ストレージキーエイリアス | L296-305 | 冗長 |
| `window._stream*` フラグ | L1266-1268 | デバッグ用 |

#### 3-2. 定数化対象

```javascript
// constants.js に追加
const DEFAULTS = {
    RELATIONSHIP_PRIMARY: 'rel_001',
    RELATIONSHIP_SECONDARY: 'rel_302',
    COSTUME: 'cos_001',
    USER_START_PLACE: '101号室 玄関'
};
```

使用箇所:
- L222-223: characterStatus初期値
- L250-255: updateCharacterStatusArray()
- L1063: 初期設定の関係性
- L1075: ユーザー初期位置

---

## 外部ファイル化後の構成案

```
test_transition.html (~1400行)
├── グローバル変数・キャッシュ管理 (~100行)
├── 初期化・DOMContentLoaded (~50行)
├── ページ生成コア (generatePages, generateMorePages) (~250行)
├── 会話・移動処理 (~150行)
├── ページ情報表示（分割後） (~150行)
└── その他 (~100行)

js/
├── settings-manager.js (新規, ~170行)
├── save-manager.js (新規, ~80行)
├── transition-ui.js (既存+追加, ~700行)
├── transition-page.js (既存, ~430行)
├── transition-llm.js (既存, ~730行)
└── ... (他の既存ファイル)
```

**予想削減**: test_transition.html 2053行 → 約1400行 (約30%削減)

---

## 実施順序と注意事項

### 推奨実施順序

1. **Phase 3-1**: 未使用コード削除（低リスク・即効果）
2. **Phase 1-2**: 画像生成関数統合（中リスク・重複解消）
3. **Phase 2-1**: settings-manager.js 外部化（低リスク・可読性向上）
4. **Phase 2-2**: save-manager.js 外部化（低リスク）
5. **Phase 2-3**: transition-ui.js への移動（低リスク）
6. **Phase 1-1**: showPageInfo() 分割（中リスク・最後に）

### 各フェーズの注意点

| Phase | リスク | テスト項目 |
|-------|--------|-----------|
| 1-1 | 中 | ページ情報パネル表示、フィールド編集動作 |
| 1-2 | 中 | 通常画像生成、もっとボタンの画像生成 |
| 2-1 | 低 | 設定の保存・復元・同期 |
| 2-2 | 低 | セーブ・ロード動作 |
| 2-3 | 低 | アクション実行、ボタン表示 |
| 3-1 | 低 | 削除後の起動確認のみ |

### 共通注意事項

- 各変更後は必ず動作確認を実施
- 一度に大量の変更を行わず、1フェーズずつコミット
- グローバル変数への依存に注意（外部化時に引数化が必要な場合あり）
- `docs/test-procedure-test_transition.md` のテストを実行

---

## 見送り項目

| 項目 | 理由 |
|------|------|
| グローバル変数の状態オブジェクト化 | 影響範囲が広くリスク高。現状で動作問題なし |
| generatePages()のさらなる分割 | 外部化後に再検討 |
| CSSの未使用セレクタ削除 | transition.css 移行時に対応 |

---

## まとめ

| 指標 | 現状 | 目標 |
|------|------|------|
| test_transition.html 行数 | 2053行 | ~1400行 |
| 巨大関数の最大行数 | 370行 (generatePages) | ~150行 |
| 外部JSファイル数 | 11 | 13 |
| 重複コード | 2箇所 | 0 |
| デバッグコード | 5箇所 | 0 |
| マジックストリング | 4箇所 | 0 |

前回のリファクタリング（2025-12-17）で大幅に改善されたが、機能追加により再び肥大化。
本計画の実施により、さらなるメンテナンス性向上が期待できる。
