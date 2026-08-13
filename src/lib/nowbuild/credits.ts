import 'server-only';
import { getServiceSupabase } from '@/lib/supabase';
import type { AgentUsage } from './types';

const DEMO_BALANCE = 500;

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url?.startsWith('https://') && key?.startsWith('eyJ') && key.length > 80 && !key.includes('xxxxx'));
}

export async function getCreditBalance(userId: string) {
  if (!isSupabaseConfigured()) return DEMO_BALANCE;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('credit_wallets')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('balance_credits')
    .single();
  if (error) throw new Error(`Unable to load credit wallet: ${error.message}`);
  return Number(data.balance_credits || 0);
}

export async function chargeCredits(input: {
  userId: string;
  projectId: string;
  runId: string;
  credits: number;
  usage: AgentUsage;
}) {
  if (input.credits <= 0 || !isSupabaseConfigured()) return getCreditBalance(input.userId);
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc('charge_credits', {
    p_user_id: input.userId,
    p_project_id: input.projectId,
    p_run_id: input.runId,
    p_credits: input.credits,
    p_usage: input.usage,
  });
  if (error) throw new Error(`Unable to charge credits: ${error.message}`);
  return Number(data);
}
