import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mcpCatalog } from '@/lib/nowbuild/mcp-catalog';
import {
  deleteProjectAsset,
  installCatalogMCP,
  parseCustomMCP,
  parseImportedSkill,
  readProjectAsset,
  resourcesForAgent,
  saveProjectAsset,
  updateMCPConfiguration,
} from '@/lib/nowbuild/project-resources';
import { applySaasKitScaffold } from '@/lib/nowbuild/scaffold';
import { ensureProjectWorkspace } from '@/lib/nowbuild/workspace';

describe('AI product platform resources', () => {
  it('keeps managed models platform-controlled for every ready modality', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/lib/nowbuild/managed-ai.ts'), 'utf8');
    for (const key of ['NOWBUILD_AI_TEXT_MODEL', 'NOWBUILD_AI_IMAGE_MODEL', 'NOWBUILD_AI_VIDEO_MODEL', 'NOWBUILD_AI_SPEECH_MODEL', 'NOWBUILD_AI_TRANSCRIPTION_MODEL']) {
      expect(source).toContain(key);
    }
    expect(source).not.toContain('model?: string');
    expect(source).toContain("const model = modelFor('text')");
    expect(source).toContain("const model = modelFor('image')");
  });

  it('validates imported Skills and remote MCP definitions without accepting inline secrets', () => {
    const skill = parseImportedSkill({ name: '适老交互', content: '# 适老交互\n所有关键按钮至少 48px，并使用直接、无歧义的中文。' });
    expect(skill.enabled).toBe(true);
    expect(skill.content).toContain('48px');
    expect(() => parseCustomMCP({ name: 'Unsafe', endpoint: 'http://example.com/mcp' })).toThrow(/HTTPS/);
    const custom = parseCustomMCP({ name: 'Mobility', endpoint: 'https://tools.example.com/mcp', auth: 'bearer-env', envVars: ['MOBILITY_MCP_TOKEN'], tools: ['search_places'] });
    expect(custom.envVars).toEqual(['MOBILITY_MCP_TOKEN']);
    expect(JSON.stringify(custom)).not.toContain('Bearer secret');
  });

  it('marks the Didi integration as an honest enterprise adapter with the full elderly ride flow', () => {
    const didi = mcpCatalog.find((entry) => entry.id === 'didi-mobility');
    expect(didi).toMatchObject({ verified: false, setupRequired: true, endpoint: '' });
    expect(didi?.tools).toEqual(expect.arrayContaining(['search_places', 'estimate_ride', 'create_ride', 'get_ride_status', 'cancel_ride']));
    expect(didi?.safetyNote).toContain('二次确认');
    expect(didi?.safetyNote).toContain('不能伪造成功');
  });

  it('injects configured Didi MCP and project Skills into a generated product without a secret value', async () => {
    const projectId = 'test-didi-mcp-product';
    const cwd = await ensureProjectWorkspace(projectId);
    const didi = updateMCPConfiguration(installCatalogMCP('didi-mobility'), { endpoint: 'https://enterprise.example.com/didi/mcp', envVars: ['DIDI_MCP_TOKEN'], enabled: true });
    const skill = parseImportedSkill({ name: '适老打车体验', description: '大按钮、保存常用地点、叫车前确认', content: '# 适老打车\n先调用 search_places 保存常用地点；点击地点后展示估价并二次确认，最后才调用 create_ride。' });
    const resources = { skills: [skill], mcpServers: [didi], assets: [] };
    await applySaasKitScaffold(cwd, projectId, { name: '安心叫车', idea: '让老年人一键选择常用地点并安全叫车', audience: '老年人和照护者', coreFeature: '搜索保存常用地点，确认价格后调用滴滴 MCP 叫车', style: 'swiss-grid', locale: 'zh' }, undefined, resources);
    const client = await readFile(resolve(cwd, 'src/lib/nowbuild-mcp.ts'), 'utf8');
    const manifest = await readFile(resolve(cwd, 'NOWBUILD_PROJECT.json'), 'utf8');
    expect(client).toContain('https://enterprise.example.com/didi/mcp');
    expect(client).toContain('DIDI_MCP_TOKEN');
    expect(client).toContain("'initialize'");
    expect(client).toContain("'notifications/initialized'");
    expect(client).toContain("'tools/call'");
    expect(client).not.toContain('didi-secret-value');
    expect(manifest).toContain('适老打车体验');
    expect(manifest).toContain('search_places');
    expect(manifest).toContain('create_ride');
    expect(manifest).toContain('二次确认');
    expect(manifest).toContain('不能伪造成功');
  });

  it('stores, reads, and removes validated project media', async () => {
    const projectId = 'test-project-assets';
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'hero.png', { type: 'image/png' });
    const asset = await saveProjectAsset(projectId, file);
    expect(asset).toMatchObject({ name: 'hero.png', kind: 'image', mimeType: 'image/png', bytes: 4 });
    expect(await readProjectAsset(projectId, asset)).toEqual(Buffer.from([1, 2, 3, 4]));
    await deleteProjectAsset(projectId, asset);
    await expect(stat(join(tmpdir(), 'nowbuild-assets', projectId, asset.storageName))).rejects.toThrow();
  });

  it('excludes unconfigured MCP servers from coding-agent context', () => {
    const didi = installCatalogMCP('didi-mobility');
    const context = resourcesForAgent({ skills: [], mcpServers: [didi], assets: [] });
    expect(context.mcpServers).toEqual([]);
    expect(context.warning).toContain('untrusted');
  });
});
