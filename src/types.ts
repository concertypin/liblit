// ── NovelAI API Client Configuration ──

export interface NovelAIConfig {
    /**
     * NovelAI API token.
     * @default import.meta.env.NOVELAI_KEY
     */
    token?: string;
    /**
     * Base URL for the NovelAI Image API.
     * @default "https://image.novelai.net"
     */
    baseUrl?: string;
    /**
     * Request timeout in milliseconds.
     * @default 120000
     */
    timeoutMs?: number;
}

// ── Image format ──
export type ImageFormat = "png" | "webp";

// ── Streaming type ──
export type StreamingType = "msgpack" | "sse";

// ── Known model identifiers (may be extended by NovelAI) ──
/** @see {@link MODELS} for well-known model IDs. */
export type ModelId =
    | `nai-diffusion-${string}`
    | `safe-diffusion-${string}`
    | (string & {});

/** Well-known NovelAI model identifiers. */
export const MODELS = {
    V4_5_FULL: "nai-diffusion-4-5-full",
    V4_5_CURATED: "nai-diffusion-4-5-curated",
    V3_FULL: "nai-diffusion-3-full",
    V3_CURATED: "nai-diffusion-3-curated",
} as const;

/** Known sampler algorithms (NovelAI may support more). */
export const SAMPLERS = [
    "k_euler_ancestral",
    "k_euler",
    "k_dpmpp_2m",
    "k_dpmpp_sde",
    "k_dpmpp_2s_ancestral",
    "ddim",
] as const;

/** @see {@link SAMPLERS} for well-known sampler names. */
export type SamplerName = (typeof SAMPLERS)[number] | (string & {});

/** Known noise schedules (NovelAI may support more). */
export const NOISE_SCHEDULES = [
    "native",
    "karras",
    "exponential",
    "polyexponential",
] as const;

/** @see {@link NOISE_SCHEDULES} for well-known schedule names. */
export type NoiseScheduleName =
    | (typeof NOISE_SCHEDULES)[number]
    | (string & {});

// ── Character prompt for region control ──
export interface CharacterPrompt {
    /** Character identifier */
    id: string;
    /** Positive prompt for this character */
    prompt: string;
    /**
     * Negative prompt for this character.
     * @note Mapped to `negative_prompt` in the API request body.
     */
    negative: string;
    /** X coordinate for region placement */
    x: number;
    /** Y coordinate for region placement */
    y: number;
}

// ── Generate input base (common fields shared by all generate actions) ──

export interface GenerateInputBase {
    /**
     * Image model identifier.
     * @default "nai-diffusion-4-5-full"
     * @see {@link MODELS} for well-known model IDs.
     */
    model: ModelId;
    /** Text prompt (positive) */
    prompt: string;
    /** Negative / undesired content prompt. */
    negativePrompt?: string;
    /**
     * Output image width in pixels.
     * @default 1024
     */
    width?: number;
    /**
     * Output image height in pixels.
     * @default 1024
     */
    height?: number;
    /**
     * Number of images to generate (1–16).
     * @default 1
     */
    samples?: number;
    /**
     * Random seed. Omit for server-side random assignment.
     * @see {@link randomSeed} to generate a client-side seed.
     */
    seed?: number;
    /**
     * Inference steps (1–100). Higher = more detail but slower.
     * @default 28
     */
    steps?: number;
    /**
     * CFG (Classifier-Free Guidance) scale (0–30).
     * Higher = stricter prompt adherence.
     * @default 5
     */
    scale?: number;
    /**
     * CFG rescale amount (0–1).
     * @default 0
     */
    cfgRescale?: number;
    /**
     * Unconditional guidance scale (0–10).
     * @default 1
     */
    uncondScale?: number;
    /**
     * Sampler algorithm.
     * @default "k_euler_ancestral"
     * @see {@link SAMPLERS} for well-known sampler names.
     */
    sampler?: SamplerName;
    /**
     * Noise schedule.
     * @default "native"
     * @see {@link NOISE_SCHEDULES} for well-known schedule names.
     */
    noiseSchedule?: NoiseScheduleName;
    /**
     * UC (Unconditional Conditioning) preset (0–7).
     * @default 0
     */
    ucPreset?: number;
    /**
     * img2img strength (0–1). Higher = more deviation from input.
     * @default 0.6
     */
    strength?: number;
    /**
     * Noise level (0–1). Only applies to img2img/infill.
     * @default 0
     */
    noise?: number;
    /** @default true */
    qualityToggle?: boolean;
    /** @default false */
    autoSmea?: boolean;
    /** @default false */
    sm?: boolean;
    /** @default false */
    smDyn?: boolean;
    /** @default false */
    decrisper?: boolean;
    /** @default false */
    preferBrownian?: boolean;
    /** @default false */
    addOriginal?: boolean;
    /** @default false */
    legacyV3?: boolean;
    /** @default false */
    legacyUc?: boolean;
    /** @default false */
    varietyPlus?: boolean;
    /** @default true */
    normalizeVibes?: boolean;
    /** @default false */
    useCoords?: boolean;
    /** @default false */
    useOrder?: boolean;
    /**
     * Output image format.
     * @default "png" (API default)
     */
    imageFormat?: ImageFormat;
    /**
     * Streaming mode. When set, response is streamed as msgpack or SSE.
     */
    stream?: StreamingType;
    /** Region-controlled character prompts. */
    characters?: CharacterPrompt[];
    /** Extra parameters forwarded to the API as-is (advanced use). */
    extraParameters?: Record<string, unknown>;
}

