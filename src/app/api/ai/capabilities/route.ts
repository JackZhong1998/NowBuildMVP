import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { managedAICapabilities } from '@/lib/nowbuild/managed-ai';

export async function GET() {
  if (!await getNowBuildUserId()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    managed: true,
    configured: Boolean(process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('xxxxx')),
    capabilities: managedAICapabilities.map(({ id, name, status }) => ({ id, name, status })),
  });
}
