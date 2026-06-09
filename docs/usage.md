# Usage Guide

## Configuration

API functions accept an optional `NovelAIConfig` as the second argument:

```ts
interface NovelAIConfig {
    token?: string; // defaults to import.meta.env.NOVELAI_KEY
    baseUrl?: string; // defaults to "https://image.novelai.net"
    timeoutMs?: number; // defaults to 120_000 (2 min)
}
```

All fields are optional. When `token` is omitted, the library falls back to
`import.meta.env.NOVELAI_KEY` (set via `.env.local` with `envPrefix: "NOVELAI"`).

```ts
// Full config
await generate(input, { token: "my-key" });

// Minimal — relies on env var NOVELAI_KEY
await generate(input);

// Custom timeout
await generate(input, { timeoutMs: 60_000 });
```

---

## Generate (`generate()`)

The `generate()` function uses a **discriminated union** on `action`:

### Text-to-Image

```ts
const result = await generate({
    action: "generate",
    model: "nai-diffusion-4-5-full",
    prompt: "1girl, solo, detailed face",
    negativePrompt: "blurry, lowres",
    width: 1024,
    height: 1024,
    steps: 28,
    scale: 5,
    // seed omitted → API picks random
});
```

### Image-to-Image

```ts
const result = await generate({
    action: "img2img",
    model: "nai-diffusion-4-5-full",
    prompt: "improve quality",
    image: inputImageBytes, // Uint8Array
    strength: 0.7,
    // mask is optional
});
```

### Infill (Inpainting)

```ts
const result = await generate({
    action: "infill",
    model: "nai-diffusion-4-5-full",
    prompt: "fill the masked area",
    image: inputImageBytes, // Uint8Array
    mask: maskBytes, // Uint8Array
});
```

### Common Optional Fields

| Field              | Type                 | Default               |
| ------------------ | -------------------- | --------------------- |
| `width` / `height` | `number`             | `1024` / `1024`       |
| `samples`          | `number` (1–16)      | `1`                   |
| `steps`            | `number` (1–100)     | `28`                  |
| `scale`            | `number` (0–30)      | `5`                   |
| `sampler`          | `string`             | `"k_euler_ancestral"` |
| `seed`             | `number`             | random (omit)         |
| `imageFormat`      | `"png" \| "webp"`    | `"png"`               |
| `stream`           | `"msgpack" \| "sse"` | —                     |
| `cfgRescale`       | `number` (0–1)       | `0`                   |
| `uncondScale`      | `number` (0–10)      | `1`                   |
| `noiseSchedule`    | `string`             | `"native"`            |

All boolean flags (`qualityToggle`, `sm`, `smDyn`, `addOriginal`, etc.) default
to the NovelAI API defaults.

---

## Upscale (`upscale()`)

```ts
const result = await upscale({
    image: inputImageBytes, // Uint8Array
    scale: 2,
});
```

---

## Augment / Director Tools (`augment()`)

```ts
const result = await augment({
    reqType: "draw",
    image: inputImageBytes, // Uint8Array
    prompt: "optional prompt",
});
```

---

## Encode Vibe (`encodeVibe()`)

```ts
const result = await encodeVibe({
    image: inputImageBytes, // Uint8Array
    model: "nai-diffusion-4-5-curated",
    informationExtracted: 0.5, // 0–1
    cropToMask: true, // optional
    focusSeed: 42, // optional
    infoExtractSeed: 123, // optional
    mask: maskBytes, // optional Uint8Array
});
```

---

## Response Handling

All functions return `GenerationResult`:

```ts
interface GenerationResult {
    kind: "json" | "zip" | "image" | "binary";
    contentType: string;
    images: ImageResult[];
    raw?: unknown;
    metadata?: Record<string, unknown>;
    text?: string;
    headers?: Record<string, string>;
}
```

### Result Kinds

| kind     | When                              | Access                                                  |
| -------- | --------------------------------- | ------------------------------------------------------- |
| `json`   | JSON content-type                 | `result.raw` — parsed JSON; `result.images` — extracted |
| `zip`    | ZIP content-type or magic bytes   | `result.images` — with `bytes`; `result.metadata`       |
| `image`  | Image content-type or magic bytes | `result.images[0].bytes` — the image data               |
| `binary` | Everything else                   | `result.text` — decoded text; `result.headers`          |

### Accessing Image Data

```ts
const result = await generate({ action: "generate", model, prompt });

for (const img of result.images) {
    // img.bytes → Uint8Array | undefined
    // img.mime  → "image/png" | "image/webp"
    // img.name  → filename (from ZIP)
    console.log(`${img.name}: ${img.bytes?.byteLength} bytes`);
}

// Convert to data URL:
const url = `data:${result.images[0]!.mime};base64,${encodeBase64(result.images[0]!.bytes!)}`;
```

---

## Advanced Options

### Custom Fetch & AbortSignal

```ts
const controller = new AbortController();

const result = await generate(input, config, {
    fetch: myCustomFetch, // custom fetch implementation
    signal: controller.signal, // external abort signal
});

controller.abort("user cancelled");
```

---

## Error Handling

| Scenario                   | Error                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| Invalid payload (dev mode) | `ZodError` with validation details                                 |
| Upstream HTTP error        | `Error("Upstream returned {status}")` with `.detail` and `.status` |
| Response exceeds 96 MB     | `Error("Response exceeded 96 MB limit.")`                          |
| Network failure            | Propagated from `fetch` (e.g., `TypeError`)                        |

```ts
try {
    const result = await generate(input);
} catch (err) {
    if (err instanceof Error && "status" in err) {
        console.error(`Upstream error ${err.status}: ${err.detail}`);
    } else {
        console.error("Request failed:", err);
    }
}
```

---

## Random Seed

Use `randomSeed()` to generate a cryptographically random seed:

```ts
import { randomSeed } from "liblit";

const result = await generate({
    action: "generate",
    model: "nai-diffusion-4-5-full",
    prompt: "1girl",
    seed: randomSeed(),
});
```

When `seed` is omitted entirely, the API assigns a random seed server-side.
