import 'server-only';
import { cp, lstat, mkdir, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

const PROJECT_ROOT = join(tmpdir(), 'nowbuild-projects');
const EXCLUDED = new Set(['.git', '.next', 'node_modules', '.agents', 'coverage', 'test-results']);

function safeId(projectId: string) {
  if (!/^[a-z0-9-]{8,64}$/i.test(projectId)) throw new Error('Invalid project id');
  return projectId;
}

export async function ensureProjectWorkspace(projectId: string) {
  const target = resolve(PROJECT_ROOT, safeId(projectId));
  if (!target.startsWith(resolve(PROJECT_ROOT) + sep)) throw new Error('Unsafe project path');
  try {
    await stat(join(target, 'package.json'));
    return target;
  } catch {
    // Create a fresh copy of the SaaS starter for every user project.
  }
  const template = resolve(process.env.NOWBUILD_TEMPLATE_DIR || join(process.cwd(), 'templates', 'nowbuild-saas-kit'));
  await mkdir(PROJECT_ROOT, { recursive: true });
  await cp(template, target, {
    recursive: true,
    filter(source) {
      const parts = source.split(sep);
      return !parts.some((part) => EXCLUDED.has(part));
    },
  });
  const sharedModules = join(process.cwd(), 'node_modules');
  try {
    await lstat(sharedModules);
    await symlink(sharedModules, join(target, 'node_modules'), 'junction');
  } catch {
    // A remote worker may install dependencies inside its own sandbox instead.
  }
  return target;
}
