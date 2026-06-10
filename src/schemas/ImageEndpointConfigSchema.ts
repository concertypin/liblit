import { z } from "zod";

/** Validates `NovelAIConfig`. All fields optional — applies in dev mode. */
export const NovelAIConfigSchema = z.object({
    /** @default import.meta.env.NOVELAI_KEY */
    token: z.string().optional(),
    /** @default "https://image.novelai.net" */
    baseUrl: z.string().optional(),
    /** @default 120000 */
    timeoutMs: z.number().int().positive().optional(),
});
