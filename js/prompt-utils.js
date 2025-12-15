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
 * プロンプト内のキャラクタータグを置換
 * [uniform1], [uniform2] をキャラクターの対応する値に置換
 * @param {string} prompt - 置換前のプロンプト
 * @param {Object} character - キャラクターオブジェクト（uniform1, uniform2を含む）
 * @returns {string} 置換後のプロンプト
 */
function replaceCharacterTags(prompt, character) {
    if (!prompt) return prompt;
    const uniform1 = (character && character.uniform1) || '';
    const uniform2 = (character && character.uniform2) || '';
    return prompt
        .replace(/\[uniform1\]/gi, uniform1)
        .replace(/\[uniform2\]/gi, uniform2);
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
