/**
 * Transition UI Functions
 *
 * 依存: transition-state.js, constants.js
 */

// サイドバー状態
let sidebarCollapsed = false;

// ========== 移動メニュー ==========

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

    places.forEach((place, index) => {
        // command_listが'use'のものだけ表示
        if (place.command_list !== 'use') return;

        const item = document.createElement('div');
        item.className = 'move-menu-item';
        if (index === userState.placeIndex) {
            item.classList.add('current');
        }

        // その場所にいるキャラクター情報
        const charsHere = [];
        characterStatus.forEach((status, i) => {
            if (status.placeIndex === index && status.characterIndex >= 0) {
                const char = characters[status.characterIndex];
                if (char) charsHere.push(char.name);
            }
        });

        item.innerHTML = `
            <div class="place-name">${place.name}${index === userState.placeIndex ? ' (現在地)' : ''}</div>
            ${charsHere.length > 0 ? `<div class="place-info">${charsHere.join(', ')} がいる</div>` : ''}
        `;

        item.onclick = () => selectMoveDestination(index);
        listEl.appendChild(item);
    });

    // 現在の移動モードをラジオボタンに反映
    const aloneRadio = menu.querySelector('input[value="alone"]');
    const togetherRadio = menu.querySelector('input[value="together"]');
    if (aloneRadio && togetherRadio) {
        aloneRadio.checked = !moveWithCompanion;
        togetherRadio.checked = moveWithCompanion;
    }

    menu.style.display = 'flex';
}

function closeMoveMenu() {
    const menu = document.getElementById('moveMenu');
    if (menu) menu.style.display = 'none';
}

function selectMoveDestination(placeIndex) {
    // 移動モードを取得
    const togetherRadio = document.querySelector('#moveMenu input[value="together"]');
    moveWithCompanion = togetherRadio ? togetherRadio.checked : false;

    closeMoveMenu();

    // 移動実行
    if (placeIndex !== userState.placeIndex) {
        executeMove(placeIndex);
    }
}

// ========== 行為メニュー ==========

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

    actions.forEach((action, index) => {
        // command_listが'use'のものだけ表示
        if (action.command_list !== 'use') return;

        const item = document.createElement('div');
        item.className = 'action-menu-item';

        item.innerHTML = `<div class="action-name">${action.name}</div>`;

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
    const toggleBtn = document.getElementById('sidebarToggle');
    if (sidebarCollapsed) {
        container.classList.add('sidebar-collapsed');
        toggleBtn.textContent = '▶';
    } else {
        container.classList.remove('sidebar-collapsed');
        toggleBtn.textContent = '☰';
    }
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? 'yes' : 'no');
}

function initSidebarState() {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved === 'yes') {
        sidebarCollapsed = true;
        const container = document.getElementById('appContainer');
        const toggleBtn = document.getElementById('sidebarToggle');
        container.classList.add('sidebar-collapsed');
        toggleBtn.textContent = '▶';
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
    localStorage.setItem(IMAGE_GEN_ENABLED_KEY, imageGenEnabled ? 'on' : 'off');
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
    localStorage.setItem(LLM_LOG_ENABLED_KEY, llmLogEnabled ? 'on' : 'off');
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
        localStorage.setItem(CHAT_API_KEY, key);
    }
}

function saveRunwareApiKey() {
    const key = document.getElementById('runwareApiKey').value.trim();
    if (key) {
        localStorage.setItem(RUNWARE_API_KEY, key);
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
    localStorage.setItem(SELECTED_MODEL_KEY, selectedModelId);
    console.log('[画像モデル選択]', selectedModelId);
}

function onLLMModelSelect() {
    const select = document.getElementById('llmModelSelect');
    selectedLLMModelId = select.value;
    localStorage.setItem(SELECTED_LLM_MODEL_KEY, selectedLLMModelId);
    console.log('[LLMモデル選択]', selectedLLMModelId);
}

function initLLMModelSelect() {
    const savedLLMModelId = localStorage.getItem(SELECTED_LLM_MODEL_KEY);
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
    localStorage.setItem(CHARACTER_COUNT_KEY, characterCount);
    updateCharacterStatusArray();
    renderCharacterSections();
    updateCharacterStatusDisplay();
    console.log('[登場人数]', characterCount);
}

function initCharacterCount() {
    const savedCount = localStorage.getItem(CHARACTER_COUNT_KEY);
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

        const imageEl = document.getElementById(`char${num}-image`);
        const nameEl = document.getElementById(`char${num}-name`);
        const placeEl = document.getElementById(`char${num}-place`);
        const relationshipEl = document.getElementById(`char${num}-relationship`);
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
        if (memoEl) memoEl.textContent = status.memo ? `メモ：${status.memo}` : '';
    }
}

function updateUserStatusDisplay() {
    const place = userState.placeIndex >= 0 ? places[userState.placeIndex] : null;
    document.getElementById('user-place').textContent = place ? place.name : '未選択';
}
