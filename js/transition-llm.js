/**
 * Transition LLM Functions
 *
 * 依存: transition-state.js, transition-page.js, prompt-utils.js, gas-api.js, constants.js, data-parser.js
 */

// ========== ユーティリティ ==========

/**
 * agentの値を表示用テキストに変換
 * @param {string} agent - アクションのagent値
 * @param {Object} charAtLocation - キャラクター情報
 * @returns {string} 表示用テキスト
 */
function resolveAgentText(agent, charAtLocation) {
    if (!agent || agent === '') return '';
    if (agent === 'user') return '主人公が';
    if (agent === 'character' && charAtLocation) return `${charAtLocation.character.name}が`;
    if (agent === 'they') return '二人は';
    return '';
}

// ========== テンプレート取得 ==========

/**
 * 必須テンプレートを取得（存在しない場合はエラー）
 * @param {string} key - テンプレートキー
 * @param {Object} vars - 置換変数
 * @returns {string} 展開済みプロンプト
 * @throws {Error} テンプレートが存在しない場合
 */
function requirePromptTemplate(key, vars = {}) {
    const result = getPromptTemplate(promptTemplates, key, vars);
    if (!result) {
        const error = `[LLM] 必須テンプレート未定義: ${key}`;
        console.error(error);
        throw new Error(error);
    }
    return result;
}

// ========== ストリームハンドラー ==========

/**
 * ストリーム受信時のコールバック生成
 */
function createStreamChunkHandler(streamPageIndex, useAddDialogueMode, appendBaseHtml) {
    return (accumulatedText) => {
        // 【導入】または【地の文】タグがあればその内容を抽出、なければ全体を表示
        let displayText = accumulatedText;
        const introMatch = accumulatedText.match(/【導入】\s*([\s\S]*?)(?=【|$)/);
        const narrativeMatch = accumulatedText.match(/【地の文】\s*([\s\S]*?)(?=【|$)/);
        if (introMatch) {
            displayText = introMatch[1].trim();
        } else if (narrativeMatch) {
            displayText = narrativeMatch[1].trim();
        } else {
            // まだタグが来ていない場合、【で始まる部分は除外
            const firstTag = accumulatedText.indexOf('【');
            if (firstTag > 0) {
                displayText = accumulatedText.substring(0, firstTag).trim();
            }
        }

        // タイプライターにテキストを追加
        if (streamPageIndex >= 0) {
            // 移動時：タイプライターで表示
            appendToTypewriter(displayText);
        } else if (useAddDialogueMode && pages.length > 0 && displayText) {
            // アクション時：最後のページに直接ストリーム表示
            const lastPageIndex = pages.length - 1;
            const pageView = document.getElementById('page-view');
            const pageDiv = pageView.querySelector(`.page-content[data-page-index="${lastPageIndex}"]`);
            if (pageDiv) {
                const textDiv = pageDiv.querySelector('.page-text > div');
                if (textDiv) {
                    textDiv.innerHTML = appendBaseHtml + (appendBaseHtml ? '<br>' : '') + displayText.replace(/\n/g, '<br>');
                    // 自動スクロール
                    const pageText = pageDiv.querySelector('.page-text');
                    if (pageText) pageText.scrollTop = pageText.scrollHeight;
                }
            }
        }
    };
}

// ========== プロンプト構築 ==========

/**
 * 関係性情報のプロンプトテキストを構築（分離版）
 */
function buildRelationshipInfoPrompt(charAtLocation) {
    const empty = {
        relationshipText: '',
        relationshipMemo: '',
        nextRelationshipReq: '',
        relationship: null
    };
    if (!charAtLocation) return empty;

    const relationshipId = charAtLocation.status?.relationshipId;
    if (!relationshipId) return empty;

    const relationship = relationships.find(r => r.relationship_id === relationshipId);
    if (!relationship) return empty;

    // 各パーツを分離（改行はテンプレート側で制御）
    const relationshipText = `現在の関係性: ${relationship.name}（${relationship.description || ''}）`;
    const relationshipMemo = charAtLocation.status?.memo
        ? `関係性メモ: ${charAtLocation.status.memo}`
        : '';
    const nextRelationshipReq = relationship.next_relationship_req
        ? `関係性進展条件: ${relationship.next_relationship_req}`
        : '';

    return { relationshipText, relationshipMemo, nextRelationshipReq, relationship };
}

/**
 * 統合プロンプト構築
 * dialogueOnly: true の場合はセリフのみ要求（会話モード）
 * companion: 一緒に移動したキャラクター（移動時のみ）
 */
