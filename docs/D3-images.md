# Spec 3: Images

> 交付物：CLI 发布含本地图片的 markdown 时自动上传图片，Worker 接收并存储。
> 前置依赖：Spec 1 + Spec 2 已完成。

---

## 验证标准

```bash
# 准备含图片的 markdown
echo '# Demo\n![photo](./pic.png)' > /tmp/test-img.md
cp some-image.png /tmp/pic.png

# 发布
node cli/src/cli.js publish /tmp/test-img.md
# → 输出包含 "1 image uploaded"
# → ✨ Published → https://share.jhao.space/xxx

# 验证图片可访问
curl -I https://share.jhao.space/images/user_xxx/yyy.png
# → 200
```

---

## Worker 变更

### wrangler.toml 新增

```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "openbird-images"
```

部署前：`wrangler r2 bucket create openbird-images`

注意：页面 HTML 使用的 R2 bucket 是 `PAGES`（D1 中创建），图片使用的 R2 bucket 是 `IMAGES`，两者独立。

### 新增路由

```javascript
if (path === "/api/v1/upload-image" && method === "POST") return handleUploadImage(request, env)
if (path.startsWith("/images/")) return serveImage(path, env)
```

### handleUploadImage(request, env)

1. `verifyAuth` → 401
2. 解析 multipart form data → 提取 file 字段
3. 校验 content-type 在允许列表：
   ```
   image/png, image/jpeg, image/gif, image/webp, image/svg+xml
   ```
4. 校验 size ≤ 10 MB (10485760 bytes)
5. 从 content-type 推断扩展名：
   ```
   png → .png, jpeg → .jpg, gif → .gif, webp → .webp, svg+xml → .svg
   ```
6. 生成 key: `images/${userId}/${randomHex(16)}.${ext}`
7. `env.IMAGES.put(key, fileBuffer, { httpMetadata: { contentType } })`
8. 返回：`{ "url": "${SHARE_URL}/${key}" }`

### serveImage(path, env)

1. `key = path.slice(1)` → 去掉开头 `/`
2. `env.IMAGES.get(key)` → 不存在返回 404
3. 返回 body，带正确的 Content-Type header（从 R2 object metadata 取）
4. 加 Cache-Control: `public, max-age=31536000, immutable`

### multipart 解析

Workers 环境可用 `request.formData()`：

```javascript
const form = await request.formData()
const file = form.get("file")
if (!file || typeof file === "string") → 400 "Missing file field"
const buffer = await file.arrayBuffer()
const contentType = file.type
const fileName = file.name
```

---

## CLI 变更

### 新增 src/images.js

```javascript
import { readFileSync, existsSync, statSync } from "node:fs"
import { resolve, dirname, basename, extname } from "node:path"
import { getApiKey, API_BASE, USER_AGENT } from "./config.js"

const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" }
const MAX_SIZE = 10 * 1024 * 1024
const CONCURRENCY = 3

export function findLocalImages(markdown, docDir) {
  const images = [], seen = new Set()
  const re = /!\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(markdown)) !== null) {
    const ref = m[1].trim()
    if (ref.startsWith("http://") || ref.startsWith("https://")) continue
    const abs = resolve(docDir, ref)
    if (!seen.has(abs)) { seen.add(abs); images.push({ ref, abs }) }
  }
  return images
}

async function uploadOne(buffer, fileName, contentType) {
  const apiKey = getApiKey()
  const form = new FormData()
  form.append("file", new Blob([buffer], { type: contentType }), fileName)
  const resp = await fetch(`${API_BASE}/api/v1/upload-image`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
    body: form,
  })
  if (!resp.ok) { const t = await resp.text().catch(() => ""); throw new Error(t || "Upload failed") }
  const data = await resp.json()
  return data.url
}

export async function uploadAndRewriteImages(markdown, filePath) {
  const docDir = dirname(resolve(filePath))
  const images = findLocalImages(markdown, docDir)
  if (images.length === 0) return markdown

  // 校验 & 准备
  const tasks = []
  for (const img of images) {
    const ext = extname(img.abs).toLowerCase()
    const ct = IMAGE_TYPES[ext]
    if (!ct) { console.error(`  ⚠ Skipping unsupported format: ${img.ref}`); continue }
    if (!existsSync(img.abs)) { console.error(`  ⚠ Not found: ${img.ref}`); continue }
    if (statSync(img.abs).size > MAX_SIZE) { console.error(`  ⚠ Over 10 MB: ${img.ref}`); continue }
    tasks.push({ img, buffer: readFileSync(img.abs), name: basename(img.abs), ct })
  }
  if (tasks.length === 0) return markdown

  // 并发上传
  const urlMap = new Map()
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map(t => uploadOne(t.buffer, t.name, t.ct)))
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") urlMap.set(batch[j].img.ref, results[j].value)
      else console.error(`  ⚠ Failed: ${batch[j].img.ref}: ${results[j].reason.message}`)
    }
  }

  // 重写路径
  let result = markdown
  for (const [localRef, remoteUrl] of urlMap) {
    const escaped = localRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    result = result.replace(new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}(\\))`, "g"), `$1${remoteUrl}$2`)
  }

  if (urlMap.size > 0) console.error(`  ${urlMap.size} image${urlMap.size > 1 ? "s" : ""} uploaded`)
  return result
}
```

### cli.js 修改

在 `cmdPublish` 中，读取文件后、调用 publish 前，插入：

```javascript
import { uploadAndRewriteImages } from "./images.js"

