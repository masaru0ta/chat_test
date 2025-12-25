/**
 * Transition UI Functions
 *
 * 依存: transition-state.js, constants.js
 */

// サイドバー状態
let sidebarCollapsed = false;

// テキスト表示状態
let textHidden = false;

// ========== 全画面表示 ==========

/**
 * 全画面モードをトグル
 */
function toggleFullscreen() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!isFullscreen) {
        const elem = document.body;
        const requestFS = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
        if (requestFS) {
            requestFS.call(elem).catch(() => {});
        }
    } else {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exitFS) {
            exitFS.call(document).catch(() => {});
        }
    }
}

// ========== テキスト表示トグル ==========

/**
 * ページビューのクリックで領域に応じた操作
 * - 左1/3: 前のページ
 * - 中央1/3: テキスト表示トグル
 * - 右1/3: 次のページ
 */
function initTextToggle() {
    const pageView = document.getElementById('page-view');
    if (pageView) {
        pageView.addEventListener('click', (e) => {
            // ボタンやリンクのクリックは無視
            if (e.target.closest('button, a, input, .action-menu, .move-menu, .next-action-button-container')) return;

            // クリック位置からどの領域かを判定
            const rect = pageView.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const thirdWidth = rect.width / 3;

            if (clickX < thirdWidth) {
                // 左1/3: 前のページ
                prevPage();
            } else if (clickX > thirdWidth * 2) {
                // 右1/3: 次のページ
                nextPage();
            } else {
                // 中央1/3: テキスト表示トグル
                toggleTextDisplay();
            }
        });
    }
}

function toggleTextDisplay() {
    const pageView = document.getElementById('page-view');
    if (!pageView) return;

    textHidden = !textHidden;
    if (textHidden) {
        pageView.classList.add('text-hidden');
    } else {
        pageView.classList.remove('text-hidden');
    }
}

// ========== 移動メニュー ==========

/**
 * 関係性に基づいて場所への移動が許可されているか判定
 * @param {Object} relationship - 関係性オブジェクト
 * @param {string} placeType - 場所タイプ (public/semi_private/private)
 * @returns {boolean} 移動可能かどうか
 */
function canMoveTogether(relationship, reqStage) {
    // req_stageが空なら選択肢に出さない
    if (!reqStage) return false;
    // req_stageを数値に変換
    const requiredStage = parseInt(reqStage, 10);
    if (isNaN(requiredStage)) return false;
    // 関係性のstageを取得
    const currentStage = parseInt(relationship?.stage, 10) || 0;
    // currentStage >= requiredStage なら移動可能
    return currentStage >= requiredStage;
}

/**
 * 現在地にいるキャラクターの情報を取得
 * @returns {Object|null} { character, status, relationship } または null
 */
function getCompanionAtCurrentLocation() {
    if (userState.placeIndex < 0) return null;
    for (const status of characterStatus) {
        if (status.placeIndex === userState.placeIndex && status.characterIndex >= 0) {
            const character = characters[status.characterIndex];
            const relationship = relationships.find(r => r.relationship_id === status.relationshipId);
            return { character, status, relationship };
        }
    }
    return null;
}

/**
 * キャラクターがいる場所のリストを取得（現在地以外）
 * @returns {Array} { place, placeIndex, characters }の配列
 */
function getPlacesWithCharacters() {
    const result = [];
    places.forEach((place, placeIndex) => {
        // 現在地はスキップ
        if (placeIndex === userState.placeIndex) return;
        // req_stageが空または無効な場所はスキップ
        const placeReqStage = parseInt(place.req_stage, 10);
        if (isNaN(placeReqStage)) return;

        // この場所にいるキャラクター
        const charsHere = [];
        characterStatus.forEach((status) => {
            if (status.placeIndex === placeIndex && status.characterIndex >= 0) {
                const char = characters[status.characterIndex];
                if (char) charsHere.push(char.name);
            }
        });

        // キャラクターがいる場所のみ追加
        if (charsHere.length > 0) {
            result.push({ place, placeIndex, characters: charsHere });
        }
    });
    return result;
}

