/**
 * ロック画面機能
 *
 * 依存: constants.js (STORAGE_KEYS, DEFAULTS)
 */

// ローカル定数
const LOCK_PASSWORD_KEY = STORAGE_KEYS.TRANSITION_LOCK_PASSWORD;
const DEFAULT_LOCK_PASSWORD = DEFAULTS.LOCK_PASSWORD;

/**
 * 保存されたロックパスワードを取得
 */
function getLockPassword() {
    return localStorage.getItem(LOCK_PASSWORD_KEY) || DEFAULT_LOCK_PASSWORD;
}

/**
 * ロックパスワードを保存
 */
function saveLockPassword() {
    const input = document.getElementById('lockPasswordInput');
    const password = input.value.trim();
    if (password && /^\d{4}$/.test(password)) {
        localStorage.setItem(LOCK_PASSWORD_KEY, password);
    } else if (password) {
        alert('パスワードは4桁の数字で入力してください');
        input.value = getLockPassword();
    }
}

/**
 * ロック画面を表示
 */
function showLockScreen() {
    const lockScreen = document.getElementById('lockScreen');
    lockScreen.classList.remove('hidden');
    // 入力欄をクリア
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`lockDigit${i}`).value = '';
        document.getElementById(`lockDigit${i}`).classList.remove('error');
    }
    document.getElementById('lockError').textContent = '';
}

/**
 * ロック画面を非表示
 */
function hideLockScreen() {
    document.getElementById('lockScreen').classList.add('hidden');
}

/**
 * テンキー入力処理
 */
function onNumpadInput(num) {
    // 空いている入力欄を探して入力
    for (let i = 1; i <= 4; i++) {
        const digit = document.getElementById(`lockDigit${i}`);
        if (digit.value === '') {
            digit.value = num;
            if (i === 4) {
                checkLockPassword();
            }
            break;
        }
    }
}

/**
 * テンキーバックスペース処理
 */
function onNumpadBackspace() {
    // 最後に入力されている欄を探して削除
    for (let i = 4; i >= 1; i--) {
        const digit = document.getElementById(`lockDigit${i}`);
        if (digit.value !== '') {
            digit.value = '';
            break;
        }
    }
    document.getElementById('lockError').textContent = '';
}

/**
 * パスワードチェック
 */
function checkLockPassword() {
    let enteredPassword = '';
    for (let i = 1; i <= 4; i++) {
        enteredPassword += document.getElementById(`lockDigit${i}`).value;
    }
    if (enteredPassword.length === 4) {
        if (enteredPassword === getLockPassword()) {
            hideLockScreen();
        } else {
            // エラー表示
            document.getElementById('lockError').textContent = 'パスワードが違います';
            for (let i = 1; i <= 4; i++) {
                const digit = document.getElementById(`lockDigit${i}`);
                digit.classList.add('error');
                digit.value = '';
            }
            setTimeout(() => {
                for (let i = 1; i <= 4; i++) {
                    document.getElementById(`lockDigit${i}`).classList.remove('error');
                }
            }, 300);
        }
    }
}

/**
 * ロック画面初期化
 */
function initLockScreen() {
    // タブ切り替え・アプリ切り替え検知
    let isFirstLoad = true;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !isFirstLoad) {
            showLockScreen();
        }
    });

    // モバイル：アプリ切り替えからの復帰
    window.addEventListener('pageshow', (e) => {
        if (e.persisted && !isFirstLoad) {
            showLockScreen();
        }
    });

    // モバイル：ウィンドウフォーカス時
    window.addEventListener('focus', () => {
        if (!isFirstLoad) {
            showLockScreen();
        }
    });

    // 初回ロードフラグを解除（少し遅延させる）
    setTimeout(() => {
        isFirstLoad = false;
    }, 1000);

    // 設定画面のパスワード欄に現在値を表示
    const lockPasswordInput = document.getElementById('lockPasswordInput');
    if (lockPasswordInput) {
        lockPasswordInput.value = getLockPassword();
    }
}
