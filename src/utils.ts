import { unzipSync } from "fflate";
import type { ImageEntry, UpstreamResult } from "./types";

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

function encodeBase64(bytes: Uint8Array): string {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    const len = bytes.length;
    for (let i = 0; i < len; i += 3) {
        const b0 = bytes[i]!;
        const b1 = i + 1 < len ? bytes[i + 1]! : 0;
        const b2 = i + 2 < len ? bytes[i + 2]! : 0;
        result += chars[b0 >> 2];
        result += chars[((b0 & 3) << 4) | (b1 >> 4)];
        result += chars[((b1 & 15) << 2) | (b2 >> 6)];
        result += chars[b2 & 63];
    }
    const pad = bytes.length % 3;
    if (pad === 1) result = `${result.slice(0, -2)}==`;
    else if (pad === 2) result = `${result.slice(0, -1)}=`;
    return result;
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

// ── Image collection from JSON ──

export function collectImagesFromJson(
    value: unknown,
    images: ImageEntry[] = []
): ImageEntry[] {
    if (!value || images.length >= 64) return images;
    if (typeof value === "string") {
        if (value.startsWith("data:image/")) {
            const mime = value.slice(5, value.indexOf(";"));
            images.push({ dataUrl: value, mime });
        } else if (
            /^[A-Za-z0-9+/=]{100,}$/.test(value) &&
            value.length % 4 === 0
        ) {
            images.push({
                dataUrl: `data:image/png;base64,${value}`,
                mime: "image/png",
            });
        } else if (/^https?:\/\//i.test(value)) {
            images.push({ url: value });
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
            images.push({
                dataUrl: `data:image/png;base64,${obj.b64_json}`,
                mime: "image/png",
            });
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
    contentType: string
): UpstreamResult {
    const files = unzipSync(bytes);
    const images: ImageEntry[] = [];
    const metadata: Record<string, unknown> = {};
    for (const [name, data] of Object.entries(files)) {
        const mime = inferMime(name);
        if (mime.startsWith("image/")) {
            images.push({
                name,
                mime,
                dataUrl: bytesToDataUrl(data, mime),
            });
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
    return { kind: "zip", contentType, images, metadata };
}

export function normalizeUpstream(
    bytes: Uint8Array,
    contentType: string,
    headers?: Record<string, string>
): UpstreamResult {
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
        };
    }

    if (lowerType.includes("zip") || looksLikeZip(bytes, contentType)) {
        return normalizeZip(bytes, contentType);
    }

    const inferredImageMime = inferImageMimeFromBytes(bytes);
    if (lowerType.startsWith("image/") || inferredImageMime) {
        const mime = lowerType.startsWith("image/")
            ? contentType.split(";")[0]
            : inferredImageMime;
        return {
            kind: "image",
            contentType,
            images: [{ mime, dataUrl: bytesToDataUrl(bytes, mime) }],
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