/** Text-to-image generation. */
export interface GenerateInput extends GenerateInputBase {
    action: "generate";
}

/** Image-to-image generation. */
export interface Img2ImgInput extends GenerateInputBase {
    action: "img2img";
    /** Input image */
    image: Uint8Array;
    /** Optional inpainting mask */
    mask?: Uint8Array;
}

/** Infill (inpainting) generation. */
export interface InfillInput extends GenerateInputBase {
    action: "infill";
    /** Input image */
    image: Uint8Array;
    /** Inpainting mask */
    mask: Uint8Array;
}

/** Discriminated union of all generation input types. */
export type AnyGenerateInput = GenerateInput | Img2ImgInput | InfillInput;

// ── Upscale ──
export interface UpscaleInput {
    /** Input image to upscale (Uint8Array) */
    image: Uint8Array;
    /**
     * Upscale factor.
     * @default 2
     */
    scale?: number;
    /**
     * Model override.
     * @default "nai-diffusion-4-5-full"
     */
    model?: ModelId;
}

// ── Augment (Director Tools) ──
export interface AugmentInput {
    /** Director tool type (e.g. "draw", "inpaint") */
    reqType: string;
    /** Input image (Uint8Array) */
    image: Uint8Array;
    /** Text prompt */
    prompt?: string;
    /** Output width in pixels */
    width?: number;
    /** Output height in pixels */
    height?: number;
    /** Defry / despeckle amount (integer) */
    defry?: number;
}

// ── Encode Vibe ──
export interface EncodeVibeInput {
    /** Input image (Uint8Array) */
    image: Uint8Array;
    /**
     * Model to use for vibe extraction.
     * @default "nai-diffusion-4-5-curated"
     */
    model: ModelId;
    /**
     * How much information to extract (0–1).
     * @default 0.5
     */
    informationExtracted: number;
    /** Whether to crop input image to the mask bounds. */
    cropToMask?: boolean;
    /** Focus seed for extraction. */
    focusSeed?: number;
    /** Information extraction seed. */
    infoExtractSeed?: number;
    /** Optional mask (Uint8Array) to constrain extraction area. */
    mask?: Uint8Array;
}

// ── Response types ──

export interface ImageResult {
    /** Image binary data (present when extracted from response body) */
    bytes?: Uint8Array;
    /** Public URL (present when the response references a remote image) */
    url?: string;
    /** MIME type (e.g. "image/png", "image/webp") */
    mime: string;
    /** Optional filename (available in ZIP responses) */
    name?: string;
}

export interface GenerationResult {
    /** High-level result classification */
    kind: "json" | "zip" | "image" | "binary";
    /** Content-Type header value from the response */
    contentType: string;
    /** Extracted images */
    images: ImageResult[];
    /** Raw parsed JSON body (only for kind="json") */
    raw?: unknown;
    /** Metadata entries extracted from ZIP archives */
    metadata?: Record<string, unknown>;
    /** Decoded text content (only for kind="binary") */
    text?: string;
    /** Response headers (always present, may be empty) */
    headers: Record<string, string>;
}

// ── Preset types ──
export type PresetData = Record<string, unknown>;

export interface Preset {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    data: PresetData;
}
