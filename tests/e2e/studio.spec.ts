import { expect, test, type Page } from '@playwright/test';

type ProjectSummary = {
  id: string;
  title: string;
  status: string;
};

async function proofPilotId(page: Page) {
  const response = await page.request.get('/api/projects');
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as { projects: ProjectSummary[] };
  const project = payload.projects.find((item) => item.title === 'ProofPilot' && item.status === 'built');
  expect(project, 'A Pi-built ProofPilot result should be recoverable').toBeTruthy();
  return project!.id;
}

test('recovers a Pi-built project and exposes preview, code, deploy, and logs', async ({ page }) => {
  const projectId = await proofPilotId(page);

  await page.goto('/zh/projects');
  await expect(page.getByRole('heading', { name: '产品与生成记录' })).toBeVisible();
  await expect(page.locator(`a[href="/zh/dashboard?project=${projectId}"]`)).toBeVisible();

  await page.goto(`/zh/dashboard?project=${projectId}`);
  await expect(page.getByText('已通过构建与测试')).toBeVisible();
  await expect(page.getByText(/我要做一个叫 ProofPilot/).first()).toBeVisible();

  const preview = page.frameLocator('iframe[title="Generated product preview"]');
  await expect(preview.getByText('ProofPilot').first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: '代码', exact: true }).click();
  await page.getByRole('button', { name: /src\/components\/generated\/ProductWorkspace\.tsx/ }).click();
  await expect(page.getByText(/function ProductWorkspace|export default function/).first()).toBeVisible();

  await page.getByRole('button', { name: '发布', exact: true }).click();
  await expect(page.getByRole('heading', { name: '从预览到正式网址' })).toBeVisible();
  await expect(page.getByText('直接发布（推荐首发）')).toBeVisible();
  await expect(page.getByText(/不依赖 GitHub/)).toBeVisible();

  await page.getByRole('button', { name: '问题', exact: true }).click();
  await expect(page.getByText('NO ISSUES')).toBeVisible();
  await expect(page.getByText('Browser smoke /zh/dashboard → 200')).toBeVisible();
});

test('shows an immediate website preview, history, and project configuration', async ({ page }) => {
  await page.goto('/zh/dashboard');
  const preview = page.frameLocator('iframe[title="Generated product preview"]');
  await expect(preview.getByRole('heading', { name: /说出产品想法/ })).toBeVisible();
  await expect(page.getByText('nowbuild.app')).toBeVisible();

  await page.getByRole('button', { name: '查看历史对话' }).click();
  await expect(page.getByRole('complementary', { name: '历史对话' })).toBeVisible();
  await expect(page.getByText('查看每个产品的需求、方案与构建进度')).toBeVisible();
  await page.getByRole('button', { name: '关闭历史对话' }).click();

  const projectId = await proofPilotId(page);
  await page.goto(`/zh/dashboard?project=${projectId}`);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('button', { name: /配置/ }).click();
  await expect(page.getByRole('dialog', { name: '项目配置' })).toBeVisible();
  await expect(page.getByText(/密钥保护/)).toBeVisible();
  await expect(page.getByText('Clerk Publishable Key')).toBeVisible();
});

test('shows the sent prompt and a waiting state while planning', async ({ page }) => {
  await page.route('**/api/projects', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'mock stop after loading assertion' }) });
  });
  const prompt = '我要做一个帮助自由职业者管理客户回款和自动提醒的产品';
  await page.goto(`/zh/dashboard?prompt=${encodeURIComponent(prompt)}`);
  await expect(page.getByText(prompt, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '正在整理你的产品方案' })).toBeVisible();
});

test('shows focused automatic recovery instead of a 240 second failure', async ({ page }) => {
  const now = new Date().toISOString();
  await page.route('**/api/projects/progress-demo', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'progress-demo', ownerId: 'demo-user', title: 'Recovery demo', initialPrompt: 'Build a product',
      status: 'building', createdAt: now, updatedAt: now, messages: [],
      buildProgress: { phase: 'retrying', detail: '首轮响应较慢，正在自动聚焦重试，不需要你重新提交', updatedAt: now },
    }),
  }));
  await page.goto('/zh/dashboard?project=progress-demo');
  await expect(page.getByText('正在自动聚焦重试', { exact: true })).toBeVisible();
  await expect(page.getByText('首轮响应较慢，正在自动聚焦重试，不需要你重新提交')).toBeVisible();
});

test('the generated full-stack product completes its core workflow', async ({ page }) => {
  const projectId = await proofPilotId(page);
  await page.goto(`/p/${projectId}/zh/dashboard`);
  await expect(page.getByText('ProofPilot').first()).toBeVisible();

  const mobile = (page.viewportSize()?.width ?? 1280) < 768;
  await page.getByRole('button', { name: mobile ? '新建' : /新建/ }).first().click();
  await page.locator('input[placeholder="输入项目名称…"]:visible').fill(`真实流程 ${mobile ? 'mobile' : 'desktop'}`);
  await page.locator('button:visible').filter({ hasText: /^创建$/ }).click();

  await page.getByRole('button', { name: '加载示例数据' }).click();
  await page.getByRole('button', { name: /开始分析/ }).click();
  await expect(page.getByRole('button', { name: /痛点分析/ })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: /痛点分析/ }).click();
  await expect(page.getByRole('heading', { name: /提取的痛点/ })).toBeVisible();
  await expect(page.getByText('原文证据').first()).toBeVisible();
  await expect(page.getByText('机会').first()).toBeVisible();

  await page.getByRole('button', { name: '🧪 验证实验', exact: true }).click();
  await expect(page.getByText(/验证实验建议/).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('generated login degrades to setup guidance when project Clerk keys are missing', async ({ page }) => {
  const projectId = await proofPilotId(page);
  await page.goto(`/p/${projectId}/zh/sign-in`);
  await expect(page.getByRole('heading', { name: '登录 ProofPilot' })).toBeVisible();
  await expect(page.getByText(/还没有配置自己的 Clerk 测试 Key/)).toBeVisible();
  await expect(page.getByRole('link', { name: /返回 NowBuild 配置登录/ })).toBeVisible();
});
