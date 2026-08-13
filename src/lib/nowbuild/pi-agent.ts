import 'server-only';
import { randomUUID } from 'node:crypto';
import { setDefaultResultOrder } from 'node:dns';
import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from '@mariozechner/pi-coding-agent';
import { normalizeUsage, usageToCredits } from './pricing';
import { restartProjectPreview } from './preview-runtime';
import { applySaasKitScaffold } from './scaffold';
import type { AgentRunResult, AgentUsage, BuildProgress, ProjectBrief, ProjectPlan } from './types';
import { ensureProjectWorkspace } from './workspace';
import { generatedProjectEnv } from './project-environment';
import { agentTimeoutAction } from './agent-timeout-policy';
import { loadNowBuildSkillPrompt } from './skill-runtime';
import { styleCatalogById } from './style-catalog';

const execFileAsync = promisify(execFile);
setDefaultResultOrder('ipv4first');
const AGENT_ATTEMPT_MS = Math.max(60, Number(process.env.NOWBUILD_AGENT_ATTEMPT_SECONDS || 240)) * 1000;
const AGENT_ATTEMPTS = 2;
type ProgressReporter = (progress: Omit<BuildProgress, 'updatedAt'>) => void | Promise<void>;
const SYSTEM_PROMPT = `You are the NowBuild coding agent working inside a real clone of nowbuild-saas-kit.
The repository already contains the complete SaaS foundation. Do not audit the whole repository and do not rebuild infrastructure that already exists.
Make a focused product implementation now:
1. Replace src/components/generated/ProductWorkspace.tsx with a polished, genuinely product-specific interactive MVP workflow using realistic domain data, useful empty/loading/result/error states, history, and responsive layout.
2. Update src/app/[locale]/page.tsx so its hero uses the confirmed headline, subheadline, CTA, target audience, and design direction while retaining a complete multi-section marketing page.
3. Add only the small API routes or components the core interaction actually needs. Preserve Clerk auth, Stripe checkout/webhooks, Supabase, next-intl, SEO, pricing, blog, about, legal pages, and responsive behavior.
4. When the confirmed plan has ai.enabled=true, implement the real AI interaction with src/lib/nowbuild-ai.ts. Never ask for, read, copy, or expose an OpenRouter key. Use the managed gateway for prompt testing, text, image, video, speech, or transcription and show usage/loading/error/retry states. Do not fake an AI response with setTimeout.
Keep all changes inside this repository and never print secrets. The platform runs lint, build, and browser smoke tests after you return, so do not run those commands yourself. Use no more than 18 tool calls and finish immediately after the focused edits.`;

