/**
 * action シートに「新規アクション」を1行だけ追記する関数（追記専用・安全設計）
 * =================================================================
 * ★安全性のポイント
 *  - sheet.appendRow() で「末尾に1行追加」するだけ。既存の行・セルは一切読み書き・変更しない。
 *  - 設定するのは action_id / action name / prompt の3列のみ。他の列は空欄。
 *  - action_id は既存の act_NNN を走査して「最大+1」を自動採番（重複を避ける）。
 *  - 対象シートは 'action' に限定（他シートには触れない）。
 *
 * 【導入手順】
 * 1. この内容を、スプレッドシートにバインドされた Apps Script プロジェクト（action等を配信しているGAS）に貼り付ける。
 * 2. 既存の doPost の「先頭」に次の1行を追加して分岐させる（既存の保存処理より前に置くこと）:
 *
 *      function doPost(e) {
 *        if (e && e.parameter && e.parameter.action === 'appendAction') return appendAction(e);
 *        ...既存の処理...
 *      }
 *
 * 3. 「デプロイを管理」→ 新バージョンでデプロイ（アクセス: 全員）。
 *
 * 【呼び出し方】
 *   POST  {DATA_GAS_URL}?action=appendAction
 *   Content-Type: text/plain;charset=utf-8
 *   body(JSON): { "actionName": "アクション名", "prompt": "tag1, tag2, ..." }
 *
 * 返り値: { "status":"success", "action_id":"act_049", "name":"..." } / { "status":"error", "message":"..." }
 */
function appendAction(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var actionName = String(body.actionName || '').trim();
    var prompt = String(body.prompt || '').trim();
    if (!actionName && !prompt) {
      return appendActionOut_({ status: 'error', message: 'actionName / prompt が空です' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('action');
    if (!sheet) return appendActionOut_({ status: 'error', message: "'action' シートが見つかりません" });

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return appendActionOut_({ status: 'error', message: 'ヘッダーがありません' });

    // ヘッダー行（1行目）だけを読み取り、列位置を特定（既存データ行は読まない）
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
    var idxId = headers.indexOf('action_id');
    var idxName = headers.indexOf('action name');
    var idxPrompt = headers.indexOf('prompt');
    if (idxId < 0 || idxName < 0 || idxPrompt < 0) {
      return appendActionOut_({ status: 'error', message: '必要な列が見つかりません（action_id / action name / prompt）' });
    }

    // 既存の action_id 列のみを参照して最大番号を採番（書き込みはしない）
    var maxNum = 0;
    if (lastRow >= 2) {
      var ids = sheet.getRange(2, idxId + 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        var m = String(ids[i][0]).match(/^act_(\d+)$/);
        if (m) { var n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
      }
    }
    var newId = 'act_' + ('000' + (maxNum + 1)).slice(-3);

    // 新規行：全列を空にし、3列だけ設定 → 末尾に追記（既存行は不変）
    var row = [];
    for (var c = 0; c < lastCol; c++) row.push('');
    row[idxId] = newId;
    row[idxName] = actionName;
    row[idxPrompt] = prompt;
    sheet.appendRow(row);

    return appendActionOut_({ status: 'success', action_id: newId, name: actionName });
  } catch (err) {
    return appendActionOut_({ status: 'error', message: String(err) });
  }
}

function appendActionOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