function openMoveMenu() {
    const menu = document.getElementById('moveMenu');
    if (!menu) return;

    // 既に開いていたら閉じる
    if (menu.style.display === 'flex') {
        closeMoveMenu();
        return;
    }

    // アクションメニューが開いていたら閉じる
    closeActionMenu();

    // 移動先リストを生成
    const listEl = document.getElementById('moveMenuList');
    listEl.innerHTML = '';

    // 現在地にいるキャラクター（二人で移動用）
    const companion = getCompanionAtCurrentLocation();

    // ========== 二人で移動セクション ==========
    if (companion) {
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'move-menu-section-header';
        sectionHeader.textContent = `■ ${companion.character.name}と二人で移動`;
        listEl.appendChild(sectionHeader);

        let hasTogetherDestination = false;
        places.forEach((place, index) => {
            // 現在地はスキップ
            if (index === userState.placeIndex) return;
            // 関係性に基づいて移動可能か判定（canMoveTogetherでreq_stageの有効性もチェック）
            if (!canMoveTogether(companion.relationship, place.req_stage)) return;
            // 他のキャラクターがいる場所はスキップ
            const hasOtherCharacter = characterStatus.some(status =>
                status.placeIndex === index &&
                status.characterIndex >= 0 &&
                status.characterIndex !== companion.status.characterIndex
            );
            if (hasOtherCharacter) return;

            hasTogetherDestination = true;
            const item = document.createElement('div');
            item.className = 'move-menu-item move-menu-subitem';
            item.innerHTML = `<div class="place-name">${place.name}</div>`;
            item.onclick = () => selectMoveDestination(index, true);
            listEl.appendChild(item);
        });

        if (!hasTogetherDestination) {
            const noItem = document.createElement('div');
            noItem.className = 'move-menu-item move-menu-subitem disabled';
            noItem.innerHTML = '<div class="place-name">（移動可能な場所がありません）</div>';
            listEl.appendChild(noItem);
        }
    }

    // ========== 一人で移動セクション ==========
    const aloneHeader = document.createElement('div');
    aloneHeader.className = 'move-menu-section-header';
    aloneHeader.textContent = '■ 一人で移動';
    listEl.appendChild(aloneHeader);

    const placesWithChars = getPlacesWithCharacters();
    if (placesWithChars.length > 0) {
        placesWithChars.forEach(({ place, placeIndex, characters: charsHere }) => {
            const item = document.createElement('div');
            item.className = 'move-menu-item move-menu-subitem';
            const charNames = charsHere.map(name => `<span class="char-name">${name}</span>`).join(', ');
            item.innerHTML = `
                <div class="place-name">${place.name}</div>
                <div class="place-info">${charNames} がいる</div>
            `;
            item.onclick = () => selectMoveDestination(placeIndex, false);
            listEl.appendChild(item);
        });
    } else {
        const noItem = document.createElement('div');
        noItem.className = 'move-menu-item move-menu-subitem disabled';
        noItem.innerHTML = '<div class="place-name">（キャラクターがいる場所がありません）</div>';
        listEl.appendChild(noItem);
    }

    menu.style.display = 'flex';
}

function closeMoveMenu() {
    const menu = document.getElementById('moveMenu');
    if (menu) menu.style.display = 'none';
}

function selectMoveDestination(placeIndex, withCompanion = false) {
    moveWithCompanion = withCompanion;
    closeMoveMenu();

    // 移動実行
    if (placeIndex !== userState.placeIndex) {
        executeMove(placeIndex);
    }
}

// ========== 行為メニュー ==========

/**
 * agentの値をUI表示用ラベルに変換
 * @param {string} agent - アクションのagent値
 * @param {Object} companion - 現在地のキャラクター情報
 * @returns {string} 表示用ラベル（空の場合は空文字）
 */
function getAgentLabel(agent, companion) {
    if (!agent || agent === '') return '';
    if (agent === 'user') return '主人公が';
    if (agent === 'character' && companion) return `${companion.character.name}が`;
    if (agent === 'they') return '二人は';
    return '';
}

/**
 * 関係性に基づいてアクションが実行可能か判定
 * @param {Object} relationship - 関係性オブジェクト
 * @param {string} accessLevel - アクセスレベル (public/semi_private/private)
 * @returns {boolean} 実行可能かどうか
 */
function canPerformAction(relationship, reqStage) {
    // req_stageが空なら選択肢に出さない
    if (!reqStage) return false;
    // req_stageを数値に変換
    const requiredStage = parseInt(reqStage, 10);
    if (isNaN(requiredStage)) return false;
    // 関係性のstageを取得
    const currentStage = parseInt(relationship?.stage, 10) || 0;
    // currentStage >= requiredStage なら実行可能
    return currentStage >= requiredStage;
}

