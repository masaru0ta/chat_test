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
 * @param {Object} options.character - キャラクターオブジェクト（タグ置換用）
 * @returns {Promise<Object>} { imageURL, seed }
 */
async function generateImage(apiKey, modelId, prompt, options = {}) {
    const seed = options.seed || Math.floor(Math.random() * 2147483647);

    // タグ置換 + 整形（prompt-utils.js）
    const cleanedPrompt = buildFinalPrompt(prompt, options.character);

    // 最終プロンプトをコンソールに出力
    console.log('[Runware] 画像生成リクエスト');
    console.log('[Runware] モデル:', modelId);
    console.log('[Runware] プロンプト:', cleanedPrompt);
    if (options.negativePrompt) {
        console.log('[Runware] ネガティブ:', options.negativePrompt);
    }

    const requestBody = {
        taskType: 'imageInference',
        taskUUID: crypto.randomUUID(),
        model: modelId,
        positivePrompt: cleanedPrompt,
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
    console.log('[Runware] レスポンス:', result);

    if (result.data && result.data.length > 0 && result.data[0].imageURL) {
        console.log('[Runware] 画像URL:', result.data[0].imageURL);
        return {
            imageURL: result.data[0].imageURL,
            seed: result.data[0].seed || seed
        };
    } else if (result.errors) {
        console.error('[Runware] エラー:', result.errors);
        throw new Error(result.errors.map(e => e.message).join(', '));
    } else {
        console.error('[Runware] 不明なエラー:', result);
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
