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

export type ProjectSkill = {
  id: string;
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  source: 'imported' | 'catalog';
  createdAt: string;
};

export type MCPTransport = 'streamable-http' | 'sse';

export type ProjectMCPServer = {
  id: string;
  catalogId?: string;
  name: string;
  description: string;
  transport: MCPTransport;
  endpoint: string;
  auth: 'oauth' | 'bearer-env' | 'none' | 'provider-managed';
  envVars: string[];
  tools: string[];
  safetyNote?: string;
  enabled: boolean;
  setupRequired: boolean;
  createdAt: string;
};

export type ProjectAsset = {
  id: string;
  name: string;
  kind: 'image' | 'video';
  mimeType: string;
  bytes: number;
  storageName: string;
  publicPath: string;
  createdAt: string;
};

export type ProjectResources = {
  skills: ProjectSkill[];
  mcpServers: ProjectMCPServer[];
  assets: ProjectAsset[];
};

export type ProjectTestItem = {
  id: string;
  label: string;
  source: 'automatic' | 'journey' | 'acceptance';
  status: 'pending' | 'current' | 'passed' | 'failed' | 'skipped' | 'needs-retest';
  requires?: 'supabase' | 'stripe';
  issue?: string;
  updatedAt?: string;
};

export type ProjectTestingState = {
  status: 'not-started' | 'testing' | 'needs-setup' | 'fixing' | 'retest' | 'passed';
  items: ProjectTestItem[];
  activeItemId?: string;
  startedAt?: string;
  updatedAt: string;
};

export type ProjectLaunchState = {
  supabaseRedirectConfirmed?: boolean;
  stripeWebhookConfirmed?: boolean;
  productionEnvironmentSynced?: boolean;
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
  resources?: ProjectResources;
  testing?: ProjectTestingState;
  launch?: ProjectLaunchState;
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
