# Spec 7: 一键部署脚本

> 交付物：`worker/deploy.sh` — 用户只需改一行配置，运行一个命令完成后端部署。
> 前置依赖：D1-D6 已完成。

---

## 验证标准

```bash
# 1. 复制配置模板
cp .env.example .env
# 编辑 .env，设置 OPENBIRD_DOMAIN=openbird.yourdomain.com

# 2. 一键部署
./deploy.sh
# → OpenBird Deployment Script
# → Checking wrangler login status... OK
# → Domain: openbird.yourdomain.com
# → Setting up KV namespaces...
# →   OPENBIRD_USERS: abc123...
# →   OPENBIRD_DOCS: def456...
# → Setting up R2 buckets...
# →   openbird-pages: created
# →   openbird-images: created
# → Generating wrangler.toml...
# →   wrangler.toml generated
# → Deploying Worker...
# → ✅ Deployment complete!

# 3. 验证 Worker 可访问
curl -X POST https://openbird.yourdomain.com/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# → {"userId":"user_...","apiKey":"ob_..."}

# 4. workers.dev 域名部署
OPENBIRD_DOMAIN=openbird.yoursubdomain.workers.dev ./deploy.sh
# → workers.dev domain detected, skipping custom domain route
```

---

## 文件结构

```
worker/
├── .env.example              # 用户配置模板（仅需改 OPENBIRD_DOMAIN）
├── wrangler.toml.template    # wrangler.toml 模板（含占位符）
├── deploy.sh                 # 一键部署脚本
├── .gitignore                # 忽略 .env 和 wrangler.toml
├── src/index.js              # 修改：env.USERS → env.OPENBIRD_USERS 等
└── wrangler.toml             # 不再提交 git（模板渲染产物）
```

---

## 核心代码

### .env.example

```bash
# 你的域名，例如：
#   自定义域名:  OPENBIRD_DOMAIN=openbird.yourdomain.com
#   workers.dev: OPENBIRD_DOMAIN=openbird.yoursubdomain.workers.dev
OPENBIRD_DOMAIN=openbird.yourdomain.com
```

### wrangler.toml.template

```toml
name = "openbird"
main = "src/index.js"
compatibility_date = "2024-12-01"

routes = [
  { pattern = "{{OPENBIRD_DOMAIN}}", custom_domain = true }
]

vars = { SHARE_URL = "https://{{OPENBIRD_DOMAIN}}" }

[[kv_namespaces]]
binding = "OPENBIRD_USERS"
id = "{{OPENBIRD_USERS_KV_ID}}"

[[kv_namespaces]]
binding = "OPENBIRD_DOCS"
id = "{{OPENBIRD_DOCS_KV_ID}}"

[[r2_buckets]]
binding = "PAGES"
bucket_name = "openbird-pages"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "openbird-images"
```

### deploy.sh 核心逻辑

```bash
# 1. 检查前置条件
command -v wrangler || { echo "wrangler not found"; exit 1; }
wrangler whoami || { echo "not logged in"; exit 1; }

# 2. 加载 .env
source .env
[ -z "$OPENBIRD_DOMAIN" ] && { echo "OPENBIRD_DOMAIN not set"; exit 1; }

# 3. 检测域名类型
IS_WORKERS_DEV=false
[[ "$OPENBIRD_DOMAIN" == *".workers.dev" ]] && IS_WORKERS_DEV=true

# 4. 创建 KV namespace（已存在则取已有 ID）
create_or_get_kv() {
  local name="$1"
  local id=$(wrangler kv namespace create "$name" 2>&1 | grep -oE 'id = "[^"]+"' | cut -d'"' -f2)
  if [ -z "$id" ]; then
    id=$(wrangler kv namespace list | grep -B1 '"title": "'"$name"'"' | grep '"id"' | grep -oE '[a-f0-9]{32}')
  fi
  echo "$id"
}

# 5. 创建 R2 bucket（已存在则跳过）
wrangler r2 bucket create openbird-pages 2>/dev/null || true

# 6. 渲染 wrangler.toml
sed "s|{{OPENBIRD_DOMAIN}}|$OPENBIRD_DOMAIN|g" wrangler.toml.template > wrangler.toml
# workers.dev 时删除 routes 块
[ "$IS_WORKERS_DEV" = true ] && sed -i '/^routes = \[$/,/^\]$/d' wrangler.toml

# 7. 部署
wrangler deploy
```

---

## 设计说明

### 为什么用 Bash 而非 Node

部署脚本的职责是编排外部工具（wrangler CLI），bash 做编排最直接。Node 需要额外的 `child_process` 和输出解析逻辑，且用户可能还没安装 Node（虽然 wrangler 依赖 Node，但部署脚本应该保持最低心智负担）。

### 为什么用 `.env` 而非交互式

- CI/CD 场景可直接 `source .env` 或 `env OPENBIRD_DOMAIN=xxx ./deploy.sh`
- 本地也只需改一行，比交互式问答更快
- `.env` 是 Cloudflare 生态的惯例（`wrangler` 也支持 `.dev.vars`）

### 为什么用模板渲染而非动态传参

wrangler 不支持通过 `--var` 或环境变量传递 KV binding ID，KV namespace ID 必须写在 `wrangler.toml` 中。因此模板渲染是唯一可行的方案。

### 为什么 `OPENBIRD_` 前缀

多项目共用同一 Cloudflare 账户时，`USERS`/`DOCS` 是过于通用的名称。加上 `OPENBIRD_` 前缀避免与其他 Worker 的 KV namespace 冲突。

### 为什么 `wrangler.toml` 不再提交 git

`wrangler.toml` 包含用户专属的 KV namespace ID 和域名，提交到 git 无意义且可能泄露信息。改为提交模板 `wrangler.toml.template`，部署时动态渲染。

### 为什么 `env.USERS` 改为 `env.OPENBIRD_USERS`

与 KV namespace 命名保持一致。binding 名称必须与 `wrangler.toml` 中的 `binding` 字段匹配，否则 Worker 运行时 `env.OPENBIRD_USERS` 为 `undefined`。

### 边界情况

| 场景 | 处理方式 |
|------|----------|
| wrangler 未安装 | 提示 `npm install -g wrangler`，退出 |
| wrangler 未登录 | 提示 `wrangler login`，退出 |
| `.env` 不存在 | 提示 `cp .env.example .env`，退出 |
| `OPENBIRD_DOMAIN` 为空 | 报错退出 |
| KV namespace 已存在 | `wrangler kv namespace create` 失败，回退到 `wrangler kv namespace list` 取已有 ID |
| R2 bucket 已存在 | 忽略 `wrangler r2 bucket create` 的错误继续 |
| workers.dev 域名 | 自动检测 `*.workers.dev`，跳过 `routes` 配置 |
| macOS vs Linux sed | macOS 用 `sed -i ''`，Linux 用 `sed -i`，脚本通过 `uname` 判断 |
| 部署后域名未生效 | 脚本输出域名，用户自行等待 DNS 传播或绑定自定义域名 |

---

## 数据模型

无新增数据模型。新增 `.env` 配置格式：

```
OPENBIRD_DOMAIN=openbird.yourdomain.com
```

---

## 部署/测试

```bash
# 1. 确认 wrangler 已安装
wrangler whoami

# 2. 配置域名
cp .env.example .env
# 编辑 .env，设置 OPENBIRD_DOMAIN

# 3. 运行部署脚本
./deploy.sh

# 4. 验证
curl -X POST https://${OPENBIRD_DOMAIN}/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"verify@test.com","password":"verify123"}'
```
