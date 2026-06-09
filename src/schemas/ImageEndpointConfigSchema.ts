import { z } from "zod";

export const NovelAIConfigSchema = z.object({
    token: z.string().optional(),
    baseUrl: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
});
