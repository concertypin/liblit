import type {
    NovelAIConfig,
    AnyGenerateInput,
    UpscaleInput,
    AugmentInput,
    EncodeVibeInput,
} from "./types";

// ── Dev-only: dynamically import zod schemas ──
// Production: `if (false)` branch is fully tree-shaken by Vite/rolldown.
// zod and schemas have zero bytes in the production bundle.
type Schema<T> = { parse: (d: unknown) => T };
/* v8 ignore start -- TLA and branches differ by mode */
let _cfg: Schema<NovelAIConfig> | null = null;
let _gen: Schema<AnyGenerateInput> | null = null;
let _up: Schema<UpscaleInput> | null = null;
let _aug: Schema<AugmentInput> | null = null;
let _ev: Schema<EncodeVibeInput> | null = null;

if (import.meta.env.DEV) {
    const s = (await import("./schemas")) as unknown as {
        NovelAIConfigSchema: Schema<NovelAIConfig>;
        GenerateInputSchema: Schema<AnyGenerateInput>;
        UpscaleInputSchema: Schema<UpscaleInput>;
        AugmentInputSchema: Schema<AugmentInput>;
        EncodeVibeInputSchema: Schema<EncodeVibeInput>;
    };
    _cfg = s.NovelAIConfigSchema;
    _gen = s.GenerateInputSchema;
    _up = s.UpscaleInputSchema;
    _aug = s.AugmentInputSchema;
    _ev = s.EncodeVibeInputSchema;
}
/* v8 ignore stop */

export function validateConfig(data: unknown): NovelAIConfig {
    /* v8 ignore next -- prod-only fallthrough */
    if (_cfg) return _cfg.parse(data);
    return data as NovelAIConfig;
}

export function validateGenerateInput(data: unknown): AnyGenerateInput {
    /* v8 ignore next -- prod-only fallthrough */
    if (_gen) return _gen.parse(data);
    return data as AnyGenerateInput;
}

export function validateUpscaleInput(data: unknown): UpscaleInput {
    /* v8 ignore next -- prod-only fallthrough */
    if (_up) return _up.parse(data);
    return data as UpscaleInput;
}

export function validateAugmentInput(data: unknown): AugmentInput {
    /* v8 ignore next -- prod-only fallthrough */
    if (_aug) return _aug.parse(data);
    return data as AugmentInput;
}

export function validateEncodeVibe(data: unknown): EncodeVibeInput {
    /* v8 ignore next -- prod-only fallthrough */
    if (_ev) return _ev.parse(data);
    return data as EncodeVibeInput;
}
/* v8 ignore stop */
