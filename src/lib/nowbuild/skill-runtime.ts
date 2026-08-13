import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const compactSkills = [
  'nowbuild-product-prd',
  'nowbuild-seo-copy',
  'nowbuild-design-system',
  'nowbuild-style-library',
  'nowbuild-managed-ai',
] as const;

let cached: string | undefined;

function removeFrontmatter(value: string) {
  return value.replace(/^---[\s\S]*?---\s*/, '').trim();
}

export async function loadNowBuildSkillPrompt() {
  if (cached) return cached;
  const root = join(process.cwd(), '.agents', 'skills');
  const parts = await Promise.all(compactSkills.map(async (name) => {
    const content = await readFile(join(root, name, 'SKILL.md'), 'utf8');
    return `\n## SKILL: ${name}\n${removeFrontmatter(content)}`;
  }));
  cached = parts.join('\n').slice(0, 24_000);
  return cached;
}
