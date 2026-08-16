import { describe, expect, it } from 'vitest';
import { validateSupabaseMigration } from '@/lib/nowbuild/supabase-mcp';

describe('Supabase MCP migration safety', () => {
  it('accepts additive schema and RLS changes', () => {
    expect(() => validateSupabaseMigration(`
      create table if not exists public.notes (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id)
      );
      alter table public.notes enable row level security;
    `)).not.toThrow();
  });

  it.each([
    'drop table public.notes;',
    'truncate table public.notes;',
    'delete from public.notes;',
    'update public.notes set title = \'x\';',
    'insert into public.notes (title) values (\'x\');',
    'alter table public.notes drop column title;',
  ])('blocks destructive SQL: %s', (sql) => {
    expect(() => validateSupabaseMigration(sql.padEnd(24, ' '))).toThrow(/blocked/);
  });
});
