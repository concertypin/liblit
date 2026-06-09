import type {
    NovelAIConfig,
    AnyGenerateInput,
    UpscaleInput,
    AugmentInput,
    EncodeVibeInput,
    GenerationResult,
} from "./types";
import { toFullUrl, authHeader, normalizeUpstream } from "./utils";
import { MAX_RESPONSE_BYTES } from "./constants";
import {
    validateConfig,
    validateGenerateInput,
    validateUpscaleInput,
    validateAugmentInput,
    validateEncodeVibe,
} from "./validate";
import {
    resolveConfig,
    transformGenerate,
    transformUpscale,
    transformAugment,
    transformEncodeVibe,
} from "./transform";

// ── Public option types ──

export interface RequestOptions {
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
}

// ── API endpoint paths ──

export const DEFAULT_GENERATE_PATH = "/ai/generate-image";
export const DEFAULT_UPSCALE_PATH = "/ai/upscale";
export const DEFAULT_DIRECTOR_PATH = "/ai/augment-image";
export const DEFAULT_ENCODE_VIBE_PATH = "/ai/encode-vibe";

// ── Internal: read response body as Uint8Array ──

async function readResponseBody(
    response: Response,
    maxBytes: number
): Promise<Uint8Array> {
    if (!response.body) {
        const ab = await response.arrayBuffer();
        return new Uint8Array(ab);
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
            throw new Error(
                `Response exceeded ${Math.round(maxBytes / 1024 / 1024)} MB limit.`
            );
        }
        chunks.push(value);
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}

/**
 * Low-level HTTP POST to the NovelAI API.
 * Handles auth headers, timeout, abort signals, and response normalization.
 * Used internally by all public API functions; exported for custom endpoints.
 */
export async function postJson(
    url: string,
    payload: unknown,
    headers: Record<string, string>,
    timeoutMs: number,
    options?: RequestOptions
): Promise<GenerationResult> {
    const controller = new AbortController();
    /* v8 ignore next -- timer never fires with mock responses */
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const fetchFn = options?.fetch ?? globalThis.fetch;

    try {
        const response = await fetchFn(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, image/png, image/jpeg, image/webp, application/zip, application/x-zip-compressed, */*",
                ...headers,
            },
            body: JSON.stringify(payload),
            signal: options?.signal
                ? AbortSignal.any([controller.signal, options.signal])
                : controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";
        const rawHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            rawHeaders[key] = value;
        });

        const bytes = await readResponseBody(response, MAX_RESPONSE_BYTES);

        if (!response.ok) {
            const detail =
                contentType.includes("json") || contentType.startsWith("text/")
                    ? new TextDecoder().decode(bytes).slice(0, 2000)
                    : `<${bytes.length} bytes: ${contentType || "unknown"}>`;
            const error = new Error(
                `Upstream returned ${response.status}`
            ) as Error & {
                status: number;
                detail: string;
            };
            error.status = response.status;
            error.detail = detail;
            throw error;
        }

        return normalizeUpstream(bytes, contentType, rawHeaders);
    } finally {
        clearTimeout(timer);
        controller.abort(); // cleanup anySignal listeners
    }
}

// ── New API ──

/**
 * Generate images via NovelAI.
 * @param input - Generation parameters (action, model, prompt, etc.)
 * @param config - Optional client configuration (token, baseUrl, timeout)
 * @param options - Optional fetch/signal overrides
 */
export async function generate(
    input: AnyGenerateInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult> {
    validateGenerateInput(input);
    if (config) validateConfig(config);
    const resolved = resolveConfig(config ?? {});
    const body = transformGenerate(input);
    const headers = authHeader(resolved.token);
    return postJson(
        toFullUrl(resolved.baseUrl, DEFAULT_GENERATE_PATH),
        body,
        headers,
        resolved.timeoutMs,
        options
    );
}

/**
 * Upscale an image via NovelAI.
 * @param input - Upscale parameters (image, scale, model)
 * @param config - Optional client configuration
 * @param options - Optional fetch/signal overrides
 */
export async function upscale(
    input: UpscaleInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult> {
    validateUpscaleInput(input);
    if (config) validateConfig(config);
    const resolved = resolveConfig(config ?? {});
    const body = transformUpscale(input);
    const headers = authHeader(resolved.token);
    return postJson(
        toFullUrl(resolved.baseUrl, DEFAULT_UPSCALE_PATH),
        body,
        headers,
        resolved.timeoutMs,
        options
    );
}

/**
 * Augment an image via NovelAI Director Tools.
 * @param input - Augment parameters (reqType, image, prompt, etc.)
 * @param config - Optional client configuration
 * @param options - Optional fetch/signal overrides
 */
export async function augment(
    input: AugmentInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult> {
    validateAugmentInput(input);
    if (config) validateConfig(config);
    const resolved = resolveConfig(config ?? {});
    const body = transformAugment(input);
    const headers = authHeader(resolved.token);
    return postJson(
        toFullUrl(resolved.baseUrl, DEFAULT_DIRECTOR_PATH),
        body,
        headers,
        resolved.timeoutMs,
        options
    );
}

/**
 * Encode an image to a NovelAI vibe.
 * @param input - Encode-vibe parameters (image, model, informationExtracted)
 * @param config - Optional client configuration
 * @param options - Optional fetch/signal overrides
 */
export async function encodeVibe(
    input: EncodeVibeInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult> {
    validateEncodeVibe(input);
    if (config) validateConfig(config);
    const resolved = resolveConfig(config ?? {});
    const body = transformEncodeVibe(input);
    const headers = authHeader(resolved.token);
    return postJson(
        toFullUrl(resolved.baseUrl, DEFAULT_ENCODE_VIBE_PATH),
        body,
        headers,
        resolved.timeoutMs,
        options
    );
}
