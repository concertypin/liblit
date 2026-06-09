import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
    NovelAIConfigSchema,
    GenerateInputSchema,
    UpscaleInputSchema,
    AugmentInputSchema,
    EncodeVibeInputSchema,
    ImageFormatSchema,
    StreamingTypeSchema,
    CharacterPromptSchema,
} from "../src/schemas";

// ── NovelAIConfigSchema ──

describe("NovelAIConfigSchema", () => {
    it("accepts empty config (all optional)", () => {
        const result = NovelAIConfigSchema.parse({});
        expect(result).toEqual({});
    });

    it("accepts full config", () => {
        const result = NovelAIConfigSchema.parse({
            token: "my-token",
            baseUrl: "https://custom.example.com",
            timeoutMs: 30000,
        });
        expect(result.token).toBe("my-token");
        expect(result.baseUrl).toBe("https://custom.example.com");
        expect(result.timeoutMs).toBe(30000);
    });

    it("rejects negative timeoutMs", () => {
        expect(() => NovelAIConfigSchema.parse({ timeoutMs: -1 })).toThrow(
            z.ZodError
        );
    });

    it("rejects zero timeoutMs", () => {
        expect(() => NovelAIConfigSchema.parse({ timeoutMs: 0 })).toThrow(
            z.ZodError
        );
    });
});

// ── GenerateInputSchema ──

const GENERATE_BASE = {
    model: "nai-diffusion-4-5-full",
    prompt: "1girl, solo",
};

describe("GenerateInputSchema", () => {
    it("accepts generate action with minimal fields", () => {
        const result = GenerateInputSchema.parse({
            ...GENERATE_BASE,
            action: "generate",
        });
        expect(result.action).toBe("generate");
        expect(result.model).toBe("nai-diffusion-4-5-full");
    });

    it("accepts img2img action with Uint8Array image", () => {
        const result = GenerateInputSchema.parse({
            ...GENERATE_BASE,
            action: "img2img",
            image: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        });
        expect(result.action).toBe("img2img");
        expect((result as Record<string, unknown>).image).toBeInstanceOf(
            Uint8Array
        );
    });

    it("accepts infill action with Uint8Array image and mask", () => {
        const result = GenerateInputSchema.parse({
            ...GENERATE_BASE,
            action: "infill",
            image: new Uint8Array(4),
            mask: new Uint8Array(4),
        });
        expect(result.action).toBe("infill");
        expect((result as Record<string, unknown>).mask).toBeInstanceOf(
            Uint8Array
        );
    });

    it("rejects img2img without image", () => {
        expect(() =>
            GenerateInputSchema.parse({ ...GENERATE_BASE, action: "img2img" })
        ).toThrow(z.ZodError);
    });

    it("rejects invalid action value", () => {
        expect(() =>
            GenerateInputSchema.parse({ ...GENERATE_BASE, action: "delete" })
        ).toThrow(z.ZodError);
    });

    it("rejects non-Uint8Array image for img2img", () => {
        expect(() =>
            GenerateInputSchema.parse({
                ...GENERATE_BASE,
                action: "img2img",
                image: "base64-string",
            })
        ).toThrow(z.ZodError);
    });

    it("accepts optional fields", () => {
        const result = GenerateInputSchema.parse({
            ...GENERATE_BASE,
            action: "generate",
            negativePrompt: "blurry",
            width: 1024,
            height: 1024,
            samples: 4,
            steps: 28,
            seed: 42,
            cfgRescale: 0.5,
            imageFormat: "webp",
            stream: "sse",
        });
        expect(result.negativePrompt).toBe("blurry");
        expect(result.width).toBe(1024);
        expect(result.imageFormat).toBe("webp");
    });

    it("rejects out-of-range scale", () => {
        expect(() =>
            GenerateInputSchema.parse({
                ...GENERATE_BASE,
                action: "generate",
                scale: 999,
            })
        ).toThrow(z.ZodError);
    });

    it("rejects samples above 16", () => {
        expect(() =>
            GenerateInputSchema.parse({
                ...GENERATE_BASE,
                action: "generate",
                samples: 20,
            })
        ).toThrow(z.ZodError);
    });

    it("rejects steps above 100", () => {
        expect(() =>
            GenerateInputSchema.parse({
                ...GENERATE_BASE,
                action: "generate",
                steps: 200,
            })
        ).toThrow(z.ZodError);
    });
});

// ── GenerateParamsSchema ──

// ── CharacterPromptSchema ──

