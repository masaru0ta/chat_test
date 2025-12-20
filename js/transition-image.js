/**
 * 画像生成関連機能
 * 依存: models, actions, costumes, relationships, selectedModelId, imageGenEnabled (グローバル)
 *       prompt-utils.js, ui-utils.js, runware-api.js
 */

// 画像生成プロンプト構築（共通関数）
// 戻り値: { finalPrompt, negativePrompt, characterWithExtras } または null
function buildImageGenPrompt(modelId, character, place, actionIndex, compositionTag, costumeId, relationshipId) {
    if (!modelId || !models[modelId]) return null;
    const model = models[modelId];

    // プロンプト構築（image_gen_base.htmlと同じ順序）
    const parts = [
        model?.qualityPositive || '',           // 品質タグ（ポジティブ）
        character?.tag || '',                    // キャラタグ
        place?.tag || '',                        // 場所タグ
        (actionIndex >= 0 && actions[actionIndex]) ? actions[actionIndex].prompt : '',  // アクションプロンプト
        compositionTag || '',                    // 構図タグ
        place?.additionalTag || '',              // 場所の追加タグ
        character?.additionalTag || ''           // キャラの追加タグ
    ].filter(p => p);

    if (parts.length === 0) return null;

    const prompt = cleanPrompt(parts.join(', '));
    const negativePrompt = model?.qualityNegative || '';

    // costumeIdから服装タグ・camelタグを取得
    let clothesTag = '';
    let camelTag = '';
    if (costumeId) {
        const costume = costumes.find(c => c.costume_id === costumeId);
        if (costume) {
            clothesTag = costume.tag || '';
            camelTag = costume.camel_tag || '';
        }
    }

    // relationshipIdから表情タグを取得
    let expressionTag = '';
    if (relationshipId) {
        const relationship = relationships.find(r => r.relationship_id === relationshipId);
        if (relationship) {
            expressionTag = relationship.expression || '';
        }
    }

    // キャラクターオブジェクトにclothes, camel, expression追加
    const characterWithExtras = character
        ? { ...character, clothes: clothesTag, camel: camelTag, expression: expressionTag }
        : { clothes: clothesTag, camel: camelTag, expression: expressionTag };

    // タグ置換して最終プロンプトを生成
    const finalPrompt = buildFinalPrompt(prompt, characterWithExtras);

    return { finalPrompt, negativePrompt, characterWithExtras };
}

// キャラクター画像生成（統合版）
// options: { character, charAtLocation, place, actionIndex, costumeId, relationshipId, compositionTag, promptPrefix }
// 戻り値: { imageURL, imageGenInfo } または null
async function generateCharacterImage(options) {
    const runwareApiKey = document.getElementById('runwareApiKey').value.trim();
    if (!runwareApiKey) return null;

    // charAtLocationから各値を取得（直接指定があれば優先）
    const character = options.character || options.charAtLocation?.character;
    const costumeId = options.costumeId ?? options.charAtLocation?.status?.costumeId ?? null;
    const relationshipId = options.relationshipId ?? options.charAtLocation?.status?.relationshipId ?? null;
    const actionIndex = options.actionIndex ?? -1;
    const place = options.place;

    if (!character) return null;

    // モデル取得（選択されたモデルを優先、なければ最初のモデル）
    const modelId = selectedModelId || getFirstModelId(models);
    if (!modelId || !models[modelId]) {
        console.log('[画像生成] モデルが未設定');
        return null;
    }

    // 構図タグ（明示指定があれば使用、なければ自動取得）
    const compositionTag = options.compositionTag || getCompositionTag(actions, actionIndex);

    // プロンプト構築（共通関数を使用）
    const promptResult = buildImageGenPrompt(modelId, character, place, actionIndex, compositionTag, costumeId, relationshipId);
    if (!promptResult) {
        console.log('[画像生成] プロンプトが空のためスキップ');
        return null;
    }

    let { finalPrompt, negativePrompt, characterWithExtras } = promptResult;

    // promptPrefixがあれば先頭に追加
    if (options.promptPrefix) {
        finalPrompt = options.promptPrefix + ', ' + finalPrompt;
    }

    console.log('[画像生成] プロンプト:', finalPrompt);
    console.log('[画像生成] ネガティブ:', negativePrompt);

    showStatusImage();
    const result = await generateImage(runwareApiKey, modelId, finalPrompt, {
        negativePrompt: negativePrompt,
        steps: models[modelId]?.steps || 20,
        cfgScale: models[modelId]?.cfgScale || 7,
        scheduler: models[modelId]?.scheduler || 'Default',
        width: 1024,
        height: 1024,
        character: characterWithExtras
    });
    hideStatusImage();

    // 画像生成情報を含めて返す（IDのみ保持、名前は表示時に取得）
    return {
        imageURL: result.imageURL,
        imageGenInfo: {
            modelId: modelId,
            compositionTag: compositionTag,
            seed: result.seed
        }
    };
}

// 画像生成を非同期に開始（ブロックを回避）
// 戻り値: Promise<{ imageURL, imageGenInfo }> または null
function startImageGenerationAsync(charAtLocation, currentPlace) {
    const runwareApiKey = document.getElementById('runwareApiKey').value.trim();
    if (!charAtLocation || !imageGenEnabled || !runwareApiKey) {
        return null;
    }
    localStorage.setItem(STORAGE_KEYS.TRANSITION_RUNWARE_API_KEY, runwareApiKey);
    const charActionIndex = charAtLocation.status?.actionIndex ?? -1;
    return new Promise(resolve => {
        setTimeout(async () => {
            try {
                const result = await generateCharacterImage({
                    charAtLocation: charAtLocation,
                    place: currentPlace,
                    actionIndex: charActionIndex
                });
                resolve(result); // { imageURL, imageGenInfo } または null
            } catch (e) {
                console.error('[画像生成エラー]', e);
                resolve(null);
            }
        }, 0);
    });
}
