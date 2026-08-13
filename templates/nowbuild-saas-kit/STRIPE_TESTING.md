# Stripe 测试文档

这个文档用于验证项目中的 Stripe 订阅支付流程是否正常，包括：

- 前端发起 Checkout
- Stripe 回调 Webhook
- Supabase 订阅状态写入/更新
- 取消订阅后的状态变化

---

## 1. 测试前准备

先确认 `.env.local` 中 Stripe 变量已配置：

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

然后启动本地服务：

```bash
npm run dev
```

---

## 2. 启动本地 Webhook 转发（必须）

Stripe 不能直接访问本地 `localhost`，需要 Stripe CLI 转发：

```bash
# 第一次使用先登录
stripe login

# 转发 webhook 到本地
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

执行后会看到类似输出：

```bash
Ready! Your webhook signing secret is whsec_xxxxxxxxx
```

将该 `whsec_xxx` 复制到 `.env.local` 的 `STRIPE_WEBHOOK_SECRET`，然后重启 `npm run dev`。

---

## 3. Stripe 测试账号（测试卡信息）

在 Stripe Checkout 支付页，使用下面的测试卡号即可模拟不同场景：

| 场景 | 卡号（Card number） | 到期日 | CVC | 邮编 |
|------|----------------------|--------|-----|------|
| 支付成功（最常用） | `4242 4242 4242 4242` | 任意未来日期（如 `12/34`） | 任意 3 位（如 `123`） | 任意（如 `10001`） |
| 需要 3D Secure 验证 | `4000 0025 0000 3155` | 任意未来日期 | 任意 3 位 | 任意 |
| 支付失败（余额不足） | `4000 0000 0000 9995` | 任意未来日期 | 任意 3 位 | 任意 |

> 说明：Stripe 测试模式不会产生真实扣款，以上仅用于开发验证。

---

## 4. 推荐测试流程（一步步）

### 4.1 测试“支付成功”流程

1. 本地访问 `http://localhost:3000`
2. 注册或登录一个测试用户（Clerk）
3. 进入定价页，选择 Pro（月付或年付）并发起支付
4. 在 Stripe Checkout 中使用成功卡：`4242 4242 4242 4242`
5. 支付完成后应跳回：
   - `http://localhost:3000/pricing?success=true`

**预期结果：**

- Stripe CLI 终端能看到事件投递成功（2xx）
- 事件至少包含：`checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.payment_failed`
- Supabase `subscriptions` 表新增或更新当前用户记录，`status` 为 `active`

### 4.2 测试“3DS 验证”流程

1. 重复上面的购买流程
2. 使用卡号：`4000 0025 0000 3155`
3. 在 Stripe 模拟验证页完成认证

**预期结果：**

- 完成认证后支付成功
- Webhook 正常进入 `checkout.session.completed`
- 订阅状态正确写入

### 4.3 测试“支付失败”流程

1. 重复购买流程
2. 使用失败卡号：`4000 0000 0000 9995`

**预期结果：**

- Checkout 页面提示支付失败
- 页面不会进入 `success=true`
- Supabase 不应产生有效激活订阅

---

## 5. 测试取消订阅

1. 先完成一次成功支付（确保已有有效订阅）
2. 到 Stripe Dashboard（Test mode）找到该客户订阅并取消
3. 观察 Webhook 事件：`customer.subscription.deleted`

**预期结果：**

- 本地接口 `/api/webhooks/stripe` 返回成功
- Supabase `subscriptions.status` 被更新为 `canceled`

---

## 6. 快速排错

- 报错 `Missing signature`：
  - 检查 `STRIPE_WEBHOOK_SECRET` 是否与当前 `stripe listen` 输出一致
- Webhook 不触发：
  - 确认 `stripe listen --forward-to localhost:3000/api/webhooks/stripe` 正在运行
- 提示 `Price not configured`：
  - 检查两个 `price_` 变量是否填写正确
- 无法创建 Checkout：
  - 检查 `STRIPE_SECRET_KEY` 是否为 `sk_test_` 且有效

---

## 7. 上线前提醒

本测试文档默认基于 **Stripe Test 模式**。切换到生产环境前请确认：

- 已替换为 `pk_live_` / `sk_live_`
- Webhook endpoint 指向正式域名 `/api/webhooks/stripe`
- 使用正式环境的 `STRIPE_WEBHOOK_SECRET`
