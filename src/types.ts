// ── NovelAI Image API configuration ──
export interface ImageEndpointConfig {
    /** Base URL (e.g. https://image.novelai.net) */
    baseUrl: string;
    /** API token */
    token: string;
    /** Authorization scheme (default: Bearer) */
    authScheme?: string;
    /** Request timeout in milliseconds */
    timeoutMs?: number;
}

// ── Upstream response types ──
export interface ImageEntry {
    dataUrl?: string;
    url?: string;
    name?: string;
    mime?: string;
}

export interface UpstreamResult {
    kind: "json" | "zip" | "image" | "binary";
    contentType: string;
    images: ImageEntry[];
    raw?: unknown;
    metadata?: Record<string, unknown>;
    text?: string;
    headers?: Record<string, string>;
}

// ── Image format enum ──
export type ImageFormat = "png" | "webp";

// ── Streaming type ──
export type StreamingType = "msgpack" | "sse";

// ── Generate parameters (maps to RequestParameters in OpenAPI) ──
export interface GenerateParams {
    /** Image model (e.g. nai-diffusion-4-5-full) */
    model: string;
    action: "generate" | "img2img" | "infill";
    width: number;
    height: number;
    /** Number of samples (1-16) */
    samples: number;
    /** Seed (0 = random) */
    seed: number;
    steps: number;
    scale: number;
    cfg_rescale: number;
    uncond_scale: number;
    sampler: string;
    noise_schedule: string;
    ucPreset: number;
    strength: number;
    noise: number;
    qualityToggle: boolean;
    autoSmea: boolean;
    sm: boolean;
    sm_dyn: boolean;
    decrisper: boolean;
    preferBrownian: boolean;
    addOriginal: boolean;
    legacyV3: boolean;
    legacyUc: boolean;
    varietyPlus: boolean;
    normalizeVibes: boolean;
    useCoords: boolean;
    useOrder: boolean;
    prompt: string;
    negativePrompt: string;
    /** Input image (base64) — required for img2img / infill */
    image?: string;
    /** Inpaint mask (base64) */
    mask?: string;
    /** Image format for response */
    imageFormat?: ImageFormat;
    /** Streaming type */
    stream?: StreamingType;
    /** Optional character prompts for region control */
    characters?: CharacterPrompt[];
    /** Extra parameters forwarded to the API */
    extraParameters?: Record<string, unknown>;
}

export interface CharacterPrompt {
    id: string;
    prompt: string;
    negative: string;
    x: number;
    y: number;
}

// ── Augment image (Director Tools) ──
export interface AugmentImageRequest {
    /** Director tool type */
    req_type: string;
    /** Base64-encoded input image */
    image: string;
    /** Text prompt */
    prompt?: string;
    width?: number;
    height?: number;
    /** Defry amount (despeckle) */
    defry?: number;
}

// ── Encode vibe ──
export interface EncodeVibeRequest {
    /** Base64-encoded image */
    image: string;
    /** Model */
    model: string;
    /** How much information to extract (0-1) */
    information_extracted: number;
    /** Whether to crop image to mask bounds */
    crop_to_mask?: boolean;
    /** Focus seed */
    focus_seed?: number;
    /** Information extraction seed */
    info_extract_seed?: number;
    /** Base64-encoded mask */
    mask?: string;
}

// ── Preset / full params (composite shorthand) ──
export type PresetData = GenerateParams;

export type Preset = {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    data: PresetData;
};
