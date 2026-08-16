import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { applySaasKitScaffold } from '@/lib/nowbuild/scaffold';
import { ensureProjectWorkspace } from '@/lib/nowbuild/workspace';
import type { ProjectBrief } from '@/lib/nowbuild/types';

type EvalSet = { id: string; name: string; threshold: number; cases: ProjectBrief[] };
type Criterion = { label: string; weight: number; passed: boolean; evidence: string };
type CaseResult = ProjectBrief & { score: number; passed: boolean; durationMs: number; criteria: Criterion[] };
type SetResult = Omit<EvalSet, 'cases'> & { score: number; passed: boolean; cases: CaseResult[] };
const execFileAsync = promisify(execFile);
const files = ['personal-sites.json', 'creator-tools.json', 'commerce.json', 'internal-ops.json'];
const reportSets: SetResult[] = [];

async function exists(path: string) {
  try { await stat(path); return true; } catch { return false; }
}

async function evaluateRepository(cwd: string, item: ProjectBrief, buildPassed: boolean) {
  const home = await readFile(resolve(cwd, 'src/app/[locale]/page.tsx'), 'utf8');
  const product = await readFile(resolve(cwd, 'src/components/generated/ProductWorkspace.tsx'), 'utf8');
  const manifest = JSON.parse(await readFile(resolve(cwd, 'NOWBUILD_PROJECT.json'), 'utf8')) as { foundation: string[] };
  const routes = JSON.parse(await readFile(resolve(cwd, '.next/server/app-paths-manifest.json'), 'utf8')) as Record<string, string>;
  const routeNames = Object.keys(routes).join('\n');
  const criteria: Criterion[] = [
    { label: '真实 SaaS Kit 工作区', weight: 10, passed: await exists(resolve(cwd, 'package.json')) && await exists(resolve(cwd, 'supabase/schema.sql')), evidence: 'package.json + supabase/schema.sql' },
    { label: '独立生产构建通过', weight: 20, passed: buildPassed && await exists(resolve(cwd, '.next/BUILD_ID')), evidence: 'npm run build + .next/BUILD_ID' },
    { label: '完整公开站路由', weight: 10, passed: ['/page', '/pricing/page', '/blog/page', '/about/page'].every((route) => routeNames.includes(route)), evidence: 'Next app-paths manifest' },
    { label: '登录与注册路由', weight: 10, passed: routeNames.includes('/sign-in/') && routeNames.includes('/sign-up/'), evidence: 'Supabase Auth routes in build manifest' },
    { label: '产品工作区路由', weight: 10, passed: routeNames.includes('/dashboard/page') && product.includes("'use client'"), evidence: 'dashboard route + interactive client' },
    { label: '核心业务功能落入代码', weight: 15, passed: product.includes(item.coreFeature) && product.includes('function run()'), evidence: 'generated ProductWorkspace.tsx' },
    { label: '官网匹配品牌与用户', weight: 10, passed: home.includes(item.name) && home.includes(item.audience) && home.includes(item.idea), evidence: 'generated localized homepage' },
    { label: '支付与 Webhook 保留', weight: 5, passed: await exists(resolve(cwd, 'src/app/api/create-checkout-session/route.ts')) && await exists(resolve(cwd, 'src/app/api/webhooks/stripe/route.ts')), evidence: 'Stripe API routes' },
    { label: 'SEO 与国际化保留', weight: 5, passed: home.includes('metadata') && manifest.foundation.includes('next-intl') && manifest.foundation.includes('seo'), evidence: 'metadata + foundation manifest' },
    { label: '响应式产品体验', weight: 5, passed: home.includes('lg:grid-cols') && product.includes('md:grid-cols'), evidence: 'responsive Tailwind breakpoints' },
  ];
  return { score: criteria.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0), criteria };
}

for (const filename of files) {
  const set = JSON.parse(readFileSync(resolve(process.cwd(), 'evals', filename), 'utf8')) as EvalSet;
  const setResult: SetResult = { id: set.id, name: set.name, threshold: set.threshold, score: 0, passed: false, cases: [] };
  reportSets.push(setResult);
  describe(`${set.name} (${set.id})`, () => {
    for (const item of set.cases) {
      it(`${item.name} generates and builds a real SaaS repository`, async () => {
        const started = Date.now();
        const projectId = `eval-${set.id}-${item.name.toLowerCase()}`.replace(/[^a-z0-9-]/g, '-');
        const cwd = await ensureProjectWorkspace(projectId);
        await applySaasKitScaffold(cwd, projectId, item);
        let buildPassed = false;
        try {
          const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
          await execFileAsync(npm, ['run', 'build'], { cwd, timeout: 180_000, maxBuffer: 3 * 1024 * 1024, env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' } });
          buildPassed = true;
        } catch {
          buildPassed = false;
        }
        const evaluated = await evaluateRepository(cwd, item, buildPassed);
        const passed = evaluated.score >= set.threshold;
        setResult.cases.push({ ...item, ...evaluated, passed, durationMs: Date.now() - started });
        expect(evaluated.score, `${item.name} repository score`).toBeGreaterThanOrEqual(set.threshold);
      }, 200_000);
    }
  });
}

afterAll(() => {
  for (const set of reportSets) {
    set.score = Math.round(set.cases.reduce((sum, item) => sum + item.score, 0) / set.cases.length);
    set.passed = set.cases.every((item) => item.passed);
  }
  if (process.env.NOWBUILD_WRITE_EVAL_RESULTS !== '1') return;
  const generatedAt = new Date().toISOString();
  const allCases = reportSets.flatMap((set) => set.cases);
  const report = { methodology: 'repository-build-v2', generatedAt, summary: { sets: reportSets.length, cases: allCases.length, passed: allCases.filter((item) => item.passed).length, averageScore: Math.round(allCases.reduce((sum, item) => sum + item.score, 0) / allCases.length), totalBuildSeconds: Math.round(allCases.reduce((sum, item) => sum + item.durationMs, 0) / 1000) }, sets: reportSets };
  const resultDir = resolve(process.cwd(), 'evals', 'results');
  const historyDir = resolve(resultDir, 'history');
  mkdirSync(historyDir, { recursive: true });
  const content = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(resolve(resultDir, 'latest.json'), content);
  writeFileSync(resolve(historyDir, `${generatedAt.replace(/[:.]/g, '-')}.json`), content);
});
