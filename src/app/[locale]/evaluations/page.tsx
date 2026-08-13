import type { Metadata } from 'next';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeStyleId, styleCatalogById } from '@/lib/nowbuild/style-catalog';

export const dynamic = 'force-dynamic';

type Criterion = { label: string; weight: number; passed: boolean; evidence?: string };
type CaseResult = {
  name: string;
  idea: string;
  audience: string;
  coreFeature: string;
  style: string;
  score: number;
  passed: boolean;
  durationMs?: number;
  criteria: Criterion[];
};
type SetResult = { id: string; name: string; threshold: number; score: number; passed: boolean; cases: CaseResult[] };
type EvalReport = {
  methodology?: string;
  generatedAt: string;
  summary: { sets: number; cases: number; passed: number; averageScore: number; totalBuildSeconds?: number };
  sets: SetResult[];
};

export const metadata: Metadata = {
  title: 'MVP 生成效果评测',
  description: '查看 NowBuild MVP 生成评测集、逐案例得分与历史结果。',
};

function readReport(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as EvalReport;
}

function loadResults() {
  const root = resolve(process.cwd(), 'evals', 'results');
  const latestPath = resolve(root, 'latest.json');
  if (!existsSync(latestPath)) return { latest: null, history: [] as EvalReport[] };
  const historyDir = resolve(root, 'history');
  const history = existsSync(historyDir)
    ? readdirSync(historyDir).filter((name) => name.endsWith('.json')).sort().reverse().slice(0, 8).map((name) => readReport(resolve(historyDir, name)))
    : [];
  return { latest: readReport(latestPath), history };
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}

