# Spec 4: Namespace

> 交付物：支持 `--namespace` 发布到 `@username/slug` 永久 URL。
> 前置依赖：Spec 1 + Spec 2 已完成。

---

## 验证标准

```bash
# 先给用户设置 username（需要直接写 KV，或加个 API）
# 假设用户已有 username = "ppsteven"

# 1. 发布到命名空间
node cli/src/cli.js publish --namespace my-page /tmp/test.md
# → ✨ Published → https://share.jhao.space/@ppsteven/my-page

# 2. 再次发布（自动更新）
node cli/src/cli.js publish /tmp/test.md
# → ✓ Updated → https://share.jhao.space/@ppsteven/my-page

# 3. 验证映射文件
cat .openbird
# → test.md = @ppsteven/my-page

# 4. 页面可访问
curl https://share.jhao.space/@ppsteven/my-page
# → HTML

# 5. 删除
node cli/src/cli.js remove --namespace my-page
# → ✓ Removed @ppsteven/my-page
```

---

## Worker 变更

### 新增路由

```javascript
// 在页面路由中增加 @username 匹配
if (path.startsWith("/@")) return serveNamespacedPage(path, env)
```

### handlePublish 扩展

在现有逻辑基础上，当 `body.namespaced === true` 时：

1. slug 必须由客户端提供（不自动生成）→ 无 slug 返回 400
2. 从 user 对象取 username → 无 username 返回 403 "Username required for namespaced publishing"
3. KV key 使用 `ns:{username}/{slug}` 而非 `doc:{slug}`
4. `expiresAt = null`, `ttlDays = null`（永久，不设 KV TTL）
5. 响应中 `username` 字段填入用户 username
6. `url = SHARE_URL + "/@" + username + "/" + slug`

修改后写入逻辑：
```javascript
if (namespaced) {
  const kvKey = `ns:${user.username}/${slug}`
  const r2Key = `pages/@${user.username}/${slug}/index.html`
  await env.PAGES.put(r2Key, html, {
    httpMetadata: { contentType: "text/html" },
    customMetadata: { userId, title, slug, username: user.username, createdAt: now, updatedAt: now }
  })
  await env.DOCS.put(kvKey, JSON.stringify(meta))
  await env.DOCS.put(`user:${userId}:docs:@${user.username}/${slug}`, "1")
} else {
  // 原有逻辑
}
```

### handleRemove 扩展

当 query `namespaced=true` 时：
1. 从 user 取 username
2. KV key = `ns:{username}/{slug}`
3. R2 key = `pages/@{username}/{slug}/index.html`
4. 删除 R2 + KV 索引

### handleList 扩展

list 结果中，如果索引 key 含 `@`（如 `user:xxx:docs:@ppsteven/my-page`）：
- 读取使用 `ns:ppsteven/my-page` 而非 `doc:xxx`
- 返回结果中 `username` 字段非 null

### serveNamespacedPage(path, env)

```javascript
// path = "/@ppsteven/my-page"
const match = path.match(/^\/@([^/]+)\/(.+)$/)
if (!match) return new Response("Not Found", { status: 404 })
const [, username, slug] = match

const obj = await env.PAGES.get(`pages/@${username}/${slug}/index.html`)
if (!obj) return new Response("Not Found", { status: 404 })
return new Response(obj.body, {
  headers: { "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" }
})
```

---

## CLI 变更

### 参数解析

`cmdPublish` 的参数解析增加 `--namespace`：

```javascript
function parsePublishArgs(fileArgs) {
  let slug = null, namespaced = false
  const files = []
  for (let i = 0; i < fileArgs.length; i++) {
    if (fileArgs[i] === "--slug" && i + 1 < fileArgs.length) { slug = fileArgs[++i] }
    else if (fileArgs[i] === "--namespace" && i + 1 < fileArgs.length) { slug = fileArgs[++i]; namespaced = true }
    else files.push(fileArgs[i])
  }
  return { slug, namespaced, files }
}
```

### 映射文件格式

命名空间文档在 `.openbird` 中记录为 `@username/slug`：

```
test.md = @ppsteven/my-page
```

解析映射值时判断：
```javascript
function parseSlugValue(value) {
  if (value.startsWith("@") && value.includes("/")) {
    const slash = value.indexOf("/")
    return { slug: value.slice(slash + 1), namespaced: true }
  }
  return { slug: value, namespaced: false }
}
```

### publish 调用

```javascript
const result = await publish({ markdown, slug, namespaced })
// 保存映射
const mappingValue = result.username ? `@${result.username}/${result.slug}` : result.slug
setMapping(filename, mappingValue)
```

### remove --namespace

