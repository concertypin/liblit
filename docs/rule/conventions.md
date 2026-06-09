# Liblit Coding Conventions

## Architecture

- **`src/types.ts`** — Shared TypeScript interfaces (NovelAIConfig, discriminated unions, response types)
- **`src/transform.ts`** — Transform layer: camelCase→snake_case, Uint8Array→base64, default injection
- **`src/client.ts`** — Public API functions: `generate()`, `upscale()`, `augment()`, `encodeVibe()`, `postJson()`
- **`src/schemas/`** — Zod schema definitions for dev-only validation
- **`src/validate.ts`** — Dev-only validation wrappers (dynamic `import()` in DEV block, tree-shaken in prod)
- **`src/utils.ts`** — Pure utility functions (URL, auth, base64, MIME, image collection, response normalization)
- **`src/constants.ts`** — Constants (`MAX_RESPONSE_BYTES`, `DEFAULT_BASE_URL`)

## Naming

- **Input types**: camelCase throughout (e.g. `negativePrompt`, `cfgRescale`, `noiseSchedule`)
- **Transform maps**: explicit FIELD_MAP for API's mixed camelCase/snake_case parameters
- **Deprecated APIs**: removed entirely (library is pre-1.0, no backward compat)

## Transform Layer

- `transformGenerate()` converts user-friendly inputs to the API request body format.
- `resolveConfig()` resolves NovelAIConfig defaults (env fallback for token).
- `randomSeed()` uses `crypto.getRandomValues()` for cryptographically random seeds.
- Uint8Array image inputs are encoded to base64 during transform.
- Parameters not provided by the user receive sensible defaults.

## Validation

- Validation functions follow the lazy-init pattern (dynamic `import()` in DEV block).
- Production bundle has zero Zod bytes (fully tree-shaken via `import.meta.env.DEV`).
- `/* v8 ignore */` annotations mark the TLA dynamic import block and prod fallthroughs.

## Testing

- Stateless unit tests prefer `it.concurrent`.
- Avoid `toThrow()` without a specific matcher — pass `string`, `RegExp`, or class reference.
- Mock `globalThis.fetch` via `vi.fn` with explicit type parameters.
- Live integration tests require `NAI_LIVE_TEST=1` (consumes anlas!).
- Coverage must meet per-file 95% thresholds across all metrics.
