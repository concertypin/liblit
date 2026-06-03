import type { z } from "zod";

/**
 * Zod validation wrapper that only runs in dev builds.
 *
 * In production (import.meta.env.PROD === true), Vite/rolldown
 * tree-shakes the entire zod branch — zero runtime cost.
 *
 * @param schema - Zod schema to validate against
 * @param data - Raw input data
 * @returns Validated data (dev) or passthrough data (prod)
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
    if (import.meta.env.DEV) {
        return schema.parse(data);
    }
    return data as T;
}
