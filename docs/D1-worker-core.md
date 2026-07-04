# Spec 1: Worker Core

> 交付物：`worker/` 目录，可 `wrangler deploy` 部署，支持 publish/list/remove + 页面展示。

---

## 验证标准

部署后用 curl 能跑通以下流程：

```bash
# 1. 注册
curl -X POST https://openbird.jhao.space/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# → { "userId": "...", "apiKey": "ob_..." }

# 2. 发布
curl -X POST https://openbird.jhao.space/api/v1/publish \
  -H "Authorization: Bearer ob_xxx" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello\n\nWorld"}'
# → { "slug": "...", "url": "https://share.jhao.space/...", "created": true, ... }

# 3. 访问页面
curl https://share.jhao.space/{slug}
# → HTML 页面

# 4. 列出文档
curl https://openbird.jhao.space/api/v1/documents \
  -H "Authorization: Bearer ob_xxx"
# → { "documents": [...] }

# 5. 删除
curl -X DELETE "https://openbird.jhao.space/api/v1/documents?slug={slug}" \
  -H "Authorization: Bearer ob_xxx"
# → { "ok": true }
```

---

## 文件结构

```
worker/
├── src/
│   └── index.js      # 单文件实现（先不拆分模块）
├── wrangler.toml
└── package.json
```

初始阶段用单文件 `index.js` 实现全部逻辑，后续再拆分。

---

## package.json

```json
{
  "name": "openbird-worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

---

## wrangler.toml

```toml
name = "openbird"
main = "src/index.js"
compatibility_date = "2024-12-01"

[vars]
SHARE_URL = "https://share.jhao.space"

[[kv_namespaces]]
binding = "USERS"
id = "__FILL_AFTER_CREATE__"

[[kv_namespaces]]
binding = "DOCS"
id = "__FILL_AFTER_CREATE__"

[[r2_buckets]]
binding = "PAGES"
bucket_name = "openbird-pages"
```

部署前需执行：
```bash
wrangler kv namespace create USERS   # 填入 wrangler.toml
wrangler kv namespace create DOCS    # 填入 wrangler.toml
wrangler r2 bucket create openbird-pages
```

---

## index.js 接口规范

### 路由

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    if (path === "/api/v1/register" && method === "POST") return handleRegister(request, env)
    if (path === "/api/v1/publish" && method === "POST") return handlePublish(request, env)
    if (path === "/api/v1/documents" && method === "GET") return handleList(request, env)
    if (path === "/api/v1/documents" && method === "DELETE") return handleRemove(request, env)

    if (path.startsWith("/") && path.length > 1) return servePage(path.slice(1), env)

    return new Response("Not Found", { status: 404 })
  }
}
```

### handleRegister(request, env)

输入：`{ email, password }`

逻辑：
1. 校验 email 非空、password 非空
2. `env.USERS.get("email:" + email)` → 如已存在返回 400
3. 生成 `userId = "user_" + randomHex(12)`
4. 生成 `apiKey = "ob_" + randomHex(32)`
5. `passwordHash = await sha256(password)`
6. `keyHash = await sha256(apiKey)`
7. 写入 KV：
   - `env.USERS.put("user:" + userId, JSON.stringify({ id: userId, email, passwordHash, keys: [{ prefix: apiKey.slice(0,7), hash: keyHash, createdAt: now }], createdAt: now }))`
   - `env.USERS.put("email:" + email, userId)`
   - `env.USERS.put("apikey:" + keyHash, JSON.stringify({ userId, createdAt: now }))`
8. 返回 201: `{ userId, apiKey }`

### verifyAuth(request, env) → { userId, user }

1. 取 `Authorization` header → 提取 `Bearer ob_xxx`
2. 如果无 header 或格式错误 → 返回 null
3. `keyHash = await sha256(key)`
4. `env.USERS.get("apikey:" + keyHash)` → 解析得 userId
5. 如果不存在 → 返回 null
6. `env.USERS.get("user:" + userId)` → 解析得 user
7. 返回 `{ userId, user }`

### handlePublish(request, env)

输入：`{ markdown, title?, slug? }`

逻辑：
1. `verifyAuth` → 失败返回 401
2. 校验 markdown 非空 → 400
3. 校验 markdown 字节数 ≤ 262144 → 413
4. 如果有 slug：
   - 校验格式 `/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/` → 400
   - 读 `env.DOCS.get("doc:" + slug)` → 解析
   - 如果存在且 `doc.userId !== userId` → 403
   - 如果不存在 → 404 "Document not found"
5. 如果无 slug：
   - 生成三词 slug，检查冲突（`env.DOCS.get("doc:" + slug)` 是否存在）
   - 最多重试 5 次，全部冲突 → 503
6. `title` = 参数 title || 从 markdown 提取第一个 `# xxx` || "Untitled"
7. `html = renderMarkdown(markdown)`
8. 校验 html 字节数 ≤ 524288 → 413
9. `expiresAt = new Date(Date.now() + 90 * 86400000).toISOString()`
10. 写入 R2：
    ```javascript
    const htmlKey = `pages/${slug}/index.html`
    await env.PAGES.put(htmlKey, html, {
      httpMetadata: { contentType: "text/html" },
      customMetadata: { userId, title, slug, createdAt: now, updatedAt: now, expiresAt }
    })
    ```
