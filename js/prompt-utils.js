/**
 * プロンプト処理ユーティリティ
 */

/**
 * プロンプトを整形（連続スペース・カンマを修正）
 * @param {string} prompt - プロンプト
 * @returns {string} 整形されたプロンプト
 */
function cleanPrompt(prompt) {
    if (!prompt) return '';
    return prompt
        .replace(/  +/g, ' ')      // 連続スペースを1つに
        .replace(/,\s*,+/g, ',')   // 連続カンマを1つに
        .replace(/^,\s*/, '')      // 先頭のカンマを削除
        .replace(/,\s*$/, '')      // 末尾のカンマを削除
        .trim();
}

/**
 * BEST構図を選択
 * @param {Array} compositions - 構図配列 [{name, tag, quality}, ...]
 * @returns {Object|null} 選択された構図オブジェクト
 */
function selectBestComposition(compositions) {
    if (!compositions || compositions.length === 0) return null;

    // BESTのものを探す（大文字小文字を区別しない）
    const bestComps = compositions.filter(c => c.quality && c.quality.toUpperCase() === 'BEST');
    if (bestComps.length > 0) {
        return bestComps[Math.floor(Math.random() * bestComps.length)];
    }

    // BESTがなければGoodからランダム（大文字小文字を区別しない）
    const goodComps = compositions.filter(c => c.quality && c.quality.toUpperCase() === 'GOOD');
    if (goodComps.length > 0) {
        return goodComps[Math.floor(Math.random() * goodComps.length)];
    }

    // それもなければ全体からランダム
    return compositions[Math.floor(Math.random() * compositions.length)];
}

/**
 * アクションから構図タグを取得
 * @param {Array} actions - アクション配列
 * @param {number} actionIndex - アクションのインデックス
 * @returns {string} 構図タグ（tagがなければnameをフォールバック）
 */
function getCompositionTag(actions, actionIndex) {
    if (actionIndex < 0 || !actions || !actions[actionIndex]) return '';
    const compositions = actions[actionIndex].compositions;
    const selected = selectBestComposition(compositions);
    return selected?.tag || selected?.name || '';
}

/**
 * プロンプト内のキャラクタータグを置換（2段階置換）
 * 1段階目: {clothes}, {camel}, {expression} → costume.tag, costume.camel_tag, relationship.expression
 * 2段階目: {uniform1}, {uniform2} → character.uniform1, uniform2
 * @param {string} prompt - 置換前のプロンプト
 * @param {Object} character - キャラクターオブジェクト（uniform1, uniform2, clothes, camel, expressionを含む）
 * @returns {string} 置換後のプロンプト
 */
function replaceCharacterTags(prompt, character) {
    if (!prompt) return prompt;
    const uniform1 = (character && character.uniform1) || '';
    const uniform2 = (character && character.uniform2) || '';
    const clothes = (character && character.clothes) || '';
    const camel = (character && character.camel) || '';
    const expression = (character && character.expression) || '';

    // 1段階目: {clothes}, {camel}, {expression} → 実際のタグ
    let result = prompt
        .replace(/\{clothes\}/gi, clothes)
        .replace(/\{camel\}/gi, camel)
        .replace(/\{expression\}/gi, expression);

    // 2段階目: {uniform1}, {uniform2} → 実際のタグ
    result = result
        .replace(/\{uniform1\}/gi, uniform1)
        .replace(/\{uniform2\}/gi, uniform2)
        .replace(/\[uniform1\]/gi, uniform1)
        .replace(/\[uniform2\]/gi, uniform2);

    return result;
}

/**
 * 最終プロンプトを生成（タグ置換 + 整形）
 * @param {string} prompt - 生のプロンプト
 * @param {Object} character - キャラクターオブジェクト
 * @returns {string} 処理済みプロンプト
 */
function buildFinalPrompt(prompt, character) {
    return cleanPrompt(replaceCharacterTags(prompt, character));
}
