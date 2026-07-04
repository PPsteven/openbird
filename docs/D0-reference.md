# JotBird 参考（只读）

> 本文件是 JotBird 的技术逆向参考，不修改。开发 OpenBird 时对标此文件确认兼容性。

## CLI 命令

```
jotbird login
jotbird publish <file.md>
jotbird publish --slug <slug> <file>
jotbird publish --namespace <slug> <file>
jotbird publish                         # stdin
jotbird remove <file.md|slug>
jotbird remove --namespace <slug>
jotbird list
jotbird help / --version
```

## API 端点

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/v1/publish | 发布/更新 |
| GET | /api/v1/documents | 列出文档 |
| DELETE | /api/v1/documents?slug=xx&namespaced=bool | 删除 |

## POST /api/v1/publish

请求：
```json
{ "markdown": "...", "title?": "...", "slug?": "...", "namespaced?": false }
```

响应 (201 new / 200 update)：
```json
{
  "slug": "bright-calm-meadow",
  "username": null,
  "url": "https://share.jotbird.com/bright-calm-meadow",
  "title": "Hello World",
  "expiresAt": "2026-05-10T12:00:00.000Z",
  "ttlDays": 90,
  "created": true
}
```

## GET /api/v1/documents

响应：
```json
{
  "documents": [{
    "slug": "...", "username": null, "title": "...",
    "url": "...", "source": "cli|api|web|mcp",
    "updatedAt": "...", "expiresAt": "..."
  }]
}
```

## DELETE /api/v1/documents

响应：`{ "ok": true }`

## 图片上传

POST `api.jotbird.com/preview/upload-image`  
multipart/form-data, field: `file`  
响应：`{ "url": "https://..." }`

## 认证

- Header: `Authorization: Bearer jb_xxx`
- Key 格式: `jb_` + 随机
- 存储: `~/.config/jotbird/credentials` (mode 0600)
- 环境变量: `JOTBIRD_API_URL`

## 映射文件 (.jotbird)

```
file.md = slug
file.md = @username/slug
```

## 限制

- Markdown ≤ 256 KB (UTF-8)
- HTML ≤ 512 KB
- Image ≤ 10 MB
- Slug: `/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/`
- Rate: 10/hr (free), 100/hr (pro)
- Active docs: 10 (free), unlimited (pro)

## Slug 自动生成

三词格式: `{adj}-{adj}-{noun}` (如 bright-calm-meadow)

## 错误格式

```json
{ "error": "Human-readable message" }
```

| Code | 含义 |
|------|------|
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权/限额 |
| 404 | 未找到 |
| 413 | 过大 |
| 429 | 频率限制 |
| 503 | 服务不可用 |
