# History: D1 Worker Core

> 开发过程记录。2026-07-04

---

## 概述

实现 D1 Worker Core spec，交付可 `wrangler deploy` 的 Cloudflare Worker，支持 register/publish/list/remove + Markdown→HTML 页面展示。

## 创建的文件

| 文件 | 说明 |
|------|------|
| `worker/package.json` | 项目配置，scripts: dev/deploy |
| `worker/wrangler.toml` | KV (USERS, DOCS) + R2 (PAGES) binding |
| `worker/src/index.js` | 364 行单文件实现，全部逻辑 |

## 实现的功能

- `POST /api/v1/register` — 用户注册，返回 userId + apiKey
- `POST /api/v1/publish` — 发布 markdown，自动/指定 slug
- `GET /api/v1/documents` — 列出用户文档
- `DELETE /api/v1/documents?slug=` — 删除文档
- `GET /{slug}` — 访问渲染后的 HTML 页面
- 内置正则 Markdown 渲染器（零依赖，GFM 核心子集）
- SHA-256 API Key 认证
- 三词 slug 自动生成（adj-adj-noun）

## 部署步骤

```bash
# 1. 创建 KV namespaces
wrangler kv namespace create USERS   # id: 1f8b84e63f32422e84568590356b586a
wrangler kv namespace create DOCS    # id: 78dc6fe0f0364f9288539d3342802f16

# 2. 创建 R2 bucket（需先在 Dashboard 启用 R2）
wrangler r2 bucket create openbird-pages

# 3. 注册 workers.dev 子域名（通过 API）
curl -X PUT .../workers/subdomain -d '{"subdomain":"openbird"}'
curl -X POST .../workers/scripts/openbird/subdomain -d '{"enabled":true}'

# 4. 部署
wrangler deploy
# → https://openbird.openbird.workers.dev
```

## 验证结果

本地 `wrangler dev` 全部 5 个端点验证通过：

| 端点 | 结果 |
|------|------|
| POST /api/v1/register | 201 `{ userId, apiKey }` |
| POST /api/v1/publish | 201 `{ slug, url, title, ... }` |
| GET /{slug} | 200 HTML 页面 |
| GET /api/v1/documents | 200 `{ documents: [...] }` |
| DELETE /api/v1/documents?slug= | 200 `{ ok: true }` |

远程部署后 workers.dev DNS 传播中，暂未完成远程 curl 验证。

## 踩坑

详见 `docs/troubleshoot.md`，主要包括：

1. wrangler.toml 中 `routes` 必须放在 `[[kv_namespaces]]` 之前
2. workers.dev 子域名需通过 API 手动注册
3. R2 需先在 Dashboard 启用
4. `[env.production]` 不继承顶层 binding
5. DNS 传播延迟期间可用 `wrangler dev` 本地验证

## 后续

- 等待 workers.dev DNS 生效后远程 curl 验证
- 在 Cloudflare Dashboard 绑定自定义域名（openbird.jhao.space, share.jhao.space）
- 进入 D2 CLI Core 实现
