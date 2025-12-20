/**
 * UI共通ユーティリティ
 */

/**
 * ステータスメッセージを表示
 * @param {string} msg - 表示するメッセージ
 * @param {string} type - タイプ ('ok', 'error', 'loading')
 */
function showStatus(msg, type = 'ok') {
    // 設定モーダル内のステータス
    const el = document.getElementById('status');
    if (el) {
        el.textContent = msg;
        el.className = type === 'error' ? 'status-err' : type === 'loading' ? 'status-loading' : 'status-ok';
    }

    // グローバルステータス
    const globalEl = document.getElementById('globalStatus');
    if (globalEl) {
        globalEl.textContent = msg;
        const typeClass = type === 'error' ? 'status-error' : type === 'loading' ? 'status-loading' : 'status-ok';
        globalEl.className = msg ? `global-status active ${typeClass}` : 'global-status';
    }
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