function buildCombinedPrompt(actionMode, userInput, previousPlace, newPlace, charAtLocation, currentPlace, dialogueOnly = false, companion = null) {
    // 会話モード
    if (dialogueOnly && charAtLocation) {
        const charName = charAtLocation.character.name;
        const char = charAtLocation.character;

        // 関係性情報
        const { relationshipText, relationshipMemo, nextRelationshipReq, relationship } = buildRelationshipInfoPrompt(charAtLocation);

        // 各パーツを構築（llm_007と同じ形式）
        const seriesPart = char.series ? `（${char.series}）` : '';
        const profilePart = char.profile ? `プロフィール: ${char.profile}` : '';

        // 服装情報
        let costumePart = '';
        const charCostumeId = charAtLocation.status?.costumeId;
        if (charCostumeId && typeof costumes !== 'undefined') {
            const costume = costumes.find(c => c.costume_id === charCostumeId);
            if (costume) {
                costumePart = `現在の服装: ${costume.name}`;
            }
        }

        // アクション情報
        let actionPart = '';
        const charActionIdx = charAtLocation.status?.actionIndex ?? -1;
        if (charActionIdx >= 0 && actions[charActionIdx]) {
            const charAction = actions[charActionIdx];
            actionPart = `現在の行動: ${charAction.name}`;
        }

        // パーソナリティ情報
        let personalityPart = '';
        let personalityDescPart = '';
        let personalityStagePart = '';
        if (char.personality && typeof personalities !== 'undefined') {
            const personality = personalities.find(p => p.personality_id === char.personality);
            if (personality) {
                personalityPart = personality.name || '';
                personalityDescPart = personality.description || '';
                // 関係性stageに応じたstage説明を取得
                const stageNum = relationship?.stage ? parseInt(relationship.stage) : null;
                if (stageNum >= 1 && stageNum <= 4) {
                    const stageField = `stage_${stageNum}`;
                    personalityStagePart = personality[stageField] || '';
                }
            }
        }

        // キャラクターが実行可能なアクション一覧を構築
        let executableActionsPart = '';
        if (relationship && charAtLocation.status?.placeIndex >= 0) {
            const place = places[charAtLocation.status.placeIndex];
            const currentStage = parseInt(relationship?.stage, 10) || 0;
            const placeReqStageRaw = parseInt(place?.req_stage, 10);
            const maxAllowedStage = isNaN(placeReqStageRaw) ? currentStage : Math.min(currentStage, placeReqStageRaw);
            const charActions = actions.filter(action => {
                if (action.agent !== 'character') return false;
                const reqStage = parseInt(action.req_stage, 10);
                if (isNaN(reqStage)) return false;
                return reqStage <= maxAllowedStage;
            });
            if (charActions.length > 0) {
                const actionNames = charActions.map(a => a.name).join('、');
                executableActionsPart = `実行可能な行動: ${actionNames}`;
            }
        }

        // llm_007 テンプレートでキャラクター情報を構築
        const characterInfo = requirePromptTemplate('llm_007', {
            name: charName,
            series: seriesPart,
            profile: profilePart,
            personality: personalityPart,
            personality_description: personalityDescPart,
            personality_stage: personalityStagePart,
            relationship: relationshipText,
            relationship_memo: relationshipMemo,
            next_relationship_req: nextRelationshipReq,
            costume: costumePart,
            action: actionPart,
            executable_actions: executableActionsPart
        });

        let prompt = characterInfo;
        // （）または()で囲まれた入力は地の文としてそのまま渡す
        const narrationMatch = userInput.match(/^[（(]([\s\S]*)[）)]$/);
        if (narrationMatch) {
            prompt += `\n\n${narrationMatch[1]}\n`;
        } else {
            prompt += `\n\n主人公「${userInput}」\n`;
        }

        // 出力フォーマット（必須）
        const dialogueInstruction = requirePromptTemplate('llm_002', { name: charName });

        prompt += `\n${dialogueInstruction}`;

        // 関係性進展条件がある場合のみ判定を追加（必須）
        if (relationship && relationship.next_relationship_req) {
            prompt += '\n' + requirePromptTemplate('llm_008', {});
        }

        // 完全版とシンプル版の両方を返す
        const speechText = narrationMatch ? narrationMatch[1] : userInput;
        const simplePrompt = requirePromptTemplate('llm_013', { speech: speechText });
        return {
            fullPrompt: prompt,
            simplePrompt: simplePrompt
        };
    }

    let prompt = '';

    // 状況説明（日本語）- テンプレートから取得（必須）
    let situationText = '';
    let simpleSituationText = null;  // シンプル版用（テンプレートがある場合のみ使用）
    if (actionMode === 'action_select' && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        const actionName = action?.name || '';
        const agentText = resolveAgentText(action?.agent, charAtLocation);
        situationText = requirePromptTemplate('llm_009', { agent: agentText, action: actionName });
    } else if (actionMode === 'action_with_speech' && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        const actionName = action?.name || '';
        const agentText = resolveAgentText(action?.agent, charAtLocation);
        // （）または()で囲まれた入力は地の文として扱う
        const speechNarrationMatch = userInput.match(/^[（(]([\s\S]*)[）)]$/);
        if (speechNarrationMatch) {
            // 地の文の場合：アクション + 地の文
            situationText = requirePromptTemplate('llm_009', { agent: agentText, action: actionName });
            situationText += `\n${speechNarrationMatch[1]}`;
        } else {
            situationText = requirePromptTemplate('llm_010', { agent: agentText, action: actionName, speech: userInput });
        }
    } else if (actionMode === 'action' || actionMode === 'scenario') {
        situationText = userInput;
    } else if (actionMode === 'move') {
        situationText = requirePromptTemplate('llm_006', {
            from: previousPlace?.name || '',
            to: newPlace?.name || ''
        });

        // 履歴用も同じ
        simpleSituationText = situationText;

        // 一緒に移動した場合のみ、関係性をチェック
        if (companion) {
            const relId = companion.status?.relationshipId || '';
            const relNumMatch = relId.match(/^rel_(\d+)$/);
            if (relNumMatch) {
                const relNum = parseInt(relNumMatch[1], 10);
                if (relNum < 100) {
                    situationText += `（${companion.character.name}を無理やり連れて行った）`;
                    simpleSituationText += `（${companion.character.name}を無理やり連れて行った）`;
                }
            }
        }
    }
    // 注: speech タイプは会話モード（dialogueOnly=true）で処理されるため、ここには到達しない

    // 画像プロンプト（タグ）
    const imageParts = [];
    if (charAtLocation?.character?.tag) {
        imageParts.push(charAtLocation.character.tag);
    }
    if (currentPlace?.tag) {
        imageParts.push(currentPlace.tag);
    }
    // ユーザーのアクション（action_select/action_with_speech時）
    if ((actionMode === 'action_select' || actionMode === 'action_with_speech') && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        if (action?.prompt) imageParts.push(action.prompt);
        const compositionTag = getCompositionTag(actions, currentState.actionIndex);
        console.log('[LLMプロンプト] ユーザーアクション:', action?.name, '構図:', compositionTag || '(なし)');
        if (compositionTag) imageParts.push(compositionTag);
    }
    // キャラクターのアクション（移動時など、ユーザーアクションと重複しない場合のみ）
    const charActionIndex = charAtLocation?.status?.actionIndex ?? -1;
    const userActionIndex = ((actionMode === 'action_select' || actionMode === 'action_with_speech') && currentState.actionIndex >= 0)
        ? currentState.actionIndex : -1;
    if (charActionIndex >= 0 && charActionIndex !== userActionIndex && actions[charActionIndex]) {
        const charAction = actions[charActionIndex];
        if (charAction?.prompt) imageParts.push(charAction.prompt);
        const charCompositionTag = getCompositionTag(actions, charActionIndex);
        if (charCompositionTag) imageParts.push(charCompositionTag);
    }
    if (currentPlace?.additionalTag) {
        imageParts.push(currentPlace.additionalTag);
    }
    if (charAtLocation?.character?.additionalTag) {
        imageParts.push(charAtLocation.character.additionalTag);
    }

    // 画像プロンプト文字列（タグ置換前）
    const rawImagePromptText = imageParts.filter(p => p).join(', ');

    // キャラクター情報と関係性を構築
    const { relationshipText, relationshipMemo, nextRelationshipReq, relationship } = buildRelationshipInfoPrompt(charAtLocation);

    // 画像プロンプトのタグ置換（{clothes}, {camel}, {expression}など）
    let imagePromptText = rawImagePromptText;
    if (charAtLocation) {
        let clothesTag = '';
        let camelTag = '';
        let expressionTag = '';
        const charCostumeId = charAtLocation.status?.costumeId;
        if (charCostumeId && typeof costumes !== 'undefined') {
            const costume = costumes.find(c => c.costume_id === charCostumeId);
            if (costume) {
                clothesTag = costume.tag || '';
                camelTag = costume.camel_tag || '';
            }
        }
        const charRelationshipId = charAtLocation.status?.relationshipId;
        if (charRelationshipId && typeof relationships !== 'undefined') {
            const rel = relationships.find(r => r.relationship_id === charRelationshipId);
            if (rel) {
                expressionTag = rel.expression || '';
            }
        }
        const charForReplace = {
            ...charAtLocation.character,
            clothes: clothesTag,
            camel: camelTag,
            expression: expressionTag
        };
        imagePromptText = replaceCharacterTags(rawImagePromptText, charForReplace);
    }
    let characterInfo = '';
    const charName = charAtLocation?.character?.name || '';

    if (charAtLocation) {
        const char = charAtLocation.character;

        // 各パーツを構築（空の場合は空文字、改行はテンプレート側で制御）
        const seriesPart = char.series ? `（${char.series}）` : '';
        const profilePart = char.profile ? `プロフィール: ${char.profile}` : '';

        // 服装情報
        let costumePart = '';
        const charCostumeId = charAtLocation.status?.costumeId;
        if (charCostumeId && typeof costumes !== 'undefined') {
            const costume = costumes.find(c => c.costume_id === charCostumeId);
            if (costume) {
                costumePart = `現在の服装: ${costume.name}`;
            }
        }

        // アクション情報（画像タグは含めない）
        let actionPart = '';
        const charActionIdx = charAtLocation.status?.actionIndex ?? -1;
        if (charActionIdx >= 0 && actions[charActionIdx]) {
            const charAction = actions[charActionIdx];
            actionPart = `現在の行動: ${charAction.name}`;
        }

        // パーソナリティ情報
        let personalityPart = '';
        let personalityDescPart = '';
        let personalityStagePart = '';
        if (char.personality && typeof personalities !== 'undefined') {
            const personality = personalities.find(p => p.personality_id === char.personality);
            if (personality) {
                personalityPart = personality.name || '';
                personalityDescPart = personality.description || '';
                // 関係性stageに応じたstage説明を取得
                const stageNum = relationship?.stage ? parseInt(relationship.stage) : null;
                if (stageNum >= 1 && stageNum <= 4) {
                    const stageField = `stage_${stageNum}`;
                    personalityStagePart = personality[stageField] || '';
                }
            }
        }

        // キャラクターが実行可能なアクション一覧を構築
        let executableActionsPart = '';
        if (relationship && charAtLocation.status?.placeIndex >= 0) {
            const place = places[charAtLocation.status.placeIndex];
            const currentStage = parseInt(relationship?.stage, 10) || 0;
            const placeReqStageRaw = parseInt(place?.req_stage, 10);
            const maxAllowedStage = isNaN(placeReqStageRaw) ? currentStage : Math.min(currentStage, placeReqStageRaw);
            const charActions = actions.filter(action => {
                if (action.agent !== 'character') return false;
                const reqStage = parseInt(action.req_stage, 10);
                if (isNaN(reqStage)) return false;
                return reqStage <= maxAllowedStage;
            });
            if (charActions.length > 0) {
                const actionNames = charActions.map(a => a.name).join('、');
                executableActionsPart = `実行可能な行動: ${actionNames}`;
            }
        }

        // llm_007 テンプレートでキャラクター情報を構築（必須）
        characterInfo = requirePromptTemplate('llm_007', {
            name: char.name,
            series: seriesPart,
            profile: profilePart,
            personality: personalityPart,
            personality_description: personalityDescPart,
            personality_stage: personalityStagePart,
            relationship: relationshipText,
            relationship_memo: relationshipMemo,
            next_relationship_req: nextRelationshipReq,
            costume: costumePart,
            action: actionPart,
            executable_actions: executableActionsPart
        });
    }

    // 関係性進展条件がある場合のみ llm_008 を展開（必須）
    let nextRelationshipInstruction = '';
    if (relationship && relationship.next_relationship_req) {
        nextRelationshipInstruction = requirePromptTemplate('llm_008', {});
    }

    // llm_003 テンプレートで全体を構築（必須）
    prompt = requirePromptTemplate('llm_003', {
        situation: situationText,
        imagePrompt: imagePromptText,
        characterInfo: characterInfo,
        name: charName,
        next_relationship_instruction: nextRelationshipInstruction
    });

    // 完全版とシンプル版の両方を返す
    const simpleSituation = simpleSituationText || situationText.split('\n')[0].trim();
    const simplePrompt = requirePromptTemplate('llm_012', { situation: simpleSituation });
    return {
        fullPrompt: prompt,
        simplePrompt: simplePrompt
    };
}

