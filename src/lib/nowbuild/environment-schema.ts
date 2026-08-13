export type EnvironmentField = {
  key: string;
  label: string;
  group: 'login' | 'database' | 'payments' | 'ai' | 'deploy';
  secret: boolean;
  required?: boolean;
  help: string;
  placeholder: string;
};

export const environmentFields: EnvironmentField[] = [
  { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', label: 'Clerk Publishable Key', group: 'login', secret: false, required: true, help: '用于渲染登录与注册界面。', placeholder: 'pk_test_…' },
  { key: 'CLERK_SECRET_KEY', label: 'Clerk Secret Key', group: 'login', secret: true, required: true, help: '仅在服务端校验登录状态，不会发送到浏览器。', placeholder: 'sk_test_…' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', group: 'database', secret: false, help: '项目的 Supabase API 地址。', placeholder: 'https://….supabase.co' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', group: 'database', secret: false, help: '浏览器可用的匿名访问 Key；仍需配置 RLS。', placeholder: 'eyJ…' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role', group: 'database', secret: true, help: '仅供服务端使用，绝不能暴露在页面代码中。', placeholder: 'eyJ…' },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', group: 'payments', secret: false, help: '用于 Stripe Checkout 的浏览器端初始化。', placeholder: 'pk_test_…' },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', group: 'payments', secret: true, help: '创建 Checkout 和读取订阅，仅服务端可用。', placeholder: 'sk_test_…' },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', group: 'payments', secret: true, help: '部署后验证 Stripe Webhook 签名。', placeholder: 'whsec_…' },
  { key: 'VERCEL_TOKEN', label: 'Vercel Access Token', group: 'deploy', secret: true, help: '本地 MVP 使用的发布凭据；正式版应替换为 Vercel OAuth。', placeholder: 'Vercel token' },
  { key: 'VERCEL_TEAM_ID', label: 'Vercel Team ID', group: 'deploy', secret: false, help: '发布到个人账户时可以留空。', placeholder: 'team_…' },
];

export const generatedRuntimeKeys = environmentFields
  .map((field) => field.key)
  .filter((key) => !key.startsWith('VERCEL_'))
  .concat([
    'OPENROUTER_API_KEY',
    'NOWBUILD_AI_GATEWAY_SECRET',
    'NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_STARTER_CREDITS_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_BUILDER_CREDITS_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_LAUNCH_CREDITS_PRICE_ID',
  ]);

export const environmentGroupCopy = {
  login: { name: '登录', provider: 'Clerk', note: '未配置时使用安全演示页，不会再直接报错。' },
  database: { name: '数据库', provider: 'Supabase', note: '业务数据默认仍走缓存；只有产品明确需要持久化时才接入。' },
  payments: { name: '支付', provider: 'Stripe', note: '建议先使用 Test Mode；正式发布前再切换生产 Key。' },
  ai: { name: 'AI 能力', provider: 'NowBuild 托管', note: '无需用户准备 API Key。文本、图片、视频、语音和转写由 NowBuild 的 OpenRouter 网关统一调用、计量和扣费。' },
  deploy: { name: '发布', provider: 'Vercel', note: '当前支持加密保存 Token；正式产品应升级为 OAuth 授权。' },
} as const;
