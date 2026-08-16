# Spec: Supabase Auth Migration

## Objective

Replace Clerk with Supabase Auth only in generated SaaS projects. The NowBuild platform itself keeps Clerk. Generated email/password authentication must use cookie-backed server-side sessions, protected pages and APIs must reject unauthenticated users, and Supabase Row Level Security must identify the signed-in user through `auth.uid()`.

Generated previews keep a safe setup-guidance fallback while Supabase is unconfigured. NowBuild can apply generated database schema through the official project-scoped Supabase MCP only after the user reviews and confirms the SQL. Social OAuth and custom SMTP are outside this migration.

## Tech Stack

- Next.js 15 App Router, React 19, TypeScript 5.8
- `@supabase/supabase-js` and `@supabase/ssr`
- Supabase Postgres and Row Level Security
- Vitest and Playwright

## Commands

- Install: `npm install`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Unit/contract tests: `npm test`
- Production build: `npm run build`
- Browser tests: `npm run test:e2e`

## Project Structure

- `src/lib/nowbuild/scaffold.ts` — generated-project authentication source
- `src/lib/nowbuild/supabase-mcp.ts` — reviewed, project-scoped migration execution
- `src/app/api/projects/[projectId]/environment/migrate/` — migration preview and confirmation API
- `templates/nowbuild-saas-kit/` — reusable generated-project baseline
- `tests/` — authentication and generated-source contracts

## Code Style

Create a request-scoped server client and validate the user on the server:

```ts
const supabase = await createServerSupabase();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

Never reuse a user-scoped Supabase client across requests. Keep the service-role client separate and server-only.

## Testing Strategy

- Contract tests verify Clerk imports and environment keys are absent.
- Contract tests verify generated projects contain SSR clients, auth forms, a confirmation route, and Supabase route protection.
- Existing billing, generated-project, managed-AI, and project ownership tests remain green.
- Typecheck, lint, production build, and relevant Playwright flows validate framework boundaries.

## Boundaries

- Always: keep platform Clerk unchanged; use `auth.getUser()` inside generated products; refresh cookie sessions; preserve locale-aware redirects; keep RLS-compatible UUID strings; preview SQL before migration.
- Ask first: social OAuth providers, custom SMTP, changing production storage, or provisioning Supabase projects on a user's behalf.
- Never: expose the service-role or MCP access token to generated runtimes; trust `getSession()` alone for authorization; log tokens; apply destructive or unconfirmed migrations.

## Success Criteria

1. `@clerk/nextjs` remains in the NowBuild platform but is removed from generated template dependencies and source.
2. Generated email/password sign-up, sign-in, sign-out, and confirmation flows use Supabase Auth.
3. Generated dashboards and authenticated APIs resolve the Supabase user UUID; unauthenticated configured deployments redirect or return 401.
4. Generated projects contain the same Supabase Auth foundation and identify it as `supabase-auth` in their manifest.
5. Users can preview non-destructive `supabase/schema.sql`, explicitly confirm it, apply it through project-scoped Supabase MCP, and verify resulting tables.
6. Supabase MCP and Vercel management credentials are never injected into the generated runtime.
7. Typecheck, lint, tests, and production build pass.

## Open Questions

- Google/GitHub OAuth and production custom SMTP are intentionally deferred.
- Automated creation and migration of each user's Supabase project remains a guided manual setup step.