async function verifyGeneratedProject(cwd: string, projectId: string) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const started = Date.now();
  const projectEnv = await generatedProjectEnv(projectId, { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' });
  await execFileAsync(npm, ['run', 'lint'], {
    cwd,
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
    env: projectEnv,
  });
  const { stdout, stderr } = await execFileAsync(npm, ['run', 'build'], {
    cwd,
    timeout: 240_000,
    maxBuffer: 4 * 1024 * 1024,
    env: projectEnv,
  });
  const evidence = [...stdout.split('\n'), ...stderr.split('\n')]
    .map((line) => line.trim())
    .filter((line) => /compiled|generating|route \(app\)|error|failed|sitemap/i.test(line))
    .slice(-16);
  return ['✓ ESLint passed', `✓ SaaS Kit production build passed in ${((Date.now() - started) / 1000).toFixed(1)}s`, ...evidence];
}

function addUsage(left: AgentUsage, right: AgentUsage) {
  return normalizeUsage({
    input: left.input + right.input,
    output: left.output + right.output,
    cacheRead: left.cacheRead + right.cacheRead,
    cacheWrite: left.cacheWrite + right.cacheWrite,
    costUsd: left.costUsd + right.costUsd,
  });
}

async function runModelAgent(cwd: string, brief: ProjectBrief, logs: string[], plan?: ProjectPlan, instruction?: string, onProgress?: ProgressReporter) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || apiKey.includes('xxxxx') || process.env.NOWBUILD_DEMO_MODE === 'true') {
    logs.push('OpenRouter 未配置：交付可运行的 SaaS Kit 全站基线，跳过模型二次定制');
    return { summary: '已从 nowbuild-saas-kit 生成并构建完整全站基线。配置 OpenRouter 后，Pi Agent 会继续针对核心业务编写专用逻辑。', usage: normalizeUsage({}), mode: 'scaffold' as const };
  }

  let totalUsage = normalizeUsage({});
  let summary = '';
  const skillPrompt = await loadNowBuildSkillPrompt();
  const selectedStyle = styleCatalogById[brief.style];
  const basePrompt = `${SYSTEM_PROMPT}\n\nACTIVE NOWBUILD SKILLS:\n${skillPrompt}\n\nSELECTED STYLE PROFILE:\n${JSON.stringify(selectedStyle, null, 2)}\n\n产品：${brief.name}\n目标用户：${brief.audience}\n价值主张：${brief.idea}\n核心功能：${brief.coreFeature}\n视觉风格：${brief.style}\n主要语言：${brief.locale}\n\n用户已确认的完整产品方案：\n${JSON.stringify(plan || { brief }, null, 2)}\n\nCURRENT CHANGE REQUEST (highest priority within the confirmed plan):\n${instruction || 'Implement the confirmed plan.'}`;

  for (let attempt = 1; attempt <= AGENT_ATTEMPTS; attempt += 1) {
    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey('openrouter', apiKey);
    const modelRegistry = ModelRegistry.inMemory(authStorage);
    const modelId = process.env.NOWBUILD_MODEL || 'deepseek/deepseek-v4-flash';
    const model = modelRegistry.find('openrouter', modelId);
    if (!model) throw new Error(`OpenRouter model not found: ${modelId}`);
    const { session } = await createAgentSession({
      cwd, authStorage, modelRegistry, model, thinkingLevel: 'low',
      tools: ['read', 'write', 'edit'],
      sessionManager: SessionManager.inMemory(),
    });
    let wroteSource = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = session.subscribe((event) => {
      if (event.type === 'tool_execution_start') {
        logs.push(`开发工具 → ${event.toolName}`);
        const detail = event.toolName === 'read' ? '正在理解现有产品页面' : '正在写入产品功能与页面';
        void onProgress?.({ phase: 'coding', detail });
      }
      if (event.type === 'tool_execution_end') {
        if (!event.isError && (event.toolName === 'write' || event.toolName === 'edit')) wroteSource = true;
        logs.push(`${event.isError ? '✕' : '✓'} ${event.toolName}`);
      }
    });
    try {
      const retryFocus = attempt === 1 ? '' : '\n\nRECOVERY RETRY: The prior attempt inspected files but did not write within its time budget. Do not audit or explain. Read only the exact target file you need, then immediately write/edit the implementation. Use at most 8 tool calls.';
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          void session.abort();
          reject(new Error('AGENT_ATTEMPT_TIMEOUT'));
        }, AGENT_ATTEMPT_MS);
      });
      let timedOut = false;
      try {
        await Promise.race([session.prompt(`${basePrompt}${retryFocus}`), timeoutPromise]);
      } catch (error) {
        if (!(error instanceof Error && error.message === 'AGENT_ATTEMPT_TIMEOUT')) throw error;
        timedOut = true;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
      const stats = session.getSessionStats();
      totalUsage = addUsage(totalUsage, normalizeUsage({ input: stats.tokens.input, output: stats.tokens.output, cacheRead: stats.tokens.cacheRead, cacheWrite: stats.tokens.cacheWrite, costUsd: stats.cost }));
      summary = session.getLastAssistantText() || summary;

      if (!timedOut) return { summary: summary || '开发助手已完成全站业务定制。', usage: totalUsage, mode: 'pi' as const };
      const timeoutAction = agentTimeoutAction(attempt, wroteSource, AGENT_ATTEMPTS);
      if (timeoutAction === 'accept_changes') {
        logs.push('本轮达到时间预算；已保留源码修改并自动进入构建验收');
        return { summary: summary || '开发助手已完成源码修改。', usage: totalUsage, mode: 'pi' as const };
      }
      if (timeoutAction === 'retry_focused') {
        logs.push('首轮等待超时且尚未写入源码；平台正在自动聚焦重试');
        await onProgress?.({ phase: 'retrying', detail: '首轮响应较慢，正在自动聚焦重试，不需要你重新提交' });
        continue;
      }
      throw new Error('开发服务连续两次未能及时开始写入代码，请稍后重试；本次不会扣除点数');
    } finally {
      unsubscribe();
      session.dispose();
    }
  }
  throw new Error('开发服务未能启动，请稍后重试；本次不会扣除点数');
}

