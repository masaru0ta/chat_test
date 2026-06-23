// action シートの B列（2列目）を取得し、カンマ区切り文字列にする
//
// 使い方:  node tools/get_action_column_b.js
//
// 動作: 公開CSVエクスポートから action シート(gid=0)を取得 → B列をヘッダー除外・空欄スキップで
//       カンマ連結 → コンソール表示＆（Windowsの clip 経由で）クリップボードへコピー。
//
// 他スクリプトから require して getActionColumnB() を再利用することも可能。

const { spawnSync } = require('node:child_process');
const { getSpreadsheetId } = require('./config.js');

// --- 設定 ---
const ACTION_GID = 0; // action シート

// action シートのCSVエクスポートURL
function actionCsvUrl() {
  return `https://docs.google.com/spreadsheets/d/${getSpreadsheetId()}/export?format=csv&gid=${ACTION_GID}`;
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

// action シートの B列を取得し、{ colName, values, joined } を返す
async function getActionColumnB() {
  const res = await fetch(actionCsvUrl()); // Node18+ はグローバル fetch / リダイレクト自動追従
  if (!res.ok) {
    throw new Error(`取得失敗: HTTP ${res.status}。シートの公開設定を確認してください。`);
  }
  const rows = parseCsv(await res.text()).filter(r => r.some(c => c.trim() !== '')); // 完全な空行は除外
  if (rows.length === 0) throw new Error('データが取得できませんでした。');

  const header = rows[0];
  if (header.length < 2) throw new Error(`B列（2列目）が存在しません。列数: ${header.length}`);
  const colName = header[1];

  // B列 = index 1。ヘッダー行(rows[0])を除外し、空欄をスキップ
  const values = rows.slice(1)
    .map(r => (r[1] ?? '').trim())
    .filter(v => v !== '');

  return { colName, values, joined: values.join(',') };
}

async function main() {
  console.log('シートを取得中...');
  const { colName, values, joined } = await getActionColumnB();

  console.log('');
  console.log(`対象列: B列 (${colName})`);
  console.log(`件数:   ${values.length}`);
  console.log('------------------------------------------------------------');
  console.log(joined);
  console.log('------------------------------------------------------------');

  // クリップボードへコピー（Windows: clip）
  if (process.platform === 'win32') {
    const r = spawnSync('clip', { input: joined, encoding: 'utf8' });
    if (r.status === 0) console.log('クリップボードにコピーしました。');
    else console.log('クリップボードへのコピーに失敗しました（表示のみ）。');
  }
}

module.exports = { getActionColumnB };

// CLI として直接実行された場合のみ main を走らせる
if (require.main === module) {
  main().catch(err => {
    console.error('エラー:', err.message);
    process.exit(1);
  });
}
