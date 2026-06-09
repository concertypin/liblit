// ── Transform layer ──
// Converts user-friendly camelCase inputs to the NovelAI API's request body format.
// Handles: camelCase-to-snake_case mapping, Uint8Array-to-base64 conversion,
// default value injection for omitted optional fields.

import type {
    NovelAIConfig,
    AnyGenerateInput,
    UpscaleInput,
    AugmentInput,
    EncodeVibeInput,
} from "./types";
import { encodeBase64 } from "./utils";
import { DEFAULT_BASE_URL } from "./constants";

// ── Resolved config ──

export interface ResolvedConfig {
    token: string;
    baseUrl: string;
    timeoutMs: number;
}

export function resolveConfig(config: NovelAIConfig): ResolvedConfig {
    const token =
        config.token ??
        (typeof import.meta.env !== "undefined"
            ? import.meta.env.NOVELAI_KEY
            : undefined) ??
        "";
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const timeoutMs = config.timeoutMs ?? 120_000;
    return { token, baseUrl, timeoutMs };
}

// ── camelCase → snake_case mapping ──
// The NovelAI API uses a mix of camelCase and snake_case.  Fields listed here
// have names that differ from a simple camel-to-snake conversion.  Any field
// not in this map is passed through as-is (matching the many camelCase API
// parameters like `qualityToggle`, `ucPreset`, `addOriginal`, etc.).

const FIELD_MAP: Record<string, string> = {
    negativePrompt: "negative_prompt",
    cfgRescale: "cfg_rescale",
    uncondScale: "uncond_scale",
    noiseSchedule: "noise_schedule",
    infoExtractSeed: "info_extract_seed",
    focusSeed: "focus_seed",
    cropToMask: "crop_to_mask",
    informationExtracted: "information_extracted",
    reqType: "req_type",
    imageFormat: "image_format",
};

// ── Generate defaults ──

const GENERATE_DEFAULTS: Record<string, unknown> = {
    width: 1024,
    height: 1024,
    samples: 1,
    steps: 28,
    scale: 5,
    cfgRescale: 0,
    uncondScale: 1,
    sampler: "k_euler_ancestral",
    noiseSchedule: "native",
    ucPreset: 0,
    strength: 0.6,
    noise: 0,
    qualityToggle: true,
    autoSmea: false,
    sm: false,
    smDyn: false,
    decrisper: false,
    preferBrownian: false,
    addOriginal: false,
    legacyV3: false,
    legacyUc: false,
    varietyPlus: false,
    normalizeVibes: true,
    useCoords: false,
    useOrder: false,
};

// ―― Fields to skip in the parameters object (handled at top level) ――

const SKIP_PARAMS = new Set([
    "action",
    "model",
    "characters",
    "extraParameters",
    "image",
    "mask",
    "stream",
]);

// ―― Helpers ――

function mapField(key: string): string {
    return FIELD_MAP[key] ?? key;
}

/** Encode Uint8Array values to base64 strings (passthrough for non-bytes). */
function encodeImageField(value: unknown): unknown {
    /* v8 ignore next -- image/mask handled at top level, not passed here */
    if (value instanceof Uint8Array) return encodeBase64(value);
    return value;
}

// ── Transform generate input → API request body ──

export function transformGenerate(
    input: AnyGenerateInput
): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const inputBase = input as unknown as Record<string, unknown>;

    // Build parameters object (everything except action/model/top-level fields)
    for (const [key, value] of Object.entries(inputBase)) {
        if (SKIP_PARAMS.has(key)) continue;
        /* v8 ignore next 3 -- entries only include existing values */
        if (value !== undefined && value !== null) {
            params[mapField(key)] = encodeImageField(value);
        }
    }

    // Inject defaults for any parameter that wasn't explicitly provided
    for (const [key, defaultValue] of Object.entries(GENERATE_DEFAULTS)) {
        if (params[mapField(key)] === undefined) {
            params[mapField(key)] = defaultValue;
        }
    }

    const body: Record<string, unknown> = {
        action: input.action,
        model: input.model,
        parameters: params,
    };

    // Top-level input: prompt text for "generate", base64 image for img2img/infill
    if (input.action === "generate") {
        body.input = input.prompt;
    } else {
        const imgInput = input as unknown as {
            image: Uint8Array;
            mask?: Uint8Array;
        };
        body.input = encodeBase64(imgInput.image);
        if (imgInput.mask) {
            body.input_mask = encodeBase64(imgInput.mask);
        }
    }

    // Add characters to parameters if provided (map negative → negative_prompt)
    if (input.characters && input.characters.length > 0) {
        params.characters = input.characters.map((c) => ({
            id: c.id,
            prompt: c.prompt,
            negative_prompt: c.negative,
            x: c.x,
            y: c.y,
        })) as unknown[];
    }

    // Spread extra parameters into parameters
    if (input.extraParameters) {
        for (const [k, v] of Object.entries(input.extraParameters)) {
            params[k] = v;
        }
    }

    // Stream flag
    if (input.stream) {
        params.stream = input.stream;
    }

    return body;
}

// ── Transform upscale input → API request body ──

export function transformUpscale(input: UpscaleInput): Record<string, unknown> {
    const body: Record<string, unknown> = {
        image: encodeBase64(input.image),
    };
    if (input.scale !== undefined) body.scale = input.scale;
    if (input.model !== undefined) body.model = input.model;
    return body;
}

// ── Transform augment input → API request body ──

export function transformAugment(input: AugmentInput): Record<string, unknown> {
    const body: Record<string, unknown> = {
        req_type: input.reqType,
        image: encodeBase64(input.image),
    };
    if (input.prompt !== undefined) body.prompt = input.prompt;
    if (input.width !== undefined) body.width = input.width;
    if (input.height !== undefined) body.height = input.height;
    if (input.defry !== undefined) body.defry = input.defry;
    return body;
}

// ── Transform encode-vibe input → API request body ──

export function transformEncodeVibe(
    input: EncodeVibeInput
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        image: encodeBase64(input.image),
        model: input.model,
        information_extracted: input.informationExtracted,
    };
    if (input.cropToMask !== undefined) body.crop_to_mask = input.cropToMask;
    if (input.focusSeed !== undefined) body.focus_seed = input.focusSeed;
    if (input.infoExtractSeed !== undefined)
        body.info_extract_seed = input.infoExtractSeed;
    if (input.mask !== undefined) body.mask = encodeBase64(input.mask);
    return body;
}

// ── Random seed generation ──

export function randomSeed(): number {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0]!;
}
