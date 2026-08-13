---
name: nowbuild-design-system
description: Select a coherent visual direction and produce implementation-ready design rules for a NowBuild SaaS marketing site or authenticated product UI. Use when users ask for page style choices, design systems, UI specifications, landing pages, dashboards, or consistent visual implementation in the bundled Next.js and Tailwind starter.
---

# NowBuild Design System

Turn a product brief into a small set of visual choices, then implement the selected direction consistently.

## Workflow

1. Read the product, audience, positioning, and existing UI before proposing changes.
2. Read `nowbuild-style-library` and offer a browsable, diverse catalog. Do not reduce the product to three generic choices.
3. Recommend one direction with a one-sentence rationale, while keeping every catalog option available. If the user has not chosen, proceed with the recommendation and state the assumption.
4. Define reusable tokens for color, type scale, spacing, radius, shadow, motion, container width, and breakpoints. Prefer CSS variables and Tailwind utilities already used by the starter.
5. Specify the public site and product shell: navigation, hero, proof, feature sections, CTA, footer, sidebar, top bar, empty/loading/error states, forms, and responsive behavior.
6. Implement shared components before page-specific markup. Preserve Clerk, Stripe, Supabase, next-intl, metadata, keyboard access, and semantic HTML.
7. Verify desktop and mobile layouts, contrast, focus states, overflow, loading states, and visual consistency. Use the project Playwright skill when available.

## Quality Bar

- Use one dominant visual idea; avoid arbitrary gradients, excessive cards, and mixed radius styles.
- Make hierarchy obvious at a glance and keep the primary action visually unique.
- Meet WCAG AA contrast for normal text and retain visible keyboard focus.
- Do not add a new component library unless existing primitives cannot satisfy the design.
- Return a short design spec, changed files, and verification result.
