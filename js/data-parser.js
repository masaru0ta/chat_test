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
            cast: item.cast || '',
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
            place_type: item['place_type'] || '',
            root_place: item['root_place'] || '',
            default_action: item['default action'] || '',
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
            action_type: item['action_type'] || '',
            pre_action: item['pre-action'] || '',
            public_action: item['public-action'] || '',
            next_action: item['next-action'] || '',
            effect: item['effect'] || '',
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

/**
 * LLMプロンプトテンプレートをパース
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Object} キーをキーとしたテンプレートオブジェクト
 */
function parsePromptTemplates(rawData) {
    const templates = {};
    if (!Array.isArray(rawData)) {
        console.warn('[parsePromptTemplates] データが配列ではありません:', rawData);
        return templates;
    }
    rawData.forEach(item => {
        const key = item.key;
        if (key) {
            templates[key] = {
                name: item.name || '',
                prompt: item.prompt || ''
            };
        }
    });
    return templates;
}

/**
 * 関係性データをパース
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Array} パース済み関係性配列
 */
function parseRelationships(rawData) {
    // 既存のrel_xxx形式のIDから最大番号を取得
    let maxNum = 0;
    rawData.forEach(item => {
        const id = item['relationship_id'] || '';
        const match = id.match(/^rel_(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });

    return rawData.map(item => {
        let relationshipId = item['relationship_id'] || '';
        if (!relationshipId) {
            maxNum++;
            relationshipId = 'rel_' + String(maxNum).padStart(3, '0');
        }

        return {
            relationship_id: relationshipId,
            name: item.name || '',
            description: item.description || '',
            next_relationship_req: item['next_relationship_req'] || '',
            private: item['private'] || '',
            semi_private: item['semi_private'] || '',
            expression: item['expression'] || ''
        };
    });
}

/**
 * 衣装データをパース
 * @param {Array} rawData - GASから取得した生データ
 * @returns {Array} パース済み衣装配列
 */
function parseCostumes(rawData) {
    // 既存のcos_xxx形式のIDから最大番号を取得
    let maxNum = 0;
    rawData.forEach(item => {
        const id = item['costume_id'] || '';
        const match = id.match(/^cos_(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });

    return rawData.map(item => {
        let costumeId = item['costume_id'] || '';
        if (!costumeId) {
            maxNum++;
            costumeId = 'cos_' + String(maxNum).padStart(3, '0');
        }

        return {
            costume_id: costumeId,
            name: item.name || '',
            tag: item.tag || '',
            camel_tag: item['camel_tag'] || ''
        };
    });
}

/**
 * プロンプトテンプレートを取得し、変数を置換
 * @param {Object} templates - テンプレートオブジェクト
 * @param {string} key - テンプレートキー
 * @param {Object} vars - 置換変数 { name: '鹿目まどか' } など
 * @returns {string} 置換済みプロンプト
 */
function getPromptTemplate(templates, key, vars = {}) {
    const template = templates[key];
    if (!template) {
        console.warn(`[Prompt] テンプレート未定義: ${key}`);
        return '';
    }
    let prompt = template.prompt;
    // {name} などのプレースホルダーを置換
    Object.keys(vars).forEach(varKey => {
        prompt = prompt.replace(new RegExp(`\\{${varKey}\\}`, 'g'), vars[varKey]);
    });
    return prompt;
}