/**
 * 複数セリフ用のプロンプトを構築
 * @param {string} actionMode - アクションモード
 * @param {string} userInput - ユーザー入力
 * @param {Object} charAtLocation - キャラクター情報
 * @param {Object} currentPlace - 現在地
 * @param {number} dialogueCount - 生成するセリフの数
 * @param {string} templateKey - 使用するテンプレートキー (デフォルト: 'llm_014')
 * @returns {Object} { fullPrompt, simplePrompt }
 */
function buildMultiDialoguePrompt(actionMode, userInput, charAtLocation, currentPlace, dialogueCount, templateKey = 'llm_014') {
    let situationText = '';
    if (actionMode === 'action_select' && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        const actionName = action?.name || '';
        const agentText = resolveAgentText(action?.agent, charAtLocation);
        situationText = requirePromptTemplate('llm_009', { agent: agentText, action: actionName });
    } else if (actionMode === 'action_with_speech' && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        const actionName = action?.name || '';
        const agentText = resolveAgentText(action?.agent, charAtLocation);
        // （）または()で囲まれた入力は地の文として扱う
        const speechNarrationMatch = userInput.match(/^[（(]([\s\S]*)[）)]$/);
        if (speechNarrationMatch) {
            situationText = requirePromptTemplate('llm_009', { agent: agentText, action: actionName });
            situationText += `\n${speechNarrationMatch[1]}`;
        } else {
            situationText = requirePromptTemplate('llm_010', { agent: agentText, action: actionName, speech: userInput });
        }
    }

    // 画像プロンプト構築（タグ置換前）
    const actionPrompt = (currentState.actionIndex >= 0 && actions[currentState.actionIndex])
        ? actions[currentState.actionIndex].prompt : '';
    const placeTag = currentPlace?.tag || '';
    const rawImagePromptText = [actionPrompt, placeTag].filter(p => p).join(', ') || '(なし)';

    // キャラクター情報（buildCombinedPromptと同じ形式で構築）
    let characterInfo = '';
    let charName = '';
    let relationship = null;
    let imagePromptText = rawImagePromptText;
    if (charAtLocation) {
        const char = charAtLocation.character;
        charName = char.name;
        const seriesPart = char.series ? `（${char.series}）` : '';
        const profilePart = char.profile ? `プロフィール: ${char.profile}` : '';
        const { relationshipText, relationshipMemo, nextRelationshipReq, relationship: rel } = buildRelationshipInfoPrompt(charAtLocation);
        relationship = rel;

        // 服装情報
        let costumePart = '';
        let clothesTag = '';
        let camelTag = '';
        const charCostumeId = charAtLocation.status?.costumeId;
        if (charCostumeId && typeof costumes !== 'undefined') {
            const costume = costumes.find(c => c.costume_id === charCostumeId);
            if (costume) {
                costumePart = `現在の服装: ${costume.name}`;
                clothesTag = costume.tag || '';
                camelTag = costume.camel_tag || '';
            }
        }

        // 表情タグ取得
        let expressionTag = '';
        const charRelationshipId = charAtLocation.status?.relationshipId;
        if (charRelationshipId && typeof relationships !== 'undefined') {
            const relObj = relationships.find(r => r.relationship_id === charRelationshipId);
            if (relObj) {
                expressionTag = relObj.expression || '';
            }
        }

        // 画像プロンプトのタグ置換
        const charForReplace = { ...char, clothes: clothesTag, camel: camelTag, expression: expressionTag };
        imagePromptText = replaceCharacterTags(rawImagePromptText, charForReplace);

        // アクション情報
        let actionPart = '';
        const charActionIdx = charAtLocation.status?.actionIndex ?? -1;
        if (charActionIdx >= 0 && actions[charActionIdx]) {
            const charAction = actions[charActionIdx];
            actionPart = `現在の行動: ${charAction.name}`;
        }

        // パーソナリティ情報
        let personalityPart = '';
        let personalityDescPart = '';
        let personalityStagePart = '';
        if (char.personality && typeof personalities !== 'undefined') {
            const personality = personalities.find(p => p.personality_id === char.personality);
            if (personality) {
                personalityPart = personality.name || '';
                personalityDescPart = personality.description || '';
                // 関係性stageに応じたstage説明を取得
                const stageNum = relationship?.stage ? parseInt(relationship.stage) : null;
                if (stageNum >= 1 && stageNum <= 4) {
                    const stageField = `stage_${stageNum}`;
                    personalityStagePart = personality[stageField] || '';
                }
            }
        }

        // キャラクターが実行可能なアクション一覧を構築
        let executableActionsPart = '';
        if (relationship && charAtLocation.status?.placeIndex >= 0) {
            const place = places[charAtLocation.status.placeIndex];
            const currentStage = parseInt(relationship?.stage, 10) || 0;
            const placeReqStageRaw = parseInt(place?.req_stage, 10);
            const maxAllowedStage = isNaN(placeReqStageRaw) ? currentStage : Math.min(currentStage, placeReqStageRaw);
            const charActions = actions.filter(action => {
                if (action.agent !== 'character') return false;
                const reqStage = parseInt(action.req_stage, 10);
                if (isNaN(reqStage)) return false;
                return reqStage <= maxAllowedStage;
            });
            if (charActions.length > 0) {
                const actionNames = charActions.map(a => a.name).join('、');
                executableActionsPart = `実行可能な行動: ${actionNames}`;
            }
        }

        characterInfo = requirePromptTemplate('llm_007', {
            name: charName,
            series: seriesPart,
            profile: profilePart,
            personality: personalityPart,
            personality_description: personalityDescPart,
            personality_stage: personalityStagePart,
            relationship: relationshipText,
            relationship_memo: relationshipMemo,
            next_relationship_req: nextRelationshipReq,
            costume: costumePart,
            action: actionPart,
            executable_actions: executableActionsPart
        });
    }

    // 関係性進展条件
    let nextRelationshipInstruction = '';
    if (relationship && relationship.next_relationship_req) {
        nextRelationshipInstruction = requirePromptTemplate('llm_008', {});
    }

    // テンプレートで複数セリフ用プロンプトを構築
    const prompt = requirePromptTemplate(templateKey, {
        situation: situationText,
        imagePrompt: imagePromptText,
        characterInfo: characterInfo,
        name: charName,
        count: dialogueCount,
        next_relationship_instruction: nextRelationshipInstruction
    });

    const simplePrompt = requirePromptTemplate('llm_012', { situation: situationText.split('\n')[0].trim() });
    return {
        fullPrompt: prompt,
        simplePrompt: simplePrompt
    };
}

