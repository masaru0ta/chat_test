/**
 * Transition LLM Functions
 *
 * 依存: transition-state.js, transition-page.js, prompt-utils.js, gas-api.js, constants.js
 */

// ========== ストリームハンドラー ==========

/**
 * ストリーム受信時のコールバック生成
 */
function createStreamChunkHandler(streamPageIndex, useAddDialogueMode, appendBaseHtml) {
    return (accumulatedText) => {
        if (!window._chunkCallbackStarted) {
            const elapsed = ((performance.now() - window._streamStartTime) / 1000).toFixed(3);
            console.log(`[onStreamChunk] コールバック初回呼び出し (${elapsed}秒)`);
            window._chunkCallbackStarted = true;
        }
        // 【地の文】タグがあればその内容を抽出、なければ全体を表示
        let displayText = accumulatedText;
        const narrativeMatch = accumulatedText.match(/【地の文】\s*([\s\S]*?)(?=【|$)/);
        if (narrativeMatch) {
            displayText = narrativeMatch[1].trim();
        } else {
            // まだ【地の文】が来ていない場合、【で始まる部分は除外
            const firstTag = accumulatedText.indexOf('【');
            if (firstTag > 0) {
                displayText = accumulatedText.substring(0, firstTag).trim();
            }
        }

        // デバッグ：displayTextが空かどうか
        if (!window._displayTextLogged && displayText) {
            const elapsed = ((performance.now() - window._streamStartTime) / 1000).toFixed(3);
            console.log(`[onStreamChunk] displayText取得 (${elapsed}秒):`, displayText.substring(0, 50) + '...');
            window._displayTextLogged = true;
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
                    if (!window._streamDisplayStarted) {
                        const elapsed = ((performance.now() - window._streamStartTime) / 1000).toFixed(3);
                        console.log(`[アクション] ページにテキスト追加開始 (${elapsed}秒)`);
                        window._streamDisplayStarted = true;
                    }
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
 * 関係性情報のプロンプトテキストを構築
 */
function buildRelationshipInfoPrompt(charAtLocation) {
    if (!charAtLocation) return { text: '', relationship: null };

    const relationshipId = charAtLocation.status?.relationshipId;
    if (!relationshipId) return { text: '', relationship: null };

    const relationship = relationships.find(r => r.relationship_id === relationshipId);
    if (!relationship) return { text: '', relationship: null };

    let text = `\n現在の関係性: ${relationship.name}（${relationship.description || ''}）`;
    if (charAtLocation.status?.memo) {
        text += `\n関係性メモ: ${charAtLocation.status.memo}`;
    }
    if (relationship.next_relationship_req) {
        text += `\n関係性進展条件: ${relationship.next_relationship_req}`;
    }
    return { text, relationship };
}

/**
 * 統合プロンプト構築
 * dialogueOnly: true の場合はセリフのみ要求（会話モード）
 * companion: 一緒に移動したキャラクター（移動時のみ）
 */
function buildCombinedPrompt(actionType, userInput, previousPlace, newPlace, charAtLocation, currentPlace, dialogueOnly = false, companion = null) {
    // 会話モード
    if (dialogueOnly && charAtLocation) {
        const charName = charAtLocation.character.name;
        const char = charAtLocation.character;
        let prompt = '';

        // キャラクター情報
        prompt += `【会話相手】${charName}`;
        if (char.series) prompt += `（${char.series}）`;
        if (char.profile) prompt += `\nプロフィール: ${char.profile}`;

        // 関係性情報
        const { text: relationshipText, relationship } = buildRelationshipInfoPrompt(charAtLocation);
        prompt += relationshipText;

        prompt += `\n\n主人公「${userInput}」\n`;

        // 出力フォーマット
        const dialogueInstruction = getPromptTemplate(promptTemplates, 'llm_003', { name: charName })
            || `【${charName}のセリフ】「」付きで1-2文で出力`;

        prompt += `\n${dialogueInstruction}`;
        prompt += `\n【地の文】必要な場合のみ、セリフの後の状況や動作を1行で記載（不要なら省略）`;

        // 関係性進展条件がある場合のみ判定を追加
        if (relationship && relationship.next_relationship_req) {
            prompt += `\n【関係性変化】この会話で関係性進展条件を満たした場合、もしくは総合的に関係性変化が起きたと判断される場合は新しい関係性名を記載、満たしていない場合は「維持」と記載`;
            prompt += `\n【関係性メモ】関係性が変化した場合は必ず記載。変化がなくてもメモ更新が必要な出来事があれば記載。キャラクター視点で50文字以内でどこで何が起きて、なぜその関係性になったのか、今後どうしていきたいか、キャラクターの感情を交えて記載。不要なら省略`;
        }

        // 完全版とシンプル版の両方を返す
        return {
            fullPrompt: prompt,
            simplePrompt: `会話：主人公「${userInput}」`
        };
    }

    let prompt = '';

    // 状況説明（日本語）
    let situationText = '';
    if (actionType === 'action_select' && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        situationText = action?.name || '';
    } else if (actionType === 'action_with_speech' && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        situationText = `${action?.name || ''} + 主人公の発言「${userInput}」`;
    } else if (actionType === 'action' || actionType === 'scenario') {
        situationText = userInput;
    } else if (actionType === 'move') {
        // 移動時専用テンプレート（llm_006）を使用
        const moveTemplate = getPromptTemplate(promptTemplates, 'llm_006', {
            from: previousPlace?.name || '',
            to: newPlace?.name || ''
        });
        console.log('[移動] from:', previousPlace?.name, 'to:', newPlace?.name, 'template:', moveTemplate);
        situationText = moveTemplate || `${previousPlace?.name || ''}から${newPlace?.name || ''}に移動`;

        // 一緒に移動した場合のみ、関係性をチェック
        if (companion) {
            const relId = companion.status?.relationshipId || '';
            const relNumMatch = relId.match(/^rel_(\d+)$/);
            if (relNumMatch) {
                const relNum = parseInt(relNumMatch[1], 10);
                if (relNum < 100) {
                    situationText += `（${companion.character.name}を無理やり連れて行った）`;
                    console.log('[移動] 関係性', relId, '< rel_100 → 無理やり連れて行った');
                }
            }
        }
    } else if (actionType === 'speech') {
        situationText = `主人公の発言「${userInput}」`;
    }

    // 画像プロンプト（タグ）
    const imageParts = [];
    if (charAtLocation?.character?.tag) {
        imageParts.push(charAtLocation.character.tag);
    }
    if (currentPlace?.tag) {
        imageParts.push(currentPlace.tag);
    }
    // ユーザーのアクション（action_select/action_with_speech時）
    if ((actionType === 'action_select' || actionType === 'action_with_speech') && currentState.actionIndex >= 0) {
        const action = actions[currentState.actionIndex];
        if (action?.prompt) imageParts.push(action.prompt);
        const compositionTag = getCompositionTag(actions, currentState.actionIndex);
        console.log('[LLMプロンプト] ユーザーアクション:', action?.name, '構図:', compositionTag || '(なし)');
        if (compositionTag) imageParts.push(compositionTag);
    }
    // キャラクターのアクション（移動時など）
    const charActionIndex = charAtLocation?.status?.actionIndex ?? -1;
    if (charActionIndex >= 0 && actions[charActionIndex]) {
        const charAction = actions[charActionIndex];
        if (charAction?.prompt) imageParts.push(charAction.prompt);
        const charCompositionTag = getCompositionTag(actions, charActionIndex);
        console.log('[LLMプロンプト] キャラアクション:', charAction?.name, '構図:', charCompositionTag || '(なし)');
        if (charCompositionTag) imageParts.push(charCompositionTag);
    }
    if (currentPlace?.additionalTag) {
        imageParts.push(currentPlace.additionalTag);
    }
    if (charAtLocation?.character?.additionalTag) {
        imageParts.push(charAtLocation.character.additionalTag);
    }

    prompt += `状況：${situationText}\n`;
    prompt += `画像プロンプト：${imageParts.filter(p => p).join(', ')}\n`;

    // キャラクター情報と関係性（通常モード）
    const { text: relationshipText, relationship } = buildRelationshipInfoPrompt(charAtLocation);
    if (charAtLocation) {
        const char = charAtLocation.character;
        prompt += `\n【その場にいる人物】${char.name}`;
        if (char.series) prompt += `（${char.series}）`;
        if (char.profile) prompt += `\nプロフィール: ${char.profile}`;
        prompt += relationshipText;
        // キャラクターのアクション情報を追加
        const charActionIndex = charAtLocation.status?.actionIndex ?? -1;
        if (charActionIndex >= 0 && actions[charActionIndex]) {
            const charAction = actions[charActionIndex];
            prompt += `\n現在の行動: ${charAction.name}`;
            if (charAction.prompt) prompt += `（${charAction.prompt}）`;
        }
        prompt += '\n';
    }

    // 通常モード：地の文 + セリフ + 関係性変化（テンプレートから取得）
    const charName = charAtLocation?.character?.name || '';
    let formatPrompt = getPromptTemplate(promptTemplates, 'llm_004', { name: charName })
        || `以下の形式で出力してください：\n【地の文】（2-3文で状況を描写）\n${charName ? `【${charName}のセリフ】（「」付きで1-2文）` : ''}`;

    // 関係性進展条件がある場合のみ判定を追加
    if (relationship && relationship.next_relationship_req) {
        formatPrompt += `\n【関係性変化】このシーンで関係性進展条件を満たした場合、もしくは総合的に関係性変化が起きたと判断される場合は新しい関係性名を記載、満たしていない場合は「維持」と記載`;
        formatPrompt += `\n【関係性メモ】関係性が変化した場合は必ず記載。変化がなくてもメモ更新が必要な出来事があれば記載。キャラクター視点で50文字以内でどこで何が起きて、なぜその関係性になったのか、今後どうしていきたいか、キャラクターの感情を交えて記載。不要なら省略`;
    }

    prompt += `\n${formatPrompt}`;

    // 完全版とシンプル版の両方を返す
    return {
        fullPrompt: prompt,
        simplePrompt: `状況：${situationText}`
    };
}

/**
 * ページ1用プロンプト構築
 */
function buildPage1Prompt(actionType, userInput, previousPlace, newPlace, charAtLocation) {
    const narratorPrompt = getPromptTemplate(promptTemplates, 'llm_005')
        || 'あなたは小説の地の文を書くナレーターです。簡潔に2-3文で状況を描写してください。';
    let prompt = narratorPrompt + '\n\n';

    const currentPlace = places[userState.placeIndex];
    prompt += `【現在の場所】${currentPlace?.name || '不明'}\n`;

    if (charAtLocation) {
        prompt += `【その場にいる人物】${charAtLocation.character.name}`;
        // 関係性情報を追加
        const relationshipId = charAtLocation.status?.relationshipId;
        if (relationshipId) {
            const relationship = relationships.find(r => r.relationship_id === relationshipId);
            if (relationship) {
                prompt += `（関係性: ${relationship.name}`;
                if (relationship.description) prompt += ` - ${relationship.description}`;
                prompt += `）`;
            }
        }
        prompt += '\n';
    }

    switch (actionType) {
        case 'move':
            prompt += `【状況】主人公が「${previousPlace?.name || ''}」から「${newPlace?.name || ''}」に移動した。\n`;
            break;
        case 'speech':
            prompt += `【状況】主人公が「${userInput}」と言った。\n`;
            break;
        case 'action':
            prompt += `【状況】主人公が「${userInput}」という行為をした。\n`;
            break;
        case 'action_select':
            prompt += `【状況】主人公が「${userInput}」を行った。\n`;
            break;
        case 'action_with_speech':
            const actionName = actions[currentState.actionIndex]?.name || '';
            prompt += `【状況】主人公が「${actionName}」をしながら「${userInput}」と言った。\n`;
            break;
        case 'scenario':
            prompt += `【状況】${userInput}\n`;
            break;
    }

    prompt += '\n地の文のみを出力してください。';
    return prompt;
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

    return { narrative, dialogue, newRelationshipName, relationshipMemo };
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

    return { dialogue, narrative, newRelationshipName, relationshipMemo };
}

// ========== LLM API呼び出し ==========

/**
 * LLM呼び出し（ストリーム対応・履歴付き）
 * onChunk: ストリーム受信時のコールバック (accumulatedText) => void
 */
async function callLLM(apiKey, prompt, role, character = null, onChunk = null, simplePrompt = null) {
    // システムプロンプト（テンプレートから取得、なければデフォルト）
    const systemPrompt = getPromptTemplate(promptTemplates, 'llm_001')
        || 'あなたは小説のシーンを描写するアシスタントです。指定された形式で簡潔に出力してください。';

    // 履歴に保存するプロンプト（シンプル版があればそれを使用）
    const historyPrompt = simplePrompt || prompt;

    // メッセージ構築（履歴 + 新しいプロンプト）
    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: prompt }
    ];

    console.log('[LLM] 履歴数:', chatHistory.length / 2, '往復');
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
        console.log('[GAS Log] 送信データ:', logData);
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
        let firstChunk = true;
        window._chunkLogCount = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (firstChunk) {
                window._streamStartTime = performance.now();
                console.log('[LLM] ストリーム受信開始 (0.000秒)');
                firstChunk = false;
            }

            const decodedChunk = decoder.decode(value, { stream: true });
            buffer += decodedChunk;

            // 最初の数回のチャンクをログ
            if (!window._chunkLogCount) window._chunkLogCount = 0;
            if (window._chunkLogCount < 3) {
                const elapsed = ((performance.now() - window._streamStartTime) / 1000).toFixed(3);
                console.log(`[LLM] チャンク受信 #${window._chunkLogCount + 1} (${elapsed}秒):`, decodedChunk.substring(0, 100));
                window._chunkLogCount++;
            }

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