11. 写入 KV 索引：
    ```javascript
    const meta = { slug, title, userId, source: "api", createdAt: now, updatedAt: now, expiresAt, ttlDays: 90 }
    await env.DOCS.put("doc:" + slug, JSON.stringify(meta), { expirationTtl: 90 * 86400 })
    await env.DOCS.put("user:" + userId + ":docs:" + slug, "1", { expirationTtl: 90 * 86400 })
    ```
12. 返回 201 (new) 或 200 (update)：
    ```json
    { "slug": "...", "username": null, "url": "SHARE_URL/slug", "title": "...", "expiresAt": "...", "ttlDays": 90, "created": true/false }
    ```

### handleList(request, env)

1. `verifyAuth` → 失败返回 401
2. `env.DOCS.list({ prefix: "user:" + userId + ":docs:" })` → 获取 keys
3. 对每个 key，提取 slug → `env.DOCS.get("doc:" + slug)` → 解析
4. 过滤 null（已过期）
5. 按 updatedAt 倒序
6. 返回：`{ documents: [{ slug, username, title, url, source, updatedAt, expiresAt }] }`

### handleRemove(request, env)

1. `verifyAuth` → 失败返回 401
2. 从 URL query 取 `slug` → 必需，否则 400
3. 读 `env.DOCS.get("doc:" + slug)` → 不存在返回 404
4. 校验 `doc.userId === userId` → 否则 403
5. 删除：
   - `env.PAGES.delete("pages/" + slug + "/index.html")`
   - `env.DOCS.delete("doc:" + slug)`
   - `env.DOCS.delete("user:" + userId + ":docs:" + slug)`
6. 返回：`{ "ok": true }`

### servePage(slug, env)

1. `env.PAGES.get("pages/" + slug + "/index.html")` → 不存在返回 404
2. 返回 body，Content-Type: text/html
3. 加 Cache-Control: `public, max-age=3600`（1 小时缓存）

---

## renderMarkdown(markdown) → html

纯函数，正则实现。处理顺序：

1. 代码块 (```...```) → `<pre><code>`（先提取保护，防止内部被处理）
2. 表格 (`| ... |`) → `<table>`
3. 标题 (`# `) → `<h1>` ~ `<h6>`
4. 水平线 (`---`) → `<hr>`
5. 引用块 (`> `) → `<blockquote>`
6. 无序列表 (`- ` / `* `) → `<ul><li>`
7. 有序列表 (`1. `) → `<ol><li>`
8. 段落（空行分隔）→ `<p>`
9. 行内：`**bold**` → `<strong>`, `*italic*` → `<em>`, `` `code` `` → `<code>`, `[text](url)` → `<a>`, `![alt](url)` → `<img>`

---

## wrapHtml(content, title) → string

```html
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — OpenBird</title>
<style>
body{max-width:768px;margin:0 auto;padding:2rem 1.5rem;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;color:#1a1a1a}
h1,h2{border-bottom:1px solid #eee;padding-bottom:.3em}
code{background:#f4f4f4;padding:.2em .4em;border-radius:3px;font-size:.9em}
pre{background:#f4f4f4;padding:1em;border-radius:6px;overflow-x:auto}
pre code{background:none;padding:0}
blockquote{border-left:4px solid #ddd;margin:1em 0;padding:.5em 1em;color:#555}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:.5em .75em}
th{background:#f8f8f8}
img{max-width:100%;height:auto}
a{color:#0366d6}
</style>
</head>
<body>
<article>${content}</article>
</body>
</html>
```

---

## 辅助函数

```javascript
// SHA-256 hash (Web Crypto API)
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("")
}

// 随机十六进制
function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2,"0")).join("")
}

// Slug 生成
const ADJECTIVES = ["bright","calm","swift","red","blue","green","warm","cool","dark","light","sharp","soft","wild","bold","quick","slow","deep","high","low","wide","thin","long","short","clear","pure","dry","wet","raw","rare","kind","wise","fair","fine","rich","new","late","free","full","safe","sure","true","real","open","flat","pale","vast","keen","neat","warm","glad"]
const NOUNS = ["meadow","river","ocean","forest","mountain","valley","field","garden","lake","creek","hill","cliff","canyon","desert","island","shore","beach","cloud","storm","wind","rain","snow","frost","flame","stone","rock","pearl","coral","cedar","maple","pine","oak","wolf","fox","hawk","crane","swan","dove","fish","bear","deer","owl","moth","rose","lily","vine","fern","moss","leaf","seed"]

function generateSlug() {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]
  let adj1 = pick(ADJECTIVES), adj2 = pick(ADJECTIVES)
  while (adj2 === adj1) adj2 = pick(ADJECTIVES)
  return `${adj1}-${adj2}-${pick(NOUNS)}`
}
```

---

## 数据模型

### R2 Bucket: openbird-pages

