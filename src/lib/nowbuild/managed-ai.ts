import 'server-only';
import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getNowBuildUserId } from './auth';
import { chargeCredits, getCreditBalance } from './credits';
import { usageToCredits, normalizeUsage } from './pricing';
import { getProjectSession } from './project-store';
import type { AICapability, AgentUsage } from './types';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const VIDEO_JOB_ROOT = join(tmpdir(), 'nowbuild-ai-video-jobs');
const rateBuckets = new Map<string, number[]>();

type ManagedAIOptions = {
  maxTokens?: number;
  temperature?: number;
  aspectRatio?: string;
  resolution?: string;
  duration?: number;
  generateAudio?: boolean;
  voice?: string;
  speed?: number;
  responseFormat?: 'mp3' | 'wav' | 'pcm' | 'opus' | 'aac' | 'flac';
  language?: string;
  inputAudio?: { data?: string; format?: string };
  referenceImages?: string[];
};

type ManagedAIInput = {
  projectId?: string;
  capability?: AICapability;
  prompt?: string;
  system?: string;
  messages?: Array<{ role?: 'user' | 'assistant'; content?: string }>;
  options?: ManagedAIOptions;
  jobId?: string;
};

type VideoJob = {
  id: string;
  userId: string;
  projectId: string;
  model: string;
  createdAt: string;
};

export const managedAICapabilities = [
  { id: 'text', name: '文本与对话', status: 'ready', endpoint: 'chat/completions', modelEnv: 'NOWBUILD_AI_TEXT_MODEL' },
  { id: 'image', name: '图片生成', status: 'ready', endpoint: 'images', modelEnv: 'NOWBUILD_AI_IMAGE_MODEL' },
  { id: 'video', name: '视频生成', status: 'ready', endpoint: 'videos', modelEnv: 'NOWBUILD_AI_VIDEO_MODEL' },
  { id: 'speech', name: '语音合成', status: 'ready', endpoint: 'audio/speech', modelEnv: 'NOWBUILD_AI_SPEECH_MODEL' },
  { id: 'transcription', name: '语音转写', status: 'ready', endpoint: 'audio/transcriptions', modelEnv: 'NOWBUILD_AI_TRANSCRIPTION_MODEL' },
  { id: 'music', name: '音乐生成', status: 'coming_soon', endpoint: null, modelEnv: 'NOWBUILD_AI_MUSIC_MODEL' },
  { id: '3d', name: '3D 生成', status: 'coming_soon', endpoint: null, modelEnv: 'NOWBUILD_AI_3D_MODEL' },
] as const;

const defaultModels: Record<Exclude<AICapability, 'music' | '3d'>, string> = {
  text: '~openai/gpt-latest',
  image: 'bytedance-seed/seedream-4.5',
  video: 'google/veo-3.1-fast',
  speech: 'elevenlabs/eleven-turbo-v2',
  transcription: 'openai/whisper-1',
};

function platformKey() {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key || key.includes('xxxxx')) throw new Error('NowBuild managed AI is not configured');
  return key;
}

function modelFor(capability: Exclude<AICapability, 'music' | '3d'>) {
  const env = managedAICapabilities.find((item) => item.id === capability)?.modelEnv;
  return (env ? process.env[env]?.trim() : '') || defaultModels[capability];
}

function headers(contentType = 'application/json') {
  return {
    Authorization: `Bearer ${platformKey()}`,
    'Content-Type': contentType,
    'HTTP-Referer': process.env.NOWBUILD_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
    'X-OpenRouter-Title': 'NowBuild Managed AI',
  };
}

function tokenSecret() {
  const value = process.env.NOWBUILD_AI_GATEWAY_SECRET || process.env.NOWBUILD_SECRETS_KEY || process.env.OPENROUTER_API_KEY;
  if (!value) throw new Error('NOWBUILD_AI_GATEWAY_SECRET is required');
  return value;
}

export function issueManagedAIToken(projectId: string, userId: string) {
  const payload = Buffer.from(JSON.stringify({ projectId, userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180 })).toString('base64url');
  const signature = createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return `nbai.${payload}.${signature}`;
}

