/**
 * UI共通ユーティリティ
 */

// トースト非表示タイマー
let toastTimer = null;

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

    // トースト表示
    const toast = document.getElementById('toast');
    if (toast) {
        // 既存のタイマーをクリア
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }

        if (msg) {
            toast.textContent = msg;
            const typeClass = type === 'error' ? 'status-error' : type === 'loading' ? 'status-loading' : 'status-ok';
            toast.className = `toast show ${typeClass}`;

            // loading以外は2秒後に非表示
            if (type !== 'loading') {
                toastTimer = setTimeout(() => {
                    toast.className = 'toast';
                }, 2000);
            }
        } else {
            toast.className = 'toast';
        }
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
