---
name: nowbuild-seo-copy
description: Research positioning and create conversion-focused, search-ready website copy for NowBuild-generated SaaS products. Use when users ask for homepage messaging, landing-page copy, keyword mapping, metadata, FAQs, comparison pages, blog topics, structured data, or bilingual Chinese and English marketing content.
---

# NowBuild SEO Copy

Produce credible website copy that matches search intent and drives one clear conversion.

## Workflow

1. Extract audience, painful job, desired outcome, differentiator, proof, objections, primary conversion, market, and language. Mark missing facts as assumptions; never invent customer numbers or testimonials.
2. Choose one primary keyword and up to five supporting topics per page. Separate informational, commercial, and navigational intent.
3. Write the page in this order: metadata, H1/hero, problem, mechanism, benefits, proof placeholders, feature details, objections/FAQ, final CTA.
4. Use specific outcomes and plain language. Keep one claim per sentence and one primary CTA label across the page.
5. Produce title, meta description, canonical path, Open Graph copy, FAQ suggestions, internal links, and JSON-LD type recommendation.
6. Map copy into the existing next-intl message files. Preserve meaning across Chinese and English rather than translating literally.
7. Check heading order, duplicate intent, unsupported claims, keyword stuffing, and mobile text length.

## Message Strategy

- Hero: outcome + audience/context; avoid slogans that could fit any SaaS.
- Subheadline: painful current state → product mechanism → specific result.
- CTA: name what the user receives, not `提交/了解更多/Get started`.
- Benefits: connect feature → practical consequence → business outcome.
- Proof: use placeholders until the founder supplies real evidence. Never fabricate customer logos, usage numbers, or testimonials.
- FAQ: answer the objections that block the primary conversion.

## Output Contract

Return structured JSON that can be rendered and passed to the coding agent:

```json
{
  "copy": {
    "eyebrow": "", "headline": "", "subheadline": "",
    "cta": "", "secondaryCta": "",
    "problemTitle": "", "problemBody": "",
    "benefits": [{ "title": "", "body": "" }],
    "steps": [{ "title": "", "body": "" }],
    "faq": [{ "question": "", "answer": "" }]
  },
  "seo": {
    "title": "", "description": "", "primaryKeyword": "",
    "supportingKeywords": [""], "canonical": "",
    "schemaTypes": ["SoftwareApplication", "FAQPage"]
  }
}
```

When editing code, preserve metadata helpers, sitemap generation, localization, canonical/hreflang behavior, semantic headings, and JSON-LD. Chinese and English copy should preserve intent rather than translate literally.
