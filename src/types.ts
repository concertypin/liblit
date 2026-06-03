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

// ── Preset / generation parameters ──
export interface GenerateParams {
    model: string;
    action: string;
    width: number;
    height: number;
    samples: number;
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
    /** Optional character prompts for region control */
    characters?: CharacterPrompt[];
    /** Extra parameters forwarded to the API */
    extraParameters?: Record<string, unknown>;
    /** Override the endpoint path for this request */
    endpointOverride?: string;
}

export interface CharacterPrompt {
    id: string;
    prompt: string;
    negative: string;
    x: number;
    y: number;
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