// ... 读取文件后
if (filename) {
  markdown = await uploadAndRewriteImages(markdown, filename)
}
```

---

## 文件结构（本次变更）

```
worker/
├── wrangler.toml          # 新增 [[r2_buckets]]
└── src/
    └── index.js           # 新增 handleUploadImage + serveImage 路由

cli/src/
└── images.js              # 🆕 新增：图片发现、上传、路径重写

cli/src/cli.js             # 修改：cmdPublish 中插入 uploadAndRewriteImages 调用
```

---

## 数据模型

### R2 Bucket: openbird-images

| Key 格式 | Content-Type | 元数据 | 说明 |
|----------|------|------|------|
| `images/{userId}/{randomHex16}.{ext}` | image/* | `{ contentType }` | 用户上传的图片 |

公开访问 URL：`https://share.jhao.space/images/{userId}/{randomHex16}.{ext}`

### 缓存策略

R2 对象通过 Worker 代理返回时设置：
```
Cache-Control: public, max-age=31536000, immutable
```
图片内容不可变（同名 key 不会覆盖），永久缓存。

---

## 设计说明

### 为什么图片存 R2 而非 KV

R2 免费 10GB 存储，无出口流量费。KV 免费 1GB 且 value 最大 25MB。图片 10MB/张，R2 是正确选择。R2 还支持原生 Content-Type 和 Cache-Control 元数据。

### 为什么上传路径包含 userId

防止不同用户上传同名文件互相覆盖。`images/{userId}/{uuid}.{ext}` 确保全局唯一。

### 为什么 CLI 先上传再 publish

Markdown 中的本地图片路径（`./images/photo.png`）在发送到 API 前必须替换为远程 URL。否则 Worker 渲染时无法访问本地文件系统。上传→重写→publish 的顺序保证 Worker 收到的 markdown 中已是可访问的远程 URL。

### 为什么并发数设为 3

单张图片上传通常 1-3 秒。并发 3 张可在大文档（10 张图片）下将总上传时间从 ~20s 降到 ~7s。更高的并发数（如 5）在慢速网络下可能触发服务端限频，3 是保守且有效的选择。

### 为什么上传失败不中断 publish

图片上传是辅助功能，不应阻塞核心发布流程。某张图上传失败时打印警告继续发布，未上传的图片保留本地路径（Worker 渲染时显示为 broken image）。

### 为什么 stdin 模式不做图片上传

stdin 输入的 markdown 没有关联的"文件目录"，无法解析 `./images/photo.png` 相对路径。如果未来需要，可以通过 `--base-dir` 参数指定。

---

## 边界情况

| 场景 | 处理方式 |
|------|----------|
| markdown 中无本地图片 | 跳过图片处理，直接 publish |
| 图片路径指向不存在的文件 | 打印 `⚠ Not found: {path}`，跳过该图片 |
| 图片超过 10MB | 打印 `⚠ Over 10 MB: {path}`，跳过该图片 |
| 图片格式不支持（如 .bmp .tiff） | 打印 `⚠ Skipping unsupported format: {path}`，跳过该图片 |
| 图片上传时网络错误 | 打印 `⚠ Failed: {path}: {error}`，继续处理其他图片 |
| 同一图片被引用多次 | `findLocalImages` 用 Set 按绝对路径去重，只上传一次 |
| 图片是 http/https URL | 跳过，不处理远程 URL |
| Worker 端上传时未认证 | 返回 401，CLI 端当作上传失败 |
| Worker 端 R2 put 失败 | 返回 500 级别错误，CLI 端打印失败信息 |
| R2 对象被意外删除 | Worker serveImage 返回 404，页面显示 broken image |
| 大文件分片上传（>5GB） | R2 单对象限制 5GB，但图片上限 10MB，不会触发 |

---

## 注意事项

- stdin 模式不做图片上传（无文件路径参考，无法解析相对路径）
- 原始 .md 文件不修改，只有发送到 API 的 markdown 内容中路径被替换
- 上传失败不中断整个 publish 流程，只打印警告
