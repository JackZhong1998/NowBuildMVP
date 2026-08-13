import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { getCreditBalance } from '@/lib/nowbuild/credits';

export async function GET() {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ balance: await getCreditBalance(userId) });
}