function verifyManagedAIToken(token: string) {
  const [prefix, payload, signature] = token.split('.');
  if (prefix !== 'nbai' || !payload || !signature) return null;
  const expected = createHmac('sha256', tokenSecret()).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { projectId?: string; userId?: string; exp?: number };
  if (!claims.projectId || !claims.userId || !claims.exp || claims.exp < Date.now() / 1000) return null;
  return claims as { projectId: string; userId: string; exp: number };
}

function cleanText(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max);
}

function checkRateLimit(userId: string, projectId: string) {
  const key = `${userId}:${projectId}`;
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((time) => time > now - 60_000);
  if (active.length >= 20) throw new Error('AI request limit reached; retry in one minute');
  active.push(now);
  rateBuckets.set(key, active);
}

async function authorize(request: Request, requestedProjectId: string) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const claims = bearer.startsWith('nbai.') ? verifyManagedAIToken(bearer) : null;
  const userId = claims?.userId || await getNowBuildUserId();
  const projectId = claims?.projectId || requestedProjectId;
  if (!userId || !projectId || (claims && requestedProjectId && requestedProjectId !== claims.projectId)) throw new Error('Unauthorized AI request');
  const project = await getProjectSession(projectId, userId);
  if (!project) throw new Error('Project not found');
  checkRateLimit(userId, projectId);
  const balance = await getCreditBalance(userId);
  if (balance < 1) throw new Error('Insufficient credits');
  return { userId, projectId };
}

async function openRouter(path: string, init: RequestInit, timeout = 120_000) {
  const response = await fetch(`${OPENROUTER_BASE}/${path}`, { ...init, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
    throw new Error((payload.error?.message || payload.message || `AI provider returned ${response.status}`).slice(0, 300));
  }
  return response;
}

function usageFrom(payload: { usage?: Record<string, unknown> }): AgentUsage {
  const usage = payload.usage || {};
  const promptDetails = usage.prompt_tokens_details as Record<string, unknown> | undefined;
  return normalizeUsage({
    input: Number(usage.prompt_tokens || usage.input_tokens || 0),
    output: Number(usage.completion_tokens || usage.output_tokens || 0),
    cacheRead: Number(promptDetails?.cached_tokens || usage.cached_tokens || 0),
    cacheWrite: 0,
    costUsd: Number(usage.cost || 0),
  });
}

async function bill(userId: string, projectId: string, usage: AgentUsage, meter: { capability: AICapability; model: string; unit: string; quantity: number }, runId: string = randomUUID()) {
  const meteredUsage = { ...usage, ...meter };
  const credits = usageToCredits(usage);
  const balance = await chargeCredits({ userId, projectId, runId, credits, usage: meteredUsage });
  return { credits, balance, usage: meteredUsage };
}

async function generateText(input: ManagedAIInput, userId: string, projectId: string) {
  const prompt = cleanText(input.prompt, 20_000);
  const messages = (input.messages || [])
    .slice(-24)
    .map((item) => ({ role: item.role === 'assistant' ? 'assistant' as const : 'user' as const, content: cleanText(item.content, 20_000) }))
    .filter((item) => item.content);
  if (prompt) messages.push({ role: 'user', content: prompt });
  if (!messages.length) throw new Error('Prompt is required');
  const model = modelFor('text');
  const system = cleanText(input.system, 8_000);
  const response = await openRouter('chat/completions', {
    method: 'POST', headers: headers(), body: JSON.stringify({
      model,
      messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages],
      max_tokens: Math.min(4_000, Math.max(64, Number(input.options?.maxTokens || 1_200))),
      temperature: Math.min(1.5, Math.max(0, Number(input.options?.temperature ?? 0.5))),
      provider: { allow_fallbacks: true, data_collection: 'deny' },
    }),
  });
  const payload = await response.json() as { id?: string; choices?: Array<{ message?: { content?: string } }>; usage?: Record<string, unknown> };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error('AI model returned no text');
  const normalized = usageFrom(payload);
  const billing = await bill(userId, projectId, normalized, { capability: 'text', model, unit: 'tokens', quantity: normalized.input + normalized.output }, payload.id || randomUUID());
  return { capability: 'text', model, output: { text }, ...billing };
}

