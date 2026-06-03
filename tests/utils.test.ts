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
    timingSafeEqual,
} from "../src/utils";

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
        expect(result[0]!.dataUrl).toBe("data:image/png;base64,abc123");
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
});
