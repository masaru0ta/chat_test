/**
 * GAS API通信
 */

/**
 * GASからデータを取得
 * @param {string} baseUrl - GASのベースURL
 * @param {string} sheet - シート名
 * @returns {Promise<Array>} データ配列
 */
async function fetchGasData(baseUrl, sheet) {
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'sheet=' + sheet;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${sheet}: HTTP ${response.status}`);
    }
    return await response.json();
}

/**
 * GASからメタデータ（最終更新日時）を取得
 * @param {string} baseUrl - GASのベースURL
 * @returns {Promise<Object>} { lastUpdated: ISO日時文字列 }
 */
async function fetchGasMeta(baseUrl) {
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'meta=true';
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`meta: HTTP ${response.status}`);
    }
    return await response.json();
}

/**
 * GASにデータを保存
 * @param {string} baseUrl - GASのベースURL
 * @param {string} sheet - シート名
 * @param {Array} data - 保存するデータ
 * @returns {Promise<Object>} レスポンス
 */
async function saveGasData(baseUrl, sheet, data) {
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'sheet=' + sheet;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(data)
    });
    return await response.json();
}