export default async function EvaluationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale === 'zh';
  const { latest, history } = loadResults();

  if (!latest) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-6"><div className="max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-sm"><div className="text-3xl">◎</div><h1 className="mt-4 text-xl font-bold">{zh ? '还没有评测结果' : 'No evaluation results yet'}</h1><p className="mt-2 text-sm text-gray-500">{zh ? '运行评测后，结果会自动保存在这里。' : 'Run the evaluation suite and results will appear here.'}</p><a href={`/${locale}/dashboard`} className="mt-6 inline-flex rounded-xl bg-[#17191c] px-4 py-2.5 text-sm font-bold text-white">{zh ? '返回工作台' : 'Back to studio'}</a></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#17191c]">
      <header className="border-b border-black/8 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3"><a href={`/${locale}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17191c] text-sm font-black text-white">N</a><div><div className="text-sm font-bold">NowBuild</div><div className="text-[10px] uppercase tracking-[.15em] text-gray-400">Evaluation Lab</div></div></div>
          <a href={`/${locale}/dashboard`} className="rounded-xl border border-black/8 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50">← {zh ? '返回工作台' : 'Back to studio'}</a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700"><span>●</span>{latest.methodology === 'repository-build-v2' ? (zh ? '真实仓库构建评测' : 'Real repository builds') : (zh ? '历史评测' : 'Legacy evaluation')}</div><h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{zh ? 'MVP 生成效果' : 'MVP generation quality'}</h1><p className="mt-4 text-sm leading-6 text-gray-500 sm:text-base">{zh ? '每个案例都会复制 SaaS Kit、生成完整源码并执行一次独立的 Next.js 生产构建。这里展示的不是静态文案匹配分，而是可编译仓库的验收结果。' : 'Every case copies the SaaS Kit, generates full source, and runs an independent Next.js production build. These are repository results, not static string-match scores.'}</p></div>
          <div className="text-sm text-gray-400"><div>{zh ? '最近运行' : 'Latest run'}</div><div className="mt-1 font-semibold text-gray-700">{formatDate(latest.generatedAt, locale)}</div></div>
        </div>

        <section className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: zh ? '评测集' : 'Eval sets', value: latest.summary.sets, note: zh ? '覆盖 3 类产品' : '3 product categories' },
            { label: zh ? '案例数' : 'Cases', value: latest.summary.cases, note: zh ? '全部独立需求' : 'Independent briefs' },
            { label: zh ? '通过案例' : 'Passed', value: `${latest.summary.passed}/${latest.summary.cases}`, note: 'Threshold ≥ 85' },
            { label: latest.summary.totalBuildSeconds ? (zh ? '总构建耗时' : 'Build time') : (zh ? '平均得分' : 'Average'), value: latest.summary.totalBuildSeconds ? `${latest.summary.totalBuildSeconds}s` : latest.summary.averageScore, note: latest.summary.totalBuildSeconds ? (zh ? `平均分 ${latest.summary.averageScore}` : `Average ${latest.summary.averageScore}`) : (zh ? '满分 100' : 'Out of 100') },
          ].map((metric, index) => <div key={metric.label} className={`rounded-2xl border p-5 ${index === 3 ? 'border-[#6b61df] bg-[#17191c] text-white' : 'border-black/8 bg-white'}`}><div className={`text-[11px] font-bold uppercase tracking-[.13em] ${index === 3 ? 'text-white/50' : 'text-gray-400'}`}>{metric.label}</div><div className="mt-3 text-3xl font-bold tracking-tight">{metric.value}</div><div className={`mt-1 text-xs ${index === 3 ? 'text-white/50' : 'text-gray-400'}`}>{metric.note}</div></div>)}
        </section>

        <section className="mt-10 space-y-8">
          {latest.sets.map((set, setIndex) => (
            <article key={set.id}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#6b61df]">0{setIndex + 1} · {set.id}</div><h2 className="mt-1 text-xl font-bold">{set.name}</h2></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">{zh ? '通过线' : 'Threshold'} {set.threshold}</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{set.score} · PASS</span></div></div>
              <div className="grid gap-4 lg:grid-cols-3">
                {set.cases.map((item) => (
                  <div key={item.name} className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
                    <div className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: styleCatalogById[normalizeStyleId(item.style)].theme.accent }} /><h3 className="font-display text-lg font-bold">{item.name}</h3></div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-gray-400">{styleCatalogById[normalizeStyleId(item.style)].name}</div></div><div className="flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-emerald-400 text-sm font-black">{item.score}</div></div><p className="mt-5 text-sm font-semibold leading-6 text-gray-800">{item.idea}</p><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-gray-400">{zh ? '目标用户' : 'Audience'}</dt><dd className="mt-1 text-gray-700">{item.audience}</dd></div><div><dt className="text-gray-400">{zh ? '核心功能' : 'Core feature'}</dt><dd className="mt-1 leading-5 text-gray-700">{item.coreFeature}</dd></div></dl></div>
                    <details className="group border-t border-black/8 bg-[#fafafa]"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-xs font-bold text-gray-600"><span>{zh ? `查看 10 项构建证据${item.durationMs ? ` · ${(item.durationMs / 1000).toFixed(1)}s` : ''}` : `View 10 checks${item.durationMs ? ` · ${(item.durationMs / 1000).toFixed(1)}s` : ''}`}</span><span className="transition group-open:rotate-45">＋</span></summary><div className="space-y-2 border-t border-black/5 p-4">{item.criteria.map((criterion) => <div key={criterion.label} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-[10px] text-gray-600"><span className={criterion.passed ? 'text-emerald-500' : 'text-red-500'}>{criterion.passed ? '✓' : '×'}</span><div className="min-w-0 flex-1"><div className="font-semibold">{criterion.label} <span className="font-normal text-gray-300">+{criterion.weight}</span></div>{criterion.evidence && <div className="mt-1 truncate text-gray-400" title={criterion.evidence}>{criterion.evidence}</div>}</div></div>)}</div></details>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-black/8 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">{zh ? '运行历史' : 'Run history'}</h2><p className="mt-1 text-xs text-gray-400">{zh ? '每次评测都会保存独立快照' : 'Each evaluation run saves a snapshot'}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">{history.length} {zh ? '次记录' : 'runs'}</span></div><div className="mt-5 divide-y divide-black/5">{history.map((run, index) => <div key={run.generatedAt} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3 text-xs"><div><span className="font-semibold text-gray-700">{formatDate(run.generatedAt, locale)}</span>{index === 0 && <span className="ml-2 rounded bg-[#eeecff] px-1.5 py-0.5 text-[9px] font-bold text-[#5d53d6]">LATEST</span>}</div><span className="text-gray-400">{run.summary.passed}/{run.summary.cases} PASS</span><span className="w-10 text-right font-bold text-emerald-600">{run.summary.averageScore}</span></div>)}</div></section>
      </div>
    </main>
  );
}
