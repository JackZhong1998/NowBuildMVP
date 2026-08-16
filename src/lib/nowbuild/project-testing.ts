import type { ProjectPlan, ProjectTestingState, ProjectTestItem } from './types';

function requirementFor(label: string): ProjectTestItem['requires'] {
  if (/(登录|注册|账户|账号|sign.?in|sign.?up|account|auth)/i.test(label)) return 'supabase';
  if (/(支付|订阅|结账|购买|checkout|payment|subscribe|billing)/i.test(label)) return 'stripe';
  return undefined;
}

function uniqueLabels(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function createProjectTestingState(plan: ProjectPlan, now = new Date().toISOString()): ProjectTestingState {
  const journey = uniqueLabels(plan.prd.coreJourney || []).slice(0, 5);
  const acceptance = uniqueLabels(plan.prd.acceptanceCriteria || [])
    .filter((item) => !journey.some((step) => step.includes(item) || item.includes(step)))
    .slice(0, Math.max(0, 6 - journey.length));
  const items: ProjectTestItem[] = [
    {
      id: 'automatic-build',
      label: plan.brief.locale === 'zh' ? '代码、生产构建和页面启动检查' : 'Code, production build, and page startup checks',
      source: 'automatic',
      status: 'passed',
      updatedAt: now,
    },
    ...journey.map((label, index) => ({
      id: `journey-${index + 1}`,
      label,
      source: 'journey' as const,
      status: 'pending' as const,
      requires: requirementFor(label),
    })),
    ...acceptance.map((label, index) => ({
      id: `acceptance-${index + 1}`,
      label,
      source: 'acceptance' as const,
      status: 'pending' as const,
      requires: requirementFor(label),
    })),
  ];
  return { status: 'not-started', items, updatedAt: now };
}

export function advanceProjectTest(state: ProjectTestingState, itemId: string, result: 'passed' | 'skipped', now = new Date().toISOString()): ProjectTestingState {
  const items = state.items.map((item) => item.id === itemId ? { ...item, status: result, updatedAt: now } : item);
  const next = items.find((item) => item.source !== 'automatic' && !['passed', 'skipped'].includes(item.status));
  if (!next) return { ...state, status: 'passed', activeItemId: undefined, items, updatedAt: now };
  return {
    ...state,
    status: next.status === 'needs-retest' ? 'retest' : 'testing',
    activeItemId: next.id,
    items: items.map((item) => item.id === next.id && item.status === 'pending' ? { ...item, status: 'current' } : item),
    updatedAt: now,
  };
}

export function startProjectTesting(state: ProjectTestingState, now = new Date().toISOString()): ProjectTestingState {
  const first = state.items.find((item) => item.source !== 'automatic' && !['passed', 'skipped'].includes(item.status));
  if (!first) return { ...state, status: 'passed', updatedAt: now };
  return {
    ...state,
    status: first.status === 'needs-retest' ? 'retest' : 'testing',
    activeItemId: first.id,
    startedAt: state.startedAt || now,
    items: state.items.map((item) => item.id === first.id && item.status === 'pending' ? { ...item, status: 'current' } : item),
    updatedAt: now,
  };
}

export function reportProjectTestIssue(state: ProjectTestingState, itemId: string, issue: string, now = new Date().toISOString()): ProjectTestingState {
  return {
    ...state,
    status: 'fixing',
    activeItemId: itemId,
    items: state.items.map((item) => item.id === itemId ? { ...item, status: 'failed', issue, updatedAt: now } : item),
    updatedAt: now,
  };
}