function openActionMenu() {
    const menu = document.getElementById('actionMenu');
    if (!menu) return;

    // 既に開いていたら閉じる
    if (menu.style.display === 'flex') {
        closeActionMenu();
        return;
    }

    // 移動メニューが開いていたら閉じる
    closeMoveMenu();

    // 行為リストを生成
    const listEl = document.getElementById('actionMenuList');
    listEl.innerHTML = '';

    // 現在地にいるキャラクターの関係性を取得
    const companion = getCompanionAtCurrentLocation();
    const relationship = companion?.relationship;

    actions.forEach((action, index) => {
        // agent=character のアクションはユーザー行為選択画面には表示しない
        if (action.agent === 'character') return;
        // 関係性に基づいてアクションが実行可能か判定
        if (!canPerformAction(relationship, action.req_stage)) return;

        const item = document.createElement('div');
        item.className = 'action-menu-item';

        // agentタグを生成
        const agentLabel = getAgentLabel(action.agent, companion);
        const agentHtml = agentLabel ? `<span class="agent-tag">${agentLabel}</span>` : '';

        item.innerHTML = `<div class="action-name">${agentHtml}${action.name}</div>`;

        item.onclick = () => selectAction(index);
        listEl.appendChild(item);
    });

    menu.style.display = 'flex';
}

function closeActionMenu() {
    const menu = document.getElementById('actionMenu');
    if (menu) menu.style.display = 'none';
}

// ========== 移動モード ==========

function toggleMoveMode() {
    moveWithCompanion = !moveWithCompanion;
    updateMoveModeButton();
}

function updateMoveModeButton() {
    const btn = document.getElementById('move-mode-toggle');
    if (btn) {
        btn.textContent = moveWithCompanion ? '一緒に' : '一人で';
        btn.classList.toggle('active', moveWithCompanion);
    }
}

// ========== サイドバー ==========

function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const container = document.getElementById('appContainer');
    if (sidebarCollapsed) {
        container.classList.add('sidebar-collapsed');
    } else {
        container.classList.remove('sidebar-collapsed');
    }
    localStorage.setItem(STORAGE_KEYS.TRANSITION_SIDEBAR_COLLAPSED, sidebarCollapsed ? 'yes' : 'no');
}

function initSidebarState() {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSITION_SIDEBAR_COLLAPSED);
    if (saved === 'yes') {
        sidebarCollapsed = true;
        const container = document.getElementById('appContainer');
        container.classList.add('sidebar-collapsed');
    }
}

// ========== 設定モーダル ==========

function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

// ========== 画像生成・LLMログトグル ==========

function toggleImageGen() {
    imageGenEnabled = !imageGenEnabled;
    localStorage.setItem(STORAGE_KEYS.TRANSITION_IMAGE_GEN_ENABLED, imageGenEnabled ? 'on' : 'off');
    updateImageGenButton();
}

function updateImageGenButton() {
    const btn = document.getElementById('imageGenToggle');
    if (btn) {
        btn.textContent = imageGenEnabled ? 'ON' : 'OFF';
        btn.style.background = imageGenEnabled ? '#4a9eff' : '#555';
    }
}

function toggleLLMLog() {
    llmLogEnabled = !llmLogEnabled;
    localStorage.setItem(STORAGE_KEYS.TRANSITION_LLM_LOG_ENABLED, llmLogEnabled ? 'on' : 'off');
    updateLLMLogButton();
}

function updateLLMLogButton() {
    const btn = document.getElementById('llmLogToggle');
    if (btn) {
        btn.textContent = llmLogEnabled ? 'ON' : 'OFF';
        btn.style.background = llmLogEnabled ? '#4a9eff' : '#555';
    }
}

// ========== APIキー保存 ==========

function saveChatApiKey() {
    const key = document.getElementById('chatApiKey').value.trim();
    if (key) {
        localStorage.setItem(STORAGE_KEYS.TRANSITION_CHAT_API_KEY, key);
    }
}

function saveRunwareApiKey() {
    const key = document.getElementById('runwareApiKey').value.trim();
    if (key) {
        localStorage.setItem(STORAGE_KEYS.TRANSITION_RUNWARE_API_KEY, key);
    }
}

