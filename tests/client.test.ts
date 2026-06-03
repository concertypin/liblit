import { describe, it, expect } from "vitest";
import {
    callImageGenerate,
    callImageUpscale,
    callImageDirector,
    callEncodeVibe,
} from "../src/client";
import type { ImageEndpointConfig } from "../src/types";

const mockConfig: ImageEndpointConfig = {
    baseUrl: "https://image.novelai.net",
    token: "test-token",
    authScheme: "Bearer",
    timeoutMs: 5000,
};

describe("callImageGenerate", () => {
    it("throws on invalid base URL", async () => {
        await expect(
            callImageGenerate({ ...mockConfig, baseUrl: "" }, { payload: {} })
        ).rejects.toThrow("Base URL is empty");
    });

    it("throws on network error", async () => {
        await expect(
            callImageGenerate(
                { ...mockConfig, baseUrl: "https://nonexistent.example.com" },
                { payload: {} },
                {
                    fetch: () =>
                        Promise.reject(new TypeError("Failed to fetch")),
                }
            )
        ).rejects.toThrow("Failed to fetch");
    });

    it("throws on non-ok response", async () => {
        const mockFetch = () =>
            Promise.resolve(
                new Response(JSON.stringify({ message: "Unauthorized" }), {
                    status: 401,
                    statusText: "Unauthorized",
                    headers: { "content-type": "application/json" },
                })
            );
        await expect(
            callImageGenerate(
                mockConfig,
                { payload: {} },
                { fetch: mockFetch as typeof globalThis.fetch }
            )
        ).rejects.toThrow("Upstream returned 401");
    });

    it("returns UpstreamResult on success", async () => {
        const mockFetch = () =>
            Promise.resolve(
                new Response(JSON.stringify({ foo: "bar" }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                })
            );
        const result = await callImageGenerate(
            mockConfig,
            { payload: {} },
            { fetch: mockFetch as typeof globalThis.fetch }
        );
        expect(result.kind).toBe("json");
        expect(result.raw).toEqual({ foo: "bar" });
    });
});

describe("callImageUpscale", () => {
    it("calls with correct path", async () => {
        let calledUrl = "";
        const mockFetch = (url: string) => {
            calledUrl = url;
            return Promise.resolve(
                new Response("{}", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                })
            );
        };
        await callImageUpscale(
            mockConfig,
            { payload: {} },
            { fetch: mockFetch as typeof globalThis.fetch }
        );
        expect(calledUrl).toContain("/ai/upscale");
    });
});

describe("callImageDirector", () => {
    it("calls with correct path", async () => {
        let calledUrl = "";
        const mockFetch = (url: string) => {
            calledUrl = url;
            return Promise.resolve(
                new Response("{}", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                })
            );
        };
        await callImageDirector(
            mockConfig,
            { payload: {} },
            { fetch: mockFetch as typeof globalThis.fetch }
        );
        expect(calledUrl).toContain("/ai/augment-image");
    });
});

describe("callEncodeVibe", () => {
    it("calls encode-vibe endpoint", async () => {
        let calledUrl = "";
        const mockFetch = (url: string) => {
            calledUrl = url;
            return Promise.resolve(
                new Response("{}", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                })
            );
        };
        await callEncodeVibe(
            mockConfig,
            {
                image: "base64...",
                model: "nai-diffusion-4-5-full",
                information_extracted: 0.5,
            },
            { fetch: mockFetch as typeof globalThis.fetch }
        );
        expect(calledUrl).toContain("/ai/encode-vibe");
    });
});
