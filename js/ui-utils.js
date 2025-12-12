/**
 * UI共通ユーティリティ
 */

/**
 * ステータスメッセージを表示
 * @param {string} msg - 表示するメッセージ
 * @param {string} type - タイプ ('ok', 'error', 'loading')
 */
function showStatus(msg, type = 'ok') {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = msg;
    el.className = type === 'error' ? 'status-err' : type === 'loading' ? 'status-loading' : 'status-ok';
}

/**
 * ステータスをクリア
 */
function clearStatus() {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = '';
    el.className = '';
}
