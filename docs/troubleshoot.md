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

---

## D5: 远程部署验证

### workers.dev 远程连接超时（部分地区）

`wrangler deploy` 成功后，workers.dev 子域名 DNS 可解析但 TCP 连接超时（IPv4/IPv6 均超时）。疑似部分地区网络限制导致 Cloudflare Workers 边缘节点不可达。

**验证方式**：
- `wrangler whoami` 确认登录状态
- `wrangler deployments list` 确认版本已上传
- 通过 Cloudflare API 确认子域名注册和启用状态
- 使用 `wrangler dev` 本地模拟完全验证（含 KV + R2 binding）

### handlePublish 指定 slug 创建新文档返回 404

**问题**：`POST /api/v1/publish` 带 `{"slug":"my-slug","markdown":"..."}` 创建新文档时，返回 `{"error":"Document not found"}`。

**根因**：`worker/src/index.js:157` 在 slug 已提供但文档不存在时，`else` 分支直接返回 404，不允许新建。

**修复**：删除 `else { return json({ error: "Document not found" }, 404) }`，当 slug 不存在时直接创建新文档（`isNew` 保持 `true`）。

## D8/D9: Worker 落地页 + Admin Register

### seedAdminUser 函数位置与函数提升

`seedAdminUser` 调用 `randomHex` 和 `sha256`，这两个函数在文件末尾定义。如果写成 `const randomHex = ...` 箭头函数，会因 temporal dead zone 报错（`randomHex is not a function`）。必须使用 `function` 声明（函数提升）或把 `seedAdminUser` 放在文件末尾。

**修复**：使用 `function randomHex(bytes) { ... }` 而非 `const randomHex = (bytes) => { ... }`。

### 静态资源模板字面量中的 `${}`

`LANDING_HTML` 等常量使用反引号模板字面量（`` ` ``）。如果 HTML 内容包含 `${...}` 语法（如 CSS 变量 `var(--accent)` 不含 `$` 所以安全），JS 会尝试插值。site/index.html 不含 `${}` 所以安全，但更新 site/ 内容时需注意。

### 本地测试时需清除 wrangler state

每次修改 Worker 源码后重启 `wrangler dev`，旧 KV state 可能缓存。测试 seed 逻辑前需清除：

```bash
rm -rf worker/.wrangler/state
```

### 响应格式不一致（spec vs 实际）

| 端点 | Spec 预期 | 实际返回 | 影响 |
|------|----------|---------|------|
| `DELETE /api/v1/documents` | `{"success":true}` | `{"ok":true}` | 验证脚本需适配 |
| `PUT /api/v1/account` | `{"success":true}` | `{"username":"ppsteven"}` | 验证脚本需适配 |

非 bug，是设计选择。`ok` 更符合 JS 惯例，`username` 返回确认写入的值。

---

## D10: Publish Redesign

### wrangler.toml vars 覆盖 .env

`wrangler.toml` 中的 `vars = { ADMIN_EMAIL = "{{ADMIN_EMAIL}}", ADMIN_PASSWORD = "{{ADMIN_PASSWORD}}" }` 会**覆盖** `.env` 文件中的同名变量，因为 wrangler 优先使用 toml 中的 `vars`。如果 `{{ADMIN_EMAIL}}` 是未替换的占位符，Worker 启动时会收到字面量 `{{ADMIN_EMAIL}}` 而非 `.env` 中的值。

**修复**：本地测试时临时移除 `vars` 行，或确保 `{{...}}` 占位符已被 deploy.sh 替换。

### --namespace 改为 boolean 后 CLI 行为变更

`--namespace` 不再接受参数值。旧用法 `--namespace my-slug` 需改为 `--slug my-slug --namespace`。Worker 端 namespaced 路径已支持无 slug 时自动分配随机 slug。

---

## D12: Username 冲突检测

### Spec 验证脚本中 alice2@example.com 不会派生 alice

D12 spec 的验证标准 1b 预期 `alice2@example.com` 自动派生 `alice` 从而与 1a 的 `alice@example.com` 冲突。实际上 `alice2@example.com` 派生 `alice2`，不会冲突。正确测试冲突的方式是显式指定 `--username alice` 或使用不同 email 前缀的用户。
