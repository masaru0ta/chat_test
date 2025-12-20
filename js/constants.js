/**
 * 共通定数定義
 */

// API設定
const API_CONFIG = {
    RUNWARE_BASE: 'https://api.runware.ai/v1'
};

// LocalStorageキー
const STORAGE_KEYS = {
    GAS_URL: 'gas_api_url',
    API_KEY: 'runware_api_key',
    OPENROUTER_API_KEY: 'openrouter_api_key',
    IMAGE_UPLOAD_URL: 'image_upload_gas_url',
    // test_transition用
    TRANSITION_CACHE: 'transition_test_cache',
    TRANSITION_CHAT_API_KEY: 'transition_chat_api_key',
    TRANSITION_RUNWARE_API_KEY: 'transition_runware_api_key',
    TRANSITION_IMAGE_GEN_ENABLED: 'transition_image_gen_enabled',
    TRANSITION_LLM_LOG_ENABLED: 'transition_llm_log_enabled',
    TRANSITION_SELECTED_MODEL: 'transition_selected_model',
    TRANSITION_SELECTED_LLM_MODEL: 'transition_selected_llm_model',
    TRANSITION_CHARACTER_COUNT: 'transition_character_count',
    TRANSITION_LOCK_PASSWORD: 'transition_lock_password',
    TRANSITION_SIDEBAR_COLLAPSED: 'transition_sidebar_collapsed',
    TRANSITION_GAS_LAST_UPDATED: 'transition_gas_last_updated'
};

// デフォルト値
const DEFAULTS = {
    LOCK_PASSWORD: '8823',
    TYPEWRITER_SPEED: 45,
    // キャラクター初期設定
    RELATIONSHIP_PRIMARY: 'rel_001',
    RELATIONSHIP_SECONDARY: 'rel_302',
    COSTUME: 'cos_001',
    USER_START_PLACE: '101号室 玄関'
};

// LLMモデル定義
const LLM_MODELS = {
    'x-ai/grok-4.1-fast': { name: 'Grok 4.1 Fast' },
    'x-ai/grok-4-fast': { name: 'Grok 4 Fast' }
};

// 構図キー一覧
const COMPOSITION_KEYS = [
    'pov',
    'front view',
    'side view',
    'from above',
    'low angle',
    'from behind',
    'crotch focus'
];
