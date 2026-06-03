import { z } from "zod";

export const ImageRequestBodySchema = z.object({
    payload: z.unknown().optional(),
    endpointPath: z.string().optional(),
    baseUrl: z.url().optional(),
    token: z.string().optional(),
    authScheme: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
});
