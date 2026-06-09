interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    /** NovelAI API token. Falls back to this when `token` is omitted in `NovelAIConfig`. */
    readonly NOVELAI_KEY?: string;
    /** Custom API base URL override (defaults to https://image.novelai.net). */
    readonly NOVELAI_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
