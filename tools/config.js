// 秘匿設定（スプレッドシートID等）をローカルに外部化する。git 管理外。
//
// 優先順位: 環境変数 SPREADSHEET_ID > tools/config.local.json
// セットアップ: tools/config.example.json を tools/config.local.json にコピーして値を入れる。

const fs = require('node:fs');
const path = require('node:path');

function getSpreadsheetId() {
  const fromEnv = (process.env.SPREADSHEET_ID || '').trim();
  if (fromEnv) return fromEnv;

  const file = path.join(__dirname, 'config.local.json');
  if (fs.existsSync(file)) {
    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      throw new Error(`tools/config.local.json の読み込みに失敗しました: ${e.message}`);
    }
    if (cfg.spreadsheetId) return String(cfg.spreadsheetId).trim();
  }

  throw new Error(
    'スプレッドシートIDが未設定です。tools/config.example.json をコピーして ' +
    'tools/config.local.json を作成するか、環境変数 SPREADSHEET_ID を設定してください。'
  );
}

module.exports = { getSpreadsheetId };
