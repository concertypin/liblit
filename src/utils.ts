import { unzipSync } from "fflate";
import type { ImageResult, GenerationResult } from "./types";

// ── URL helpers ──

export function toFullUrl(baseUrl: string, suffix: string): string {
    const raw = String(suffix || "");
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = String(baseUrl || "").trim();
    if (!base) throw new Error("Base URL is empty.");
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return new URL(raw.replace(/^\/+/, ""), normalizedBase).toString();
}

export function authHeader(
    token: string,
    scheme = "Bearer"
): Record<string, string> {
    const clean = String(token || "").trim();
    if (!clean) return {};
    if (/^(bearer|token|basic)\s+/i.test(clean))
        return { Authorization: clean };
    const prefix = String(scheme || "Bearer").trim();
    return { Authorization: `${prefix} ${clean}`.trim() };
}

// ── Binary helpers ──

export function encodeBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
}

export function decodeBase64(str: string): Uint8Array {
    // atob() requires strictly valid base64 — strip existing padding, fix length
    const body = str.replace(/=+$/, "");
    const rest = body.length % 4;
    // remainder 1 means non-integer bytes (invalid base64) — drop the extraneous char
    const clean = rest === 1 ? body.slice(0, -1) : body;
    const padded = rest === 2 ? `${clean}==` : rest === 3 ? `${clean}=` : clean;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function bytesToDataUrl(bytes: Uint8Array, mime = "image/png"): string {
    return `data:${mime};base64,${encodeBase64(bytes)}`;
}

export function inferMime(
    fileName: string,
    fallback = "application/octet-stream"
): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    return fallback;
}

export function inferImageMimeFromBytes(bytes: Uint8Array): string {
    if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
    ) {
        return "image/png";
    }
    if (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
    ) {
        return "image/jpeg";
    }
    if (
        bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    ) {
        return "image/webp";
    }
    return "";
}

export function looksLikeZip(bytes: Uint8Array, contentType: string): boolean {
    if (
        bytes.length >= 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
        (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
    ) {
        return true;
    }
    return /filename=.*\.zip/i.test(contentType);
}

// ── Parse base64 data URL ──

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
    const comma = dataUrl.indexOf(",");
    const header = comma > 0 ? dataUrl.slice(0, comma) : "";
    const mime = header?.match(/data:([^;]+)/)?.[1] ?? "image/png";
    const b64 = comma > 0 ? dataUrl.slice(comma + 1) : dataUrl;
    return { mime, bytes: decodeBase64(b64) };
}

// ── Image collection from JSON ──

export function collectImagesFromJson(
    value: unknown,
    images: ImageResult[] = []
): ImageResult[] {
    if (!value || images.length >= 64) return images;
    if (typeof value === "string") {
        if (value.startsWith("data:image/")) {
            const { mime, bytes } = parseDataUrl(value);
            images.push({ bytes, mime });
        } else if (
            /^[A-Za-z0-9+/=]{100,}$/.test(value) &&
            value.length % 4 === 0
        ) {
            const bytes = decodeBase64(value);
            images.push({ bytes, mime: "image/png" });
        } else if (/^https?:\/\//i.test(value)) {
            images.push({ url: value, mime: "image/png" });
        }
        return images;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectImagesFromJson(item, images);
        return images;
    }
    if (typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>;
        if (typeof obj.b64_json === "string") {
            const bytes = decodeBase64(obj.b64_json);
            images.push({ bytes, mime: "image/png" });
        }
        if (typeof obj.image === "string")
            collectImagesFromJson(obj.image, images);
        if (typeof obj.url === "string") collectImagesFromJson(obj.url, images);
        for (const key of ["images", "data", "output", "artifacts", "result"]) {
            if (key in obj) collectImagesFromJson(obj[key], images);
        }
    }
    return images;
}

// ── Response normalization ──

export function normalizeZip(
    bytes: Uint8Array,
    contentType: string,
    headers?: Record<string, string>
): GenerationResult {
    const files = unzipSync(bytes);
    const images: ImageResult[] = [];
    const metadata: Record<string, unknown> = {};
    for (const [name, data] of Object.entries(files)) {
        const mime = inferMime(name);
        if (mime.startsWith("image/")) {
            images.push({ name, mime, bytes: data });
        } else if (name.endsWith(".json")) {
            try {
                metadata[name] = JSON.parse(new TextDecoder().decode(data));
            } catch {
                metadata[name] = new TextDecoder().decode(data);
            }
        } else if (name.endsWith(".txt")) {
            metadata[name] = new TextDecoder().decode(data);
        }
    }
    return {
        kind: "zip",
        contentType,
        images,
        metadata,
        headers: headers ?? {},
    };
}

export function normalizeUpstream(
    bytes: Uint8Array,
    contentType: string,
    headers?: Record<string, string>
): GenerationResult {
    const lowerType = contentType.toLowerCase();

    if (lowerType.includes("application/json") || lowerType.includes("+json")) {
        const json = JSON.parse(new TextDecoder().decode(bytes)) as Record<
            string,
            unknown
        >;
        return {
            kind: "json",
            contentType,
            images: collectImagesFromJson(json),
            raw: json,
            headers: headers ?? {},
        };
    }

    if (lowerType.includes("zip") || looksLikeZip(bytes, contentType)) {
        return normalizeZip(bytes, contentType, headers);
    }

    const inferredImageMime = inferImageMimeFromBytes(bytes);
    if (lowerType.startsWith("image/") || inferredImageMime) {
        const mime = lowerType.startsWith("image/")
            ? contentType.split(";")[0]
            : inferredImageMime;
        return {
            kind: "image",
            contentType,
            images: [{ bytes, mime: mime! }],
            headers: headers ?? {},
        };
    }

    return {
        kind: "binary",
        contentType,
        images: [],
        text: new TextDecoder().decode(bytes),
        headers: headers ?? {},
    };
}

// ── Timing-safe comparison ──
export function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const encodedA = new TextEncoder().encode(a);
    const encodedB = new TextEncoder().encode(b);
    let result = 0;
    for (let i = 0; i < encodedA.length; i++) {
        result |= encodedA[i]! ^ encodedB[i]!;
    }
    return result === 0;
}
