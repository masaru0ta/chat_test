/**
 * Transition Page Management
 *
 * 依存: transition-state.js (状態変数), constants.js (DEFAULTS.TYPEWRITER_SPEED)
 */

// ローカル定数
const TYPEWRITER_SPEED = DEFAULTS.TYPEWRITER_SPEED;

// ========== 読み込み・ステータス表示 ==========

function showLoading() {
    isLoading = true;
}

function hideLoading() {
    isLoading = false;
    updatePageStatus();
}

function showStatusLLM() {
    // 現在のページの.page-textにパルスドットを追加
    const pageView = document.getElementById('page-view');
    if (pageView) {
        const currentPage = pageView.querySelector(`.page-content[data-page-index="${currentPageIndex}"]`);
        if (currentPage) {
            const pageText = currentPage.querySelector('.page-text');
            if (pageText && !pageText.querySelector('.llm-thinking-dots')) {
                const dots = document.createElement('div');
                dots.className = 'llm-thinking-dots';
                dots.innerHTML = '<span></span><span></span><span></span>';
                pageText.appendChild(dots);
            }
        }
    }
}

function hideStatusLLM() {
    // パルスドットを削除
    document.querySelectorAll('.llm-thinking-dots').forEach(el => el.remove());
}

function showStatusImage() {
    document.getElementById('statusImage')?.classList.add('active');
}

function hideStatusImage() {
    document.getElementById('statusImage')?.classList.remove('active');
}

// ========== タイプライター ==========

function startTypewriter(pageIndex) {
    typewriterBuffer = '';
    typewriterDisplayed = '';
    typewriterPageIndex = pageIndex;
    if (typewriterTimer) {
        clearInterval(typewriterTimer);
    }
    typewriterTimer = setInterval(typewriterTick, TYPEWRITER_SPEED);
}

function stopTypewriter() {
    if (typewriterTimer) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
}

function appendToTypewriter(text) {
    typewriterBuffer = text;
}

function typewriterTick() {
    if (typewriterDisplayed.length < typewriterBuffer.length) {
        typewriterDisplayed = typewriterBuffer.substring(0, typewriterDisplayed.length + 1);
        if (typewriterPageIndex >= 0) {
            updatePageText(typewriterPageIndex, typewriterDisplayed);
        }
    }
}

async function waitForTypewriter() {
    return new Promise(resolve => {
        const checkComplete = () => {
            if (typewriterDisplayed.length >= typewriterBuffer.length) {
                stopTypewriter();
                resolve();
            } else {
                setTimeout(checkComplete, 50);
            }
        };
        checkComplete();
    });
}

// ========== ナビゲーション ==========

function updatePageStatus() {
    const nextBtn = document.getElementById('next-btn');

    // 次へボタン：未読ページがあり読み込み中でなければready
    if (nextBtn) {
        if (!isLoading && currentPageIndex < pages.length - 1) {
            nextBtn.classList.add('ready');
        } else {
            nextBtn.classList.remove('ready');
        }
    }
}

function nextPage() {
    if (currentPageIndex < pages.length - 1) {
        showPage(currentPageIndex + 1);
    }
}

function prevPage() {
    if (currentPageIndex > 0) {
        showPage(currentPageIndex - 1);
    }
}

function goToLatestPage() {
    if (pages.length > 0) {
        showPage(pages.length - 1);
    }
}

// ========== ページ管理 ==========

function addPage(pageData) {
    const pageIndex = pages.length;
    // fullTextを保存し、typewriterCompletedフラグを追加
    pageData.fullText = pageData.text;
    pageData.typewriterCompleted = false;
    pages.push(pageData);

    // DOM要素を作成
    const pageView = document.getElementById('page-view');
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page-content';
    pageDiv.dataset.pageIndex = pageIndex;
    pageDiv.style.display = 'none';

    let imageHtml = '';
    if (pageData.image) {
        imageHtml = `<img src="${pageData.image}" alt="${pageData.label}">`;
    } else if (pageData.type !== 'system' && pageData.type !== 'dialogue') {
        imageHtml = '<div class="placeholder">画像なし</div>';
    }

    let labelClass = '';
    if (pageData.type === 'character' || pageData.type === 'dialogue') {
        labelClass = 'character';
    }
    pageData.labelClass = labelClass;

    const showImage = pageData.type !== 'system' && pageData.type !== 'dialogue';
    pageDiv.innerHTML = `
        ${showImage ? `<div class="page-image">${imageHtml}</div>` : ''}
        <div class="page-text ${pageData.type === 'dialogue' ? 'dialogue-text' : ''}">
            <div>${pageData.text.replace(/\n/g, '<br>')}</div>
        </div>
    `;

    pageView.appendChild(pageDiv);

    // 最初のページの場合は表示
    if (pages.length === 1) {
        currentPageIndex = 0;
        showPage(0);
    }
}