| Key | Content-Type | Custom Metadata | 说明 |
|-----|------|------|------|
| `pages/{slug}/index.html` | text/html | `{ userId, title, slug, createdAt, updatedAt }` | 渲染后的 HTML 页面 |

页面访问：`GET /{slug}` → Worker 读 `R2.get("pages/{slug}/index.html")` → 返回 HTML

### DOCS KV（轻量索引）

| Key | Value | TTL | 说明 |
|-----|-------|-----|------|
| `doc:{slug}` | DocMetaJSON | 90天 | 文档元信息（无 html/markdown） |
| `user:{userId}:docs:{slug}` | `"1"` | 90天 | 用户文档索引（list 用） |

**DocMetaJSON：**
```json
{
  "slug": "bright-calm-meadow",
  "title": "Hello World",
  "userId": "user_abc123",
  "source": "api",
  "createdAt": "2026-07-02T10:00:00.000Z",
  "updatedAt": "2026-07-02T10:00:00.000Z",
  "expiresAt": "2026-09-30T10:00:00.000Z",
  "ttlDays": 90
}
```

### USERS KV

| Key | Value | TTL | 说明 |
|-----|-------|-----|------|
| `user:{userId}` | UserJSON | 无 | 用户信息 |
| `email:{email}` | userId (string) | 无 | 邮箱→用户映射 |
| `apikey:{sha256Hash}` | `{ userId, createdAt }` | 无 | API Key 认证索引 |

**UserJSON：**
```json
{
  "id": "user_abc123",
  "email": "test@test.com",
  "passwordHash": "sha256:abc123...",
  "keys": [{ "prefix": "ob_a1b2", "hash": "sha256:...", "createdAt": "..." }],
  "createdAt": "2026-07-02T10:00:00.000Z"
}
```

---

## 设计说明

### 为什么 HTML 存 R2 而非 KV

R2 是对象存储，天然适合存文件（HTML）。免费 10GB，比 KV 的 1GB 大 10 倍。单篇 HTML ~20KB，R2 可存 50 万篇。KV 只存元信息（~200 字节/篇），轻量且 list 速度快。

### 为什么 KV 仍保留 DOCS 索引

R2.list 不支持按用户过滤（只能按 prefix 遍历全部对象）。KV 的 `user:{userId}:docs:{slug}` 索引让 list 接口可以在毫秒级返回用户文档列表，无需遍历全部 R2 对象。

### 为什么去掉 `/:slug.md` 接口

JotBird 有这个功能但极少使用。去掉后 KV 不需要存 markdown 副本，value 从 ~30KB 降到 ~200 字节。如果未来需要，可以单独存 markdown 到 R2 `pages/{slug}/index.md`。

### 为什么页面 Cache-Control 只设 1 小时

用户 publish 更新后，浏览器缓存需要在一定时间内失效。1 小时是合理的折中：日常访问走缓存（快），publish 后最多 1 小时用户能看到新内容。

### 为什么单 Worker 单文件

单 Worker 全承载 API + 页面服务，一个 `wrangler deploy` 搞定。初期用单文件 `index.js` 而非拆模块：代码量小（~500 行），功能验证后再拆不迟。

### 为什么 API Key 存 hash 不存明文

KV value 可能被日志或错误输出泄露。存 `SHA-256(key)` 作为索引 key，即使 KV 全泄露也无法还原 token。

### 为什么 Worker 内置正则渲染器

不用 marked/remark 等 npm 包：Worker 包大小限制 1MB（压缩后），第三方 Markdown 库普遍 50-100KB。正则渲染器覆盖 GFM 核心子集（标题、代码块、表格、列表），够用且包体积 ~5KB。

---

## 边界情况

| 场景 | 处理方式 |
|------|----------|
| 邮箱已注册 | 返回 400 `"Email already registered"` |
| 无 Authorization header | 返回 401 `"Invalid API key"` |
| markdown 为空字符串 | 返回 400 `"Missing markdown field"` |
| markdown 超过 256KB | 返回 413 `"Markdown too large (max 262144 bytes)"` |
| slug 格式非法（含大写/特殊字符） | 返回 400 `"Invalid slug format"` |
| slug 存在但属于其他用户 | 返回 403 `"Document not owned by user"` |
| slug 不存在（更新时） | 返回 404 `"Document not found"` |
| 自动生成 slug 5 次冲突 | 返回 503 `"Failed to allocate document slug"` |
| 渲染后 HTML 超过 512KB | 返回 413 `"Rendered HTML too large (max 524288 bytes)"` |
| 访问已过期文档 | `doc:{slug}` 已被 KV TTL 清理 → 404 |
| DOCS.get 返回 null（TTL 已过） | 返回 404，与"从未存在"无区别 |
| 并发 publish 同一 slug | 后到的请求覆盖先到的（KV 最终一致，无锁） |
| list 结果超过 1000 条 | KV list 默认 limit 1000，足够个人使用 |

---

## 部署步骤

```bash
cd worker
npm install
wrangler kv namespace create DOCS      # 填入 wrangler.toml
wrangler kv namespace create USERS     # 填入 wrangler.toml
wrangler deploy
# 绑定域名（见 AGENTS.md 约定）
```