export async function runPiAgent(brief: ProjectBrief, requestedProjectId?: string, plan?: ProjectPlan, instruction?: string, onProgress?: ProgressReporter): Promise<AgentRunResult> {
  const projectId = requestedProjectId || randomUUID();
  const cwd = await ensureProjectWorkspace(projectId);
  const logs = [
    '✓ 从 JackZhong1998/nowbuild-saas-kit 创建独立项目',
    '✓ 保留 Clerk、Stripe、Supabase、next-intl 与 SEO 基础',
  ];
  let baselineFiles: string[] = [];
  try {
    await stat(`${cwd}/NOWBUILD_PROJECT.json`);
    logs.push('✓ 恢复现有项目源码与上一轮 Agent 修改');
  } catch {
    baselineFiles = await applySaasKitScaffold(cwd, projectId, brief, plan);
    logs.push('✓ 生成官网、产品工作区、设计系统和产品配置');
  }
  await onProgress?.({ phase: 'coding', detail: '正在根据确认方案开发官网与核心产品功能' });
  const agent = await runModelAgent(cwd, brief, logs, plan, instruction, onProgress);
  logs.push('开始独立生产构建验收');
  await onProgress?.({ phase: 'validating', detail: '代码已写入，正在执行检查和生产构建' });
  logs.push(...await verifyGeneratedProject(cwd, projectId));
  await onProgress?.({ phase: 'previewing', detail: '构建通过，正在启动预览并测试关键页面' });
  const preview = await restartProjectPreview(projectId);
  for (const path of [`/${brief.locale}`, `/${brief.locale}/dashboard`, `/${brief.locale}/pricing`, `/${brief.locale}/sign-in`]) {
    const response = await fetch(`http://127.0.0.1:${preview.port}/p/${projectId}${path}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Browser smoke test failed: ${path} returned ${response.status}`);
    logs.push(`✓ Browser smoke ${path} → ${response.status}`);
  }
  logs.push('✓ 实际 Next.js 全站预览已启动并通过路由测试');

  const discovered = (await readdir(cwd, { recursive: true }))
    .filter((file) => typeof file === 'string'
      && /\.(tsx?|css|json|sql)$/.test(file)
      && !file.split(/[\\/]/).some((part) => part === 'node_modules' || part === '.next'))
    .slice(0, 80);
  const files = Array.from(new Set([...baselineFiles, ...discovered])).slice(0, 80);
  const usage: AgentUsage = agent.usage;
  return {
    projectId,
    mode: agent.mode,
    summary: agent.summary,
    prd: [
      `目标用户：${brief.audience}`,
      `价值假设：${brief.idea}`,
      `核心任务：${brief.coreFeature}`,
      '公开站：主页、定价、博客、关于、隐私、条款、登录与注册',
      '产品站：登录保护、核心工作流、历史结果、用量与升级入口',
      '商业基础：Clerk + Stripe + Supabase + SEO + i18n',
    ],
    files,
    logs,
    previewUrl: `/p/${projectId}/${brief.locale}`,
    routes: [
      { label: brief.locale === 'zh' ? '官网' : 'Website', path: `/${brief.locale}` },
      { label: brief.locale === 'zh' ? '产品' : 'Product', path: `/${brief.locale}/dashboard` },
      { label: brief.locale === 'zh' ? '定价' : 'Pricing', path: `/${brief.locale}/pricing` },
      { label: brief.locale === 'zh' ? '登录' : 'Sign in', path: `/${brief.locale}/sign-in` },
    ],
    usage,
    creditsCharged: usageToCredits(usage),
  };
}
