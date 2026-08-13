import { expect, test } from '@playwright/test';

test('shows saved evaluation results and case details', async ({ page }) => {
  await page.goto('/zh/evaluations');
  await expect(page.getByRole('heading', { name: 'MVP 生成效果' })).toBeVisible();
  await expect(page.getByText('17/17').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MiraCreates' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ClipBrief' })).toBeVisible();
  await page.getByText(/查看 10 项构建证据/).first().click();
  await expect(page.getByText('独立生产构建通过').first()).toBeVisible();
  await expect(page.getByText('npm run build + .next/BUILD_ID').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '运行历史' })).toBeVisible();
});

test('shows real generated website screenshots in the homepage case gallery', async ({ page }) => {
  await page.goto('/zh');
  await expect(page.getByRole('heading', { name: '不是效果图，是可以打开的完整网站。' })).toBeVisible();
  const screenshots = page.locator('img[alt$="官网 Hero 区截图"]');
  await expect(screenshots.first()).toBeVisible();
  expect(await screenshots.count()).toBeGreaterThanOrEqual(6);
  await expect(screenshots.first()).toHaveJSProperty('complete', true);
});

test('filters eight built personal website cases in the public gallery', async ({ page }) => {
  await page.goto('/zh/projects');
  await expect(page.getByRole('heading', { name: /不只是案例，\s*都是活的网站。/ })).toBeVisible();
  await page.getByRole('button', { name: '个人网站' }).click();
  await expect(page.getByRole('heading', { name: 'ZoePoster' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MiraCreates' })).toBeVisible();
  await expect(page.getByText('PERSONAL SITE')).toHaveCount(8);
});
