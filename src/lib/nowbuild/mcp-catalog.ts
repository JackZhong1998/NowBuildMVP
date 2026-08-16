import type { MCPTransport, ProjectMCPServer } from './types';

export type MCPCatalogEntry = {
  id: string;
  name: string;
  provider: string;
  category: 'development' | 'data' | 'productivity' | 'payments' | 'observability' | 'mobility';
  description: string;
  transport: MCPTransport;
  endpoint: string;
  auth: ProjectMCPServer['auth'];
  envVars: string[];
  tools: string[];
  tags: string[];
  docsUrl: string;
  verified: boolean;
  setupRequired?: boolean;
  safetyNote?: string;
};

export const mcpCatalog: MCPCatalogEntry[] = [
  {
    id: 'github', name: 'GitHub', provider: 'GitHub', category: 'development',
    description: '让 Coding Agent 查询仓库、Issue、Pull Request、Actions 和代码安全信息。',
    transport: 'streamable-http', endpoint: 'https://api.githubcopilot.com/mcp/readonly', auth: 'oauth', envVars: [],
    tools: ['search_repositories', 'get_file_contents', 'list_issues', 'get_pull_request'], tags: ['代码', 'Issue', 'CI/CD'],
    docsUrl: 'https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md', verified: true,
    safetyNote: '默认安装只读端点；需要写操作时应在提供商侧重新授权。',
  },
  {
    id: 'notion', name: 'Notion', provider: 'Notion', category: 'productivity',
    description: '搜索产品知识库，读取和更新页面、数据库与项目文档。',
    transport: 'streamable-http', endpoint: 'https://mcp.notion.com/mcp', auth: 'oauth', envVars: [],
    tools: ['notion-search', 'notion-fetch', 'notion-create-pages', 'notion-update-page'], tags: ['文档', '知识库', '项目管理'],
    docsUrl: 'https://developers.notion.com/guides/mcp/get-started-with-mcp', verified: true,
  },
  {
    id: 'supabase', name: 'Supabase', provider: 'Supabase', category: 'data',
    description: '查询开发数据库、管理迁移、调试项目并搜索 Supabase 文档。',
    transport: 'streamable-http', endpoint: 'https://mcp.supabase.com/mcp?read_only=true', auth: 'oauth', envVars: [],
    tools: ['search_docs', 'list_tables', 'execute_sql', 'get_logs'], tags: ['数据库', 'Auth', 'Storage'],
    docsUrl: 'https://supabase.com/docs/guides/ai-tools/mcp', verified: true,
    safetyNote: '默认只读；官方建议仅连接开发/测试项目，不要直连生产数据。',
  },
  {
    id: 'stripe', name: 'Stripe', provider: 'Stripe', category: 'payments',
    description: '查询支付文档和账户，并在用户确认后执行受限的支付相关操作。',
    transport: 'streamable-http', endpoint: 'https://mcp.stripe.com', auth: 'oauth', envVars: [],
    tools: ['search_stripe_documentation', 'get_stripe_account_info', 'retrieve_balance', 'list_customers'], tags: ['支付', '订阅', '账单'],
    docsUrl: 'https://docs.stripe.com/mcp', verified: true,
    safetyNote: '涉及付款、退款或客户数据的写操作必须要求人工确认。',
  },
  {
    id: 'sentry', name: 'Sentry', provider: 'Sentry', category: 'observability',
    description: '让 Coding Agent 定位错误、分析事件和性能问题并关联源码。',
    transport: 'streamable-http', endpoint: 'https://mcp.sentry.dev/mcp', auth: 'oauth', envVars: [],
    tools: ['search_issues', 'get_issue_details', 'search_events', 'analyze_issue_with_seer'], tags: ['错误监控', '性能', '调试'],
    docsUrl: 'https://github.com/getsentry/sentry-mcp', verified: true,
  },
  {
    id: 'mcp-docs', name: 'MCP 官方文档', provider: 'Model Context Protocol', category: 'development',
    description: '检索最新 MCP 协议、SDK、传输和授权文档。',
    transport: 'streamable-http', endpoint: 'https://modelcontextprotocol.io/mcp', auth: 'none', envVars: [],
    tools: ['SearchModelContextProtocolDocs', 'FetchModelContextProtocolDocumentation'], tags: ['协议', 'SDK', '文档'],
    docsUrl: 'https://modelcontextprotocol.io/docs', verified: true,
  },
  {
    id: 'didi-mobility', name: '滴滴出行企业适配器', provider: '滴滴出行 / 企业集成', category: 'mobility',
    description: '面向适老打车产品的工具契约：搜索并保存常用地点、估价、确认后发起叫车、查询订单状态。',
    transport: 'streamable-http', endpoint: '', auth: 'bearer-env', envVars: ['DIDI_MCP_TOKEN'],
    tools: ['search_places', 'estimate_ride', 'create_ride', 'get_ride_status', 'cancel_ride'], tags: ['出行', '地图', '适老化'],
    docsUrl: 'https://registry.modelcontextprotocol.io/', verified: false, setupRequired: true,
    safetyNote: '未发现可公开验证的滴滴官方 MCP。安装后必须填写已获授权的企业 MCP HTTPS 端点；叫车前需展示上车点、目的地、价格并二次确认，不能伪造成功状态。',
  },
];

export function getMCPCatalogEntry(id: string) {
  return mcpCatalog.find((entry) => entry.id === id);
}
