// ── Client API ──
export { generate, upscale, augment, encodeVibe, postJson } from "./client";
export type { RequestOptions } from "./client";

// ── Utility functions ──
export {
    toFullUrl,
    authHeader,
    encodeBase64,
    decodeBase64,
    bytesToDataUrl,
    inferMime,
    inferImageMimeFromBytes,
    looksLikeZip,
    collectImagesFromJson,
    normalizeUpstream,
    normalizeZip,
    timingSafeEqual,
} from "./utils";

// ── Transform utilities ──
export {
    resolveConfig,
    transformGenerate,
    transformUpscale,
    transformAugment,
    transformEncodeVibe,
    randomSeed,
} from "./transform";
export type { ResolvedConfig } from "./transform";

// ── Type definitions ──
// ── Type definitions ──
export type {
    NovelAIConfig,
    GenerateInputBase,
    GenerateInput,
    Img2ImgInput,
    InfillInput,
    AnyGenerateInput,
    UpscaleInput,
    AugmentInput,
    EncodeVibeInput,
    ImageFormat,
    StreamingType,
    CharacterPrompt,
    ImageResult,
    GenerationResult,
    PresetData,
    Preset,
    ModelId,
    SamplerName,
    NoiseScheduleName,
} from "./types";

// ── Named constants for autocomplete ──
export { MODELS, SAMPLERS, NOISE_SCHEDULES } from "./types";

// ── Constants ──
export { MAX_RESPONSE_BYTES, DEFAULT_BASE_URL } from "./constants";

// ── Zod schemas (dev-only validation) ──
export {
    NovelAIConfigSchema,
    GenerateInputSchema,
    GenerateActionSchema,
    Img2ImgActionSchema,
    InfillActionSchema,
    UpscaleInputSchema,
    AugmentInputSchema,
    EncodeVibeInputSchema,
    ImageFormatSchema,
    StreamingTypeSchema,
    CharacterPromptSchema,
} from "./schemas";
