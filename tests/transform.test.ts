import { describe, it, expect } from "vitest";
import {
    resolveConfig,
    transformGenerate,
    transformUpscale,
    transformAugment,
    transformEncodeVibe,
    randomSeed,
} from "../src/transform";

describe("resolveConfig", () => {
    it("provides defaults when config is empty", () => {
        const result = resolveConfig({});
        expect(result.baseUrl).toBe("https://image.novelai.net");
        expect(result.timeoutMs).toBe(120_000);
        expect(typeof result.token).toBe("string");
    });

    it("uses provided values", () => {
        const result = resolveConfig({
            token: "my-token",
            baseUrl: "https://custom.example.com",
            timeoutMs: 30000,
        });
        expect(result.token).toBe("my-token");
        expect(result.baseUrl).toBe("https://custom.example.com");
        expect(result.timeoutMs).toBe(30000);
    });

    it("uses partial overrides", () => {
        const result = resolveConfig({ timeoutMs: 5000 });
        expect(result.timeoutMs).toBe(5000);
        expect(result.baseUrl).toBe("https://image.novelai.net");
    });
});

describe("transformGenerate", () => {
    it("transforms generate action with minimal input", () => {
        const result = transformGenerate({
            action: "generate",
            model: "nai-diffusion-4-5",
            prompt: "1girl",
        });
        expect(result.action).toBe("generate");
        expect(result.input).toBe("1girl");
        expect(result.model).toBe("nai-diffusion-4-5");
        expect(result.parameters).toBeDefined();
        expect((result.parameters as Record<string, unknown>).prompt).toBe(
            "1girl"
        );
        expect((result.parameters as Record<string, unknown>).width).toBe(1024); // default
        expect((result.parameters as Record<string, unknown>).steps).toBe(28); // default
        // seed should not be present (omitted means random)
        expect(
            (result.parameters as Record<string, unknown>).seed
        ).toBeUndefined();
    });

    it("transforms generate action with all optional fields", () => {
        const result = transformGenerate({
            action: "generate",
            model: "test-model",
            prompt: "test prompt",
            negativePrompt: "bad stuff",
            width: 512,
            height: 768,
            samples: 4,
            seed: 42,
            steps: 50,
            scale: 10,
            cfgRescale: 0.3,
            uncondScale: 2,
            sampler: "k_euler",
            noiseSchedule: "native",
            ucPreset: 3,
            strength: 0.8,
            noise: 0.2,
            qualityToggle: false,
            autoSmea: true,
            sm: true,
            smDyn: true,
            decrisper: true,
            preferBrownian: true,
            addOriginal: true,
            legacyV3: true,
            legacyUc: true,
            varietyPlus: true,
            normalizeVibes: false,
            useCoords: true,
            useOrder: true,
            imageFormat: "webp",
            stream: "sse",
        });
        expect(result.action).toBe("generate");
        expect(result.input).toBe("test prompt");
        // Snake_case conversions
        expect(
            (result.parameters as Record<string, unknown>).negative_prompt
        ).toBe("bad stuff");
        expect((result.parameters as Record<string, unknown>).cfg_rescale).toBe(
            0.3
        );
        expect(
            (result.parameters as Record<string, unknown>).uncond_scale
        ).toBe(2);
        expect(
            (result.parameters as Record<string, unknown>).noise_schedule
        ).toBe("native");
        expect(
            (result.parameters as Record<string, unknown>).image_format
        ).toBe("webp");
        // CamelCase fields passed through
        expect(
            (result.parameters as Record<string, unknown>).qualityToggle
        ).toBe(false);
        expect((result.parameters as Record<string, unknown>).autoSmea).toBe(
            true
        );
        expect(
            (result.parameters as Record<string, unknown>).preferBrownian
        ).toBe(true);
        expect((result.parameters as Record<string, unknown>).seed).toBe(42);
    });

    it("transforms img2img action with image bytes", () => {
        const img = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
        const result = transformGenerate({
            action: "img2img",
            model: "test-model",
            prompt: "test",
            image: img,
            mask: new Uint8Array([0x00, 0x01]),
        });
        expect(result.action).toBe("img2img");
        // input should be base64 of image
        expect(typeof result.input).toBe("string");
        expect((result.input as string).length).toBeGreaterThan(0);
        // input_mask should be base64 of mask
        expect(typeof result.input_mask).toBe("string");
        expect((result.input_mask as string).length).toBeGreaterThan(0);
        expect(result.model).toBe("test-model");
    });

    it("transforms infill action with image and mask", () => {
        const img = new Uint8Array(8);
        const mask = new Uint8Array(8);
        const result = transformGenerate({
            action: "infill",
            model: "test-model",
            prompt: "fill in",
            image: img,
            mask,
        });
        expect(result.action).toBe("infill");
        expect(typeof result.input).toBe("string");
        expect(typeof result.input_mask).toBe("string");
    });

    it("includes characters in parameters", () => {
        const result = transformGenerate({
            action: "generate",
            model: "test",
            prompt: "test",
            characters: [
                { id: "c1", prompt: "smile", negative: "frown", x: 0, y: 0 },
            ],
        });
        const chars = (result.parameters as Record<string, unknown>)
            .characters as { id: string }[];
        expect(chars).toHaveLength(1);
        expect(chars[0]!.id).toBe("c1");
    });

    it("spreads extraParameters into parameters", () => {
        const result = transformGenerate({
            action: "generate",
            model: "test",
            prompt: "test",
            extraParameters: { custom_param: "value", extra_num: 42 },
        });
        expect(
            (result.parameters as Record<string, unknown>).custom_param
        ).toBe("value");
        expect((result.parameters as Record<string, unknown>).extra_num).toBe(
            42
        );
    });

    it("includes stream in parameters when set", () => {
        const result = transformGenerate({
            action: "generate",
            model: "test",
            prompt: "test",
            stream: "msgpack",
        });
        expect((result.parameters as Record<string, unknown>).stream).toBe(
            "msgpack"
        );
    });

    it("omits seed from parameters when not provided", () => {
        const result = transformGenerate({
            action: "generate",
            model: "test",
            prompt: "test",
        });
        expect(
            (result.parameters as Record<string, unknown>).seed
        ).toBeUndefined();
    });
});

