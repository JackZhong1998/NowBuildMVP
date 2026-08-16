export type EnvironmentField = {
  key: string;
  label: string;
  group: 'login' | 'database' | 'payments' | 'ai' | 'mcp' | 'deploy';
  secret: boolean;
  required?: boolean;
  help: string;
  placeholder: string;
  phase?: 'before-publish' | 'after-publish';
};

export const environmentFields: EnvironmentField[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase Project URL', group: 'login', secret: false, required: true, help: 'Supabase Dashboard → Project Settings → Data API 中的 Project URL。', placeholder: 'https://….supabase.co', phase: 'before-publish' },
  { key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', label: 'Supabase Publishable Key', group: 'login', secret: false, required: true, help: 'Supabase Dashboard → Project Settings → API Keys 中的 Publishable Key。', placeholder: 'sb_publishable_…', phase: 'before-publish' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Secret Key', group: 'login', secret: true, required: true, help: 'API Keys 中的 Secret Key，仅注入服务端，绝不会暴露给浏览器。', placeholder: 'sb_secret_…', phase: 'before-publish' },
  { key: 'SUPABASE_PROJECT_REF', label: 'Supabase Project Ref', group: 'database', secret: false, required: true, help: '项目 Settings 中的 Project ID，用于将 MCP 限制在这一个开发项目。', placeholder: 'abcdefghijklmnopqrst' },
  { key: 'SUPABASE_ACCESS_TOKEN', label: 'Supabase MCP Access Token', group: 'database', secret: true, required: true, help: '只用于 NowBuild 通过官方 MCP 应用数据库迁移，不会注入生成产品。', placeholder: 'sbp_…' },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', group: 'payments', secret: false, required: true, help: 'Stripe Dashboard → Developers → API keys 中的 Publishable key，建议先使用 Test mode。', placeholder: 'pk_test_…', phase: 'before-publish' },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', group: 'payments', secret: true, required: true, help: '同一页面中的 Secret key，仅用于服务端创建 Checkout。', placeholder: 'sk_test_…', phase: 'before-publish' },
  { key: 'NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID', label: 'Monthly Price ID', group: 'payments', secret: false, required: true, help: 'Stripe 产品目录中月付价格的 Price ID。', placeholder: 'price_…', phase: 'before-publish' },
  { key: 'NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID', label: 'Yearly Price ID', group: 'payments', secret: false, required: true, help: 'Stripe 产品目录中年付价格的 Price ID。', placeholder: 'price_…', phase: 'before-publish' },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', group: 'payments', secret: true, help: '首次发布后创建 Webhook endpoint，再把 Signing secret 填回这里。', placeholder: 'whsec_…', phase: 'after-publish' },
  { key: 'VERCEL_TOKEN', label: 'Vercel Access Token', group: 'deploy', secret: true, required: true, help: 'Vercel Account Settings → Tokens 中创建；建议使用有明确过期时间的 Token。', placeholder: 'Vercel token', phase: 'before-publish' },
  { key: 'VERCEL_TEAM_ID', label: 'Vercel Team ID', group: 'deploy', secret: false, help: '发布到团队时填写 Team Settings → General 中的 Team ID；个人账户可留空。', placeholder: 'team_…', phase: 'before-publish' },
];

export const generatedRuntimeKeys = environmentFields
  .map((field) => field.key)
  .filter((key) => !key.startsWith('VERCEL_'))
  .concat([
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENROUTER_API_KEY',
    'NOWBUILD_AI_GATEWAY_SECRET',
    'NEXT_PUBLIC_STRIPE_STARTER_CREDITS_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_BUILDER_CREDITS_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_LAUNCH_CREDITS_PRICE_ID',
  ]);

export const environmentGroupCopy = {
  login: { name: 'Supabase', provider: '登录与数据库', note: '连接一个 Supabase 项目，统一提供邮箱登录、Cookie 会话和数据库访问。' },
  database: { name: '数据库', provider: 'Supabase MCP', note: 'NowBuild 先生成并展示 SQL 迁移，只在你明确确认后应用到指定开发项目。' },
  payments: { name: 'Stripe', provider: '支付与订阅', note: '先用 Test Mode 完成 Checkout 测试；首次发布后再配置 Webhook。' },
  ai: { name: 'AI 能力', provider: 'NowBuild 托管', note: '无需用户准备 API Key。文本、图片、视频、语音和转写由 NowBuild 的 OpenRouter 网关统一调用、计量和扣费。' },
  mcp: { name: 'MCP 密钥', provider: '项目工具', note: '这里只保存项目已安装 MCP 引用的密钥。密钥会加密保存并仅注入生成产品的服务端运行环境。' },
  deploy: { name: 'Vercel', provider: '构建与发布', note: '使用 Access Token 创建生产部署并同步当前项目的运行环境变量。' },
} as const;