function saveGasUrl() {
    const url = document.getElementById('gasUrl').value.trim();
    if (url) {
        localStorage.setItem(STORAGE_KEYS.GAS_URL, url);
    }
}

// ========== モデル選択 ==========

function updateModelSelect() {
    const select = document.getElementById('modelSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- モデル選択 --</option>';
    Object.keys(models).forEach(modelId => {
        const model = models[modelId];
        const selected = modelId === selectedModelId ? ' selected' : '';
        select.innerHTML += `<option value="${modelId}"${selected}>${model.name || modelId}</option>`;
    });
}

function onModelSelect() {
    const select = document.getElementById('modelSelect');
    selectedModelId = select.value;
    localStorage.setItem(STORAGE_KEYS.TRANSITION_SELECTED_MODEL, selectedModelId);
    console.log('[画像モデル選択]', selectedModelId);
}

function onLLMModelSelect() {
    const select = document.getElementById('llmModelSelect');
    selectedLLMModelId = select.value;
    localStorage.setItem(STORAGE_KEYS.TRANSITION_SELECTED_LLM_MODEL, selectedLLMModelId);
    console.log('[LLMモデル選択]', selectedLLMModelId);
}

function initLLMModelSelect() {
    const savedLLMModelId = localStorage.getItem(STORAGE_KEYS.TRANSITION_SELECTED_LLM_MODEL);
    if (savedLLMModelId && LLM_MODELS[savedLLMModelId]) {
        selectedLLMModelId = savedLLMModelId;
    }
    const select = document.getElementById('llmModelSelect');
    if (select) {
        select.value = selectedLLMModelId;
    }
}

// ========== 登場人数 ==========

function onCharacterCountChange() {
    const input = document.getElementById('characterCountInput');
    let value = parseInt(input.value);
    if (isNaN(value) || value < 1) value = 1;
    if (value > 10) value = 10;
    input.value = value;
    characterCount = value;
    localStorage.setItem(STORAGE_KEYS.TRANSITION_CHARACTER_COUNT, characterCount);
    updateCharacterStatusArray();
    renderCharacterSections();
    updateCharacterStatusDisplay();
    console.log('[登場人数]', characterCount);
}

function initCharacterCount() {
    const savedCount = localStorage.getItem(STORAGE_KEYS.TRANSITION_CHARACTER_COUNT);
    if (savedCount) {
        characterCount = parseInt(savedCount);
    }
    const input = document.getElementById('characterCountInput');
    if (input) {
        input.value = characterCount;
    }
    updateCharacterStatusArray();
    renderCharacterSections();
}

// ========== キャラクターセクション ==========

function renderCharacterSections() {
    const container = document.getElementById('characters-container');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < characterCount; i++) {
        const section = document.createElement('div');
        section.className = 'current-state';
        section.id = `char${i + 1}-section`;
        section.innerHTML = `
            <div style="display:flex; gap:10px; align-items:flex-start;">
                <img id="char${i + 1}-image" src="" alt="" style="width:90px; height:90px; object-fit:cover; border-radius:4px; background:#333; display:none;">
                <div style="flex:1; font-size:0.85rem; line-height:1.4;">
                    <div><span id="char${i + 1}-name" style="color:#fff;">未選択</span><span id="char${i + 1}-relationship" style="color:#888;">：未設定</span></div>
                    <div id="char${i + 1}-personality" style="color:#888; font-size:0.8rem;"></div>
                    <div id="char${i + 1}-costume" style="color:#888; font-size:0.8rem;"></div>
                    <button class="place-btn" id="char${i + 1}-place" onclick="moveToCharacterLocation(${i})" style="color:#fff; background:#333; border:1px solid #444; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem; margin:4px 0;">未選択</button>
                    <div class="memo-line" id="char${i + 1}-memo"></div>
                </div>
            </div>
        `;
        container.appendChild(section);
    }
}

// ========== ステータス表示 ==========

