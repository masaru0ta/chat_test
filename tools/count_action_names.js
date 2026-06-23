// llm_request.txt のプロンプト + action シートB列（カンマ区切りのアクション名）を連結し、
// LLM にリクエストして結果を表示するパイプライン。
//
// 使い方:  node tools/count_action_names.js
//
// 動作: get_action_column_b.js で B列を取得 → llm_request.txt のプロンプト末尾に連結
//       → llm_request.js の requestLLM() で OpenRouter に送信 → レスポンス表示。

const fs = require('node:fs');
const path = require('node:path');
const { getActionColumnB } = require('./get_action_column_b.js');
const { requestLLM } = require('./llm_request.js');

const PROMPT_FILE = path.join(__dirname, 'llm_request.txt');

async function main() {
  // ベースプロンプト（llm_request.txt）
  if (!fs.existsSync(PROMPT_FILE)) {
    throw new Error(`プロンプトファイルが見つかりません: ${PROMPT_FILE}`);
  }
  const basePrompt = fs.readFileSync(PROMPT_FILE, 'utf8').trim();

  // アクション名（B列）を取得
  console.log('action シートB列を取得中...');
  const { colName, values, joined } = await getActionColumnB();
  console.log(`取得: B列 (${colName}) ${values.length} 件`);

  // 連結してプロンプト構築
  const prompt = `${basePrompt}\n${joined}`;
  console.log('LLM にリクエスト中...');

  const { modelId, content } = await requestLLM(prompt);

  console.log(`モデル: ${modelId}`);
  console.log('');
  console.log('------------------------------------------------------------');
  console.log(content);
  console.log('------------------------------------------------------------');
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
