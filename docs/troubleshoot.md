# Troubleshoot

> 开发过程中遇到的坑和解决方式。

---

## wrangler.toml 配置

### routes 位置必须放在数组配置之前

`routes` 必须放在 `[[kv_namespaces]]`、`[[r2_buckets]]` 等数组配置**之前**，否则 TOML 解析器会将其视为前一个数组元素的子字段，导致 `wrangler deploy` 报错 `Unexpected fields found in r2_buckets[0] field: "routes"`。

```
# ❌ 错误：routes 被解析为 r2_buckets 的子字段
[[r2_buckets]]
binding = "PAGES"
bucket_name = "openbird-pages"

routes = [
  { pattern = "openbird.jhao.space", custom_domain = true }
]

# ✅ 正确：routes 放在数组之前
routes = [
  { pattern = "openbird.jhao.space", custom_domain = true }
]

[[r2_buckets]]
binding = "PAGES"
bucket_name = "openbird-pages"
```

### [env.production] 不继承顶层 binding

`[env.production]` 环境不会自动继承顶层 `[[kv_namespaces]]` 和 `[[r2_buckets]]`，需要重复声明。初期直接用顶层配置即可，避免环境配置带来的复杂度。

---

## workers.dev 子域名

### 注册方式

`wrangler deploy` 在非交互环境下无法完成 workers.dev 子域名注册（fallback 为 no）。需通过 Cloudflare API 手动操作：

```bash
# 1. 从 wrangler 配置中取 OAuth token
OAUTH_TOKEN=$(grep oauth_token ~/Library/Preferences/.wrangler/config/default.toml | cut -d'"' -f2)

# 2. 创建 workers.dev 子域名（PUT）
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/subdomain" \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"openbird"}'

# 3. 为指定 script 启用 workers.dev 路由（POST）
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{script_name}/subdomain" \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

### DNS 传播延迟

workers.dev 子域名注册后需要等待 DNS 传播（数分钟到数小时），期间 curl 会报 `connect timeout`。此时应使用 `wrangler dev` 本地验证，不要等待远程。

---

## R2

### 需先手动启用

R2 bucket 创建前需先在 Cloudflare Dashboard 手动启用 R2 服务（R2 > "Enable R2"），否则 API 返回 `code: 10042`。

---

## 本地开发与验证

### wrangler dev 替代远程测试

远程 DNS 未就绪时，`wrangler dev` 可完全模拟生产环境（含 KV、R2 binding），所有端点均可本地验证：

```bash
wrangler dev --port 8787

# 在另一个终端测试
curl -X POST http://localhost:8787/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

### npm install 非必需

`wrangler` 已全局安装时，`worker/package.json` 中的 devDependencies 仅在需要特定版本时才需安装。`wrangler deploy` 直接可用，无需 `npm install`。

---

## Worker Markdown 渲染

### 图片正则必须在链接正则之前

Worker 的 markdown 渲染器中，`![]()`（图片）和 `[]()`（链接）共用相似的正则模式。如果链接正则先执行，`![photo](url)` 会被 `[]()` 正则捕获为 `!<a href="url">photo</a>`，导致图片无法渲染。

**修复**：交换正则执行顺序，图片先匹配。

```javascript
// ✅ 正确顺序
result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
```

### 查看已部署版本

即使 Worker 没有绑定 route，仍可通过以下命令确认版本已成功上传：

```bash
wrangler deployments list
```
