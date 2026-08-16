import 'server-only';

type RPCPayload = { result?: unknown; error?: { message?: string } };

function endpoint(projectRef: string) {
  if (!/^[a-z0-9]{8,40}$/.test(projectRef)) throw new Error('Invalid Supabase Project Ref');
  return `https://mcp.supabase.com/mcp?project_ref=${encodeURIComponent(projectRef)}&features=database,development`;
}

function headers(token: string, sessionId?: string) {
  if (!token || token.length < 16) throw new Error('Supabase MCP Access Token is missing');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
    ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
  };
}

async function payload(response: Response): Promise<RPCPayload> {
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase MCP failed (${response.status}): ${text.slice(0, 500)}`);
  const candidates = response.headers.get('content-type')?.includes('text/event-stream')
    ? text.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter(Boolean)
    : [text];
  for (const candidate of candidates.reverse()) {
    try { return JSON.parse(candidate) as RPCPayload; } catch { /* Continue through SSE frames. */ }
  }
  throw new Error('Supabase MCP returned an unreadable response');
}

async function rpc(input: { url: string; token: string; method: string; params: Record<string, unknown>; id: number; sessionId?: string }) {
  const response = await fetch(input.url, {
    method: 'POST', headers: headers(input.token, input.sessionId), cache: 'no-store',
    body: JSON.stringify({ jsonrpc: '2.0', id: input.id, method: input.method, params: input.params }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await payload(response);
  if (body.error) throw new Error(body.error.message || 'Supabase MCP request failed');
  return { result: body.result, sessionId: response.headers.get('mcp-session-id') || input.sessionId };
}

export function validateSupabaseMigration(sql: string) {
  if (sql.length < 20 || sql.length > 200_000) throw new Error('Database migration must be between 20 and 200,000 characters');
  const inspected = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const destructive = /\b(drop\b|truncate\b|delete\s+from\b|update\s+[a-z0-9_."-]+\s+set\b|insert\s+into\b|alter\s+table[\s\S]{0,200}?\b(rename|drop|alter\s+column)\b)/i;
  if (destructive.test(inspected)) throw new Error('Destructive or data-mutating SQL is blocked in the MVP migration flow');
}

export async function applySupabaseMigration(input: { projectRef: string; accessToken: string; name: string; sql: string }) {
  validateSupabaseMigration(input.sql);
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(input.name)) throw new Error('Invalid migration name');
  const url = endpoint(input.projectRef);
  const initialized = await rpc({
    url, token: input.accessToken, method: 'initialize', params: {
      protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'nowbuild', version: '1.0.0' },
    }, id: 1,
  });
  await fetch(url, {
    method: 'POST', headers: headers(input.accessToken, initialized.sessionId), cache: 'no-store',
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(30_000),
  });

  const existing = await rpc({
    url, token: input.accessToken, method: 'tools/call',
    params: { name: 'list_migrations', arguments: {} }, id: 2, sessionId: initialized.sessionId,
  });
  if (JSON.stringify(existing.result).includes(input.name)) {
    return { applied: false, alreadyApplied: true, verification: existing.result };
  }

  await rpc({
    url, token: input.accessToken, method: 'tools/call',
    params: { name: 'apply_migration', arguments: { name: input.name, query: input.sql } }, id: 3, sessionId: initialized.sessionId,
  });
  const verification = await rpc({
    url, token: input.accessToken, method: 'tools/call',
    params: { name: 'list_tables', arguments: { schemas: ['public'], verbose: true } }, id: 4, sessionId: initialized.sessionId,
  });
  return { applied: true, alreadyApplied: false, verification: verification.result };
}
