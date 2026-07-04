# Architecture

> 项目基础、技术决策、开发环境。实现 Spec 前的必读文档。

---

## 项目基础

OpenBird — JotBird 的开源自托管替代品。一行命令将 Markdown 发布为可分享网页，后端自托管在 Cloudflare 免费额度内。

**目标：**
1. CLI 命令与 JotBird 100% 兼容
2. 零 npm dependencies
3. 单次 `wrangler deploy` 部署全部后端
4. 个人/小团队使用完全免费

**范围：**
- publish / list / remove / login 四个核心命令
- Markdown → HTML 页面渲染与展示
- 本地图片自动上传
- @username/slug 命名空间 URL

---

## 架构

单 Cloudflare Worker 全承载（API + 页面展示 + 图片代理），配合 R2（页面 HTML + 图片）和 KV（用户 + 文档索引）。

```
CLI → api.js → Worker /api/v1/*
                  ↓
              KV (USERS + DOCS 索引)
              R2 (PAGES + IMAGES)
                  ↓
Browser → Worker /:slug → R2 → HTML 响应
```

### 关键路径

Publish 流程：
```
CLI: 读文件 → 上传图片(D3) → POST /api/v1/publish → 保存映射
Worker: 验证auth → 渲染markdown → R2 存 HTML → KV 存索引 → 响应
```

Page 访问流程：
```
Browser: GET /bright-calm-meadow
Worker: R2.get("pages/bright-calm-meadow/index.html") → 返回 HTML
```

---

## 技术决策

| 决策 | 理由 |
|------|------|
| 单 Worker 不拆分 | 简化部署，免费额度足够 |
| R2 存页面 HTML | 对象存储天然适合文件，免费 10GB，比 KV 大 10 倍 |
| KV 只存索引 | R2.list 不支持按用户过滤，KV 做轻量索引（~200 字节/篇） |
| R2 存图片 | 无出口流量费，免费 10GB |
| 零依赖 | Worker 包大小限制；与 JotBird 一致 |
| API Key SHA-256 hash 存储 | KV 泄露不暴露明文 |
| 初始阶段 Worker 单文件 | 减少摩擦，验证后再拆 |
| 不做 Pro/Free 区分 | 自托管不需要收费分层 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| CLI | Node.js 18+ ESM, 零依赖 |
| Worker | Cloudflare Workers (V8 isolate) |
| 页面存储 | Cloudflare R2（渲染后的 HTML） |
| 索引存储 | Cloudflare KV（文档元信息 + 用户） |
| 图片存储 | Cloudflare R2 |
| 部署 | wrangler CLI |

## 开发环境

- macOS, Node.js v22.17.0 (nvm)
- wrangler 4.106.0（已全局安装，已 OAuth 登录）
- Cloudflare 账户 ID: `8fee9be1204057d1830f7c85ffcdccbd`
- 域名: `jhao.space`（DNS 在 Cloudflare）

## 平台约束

- Workers: 无 Node.js 内置模块，包大小 ≤ 10MB，CPU 10ms(free)
- KV: 1000 写/天(free), 100000 读/天, value ≤ 25MB
- R2: 10GB 存储(free), 单对象 ≤ 5GB, Class A 100万/月(写), Class B 1000万/月(读)

## 工具

- `jotbird` CLI v0.3.3（全局安装，参考实现）
- `wrangler`（部署工具）
