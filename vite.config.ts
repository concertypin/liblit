/// <reference types="vitest/config" />

import { type UserConfig, defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import { globSync } from "node:fs";
import path from "node:path";

type Config = Required<UserConfig>;

const resolve: Config["resolve"] = {
    alias: {
        "@": fileURLToPath(new URL("src", import.meta.url)),
    },
};

const testConfig: Config["test"] = {
    coverage: {
        enabled: true,
        exclude: [
            "src/schemas/index.ts", // barrel re-export: pulls in schema files, skews per-file %
            "src/types.ts", // static data constants (MODELS, SAMPLERS, etc.) — no logic to test
            "src/validate.ts", // dynamic await import() in TLA; V8 cannot track coverage. Tested indirectly via validate.test.ts (4 tests)
        ],
        include: ["src/**/*.ts"],
        provider: "v8",
        reportOnFailure: true,
        reporter: ["text", "json-summary", "html"],
        thresholds: {
            perFile: true,
            lines: 95,
            statements: 95,
            functions: 95,
            branches: 95,
        },
    },
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,
    include: ["tests/**/*.test.ts"],
};

const entries = globSync("src/**/index.ts").reduce(
    (acc, file) => {
        const relativePath = path.relative("src", file);
        const entryName = relativePath.replace(/\.ts$/, "").replace(/\\/g, "/");

        acc[entryName] = fileURLToPath(new URL(file, import.meta.url));
        return acc;
    },
    {} as Record<string, string>
);
export default defineConfig({
    envPrefix: "NOVELAI",
    build: {
        lib: {
            entry: entries,
            formats: ["es"],
            fileName: "index",
        },
        rolldownOptions: {
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "internal/[name]-[hash].js",
            },
        },
        outDir: "dist",
        sourcemap: true,
        minify: false,
    },
    clearScreen: false,
    plugins: [
        dts({
            tsconfigPath: "./tsconfig.app.json",
            outDirs: "dist",
            entryRoot: "src",
            include: ["src"],
        }),
    ],
    resolve,
    test: testConfig,
});
