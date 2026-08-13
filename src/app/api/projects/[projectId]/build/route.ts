import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { chargeCredits, getCreditBalance } from '@/lib/nowbuild/credits';
import { runPiAgent } from '@/lib/nowbuild/pi-agent';
import { getProjectSession, saveProjectSession } from '@/lib/nowbuild/project-store';

export const runtime = 'nodejs';
export const maxDuration = 800;

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getNowBuildUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const session = await getProjectSession(projectId, userId);
  if (!session || session.isExample || !session.plan) return NextResponse.json({ error: 'Project plan not found' }, { status: 404 });
  try {
    const body = await request.json().catch(() => ({})) as { instruction?: string };
    const instruction = String(body.instruction || '').trim();
    if (instruction) {
      session.messages.push({ id: randomUUID(), role: 'user', kind: 'prompt', content: instruction, createdAt: new Date().toISOString() });
    }
    session.status = 'building';
    session.lastError = undefined;
    session.buildProgress = { phase: 'preparing', detail: '正在准备独立 SaaS 工程与已确认的产品方案', updatedAt: new Date().toISOString() };
    session.messages.push({ id: randomUUID(), role: 'assistant', kind: 'activity', content: '开始开发：正在准备完整工程、实现产品功能、检查代码并创建可运行预览。', createdAt: new Date().toISOString() });
    await saveProjectSession(session);

    const balance = await getCreditBalance(userId);
    if (balance < 1) throw new Error('Insufficient credits');
    let progressSave = Promise.resolve(session);
    let lastProgress = session.buildProgress.detail;
    const result = await runPiAgent(session.plan.brief, session.id, session.plan, instruction, (progress) => {
      if (progress.detail === lastProgress) return;
      lastProgress = progress.detail;
      session.buildProgress = { ...progress, updatedAt: new Date().toISOString() };
      progressSave = progressSave.then(() => saveProjectSession(session));
      return progressSave.then(() => undefined);
    });
    await progressSave;
    if (result.mode !== 'pi') throw new Error('开发引擎未实际运行，因此本次开发不通过');
    const newBalance = await chargeCredits({ userId, projectId, runId: randomUUID(), credits: result.creditsCharged, usage: result.usage });
    session.status = 'built';
    session.result = result;
    session.buildProgress = undefined;
    session.messages.push({ id: randomUUID(), role: 'assistant', kind: 'result', content: `${result.summary}\n\n已完成真实代码修改、静态检查、生产构建和整站启动。`, createdAt: new Date().toISOString() });
    await saveProjectSession(session);
    return NextResponse.json({ project: session, balance: newBalance });
  } catch (error) {
    session.status = 'failed';
    session.lastError = error instanceof Error ? error.message : 'Build failed';
    session.buildProgress = undefined;
    session.messages.push({ id: randomUUID(), role: 'assistant', kind: 'error', content: `开发未通过：${session.lastError}`, createdAt: new Date().toISOString() });
    await saveProjectSession(session);
    return NextResponse.json({ error: session.lastError, project: session }, { status: 500 });
  }
}