function showPage(index) {
    if (index < 0 || index >= pages.length) return;
    currentPageIndex = index;

    // 全ページを非表示にして、指定ページのみ表示
    const pageView = document.getElementById('page-view');
    const pageContents = pageView.querySelectorAll('.page-content');
    pageContents.forEach((el, i) => {
        el.style.display = (i === index) ? 'flex' : 'none';
    });

    updatePageStatus();

    // タイプライター未完了のページならタイプライター開始
    const page = pages[index];
    if (page && !page.typewriterCompleted && page.fullText) {
        // テキストをクリアしてタイプライター開始
        const pageDiv = pageView.querySelector(`.page-content[data-page-index="${index}"]`);
        if (pageDiv) {
            const textDiv = pageDiv.querySelector('.page-text > div');
            if (textDiv) textDiv.innerHTML = '';
        }
        startPageTypewriter(index);
    }
}

function startPageTypewriter(pageIndex) {
    const page = pages[pageIndex];
    if (!page || !page.fullText) return;

    // 既存のタイプライターを停止
    stopTypewriter();

    // タイプライター設定
    typewriterBuffer = page.fullText;
    typewriterDisplayed = '';
    typewriterPageIndex = pageIndex;

    // タイマー開始
    typewriterTimer = setInterval(() => {
        if (typewriterDisplayed.length < typewriterBuffer.length) {
            typewriterDisplayed = typewriterBuffer.substring(0, typewriterDisplayed.length + 1);
            updatePageText(typewriterPageIndex, typewriterDisplayed);
        } else {
            // 完了
            stopTypewriter();
            pages[typewriterPageIndex].typewriterCompleted = true;
        }
    }, TYPEWRITER_SPEED);
}

function updatePageText(pageIndex, newText) {
    if (pageIndex < 0 || pageIndex >= pages.length) return;

    // データ更新
    pages[pageIndex].text = newText;

    // DOM更新
    const pageView = document.getElementById('page-view');
    const pageDiv = pageView.querySelector(`.page-content[data-page-index="${pageIndex}"]`);
    if (pageDiv) {
        const textDiv = pageDiv.querySelector('.page-text > div');
        if (textDiv) {
            textDiv.innerHTML = newText.replace(/\n/g, '<br>');
        }
        // 自動スクロール
        const pageText = pageDiv.querySelector('.page-text');
        if (pageText) pageText.scrollTop = pageText.scrollHeight;
    }
}

// ========== ページ追加ヘルパー ==========

function addPage1(placeImage, text) {
    const pageIndex = pages.length;
    addPage({
        type: 'narrative',
        image: placeImage,
        text: text,
        label: ''
    });
    return pageIndex;
}

function addPage2(characterName, image, text) {
    const pageIndex = pages.length;
    addPage({
        type: 'character',
        image: image,
        text: text,
        label: characterName
    });
    return pageIndex;
}

