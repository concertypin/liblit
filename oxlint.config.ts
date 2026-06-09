import { defineConfig } from "oxlint";
import eslintConfig from "./scripts/linter/oxlint-eslint.ts";
export default defineConfig({
    plugins: ["typescript", "unicorn", "import", "vitest", "promise"],
    env: {
        builtin: true,
    },
    rules: {
        "typescript/require-await": "off",
    },
    ignorePatterns: [
        "**/node_modules/**",
        "**/dist/**",
        "**/dist-ts/**",
        "**/coverage/**",
        "**/.cache/**",
        "**/.vscode/**",
        "**/.git/**",
        "**/*.mjs",
    ],
    overrides: [
        {
            files: ["**/*.d.ts"],
            rules: {
                "no-unused-vars": "off",
            },
        },
        {
            files: ["scripts/**/*.ts"],
            rules: {
                "no-console": "off",
            },
        },
        {
            files: ["tests/**/*.ts"],
            rules: {
                "typescript/no-unsafe-assignment": "off",
                "typescript/no-unsafe-member-access": "off",
                "typescript/no-unsafe-return": "off",
                "typescript/no-unsafe-call": "off",
            },
        },
    ],
    options: {
        denyWarnings: true,
        reportUnusedDisableDirectives: "error",
        typeAware: true,
        typeCheck: true,
    },
    extends: [eslintConfig],
});