describe("transformUpscale", () => {
    it("transforms minimal upscale input", () => {
        const img = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
        const result = transformUpscale({ image: img });
        expect(typeof result.image).toBe("string");
        expect(result.scale).toBeUndefined();
        expect(result.model).toBeUndefined();
    });

    it("includes optional scale and model", () => {
        const img = new Uint8Array(4);
        const result = transformUpscale({
            image: img,
            scale: 2,
            model: "upscale-model",
        });
        expect(result.scale).toBe(2);
        expect(result.model).toBe("upscale-model");
    });
});

describe("transformAugment", () => {
    it("transforms minimal augment input", () => {
        const img = new Uint8Array(4);
        const result = transformAugment({
            reqType: "draw",
            image: img,
        });
        expect(result.req_type).toBe("draw");
        expect(typeof result.image).toBe("string");
    });

    it("includes optional fields", () => {
        const img = new Uint8Array(4);
        const result = transformAugment({
            reqType: "inpaint",
            image: img,
            prompt: "fill",
            width: 512,
            height: 512,
            defry: 0,
        });
        expect(result.prompt).toBe("fill");
        expect(result.width).toBe(512);
        expect(result.defry).toBe(0);
    });
});

describe("transformEncodeVibe", () => {
    it("transforms minimal encodeVibe input", () => {
        const img = new Uint8Array(4);
        const result = transformEncodeVibe({
            image: img,
            model: "test-model",
            informationExtracted: 0.5,
        });
        expect(typeof result.image).toBe("string");
        expect(result.model).toBe("test-model");
        expect(result.information_extracted).toBe(0.5);
    });

    it("includes optional fields with snake_case conversion", () => {
        const img = new Uint8Array(4);
        const mask = new Uint8Array(4);
        const result = transformEncodeVibe({
            image: img,
            model: "test",
            informationExtracted: 0.8,
            cropToMask: true,
            focusSeed: 42,
            infoExtractSeed: 123,
            mask,
        });
        expect(result.crop_to_mask).toBe(true);
        expect(result.focus_seed).toBe(42);
        expect(result.info_extract_seed).toBe(123);
        expect(typeof result.mask).toBe("string");
    });

    it("handles informationExtracted boundary values", () => {
        const img = new Uint8Array(4);
        const minResult = transformEncodeVibe({
            image: img,
            model: "test",
            informationExtracted: 0,
        });
        expect(minResult.information_extracted).toBe(0);

        const maxResult = transformEncodeVibe({
            image: img,
            model: "test",
            informationExtracted: 1,
        });
        expect(maxResult.information_extracted).toBe(1);
    });
});

describe("randomSeed", () => {
    it("generates a non-negative integer", () => {
        const seed = randomSeed();
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
    });

    it("generates different values on multiple calls", () => {
        const seeds = new Set(Array.from({ length: 10 }, () => randomSeed()));
        // At least 2 should be different (extremely unlikely all 10 are same)
        expect(seeds.size).toBeGreaterThanOrEqual(2);
    });
});
