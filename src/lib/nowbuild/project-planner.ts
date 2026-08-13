import 'server-only';
import { setDefaultResultOrder } from 'node:dns';
import { isStyleId, styleCatalogById, styleCatalogPrompt } from './style-catalog';
import { loadNowBuildSkillPrompt } from './skill-runtime';
import type { AICapability, ProjectPlan } from './types';

setDefaultResultOrder('ipv4first');

function detectAICapabilities(prompt: string): AICapability[] {
  const value = prompt.toLowerCase();
  const matches: AICapability[] = [];
  if (/(ai|人工智能|智能|生成|对话|聊天|文案|总结|分析|llm|chatbot)/i.test(value)) matches.push('text');
  if (/(生图|图片生成|图像生成|海报|image generation|text.to.image)/i.test(value)) matches.push('image');
  if (/(视频生成|生视频|text.to.video|video generation)/i.test(value)) matches.push('video');
  if (/(语音合成|配音|朗读|text.to.speech|tts)/i.test(value)) matches.push('speech');
  if (/(语音转文字|转录|speech.to.text|transcription|stt)/i.test(value)) matches.push('transcription');
  if (/(音乐生成|生成音乐|music generation)/i.test(value)) matches.push('music');
  if (/(3d|三维|模型生成)/i.test(value)) matches.push('3d');
  return Array.from(new Set(matches));
}

function fallbackPlan(prompt: string, locale: 'zh' | 'en'): ProjectPlan {
  const zh = locale === 'zh';
  const style = styleCatalogById['notion-editorial'];
  const aiCapabilities = detectAICapabilities(prompt);
  return {
    discovery: {
      oneLiner: prompt.slice(0, 180),
      assumptions: [zh ? '先验证一条从输入到结果的核心路径' : 'Validate one input-to-outcome workflow first'],
      openQuestions: [],
    },
    brief: {
      name: 'NewMVP', idea: prompt.slice(0, 220),
      audience: zh ? '有明确业务问题的早期用户' : 'Early users with a clear business problem',
      coreFeature: zh ? '完成一个输入、处理、结果反馈的核心闭环' : 'Complete one input-to-result core workflow',
      style: style.id, locale,
    },
    prd: {
      problem: prompt,
      value: zh ? '用更短路径完成最重要的任务并获得可验证结果。' : 'Complete the most important task faster and get a verifiable result.',
      persona: zh ? '愿意主动尝试新工具、目前依赖手工流程的早期用户' : 'Early adopters currently relying on a manual workflow',
      coreJourney: zh ? ['登录并进入工作区', '提交核心输入', '获得结果并继续迭代'] : ['Sign in', 'Submit the core input', 'Review the result and iterate'],
      scope: zh ? ['公开官网与 SEO', '登录后的核心产品工作流', '定价、支付与账户基础'] : ['Public website and SEO', 'Authenticated core workflow', 'Pricing, payments, and account foundation'],
      nonGoals: zh ? ['复杂团队权限', '非核心数据的长期存储'] : ['Complex team permissions', 'Durable storage for non-core data'],
      acceptanceCriteria: zh ? ['用户可以完成从输入到结果的主流程', '包含空、加载、成功与失败状态', '移动端主流程可用'] : ['Users complete the input-to-result flow', 'Empty, loading, success, and failure states exist', 'The core flow works on mobile'],
      success: zh ? ['用户能独立完成核心任务', '全站生产构建通过'] : ['Users complete the core task', 'Production build passes'],
      risks: zh ? ['价值主张仍需真实用户验证'] : ['The value proposition still needs real-user validation'],
    },
    design: { rationale: style.note, palette: style.palette, typography: style.typography, layout: style.principles.join(' · '), motion: style.motion },
    copy: {
      eyebrow: zh ? '更短的路径，更快的结果' : 'A shorter path to the outcome',
      headline: prompt.slice(0, 72),
      subheadline: zh ? '把复杂流程收进一个清晰、可靠的产品体验。' : 'Turn a complex workflow into one clear, reliable product experience.',
      cta: zh ? '创建第一个结果' : 'Create my first result', secondaryCta: zh ? '查看产品演示' : 'See the product',
      problemTitle: zh ? '重要工作不该被重复流程拖慢。' : 'Important work should not be slowed by repetitive steps.',
      problemBody: zh ? '把零散动作变成一条可以重复、检查和优化的核心路径。' : 'Turn scattered actions into one repeatable, reviewable workflow.',
      benefits: [{ title: zh ? '更快完成' : 'Finish faster', body: zh ? '减少重复步骤，直接进入核心任务。' : 'Remove repeat steps and focus on the core task.' }],
      steps: [{ title: zh ? '提交需求' : 'Describe the need', body: zh ? '提供完成任务所需的核心输入。' : 'Provide the input needed for the task.' }],
      faq: [{ question: zh ? '可以先试用吗？' : 'Can I try it first?', answer: zh ? '可以，先完成一次核心流程再决定。' : 'Yes. Complete the core workflow before deciding.' }],
    },
    seo: { title: prompt.slice(0, 58), description: prompt.slice(0, 150), primaryKeyword: zh ? '效率工具' : 'productivity tool', supportingKeywords: [], canonical: `/${locale}`, schemaTypes: ['SoftwareApplication', 'FAQPage'] },
    ai: {
      enabled: aiCapabilities.length > 0,
      capabilities: aiCapabilities,
      primaryUseCase: aiCapabilities.length ? prompt.slice(0, 240) : '',
      systemPrompt: aiCapabilities.length ? (zh ? '你是产品内的专业 AI 助手。给出准确、直接、可执行的结果。' : 'You are the product AI. Return accurate, direct, actionable results.') : '',
      outputContract: aiCapabilities.length ? (zh ? '返回可直接展示和继续编辑的结果，并包含失败与重试状态。' : 'Return a display-ready, editable result with failure and retry states.') : '',
    },
  };
}

