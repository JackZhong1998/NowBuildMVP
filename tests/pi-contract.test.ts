import { describe, expect, it } from 'vitest';
import { AuthStorage, ModelRegistry } from '@mariozechner/pi-coding-agent';
import { agentTimeoutAction } from '@/lib/nowbuild/agent-timeout-policy';

describe('Pi Agent contract', () => {
  it('ships the configured DeepSeek V4 Flash OpenRouter model', () => {
    const auth = AuthStorage.inMemory();
    const registry = ModelRegistry.inMemory(auth);
    const model = registry.find('openrouter', 'deepseek/deepseek-v4-flash');
    expect(model?.id).toBe('deepseek/deepseek-v4-flash');
    expect(model?.provider).toBe('openrouter');
    expect(model?.contextWindow).toBeGreaterThanOrEqual(100_000);
  });

  it('keeps written work and automatically retries an idle first attempt', () => {
    expect(agentTimeoutAction(1, true)).toBe('accept_changes');
    expect(agentTimeoutAction(1, false)).toBe('retry_focused');
    expect(agentTimeoutAction(2, false)).toBe('fail_without_charge');
  });
});
