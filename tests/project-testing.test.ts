import { describe, expect, it } from 'vitest';
import { advanceProjectTest, createProjectTestingState, reportProjectTestIssue, startProjectTesting } from '@/lib/nowbuild/project-testing';
import type { ProjectPlan } from '@/lib/nowbuild/types';

const plan = {
  discovery: { oneLiner: '测试产品', assumptions: [], openQuestions: [] },
  brief: { name: 'Test', idea: 'Test', audience: 'Founders', coreFeature: 'Create a result', style: 'notion-editorial', locale: 'zh' },
  prd: {
    problem: 'Test', value: 'Test', persona: 'Founder',
    coreJourney: ['注册并登录', '创建第一个项目', '完成订阅支付'],
    scope: [], nonGoals: [], acceptanceCriteria: ['移动端可以完成核心流程'], success: [], risks: [],
  },
  design: { rationale: '', palette: [], typography: '', layout: '', motion: '' },
  copy: { eyebrow: '', headline: '', subheadline: '', cta: '', secondaryCta: '', problemTitle: '', problemBody: '', benefits: [], steps: [], faq: [] },
  seo: { title: '', description: '', primaryKeyword: '', supportingKeywords: [], canonical: '/zh', schemaTypes: [] },
  ai: { enabled: false, capabilities: [], primaryUseCase: '', systemPrompt: '', outputContract: '' },
} as ProjectPlan;

describe('guided product testing', () => {
  it('turns the PRD into a concise test checklist with contextual setup requirements', () => {
    const testing = createProjectTestingState(plan, '2026-08-15T00:00:00.000Z');
    expect(testing.status).toBe('not-started');
    expect(testing.items[0]).toMatchObject({ source: 'automatic', status: 'passed' });
    expect(testing.items.find((item) => item.label === '注册并登录')).toMatchObject({ requires: 'supabase' });
    expect(testing.items.find((item) => item.label === '完成订阅支付')).toMatchObject({ requires: 'stripe' });
    expect(testing.items).toHaveLength(5);
  });

  it('advances one task at a time and only marks the flow passed after all remaining tasks complete', () => {
    let testing = startProjectTesting(createProjectTestingState(plan));
    expect(testing.activeItemId).toBe('journey-1');
    testing = advanceProjectTest(testing, 'journey-1', 'passed');
    expect(testing.activeItemId).toBe('journey-2');
    testing = advanceProjectTest(testing, 'journey-2', 'passed');
    testing = advanceProjectTest(testing, 'journey-3', 'passed');
    testing = advanceProjectTest(testing, 'acceptance-1', 'passed');
    expect(testing.status).toBe('passed');
  });

  it('keeps the failing test step and user expectation attached to the agent repair cycle', () => {
    const started = startProjectTesting(createProjectTestingState(plan));
    const reported = reportProjectTestIssue(started, 'journey-1', '登录成功后应该进入工作台');
    expect(reported).toMatchObject({ status: 'fixing', activeItemId: 'journey-1' });
    expect(reported.items.find((item) => item.id === 'journey-1')).toMatchObject({ status: 'failed', issue: '登录成功后应该进入工作台' });
  });
});
