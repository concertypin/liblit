import type {
    ImageEndpointConfig,
    UpstreamResult,
    EncodeVibeRequest,
} from "./types";
import { toFullUrl, authHeader, normalizeUpstream } from "./utils";
import { MAX_RESPONSE_BYTES } from "./constants";

export interface ImageRequestBody {
    payload?: unknown;
    endpointPath?: string;
    baseUrl?: string;
    token?: string;
    authScheme?: string;
    timeoutMs?: number;
}

export interface RequestOptions {
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
}

export const DEFAULT_GENERATE_PATH = "/ai/generate-image";
export const DEFAULT_UPSCALE_PATH = "/ai/upscale";
export const DEFAULT_DIRECTOR_PATH = "/ai/augment-image";
export const DEFAULT_ENCODE_VIBE_PATH = "/ai/encode-vibe";

function resolveConfig(
    body: ImageRequestBody,
    config: ImageEndpointConfig,
    defaultPath: string
) {
    return {
        url: toFullUrl(
            body.baseUrl || config.baseUrl,
            body.endpointPath || defaultPath
        ),
        token: body.token !== undefined ? body.token : config.token,
        authScheme: body.authScheme || config.authScheme || "Bearer",
        timeoutMs: body.timeoutMs ?? config.timeoutMs ?? 120_000,
        payload: body.payload ?? {},
    };
}

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

function anySignal(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    const cleanup = () => controller.abort();
    for (const signal of signals) {
        if (signal.aborted) {
            controller.abort(signal.reason);
            return controller.signal;
        }
        signal.addEventListener(
            "abort",
            () => controller.abort(signal.reason),
            { once: true }
        );
    }
    // Also clean up when the returned signal itself aborts
    controller.signal.addEventListener("abort", cleanup, { once: true });
    return controller.signal;
}

export async function postJson(
    url: string,
    payload: unknown,
    headers: Record<string, string>,
    timeoutMs: number,
    options?: RequestOptions
): Promise<UpstreamResult> {
    const controller = new AbortController();
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
                ? anySignal([controller.signal, options.signal])
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

/** Call NovelAI image generation API. */
export async function callImageGenerate(
    config: ImageEndpointConfig,
    body: ImageRequestBody = {},
    options?: RequestOptions
): Promise<UpstreamResult> {
    const resolved = resolveConfig(body, config, DEFAULT_GENERATE_PATH);
    const headers = authHeader(resolved.token, resolved.authScheme);
    return postJson(
        resolved.url,
        resolved.payload,
        headers,
        resolved.timeoutMs,
        options
    );
}

/** Call NovelAI image upscale API. */
export async function callImageUpscale(
    config: ImageEndpointConfig,
    body: ImageRequestBody = {},
    options?: RequestOptions
): Promise<UpstreamResult> {
    const resolved = resolveConfig(body, config, DEFAULT_UPSCALE_PATH);
    const headers = authHeader(resolved.token, resolved.authScheme);
    return postJson(
        resolved.url,
        resolved.payload,
        headers,
        resolved.timeoutMs,
        options
    );
}

/** Call NovelAI director/augment API. */
export async function callImageDirector(
    config: ImageEndpointConfig,
    body: ImageRequestBody = {},
    options?: RequestOptions
): Promise<UpstreamResult> {
    const resolved = resolveConfig(body, config, DEFAULT_DIRECTOR_PATH);
    const headers = authHeader(resolved.token, resolved.authScheme);
    return postJson(
        resolved.url,
        resolved.payload,
        headers,
        resolved.timeoutMs,
        options
    );
}

/** Call NovelAI encode-vibe API. */
export async function callEncodeVibe(
    config: ImageEndpointConfig,
    payload: EncodeVibeRequest,
    options?: RequestOptions
): Promise<UpstreamResult> {
    const url = toFullUrl(config.baseUrl, DEFAULT_ENCODE_VIBE_PATH);
    const headers = authHeader(config.token, config.authScheme);
    return postJson(
        url,
        payload,
        headers,
        config.timeoutMs ?? 120_000,
        options
    );
}
