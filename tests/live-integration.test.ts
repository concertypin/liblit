import { describe, it, expect } from "vitest";
import { generate, encodeVibe } from "../src/client";
import type { NovelAIConfig } from "../src/types";

/**
 * ⚠️ LIVE INTEGRATION TESTS – CONSUMES ANLAS (credits)!
 *
 * These tests call the actual NovelAI API and will use your account credits.
 * They are SKIPPED by default.  To enable:
 *   1. Set `NOVELAI_KEY` in `.env.local`
 *   2. Set `NAI_LIVE_TEST=1` in your environment
 *
 * NovelAI rate-limits to 1 concurrent request, so tests run sequentially.
 */

const NAI_LIVE =
    (typeof import.meta.env !== "undefined"
        ? import.meta.env.NAI_LIVE_TEST
        : undefined) === "1";

const NAI_TOKEN =
    (typeof import.meta.env !== "undefined"
        ? import.meta.env.NOVELAI_KEY
        : undefined) ?? "";

const config: NovelAIConfig = {
    baseUrl: "https://image.novelai.net",
    token: NAI_TOKEN,
    timeoutMs: 60000,
};

describe.runIf(NAI_LIVE)("generate (live) — ⚠️ burns anlas", () => {
    it("generates a 512x512 image and returns a zip/image result", async () => {
        const result = await generate(
            {
                action: "generate",
                model: "nai-diffusion-4-5-curated",
                prompt: "1girl, solo, detailed face",
                negativePrompt: "blurry, lowres",
                width: 512,
                height: 512,
                seed: 42,
                steps: 8,
                scale: 5,
                sampler: "k_euler_ancestral",
            },
            config
        );

        expect(["image", "zip"]).toContain(result.kind);
        expect(result.images.length).toBeGreaterThanOrEqual(1);
        expect(result.images[0]!.bytes ?? result.images[0]!.url).toBeTruthy();
    }, 120_000);
});

describe.runIf(NAI_LIVE)("encodeVibe (live) — ⚠️ burns anlas", () => {
    it("returns a binary vibe file", async () => {
        // 1×1 transparent PNG as Uint8Array
        const pngBytes = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
            0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
            0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
            0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63,
            0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x27, 0x34,
            0x27, 0x8b, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
            0x42, 0x60, 0x82,
        ]);

        const result = await encodeVibe(
            {
                image: pngBytes,
                model: "nai-diffusion-4-5-curated",
                informationExtracted: 0.5,
            },
            config
        );

        expect(result.kind).toMatch(/^(image|binary|json)$/);
    }, 120_000);
});
