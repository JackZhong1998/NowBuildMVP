# Pi Coding Harness Tasks

- [ ] Phase 0 baseline on three golden cases (A workflow, B commerce, C AI-native).
  - Acceptance: each case run 3× on current Pi+Flash; primary path walked; pass@3 and failure notes written under `evals/mvp-bench/baseline/`.
  - Verify: notes name the commit (`f14d5f2` or later HEAD) and whether the agent actually ran (`mode: pi`).
  - Files: `evals/mvp-bench/`, this todo.

- [ ] Policy sandbox, search, and repair loop (Phase 1).
  - Acceptance: workspace-bound paths; argv allowlist for tsc/lint/test/rg; lint/build stderr truncated and fed back up to two repair turns; 18-call prompt cap removed; coder prompt no longer includes the planner skill dump; timeout-after-write is not auto-success.
  - Verify: new contract tests for path escape, denied commands, secret-free child env, and repair prompt contents; `npm test` / typecheck / lint.
  - Files: `src/lib/nowbuild/pi-agent.ts`, `agent-timeout-policy.ts`, `skill-runtime.ts`, new `agent-sandbox.ts` / `agent-repair.ts`, tests.

- [ ] DeepSeek V4 Pro as coder (Phase 2).
  - Acceptance: planner remains Flash; coder is `deepseek/deepseek-v4-pro`; browser cannot set the slug; attempt budget fits Pro (minutes, not 18 rushed calls).
  - Verify: `tests/pi-contract.test.ts` plus the same three golden cases vs Phase 0/1.
  - Files: `pi-agent.ts`, `.env.example`, `project-planner.ts` (planner model unchanged).

- [ ] Primary-path acceptance (Phase 3).
  - Acceptance: preview probe is part of a successful run; failure repairs once; bucket C code contains `nowbuild-ai` / `runManagedAI`; fake `setTimeout` AI fails the case.
  - Verify: probe contract tests and one Playwright golden path.
  - Files: new `agent-probe.ts`, `pi-agent.ts`, `evals/mvp-bench/`.

- [ ] MVP-Bench as coding KPI.
  - Acceptance: 12 cases in 4 buckets; gates for repo health, primary path, not-a-shell; report pass@1 and pass@3; public evaluations page no longer presents kit-build 100 as coding quality.
  - Verify: `npm run eval:mvp` documented; nightly instructions in the spec.
  - Files: `evals/mvp-bench/`, `tests/evals.test.ts`, `src/app/[locale]/evaluations/page.tsx`.

- [ ] OS sandbox and default-off network (Phase 4).
  - Acceptance: bash/tool I/O confined with sandbox-runtime or equivalent; egress denied unless an allowlisted docs/registry path is explicitly enabled.
  - Verify: contract tests for network deny; no OpenRouter key inside the sandbox.
  - Files: sandbox extension wiring, `agent-sandbox.ts`.

- [ ] Containers when tenancy requires it (Phase 5).
  - Acceptance: one project’s build cannot starve another tenant’s coding host.
  - Verify: ops note + one soak on two concurrent projects.
  - Files: deploy/runtime docs, optional container runner.
