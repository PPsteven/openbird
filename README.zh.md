# OpenBird

一行命令将 Markdown 发布为可分享网页。

[JotBird](https://jotbird.com) 的开源替代，后端自托管在 Cloudflare 免费额度内。

---

# 第一部分：使用指南

## 特性

- 一行命令发布 Markdown 为美观网页，永久保留
- 零配置临时发布（`--temp`，无需登录，1h 自动过期）
- 本地图片自动上传
- `username/slug` 命名空间永久 URL
- 个人/小团队使用完全免费（Cloudflare Free Tier）
- 零 npm 依赖

## 快速开始

### 前置要求

- Node.js 18+

### 1. 安装 CLI

```bash
git clone https://github.com/PPsteven/openbird.git
cd openbird/cli
npm link

# 验证安装
openbird --version
# → openbird v0.1.0
```

### 2. 登录

```bash
openbird login
```

浏览器将打开登录页面，输入账号密码后获取 API Key 并自动保存。

> **没有账号？** 使用下面的演示账号，或自行部署后端（见第二部分）。

### 3. 发布第一篇文档

```bash
echo "# Hello OpenBird" > hello.md
openbird publish hello.md
# → ✨ Published → https://openbird.jhao.space/quiet-blue-lake
```

浏览器打开输出的 URL 即可看到渲染后的页面。

> **不想登录？** 直接用 `--temp` 发布 1 小时临时页面：
> ```bash
> echo "# Quick Test" > /tmp/test.md
> openbird publish --temp /tmp/test.md
> # → ⚡ Published (temp, 1h) → https://openbird.jhao.space/warm-clear-seed
> ```

## 演示账号

| 项 | 值 |
|----|-----|
| 用户名 | `demo` |
| 密码 | `demo@123` |
| 后端地址 | `https://openbird.jhao.space` |

使用演示账号登录后即可体验完整功能。所有文档对所有人可见，请勿发布敏感内容。

## 命令参考

### openbird login

登录 CLI。token 保存在 `~/.config/openbird/credentials`。

```bash
openbird login
```

也可以通过环境变量提供 API Key（CI/CD 场景）：
```bash
export OPENBIRD_API_KEY="ob_xxx"
```

### openbird publish

发布或更新 Markdown 文档。

```bash
# 发布文件
openbird publish my-doc.md

# 自定义 URL slug
openbird publish --slug my-custom-url my-doc.md

# 发布到命名空间（永久 URL，需先设置 username，slug 自动分配）
openbird publish --namespace my-doc.md

# 命名空间 + 自定义 slug
openbird publish --slug my-page --namespace my-doc.md

# 临时发布（无需登录，1 小时自动过期）
openbird publish --temp my-doc.md

# 从 stdin 发布
cat my-doc.md | openbird publish

# 支持的文件格式：.md .markdown .mdx .txt .text
openbird publish notes.txt
```

| 参数 | 说明 |
|------|------|
| `--slug <value>` | 自定义 URL slug（如 `my-page`，3-60 字符，小写字母数字和连字符） |
| `--namespace` | 发布到 `username/<slug>` 永久 URL，slug 自动分配或配合 `--slug` 指定 |
| `--temp` | 临时发布，无需登录，1 小时后自动过期 |

输出示例：

```
✨ Published → https://openbird.jhao.space/my-custom-url
```

更新已有文档：

```
✓ Updated → https://openbird.jhao.space/my-custom-url
```

### openbird list

列出当前用户的所有已发布文档。

```bash
openbird list
```

输出示例：

```
  my-custom-url  My Document Title
    https://openbird.jhao.space/my-custom-url
  ppsteven/my-page  My Page
    https://openbird.jhao.space/ppsteven/my-page
  2 documents
```

命名空间文档显示为 `username/slug` 格式。

### openbird remove

删除已发布的文档。

```bash
# 通过文件名删除（从 .openbird 映射查找）
openbird remove my-doc.md

# 通过 slug 直接删除
openbird remove my-custom-url

# 删除命名空间文档
openbird remove --namespace my-page

# 或直接传 username/slug
openbird remove ppsteven/my-page
```

输出示例：

```
✓ Removed my-custom-url
```

## 配置参考

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENBIRD_API_URL` | Worker API 地址 | `https://openbird.jhao.space`（公开服务） |
| `OPENBIRD_API_KEY` | API Key（优先级高于 credentials 文件） | 无 |

### 配置文件

API Key 存储在 `~/.config/openbird/credentials`，权限 `0600`。`openbird login` 自动管理此文件。

```bash
# 手动设置
mkdir -p ~/.config/openbird
echo "ob_your_api_key" > ~/.config/openbird/credentials
chmod 600 ~/.config/openbird/credentials
```

### 映射文件 .openbird

发布文件时，CLI 会在当前目录创建 `.openbird` 文件，记录文件名与 URL slug 的映射：

```
# .openbird
my-doc.md = my-custom-url
about.md = ppsteven/my-page
```

后续重复 `openbird publish my-doc.md` 无需再指定 `--slug`，自动更新同一 URL。

---

# 第二部分：自部署

## 前置要求

- Node.js 18+
- Cloudflare 账户（[免费注册](https://dash.cloudflare.com/sign-up)）
- [wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) 4.x+

```bash
npm install -g wrangler
wrangler login
```

## 1. 部署后端

### 方式一：一键脚本（推荐）

```bash
git clone https://github.com/PPsteven/openbird.git
cd openbird/worker

# 配置环境变量
cp .env.example .env
# 编辑 .env，设置你的域名：
#   自定义域名:  OPENBIRD_DOMAIN=openbird.yourdomain.com
#   workers.dev: OPENBIRD_DOMAIN=openbird.yoursubdomain.workers.dev

chmod +x deploy.sh
./deploy.sh
```

脚本会自动创建 KV namespaces、R2 buckets、生成 `wrangler.toml` 并执行部署。

### 方式二：手动部署

```bash
git clone https://github.com/PPsteven/openbird.git
cd openbird/worker

# 创建 KV namespaces（记录输出的 id）
wrangler kv namespace create USERS
wrangler kv namespace create DOCS

# 创建 R2 buckets
wrangler r2 bucket create openbird-pages
wrangler r2 bucket create openbird-images

# 编辑 wrangler.toml，填入上面的 KV namespace id
# [[kv_namespaces]]
# binding = "USERS"
# id = "你输出的id"

# 部署
wrangler deploy
# → Deployed "openbird" → https://openbird.your-subdomain.workers.dev
```

<details>
<summary>可选：绑定自定义域名</summary>

两种方式部署完成后，均可绑定自定义域名：

1. Cloudflare Dashboard → Workers & Pages → openbird → Settings → Domains & Routes
2. 添加自定义域名（如 `openbird.yourdomain.com`）
</details>

## 2. 设置 CLI 指向自托管实例

```bash
export OPENBIRD_API_URL="https://openbird.your-subdomain.workers.dev"
```

## 3. 管理员账号

部署时在 `.env` 中设置 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD`，首次请求时自动创建管理员账号。

管理员可使用 `openbird register` 创建其他用户：

```bash
openbird register --email user@example.com --password "password"
```

---

# 架构

## 整体架构

```
CLI → api.js → Worker /api/v1/*
                   ↓
               KV (USERS + DOCS 索引)
               R2 (PAGES + IMAGES)
                   ↓
Browser → Worker /:slug → R2 → HTML 响应
```

单 Cloudflare Worker 承载全部功能：API + 页面展示 + 图片代理。

## 数据存储

| 存储 | 用途 | 免费额度 |
|------|------|----------|
| KV `USERS` | 用户账号、API Key 哈希、email 索引 | 1 GB |
| KV `DOCS` | 文档元信息（slug、标题、过期时间等） | 1 GB |
| R2 `PAGES` | 渲染后的 HTML 页面 | 10 GB |
| R2 `IMAGES` | 用户上传的图片 | 10 GB |

## 页面渲染

Worker 内置零依赖 Markdown 渲染器，支持：

- 标题（h1-h6）
- 粗体、斜体、行内代码
- 链接、图片
- 无序列表、有序列表
- 引用块、水平线
- 表格
- 代码块（fenced）

页面以完整 HTML 文档返回，内联 CSS 样式，可直接在浏览器中查看。

---

# API 文档

所有 API 需要 `Authorization: Bearer ob_xxx` 请求头（guest publish 除外）。

## POST /api/v1/register

仅管理员可用。创建新用户账号。需要管理员的 API Key。

```bash
curl -X POST https://openbird.jhao.space/api/v1/register \
  -H "Authorization: Bearer ob_admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password","username":"optional-username"}'
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 用户邮箱 |
| `password` | string | 否 | 不传则自动生成随机密码 |
| `username` | string | 否 | 自定义用户名，不传则默认使用邮箱 @ 前部分 |

响应（201）：
```json
{
  "userId": "user_a1b2c3d4e5f6",
  "apiKey": "ob_xxx...",
  "email": "user@example.com",
  "username": "optional-username"
}
```

非管理员调用返回：
```json
{
  "error": "Registration is closed"
}
```

## POST /api/v1/publish

发布或更新文档。

```bash
curl -X POST https://openbird.jhao.space/api/v1/publish \
  -H "Authorization: Bearer ob_xxx" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello\n\nWorld","slug":"my-page"}'
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `markdown` | string | 是 | Markdown 内容（最大 256KB） |
| `slug` | string | 否 | 自定义 URL slug，不提供则自动生成 |
| `namespaced` | boolean | 否 | 设为 `true` 发布到 `username/slug`（需先设置 username） |
| `title` | string | 否 | 页面标题，不提供则从 markdown 首个 `# 标题` 提取 |

响应（201 新建 / 200 更新）：
```json
{
  "slug": "my-page",
  "username": null,
  "url": "https://openbird.jhao.space/my-page",
  "title": "Hello",
  "created": true
}
```

## POST /api/v1/publish（临时发布）

无需认证，发布 1 小时临时页面。需显式传 `temp: true`。

```bash
curl -X POST https://openbird.jhao.space/api/v1/publish \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello Guest","temp":true}'
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `markdown` | string | 是 | Markdown 内容（最大 256KB） |
| `temp` | boolean | 是 | 必须为 `true`，否则返回 401 |
| `slug` | string | 否 | 自定义 slug，不提供则自动生成 |
| `title` | string | 否 | 页面标题 |

响应（201）：
```json
{
  "slug": "warm-clear-seed",
  "url": "https://openbird.jhao.space/warm-clear-seed",
  "title": "Hello Guest",
  "expiresAt": "2026-07-04T11:00:00.000Z",
  "ttlMinutes": 60,
  "guest": true
}
```

## GET /api/v1/documents

列出当前用户的所有文档。

```bash
curl https://openbird.jhao.space/api/v1/documents \
  -H "Authorization: Bearer ob_xxx"
```

响应（200）：
```json
{
  "documents": [
    {
      "slug": "my-page",
      "username": null,
      "title": "Hello",
      "url": "https://openbird.jhao.space/my-page",
      "source": "api",
      "updatedAt": "2026-07-04T10:00:00.000Z",
      "expiresAt": null
    }
  ]
}
```

结果按 `updatedAt` 降序排列。命名空间文档 `username` 字段非 null。

## DELETE /api/v1/documents

删除文档。

```bash
# 删除普通文档
curl -X DELETE "https://openbird.jhao.space/api/v1/documents?slug=my-page" \
  -H "Authorization: Bearer ob_xxx"

# 删除命名空间文档
curl -X DELETE "https://openbird.jhao.space/api/v1/documents?slug=my-page&namespaced=true" \
  -H "Authorization: Bearer ob_xxx"
```

响应（200）：
```json
{ "ok": true }
```

## POST /api/v1/upload-image

上传图片。

```bash
curl -X POST https://openbird.jhao.space/api/v1/upload-image \
  -H "Authorization: Bearer ob_xxx" \
  -F "file=@photo.png"
```

支持格式：png, jpeg, gif, webp, svg。最大 10 MB。

响应（200）：
```json
{
  "url": "https://openbird.jhao.space/images/user_abc123/a1b2c3d4.png"
}
```

## GET /:slug

访问已发布的页面。

```bash
curl https://openbird.jhao.space/my-page
# → HTML 文档
```

## GET /:username/:slug

访问命名空间页面。

```bash
curl https://openbird.jhao.space/ppsteven/my-page
# → HTML 文档
```

---

# 开发

## 本地开发

```bash
# 启动本地 Worker（含 KV + R2 模拟）
cd worker
wrangler dev
# → Ready on http://localhost:8787

# 在另一个终端测试
curl -X POST http://localhost:8787/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

CLI 开发时指向本地 Worker：

```bash
cd cli
export OPENBIRD_API_URL="http://localhost:8787"
node src/cli.js publish test.md
```

## 项目结构

```
pagebird/
├── AGENTS.md                 # AI Agent 规则与约定
├── README.md                 # 项目文档（英文）
├── README.zh.md              # 项目文档（中文）
├── docs/                     # 设计文档
│   ├── D0-reference.md       # JotBird 逆向参考
│   ├── D1-worker-core.md     # Worker 后端 Spec
│   ├── D2-cli-core.md        # CLI 核心 Spec
│   ├── D3-images.md          # 图片上传 Spec
│   ├── D4-namespace.md       # 命名空间 Spec
│   ├── D5-deployment.md      # 部署验证 Spec
│   ├── D6-documentation.md   # 文档完善 Spec
│   ├── architecture.md       # 架构与决策
│   ├── status.md             # 进度跟踪
│   └── troubleshoot.md       # 踩坑记录
├── worker/                   # Cloudflare Worker
│   ├── src/index.js          # Worker 主程序
│   ├── wrangler.toml         # Worker 配置
│   └── package.json
└── cli/                      # CLI 工具
    ├── src/
    │   ├── cli.js            # 命令行入口
    │   ├── api.js            # API 客户端
    │   ├── config.js         # 配置管理
    │   ├── files.js          # 文件类型校验
    │   ├── images.js         # 图片上传与重写
    │   ├── login.js          # 登录流程
    │   └── mapping.js        # .openbird 映射管理
    └── package.json
```

## 技术栈

| 层 | 技术 |
|----|------|
| CLI | Node.js 18+ ESM，零依赖 |
| Worker | Cloudflare Workers (V8 isolate) |
| 页面存储 | Cloudflare R2 |
| 索引存储 | Cloudflare KV |
| 图片存储 | Cloudflare R2 |
| 部署 | wrangler CLI |

---

# License

MIT
