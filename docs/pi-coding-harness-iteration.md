# Spec: Pi Coding Harness Iteration

## Objective

Keep Pi as NowBuild’s embedded coding runtime. Do not build a new agent framework. Turn the current thin `read/write/edit` loop into a coding harness that can, from a confirmed PRD, produce an MVP a stranger can actually try.

The product promise is one thing: a founder can assemble a chargeable AI product on this platform. The SaaS kit is the shell. Coding quality is the core. This iteration exists because the core is not yet proven.

User stories:

- As a founder, I get a generated product whose primary workflow runs, fails honestly, and is not a restyled empty `run()`.
- As a founder building an AI product, the generated app calls `src/lib/nowbuild-ai.ts` instead of faking results.
- As the platform, untrusted model commands cannot leave the project workspace, read platform secrets, or reach the public internet unless we explicitly allow a host.
- As the team, we can tell whether a change to the harness helped, because every coding change is judged against the same MVP-Bench and a small public-benchmark slice.

## Product Decisions

- Stay on `@mariozechner/pi-coding-agent`. Switching to Claude Agent SDK is out of scope unless MVP-Bench C-bucket still fails after V4 Pro + repair + sandbox.
- Planner stays `deepseek/deepseek-v4-flash`. Coder becomes `deepseek/deepseek-v4-pro` (`NOWBUILD_CODE_MODEL`). The browser cannot override model slugs.
- Success is a closed loop: edit → sandboxed self-check → platform lint/build → preview → primary-path probe → repair on failure. Assistant prose is not acceptance.
- Tools exist to close information gaps (find files, see errors, see the running UI). Do not copy Cursor’s full tool list. No general computer-use, no hanging user MCP onto the coder, no unconstrained bash on the host.
- Sandbox is mandatory because the agent runs on our servers, not on a user’s laptop. Policy sandbox first, OS sandbox before public coding traffic, containers when we have concurrent tenants.
- Current `evals/` repository-build scores measure kit health, not coding. They must not be used as the coding KPI.

## Tech Stack

- Pi coding agent SDK, OpenRouter, DeepSeek V4 Flash / V4 Pro
- Project workspace already created by `ensureProjectWorkspace`
- Pi extensions: `registerTool`, `tool_call` intercept, optional `@anthropic-ai/sandbox-runtime`
- Playwright for primary-path probes and snapshots
- Vitest for policy/contract tests; a nightly runner for MVP-Bench

## Commands

- Install: `npm ci`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Unit/contract: `npm test`
- Current kit evals (not coding KPI): `npm run eval`
- Browser: `npm run test:e2e`
- Dev: `npm run dev`

New commands to add during this iteration:

- `npm run eval:mvp` — run MVP-Bench (agent + build + primary path)
- `npm run eval:harness-slice` — optional SWE-bench Verified / terminal-repair slice, offline only

## Project Structure

- `src/lib/nowbuild/pi-agent.ts` — session loop, model routing, timeouts, repair
- `src/lib/nowbuild/agent-timeout-policy.ts` — timeout outcomes
- `src/lib/nowbuild/skill-runtime.ts` — do not dump planner skills into the coder
- `src/lib/nowbuild/preview-runtime.ts` — preview process used by probes
- New (expected): `src/lib/nowbuild/agent-sandbox.ts` — path + command + env policy
- New (expected): `src/lib/nowbuild/agent-repair.ts` — feed lint/build/probe stderr back
- New (expected): `src/lib/nowbuild/agent-probe.ts` — primary-path Playwright/fetch checks
- `evals/` — replace coding claims; keep kit-health sets if useful
- New (expected): `evals/mvp-bench/` — 12 product cases
- `docs/pi-coding-harness-iteration.md` — this living spec
- `tasks/coding-harness-plan.md` / `tasks/coding-harness-todo.md` — execution checklist

## Code Style

- Typed boundaries for every tool argument. Resolve paths with `realpath` and require a workspace prefix before any read/write/exec.
- Parse command allowlists as argv, never as substring match.
- Truncate tool stdout/stderr (about 8KB) before it re-enters the model.
- Keep the coder system prompt short and stable. Put the confirmed plan JSON in the user turn, not inside 24KB of skill markdown.
- Do not log or persist `OPENROUTER_API_KEY`, Stripe secrets, or platform Clerk keys into generated workspaces.

## Testing Strategy

Three layers, different jobs.

### 1. Contract tests (CI)

Prove the harness cannot violate platform rules even if the model tries:

- Path escape rejected
- Disallowed bash rejected
- Platform secrets absent from the child env
- Repair prompt contains truncated compiler stderr
- Timeout after a write still runs typecheck; failure is not accepted as success
- Coder prompt does not include the full planner skill dump

### 2. MVP-Bench (nightly / release gate) — product north star

Twelve cases, four buckets of three:

| Bucket | What it proves | Examples |
| --- | --- | --- |
| A Workflow | Real product, not a reskin | onboarding checklist, incident timeline, inbound tracker |
| B Commerce | Login + core job; Stripe routes remain | waitlist preorder, local menu orders, media-kit inquiries |
| C AI-native | Real managed gateway | video→script, topic→course outline, prompt workbench |
| D Resources | Skills / configured MCP / uploaded assets actually used | MCP allowed to fail honestly; assets used by `publicPath` |

Each case includes brief, confirmed plan, primary-path script, and forbidden patterns (fake `setTimeout` AI, empty `run()`, ripped-out auth).

Three gates, all required for Pass:

