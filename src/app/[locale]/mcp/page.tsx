import type { Metadata } from 'next';
import MCPMarketplace from '@/components/mcp/MCPMarketplace';
import { mcpCatalog } from '@/lib/nowbuild/mcp-catalog';

export const metadata: Metadata = { title: 'MCP 工具集合 | NowBuild', description: '浏览并安装适用于 AI Coding 和 AI Agent 产品的远程 MCP 工具。' };

export default async function MCPPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ project?: string }> }) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = rawLocale === 'en' ? 'en' : 'zh';
  const projectId = /^[a-z0-9-]{8,80}$/i.test(query.project || '') ? String(query.project) : '';
  return <MCPMarketplace entries={mcpCatalog} locale={locale} projectId={projectId}/>;
}
