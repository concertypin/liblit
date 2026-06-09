import { describe, it, expect } from "vitest";
import {
    toFullUrl,
    authHeader,
    bytesToDataUrl,
    inferMime,
    inferImageMimeFromBytes,
    looksLikeZip,
    collectImagesFromJson,
    normalizeUpstream,
    normalizeZip,
    timingSafeEqual,
} from "../src/utils";
import { zipSync } from "fflate";

describe("toFullUrl", () => {
    it("appends suffix to base", () => {
        expect(
            toFullUrl("https://image.novelai.net", "/ai/generate-image")
        ).toBe("https://image.novelai.net/ai/generate-image");
    });

    it("normalizes trailing slash on base", () => {
        expect(
            toFullUrl("https://image.novelai.net/", "ai/generate-image")
        ).toBe("https://image.novelai.net/ai/generate-image");
    });

    it("strips leading slash from suffix", () => {
        expect(
            toFullUrl("https://image.novelai.net", "//ai/generate-image")
        ).toBe("https://image.novelai.net/ai/generate-image");
    });

    it("returns absolute suffix as-is", () => {
        expect(toFullUrl("https://foo.com", "https://other.com/path")).toBe(
            "https://other.com/path"
        );
    });

    it("throws on empty base", () => {
        expect(() => toFullUrl("", "/path")).toThrow("Base URL is empty");
    });
});

describe("authHeader", () => {
    it("returns Bearer scheme by default", () => {
        expect(authHeader("mytoken")).toEqual({
            Authorization: "Bearer mytoken",
        });
    });

    it("returns custom scheme", () => {
        expect(authHeader("mytoken", "Token")).toEqual({
            Authorization: "Token mytoken",
        });
    });

    it("passes through pre-formatted authorization", () => {
        expect(authHeader("Bearer already-done")).toEqual({
            Authorization: "Bearer already-done",
        });
    });

    it("returns empty for empty token", () => {
        expect(authHeader("")).toEqual({});
    });
});

describe("bytesToDataUrl", () => {
    it("converts bytes to data URL", () => {
        const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
        const result = bytesToDataUrl(bytes);
        expect(result).toMatch(/^data:image\/png;base64,/);
    });
});

describe("inferMime", () => {
    it("detects png", () => expect(inferMime("foo.png")).toBe("image/png"));
    it("detects jpg", () => expect(inferMime("foo.jpg")).toBe("image/jpeg"));
    it("detects jpeg", () => expect(inferMime("foo.jpeg")).toBe("image/jpeg"));
    it("detects webp", () => expect(inferMime("foo.webp")).toBe("image/webp"));
    it("detects gif", () => expect(inferMime("foo.gif")).toBe("image/gif"));
    it("falls back for unknown", () =>
        expect(inferMime("foo.bin")).toBe("application/octet-stream"));
});

describe("inferImageMimeFromBytes", () => {
    it("detects PNG from magic bytes", () => {
        const png = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        expect(inferImageMimeFromBytes(png)).toBe("image/png");
    });

    it("detects JPEG from magic bytes", () => {
        const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
        expect(inferImageMimeFromBytes(jpeg)).toBe("image/jpeg");
    });

    it("returns empty for unknown bytes", () => {
        const unknown = new Uint8Array([0x00, 0x01, 0x02]);
        expect(inferImageMimeFromBytes(unknown)).toBe("");
    });
});

describe("looksLikeZip", () => {
    it("detects PK zip prefix", () => {
        const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
        expect(looksLikeZip(zip, "")).toBe(true);
    });

    it("detects zip from content-type", () => {
        const not = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        expect(looksLikeZip(not, 'filename="images.zip"')).toBe(true);
    });

    it("rejects non-zip", () => {
        const not = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        expect(looksLikeZip(not, "text/plain")).toBe(false);
    });
});

describe("collectImagesFromJson", () => {
    it("finds data URLs in strings", () => {
        const result = collectImagesFromJson("data:image/png;base64,abc123");
        expect(result).toHaveLength(1);
        expect(result[0]!.bytes).toBeInstanceOf(Uint8Array);
        expect(result[0]!.mime).toBe("image/png");
    });

    it("finds b64_json key", () => {
        const result = collectImagesFromJson({ b64_json: "abc==" });
        expect(result).toHaveLength(1);
    });

    it("finds URLs", () => {
        const result = collectImagesFromJson("https://example.com/img.png");
        expect(result).toHaveLength(1);
        expect(result[0]!.url).toBe("https://example.com/img.png");
    });

    it("recurses into known keys", () => {
        const result = collectImagesFromJson({
            data: { images: "data:image/png;base64,x" },
        });
        expect(result).toHaveLength(1);
    });

    it("limits to 64 entries", () => {
        const arr = Array.from(
            { length: 100 },
            (_, i) => `data:image/png;base64,${i}`
        );
        const result = collectImagesFromJson(arr);
        expect(result.length).toBe(64);
    });
});

