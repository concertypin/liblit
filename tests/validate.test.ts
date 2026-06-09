import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
    validateConfig,
    validateGenerateInput,
    validateUpscaleInput,
    validateAugmentInput,
    validateEncodeVibe,
} from "../src/validate";

const validConfig = {
    baseUrl: "https://image.novelai.net",
    token: "test-token",
};

describe("validateConfig", () => {
    it.concurrent("passes valid config through", () => {
        const result = validateConfig(validConfig);
        expect(result.baseUrl).toBe("https://image.novelai.net");
        expect(result.token).toBe("test-token");
    });

    it.concurrent("passes empty config (all optional)", () => {
        const result = validateConfig({});
        expect(result).toEqual({});
    });

    it.concurrent("rejects invalid timeoutMs in DEV mode", () => {
        expect(() => validateConfig({ timeoutMs: -1 })).toThrow(z.ZodError);
    });
});

describe("validateGenerateInput", () => {
    it.concurrent("passes valid generate input", () => {
        const result = validateGenerateInput({
            action: "generate",
            model: "nai-diffusion-4-5",
            prompt: "test",
        });
        expect(result.action).toBe("generate");
    });

    it.concurrent("rejects missing action", () => {
        const input = { model: "test", prompt: "test" };
        expect(() => validateGenerateInput(input)).toThrow(z.ZodError);
    });
});

describe("validateUpscaleInput", () => {
    it.concurrent("passes valid upscale input", () => {
        const result = validateUpscaleInput({
            image: new Uint8Array(4),
        });
        expect(result.image).toBeInstanceOf(Uint8Array);
    });
});

describe("validateAugmentInput", () => {
    it.concurrent("passes valid augment input", () => {
        const result = validateAugmentInput({
            reqType: "draw",
            image: new Uint8Array(4),
        });
        expect(result.reqType).toBe("draw");
    });
});

describe("validateEncodeVibe", () => {
    it.concurrent("throws for missing fields", () => {
        expect(() => validateEncodeVibe({})).toThrow(z.ZodError);
    });
});