function updateCharacterStatusDisplay() {
    for (let i = 0; i < characterCount; i++) {
        const status = characterStatus[i];
        if (!status) continue;
        const num = i + 1;
        const char = status.characterIndex >= 0 ? characters[status.characterIndex] : null;
        const place = status.placeIndex >= 0 ? places[status.placeIndex] : null;
        const action = status.actionIndex >= 0 ? actions[status.actionIndex] : null;
        const relationship = relationships.find(r => r.relationship_id === status.relationshipId);
        const costume = costumes.find(c => c.costume_id === status.costumeId);
        const personality = char?.personality ? personalities.find(p => p.personality_id === char.personality) : null;

        const imageEl = document.getElementById(`char${num}-image`);
        const nameEl = document.getElementById(`char${num}-name`);
        const placeEl = document.getElementById(`char${num}-place`);
        const relationshipEl = document.getElementById(`char${num}-relationship`);
        const personalityEl = document.getElementById(`char${num}-personality`);
        const costumeEl = document.getElementById(`char${num}-costume`);
        const memoEl = document.getElementById(`char${num}-memo`);

        if (imageEl) {
            if (char && char.image) {
                imageEl.src = char.image;
                imageEl.style.display = 'block';
            } else {
                imageEl.src = '';
                imageEl.style.display = 'none';
            }
        }
        if (nameEl) nameEl.textContent = char ? char.name : '未選択';
        if (placeEl) placeEl.textContent = place ? place.name : '未選択';
        if (relationshipEl) relationshipEl.textContent = '：' + (relationship ? relationship.name : '未設定');
        if (personalityEl) personalityEl.textContent = personality ? `性格：${personality.name}` : '';
        if (costumeEl) costumeEl.textContent = costume ? `服装：${costume.name}` : '';
        if (memoEl) memoEl.textContent = status.memo ? `メモ：${status.memo}` : '';
    }
}

function updateUserStatusDisplay() {
    const place = userState.placeIndex >= 0 ? places[userState.placeIndex] : null;
    document.getElementById('user-place').textContent = place ? place.name : '未選択';
}

// ========== アクション効果処理 ==========

// effect文字列をパース
function parseEffectString(effectStr) {
    const result = { relationship_id: null, costume_id: null };

    // カンマで分割
    const parts = effectStr.split(',').map(p => p.trim()).filter(p => p);

    parts.forEach(part => {
        // key=value形式
        if (part.includes('=')) {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key === 'relationship_id' || key === 'rel') {
                result.relationship_id = value;
            } else if (key === 'costume_id' || key === 'cos') {
                result.costume_id = value;
            }
        } else {
            // IDのみの形式（プレフィックスで判定）
            if (part.startsWith('rel_')) {
                result.relationship_id = part;
            } else if (part.startsWith('cos_')) {
                result.costume_id = part;
            }
        }
    });

    return result;
}

// アクションのeffectを適用（状態変更を行い、メッセージ配列を返す）
function applyActionEffect(action, charAtLocation, statusIndex) {
    const messages = [];
    if (!action.effect || !charAtLocation) return messages;

    const effectStr = action.effect.trim();
    if (!effectStr) return messages;

    console.log('[Effect] 効果を解析:', effectStr);

    // effectをパース（形式: relationship_id=rel_002,costume_id=cos_002 または rel_002,cos_002）
    const effects = parseEffectString(effectStr);

    // 関係性変更
    if (effects.relationship_id) {
        const newRelationship = relationships.find(r => r.relationship_id === effects.relationship_id);
        if (newRelationship) {
            const oldRelationshipId = characterStatus[statusIndex].relationshipId;
            const oldRelationship = relationships.find(r => r.relationship_id === oldRelationshipId);
            characterStatus[statusIndex].relationshipId = effects.relationship_id;
            console.log('[Effect] 関係性変更:', oldRelationship?.name, '→', newRelationship.name);
            messages.push(`🎭 ${charAtLocation.character.name}との関係性が「${oldRelationship?.name || '不明'}」から「${newRelationship.name}」に変化しました`);
        }
    }

    // 服装変更（同じ服装の場合はスキップ）
    if (effects.costume_id) {
        const oldCostumeId = characterStatus[statusIndex].costumeId;
        if (effects.costume_id !== oldCostumeId) {
            const newCostume = costumes.find(c => c.costume_id === effects.costume_id);
            if (newCostume) {
                const oldCostume = costumes.find(c => c.costume_id === oldCostumeId);
                characterStatus[statusIndex].costumeId = effects.costume_id;
                console.log('[Effect] 服装変更:', oldCostume?.name, '→', newCostume.name);
                messages.push(`👗 ${charAtLocation.character.name}の服装が「${oldCostume?.name || '不明'}」から「${newCostume.name}」に変わりました`);
            }
        }
    }

    return messages;
}