function strings(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 8) : fallback;
}

function normalizePlan(raw: Partial<ProjectPlan>, prompt: string, locale: 'zh' | 'en'): ProjectPlan {
  const fallback = fallbackPlan(prompt, locale);
  const styleId = raw.brief?.style && isStyleId(raw.brief.style) ? raw.brief.style : fallback.brief.style;
  const style = styleCatalogById[styleId];
  const knownCapabilities = new Set<AICapability>(['text', 'image', 'video', 'speech', 'transcription', 'music', '3d']);
  const capabilities = Array.isArray(raw.ai?.capabilities)
    ? raw.ai.capabilities.filter((item): item is AICapability => knownCapabilities.has(item as AICapability)).slice(0, 5)
    : fallback.ai.capabilities;
  return {
    discovery: {
      oneLiner: raw.discovery?.oneLiner || fallback.discovery.oneLiner,
      assumptions: strings(raw.discovery?.assumptions, fallback.discovery.assumptions),
      openQuestions: strings(raw.discovery?.openQuestions, []),
    },
    brief: { ...fallback.brief, ...raw.brief, style: styleId, locale },
    prd: {
      ...fallback.prd, ...raw.prd,
      coreJourney: strings(raw.prd?.coreJourney, fallback.prd.coreJourney), scope: strings(raw.prd?.scope, fallback.prd.scope),
      nonGoals: strings(raw.prd?.nonGoals, fallback.prd.nonGoals), acceptanceCriteria: strings(raw.prd?.acceptanceCriteria, fallback.prd.acceptanceCriteria),
      success: strings(raw.prd?.success, fallback.prd.success), risks: strings(raw.prd?.risks, fallback.prd.risks),
    },
    design: { ...fallback.design, ...raw.design, palette: strings(raw.design?.palette, [...style.palette]) },
    copy: {
      ...fallback.copy, ...raw.copy,
      benefits: Array.isArray(raw.copy?.benefits) ? raw.copy.benefits.slice(0, 5) : fallback.copy.benefits,
      steps: Array.isArray(raw.copy?.steps) ? raw.copy.steps.slice(0, 5) : fallback.copy.steps,
      faq: Array.isArray(raw.copy?.faq) ? raw.copy.faq.slice(0, 6) : fallback.copy.faq,
    },
    seo: { ...fallback.seo, ...raw.seo, supportingKeywords: strings(raw.seo?.supportingKeywords, []), schemaTypes: strings(raw.seo?.schemaTypes, fallback.seo.schemaTypes) },
    ai: {
      ...fallback.ai,
      ...raw.ai,
      enabled: Boolean(raw.ai?.enabled ?? fallback.ai.enabled),
      capabilities,
      primaryUseCase: String(raw.ai?.primaryUseCase || fallback.ai.primaryUseCase),
      systemPrompt: String(raw.ai?.systemPrompt || fallback.ai.systemPrompt),
      outputContract: String(raw.ai?.outputContract || fallback.ai.outputContract),
    },
  };
}

export async function planProject(prompt: string, locale: 'zh' | 'en') {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || apiKey.includes('xxxxx')) return fallbackPlan(prompt, locale);
  const model = process.env.NOWBUILD_MODEL || 'deepseek/deepseek-v4-flash';
  const skills = await loadNowBuildSkillPrompt();
  const system = `You are NowBuild's product discovery, conversion copy, SEO, and design planner. Follow the attached compact skills. Do not ask the user a long questionnaire: state assumptions and return an editable first draft. Return JSON only matching the supplied schema. Pick exactly one styleId from the catalog. Use the user's language.\n\nSTYLE CATALOG:\n${styleCatalogPrompt()}\n\nNOWBUILD SKILLS:\n${skills}`;
  const schema = fallbackPlan(prompt, locale);
  const requestBody = JSON.stringify({
    model, temperature: 0.3, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Create the commercial MVP plan. Keep every key from this JSON shape and replace its values with product-specific content:\n${JSON.stringify(schema)}\n\nFOUNDER IDEA:\n${prompt}` },
    ],
  });
  let response: Response | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002', 'X-Title': 'NowBuild' },
        body: requestBody, signal: AbortSignal.timeout(90_000),
      });
      break;
    } catch (error) { lastError = error; }
  }
  if (!response) throw lastError instanceof Error ? lastError : new Error('Unable to connect to planning model');
  if (!response.ok) throw new Error(`Planning model failed (${response.status})`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('Planning model returned no plan');
  return normalizePlan(JSON.parse(content) as Partial<ProjectPlan>, prompt, locale);
}
