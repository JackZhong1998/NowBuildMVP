import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { environmentFields, generatedRuntimeKeys } from './environment-schema';

const ROOT = join(tmpdir(), 'nowbuild-project-secrets');
const allowed = new Set(environmentFields.map((field) => field.key));

function safeId(id: string) {
  if (!/^[a-z0-9-]{8,80}$/i.test(id)) throw new Error('Invalid project id');
  return id;
}

function encryptionKey() {
  const seed = process.env.NOWBUILD_SECRETS_KEY
    || process.env.CLERK_SECRET_KEY
    || process.env.OPENROUTER_API_KEY;
  if (!seed) throw new Error('NOWBUILD_SECRETS_KEY is required to store project secrets');
  return createHash('sha256').update(seed).digest();
}

function encrypt(values: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(values), 'utf8'), cipher.final()]);
  return JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}

function decrypt(payload: string): Record<string, string> {
  const parsed = JSON.parse(payload) as { iv: string; tag: string; data: string };
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]);
  return JSON.parse(plain.toString('utf8')) as Record<string, string>;
}

async function readValues(projectId: string) {
  try {
    return decrypt(await readFile(join(ROOT, `${safeId(projectId)}.json`), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

export async function updateProjectEnvironment(projectId: string, updates: Record<string, unknown>) {
  const values = await readValues(projectId);
  for (const [key, raw] of Object.entries(updates)) {
    if (!allowed.has(key)) continue;
    const value = String(raw ?? '').trim();
    if (value === '__DELETE__') delete values[key];
    else if (value) values[key] = value;
  }
  await mkdir(ROOT, { recursive: true });
  await writeFile(join(ROOT, `${safeId(projectId)}.json`), encrypt(values), { mode: 0o600 });
  return projectEnvironmentStatus(projectId, values);
}

export async function getProjectEnvironment(projectId: string) {
  return readValues(projectId);
}

export async function projectEnvironmentStatus(projectId: string, known?: Record<string, string>) {
  const values = known || await readValues(projectId);
  return {
    fields: environmentFields.map((field) => ({
      ...field,
      configured: Boolean(values[field.key]),
      masked: values[field.key] ? `${values[field.key].slice(0, field.secret ? 3 : 8)}••••${values[field.key].slice(-4)}` : '',
    })),
    configuredCount: Object.keys(values).filter((key) => allowed.has(key)).length,
    loginReady: Boolean(values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && values.CLERK_SECRET_KEY),
    databaseReady: Boolean(values.NEXT_PUBLIC_SUPABASE_URL && values.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    paymentsReady: Boolean(values.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && values.STRIPE_SECRET_KEY),
    aiReady: Boolean(process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('xxxxx')),
    deployReady: Boolean(values.VERCEL_TOKEN),
  };
}

export async function generatedProjectEnv(projectId: string, overrides: NodeJS.ProcessEnv = process.env) {
  const env: NodeJS.ProcessEnv = { ...overrides };
  for (const key of generatedRuntimeKeys) delete env[key];
  // A generated project must never inherit NowBuild's own customer credentials.
  env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'xxxxx';
  env.CLERK_SECRET_KEY = 'xxxxx';
  env.NOWBUILD_PREVIEW_BASE_PATH = `/p/${projectId}`;
  Object.assign(env, await readValues(projectId));
  return env;
}
