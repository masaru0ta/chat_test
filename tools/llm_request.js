// settings シートの chatApiKey / llmModelId を使って LLM(OpenRouter) にリクエストを投げ、レスポンスを表示する
//
// 使い方:  node tools/llm_request.js              … llm_request.txt のプロンプトを使用
//          node tools/llm_request.js "上書き文字列"  … 引数があればそちらを優先
//
// 動作: 公開シートの settings(key/value) から chatApiKey と llmModelId を取得
//       → OpenRouter chat/completions に POST → レスポンス本文を表示。
//       リクエストプロンプトは同ディレクトリの llm_request.txt に外部化。
//
// 他スクリプトから require して requestLLM(prompt) を再利用することも可能。

const fs = require('node:fs');
const path = require('node:path');
const { getSpreadsheetId } = require('./config.js');

// --- 設定 ---
const SETTINGS_GID = 930706504; // settings シート
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROMPT_FILE = path.join(__dirname, 'llm_request.txt'); // 外部化したプロンプト

// settings シートのCSVエクスポートURL（gviz は行を誤結合するため gid 指定の export を使う）
function settingsCsvUrl() {
  return `https://docs.google.com/spreadsheets/d/${getSpreadsheetId()}/export?format=csv&gid=${SETTINGS_GID}`;
}

// --- 最小CSVパーサ（引用符・カンマ・改行をフィールド内に含むケースに対応） ---
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM除去

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // エスケープされた "
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* 無視（\r\n対応） */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// settings シートを key/value マップ化
async function loadSettings() {
  const res = await fetch(settingsCsvUrl());
  if (!res.ok) {
    throw new Error(`settings 取得失敗: HTTP ${res.status}。シートの公開設定を確認してください。`);
  }
  const rows = parseCsv(await res.text()).filter(r => r.some(c => c.trim() !== ''));
  const map = new Map();
  for (const r of rows) {
    const key = (r[0] ?? '').trim();
    const value = (r[1] ?? '').trim();
    if (key) map.set(key, value);
  }
  if (map.get('key') === 'value') map.delete('key'); // 先頭ヘッダー行を無視
  return map;
}

// プロンプトを渡して LLM のレスポンスを取得（{ modelId, content } を返す）
async function requestLLM(prompt) {
  const settings = await loadSettings();
  const apiKey = settings.get('chatApiKey');
  const modelId = settings.get('llmModelId');
  if (!apiKey) throw new Error('settings に chatApiKey が見つかりません。');
  if (!modelId) throw new Error('settings に llmModelId が見つかりません。');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM リクエスト失敗: HTTP ${res.status}\n${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '(レスポンス本文が取得できませんでした)';
  return { modelId, content };
}

// リクエストプロンプトを解決（CLI引数 > llm_request.txt）
function resolvePrompt() {
  const cliPrompt = process.argv.slice(2).join(' ').trim();
  if (cliPrompt) return cliPrompt;

  if (!fs.existsSync(PROMPT_FILE)) {
    throw new Error(`プロンプトファイルが見つかりません: ${PROMPT_FILE}`);
  }
  const filePrompt = fs.readFileSync(PROMPT_FILE, 'utf8').trim();
  if (!filePrompt) {
    throw new Error(`プロンプトが空です。${path.basename(PROMPT_FILE)} に内容を記述してください。`);
  }
  return filePrompt;
}

async function main() {
  const prompt = resolvePrompt();
  console.log('settings を取得中...');
  console.log(`プロンプト: ${prompt}`);
  console.log('LLM にリクエスト中...');

  const { modelId, content } = await requestLLM(prompt);

  console.log(`モデル: ${modelId}`);
  console.log('');
  console.log('------------------------------------------------------------');
  console.log(content);
  console.log('------------------------------------------------------------');
}

module.exports = { requestLLM, loadSettings };

// CLI として直接実行された場合のみ main を走らせる
if (require.main === module) {
  main().catch(err => {
    console.error('エラー:', err.message);
    process.exit(1);
  });
}