function addDialogue(characterName, text) {
    console.log('[addDialogue] 開始 - name:', characterName, '/ text:', text);
    const lastPage = pages[pages.length - 1];
    console.log('[addDialogue] lastPage type:', lastPage?.type, '/ pages.length:', pages.length);

    // 名前があれば「名前 テキスト」、なければテキストのみ
    const lineText = characterName ? `${characterName}${text}` : text;
    console.log('[addDialogue] lineText:', lineText);

    // 最後のページがdialogueまたはcharacterタイプなら追記
    if (lastPage && (lastPage.type === 'dialogue' || lastPage.type === 'character')) {
        console.log('[addDialogue] 追記モード開始');
        const pageIndex = pages.length - 1;
        // データ更新
        lastPage.text += `\n${lineText}`;
        lastPage.fullText = lastPage.text;
        console.log('[addDialogue] データ更新完了 - text:', lastPage.text);

        // 既存のタイプライターがあれば完了させる
        if (!lastPage.typewriterCompleted) {
            console.log('[addDialogue] タイプライター未完了 - 完了処理開始');
            // DOMに現在のテキスト（追記前）を反映
            const pageView = document.getElementById('page-view');
            const pageDiv = pageView.querySelector(`.page-content[data-page-index="${pageIndex}"]`);
            if (pageDiv) {
                const textDiv = pageDiv.querySelector('.page-text > div');
                if (textDiv) {
                    // 追記前のテキストを表示
                    const prevText = lastPage.text.split('\n').slice(0, -1).join('\n');
                    textDiv.innerHTML = prevText.replace(/\n/g, '<br>');
                }
            }
            lastPage.typewriterCompleted = true;
            stopTypewriter();
        }

        // 最新ページへ移動（タイプライターは起動しない）
        showPage(pageIndex);

        // 追記テキストをタイプライター表示
        startAppendTypewriter(pageIndex, lineText);
    } else {
        // 新規ページ作成
        addPage({
            type: 'dialogue',
            image: null,
            text: lineText,
            label: '会話'
        });
        // ストリーミングではないのでタイプライターを起動させる
        goToLatestPage();
    }
}

function startAppendTypewriter(pageIndex, appendText) {
    console.log('[startAppendTypewriter] 開始 - pageIndex:', pageIndex, '/ appendText:', appendText);
    // 既存のタイプライターを停止
    stopTypewriter();

    const pageView = document.getElementById('page-view');
    const pageDiv = pageView.querySelector(`.page-content[data-page-index="${pageIndex}"]`);
    if (!pageDiv) {
        console.error('[startAppendTypewriter] pageDiv not found');
        return;
    }

    const textDiv = pageDiv.querySelector('.page-text > div');
    if (!textDiv) {
        console.error('[startAppendTypewriter] textDiv not found');
        return;
    }

    // ページデータから追記前のテキストを取得してDOMに反映
    const page = pages[pageIndex];
    if (page) {
        // fullTextから追記分を除いた部分をDOMに設定
        const fullLines = page.fullText.split('\n');
        const appendLines = appendText.split('\n');
        // 末尾から追記分を除去
        const prevLines = fullLines.slice(0, fullLines.length - appendLines.length);
        const prevHtml = prevLines.join('\n').replace(/\n/g, '<br>');
        textDiv.innerHTML = prevHtml;
        console.log('[startAppendTypewriter] DOM更新完了 - prevHtml長:', prevHtml.length);
    }

    // 現在のDOM内容を保持
    const currentHtml = textDiv.innerHTML;
    let displayedCount = 0;
    const textToAppend = `\n${appendText}`;
    const pageText = pageDiv.querySelector('.page-text');

    typewriterTimer = setInterval(() => {
        if (displayedCount < textToAppend.length) {
            displayedCount++;
            const partialText = textToAppend.substring(0, displayedCount);
            textDiv.innerHTML = currentHtml + partialText.replace(/\n/g, '<br>');
            // 自動スクロール
            if (pageText) pageText.scrollTop = pageText.scrollHeight;
        } else {
            stopTypewriter();
        }
    }, TYPEWRITER_SPEED);
}

// ========== メッセージ関数 ==========

function addSystemMessage(text) {
    console.log('[System]', text);
    // 現在のページにシステムメッセージを追加
    if (pages.length > 0) {
        const pageIndex = pages.length - 1;
        const lastPage = pages[pageIndex];
        const newText = lastPage.text + (lastPage.text ? '\n' : '') + text;
        lastPage.fullText = newText;
        updatePageText(pageIndex, newText);
    }
}

function addStateChangeMessage(text) {
    console.log('[StateChange]', text);
}

function addActionMessage(action, label) {
    console.log('[Action]', label, action.name);
}

function addTransitionMessage(fromAction, toAction) {
    console.log('[Transition]', fromAction.name, '→', toAction.name);
}

function addCommandMessage(type, text) {
    console.log(`[${type}]`, text);
}

function addAssistantMessage(name, text) {
    addPage({
        type: 'dialogue',
        image: null,
        text: text,
        label: name
    });
}