// ========== レスポンス解析 ==========

/**
 * 地の文から不要なプロンプト情報を除去
 */
function cleanNarrative(text) {
    if (!text) return '';
    // 「画像プロンプト：***」パターンを除去
    return text.replace(/画像プロンプト[：:].*/g, '').trim();
}

/**
 * 統合レスポンスをパース
 */
function parseCombinedResponse(response, charAtLocation) {
    let narrative = '';
    let dialogue = '';
    let newRelationshipName = null;
    let relationshipMemo = null;

    // 【地の文】セクションを抽出
    const narrativeMatch = response.match(/【地の文】\s*([\s\S]*?)(?=【|$)/);
    if (narrativeMatch) {
        narrative = cleanNarrative(narrativeMatch[1].trim());
    } else {
        // フォーマットが異なる場合は全体を地の文として扱う
        narrative = cleanNarrative(response.trim());
    }

    // キャラクターがいる場合、セリフセクションを抽出
    if (charAtLocation) {
        const charName = charAtLocation.character.name;
        const dialogueRegex = new RegExp(`【${charName}のセリフ】\\s*([\\s\\S]*?)(?=【|$)`);
        const dialogueMatch = response.match(dialogueRegex);
        if (dialogueMatch) {
            dialogue = dialogueMatch[1].trim();
        }
    }

    // 【関係性変化】セクションを抽出 - 関係性名を取得
    const relationshipMatch = response.match(/【関係性変化】\s*([\s\S]*?)(?=【|$)/);
    if (relationshipMatch) {
        const result = relationshipMatch[1].trim();
        // 「維持」以外の場合は関係性名として扱う
        if (!result.includes('維持')) {
            newRelationshipName = result;
        }
    }

    // 【関係性メモ】セクションを抽出
    const memoMatch = response.match(/【関係性メモ】\s*([\s\S]*?)(?=【|$)/);
    if (memoMatch) {
        // 「（〇〇文字）」などの余計なテキストを除去
        relationshipMemo = memoMatch[1].trim().replace(/[（(]\d+文字[）)]/g, '').trim();
    }

    // 【行動】セクションを抽出（最初の行のみ）
    let characterAction = null;
    const actionMatch = response.match(/【行動】\s*([\s\S]*?)(?=【|$)/);
    if (actionMatch) {
        const lines = actionMatch[1].trim().split('\n').filter(l => l.trim());
        characterAction = lines[0]?.trim() || null;
    }

    return { narrative, dialogue, newRelationshipName, relationshipMemo, characterAction };
}

