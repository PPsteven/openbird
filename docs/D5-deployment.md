# Spec 5: 远程部署验证

> 交付物：Worker 部署到 Cloudflare 并完成全端点端到端验证。
> 前置依赖：D1-D4 已完成。

---

## 验证标准

```bash
# === Part A: 本地验证（wrangler dev） ===

# A1. 启动本地 Worker
cd worker && wrangler dev
# → 输出 localhost:8787

# A2. 注册用户
curl -s -X POST http://localhost:8787/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
# → {"userId":"user_xxx","apiKey":"ob_xxx"}

# A3. 发布文档
curl -s -X POST http://localhost:8787/api/v1/publish \
  -H "Authorization: Bearer ob_xxx" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello\n\nThis is a test.","slug":"hello-world"}'
# → {"slug":"hello-world","url":"https://share.jhao.space/hello-world","title":"Hello","ttlDays":90}

# A4. 页面可访问
curl -s http://localhost:8787/hello-world
# → HTML（包含 # Hello 渲染结果）

# A5. 列表
curl -s http://localhost:8787/api/v1/documents \
  -H "Authorization: Bearer ob_xxx"
# → {"documents":[{...}]}

# A6. 删除
curl -s -X DELETE "http://localhost:8787/api/v1/documents?slug=hello-world" \
  -H "Authorization: Bearer ob_xxx"
# → {"success":true}

# A7. 删除后 404
curl -s http://localhost:8787/hello-world
# → Not Found

# A8. 图片上传
curl -s -X POST http://localhost:8787/api/v1/upload-image \
  -H "Authorization: Bearer ob_xxx" \
  -F "file=@test.png"
# → {"url":"https://share.jhao.space/images/..."}

# A9. 图片可访问
curl -s http://localhost:8787/images/user_xxx/abc123.png
# → 图片二进制数据

# A10. namespace 发布（需要先设置 username）
curl -s -X PUT http://localhost:8787/api/v1/account \
  -H "Authorization: Bearer ob_xxx" \
  -H "Content-Type: application/json" \
  -d '{"username":"ppsteven"}'
# → {"success":true}

curl -s -X POST http://localhost:8787/api/v1/publish \
  -H "Authorization: Bearer ob_xxx" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# My Page","slug":"my-page","namespaced":true}'
# → {"slug":"my-page","url":"https://share.jhao.space/@ppsteven/my-page"}

curl -s http://localhost:8787/@ppsteven/my-page
# → HTML

# A11. namespace 删除
curl -s -X DELETE "http://localhost:8787/api/v1/documents?slug=my-page&namespaced=true" \
  -H "Authorization: Bearer ob_xxx"
# → {"success":true}


# === Part B: CLI 本地验证 ===

# B1. Login
node cli/src/cli.js login
# → 弹出浏览器或提示手动输入 token

# B2. Publish 文件
echo "# Test CLI Publish" > /tmp/test-cli.md
node cli/src/cli.js publish /tmp/test-cli.md
# → ✨ Published → https://share.jhao.space/xxx

# B3. List
node cli/src/cli.js list
# → 列出已发布文档

# B4. Publish 更新（重复发布同一文件）
node cli/src/cli.js publish /tmp/test-cli.md
# → ✓ Updated → https://share.jhao.space/xxx

# B5. Remove
node cli/src/cli.js remove /tmp/test-cli.md
# → ✓ Removed xxx


# === Part C: 远程部署 ===

# C1. 确认 wrangler 已登录
wrangler whoami
# → 显示 Cloudflare 账户

# C2. 部署 Worker
cd worker && wrangler deploy
# → Deployed "openbird" → https://openbird.{subdomain}.workers.dev

# C3. 远程 curl 验证（用部署后的 URL 替换 localhost）
OPENBIRD_URL="https://openbird.{subdomain}.workers.dev"

# 注册
curl -s -X POST "$OPENBIRD_URL/api/v1/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"remote-test@example.com","password":"test123456"}'
# → {"userId":"user_xxx","apiKey":"ob_xxx"}

# 发布 + 页面访问
# （重复 A3-A11 的命令，替换 localhost 为远程 URL）


# === Part D: 自定义域名（可选） ===

# D1. 在 Cloudflare Dashboard 中：
#   Workers & Pages → openbird → Settings → Domains & Routes
#   添加自定义域名: openbird.jhao.space

# D2. 设置 SHARE_URL 环境变量
wrangler secret put SHARE_URL
# → 输入 https://share.jhao.space

# D3. 验证域名访问
curl -s https://openbird.jhao.space/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"domain-test@example.com","password":"test123456"}'
# → 正常返回
```

---

## 文件结构

本次为验证类 Spec，不新增源代码文件。变更范围：

```
worker/wrangler.toml        # 确认配置完整性，可能需要 routes 或 custom_domains
docs/troubleshoot.md        # 新增：部署踩坑记录
```

---

## 核心代码

### 1. wrangler.toml 配置检查

```toml
# 当前 worker/wrangler.toml 关键部分
name = "openbird"
main = "src/index.js"
compatibility_date = "2024-12-01"

# 检查项：
# 1. compatibility_date 不能太旧（影响 Web Crypto API 可用性）
# 2. routes 或 custom_domains 是否需要配置？
#    - workers.dev 子域名：不需要，自动分配
#    - 自定义域名：需要在 Dashboard 手动绑定，或写 routes
#    - routes 必须放在 [[kv_namespaces]] 之前！
# 3. 所有 KV/R2 binding ID 是否正确
# 4. vars.SHARE_URL 值是否正确

# 如果使用自定义域名，添加：
# routes = [
#   { pattern = "openbird.jhao.space", custom_domain = true }
# ]
```

