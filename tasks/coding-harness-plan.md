# Pi Coding Harness Plan

Follow [docs/pi-coding-harness-iteration.md](../docs/pi-coding-harness-iteration.md). Do not replace Pi. Do not start Phase 1 until Phase 0 has pass@3 notes for three golden cases.

1. Phase 0: run today’s Pi+Flash loop on one A, one B, and one C case; walk the primary path; record pass@3.
2. Phase 1: search tools, L1 sandbox, typecheck self-check, build repair, drop the 18-call cap, shorten the coder prompt, stop accepting dirty writes.
3. Phase 2: `NOWBUILD_CODE_MODEL=deepseek/deepseek-v4-pro`, medium thinking, longer attempt budget; re-run the three cases.
4. Phase 3: primary-path probe in the run; repair from probe failure; bucket C must call `nowbuild-ai`.
5. Phase 4: OS sandbox, default-off network, twelve-case MVP-Bench nightly.
6. Phase 5: containers only when concurrent tenants share a coding host.

Risks and mitigations:

- Current evals report 100 without running the agent: keep them as kit-health only; MVP-Bench is the coding KPI.
- Unconstrained bash on the platform host is a tenant-isolation bug: policy sandbox first, OS sandbox before public traffic.
- Swapping models without a baseline cannot be attributed: always compare against Phase 0.
- Planner skills in the coder prompt waste V4 Pro context: coder gets a one-page contract plus the confirmed plan.
