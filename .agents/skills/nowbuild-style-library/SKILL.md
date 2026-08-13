---
name: nowbuild-style-library
description: Choose and implement an extensible visual preset for NowBuild-generated marketing sites and authenticated apps. Use when a user browses website styles, names a familiar product aesthetic, asks for a visual direction, or needs production-ready design tokens and page rules.
---

# NowBuild Style Library

Treat familiar products as references for design principles, never as templates to clone. Do not copy logos, illustrations, proprietary assets, or exact page compositions.

## Workflow

1. Match product, audience, desired emotion, content density, and business category to the catalog in `references/style-catalog.md`.
2. Return a selected `styleId` plus rationale, palette, typography, radius, density, hero composition, imagery, motion, and accessibility notes.
3. Turn the choice into semantic design tokens before building components.
4. Apply the same system to public pages and authenticated product UI; adapt density without changing identity.
5. Include empty, loading, error, focus, hover, active, mobile, and reduced-motion states.
6. Run a design review after implementation and reject generic, mixed-style output.

## Personal Website Mode

When the product is a personal site, portfolio, resume, creator home, expert profile, or academic page:

1. Read `references/style-catalog.md` and prioritize the eight personal-site profiles.
2. Ask what the site must win: employment, clients, audience, speaking invitations, research collaboration, or brand deals.
3. Put evidence before biography. Use selected work, case-study process, shipped outcomes, publications, talks, or real client proof; never fabricate metrics or logos.
4. Choose one primary conversion: inquiry, booking, subscribe, hire, download résumé, or collaborate.
5. Preserve editable HTML semantics, responsive layout, metadata, structured data, accessible motion, and fast loading even when the reference begins as a visual design or Canva export.
6. Treat Canva and template references as visual input. Rebuild the system in maintainable Next.js components; do not present rasterized pages or exported email HTML as production website source.

## Runtime Contract

Use only a `styleId` present in the application style catalog. The catalog is deliberately data-driven: new profiles can be added without changing the planner protocol or rebuilding the studio UI.

Each profile must define:

- `principles` and `bestFor`
- light/dark surfaces and WCAG-safe accent roles
- display/body/mono type direction
- spacing, radius, border, shadow, and motion rules
- public-site hero composition and product-workspace density
- `sourceLabel` that clearly says `inspired`, never `official` or `replica`
