/**
 * Runware API通信
 */

/**
 * Runware APIで画像を生成
 * @param {string} apiKey - APIキー
 * @param {string} modelId - モデルID
 * @param {string} prompt - プロンプト
 * @param {Object} options - オプション
 * @param {string} options.negativePrompt - ネガティブプロンプト
 * @param {number} options.steps - ステップ数
 * @param {number} options.cfgScale - CFGスケール
 * @param {string} options.scheduler - スケジューラー
 * @param {number} options.width - 幅
 * @param {number} options.height - 高さ
 * @param {number} options.seed - シード値
 * @returns {Promise<Object>} { imageURL, seed }
 */
async function generateImage(apiKey, modelId, prompt, options = {}) {
    const seed = options.seed || Math.floor(Math.random() * 2147483647);

    // 最終プロンプトをコンソールに出力
    console.log('[Runware] 画像生成リクエスト');
    console.log('[Runware] モデル:', modelId);
    console.log('[Runware] プロンプト:', prompt);
    if (options.negativePrompt) {
        console.log('[Runware] ネガティブ:', options.negativePrompt);
    }

    const requestBody = {
        taskType: 'imageInference',
        taskUUID: crypto.randomUUID(),
        model: modelId,
        positivePrompt: prompt,
        steps: options.steps || 20,
        CFGScale: options.cfgScale || 7,
        scheduler: options.scheduler || 'Default',
        width: options.width || 1024,
        height: options.height || 1024,
        seed: seed,
        numberResults: 1
    };

    if (options.negativePrompt && options.negativePrompt.length >= 2) {
        requestBody.negativePrompt = options.negativePrompt;
    }

    const response = await fetch(API_CONFIG.RUNWARE_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify([requestBody])
    });

    const result = await response.json();

    if (result.data && result.data.length > 0 && result.data[0].imageURL) {
        return {
            imageURL: result.data[0].imageURL,
            seed: result.data[0].seed || seed
        };
    } else if (result.errors) {
        throw new Error(result.errors.map(e => e.message).join(', '));
    } else {
        throw new Error('画像の生成に失敗しました');
    }
}

/**
 * モデルリストの最初のモデルIDを取得
 * @param {Object} models - モデルオブジェクト
 * @returns {string|null} モデルID
 */
function getFirstModelId(models) {
    return Object.keys(models)[0] || null;
}

/**
 * プロンプトの連続カンマを修正
 * @param {string} prompt - プロンプト
 * @returns {string} 整形されたプロンプト
 */
function cleanPrompt(prompt) {
    return prompt
        .replace(/,\s*,+/g, ',')  // 連続カンマを1つに
        .replace(/^,\s*/, '')      // 先頭のカンマを削除
        .replace(/,\s*$/, '')      // 末尾のカンマを削除
        .trim();
}