/**
 * 複数セリフレスポンスをパース（llm_014用）
 * 【導入】【ページ1】【ページ2】...形式から配列に変換
 */
function parseMultipleDialogues(response, charAtLocation, expectedCount) {
    let narrative = '';
    const dialogues = [];
    let newRelationshipName = null;
    let relationshipMemo = null;

    // 【導入】セクションを抽出（従来の【地の文】にも対応）
    const introMatch = response.match(/【導入】\s*([\s\S]*?)(?=【|$)/);
    const narrativeMatch = response.match(/【地の文】\s*([\s\S]*?)(?=【|$)/);
    if (introMatch) {
        narrative = cleanNarrative(introMatch[1].trim());
    } else if (narrativeMatch) {
        narrative = cleanNarrative(narrativeMatch[1].trim());
    }

    // 【ページN】形式でセリフを抽出（従来の【セリフN】にも対応）
    for (let i = 1; i <= expectedCount; i++) {
        const pageRegex = new RegExp(`【ページ${i}】\\s*([\\s\\S]*?)(?=【|$)`);
        const pageMatch = response.match(pageRegex);
        if (pageMatch) {
            dialogues.push(pageMatch[1].trim());
        } else {
            // 従来形式へのフォールバック
            const dialogueRegex = new RegExp(`【セリフ${i}】\\s*([\\s\\S]*?)(?=【|$)`);
            const dialogueMatch = response.match(dialogueRegex);
            if (dialogueMatch) {
                dialogues.push(dialogueMatch[1].trim());
            }
        }
    }

    // 期待数に満たない場合、最後のセリフを繰り返し
    while (dialogues.length < expectedCount && dialogues.length > 0) {
        dialogues.push(dialogues[dialogues.length - 1]);
    }

    // 【関係性変化】セクションを抽出
    const relationshipMatch = response.match(/【関係性変化】\s*([\s\S]*?)(?=【|$)/);
    if (relationshipMatch) {
        const result = relationshipMatch[1].trim();
        if (!result.includes('維持')) {
            newRelationshipName = result;
        }
    }

    // 【関係性メモ】セクションを抽出
    const memoMatch = response.match(/【関係性メモ】\s*([\s\S]*?)(?=【|$)/);
    if (memoMatch) {
        relationshipMemo = memoMatch[1].trim().replace(/[（(]\d+文字[）)]/g, '').trim();
    }

    // 【行動】セクションを抽出（最初の行のみ）
    let characterAction = null;
    const actionMatch = response.match(/【行動】\s*([\s\S]*?)(?=【|$)/);
    if (actionMatch) {
        const lines = actionMatch[1].trim().split('\n').filter(l => l.trim());
        characterAction = lines[0]?.trim() || null;
    }

    return { narrative, dialogues, newRelationshipName, relationshipMemo, characterAction };
}

