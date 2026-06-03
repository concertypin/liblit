import { describe, it, expect } from "vitest";
import { callImageGenerate, callEncodeVibe } from "../src/client";
import type { ImageEndpointConfig } from "../src/types";

declare const process: { env: Record<string, string | undefined> };

const NAI_TOKEN = process.env.NAI_TOKEN || process.env.VITE_NAI_TOKEN || "";

const config: ImageEndpointConfig = {
    baseUrl: "https://image.novelai.net",
    token: NAI_TOKEN,
    authScheme: "Bearer",
    timeoutMs: 60000,
};

describe.runIf(NAI_TOKEN)("callImageGenerate (live)", () => {
    it("generates a 512x512 image and returns a zip/image result", async () => {
        const result = await callImageGenerate(config, {
            payload: {
                action: "generate",
                input: "1girl, solo, detailed face",
                model: "nai-diffusion-4-5-curated",
                parameters: {
                    width: 512,
                    height: 512,
                    n_samples: 1,
                    seed: 42,
                    steps: 8,
                    scale: 5,
                    sampler: "k_euler_ancestral",
                    prompt: "1girl, solo, detailed face",
                    negative_prompt: "blurry, lowres",
                },
            },
        });

        expect(["image", "zip"]).toContain(result.kind);
        expect(result.images.length).toBeGreaterThanOrEqual(1);
        expect(result.images[0]!.dataUrl).toBeTruthy();
    }, 120_000);
});

describe.runIf(NAI_TOKEN)("callEncodeVibe (live)", () => {
    it("returns a binary vibe file", async () => {
        const result = await callEncodeVibe(config, {
            image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            model: "nai-diffusion-4-5-curated",
            information_extracted: 0.5,
        });

        expect(result.kind).toMatch(/^(image|binary|json)$/);
    }, 120_000);
});