1. **Repo health (30)** — lint, production build, auth/stripe/i18n routes remain, no platform secrets in the repo.
2. **Primary path (45)** — preview opens; main CTA works; loading and failure states exist; bucket C hits `runManagedAI` / `nowbuild-ai` (gateway may be mocked, the call chain may not).
3. **Not a shell (25)** — meaningful diff from scaffold; RLS tables if the plan requires persistence; weekly human spot-check: a stranger can finish the job in two minutes.

Report **pass@1 and pass@3**. One lucky green run is not a result.

Required ablations on the same three golden cases (A/B/C one each):

- scaffold only (current evals’ true baseline)
- Flash, no bash (today)
- Pro, no bash
- Pro + sandbox shell + repair
- Pro + full loop including primary-path repair

If only swapping Pro does nothing and repair moves the score, keep investing in the harness, not a vendor SDK.

### 3. External slice (engine calibration, not marketing)

Small SWE-bench Verified slice (25–50) and a 10-case terminal/repair set. Offline, rare, never CI. Goal: V4 Pro on this Pi harness is not crippled versus the same model with manual bash. Not a claim of beating Claude Code.

HumanEval / MBPP are out: they measure completion, not a harness.

## Boundaries

Always:

- Authenticate project builds; charge only after a real Pi run that the platform accepted.
- Keep coder workspace-scoped; intercept tools; default network off.
- Preserve Auth, Stripe, i18n, SEO unless the user instruction explicitly changes copy, not foundations.
- Feed verification failures back into a repair turn instead of failing the whole job with no second look.

Ask first:

- Opening general egress or `npm install` of arbitrary packages.
- Introducing paid sandbox/VM infrastructure.
- Changing coding model away from DeepSeek V4 Pro.
- Replacing Pi with Claude Agent SDK.

Never:

- Accept timeout writes as success without typecheck/build.
- Let the model choose arbitrary model slugs or see `OPENROUTER_API_KEY`.
- Attach founder MCP servers as Pi tools. MCP belongs in generated product code via `nowbuild-mcp.ts`.
- Ship unconstrained host bash.
- Treat the existing 17/17 repository-build 100 scores as coding quality.

## Success Criteria

1. Phase 0 baseline exists: three golden cases run through **today’s** Pi+Flash loop, with pass@3 and written failure notes.
2. Coder uses `deepseek/deepseek-v4-pro`; planner stays Flash.
3. Policy sandbox allows `tsc` / lint / focused test / `rg`; path and env are locked to the project.
4. Lint/build/probe failure triggers up to two repair turns with truncated stderr.
5. The 18-tool-call prompt cap is gone; a higher hard cap exists only to stop loops.
6. Coder context is a one-page contract plus the plan, not the planner skill pack.
7. Timeout-after-write runs verification; red builds are repaired or failed, not accepted.
8. MVP-Bench is the coding KPI. Bucket C pass@1 starts at 2/3 and is the release bar to raise, not a vanity 100.
9. Public `/evaluations` either shows MVP-Bench (agent actually ran) or stops implying kit-build scores are coding quality.

## Phases

Do not skip Phase 0. Later phases have no denominator without it.

### Phase 0 — Measure the lie (2–3 days)

Run Pi as it exists (Flash, no bash, 18-call cap) on three golden cases. Manually walk the primary path. Record pass@3. This is the baseline for every later claim.

### Phase 1 — Let the model see errors

Search tools; L1 policy sandbox; self-check typecheck; build-failure repair; remove the 18-call sentence; shorten the coder prompt; stop accepting dirty writes. Model may still be Flash so the loop is isolated from the model swap.

### Phase 2 — V4 Pro

Set `NOWBUILD_CODE_MODEL=deepseek/deepseek-v4-pro`, thinking medium, longer attempt budget (in the 8–12 minute range, within the existing 800s route). Re-run the three golden cases against Phase 0/1.

### Phase 3 — Primary path is acceptance

Playwright (or equivalent) probe in the run. Failure comes back as a repair turn. Bucket C asserts `nowbuild-ai`. This is the first time we may say the core can be validated.

### Phase 4 — OS sandbox, optional docs fetch, 12-case nightly

Linux bubblewrap / Pi sandbox-runtime before untrusted public coding traffic. Network still default-off; documentation hosts on an allowlist only if needed. Expand MVP-Bench to 12 cases.

### Phase 5 — Containers

Per-project isolation when concurrent tenants share a coding host. Operations, not coding intelligence. Do not pull this forward to “feel production.”

## Tool and sandbox map

Must have: workspace-bound read/write/edit, grep/find, policy-sandboxed commands, automatic stderr repair, primary-path probe.

Second: allowlisted `fetch`, `preview_snapshot`, todo/progress events, `npm install` only against lockfile/allowlist.

Not in this iteration: general browser-use, sub-agents rewriting the kit, Pi-level MCP, unconstrained bash, replacing Pi.

Sandbox layers:

1. Policy (path, argv allowlist, purged env, timeouts, truncated output).
2. OS (`sandbox-runtime` / bubblewrap) before public coding.
3. Container/OpenShell when tenancy requires it.

Network is a separate policy from “has shell”. Coding default is `network=none`. Generated-product AI always goes through the platform gateway, never OpenRouter from inside the sandbox.

## Risks

- V4 Pro is slower and costlier than Flash. Mitigate with Flash planner, Pro only on coding, and not charging if the engine never writes.
- Allowlist-by-string is bypassable. Mitigate with argv parsing and L2.
- Primary-path probes are brittle. Keep scripts in the case JSON and treat probe flakes as harness bugs, not silent passes.
- Repair loops can spend credits on a hopeless scaffold. Cap repair at two turns and fail closed.

## Out of scope

Abstracting a public “agent SDK” for founders, LangChain-style context frameworks, and replacing the SaaS kit. Founders consume `nowbuild-ai.ts` and the kit, not our Pi loop.