/**
 * 会話モードレスポンスをパース
 */
function parseConversationResponse(response, charAtLocation) {
    let dialogue = '';
    let narrative = '';
    let newRelationshipName = null;
    let relationshipMemo = null;

    // 【キャラ名のセリフ】セクションを抽出
    if (charAtLocation) {
        const charName = charAtLocation.character.name;
        const dialogueRegex = new RegExp(`【${charName}のセリフ】\\s*([\\s\\S]*?)(?=【|$)`);
        const dialogueMatch = response.match(dialogueRegex);
        if (dialogueMatch) {
            dialogue = dialogueMatch[1].trim();
        } else {
            // フォーマットが異なる場合、【地の文】または【関係性変化】より前の部分をセリフとして扱う
            const beforeNarrative = response.split(/【地の文】|【関係性変化】/)[0].trim();
            dialogue = beforeNarrative;
        }
        // セリフから【地の文】以降を除去
        dialogue = dialogue.split(/【地の文】|【関係性変化】|【関係性メモ】/)[0].trim();
    }

    // 【地の文】セクションを抽出（最初の1行のみ）
    const narrativeMatch = response.match(/【地の文】\s*([\s\S]*?)(?=【|$)/);
    if (narrativeMatch) {
        const lines = narrativeMatch[1].trim().split('\n').filter(l => l.trim());
        narrative = cleanNarrative(lines[0] || '');
    }

    // 【関係性変化】セクションを抽出 - 関係性名を取得
    const relationshipMatch = response.match(/【関係性変化】\s*([\s\S]*?)(?=【|$)/);
    if (relationshipMatch) {
        const result = relationshipMatch[1].trim();
        // 「維持」以外の場合は関係性名として扱う
        if (!result.includes('維持')) {
            newRelationshipName = result;
        }
    }

    // 【関係性メモ】セクションを抽出
    const memoMatch = response.match(/【関係性メモ】\s*([\s\S]*?)(?=【|$)/);
    if (memoMatch) {
        // 「（〇〇文字）」などの余計なテキストを除去
        relationshipMemo = memoMatch[1].trim().replace(/[（(]\d+文字[）)]/g, '').trim();
    }

    // 【行動】セクションを抽出（最初の行のみ）
    let characterAction = null;
    const actionMatch = response.match(/【行動】\s*([\s\S]*?)(?=【|$)/);
    if (actionMatch) {
        const lines = actionMatch[1].trim().split('\n').filter(l => l.trim());
        characterAction = lines[0]?.trim() || null;
        console.log('[parseConversation] 行動抽出:', characterAction);
    }

    return { dialogue, narrative, newRelationshipName, relationshipMemo, characterAction };
}

