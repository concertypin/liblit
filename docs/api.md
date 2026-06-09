# API Reference

## Configuration

### `NovelAIConfig`

```ts
interface NovelAIConfig {
    token?: string;
    baseUrl?: string;
    timeoutMs?: number;
}
```

All fields are optional. When `token` is omitted, `import.meta.env.NOVELAI_KEY`
is used as fallback. `baseUrl` defaults to `"https://image.novelai.net"`.
`timeoutMs` defaults to `120_000`.

### `RequestOptions`

```ts
interface RequestOptions {
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
}
```

---

## Client Functions

### `generate()`

```ts
async function generate(
    input: AnyGenerateInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult>;
```

Discriminated union input — see `AnyGenerateInput` below.

---

### `upscale()`

```ts
async function upscale(
    input: UpscaleInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult>;
```

### `augment()`

```ts
async function augment(
    input: AugmentInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult>;
```

### `encodeVibe()`

```ts
async function encodeVibe(
    input: EncodeVibeInput,
    config?: NovelAIConfig,
    options?: RequestOptions
): Promise<GenerationResult>;
```

### `postJson()`

```ts
async function postJson(
    url: string,
    payload: unknown,
    headers: Record<string, string>,
    timeoutMs: number,
    options?: RequestOptions
): Promise<GenerationResult>;
```

Low-level HTTP POST. Used internally by all API functions.

---

## Input Types

### `AnyGenerateInput`

```ts
type AnyGenerateInput = GenerateInput | Img2ImgInput | InfillInput;
```

Discriminated by `action`:

#### `GenerateInput` (action: "generate")

```ts
interface GenerateInput extends GenerateInputBase {
    action: "generate";
}
```

#### `Img2ImgInput` (action: "img2img")

```ts
interface Img2ImgInput extends GenerateInputBase {
    action: "img2img";
    image: Uint8Array; // required
    mask?: Uint8Array;
}
```

#### `InfillInput` (action: "infill")

```ts
interface InfillInput extends GenerateInputBase {
    action: "infill";
    image: Uint8Array; // required
    mask: Uint8Array; // required
}
```

### `GenerateInputBase`

```ts
interface GenerateInputBase {
    model: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    samples?: number; // 1–16
    seed?: number; // omit for random
    steps?: number; // 1–100
    scale?: number; // 0–30
    cfgRescale?: number; // 0–1
    uncondScale?: number; // 0–10
    sampler?: string;
    noiseSchedule?: string;
    ucPreset?: number; // 0–7
    strength?: number; // 0–1
    noise?: number; // 0–1
    qualityToggle?: boolean;
    autoSmea?: boolean;
    sm?: boolean;
    smDyn?: boolean;
    decrisper?: boolean;
    preferBrownian?: boolean;
    addOriginal?: boolean;
    legacyV3?: boolean;
    legacyUc?: boolean;
    varietyPlus?: boolean;
    normalizeVibes?: boolean;
    useCoords?: boolean;
    useOrder?: boolean;
    imageFormat?: ImageFormat;
    stream?: StreamingType;
    characters?: CharacterPrompt[];
    extraParameters?: Record<string, unknown>;
}
```

### `UpscaleInput`

```ts
interface UpscaleInput {
    image: Uint8Array;
    scale?: number;
    model?: string;
}
```

### `AugmentInput`

```ts
interface AugmentInput {
    reqType: string;
    image: Uint8Array;
    prompt?: string;
    width?: number;
    height?: number;
    defry?: number;
}
```

### `EncodeVibeInput`

```ts
interface EncodeVibeInput {
    image: Uint8Array;
    model: string;
    informationExtracted: number; // 0–1
    cropToMask?: boolean;
    focusSeed?: number;
    infoExtractSeed?: number;
    mask?: Uint8Array;
}
```

### Supporting Types

```ts
type ImageFormat = "png" | "webp";
type StreamingType = "msgpack" | "sse";

interface CharacterPrompt {
    id: string;
    prompt: string;
    negative: string;
    x: number;
    y: number;
}
```

---

## Response Types

### `GenerationResult`

```ts
interface GenerationResult {
    kind: "json" | "zip" | "image" | "binary";
    contentType: string;
    images: ImageResult[];
    raw?: unknown;
    metadata?: Record<string, unknown>;
    text?: string;
    headers: Record<string, string>;
}
```

### `ImageResult`

```ts
interface ImageResult {
    bytes?: Uint8Array; // decoded image data
    url?: string; // remote URL (when response contains a URL)
    mime: string; // MIME type (e.g. "image/png")
    name?: string; // filename (available in ZIP responses)
}
```

---

## Utility Exports

### Binary Encoding

```ts
function encodeBase64(bytes: Uint8Array): string;
function decodeBase64(str: string): Uint8Array;
function bytesToDataUrl(bytes: Uint8Array, mime?: string): string;
```

### URL & Auth

```ts
function toFullUrl(baseUrl: string, suffix: string): string;
function authHeader(token: string, scheme?: string): Record<string, string>;
```

### MIME Detection

```ts
function inferMime(fileName: string, fallback?: string): string;
function inferImageMimeFromBytes(bytes: Uint8Array): string;
function looksLikeZip(bytes: Uint8Array, contentType: string): boolean;
```

### Response Parsing

```ts
function collectImagesFromJson(
    value: unknown,
    images?: ImageResult[]
): ImageResult[];
function normalizeUpstream(
    bytes: Uint8Array,
    contentType: string,
    headers?: Record<string, string>
): GenerationResult;
function normalizeZip(
    bytes: Uint8Array,
    contentType: string,
    headers?: Record<string, string>
): GenerationResult;
```

### Comparison

```ts
function timingSafeEqual(a: string, b: string): boolean;
```

---

## Transform Exports

```ts
function resolveConfig(config: NovelAIConfig): ResolvedConfig;
function transformGenerate(input: AnyGenerateInput): Record<string, unknown>;
function transformUpscale(input: UpscaleInput): Record<string, unknown>;
function transformAugment(input: AugmentInput): Record<string, unknown>;
function transformEncodeVibe(input: EncodeVibeInput): Record<string, unknown>;
function randomSeed(): number;
```

### `ResolvedConfig`

```ts
interface ResolvedConfig {
    token: string;
    baseUrl: string;
    timeoutMs: number;
}
```

---

## Constants

```ts
const MAX_RESPONSE_BYTES: number; // 100663296 (96 MB)
const DEFAULT_BASE_URL: string; // "https://image.novelai.net"
```

---

## Zod Schemas (Dev-Only)

```ts
const NovelAIConfigSchema;
const GenerateInputSchema;
const GenerateActionSchema;
const Img2ImgActionSchema;
const InfillActionSchema;
const UpscaleInputSchema;
const AugmentInputSchema;
const EncodeVibeInputSchema;
const ImageFormatSchema;
const StreamingTypeSchema;
const CharacterPromptSchema;
```

Schemas are dynamically imported in `import.meta.env.DEV` builds and fully
tree-shaken in production. They validate inputs during development.
