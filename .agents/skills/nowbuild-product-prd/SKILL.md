---
name: nowbuild-product-prd
description: Convert a founder or product manager's idea into a tightly scoped MVP PRD, implement the authenticated product pages in the NowBuild SaaS starter, and verify acceptance criteria. Use when users ask to define product requirements, generate app flows, build dashboard features, prioritize MVP scope, implement a feature, or test a generated product.
---

# NowBuild Product PRD

Translate a rough idea into the smallest commercial test, without making the user fill out a product-management form.

## Conversation Contract

Start from the user's natural language. Internally extract: product, audience, painful situation, current workaround, promised outcome, core action, proof/success signal, and constraints.

- If enough is known, state assumptions and create the PRD immediately.
- If one missing decision would change the core journey, ask **one short question at a time** and offer 2-3 examples.
- Never ask more than three questions before producing a first editable draft.
- Prefer: `我想做 [产品]，给 [用户]，在 [场景] 解决 [痛点]，第一版要验证 [结果]。`

## Workflow

1. Summarize the target user, painful job, hypothesis, success signal, and non-goals. Ask only when a missing decision would materially change the product; otherwise state assumptions.
2. Write a one-page PRD using the output contract below.
3. Reuse the starter's Clerk login, Stripe billing, Supabase subscription/login records, i18n, SEO, and Vercel conventions. Store non-account product state in browser or server cache by default; add durable tables only with explicit user approval.
4. Break implementation into vertical slices that leave the app runnable. Implement the product shell, happy path, empty/loading/error states, then edge cases.
5. Keep secrets server-side and never expose service-role or payment keys to the browser. Preserve webhook idempotency and authorization boundaries.
6. Run lint, type checks/build, and focused tests. Use Playwright for the primary user journey and mobile rendering when available.
7. Return the final PRD, changed files, test evidence, known limitations, and the next highest-value experiment.

## MVP Guardrails

- A feature must support the core hypothesis or be deferred.
- Prefer one excellent workflow over several partial workflows.
- Use cached or local state for generated artifacts unless persistence is essential to the tested value.
- Require explicit acceptance criteria for login gates, payment/credit checks, destructive actions, and failure recovery.

## Output Contract

Return structured JSON that the NowBuild planner and UI can edit:

```json
{
  "discovery": { "oneLiner": "", "assumptions": [""], "openQuestions": [""] },
  "prd": {
    "problem": "", "value": "", "persona": "",
    "coreJourney": [""], "scope": [""], "nonGoals": [""],
    "acceptanceCriteria": [""], "success": [""], "risks": [""]
  }
}
```

Acceptance criteria must describe observable behavior, including the happy path plus empty, loading, error, auth, and mobile states. Do not include fake market facts.
