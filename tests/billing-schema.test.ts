import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');

describe('credit ledger schema', () => {
  it('uses atomic locked charging and idempotent run ids', () => {
    expect(schema).toContain('FOR UPDATE');
    expect(schema).toContain('run_id TEXT UNIQUE');
    expect(schema).toContain('CREATE OR REPLACE FUNCTION public.charge_credits');
  });

  it('makes Stripe purchases idempotent', () => {
    expect(schema).toContain('checkout_session_id TEXT PRIMARY KEY');
    expect(schema).toContain('ON CONFLICT (checkout_session_id) DO NOTHING');
    expect(schema).toContain('CREATE OR REPLACE FUNCTION public.grant_credits');
  });

  it('records metered multimodal AI usage without duplicating retries', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.ai_usage_events');
    expect(schema).toContain("capability IN ('text', 'image', 'video', 'speech', 'transcription')");
    expect(schema).toContain('provider_cost_usd');
    expect(schema).toContain('ON CONFLICT (run_id) DO NOTHING');
  });
});