```javascript
// cmdRemove 中解析 --namespace flag
let forceNamespaced = false
const positional = []
for (const arg of removeArgs) {
  if (arg === "--namespace") forceNamespaced = true
  else positional.push(arg)
}

// 也支持直接传 @username/slug
const target = positional[0]
if (target.startsWith("@")) {
  // 从 @username/slug 提取 slug
  const slash = target.indexOf("/")
  slug = target.slice(slash + 1)
  namespaced = true
}
```

---

## User 设置 username

### 新增 API（可选）

```
PUT /api/v1/account  { "username": "ppsteven" }
```

或更简单：直接通过 wrangler CLI 手动写 KV：

```bash
# 手动设置（MVP 阶段够用）
wrangler kv key put --binding USERS "user:user_xxx" '{"id":"user_xxx","email":"...","username":"ppsteven",...}'
```

正式实现时可在 Spec 05 中补充 account 管理 API。

---

## 文件结构（本次变更）

所有变更是对 D1 + D2 的增量修改，不新增文件。

```
worker/src/index.js    # 修改：路由、handlePublish、handleRemove、handleList、新增 serveNamespacedPage
cli/src/cli.js         # 修改：参数解析、映射读写、remove 命令
```

---

## 数据模型

### DOCS KV 新增

| Key | Value | TTL | 说明 |
|-----|-------|-----|------|
| `ns:{username}/{slug}` | DocMetaJSON | 无 | 命名空间文档元信息 |
| `user:{userId}:docs:@{username}/{slug}` | `"1"` | 无 | 用户命名空间文档索引 |

### R2 新增

| Key | Content-Type | 说明 |
|-----|------|------|
| `pages/@{username}/{slug}/index.html` | text/html | 命名空间页面 HTML |

### UserJSON 新增字段

```json
{
  "id": "user_abc123",
  "username": "ppsteven",
  "...": "..."
}
```

---

## 设计说明

### 为什么命名空间文档用独立 KV prefix

`ns:{username}/{slug}` 与 `doc:{slug}` 分离，避免同 slug 的命名空间文档和普通文档互相覆盖。一个用户可以有 `doc:my-page`（普通）和 `ns:ppsteven/my-page`（命名空间）两个独立文档。

### 为什么命名空间文档无 TTL

命名空间 URL（`@username/slug`）代表用户的永久身份，不应过期。普通文档 90 天 TTL 是为清理废弃内容。`ns:` prefix 的文档不设 KV expiration。

### 为什么命名空间不自动生成 slug

命名空间 slug 是用户选择的永久标识（如 `my-resume`、`api-docs`），不应由系统随机分配。`--namespace` 必须提供 slug，否则报错。

### 为什么 username 存在 UserJSON 中而非单独 KV key

减少 KV 读次数。publish 时已加载 user 对象用于 auth，username 直接可用。额外一次 `USERS.get("username:" + userId)` 会增加 50% 的 KV 读延迟。

### 为什么 CLI 映射文件记录 @username/slug 全路径

`.openbird` 文件中 `test.md = @ppsteven/my-page` 同时编码了 username 和 slug。后续 `openbird publish test.md` 无需 `--namespace` 即可自动更新同一命名空间 URL。用 `parseSlugValue` 解析 @ 前缀。

---

## 边界情况

| 场景 | 处理方式 |
|------|----------|
| 用户无 username 执行 --namespace publish | 返回 403 `"Username required for namespaced publishing"` |
| --namespace 未提供 slug | 返回 400 `"--namespace requires a slug"` |
| 命名空间 slug 格式非法 | 同普通 slug 校验，返回 400 |
| 同一用户重复发布同一命名空间 slug | 更新已有文档（200），不创建新文档 |
| 不同用户发布相同命名空间 slug | 独立存在（ns:userA/page 和 ns:userB/page 不冲突） |
| CLI remove 不带 --namespace 但映射指向命名空间 | `parseSlugValue` 自动检测 @ 前缀，走 namespaced 删除 |
| CLI remove @username/slug 直接传全路径 | 支持，自动解析 slug 和 namespaced 标志 |
| serveNamespacedPage 路径不匹配 /@user/slug 格式 | 返回 404 |
| list 结果混合普通文档和命名空间文档 | 命名空间文档显示为 `@username/slug`，url 正确 |
| 命名空间文档被普通 remove 尝试删除 | 普通 remove 查 `doc:{slug}` 找不到，返回 404；用户需用 `--namespace` 删除 |
| 普通文档被命名空间 remove 尝试删除 | 查 `ns:{username}/{slug}` 找不到，返回 404 |

---

## 注意事项

- namespaced 文档无 TTL（永久）
- slug 在命名空间内唯一（不同用户可有同名 slug）
- 一个用户的 namespaced 和非 namespaced 文档是完全独立的（同 slug 可共存）
- `openbird list` 输出中命名空间文档显示为 `@username/slug`
