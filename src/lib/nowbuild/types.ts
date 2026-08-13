import type { StyleId } from './style-catalog';
export type { StyleId } from './style-catalog';

export type AICapability = 'text' | 'image' | 'video' | 'speech' | 'transcription' | 'music' | '3d';

export type ProjectBrief = {
  name: string;
  idea: string;
  audience: string;
  coreFeature: string;
  style: StyleId;
  locale: 'zh' | 'en';
};

export type AgentUsage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
};

export type AgentRunResult = {
  projectId: string;
  mode: 'pi' | 'scaffold';
  summary: string;
  prd: string[];
  files: string[];
  logs: string[];
  previewUrl: string;
  routes: Array<{ label: string; path: string }>;
  usage: AgentUsage;
  creditsCharged: number;
};

export type ProjectPlan = {
  discovery: {
    oneLiner: string;
    assumptions: string[];
    openQuestions: string[];
  };
  brief: ProjectBrief;
  prd: {
    problem: string;
    value: string;
    persona: string;
    coreJourney: string[];
    scope: string[];
    nonGoals: string[];
    acceptanceCriteria: string[];
    success: string[];
    risks: string[];
  };
  design: {
    rationale: string;
    palette: string[];
    typography: string;
    layout: string;
    motion: string;
  };
  copy: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    cta: string;
    secondaryCta: string;
    problemTitle: string;
    problemBody: string;
    benefits: Array<{ title: string; body: string }>;
    steps: Array<{ title: string; body: string }>;
    faq: Array<{ question: string; answer: string }>;
  };
  seo: {
    title: string;
    description: string;
    primaryKeyword: string;
    supportingKeywords: string[];
    canonical: string;
    schemaTypes: string[];
  };
  ai: {
    enabled: boolean;
    capabilities: AICapability[];
    primaryUseCase: string;
    systemPrompt: string;
    outputContract: string;
  };
};

export type ProjectMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  kind?: 'prompt' | 'plan' | 'activity' | 'result' | 'error';
};

export type BuildProgress = {
  phase: 'preparing' | 'coding' | 'retrying' | 'validating' | 'previewing';
  detail: string;
  updatedAt: string;
};

export type ProjectSession = {
  id: string;
  ownerId: string;
  title: string;
  initialPrompt: string;
  status: 'planning' | 'ready' | 'building' | 'built' | 'failed';
  createdAt: string;
  updatedAt: string;
  plan?: ProjectPlan;
  messages: ProjectMessage[];
  result?: AgentRunResult;
  lastError?: string;
  buildProgress?: BuildProgress;
  isExample?: boolean;
  deployment?: {
    status: 'uploading' | 'building' | 'ready' | 'error';
    provider: 'vercel';
    url?: string;
    deploymentId?: string;
    updatedAt: string;
    error?: string;
  };
};
