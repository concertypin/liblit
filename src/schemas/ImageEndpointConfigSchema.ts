import { z } from "zod";

/** Validates `NovelAIConfig`. All fields optional — applies in dev mode. */
export const NovelAIConfigSchema = z.object({
    /** NovelAI API token. Falls back to `import.meta.env.NOVELAI_KEY`. */
    token: z.string().optional(),
    /** Base URL (default "https://image.novelai.net") */
    baseUrl: z.string().optional(),
    /** Request timeout in ms (default 120000) */
    timeoutMs: z.number().int().positive().optional(),
});
