# liblit — NovelAI Image API Client

[![CI](https://github.com/concertypin/liblit/actions/workflows/ci.yml/badge.svg)](https://github.com/concertypin/liblit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@concertypin/liblit)](https://www.npmjs.com/package/@concertypin/liblit)
[![License](https://img.shields.io/github/license/concertypin/liblit)](LICENSE)

**liblit** is a lightweight TypeScript client for the [NovelAI](https://novelai.net) Image Generation API.  
Uint8Array-native, camelCase input, discriminated unions, zero production dependencies.

> Zod schemas are dynamically imported in dev builds and fully tree-shaken in production.

---

## Installation

```bash
pnpm add liblit
```

## Quick Start

```ts
import { generate } from "liblit";

const result = await generate({
    action: "generate",
    model: "nai-diffusion-4-5-full",
    prompt: "1girl, solo, detailed face",
    steps: 28,
    scale: 5,
});

// result.images[0].bytes → Uint8Array
```

Token is read from `import.meta.env.NOVELAI_KEY` automatically when omitted.

## All Endpoints

| Function       | API Path             | Description                    |
| -------------- | -------------------- | ------------------------------ |
| `generate()`   | `/ai/generate-image` | Text-to-image, img2img, infill |
| `upscale()`    | `/ai/upscale`        | Image upscaling                |
| `augment()`    | `/ai/augment-image`  | Director Tools                 |
| `encodeVibe()` | `/ai/encode-vibe`    | Vibe encoding                  |

All functions accept an optional `NovelAIConfig` (token, baseUrl, timeoutMs) as the second argument and optional `RequestOptions` (custom fetch, signal) as the third.

## Features

- **Uint8Array everywhere** — input images and response images, no base64 strings in user code
- **camelCase input** — auto-converted to the API's snake_case internally
- **Discriminated unions** — type-safe required fields per action (`generate` vs `img2img` vs `infill`)
- **Smart defaults** — width 1024, steps 28, scale 5, sampler `k_euler_ancestral`, etc.
- **Env-based token** — falls back to `import.meta.env.NOVELAI_KEY`
- **Dev-only validation** — Zod schemas validate inputs during development
- **Timeout & abort** — built-in timeout with configurable `AbortSignal`
- **Response normalization** — JSON, ZIP (images + metadata), raw images, binary
- **Zero production deps** — Zod is tree-shaken from the production bundle

## Documentation

- [Usage Guide](docs/usage.md) — configuration, generation, response handling
- [API Reference](docs/api.md) — full type and function documentation

## Development

```bash
pnpm dev          # Watch mode build
pnpm build        # Production build (ESM → dist/)
pnpm test         # Run tests with coverage
pnpm lint         # Oxlint type-aware linting
pnpm format       # Prettier
pnpm check        # format + lint + test (pre-push)
```

Requires Node.js ≥22.18.0 and pnpm.

## Publishing

Published to npm as `@concertypin/liblit` via GitHub Actions.

1. Update version in `package.json`
2. Tag:

    ```bash
    git tag v0.2.0
    git push origin v0.2.0
    ```

3. The [Publish workflow](.github/workflows/publish.yml) handles lint → test → build → publish with npm OIDC provenance.

## License

MIT
