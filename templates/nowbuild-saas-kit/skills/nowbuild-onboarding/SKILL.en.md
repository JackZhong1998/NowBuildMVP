---
name: nowbuild-onboarding
description: Help users onboard and run NowBuild SaaS Kit quickly on Cursor, Claude Code, and Codex. Use this skill whenever users mention framework setup, quick start, environment variable configuration, local startup failures, integration in Cursor/Claude Code/Codex, or pre-deployment checks. Provide step-by-step executable commands and verification checkpoints so users can boot locally and connect core services with minimal friction.
---

# NowBuild Onboarding Skill (English)

## Goal

Help users achieve the following as fast as possible:

1. Install dependencies and start the project successfully.
2. Configure `.env.local` correctly without leaking secrets.
3. Connect the minimum required auth, payment, database, and analytics configuration.
4. Reuse one onboarding flow across Cursor, Claude Code, and Codex.

## Project Facts (Fixed)

- Project name: `nowbuild-saas-kit`
- Stack: Next.js 15 + TypeScript + Tailwind CSS 4
- Core services: Clerk, Stripe, Supabase, Google Analytics
- Core commands:
  - Install: `npm install`
  - Dev: `npm run dev`
  - Build: `npm run build`
  - Start: `npm run start`
- Env template: `.env.example`
- Database initialization SQL: `supabase/schema.sql`

## Non-Negotiable Rules

1. Never print raw user secrets; only masked values (for example `sk_test_****`).
2. Always remind users not to commit `.env.local`.
3. Run the minimum working path first (local start + homepage access), then advanced setup (webhooks, production deployment).
4. Provide copy-paste-ready commands at each step.

## Standard Workflow

### Step 1: Detect Context

Confirm these points first (ask only what is missing):

- Platform: Cursor / Claude Code / Codex
- Whether the user is in the project root
- Whether Node.js is >= 18
- Whether `.env.local` already exists
- Whether user wants local startup only or full third-party service integration

### Step 2: Run the Fastest Startup Path

Default command set:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then ask user to open `http://localhost:3000` to verify the site is reachable.

### Step 3: Guide Minimum Environment Variables

Explain the two-phase approach:

- **Phase A (structure check)**: keep placeholders and verify the app boots.
- **Phase B (feature wiring)**: fill real keys service by service.

Guide values in this order:

1. Clerk
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
2. Stripe
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID`
3. Supabase
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Analytics
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Step 4: Initialize Database (When Using Real Supabase)

Tell user to run the SQL from `supabase/schema.sql` in Supabase SQL Editor.

### Step 5: Acceptance Checks

At minimum, verify:

- `/` opens
- `/sign-in` opens
- `/pricing` opens
- No blocking console errors (port conflict, missing env, build crash)

## Platform-Specific Notes

### Cursor

- Prefer the built-in terminal in project root.
- Edit `.env.local` directly when configuration is needed.
- If user says "do it for me," execute the standard workflow and report result per step.

### Claude Code

- Execute the same CLI workflow, but summarize each step as status: success/failure/next action.
- If environment limitations appear (permission/network), provide fallback (placeholder-based local boot first).

### Codex

- Prioritize concise command-first responses with explicit checkpoints.
- If direct repo changes are requested, keep edits minimal (usually `.env.local` and docs only).
- Provide reproducible troubleshooting commands so users can rerun independently.

## Common Errors and Fixes

1. `Missing environment variable ...`
   - Check `.env.local` exists, variable names match exactly, and restart dev server.

2. Stripe webhook not firing locally
   - Guide:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   - Put emitted `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

3. Supabase queries fail or tables missing
   - Confirm `supabase/schema.sql` was executed.
   - Confirm URL and keys come from the same Supabase project.

4. Node version mismatch
   - Upgrade to Node.js 18+ and rerun `npm install`.

## Response Format

Prefer this structure in every response:

1. Current state (1-2 lines)
2. Commands to run now (code block)
3. Expected result (1-3 bullets)
4. Failure checks (max 3 bullets)
5. Single clear next step

## Example Trigger Requests

- "Help me run this SaaS framework in Cursor."
- "I want to set up this open-source project in Claude Code."
- "How do I configure env quickly in Codex for this repo?"
- "I followed README but local startup still fails."
