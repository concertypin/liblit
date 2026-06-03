import { z } from "zod";

export const ImageEndpointConfigSchema = z.object({
    baseUrl: z.url("baseUrl must be a valid URL"),
    token: z.string(),
    authScheme: z.string().default("Bearer"),
    timeoutMs: z.number().int().positive().default(120_000),
});
