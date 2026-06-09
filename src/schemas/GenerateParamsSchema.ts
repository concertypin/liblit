import { z } from "zod";

// ── Basic enum schemas ──

export const ImageFormatSchema = z.enum(["png", "webp"]);
export const StreamingTypeSchema = z.enum(["msgpack", "sse"]);

// ── Character prompt ──

export const CharacterPromptSchema = z.object({
    id: z.string(),
    prompt: z.string(),
    negative: z.string(),
    x: z.number(),
    y: z.number(),
});

// ── Generate input base (shared fields) ──

const GenerateInputBaseSchema = z.object({
    model: z.string().min(1),
    prompt: z.string(),
    negativePrompt: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    samples: z.number().int().min(1).max(16).optional(),
    seed: z.number().int().optional(),
    steps: z.number().int().min(1).max(100).optional(),
    scale: z.number().min(0).max(30).optional(),
    cfgRescale: z.number().min(0).max(1).optional(),
    uncondScale: z.number().min(0).max(10).optional(),
    sampler: z.string().optional(),
    noiseSchedule: z.string().optional(),
    ucPreset: z.number().int().min(0).max(7).optional(),
    strength: z.number().min(0).max(1).optional(),
    noise: z.number().min(0).max(1).optional(),
    qualityToggle: z.boolean().optional(),
    autoSmea: z.boolean().optional(),
    sm: z.boolean().optional(),
    smDyn: z.boolean().optional(),
    decrisper: z.boolean().optional(),
    preferBrownian: z.boolean().optional(),
    addOriginal: z.boolean().optional(),
    legacyV3: z.boolean().optional(),
    legacyUc: z.boolean().optional(),
    varietyPlus: z.boolean().optional(),
    normalizeVibes: z.boolean().optional(),
    useCoords: z.boolean().optional(),
    useOrder: z.boolean().optional(),
    imageFormat: ImageFormatSchema.optional(),
    stream: StreamingTypeSchema.optional(),
    characters: z.array(CharacterPromptSchema).optional(),
    extraParameters: z.record(z.string(), z.unknown()).optional(),
});

// ── Individual action schemas ──

export const GenerateActionSchema = GenerateInputBaseSchema.extend({
    action: z.literal("generate"),
});

export const Img2ImgActionSchema = GenerateInputBaseSchema.extend({
    action: z.literal("img2img"),
    image: z.instanceof(Uint8Array),
    mask: z.instanceof(Uint8Array).optional(),
});

export const InfillActionSchema = GenerateInputBaseSchema.extend({
    action: z.literal("infill"),
    image: z.instanceof(Uint8Array),
    mask: z.instanceof(Uint8Array),
});

// ── Discriminated union for all generate inputs ──

export const GenerateInputSchema = z.discriminatedUnion("action", [
    GenerateActionSchema,
    Img2ImgActionSchema,
    InfillActionSchema,
]);

// ── Upscale input ──

export const UpscaleInputSchema = z.object({
    image: z.instanceof(Uint8Array),
    scale: z.number().optional(),
    model: z.string().optional(),
});

// ── Augment / Director Tools input ──

export const AugmentInputSchema = z.object({
    reqType: z.string(),
    image: z.instanceof(Uint8Array),
    prompt: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    defry: z.number().int().optional(),
});

// ── Encode Vibe input ──

export const EncodeVibeInputSchema = z.object({
    image: z.instanceof(Uint8Array),
    model: z.string(),
    informationExtracted: z.number().min(0).max(1),
    cropToMask: z.boolean().optional(),
    focusSeed: z.number().int().optional(),
    infoExtractSeed: z.number().int().optional(),
    mask: z.instanceof(Uint8Array).optional(),
});

// ── Types exported from schemas ──

export type GenerateParamsInput = z.input<typeof GenerateInputSchema>;
