# Spec: AI Product Building Platform

## Objective

Extend NowBuild's AI Coding studio so a founder can compose a real AI product from four first-class resources: the managed OpenRouter gateway, imported Skills, installed MCP servers, and uploaded image/video assets.

User stories:

- As a founder, I can enable generative AI capabilities while NowBuild keeps provider keys and model routing on the server.
- As a founder, I can import a `SKILL.md` or install/configure an MCP server for one project, and the coding agent receives the selected resources when building.
- As a founder, I can browse a searchable MCP catalog and install an entry into the active project.
- As a founder, I can upload reusable images/videos, preview them, remove them, and instruct the coding agent to use them.
- As a tester, I can configure a Didi MCP contract for place search and ride ordering without the product pretending that an unavailable provider call succeeded.

## Product Decisions

- Model selection is platform-controlled. `NOWBUILD_MODEL` controls the coding/planning model and per-capability `NOWBUILD_AI_*_MODEL` variables control generated-product inference. Browser clients cannot send arbitrary model slugs.
- Skills are project-scoped Markdown instructions. Imported content is bounded, stored with project metadata, and explicitly injected into the coding agent prompt.
- MCP definitions are project-scoped remote-server configurations. Secrets are environment-variable references such as `DIDI_MCP_TOKEN`, never stored inline.
- The catalog is curated application data with clear transport, authentication, tool, and verification metadata. Installing creates an editable project configuration.
- Development storage remains filesystem-backed, matching existing project sessions. The asset API owns the boundary so object storage can replace it later.
- Didi is represented as a provider integration template. The test contract covers `search_places` and `create_ride`; the UI and generated code must expose configuration/error states and never fake a successful ride.

## Tech Stack

- Next.js 15 App Router, React 19, TypeScript 5.8
- Tailwind CSS 4
- Vitest for unit/contract tests; Playwright for browser workflows
- Existing server-only project session and generated-project workspace stores

## Commands

- Install: `npm ci`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Unit/contract tests: `npm test`
- Production build: `npm run build`
- Browser tests: `npm run test:e2e`
- Development: `npm run dev`

## Project Structure

- `src/lib/nowbuild/` — resource schemas, catalog, stores, planning and coding-agent integration
- `src/app/api/projects/[projectId]/resources/` — authenticated project resource APIs
- `src/app/[locale]/mcp/` — public MCP catalog page
- `src/components/studio/` — project resource and asset UI
- `tests/` — resource validation and agent contract tests
- `tests/e2e/` — studio workflows
- `docs/` — this living product specification

## Code Style

Use typed server boundaries and validate every browser-controlled field before persistence:

```ts
const resource = parseMCPServer(input);
await updateProjectSession(projectId, userId, {
  resources: { ...project.resources, mcpServers: [...mcpServers, resource] },
});
```

Prefer focused components, semantic HTML controls, visible labels, keyboard access, and existing studio color/spacing tokens.

## Testing Strategy

- Unit tests prove bounded validation, secret-reference handling, model-routing controls, catalog integrity, and prompt serialization.
- API behavior is covered through pure validators/stores where route-level mocking would add little signal.
- Existing generated-project and managed-AI tests remain green.
- Production build proves server/client boundaries and route compilation.
- Playwright covers opening project resources, installing a catalog MCP, importing a Skill, uploading an asset, and responsive rendering where the authenticated development fallback permits it.

## Boundaries

- Always: authenticate project mutations, enforce ownership, sanitize names/content, cap uploads, preserve provider errors, keep resource injection explicit.
- Ask first: introducing a paid external service, changing production persistence providers, or making a live ride-order call.
- Never: expose `OPENROUTER_API_KEY`, accept arbitrary model slugs from the browser, persist inline MCP secrets, execute an imported Skill during import, or claim a ride was booked without a provider response.

## Success Criteria

1. Managed AI supports text, image, video, speech and transcription through the server gateway; platform environment variables select models and browser payloads cannot override them.
2. Each project can list/add/remove Skills and MCP servers. The build agent receives enabled resources and writes an MCP-ready generated project configuration.
3. A localized, searchable MCP catalog page exists. An active project can install a catalog entry, including the Didi mobility template.
4. The Didi template declares place search and ride creation tools, required environment keys, consent/safety notes, and explicit unavailable/error behavior.
5. Each project can upload/list/delete image and video assets with validation. The studio previews them and the build agent receives stable project asset paths and metadata.
6. Empty, loading, success and error states are present; core controls are labeled and keyboard operable; layout remains usable on mobile and desktop.
7. Typecheck, lint, unit tests and production build pass, with tests that directly cover criteria 1–5.

## Open Questions

- Production object storage provider and retention policy are intentionally deferred; the API contract must remain provider-neutral.
- A live Didi MCP endpoint, credentials and commercial authorization are required before production ride ordering can be verified.
