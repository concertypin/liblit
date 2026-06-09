// ── NovelAI API Client Configuration ──

export interface NovelAIConfig {
    /** NovelAI API token. Defaults to `import.meta.env.NOVELAI_KEY` when available. */
    token?: string;
    /** Base URL for the API (default "https://image.novelai.net"). */
    baseUrl?: string;
    /** Request timeout in milliseconds (default 120_000). */
    timeoutMs?: number;
}

// ── Image format ──
export type ImageFormat = "png" | "webp";

// ── Streaming type ──
export type StreamingType = "msgpack" | "sse";

// ── Character prompt for region control ──
export interface CharacterPrompt {
    id: string;
    prompt: string;
    negative: string;
    x: number;
    y: number;
}

// ── Generate input base (common fields shared by all generate actions) ──

export interface GenerateInputBase {
    /** Image model (e.g. "nai-diffusion-4-5-full", "nai-diffusion-4-5-curated") */
    model: string;
    /** Text prompt (positive) */
    prompt: string;
    /** Negative prompt */
    negativePrompt?: string;
    /** Image width (default 1024) */
    width?: number;
    /** Image height (default 1024) */
    height?: number;
    /** Number of samples (1-16, default 1) */
    samples?: number;
    /** Random seed. Omit for random. */
    seed?: number;
    /** Inference steps (default 28) */
    steps?: number;
    /** CFG scale (0-30, default 5) */
    scale?: number;
    /** CFG rescale (0-1, default 0) */
    cfgRescale?: number;
    /** Unconditional scale (0-10, default 1) */
    uncondScale?: number;
    /** Sampler (default "k_euler_ancestral") */
    sampler?: string;
    /** Noise schedule (default "native") */
    noiseSchedule?: string;
    /** UC preset (0-7, default 0) */
    ucPreset?: number;
    /** img2img strength (0-1, default 0.6) */
    strength?: number;
    /** Noise amount (0-1, default 0) */
    noise?: number;
    qualityToggle?: boolean;
    autoSmea?: boolean;
    sm?: boolean;
    smDyn?: boolean;
    decrisper?: boolean;
    preferBrownian?: boolean;
    addOriginal?: boolean;
    legacyV3?: boolean;
    legacyUc?: boolean;
    varietyPlus?: boolean;
    normalizeVibes?: boolean;
    useCoords?: boolean;
    useOrder?: boolean;
    /** Image format for the response */
    imageFormat?: ImageFormat;
    /** Streaming type */
    stream?: StreamingType;
    /** Character prompts for region control */
    characters?: CharacterPrompt[];
    /** Extra parameters forwarded to the API as-is */
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
    /** Input image to upscale */
    image: Uint8Array;
    /** Upscale factor (e.g. 2, 4) */
    scale?: number;
    /** Model override */
    model?: string;
}

// ── Augment (Director Tools) ──
export interface AugmentInput {
    /** Director tool type (e.g. "draw", "inpaint") */
    reqType: string;
    /** Input image */
    image: Uint8Array;
    /** Text prompt */
    prompt?: string;
    /** Output width */
    width?: number;
    /** Output height */
    height?: number;
    /** Defry (despeckle) amount (integer) */
    defry?: number;
}

// ── Encode Vibe ──
export interface EncodeVibeInput {
    /** Input image */
    image: Uint8Array;
    /** Model */
    model: string;
    /** How much information to extract (0-1) */
    informationExtracted: number;
    /** Whether to crop image to mask bounds */
    cropToMask?: boolean;
    /** Focus seed */
    focusSeed?: number;
    /** Information extraction seed */
    infoExtractSeed?: number;
    /** Optional mask */
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