describe("normalizeUpstream", () => {
    it("parses JSON response", () => {
        const bytes = new TextEncoder().encode(JSON.stringify({ foo: "bar" }));
        const result = normalizeUpstream(bytes, "application/json");
        expect(result.kind).toBe("json");
        expect(result.raw).toEqual({ foo: "bar" });
    });

    it("parses image response", () => {
        const png = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
            0x0d,
        ]);
        const result = normalizeUpstream(png, "image/png");
        expect(result.kind).toBe("image");
        expect(result.images).toHaveLength(1);
        expect(result.images[0]!.mime).toBe("image/png");
    });

    it("returns binary fallback for unknown content", () => {
        const bytes = new TextEncoder().encode("hello world");
        const result = normalizeUpstream(bytes, "application/octet-stream");
        expect(result.kind).toBe("binary");
        expect(result.text).toBe("hello world");
    });
});

describe("authHeader (edge cases)", () => {
    it("returns empty for whitespace-only token", () => {
        expect(authHeader("   ")).toEqual({});
    });

    it("passes through Bearer prefix", () => {
        expect(authHeader("Bearer mytoken")).toEqual({
            Authorization: "Bearer mytoken",
        });
    });

    it("passes through Token prefix", () => {
        expect(authHeader("Token mytoken")).toEqual({
            Authorization: "Token mytoken",
        });
    });

    it("passes through Basic prefix", () => {
        expect(authHeader("Basic dXNlcjpwYXNz")).toEqual({
            Authorization: "Basic dXNlcjpwYXNz",
        });
    });

    it("uses custom scheme with no scheme in token", () => {
        expect(authHeader("mytoken", "Custom")).toEqual({
            Authorization: "Custom mytoken",
        });
    });

    it("handles empty scheme fallback to Bearer", () => {
        expect(authHeader("mytoken", "")).toEqual({
            Authorization: "Bearer mytoken",
        });
    });

    it("handles undefined scheme fallback to Bearer", () => {
        expect(authHeader("mytoken", undefined as unknown as string)).toEqual({
            Authorization: "Bearer mytoken",
        });
    });
});

describe("toFullUrl (edge cases)", () => {
    it("handles empty suffix path", () => {
        const result = toFullUrl("https://example.com", "");
        expect(result).toBe("https://example.com/");
    });

    it("handles absolute URL as suffix", () => {
        expect(toFullUrl("https://foo.com", "https://bar.com/path")).toBe(
            "https://bar.com/path"
        );
    });

    it("handles http:// prefix in suffix", () => {
        expect(toFullUrl("https://foo.com", "http://insecure.com/api")).toBe(
            "http://insecure.com/api"
        );
    });

    it("throws on empty base URL string", () => {
        expect(() => toFullUrl("", "/path")).toThrow("Base URL is empty");
    });

    it("throws on whitespace-only base URL", () => {
        expect(() => toFullUrl("   ", "/path")).toThrow("Base URL is empty");
    });
});

