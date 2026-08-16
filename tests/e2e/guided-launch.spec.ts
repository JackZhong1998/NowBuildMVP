import { expect, test } from '@playwright/test';
import { environmentFields } from '../../src/lib/nowbuild/environment-schema';
import { createProjectTestingState } from '../../src/lib/nowbuild/project-testing';
import type { ProjectPlan, ProjectSession } from '../../src/lib/nowbuild/types';

const plan = {
  discovery: { oneLiner: '帮助创作者管理客户项目', assumptions: [], openQuestions: [] },
  brief: { name: 'FlowDesk', idea: '管理客户项目', audience: '独立创作者', coreFeature: '创建项目并跟踪进度', style: 'notion-editorial', locale: 'zh' },
  prd: { problem: '项目分散', value: '集中管理', persona: '独立创作者', coreJourney: ['注册并登录', '创建第一个项目'], scope: [], nonGoals: [], acceptanceCriteria: [], success: [], risks: [] },
  design: { rationale: '', palette: [], typography: '', layout: '', motion: '' },
  copy: { eyebrow: '', headline: '', subheadline: '', cta: '', secondaryCta: '', problemTitle: '', problemBody: '', benefits: [], steps: [], faq: [] },
  seo: { title: '', description: '', primaryKeyword: '', supportingKeywords: [], canonical: '/zh', schemaTypes: [] },
  ai: { enabled: false, capabilities: [], primaryUseCase: '', systemPrompt: '', outputContract: '' },
} as ProjectPlan;

test('guides testing, contextual setup, agent repair, and launch readiness', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const now = new Date().toISOString();
  let project: ProjectSession = {
    id: 'guided-test-demo', ownerId: 'demo-user', title: 'FlowDesk', initialPrompt: plan.brief.idea,
    status: 'built', createdAt: now, updatedAt: now, plan, messages: [], testing: createProjectTestingState(plan),
    result: {
      projectId: 'guided-test-demo', mode: 'pi', summary: 'Build complete', prd: [], files: [],
      logs: ['✓ Typecheck passed', '✓ Production build passed'], previewUrl: '/p/guided-test-demo/zh',
      routes: [{ label: '官网', path: '/zh' }], usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 }, creditsCharged: 0,
    },
  };
  const configured = new Set<string>();
  const environment = () => ({
    fields: environmentFields.map((field) => ({ ...field, configured: configured.has(field.key), masked: configured.has(field.key) ? 'set••••value' : '' })),
    configuredCount: configured.size,
    loginReady: configured.has('NEXT_PUBLIC_SUPABASE_URL') && configured.has('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    supabaseReady: configured.has('NEXT_PUBLIC_SUPABASE_URL') && configured.has('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') && configured.has('SUPABASE_SERVICE_ROLE_KEY'),
    databaseReady: false,
    paymentsReady: false,
    paymentsProductionReady: false,
    aiReady: true,
    deployReady: false,
  });

  await page.route('**/api/projects/guided-test-demo', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) });
    const body = route.request().postDataJSON() as Partial<ProjectSession>;
    project = { ...project, ...body, updatedAt: new Date().toISOString() };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) });
  });
  await page.route('**/api/projects/guided-test-demo/environment', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as { values: Record<string, string> };
      Object.entries(body.values).forEach(([key, value]) => { if (value) configured.add(key); });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(environment()) });
  });
  await page.route('**/api/projects/guided-test-demo/environment/apply', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ project, environment: environment() }),
  }));
  await page.route('**/api/projects/guided-test-demo/build', async (route) => {
    const activeId = project.testing?.activeItemId;
    project = {
      ...project,
      status: 'built',
      testing: project.testing ? {
        ...project.testing,
        status: 'retest',
        items: project.testing.items.map((item) => item.id === activeId ? { ...item, status: 'needs-retest' } : item),
        updatedAt: new Date().toISOString(),
      } : undefined,
    };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ project, balance: 100 }) });
  });
  await page.route('**/p/guided-test-demo/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<main><h1>FlowDesk preview</h1></main>' }));

  await page.goto('/zh/dashboard?project=guided-test-demo');
  await expect(page.getByRole('heading', { name: '产品第一版已经可以测试' })).toBeVisible();
  await page.getByRole('button', { name: /开始测试核心流程/ }).click();
  await expect(page.getByText('继续测试前需要连接 Supabase')).toBeVisible();
  await page.getByRole('button', { name: /现在配置 Supabase/ }).click();

  await expect(page.getByRole('dialog', { name: '项目配置' })).toBeVisible();
  await page.getByLabel(/Supabase Project URL/).fill('https://demo.supabase.co');
  await page.getByLabel(/Supabase Publishable Key/).fill('sb_publishable_demo');
  await page.getByLabel(/Supabase Secret Key/).fill('sb_secret_demo');
  await page.getByRole('button', { name: '保存并应用到预览' }).click();
  await expect(page.getByText('配置已应用，可以重新测试对应功能。')).toBeVisible();
  await page.getByRole('button', { name: '×' }).click();

  await page.getByRole('button', { name: '这里有问题' }).click();
  await page.getByLabel('你期望发生什么？').fill('登录成功后应该进入工作台');
  await page.getByRole('button', { name: '让 Agent 分析并修复' }).click();
  await expect(page.getByText('等待复测')).toBeVisible();
  await page.getByRole('button', { name: /复测通过/ }).click();
  await page.getByRole('button', { name: '正常，下一步' }).click();
  await expect(page.getByRole('heading', { name: '核心流程测试完成' })).toBeVisible();

  await page.getByRole('button', { name: /进入发布检查/ }).click();
  await expect(page.getByRole('heading', { name: '把测试通过的产品发布上线' })).toBeVisible();
  await expect(page.getByText('2/4')).toBeVisible();
  await page.locator('li').filter({ hasText: 'Stripe' }).getByRole('button', { name: '配置' }).click();
  await expect(page.getByText('Monthly Price ID')).toBeVisible();
  await expect(page.getByText('Yearly Price ID')).toBeVisible();
    await page.getByRole('button', { name: 'Vercel 需要配置' }).click();
  await expect(page.getByText('Vercel Access Token')).toBeVisible();
  await expect(page.getByText('Vercel Team ID')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});
