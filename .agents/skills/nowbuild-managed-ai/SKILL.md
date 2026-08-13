---
name: nowbuild-managed-ai
description: Implement AI-native product workflows in generated NowBuild SaaS projects using the platform-managed OpenRouter gateway. Use for AI chat, prompt testing, text generation, image generation, video generation, speech synthesis, transcription, or requests involving future music and 3D generation.
---

# NowBuild Managed AI

Build the product interaction against `src/lib/nowbuild-ai.ts`. Never call OpenRouter directly, request a user API key, place a secret in generated source, or fake an AI result.

## Workflow

1. Read `plan.ai`. Treat its capabilities, system prompt, primary use case, and output contract as product requirements.
2. Implement one complete input → loading → result → retry path before adding secondary AI features.
3. Call `runManagedAI({ capability, prompt, system, messages, options })` from the generated product.
4. Keep system-prompt editing explicit when prompt iteration is central to the product. Show the active prompt, a test input, model output, latency/loading state, and a clear retry action.
5. Render the returned modality correctly:
   - `text` and `transcription`: readable, copyable, editable text.
   - `image`: a real returned image plus regenerate/download actions.
   - `video`: pending/progress state, poll with `jobId`, then render returned URL.
   - `speech`: audio controls plus regenerate action.
6. Show the returned credit charge or remaining balance where it helps the user understand consumption.
7. Preserve useful inputs after an error. Never charge locally; the gateway owns usage accounting.

## Guardrails

- Do not expose `OPENROUTER_API_KEY` or accept it in the browser.
- Do not let the end user select arbitrary model slugs. NowBuild controls model routing and can upgrade models without rebuilding customer products.
- Do not store generated media or prompts in Supabase unless the PRD explicitly requires persistence and user consent.
- Keep prompt, message, upload, duration, and resolution controls bounded.
- Treat `music` and `3d` as unavailable until the gateway reports them ready. Explain the limitation in the product instead of substituting an unrelated endpoint.
- Use real empty, loading, success, failure, safety refusal, and insufficient-credit states.

Read [references/gateway-contract.md](references/gateway-contract.md) when implementing options or response rendering.
