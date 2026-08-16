# Supabase Auth Migration Plan

1. Keep the NowBuild platform on Clerk and introduce request-scoped Supabase clients only in generated projects.
2. Replace generated-project Clerk pages, providers, navigation state, protected routes, and dependencies.
3. Add reviewed, project-scoped Supabase MCP schema migrations.
4. Update environment contracts, product copy, database ownership policies, and authentication contract tests.
5. Run typecheck, lint, unit tests, template and generated-project production builds, and focused browser verification.

Risks and mitigations:

- Cookie refresh and locale middleware can overwrite each other's responses: compose routing with the refreshed response and copy changed cookies.
- Service-role clients bypass RLS: keep the service client server-only and require explicit authenticated user filters.
- Platform Clerk IDs stay unchanged; only generated products use Supabase UUIDs, so there is no cross-system user migration.
- Email confirmation redirects can fail on preview domains: document and validate Supabase Site URL and Vercel preview redirect patterns.
