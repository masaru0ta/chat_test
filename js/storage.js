/**
 * LocalStorage操作
 */

/**
 * 設定を保存
 * @param {string} gasUrlKey - GAS URLのストレージキー
 * @param {string} apiKeyKey - APIキーのストレージキー
 * @param {string} gasUrl - GAS URL
 * @param {string} apiKey - APIキー
 */
function saveSettings(gasUrlKey, apiKeyKey, gasUrl, apiKey) {
    if (gasUrl) localStorage.setItem(gasUrlKey, gasUrl);
    if (apiKey) localStorage.setItem(apiKeyKey, apiKey);
}

/**
 * 設定を読み込み
 * @param {string} gasUrlKey - GAS URLのストレージキー
 * @param {string} apiKeyKey - APIキーのストレージキー
 * @returns {Object} 設定オブジェクト
 */
function loadSettings(gasUrlKey, apiKeyKey) {
    return {
        gasUrl: localStorage.getItem(gasUrlKey) || '',
        apiKey: localStorage.getItem(apiKeyKey) || ''
    };
}

/**
 * キャッシュデータを保存
 * @param {string} key - ストレージキー
 * @param {any} data - 保存するデータ
 */
function saveToCache(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

/**
 * キャッシュデータを読み込み
 * @param {string} key - ストレージキー
 * @returns {any} 読み込んだデータ（なければnull）
 */
function loadFromCache(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('キャッシュ読み込みエラー:', error);
        return null;
    }
}
