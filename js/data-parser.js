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
    // 既存のchr_xxx形式のIDから最大番号を取得
    let maxNum = 0;
    rawData.forEach(item => {
        const id = item['character_id'] || '';
        const match = id.match(/^chr_(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });

    return rawData.map(item => {
        let characterId = item['character_id'] || '';
        if (!characterId) {
            maxNum++;
            characterId = 'chr_' + String(maxNum).padStart(3, '0');
        }

        return {
            character_id: characterId,
            name: item.name || '',
            series: item.series || '',
            tag: item.tag || '',
            profile: item.profile || '',
            uniform1: item.uniform1 || '',
            uniform2: item.uniform2 || '',
            additionalTag: item['additional tag'] || '',
            image: item.image || ''
        };
    });
}

/**
 * 場所データをパース
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Array} パース済み場所配列
 */
function parsePlaces(rawData) {
    // 既存のplc_xxx形式のIDから最大番号を取得
    let maxNum = 0;
    rawData.forEach(item => {
        const id = item['place_id'] || '';
        const match = id.match(/^plc_(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });

    return rawData.map(item => {
        let placeId = item['place_id'] || '';
        if (!placeId) {
            maxNum++;
            placeId = 'plc_' + String(maxNum).padStart(3, '0');
        }

        return {
            place_id: placeId,
            name: item.name || '',
            tag: item.tag || '',
            additionalTag: item['additional tag'] || '',
            command_list: item['command_list'] || '',
            public_flag: item['public_flag'] || '',
            image: item.image || ''
        };
    });
}

/**
 * アクションデータをパース（構図情報付き）
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Array} パース済みアクション配列（構図情報付き）
 */
function parseActionsWithCompositions(rawData) {
    // 既存のact_xxx形式のIDから最大番号を取得
    let maxNum = 0;
    rawData.forEach(item => {
        const id = item['action_id'] || '';
        const match = id.match(/^act_(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });

    return rawData.map(item => {
        let actionId = item['action_id'] || '';
        if (!actionId) {
            maxNum++;
            actionId = 'act_' + String(maxNum).padStart(3, '0');
        }

        const action = {
            action_id: actionId,
            name: item['action name'] || '',
            prompt: item.prompt || '',
            command_list: item['command_list'] || '',
            pre_action: item['pre-action'] || '',
            public_action: item['public-action'] || '',
            next_action: item['next-action'] || '',
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
