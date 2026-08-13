export type AgentTimeoutAction = 'accept_changes' | 'retry_focused' | 'fail_without_charge';

export function agentTimeoutAction(attempt: number, wroteSource: boolean, maxAttempts = 2): AgentTimeoutAction {
  if (wroteSource) return 'accept_changes';
  if (attempt < maxAttempts) return 'retry_focused';
  return 'fail_without_charge';
}
