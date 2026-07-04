# Spec 6: 文档完善

> 交付物：README.md 使用文档，覆盖从零安装到发布第一条内容的完整流程。
> 前置依赖：D1-D5 已完成。

---

## 验证标准

```bash
# 1. README 存在且内容完整
wc -l README.md
# → 至少 100 行

# 2. README 包含所有必需章节（用 grep 检查）
grep -c "^## " README.md
# → 至少 6 个章节标题

# 3. 代码块可复制执行
grep -c '```bash' README.md
# → 至少 4 个

# 4. 新用户可按 README 从零完成发布（人工验收）
```

---

## 文件结构

```
README.md              # 项目主页文档（新建）
```

---

## 核心代码

### README.md 章节结构

```
# OpenBird
## 特性
## 快速开始
  ### 前置要求
  ### 1. 部署后端
  ### 2. 安装 CLI
  ### 3. 设置 API 地址
  ### 4. 登录
  ### 5. 发布第一篇文档
## 命令参考
  ### openbird login
  ### openbird publish
  ### openbird list
  ### openbird remove
## 配置参考
  ### 环境变量
  ### 配置文件
  ### 映射文件 .openbird
## 架构
  ### 整体架构
  ### 数据存储
  ### 页面渲染
## API 文档
  ### POST /api/v1/register
  ### POST /api/v1/publish
  ### GET /api/v1/documents
  ### DELETE /api/v1/documents
  ### POST /api/v1/upload-image
  ### GET /:slug
  ### GET /@:username/:slug
## 开发
  ### 本地开发
  ### 项目结构
  ### 运行测试
## License
```

### 关键内容要点

1. **快速开始**：必须包含从 `git clone` 到 `openbird publish hello.md` 的完整命令链，每个命令可直接复制执行
2. **命令参考**：每个命令包含语法、参数表、输出示例
3. **配置参考**：覆盖 `OPENBIRD_API_URL`、`OPENBIRD_API_KEY`、`~/.config/openbird/credentials`、`.openbird`
4. **架构**：单 Worker 架构图，KV/R2 用途说明
5. **API 文档**：每个端点的请求/响应示例
6. **开发**：本地运行 wrangler dev，项目目录结构说明

### 验证命令对照表（README 中的命令必须与代码一致）

| 文档中提到的命令 | 对应代码位置 |
|-----------------|-------------|
| `wrangler deploy` | `worker/package.json:scripts.deploy` |
| `openbird login` | `cli/src/cli.js:cmdLogin()` |
| `openbird publish <file>` | `cli/src/cli.js:cmdPublish()` |
| `openbird list` | `cli/src/cli.js:cmdList()` |
| `openbird remove <target>` | `cli/src/cli.js:cmdRemove()` |
| `POST /api/v1/register` | `worker/src/index.js:handleRegister()` |
| `POST /api/v1/publish` | `worker/src/index.js:handlePublish()` |
| `GET /api/v1/documents` | `worker/src/index.js:handleList()` |
| `DELETE /api/v1/documents` | `worker/src/index.js:handleRemove()` |

---

## 设计说明

### 为什么 README 要包含命令参考

自托管项目的 README 是用户唯一的文档入口。不像 SaaS 产品有独立的文档站，README 需要同时承担"简介 + 安装 + 使用手册 + API 文档"四个角色。每个命令必须给出完整语法和实际输出示例，减少用户试错成本。

### 为什么 API 文档要嵌入 README 而非独立文件

Cloudflare Worker 的自托管场景，用户需要对照 API 写客户端或调试。独立的 API 文档（如 `docs/api.md`）在 GitHub 上的发现性远不如 README。README 中嵌入 API 文档，用户一次翻阅即可覆盖全部使用场景。

### 为什么命令参考用表格而非纯文本

参数表（参数名 | 类型 | 必填 | 说明）比自然语言描述更易扫描。用户不需要通读整段文字就能找到某个参数的含义。输出示例让用户提前知道成功/失败的样子。

### 为什么快速开始要分 5 步

分步降低认知负荷。每一步有一个明确目标和一个可验证的结果（看到某个输出）。如果合并为一大段，用户遇到问题不知道卡在哪一步。

### 边界情况

| 场景 | 处理方式 |
|------|----------|
| 用户没有 Cloudflare 账户 | 前置要求中明确列出，提供注册链接 |
| 用户 wrangler 版本过旧 | 前置要求中注明最低版本要求 |
| workers.dev 域名 vs 自定义域名 | 配置参考中分别说明两种方式的 OPENBIRD_API_URL 设置 |
| 首次登录 vs 已登录 | login 命令说明中区分"自动注册"和"已登录提示确认" |
| 文档命令与实际代码不一致 | 验证标准中要求逐条对照，且后续 CI 可自动化校验 |
| README 过长影响阅读 | 用折叠块（details/summary）处理详细 API 示例 |

---

## 数据模型

无新增数据模型。README 为纯文档。

---

## 部署/测试

```bash
# 1. 创建 README.md
# 2. 检查行数
wc -l README.md

# 3. 检查章节数
grep -c "^## " README.md

# 4. 检查 bash 代码块数
grep -c '```bash' README.md

# 5. 检查链接有效性（如果有外部链接）
# 手动点击验证

# 6. 人工验收：找一个人按 README 从零操作一遍
```