describe("bytesToDataUrl (edge cases)", () => {
    it("uses custom mime type", () => {
        const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
        const result = bytesToDataUrl(bytes, "image/jpeg");
        expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it("encodes 2-byte input (padding)", () => {
        const bytes = new Uint8Array([0x41, 0x42]);
        const result = bytesToDataUrl(bytes, "text/plain");
        expect(result).toMatch(/^data:text\/plain;base64,/);
    });

    it("encodes 1-byte input (double padding)", () => {
        const bytes = new Uint8Array([0x41]);
        const result = bytesToDataUrl(bytes, "text/plain");
        expect(result).toMatch(/^data:text\/plain;base64,/);
    });

    it("encodes exactly 3-byte input (no padding)", () => {
        const bytes = new Uint8Array([0x41, 0x42, 0x43]);
        const result = bytesToDataUrl(bytes, "text/plain");
        expect(result).toMatch(/^data:text\/plain;base64,/);
    });
});

describe("inferMime (edge cases)", () => {
    it("returns custom fallback for unknown extension", () => {
        expect(inferMime("file.xyz", "custom/type")).toBe("custom/type");
    });

    it("defaults to application/octet-stream for unknown extension", () => {
        expect(inferMime("file.bin")).toBe("application/octet-stream");
    });

    it("handles uppercase extension", () => {
        expect(inferMime("photo.PNG")).toBe("image/png");
        expect(inferMime("photo.JPG")).toBe("image/jpeg");
    });
});

describe("inferImageMimeFromBytes (edge cases)", () => {
    it("detects WebP from magic bytes", () => {
        const webp = new Uint8Array([
            // RIFF header (4 bytes) + file size (4 bytes) + WEBP (4 bytes)
            0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
            0x50,
        ]);
        expect(inferImageMimeFromBytes(webp)).toBe("image/webp");
    });

    it("returns empty for too-short bytes", () => {
        expect(inferImageMimeFromBytes(new Uint8Array([0x89, 0x50]))).toBe("");
    });

    it("returns empty for empty array", () => {
        expect(inferImageMimeFromBytes(new Uint8Array([]))).toBe("");
    });
});

describe("looksLikeZip (edge cases)", () => {
    it("detects PK\\x05\\x06 (end of central directory)", () => {
        const zip = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
        expect(looksLikeZip(zip, "")).toBe(true);
    });

    it("detects PK\\x07\\x08 (spanning marker)", () => {
        const zip = new Uint8Array([0x50, 0x4b, 0x07, 0x08]);
        expect(looksLikeZip(zip, "")).toBe(true);
    });

    it("rejects random bytes", () => {
        const not = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        expect(looksLikeZip(not, "")).toBe(false);
    });
});

describe("collectImagesFromJson (edge cases)", () => {
    it("handles null input", () => {
        expect(collectImagesFromJson(null)).toEqual([]);
    });

    it("handles undefined input", () => {
        expect(collectImagesFromJson(undefined)).toEqual([]);
    });

    it("handles falsy values", () => {
        expect(collectImagesFromJson(0)).toEqual([]);
        expect(collectImagesFromJson(false)).toEqual([]);
        expect(collectImagesFromJson("")).toEqual([]);
    });

    it("finds short base64 string (< 100 chars) is NOT treated as image", () => {
        const short = "AAAA"; // only 4 chars, not enough
        expect(collectImagesFromJson(short)).toEqual([]);
    });

    it("finds base64 string >= 100 chars as image", () => {
        const long = "A".repeat(100);
        const result = collectImagesFromJson(long);
        expect(result).toHaveLength(1);
        expect(result[0]!.bytes).toBeInstanceOf(Uint8Array);
        expect(result[0]!.mime).toBe("image/png");
    });

    it("handles objects with .url key", () => {
        const result = collectImagesFromJson({
            url: "https://example.com/img.png",
        });
        expect(result).toHaveLength(1);
        expect(result[0]!.url).toBe("https://example.com/img.png");
    });

    it("handles objects with .image key", () => {
        const result = collectImagesFromJson({
            image: "data:image/png;base64,abc123",
        });
        expect(result).toHaveLength(1);
        expect(result[0]!.bytes).toBeInstanceOf(Uint8Array);
        expect(result[0]!.mime).toBe("image/png");
    });

    it("handles all known collection keys", () => {
        const img = "data:image/png;base64,x";
        const result = collectImagesFromJson({
            images: img,
            data: img,
            output: img,
            artifacts: img,
            result: img,
        });
        expect(result).toHaveLength(5);
    });

    it("handles nested arrays within known keys", () => {
        const result = collectImagesFromJson({
            images: ["https://example.com/1.png", "https://example.com/2.png"],
        });
        expect(result).toHaveLength(2);
    });

    it("skips non-string values in known keys", () => {
        const result = collectImagesFromJson({
            images: 123,
            data: null,
            output: true,
        });
        expect(result).toEqual([]);
    });

    it("handles base64 string with length not divisible by 4", () => {
        // Not a multiple of 4, should not be treated as base64 image
        const odd = "A".repeat(101);
        expect(collectImagesFromJson(odd)).toEqual([]);
    });
});

describe("normalizeUpstream (extended)", () => {
    it("parses image response detected by magic bytes", () => {
        // Content-type is application/octet-stream, but magic bytes detect PNG
        const png = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
            0x0d,
        ]);
        const result = normalizeUpstream(png, "application/octet-stream");
        expect(result.kind).toBe("image");
        expect(result.images[0]!.mime).toBe("image/png");
    });

    it("parses image response with content-type containing parameters", () => {
        const png = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        const result = normalizeUpstream(png, "image/png; charset=utf-8");
        expect(result.kind).toBe("image");
        expect(result.images[0]!.mime).toBe("image/png");
    });

    it("parses zip response detected by magic bytes", () => {
        const files = {
            "image.png": new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        };
        const zipBytes = zipSync(files);
        const result = normalizeUpstream(zipBytes, "application/octet-stream");
        expect(result.kind).toBe("zip");
    });

    it("parses zip response by content-type", () => {
        const files = {
            "image.png": new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        };
        const zipBytes = zipSync(files);
        const result = normalizeUpstream(zipBytes, "application/zip");
        expect(result.kind).toBe("zip");
    });

    it("returns binary fallback for unknown content type and bytes", () => {
        const bytes = new TextEncoder().encode("random data");
        const result = normalizeUpstream(bytes, "application/custom");
        expect(result.kind).toBe("binary");
        expect(result.text).toBe("random data");
    });

    it("returns headers in binary response", () => {
        const bytes = new TextEncoder().encode("data");
        const headers = { "x-request-id": "abc123" };
        const result = normalizeUpstream(bytes, "text/plain", headers);
        expect(result.headers).toEqual(headers);
    });

    it("parses JSON with deep image extraction", () => {
        const json = JSON.stringify({
            images: ["data:image/png;base64,abc"],
        });
        const result = normalizeUpstream(
            new TextEncoder().encode(json),
            "application/json"
        );
        expect(result.kind).toBe("json");
        expect(result.images.length).toBeGreaterThanOrEqual(1);
    });
});

