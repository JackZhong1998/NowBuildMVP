# Managed AI Gateway Contract

Call `runManagedAI` from `src/lib/nowbuild-ai.ts`.

```ts
const result = await runManagedAI({
  capability: 'text',
  system: 'You are a concise product research assistant.',
  messages: [{ role: 'user', content: input }],
  options: { maxTokens: 1200, temperature: 0.4 },
});
```

Capabilities and result fields:

| Capability | Input | Result |
| --- | --- | --- |
| `text` | `prompt` or `messages`, optional `system` | `output.text` |
| `image` | `prompt`, optional `aspectRatio`, `resolution` | `output.images[].dataUrl` |
| `video` | `prompt`, optional `duration`, `resolution`, `aspectRatio` | `output.jobId`; poll by calling again with `jobId` |
| `speech` | `prompt`, optional `voice`, `speed`, `responseFormat` | `output.audioUrl` |
| `transcription` | `options.inputAudio.data` base64 and `.format` | `output.text` |

Every completed response may include `credits`, `balance`, and provider-normalized `usage`. Handle HTTP 402 as insufficient credits and 429/limit errors as retryable. Music and 3D return an unavailable response until OpenRouter exposes a supported production endpoint and NowBuild enables it.
