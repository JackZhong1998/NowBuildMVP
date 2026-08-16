---
name: nowbuild-onboarding
description: 帮用户在 Cursor、Claude Code、Codex 三个平台快速接入并跑通 NowBuild SaaS Kit。只要用户提到“接入框架”“快速启动项目”“配置环境变量”“在 Cursor/Claude Code/Codex 使用这个开源项目”“本地跑不起来”“部署前检查”，就应主动使用本技能，给出一步步可执行命令和验证清单，确保项目在本地可启动、核心依赖可用、关键页面可访问。
---

# NowBuild Onboarding Skill

## 目标

让用户在最短时间完成以下结果：

1. 成功安装依赖并启动项目。
2. 正确配置 `.env.local`，避免泄漏密钥。
3. 跑通认证、支付、数据库、分析所需最小配置。
4. 在 Cursor、Claude Code、Codex 中都能复用同一套接入流程。

## 项目事实（固定）

- 项目名：`nowbuild-saas-kit`
- 技术栈：Next.js 15 + TypeScript + Tailwind CSS 4
- 关键服务：Supabase Auth + Database、Stripe、Google Analytics
- 关键命令：
  - 安装依赖：`npm install`
  - 本地开发：`npm run dev`
  - 生产构建：`npm run build`
  - 生产启动：`npm run start`
- 环境变量模板：`.env.example`
- 数据库初始化 SQL：`supabase/schema.sql`

## 必须遵守的原则

1. 不输出或回显用户密钥原文，最多展示掩码（如 `sk_test_****`）。
2. 明确提醒 `.env.local` 不要提交到仓库。
3. 先跑“最小可用链路”（本地启动 + 首页可访问），再做进阶配置（Webhook、生产部署等）。
4. 每一步给出可复制命令，不要只讲概念。

## 标准工作流

### Step 1: 识别上下文

优先确认以下信息（缺什么问什么，最多一次性问 3-5 条）：

- 当前平台：Cursor / Claude Code / Codex
- 是否已在项目根目录
- Node.js 版本是否 >= 18
- 是否已有 `.env.local`
- 是否只要本地跑通，还是要连真实第三方服务

### Step 2: 执行最短启动路径

默认给出这组命令：

```bash
npm install
cp .env.example .env.local
npm run dev
```

然后指导用户打开 `http://localhost:3000` 验证页面是否可访问。

### Step 3: 引导环境变量最小集

先告诉用户可分两阶段：

- **阶段 A（本地结构验证）**：保留占位符，先确认项目可启动。
- **阶段 B（功能联调）**：逐项填真实值。

按顺序引导填写：

1. Supabase Auth
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. Stripe
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID`
3. Supabase 服务端数据库访问
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_REF`（仅 NowBuild MCP 配置数据库时需要）
   - `SUPABASE_ACCESS_TOKEN`（仅 NowBuild MCP 配置数据库时需要，不部署到生成项目）
4. Analytics
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Step 4: 数据库初始化（需要真实 Supabase 时）

优先在 NowBuild 中预览 `supabase/schema.sql`，明确确认后通过 Supabase MCP 执行；也可将 SQL 复制到 Supabase SQL Editor 手动执行。

### Step 5: 结果验收

至少检查：

- 首页 `/` 能打开
- 登录页 `/sign-in` 能打开
- 定价页 `/pricing` 能打开
- 控制台无阻塞型报错（端口冲突、缺少关键 env、构建失败）

## 分平台执行指南

### Cursor

- 优先使用内置终端在项目根目录运行命令。
- 需要改配置时，直接编辑 `.env.local`。
- 当用户说“你直接帮我接入”，按“标准工作流”逐步执行并反馈每一步结果。

### Claude Code

- 用命令行方式执行同样流程，重点是把每一步结果转成简明状态（成功/失败/下一步）。
- 若遇到权限或网络限制，立即给出替代方案（例如先用占位符验证启动链路）。

### Codex

- 默认以“最短命令 + 明确检查点”输出，减少解释性废话。
- 若用户让你直接操作代码仓库，优先改动最少文件（通常只涉及 `.env.local` 和必要说明文档）。
- 提供可复现排错命令，保证用户可在本地独立重跑。

## 常见问题与处理

1. `Missing environment variable ...`
   - 检查 `.env.local` 是否存在、变量名是否拼写一致、是否重启开发服务。

2. Stripe Webhook 本地不生效
   - 引导使用：
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   - 将 CLI 输出的 `whsec_...` 写入 `STRIPE_WEBHOOK_SECRET`。

3. Supabase 查询失败或无表
   - 确认执行过 `supabase/schema.sql`。
   - 确认 URL 与 key 来自同一个 Supabase 项目。

4. Node 版本不兼容
   - 要求升级到 Node.js 18+ 后重新 `npm install`。

## 输出格式（每次回复尽量遵循）

按以下结构回复，保持高可执行性：

1. 当前状态判断（1-2 句）
2. 现在就执行的命令（代码块）
3. 执行后预期结果（1-3 条）
4. 失败时排查（最多 3 条）
5. 下一步（单一、明确）

## 示例触发请求

- “帮我在 Cursor 里把这个 SaaS 框架跑起来。”
- “我想在 Claude Code 接入这个开源项目，先本地启动。”
- “Codex 里怎么最快配置这个项目的 env？”
- “为什么我按 README 配了还是跑不起来？”