### 2. 部署检查清单

```javascript
// 部署前检查函数（伪代码，实际手动逐项确认）
const preDeployChecks = [
  { name: "wrangler whoami",               pass: true },
  { name: "KV USERS namespace exists",     pass: true },
  { name: "KV DOCS namespace exists",      pass: true },
  { name: "R2 openbird-pages exists",      pass: true },
  { name: "R2 openbird-images exists",     pass: true },
  { name: "SHARE_URL env var set",         pass: true },
  { name: "wrangler dev 所有端点通过",      pass: true },
  { name: "CLI 所有命令通过",               pass: true },
]
```

### 3. 部署后冒烟测试脚本

```javascript
// deploy-and-smoke.sh — 部署 + 冒烟测试一体化脚本
// Step 1: wrangler deploy
// Step 2: 等待部署生效（sleep 5）
// Step 3: 逐项 curl 验证 11 个端点
// Step 4: 汇总结果（PASS/FAIL 数量）

const BASE = process.argv[2] || "http://localhost:8787"

const tests = [
  { name: "register",    method: "POST", path: "/api/v1/register",    body: { email: "smoke@test.com", password: "test123" }, expect: 201 },
  { name: "publish",     method: "POST", path: "/api/v1/publish",     body: { markdown: "# Hi", slug: "smoke-test" }, expect: 201 },
  { name: "page",        method: "GET",  path: "/smoke-test",                                                      expect: 200 },
  { name: "list",        method: "GET",  path: "/api/v1/documents",                                                expect: 200 },
  { name: "remove",      method: "DELETE", path: "/api/v1/documents?slug=smoke-test",                              expect: 200 },
  { name: "page-404",    method: "GET",  path: "/smoke-test",                                                      expect: 404 },
]
```

---

## 设计说明

### 为什么部署验证需要独立 Spec

之前的 D1-D4 都在 `wrangler dev` 本地环境通过，但远程部署有其独特挑战：

1. **DNS 传播延迟**：workers.dev 子域名刚注册后需要等待
2. **自定义域名绑定**：wrangler.toml 的 routes 格式有坑（必须在 kv_namespaces 之前）
3. **R2/KV 实际环境差异**：本地模拟 vs 远程实际可能有行为差异
4. **环境变量注入**：`SHARE_URL` 需要通过 `wrangler secret put` 设置，不在 toml 中

### 部署策略

```
本地验证全部通过 → wrangler deploy → 远程冒烟测试 → 自定义域名绑定 → 最终验证
```

### 自定义域名 vs workers.dev

| 方案 | 优点 | 缺点 |
|------|------|------|
| workers.dev 子域名 | 零配置，自动 HTTPS | URL 不美观 |
| 自定义域名 (openbird.jhao.space) | 语义化 URL，与设计一致 | 需要在 Dashboard 手动绑定 |

推荐使用自定义域名，因为 `SHARE_URL` 设计为 `https://share.jhao.space`，与 workers.dev 子域名不匹配。

### 为什么 routes 放在 kv_namespaces 之前

这是之前踩过的坑：`wrangler.toml` 解析器将 `routes` 识别为顶层字段，但如果放在 `[[kv_namespaces]]` 之后，会被解析为该 TOML table array 的子字段，导致部署失败。

### 边界情况

| 场景 | 处理方式 |
|------|----------|
| wrangler deploy 失败 | 检查 wrangler whoami 是否登录、网络是否可达 |
| 部署成功但 curl 超时 | 等待 DNS 传播（1-5 分钟），或用 `--verbose` 看详细错误 |
| R2 bucket 不存在 | 在 Dashboard 手动创建，ID 写入 wrangler.toml |
| KV namespace 不存在 | 在 Dashboard 手动创建，ID 写入 wrangler.toml |
| 自定义域名无法绑定 | 确认域名 DNS 在 Cloudflare 托管，SSL 证书自动签发 |
| 旧版本残留 | `wrangler deploy` 是原子替换，不存在旧版本问题 |
| 环境变量未生效 | `wrangler secret put` 后需重新 `wrangler deploy` 或等待 propagation |
| wrangler dev 通过但远程不通过 | 可能是 R2/KV 绑定 ID 不匹配或权限问题 |

---

## 数据模型

无新增数据模型。验证过程使用现有 KV/R2 结构。

---

## 部署/测试

```bash
# 1. 确认前置条件
wrangler whoami

# 2. 本地全量验证
cd worker && wrangler dev &
# 运行 Part A + Part B 全部命令

# 3. 部署
wrangler deploy

# 4. 获取 workers.dev URL
# 从 wrangler deploy 输出中获取，或
wrangler deployments list

# 5. 远程冒烟测试
# 替换 BASE 为远程 URL，运行 Part C 命令

# 6. 绑定自定义域名（可选）
# Cloudflare Dashboard: Workers & Pages → openbird → Settings → Domains & Routes
# 添加 openbird.jhao.space

# 7. 最终验证
# 用自定义域名运行 Part C 命令
```
