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
