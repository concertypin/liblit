import { z } from "zod";

export const CharacterPromptSchema = z.object({
    id: z.string(),
    prompt: z.string(),
    negative: z.string(),
    x: z.number(),
    y: z.number(),
});

export const GenerateParamsSchema = z.object({
    model: z.string().min(1),
    action: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    samples: z.number().int().min(1).max(16),
    seed: z.number().int(),
    steps: z.number().int().min(1).max(100),
    scale: z.number().min(0).max(30),
    cfg_rescale: z.number().min(0).max(1),
    uncond_scale: z.number().min(0).max(10),
    sampler: z.string(),
    noise_schedule: z.string(),
    ucPreset: z.number().int().min(0).max(7),
    strength: z.number().min(0).max(1),
    noise: z.number().min(0).max(1),
    qualityToggle: z.boolean(),
    autoSmea: z.boolean(),
    sm: z.boolean(),
    sm_dyn: z.boolean(),
    decrisper: z.boolean(),
    preferBrownian: z.boolean(),
    addOriginal: z.boolean(),
    legacyV3: z.boolean(),
    legacyUc: z.boolean(),
    varietyPlus: z.boolean(),
    normalizeVibes: z.boolean(),
    useCoords: z.boolean(),
    useOrder: z.boolean(),
    prompt: z.string(),
    negativePrompt: z.string(),
    characters: z.array(CharacterPromptSchema).optional(),
    extraParameters: z.record(z.string(), z.unknown()).optional(),
    endpointOverride: z.string().optional(),
});

export type GenerateParamsInput = z.input<typeof GenerateParamsSchema>;
