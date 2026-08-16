# Supabase Auth Migration Tasks

- [x] Keep platform Clerk and migrate generated SaaS authentication foundation.
  - Acceptance: generated source uses Supabase Auth and contains no Clerk imports or manifest entries.
  - Verify: generated-project tests and a production build of a generated workspace.
  - Files: scaffold, template, generated-project tests.
- [x] Add reviewed Supabase MCP database migrations.
  - Acceptance: users preview SQL, explicitly confirm it, and apply only non-destructive migrations to one project-scoped development database.
  - Verify: migration safety tests and API contracts.
  - Files: MCP client, migration API, environment dialog and fields.
- [x] Update configuration, copy, schema, and dependencies.
  - Acceptance: Clerk keys/dependencies/copy are absent; Supabase publishable key and RLS ownership are documented.
  - Verify: repository search, tests, lint.
  - Files: env templates, package files, messages, schema, README.
- [x] Complete verification audit.
  - Acceptance: typecheck, lint, tests, build, and focused browser checks pass.
  - Verify: typecheck, lint, 31 unit/contract tests, platform/template/generated builds, and a fresh generated-project browser snapshot pass.
  - Files: fixes and task status.
