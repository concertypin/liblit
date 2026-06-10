import { z } from "zod";

// ── Basic enum schemas ──

/** Output image format: PNG or WebP */
export const ImageFormatSchema = z.enum(["png", "webp"]);

/** Streaming mode: msgpack binary or SSE text */
export const StreamingTypeSchema = z.enum(["msgpack", "sse"]);

// ── Character prompt ──

/** Region-controlled character prompt */
export const CharacterPromptSchema = z.object({
    /** Character identifier */
    id: z.string(),
    /** Positive prompt for this character */
    prompt: z.string(),
    /** Negative prompt (maps to \`negative_prompt\` in API) */
    negative: z.string(),
    /** X coordinate */
    x: z.number(),
    /** Y coordinate */
    y: z.number(),
});

// ── Generate input base (shared fields) ──

/** Shared validation for all generate action types */
const GenerateInputBaseSchema = z.object({
    /** @default "nai-diffusion-4-5-full" {@link MODELS} */
    model: z.string().min(1),
    /** Text prompt (positive) */
    prompt: z.string(),
    /** Negative / undesired content prompt. */
    negativePrompt: z.string().optional(),
    /** @default 1024 */
    width: z.number().int().positive().optional(),
    /** @default 1024 */
    height: z.number().int().positive().optional(),
    /** @default 1 */
    samples: z.number().int().min(1).max(16).optional(),
    /** Omit for server-side random assignment. */
    seed: z.number().int().optional(),
    /** @default 28 */
    steps: z.number().int().min(1).max(100).optional(),
    /** @default 5 */
    scale: z.number().min(0).max(30).optional(),
    /** @default 0 */
    cfgRescale: z.number().min(0).max(1).optional(),
    /** @default 1 */
    uncondScale: z.number().min(0).max(10).optional(),
    /** @default "k_euler_ancestral" {@link SAMPLERS} */
    sampler: z.string().optional(),
    /** @default "native" {@link NOISE_SCHEDULES} */
    noiseSchedule: z.string().optional(),
    /** @default 0 */
    ucPreset: z.number().int().min(0).max(7).optional(),
    /** @default 0.6 */
    strength: z.number().min(0).max(1).optional(),
    /** @default 0 */
    noise: z.number().min(0).max(1).optional(),
    /** @default true */
    qualityToggle: z.boolean().optional(),
    /** @default false */
    autoSmea: z.boolean().optional(),
    /** @default false */
    sm: z.boolean().optional(),
    /** @default false */
    smDyn: z.boolean().optional(),
    /** @default false */
    decrisper: z.boolean().optional(),
    /** @default false */
    preferBrownian: z.boolean().optional(),
    /** @default false */
    addOriginal: z.boolean().optional(),
    /** @default false */
    legacyV3: z.boolean().optional(),
    /** @default false */
    legacyUc: z.boolean().optional(),
    /** @default false */
    varietyPlus: z.boolean().optional(),
    /** @default true */
    normalizeVibes: z.boolean().optional(),
    /** @default false */
    useCoords: z.boolean().optional(),
    /** @default false */
    useOrder: z.boolean().optional(),
    /** @default "png" (API default) */
    imageFormat: ImageFormatSchema.optional(),
    /** When set, enables streaming response. */
    stream: StreamingTypeSchema.optional(),
    /** Region-controlled character prompts. */
    characters: z.array(CharacterPromptSchema).optional(),
    /** Extra API parameters forwarded as-is (advanced use). */
    extraParameters: z.record(z.string(), z.unknown()).optional(),
});

// ── Individual action schemas ──

/** Text-to-image generation: no image input required */
export const GenerateActionSchema = GenerateInputBaseSchema.extend({
    action: z.literal("generate"),
});

/** Image-to-image generation: requires input image */
export const Img2ImgActionSchema = GenerateInputBaseSchema.extend({
    action: z.literal("img2img"),
    image: z.instanceof(Uint8Array),
    mask: z.instanceof(Uint8Array).optional(),
});

/** Infill (inpainting): requires image + mask */
export const InfillActionSchema = GenerateInputBaseSchema.extend({
    action: z.literal("infill"),
    image: z.instanceof(Uint8Array),
    mask: z.instanceof(Uint8Array),
});

// ── Discriminated union for all generate inputs ──

/** Discriminated union: action field selects the schema */
export const GenerateInputSchema = z.discriminatedUnion("action", [
    GenerateActionSchema,
    Img2ImgActionSchema,
    InfillActionSchema,
]);

// ── Upscale input ──

/** Image upscaling input */
export const UpscaleInputSchema = z.object({
    image: z.instanceof(Uint8Array),
    /** @default 2 */
    scale: z.number().optional(),
    /** @default "nai-diffusion-4-5-full" */
    model: z.string().optional(),
});

// ── Augment / Director Tools input ──

/** Image augmentation / Director Tools input */
export const AugmentInputSchema = z.object({
    reqType: z.string(),
    image: z.instanceof(Uint8Array),
    prompt: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    defry: z.number().int().optional(),
});

// ── Encode Vibe input ──

/** Vibe encoding input: extracts "vibe" from a reference image */
export const EncodeVibeInputSchema = z.object({
    image: z.instanceof(Uint8Array),
    /** @default "nai-diffusion-4-5-curated" */
    model: z.string(),
    /** @default 0.5 */
    informationExtracted: z.number().min(0).max(1),
    cropToMask: z.boolean().optional(),
    focusSeed: z.number().int().optional(),
    infoExtractSeed: z.number().int().optional(),
    mask: z.instanceof(Uint8Array).optional(),
});

// ── Types exported from schemas ──

export type GenerateParamsInput = z.input<typeof GenerateInputSchema>;