async function generateImage(input: ManagedAIInput, userId: string, projectId: string) {
  const prompt = cleanText(input.prompt, 4_000);
  if (!prompt) throw new Error('Image prompt is required');
  const model = modelFor('image');
  const resolution = ['1K', '2K'].includes(String(input.options?.resolution)) ? input.options?.resolution : '1K';
  const aspectRatio = ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(String(input.options?.aspectRatio)) ? input.options?.aspectRatio : '1:1';
  const response = await openRouter('images', {
    method: 'POST', headers: headers(), body: JSON.stringify({
      model, prompt, n: 1, resolution, aspect_ratio: aspectRatio,
      ...(input.options?.referenceImages?.length ? { input_references: input.options.referenceImages.slice(0, 2).map((image) => ({ image_url: cleanText(image, 2_000) })) } : {}),
      provider: { allow_fallbacks: true, data_collection: 'deny' },
    }),
  }, 180_000);
  const payload = await response.json() as { id?: string; data?: Array<{ b64_json?: string; media_type?: string }>; usage?: Record<string, unknown> };
  const images = (payload.data || []).slice(0, 1).flatMap((item) => item.b64_json ? [{ dataUrl: `data:${item.media_type || 'image/png'};base64,${item.b64_json}` }] : []);
  if (!images.length) throw new Error('AI model returned no image');
  const billing = await bill(userId, projectId, usageFrom(payload), { capability: 'image', model, unit: 'images', quantity: images.length }, payload.id || randomUUID());
  return { capability: 'image', model, output: { images }, ...billing };
}

async function generateSpeech(input: ManagedAIInput, userId: string, projectId: string) {
  const prompt = cleanText(input.prompt, 4_000);
  if (!prompt) throw new Error('Speech input is required');
  const model = modelFor('speech');
  const format = input.options?.responseFormat || 'mp3';
  const response = await openRouter('audio/speech', {
    method: 'POST', headers: headers(), body: JSON.stringify({
      model, input: prompt, voice: cleanText(input.options?.voice, 80) || 'alloy', response_format: format,
      speed: Math.min(2, Math.max(0.5, Number(input.options?.speed || 1))),
    }),
  }, 180_000);
  const audio = Buffer.from(await response.arrayBuffer()).toString('base64');
  const estimatedCost = (prompt.length / 1_000) * Math.max(0.001, Number(process.env.NOWBUILD_AI_SPEECH_USD_PER_1K_CHARS || 0.03));
  const usage = normalizeUsage({ input: prompt.length, costUsd: estimatedCost });
  const billing = await bill(userId, projectId, usage, { capability: 'speech', model, unit: 'characters', quantity: prompt.length });
  return { capability: 'speech', model, output: { audioUrl: `data:audio/${format};base64,${audio}`, format }, usageEstimated: true, ...billing };
}

async function transcribe(input: ManagedAIInput, userId: string, projectId: string) {
  const audio = input.options?.inputAudio;
  const data = cleanText(audio?.data, 16_000_000);
  const format = cleanText(audio?.format, 12) || 'mp3';
  if (!data) throw new Error('Base64 audio input is required');
  const model = modelFor('transcription');
  const response = await openRouter('audio/transcriptions', {
    method: 'POST', headers: headers(), body: JSON.stringify({
      model, input_audio: { data, format }, language: cleanText(input.options?.language, 12) || undefined,
      provider: { allow_fallbacks: true, data_collection: 'deny' },
    }),
  }, 180_000);
  const payload = await response.json() as { id?: string; text?: string; usage?: Record<string, unknown> };
  if (!payload.text) throw new Error('AI model returned no transcription');
  const billing = await bill(userId, projectId, usageFrom(payload), { capability: 'transcription', model, unit: 'input_bytes', quantity: Math.floor(data.length * 0.75) }, payload.id || randomUUID());
  return { capability: 'transcription', model, output: { text: payload.text }, ...billing };
}

function videoJobPath(id: string) {
  return join(VIDEO_JOB_ROOT, `${createHash('sha256').update(id).digest('hex')}.json`);
}

