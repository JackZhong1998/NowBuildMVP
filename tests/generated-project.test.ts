import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applySaasKitScaffold } from '@/lib/nowbuild/scaffold';
import { ensureProjectWorkspace } from '@/lib/nowbuild/workspace';

describe('generated SaaS project', () => {
  it('creates real full-site source on top of the SaaS kit', async () => {
    const projectId = 'test-real-saas-project';
    const cwd = await ensureProjectWorkspace(projectId);
    await applySaasKitScaffold(cwd, projectId, {
      name: 'ProofPilot',
      idea: '把用户访谈转成可验证的产品结论',
      audience: '产品经理和创业者',
      coreFeature: '录入访谈并生成证据、结论和下一步实验',
      style: 'linear-dark',
      locale: 'zh',
    });

    const homepage = await readFile(resolve(cwd, 'src/app/[locale]/page.tsx'), 'utf8');
    const workspace = await readFile(resolve(cwd, 'src/components/generated/ProductWorkspace.tsx'), 'utf8');
    const aiClient = await readFile(resolve(cwd, 'src/lib/nowbuild-ai.ts'), 'utf8');
    const aiRoute = await readFile(resolve(cwd, 'src/app/api/nowbuild-ai/route.ts'), 'utf8');
    await expect(stat(resolve(cwd, 'src/app/api/create-checkout-session/route.ts'))).resolves.toBeTruthy();
    await expect(stat(resolve(cwd, 'src/app/api/webhooks/stripe/route.ts'))).resolves.toBeTruthy();
    await expect(stat(resolve(cwd, 'supabase/schema.sql'))).resolves.toBeTruthy();
    expect(homepage).toContain('ProofPilot');
    expect(homepage).toContain('lg:grid-cols');
    expect(workspace).toContain("'use client'");
    expect(workspace).toContain('function run()');
    expect(workspace).toContain('Clerk Auth');
    expect(workspace).toContain('Stripe Payments');
    expect(workspace).toContain('runManagedAI');
    expect(aiClient).toContain("fetch('/api/nowbuild-ai'");
    expect(aiRoute).toContain('NOWBUILD_AI_GATEWAY_TOKEN');
    expect(aiClient).not.toContain('OPENROUTER_API_KEY');
  });
});