// ========== LLM API呼び出し ==========

/**
 * LLM呼び出し（ストリーム対応・履歴付き）
 * onChunk: ストリーム受信時のコールバック (accumulatedText) => void
 */
async function callLLM(apiKey, prompt, role, character = null, onChunk = null, simplePrompt = null) {
    // システムプロンプト（テンプレートから取得・必須）
    const systemPrompt = requirePromptTemplate('llm_001', {});

    // 履歴に保存するプロンプト（シンプル版があればそれを使用）
    const historyPrompt = simplePrompt || prompt;

    // メッセージ構築（履歴 + 新しいプロンプト）
    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: prompt }
    ];

    console.log('[LLM] 履歴用プロンプト:', historyPrompt);

    // GASにリクエストログを送信（ON時のみ、非同期）
    const gasUrl = document.getElementById('gasUrl').value.trim();
    if (llmLogEnabled && gasUrl) {
        const logData = [];
        logData.push({ log_key: 'model', log_value: selectedLLMModelId });
        messages.forEach((msg, i) => {
            logData.push({ log_key: `messages[${i}].role`, log_value: msg.role });
            logData.push({ log_key: `messages[${i}].content`, log_value: msg.content });
        });
        saveGasData(gasUrl, 'llm_req_log', logData)
            .then(res => console.log('[GAS Log] 送信結果:', res))
            .catch(e => console.error('[GAS Log Error]', e));
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: selectedLLMModelId,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[LLM] エラー:', error);
            return 'エラーが発生しました';
        }

        // ストリーム読み取り
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const decodedChunk = decoder.decode(value, { stream: true });
            buffer += decodedChunk;

            // 改行で分割してSSEイベントを処理
            const lines = buffer.split('\n');
            buffer = lines.pop(); // 未完了の行はバッファに残す

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const data = trimmed.slice(5).trim();
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    const delta = json.choices?.[0]?.delta?.content || '';
                    if (delta) {
                        content += delta;
                        // コールバックで通知
                        if (onChunk) {
                            onChunk(content);
                        }
                    }
                } catch (e) {
                    // JSONパースエラーは無視
                }
            }
        }

        // 履歴に追加（最大10往復 = 20メッセージ）
        // シンプル版プロンプトを履歴に保存（トークン節約）
        // レスポンスから関係性変化・関係性メモを削除
        const simpleResponse = content
            .replace(/【関係性変化】[\s\S]*?(?=【|$)/g, '')
            .replace(/【関係性メモ】[\s\S]*?(?=【|$)/g, '')
            .trim();
        chatHistory.push({ role: 'user', content: historyPrompt });
        chatHistory.push({ role: 'assistant', content: simpleResponse });

        while (chatHistory.length > 20) {
            chatHistory.shift();
            chatHistory.shift();
        }

        return content;
    } catch (error) {
        console.error('[LLM] 通信エラー:', error);
        return '通信エラーが発生しました';
    }
}