async function saveVideoJob(job: VideoJob) {
  await mkdir(VIDEO_JOB_ROOT, { recursive: true });
  await writeFile(videoJobPath(job.id), `${JSON.stringify(job)}\n`, { mode: 0o600 });
}

async function readVideoJob(id: string) {
  return JSON.parse(await readFile(videoJobPath(id), 'utf8')) as VideoJob;
}

async function submitVideo(input: ManagedAIInput, userId: string, projectId: string) {
  const prompt = cleanText(input.prompt, 4_000);
  if (!prompt) throw new Error('Video prompt is required');
  const model = modelFor('video');
  const response = await openRouter('videos', {
    method: 'POST', headers: headers(), body: JSON.stringify({
      model, prompt,
      duration: Math.min(8, Math.max(3, Number(input.options?.duration || 4))),
      resolution: ['720p', '1080p'].includes(String(input.options?.resolution)) ? input.options?.resolution : '720p',
      aspect_ratio: ['16:9', '9:16', '1:1'].includes(String(input.options?.aspectRatio)) ? input.options?.aspectRatio : '16:9',
      generate_audio: Boolean(input.options?.generateAudio),
      provider: { allow_fallbacks: true, data_collection: 'deny' },
    }),
  }, 180_000);
  const payload = await response.json() as { id?: string; status?: string };
  if (!payload.id) throw new Error('Video provider returned no job id');
  await saveVideoJob({ id: payload.id, userId, projectId, model, createdAt: new Date().toISOString() });
  return { capability: 'video', model, output: { jobId: payload.id, status: payload.status || 'pending' }, credits: 0, balance: await getCreditBalance(userId) };
}

async function pollVideo(jobId: string, userId: string, projectId: string) {
  const job = await readVideoJob(jobId).catch(() => null);
  if (!job || job.userId !== userId || job.projectId !== projectId) throw new Error('Video job not found');
  const response = await openRouter(`videos/${encodeURIComponent(jobId)}`, { method: 'GET', headers: headers() });
  const payload = await response.json() as { status?: string; unsigned_urls?: string[]; error?: string; usage?: Record<string, unknown> };
  let billing = { credits: 0, balance: await getCreditBalance(userId), usage: normalizeUsage({}) };
  if (payload.status === 'completed' && payload.usage) billing = await bill(userId, projectId, usageFrom(payload), { capability: 'video', model: job.model, unit: 'jobs', quantity: 1 }, `ai-video:${jobId}`);
  return { capability: 'video', model: job.model, output: { jobId, status: payload.status, urls: payload.unsigned_urls || [], error: payload.error }, ...billing };
}

export async function handleManagedAIRequest(request: Request, forcedProjectId?: string) {
  try {
    const input = await request.json() as ManagedAIInput;
    const projectId = forcedProjectId || cleanText(input.projectId, 80);
    const authorized = await authorize(request, projectId);
    if (input.jobId) return Response.json(await pollVideo(cleanText(input.jobId, 200), authorized.userId, authorized.projectId));
    const capability = input.capability || 'text';
    if (capability === 'music' || capability === '3d') {
      return Response.json({ error: `${capability} generation is not yet available through the OpenRouter managed gateway` }, { status: 422 });
    }
    const minimumCredits = { text: 1, image: 5, video: 25, speech: 1, transcription: 1 }[capability];
    if (await getCreditBalance(authorized.userId) < minimumCredits) {
      return Response.json({ error: `Insufficient credits for ${capability} generation` }, { status: 402 });
    }
    const result = capability === 'text' ? await generateText(input, authorized.userId, authorized.projectId)
      : capability === 'image' ? await generateImage(input, authorized.userId, authorized.projectId)
        : capability === 'speech' ? await generateSpeech(input, authorized.userId, authorized.projectId)
          : capability === 'transcription' ? await transcribe(input, authorized.userId, authorized.projectId)
            : await submitVideo(input, authorized.userId, authorized.projectId);
    return Response.json({ requestId: randomUUID(), ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Managed AI request failed';
    const status = /Unauthorized/.test(message) ? 401 : /Insufficient/.test(message) ? 402 : /not found/i.test(message) ? 404 : /required|limit|not available/i.test(message) ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