describe("normalizeZip", () => {
    it("extracts images and metadata from zip", () => {
        const files = {
            "image.png": new Uint8Array([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
            ]),
            "meta.json": new TextEncoder().encode(JSON.stringify({ seed: 42 })),
            "info.txt": new TextEncoder().encode("some text"),
        };
        const zipBytes = zipSync(files);
        const result = normalizeZip(zipBytes, "application/zip");
        expect(result.kind).toBe("zip");
        expect(result.images).toHaveLength(1);
        expect(result.images[0]!.name).toBe("image.png");
        expect(result.images[0]!.mime).toBe("image/png");
        expect(result.metadata!["meta.json"]).toEqual({ seed: 42 });
        expect(result.metadata!["info.txt"]).toBe("some text");
    });

    it("handles invalid JSON in .json file gracefully", () => {
        const files = {
            "broken.json": new TextEncoder().encode("{invalid json}"),
        };
        const zipBytes = zipSync(files);
        const result = normalizeZip(zipBytes, "application/zip");
        expect(result.kind).toBe("zip");
        expect(result.metadata!["broken.json"]).toBe("{invalid json}");
    });

    it("handles non-image, non-json, non-txt files (ignored)", () => {
        const files = {
            "data.bin": new Uint8Array([0x00, 0x01, 0x02]),
        };
        const zipBytes = zipSync(files);
        const result = normalizeZip(zipBytes, "application/zip");
        expect(result.kind).toBe("zip");
        expect(result.images).toHaveLength(0);
        expect(Object.keys(result.metadata!)).toHaveLength(0);
    });

    it("handles jpeg file in zip", () => {
        const files = {
            "photo.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        };
        const zipBytes = zipSync(files);
        const result = normalizeZip(zipBytes, "application/zip");
        expect(result.images).toHaveLength(1);
        expect(result.images[0]!.mime).toBe("image/jpeg");
    });

    it("handles webp file in zip", () => {
        const files = {
            "image.webp": new Uint8Array([
                0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45,
                0x42, 0x50,
            ]),
        };
        const zipBytes = zipSync(files);
        const result = normalizeZip(zipBytes, "application/zip");
        expect(result.images).toHaveLength(1);
        expect(result.images[0]!.mime).toBe("image/webp");
    });
});

describe("timingSafeEqual", () => {
    it("returns true for equal strings", () => {
        expect(timingSafeEqual("abc", "abc")).toBe(true);
    });

    it("returns false for different strings", () => {
        expect(timingSafeEqual("abc", "abd")).toBe(false);
    });

    it("returns false for different lengths", () => {
        expect(timingSafeEqual("abc", "abcd")).toBe(false);
    });

    it("returns true for empty strings", () => {
        expect(timingSafeEqual("", "")).toBe(true);
    });

    it("returns false comparing empty with non-empty", () => {
        expect(timingSafeEqual("", "a")).toBe(false);
    });

    it("handles unicode strings", () => {
        expect(timingSafeEqual("안녕하세요", "안녕하세요")).toBe(true);
        expect(timingSafeEqual("안녕하세요", "안녕하세욤")).toBe(false);
    });
});
