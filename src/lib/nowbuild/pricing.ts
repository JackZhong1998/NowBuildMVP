import type { AgentUsage } from './types';

export const CREDIT_USD = 0.01;

export function usageToCredits(
  usage: AgentUsage,
  multiplier = Number(process.env.NOWBUILD_COST_MULTIPLIER || 2),
) {
  if (!Number.isFinite(usage.costUsd) || usage.costUsd < 0) {
    throw new Error('Invalid model cost');
  }
  if (!Number.isFinite(multiplier) || multiplier < 1) {
    throw new Error('Cost multiplier must be at least 1');
  }
  if (usage.costUsd === 0) return 0;
  return Math.max(1, Math.ceil((usage.costUsd * multiplier) / CREDIT_USD));
}

export function normalizeUsage(input: Partial<AgentUsage>): AgentUsage {
  return {
    input: Math.max(0, Math.floor(input.input || 0)),
    output: Math.max(0, Math.floor(input.output || 0)),
    cacheRead: Math.max(0, Math.floor(input.cacheRead || 0)),
    cacheWrite: Math.max(0, Math.floor(input.cacheWrite || 0)),
    costUsd: Math.max(0, Number(input.costUsd || 0)),
  };
}