describe("CharacterPromptSchema", () => {
    it("accepts valid character prompt", () => {
        const result = CharacterPromptSchema.parse({
            id: "char1",
            prompt: "smiling",
            negative: "frown",
            x: 100,
            y: 200,
        });
        expect(result.id).toBe("char1");
    });

    it("rejects missing fields", () => {
        expect(() => CharacterPromptSchema.parse({ id: "char1" })).toThrow(
            z.ZodError
        );
    });
});

// ── UpscaleInputSchema ──

describe("UpscaleInputSchema", () => {
    it("accepts valid input with minimal fields", () => {
        const result = UpscaleInputSchema.parse({
            image: new Uint8Array(4),
        });
        expect((result as Record<string, unknown>).image).toBeInstanceOf(
            Uint8Array
        );
    });

    it("accepts optional scale and model", () => {
        const result = UpscaleInputSchema.parse({
            image: new Uint8Array(4),
            scale: 2,
            model: "nai-diffusion-4-5",
        });
        expect((result as Record<string, unknown>).scale).toBe(2);
    });

    it("rejects non-Uint8Array image", () => {
        expect(() => UpscaleInputSchema.parse({ image: "not-bytes" })).toThrow(
            z.ZodError
        );
    });
});

describe("AugmentInputSchema", () => {
    it("accepts valid input with required fields", () => {
        const result = AugmentInputSchema.parse({
            reqType: "draw",
            image: new Uint8Array(4),
        });
        expect(result.reqType).toBe("draw");
    });

    it("accepts optional fields", () => {
        const result = AugmentInputSchema.parse({
            reqType: "inpaint",
            image: new Uint8Array(4),
            prompt: "fill area",
            width: 512,
            height: 512,
            defry: 0,
        });
        expect(result.prompt).toBe("fill area");
    });

    it("rejects missing reqType", () => {
        expect(() =>
            AugmentInputSchema.parse({ image: new Uint8Array(4) })
        ).toThrow(z.ZodError);
    });
});

// ── EncodeVibeInputSchema ──

describe("EncodeVibeInputSchema", () => {
    const valid = {
        image: new Uint8Array(4),
        model: "nai-diffusion-4-5-curated",
        informationExtracted: 0.5,
    };

    it("accepts valid input", () => {
        const result = EncodeVibeInputSchema.parse(valid);
        expect(result.model).toBe("nai-diffusion-4-5-curated");
    });

    it("accepts optional fields", () => {
        const result = EncodeVibeInputSchema.parse({
            ...valid,
            cropToMask: true,
            focusSeed: 42,
            infoExtractSeed: 123,
            mask: new Uint8Array(4),
        });
        expect(result.cropToMask).toBe(true);
        expect(result.focusSeed).toBe(42);
    });

    it("rejects informationExtracted below 0", () => {
        expect(() =>
            EncodeVibeInputSchema.parse({
                ...valid,
                informationExtracted: -0.1,
            })
        ).toThrow(z.ZodError);
    });

    it("rejects informationExtracted above 1", () => {
        expect(() =>
            EncodeVibeInputSchema.parse({
                ...valid,
                informationExtracted: 1.5,
            })
        ).toThrow(z.ZodError);
    });

    it("rejects missing image", () => {
        expect(() =>
            EncodeVibeInputSchema.parse({
                model: "test",
                informationExtracted: 0.5,
            })
        ).toThrow(z.ZodError);
    });

    it("rejects non-Uint8Array mask", () => {
        expect(() =>
            EncodeVibeInputSchema.parse({
                ...valid,
                mask: "base64-string",
            })
        ).toThrow(z.ZodError);
    });
});

// ── ImageFormatSchema ──

describe("ImageFormatSchema", () => {
    it("accepts png", () => expect(ImageFormatSchema.parse("png")).toBe("png"));
    it("accepts webp", () =>
        expect(ImageFormatSchema.parse("webp")).toBe("webp"));
    it("rejects invalid", () =>
        expect(() => ImageFormatSchema.parse("gif")).toThrow(z.ZodError));
});

// ── StreamingTypeSchema ──

describe("StreamingTypeSchema", () => {
    it("accepts msgpack", () =>
        expect(StreamingTypeSchema.parse("msgpack")).toBe("msgpack"));
    it("accepts sse", () =>
        expect(StreamingTypeSchema.parse("sse")).toBe("sse"));
    it("rejects invalid", () =>
        expect(() => StreamingTypeSchema.parse("websocket")).toThrow(
            z.ZodError
        ));
});
