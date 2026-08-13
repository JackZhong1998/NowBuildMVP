import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { chargeCredits, getCreditBalance } from '@/lib/nowbuild/credits';
import { runPiAgent } from '@/lib/nowbuild/pi-agent';
import type { ProjectBrief, StyleId } from '@/lib/nowbuild/types';
import { isStyleId } from '@/lib/nowbuild/style-catalog';

export const runtime = 'nodejs';
export const maxDuration = 300;

function parseBrief(input: unknown): ProjectBrief {
  if (!input || typeof input !== 'object') throw new Error('Invalid request');
  const raw = input as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = String(raw[key] || '').trim();
    if (value.length < 2 || value.length > max) throw new Error(`Invalid ${key}`);
    return value;
  };
  const style = String(raw.style) as StyleId;
  if (!isStyleId(style)) throw new Error('Invalid style');
  return {
    name: text('name', 60),
    idea: text('idea', 500),
    audience: text('audience', 160),
    coreFeature: text('coreFeature', 240),
    style,
    locale: raw.locale === 'en' ? 'en' : 'zh',
  };
}

export async function POST(request: Request) {
  try {
    const userId = await getNowBuildUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const balance = await getCreditBalance(userId);
    if (balance < 1) return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });

    const body = await request.json();
    const brief = parseBrief(body);
    const result = await runPiAgent(brief, typeof body.projectId === 'string' ? body.projectId : undefined);
    const newBalance = await chargeCredits({
      userId,
      projectId: result.projectId,
      runId: randomUUID(),
      credits: result.creditsCharged,
      usage: result.usage,
    });
    return NextResponse.json({ ...result, balance: newBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    const status = message.startsWith('Invalid') ? 400 : 500;
    console.error('Agent generation failed:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
