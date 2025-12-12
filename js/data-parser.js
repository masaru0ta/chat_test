/**
 * GASデータのパーサー
 */

/**
 * モデルデータをパース
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Object} パース済みモデルオブジェクト
 */
function parseModels(rawData) {
    const models = {};
    rawData.forEach(item => {
        const modelId = item.model_id || item.id;
        if (modelId) {
            models[modelId] = {
                name: item.name || modelId,
                steps: parseInt(item.steps) || 20,
                cfgScale: parseFloat(item.cfg) || 7,
                scheduler: item.scheduler || 'Default',
                qualityPositive: item['prompt positive'] || '',
                qualityNegative: item['prompt negative'] || ''
            };
        }
    });
    return models;
}

/**
 * キャラクターデータをパース
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Array} パース済みキャラクター配列
 */
function parseCharacters(rawData) {
    return rawData.map(item => ({
        name: item.name || '',
        series: item.series || '',
        tag: item.tag || '',
        profile: item.profile || '',
        uniform1: item.uniform1 || '',
        uniform2: item.uniform2 || '',
        additionalTag: item['additional tag'] || '',
        image: item.image || ''
    }));
}

/**
 * 場所データをパース
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Array} パース済み場所配列
 */
function parsePlaces(rawData) {
    return rawData.map(item => ({
        name: item.name || '',
        tag: item.tag || '',
        additionalTag: item['additional tag'] || ''
    }));
}

/**
 * アクションデータをパース（構図情報付き）
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Array} パース済みアクション配列（構図情報付き）
 */
function parseActionsWithCompositions(rawData) {
    return rawData.map(item => {
        const action = {
            name: item['action name'] || '',
            prompt: item.prompt || '',
            compositions: []
        };

        COMPOSITION_KEYS.forEach(key => {
            const qualityKey = key + ' quality';
            const tagKey = key + ' tag';
            const quality = item[qualityKey] || '';
            const tag = item[tagKey] || '';

            // NG以外は全て追加（品質・タグ未設定でも選択可能）
            if (quality !== 'NG') {
                action.compositions.push({
                    name: key,
                    tag: tag,
                    quality: quality  // 生の値をそのまま保存
                });
            }
        });

        return action;
    });
}
