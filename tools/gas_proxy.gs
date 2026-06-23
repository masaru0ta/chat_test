/**
 * 汎用 GAS プロキシ（CORS回避用）
 * =================================================================
 * ブラウザ → このGAS(/exec) → 任意の許可ホスト
 * （サーバー間通信なのでCORSは無関係。file:// 直開きのページからも使える）
 *
 * 【導入手順】
 * 1. このファイルの内容を、あなたのGASプロジェクト（Code.gs など）に貼り付ける。
 * 2. 既存の doGet / doPost の「先頭」に、下記の1行を追加して proxy を分岐させる:
 *
 *      function doGet(e) {
 *        if (e && e.parameter && e.parameter.proxy) return handleProxy(e);
 *        ...既存の処理...
 *      }
 *      function doPost(e) {
 *        if (e && e.parameter && e.parameter.proxy) return handleProxy(e);
 *        ...既存の処理...
 *      }
 *
 *    （既存の doGet/doPost が無ければ、この下にある雛形をそのまま使ってよい）
 * 3. デプロイ → 「新しいバージョン」で再デプロイ（アクセス: 全員 / Anyone）。
 *
 * 【呼び出し方（POST: 推奨。プリフライトが出ないので file:// でも動く）】
 *   POST  {GAS_URL}?proxy=1
 *   Content-Type: text/plain;charset=utf-8     ← これが重要（simple request化）
 *   body(JSON文字列):
 *     {
 *       "url":        "https://search-new.civitai.com/multi-search",
 *       "method":     "POST",
 *       "contentType":"application/json",
 *       "headers":    { "Authorization": "Bearer xxxxx" },
 *       "payload":    "<送信したい本文の文字列>"
 *     }
 *
 * 【呼び出し方（GET: シンプルな取得用）】
 *   GET   {GAS_URL}?proxy=1&url=<encodeURIComponent(対象URL)>&method=GET
 *
 * レスポンスは上流(civitai等)の本文をそのまま返す（mimeType=JSON固定）。
 * 失敗時は { "proxyError": "理由" } を返す。
 */

// セキュリティのため、転送を許可するホストを限定する（必要に応じて追記）。
// 完全オープンプロキシ化を避けるための allowlist。
var PROXY_ALLOWED_HOSTS = [
  'search-new.civitai.com',
  'civitai.com',
  'image.civitai.com'
];

function handleProxy(e) {
  try {
    var req;

    // POST(JSON本文) と GET(クエリ) の両対応
    if (e && e.postData && e.postData.contents) {
      req = JSON.parse(e.postData.contents);
    } else {
      var p = (e && e.parameter) || {};
      req = {
        url: p.url,
        method: p.method || 'GET',
        contentType: p.contentType,
        headers: p.headers ? JSON.parse(p.headers) : undefined,
        payload: p.payload
      };
    }

    if (!req || !req.url) return proxyError('url is required');

    // 転送先ホストの許可チェック
    var host = String(req.url).replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
    var allowed = PROXY_ALLOWED_HOSTS.some(function (h) {
      return host === h || host.slice(-(h.length + 1)) === ('.' + h);
    });
    if (!allowed) return proxyError('host not allowed: ' + host);

    // UrlFetchApp オプション組み立て
    var options = {
      method: String(req.method || 'GET').toLowerCase(),
      muteHttpExceptions: true,
      followRedirects: true
    };
    if (req.headers) options.headers = req.headers;            // 例: Authorization
    if (req.contentType) options.contentType = req.contentType; // 例: application/json
    if (req.payload !== undefined && req.payload !== null) options.payload = req.payload;

    var resp = UrlFetchApp.fetch(req.url, options);
    var text = resp.getContentText();

    return ContentService
      .createTextOutput(text)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return proxyError(String(err));
  }
}

function proxyError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ proxyError: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* -----------------------------------------------------------------
 * 既存の doGet/doPost が無いプロジェクト用の雛形（ある場合は不要）:
 *
 * function doGet(e) {
 *   if (e && e.parameter && e.parameter.proxy) return handleProxy(e);
 *   return ContentService.createTextOutput('OK');
 * }
 * function doPost(e) {
 *   if (e && e.parameter && e.parameter.proxy) return handleProxy(e);
 *   return ContentService.createTextOutput('OK');
 * }
 * ----------------------------------------------------------------- */
