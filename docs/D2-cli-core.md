# Spec 2: CLI Core

> 交付物：`cli/` 目录，可 `node cli/src/cli.js publish test.md` 完成发布流程。

---

## 验证标准

Worker 已部署后，CLI 能跑通：

```bash
# 1. 登录（手动粘贴 token 方式）
node cli/src/cli.js login
# → 粘贴 ob_xxx → ✓ Logged in!

# 2. 发布
echo "# Hello" > /tmp/test.md
node cli/src/cli.js publish /tmp/test.md
# → ✨ Published → https://share.jhao.space/xxx

# 3. 再次发布（更新）
echo "# Updated" > /tmp/test.md
node cli/src/cli.js publish /tmp/test.md
# → ✓ Updated → https://share.jhao.space/xxx

# 4. 列出
node cli/src/cli.js list
# → 显示文档列表

# 5. 删除
node cli/src/cli.js remove xxx
# → ✓ Removed xxx

# 6. 验证映射文件
cat /tmp/.openbird
# → test.md = xxx
```

---

## 文件结构

```
cli/
├── src/
│   ├── cli.js        # 入口 (#!/usr/bin/env node)
│   ├── api.js        # HTTP 客户端
│   ├── config.js     # 配置读写
│   ├── files.js      # 文件校验
│   ├── login.js      # 登录流程
│   └── mapping.js    # .openbird 映射
└── package.json
```

注意：`images.js` 在 Spec 03 中实现，本阶段不需要。

---

## package.json

```json
{
  "name": "openbird",
  "version": "0.1.0",
  "description": "Publish Markdown from the command line",
  "type": "module",
  "bin": { "openbird": "./src/cli.js" },
  "files": ["src"],
  "keywords": ["markdown", "publish", "openbird", "cli"],
  "license": "MIT",
  "engines": { "node": ">=18" }
}
```

---

## src/config.js

```javascript
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const CONFIG_DIR = join(homedir(), ".config", "openbird")
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials")

export const API_BASE = process.env.OPENBIRD_API_URL || "https://openbird.jhao.space"
export const VERSION = "0.1.0"
export const USER_AGENT = `openbird-cli/${VERSION}`

export function getApiKey() {
  // 环境变量优先
  if (process.env.OPENBIRD_API_KEY) return process.env.OPENBIRD_API_KEY
  try { return readFileSync(CREDENTIALS_FILE, "utf-8").trim() }
  catch { return null }
}

export function saveApiKey(key) {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CREDENTIALS_FILE, key + "\n", { mode: 0o600 })
}

export function getCredentialsPath() { return CREDENTIALS_FILE }
```

---

## src/files.js

```javascript
export const ALLOWED_EXTENSIONS = new Set([".md", ".markdown", ".mdx", ".txt", ".text"])

export function isAllowedFile(filename) {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex <= 0) return true  // 无扩展名允许
  const ext = filename.slice(dotIndex).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}
```

---

## src/api.js

```javascript
import { getApiKey, API_BASE, USER_AGENT } from "./config.js"

async function apiRequest(method, path, body) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error("Not logged in. Run `openbird login` first.")

  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "User-Agent": USER_AGENT,
    },
  }

  if (body) {
    opts.headers["Content-Type"] = "application/json"
    opts.body = JSON.stringify(body)
  }

  const resp = await fetch(`${API_BASE}${path}`, opts)
  const data = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)
  return data
}

export async function publish({ markdown, slug, namespaced }) {
  const body = { markdown }
  if (slug) body.slug = slug
  if (namespaced) body.namespaced = true
  return apiRequest("POST", "/api/v1/publish", body)
}

export async function listDocuments() {
  return apiRequest("GET", "/api/v1/documents")
}

export async function removeDocument(slug, { namespaced = false } = {}) {
  let url = `/api/v1/documents?slug=${encodeURIComponent(slug)}`
  if (namespaced) url += "&namespaced=true"

  const apiKey = getApiKey()
  if (!apiKey) throw new Error("Not logged in. Run `openbird login` first.")

  const resp = await fetch(`${API_BASE}${url}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
  })
  const data = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)
  return data
}
```

---

## src/mapping.js

```javascript
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const MAPPING_FILE = ".openbird"

function getMappingPath() { return join(process.cwd(), MAPPING_FILE) }

export function readMappings() {
  const path = getMappingPath()
  const map = new Map()
  if (!existsSync(path)) return map
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const file = trimmed.slice(0, eq).trim()
    const slug = trimmed.slice(eq + 1).trim()
    if (file && slug) map.set(file, slug)
  }
  return map
}

export function writeMappings(map) {
  const lines = []
  for (const [file, slug] of map) lines.push(`${file} = ${slug}`)
  writeFileSync(getMappingPath(), lines.join("\n") + "\n")
}

export function setMapping(filename, slug) {
  const map = readMappings()
  map.set(filename, slug)
  writeMappings(map)
}

export function removeMapping(target) {
  const map = readMappings()
  if (map.has(target)) { map.delete(target); writeMappings(map); return true }
  for (const [file, slug] of map) {
    if (slug === target) { map.delete(file); writeMappings(map); return true }
  }
  return false
}
```

---

## src/login.js

```javascript
import { createServer } from "node:http"
import { createInterface } from "node:readline"

export function startCallbackServer(timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    let resolveToken, rejectToken
    const tokenPromise = new Promise((res, rej) => { resolveToken = res; rejectToken = rej })
    const timeout = setTimeout(() => rejectToken(new Error("timeout")), timeoutMs)

    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1")
      if (url.pathname === "/callback") {
        const token = url.searchParams.get("token")
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end("<html><body><h1>Logged in</h1><p>You can close this tab.</p></body></html>")
        if (token) { clearTimeout(timeout); resolveToken(token) }
      } else { res.writeHead(404); res.end() }
    })

    server.listen(0, "127.0.0.1", () => {
      resolve({ port: server.address().port, tokenPromise, close: () => { clearTimeout(timeout); server.close() } })
    })
    server.on("error", reject)
  })
}

export async function openBrowser(url) {
  try {
    const { execFile } = await import("node:child_process")
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
    return new Promise(resolve => { execFile(cmd, [url], err => resolve(!err)) })
  } catch { return false }
}
```

---

## src/cli.js

主入口逻辑（伪代码级别，直接可实现）：

```javascript
#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { createInterface } from "node:readline"
import { getApiKey, saveApiKey, getCredentialsPath, API_BASE, VERSION } from "./config.js"
import { publish, listDocuments, removeDocument } from "./api.js"
import { readMappings, setMapping, removeMapping, writeMappings } from "./mapping.js"
import { startCallbackServer, openBrowser } from "./login.js"
import { isAllowedFile, ALLOWED_EXTENSIONS } from "./files.js"

const args = process.argv.slice(2)
const command = args[0]

async function main() {
  switch (command) {
    case "login": return cmdLogin()
    case "publish": return cmdPublish(args.slice(1))
    case "remove": return cmdRemove(args.slice(1))
    case "list": return cmdList()
    case "help": case "--help": case "-h": return cmdHelp()
    case "version": case "--version": case "-v": return console.log(`openbird ${VERSION}`)
    default:
      if (!command) { cmdHelp(); process.exit(1) }
      console.error(`Unknown command: ${command}\nRun "openbird help" for usage.`)
      process.exit(1)
  }
}
```

### cmdLogin()

行为：
1. 如已有 key → 问 `Replace existing token? [y/N]` → N 则退出
2. 尝试 `startCallbackServer()`
3. 构造 loginUrl = `${API_BASE}/api/v1/login?callback=http://127.0.0.1:${port}/callback`
4. `openBrowser(loginUrl)`
5. 同时显示 `Or paste your API token here and press Enter:`
6. `Promise.race([server.tokenPromise, manualInput])` → 先到的 token 生效
7. 校验 token.startsWith("ob_") → 不符合报错
8. `saveApiKey(token)` → 打印 `✓ Logged in!`

### cmdPublish(fileArgs)

行为：
1. `getApiKey()` → 无则报错退出
2. 解析参数：`--slug <slug>` 提取 slug，剩余为文件路径
3. 如果无文件或文件为 `-`：从 stdin 读取 markdown
4. 否则：校验 `isAllowedFile` → 读取文件
5. 如果无显式 slug：查 `.openbird` 映射（先用完整路径，再用 basename）
6. 调用 `publish({ markdown, slug })`
7. 如果 slug 存在但服务端返回 "not found"：清除旧映射，重试无 slug 发布
8. 成功后：`setMapping(filename, result.slug)`
9. 打印：新建 → `✨ Published → {url}`，更新 → `✓ Updated → {url}`

### cmdList()

1. `listDocuments()` → 遍历打印
2. 格式：每个文档两行 — `  {slug}  {title}` + `    {url}`
3. 末尾：`  N documents`

### cmdRemove(removeArgs)

1. 解析参数，取 positional[0] 作为 target
2. 查映射：`mappings.get(target) || target` → 得到 slug
3. `removeDocument(slug)`
4. `removeMapping(target)`
5. 打印：`✓ Removed {slug}`

### cmdHelp()

输出（硬编码字符串）：
```
openbird - Publish Markdown from the command line

Usage:
  openbird login                          Authenticate with OpenBird
  openbird publish <file.md>              Publish or update a document
  openbird publish --slug <slug> <file>   Update a specific document
  openbird publish                        Read from stdin
  openbird remove <file.md|slug>          Delete a document
  openbird list                           List published documents
  openbird help                           Show this help

Files are tracked via a .openbird mapping file in the current directory.
```

---

## stdin 读取

```javascript
function readStdin() {
  return new Promise(resolve => {
    let data = ""
    process.stdin.setEncoding("utf-8")
    process.stdin.on("data", chunk => { data += chunk })
    process.stdin.on("end", () => resolve(data))
    if (process.stdin.isTTY) console.error("Reading from stdin... (Ctrl+D to finish)")
  })
}
```

---

## 数据模型

### credentials 文件

路径：`~/.config/openbird/credentials`
内容：单行 `ob_xxx`（明文），权限 0600

### .openbird 映射文件

路径：`./.openbird`（当前工作目录）
格式：`文件名 = slug`，一行一条

```
meeting-notes.md = bright-calm-meadow
README.md = swift-red-fox
```

规则：
- `#` 开头为注释行
- 空行忽略
- 文件名匹配优先完整路径，回退 basename
- 不存在的文件不自动清理映射

---

## 设计说明

### 为什么 env var 优先于文件

`OPENBIRD_API_KEY` 环境变量优先于 `~/.config/openbird/credentials`。CI/容器环境无法写 `~/.config`，通过 env var 注入更方便。`openbird login` 始终写文件，不写 env。

### 为什么 .openbird 用文件名作 key 而非 slug

JotBird 的设计。文件名作为 key 意味着同一个文件改名后失去映射（创建新文档），这是符合直觉的。如果用 slug 作 key，文件改名后需要手动维护。

### 为什么 stdin 模式不写映射

stdin 没有"文件"概念，每次 `cat notes.md | openbird publish` 创建新文档。如果想更新已有文档，用 `--slug` 显式指定。

### 为什么 stale slug 自动清除重发

`.openbird` 中记录的 slug 可能在服务端已被删除（过期或手动删除）。CLI 检测到 404 "not found" 后自动清除旧映射并重新发布为新文档，避免用户需要手动 `remove` 再 `publish`。

### 为什么 login 用 callback server + 手动粘贴竞争

CLI 启动本地 HTTP server 接收浏览器回调 token，同时允许手动粘贴。两个通道 race，先到先得。如果回调 server 启动失败（端口占用），降级为纯手动粘贴。如果浏览器打不开，用户手动复制 URL 粘贴 token。

### 为什么 login 不实现完整 OAuth（本阶段）

Worker 端 `/api/v1/login` 页面在 D1 中未实现（D1 只做 register 生成 key）。CLI 的 login 命令已准备好 callback 接收机制，等 Worker 端 login 页面实现后即自动对接。当前 MVP 用户手动通过 curl register 获取 key，粘贴到 CLI。

---

## 边界情况

| 场景 | 处理方式 |
|------|----------|
| 未登录执行 publish/list/remove | 报错退出：`✗ Not logged in`，退出码 1 |
| 文件不存在 | `✗ Cannot read file: xxx.md`，退出码 1 |
| 文件扩展名不支持 | `✗ Unsupported file type`，列出允许的扩展名，退出码 1 |
| stdin 是 TTY（没有管道输入） | 提示 `Reading from stdin... (Ctrl+D to finish)` |
| stdin 内容为空 | `✗ No input received from stdin.`，退出码 1 |
| 已登录再次 login | 提示 `Replace existing token? [y/N]`，N 取消 |
| callback server 端口被占用 | 降级为手动粘贴流程 |
| 浏览器打不开 | 打印 URL 让用户手动访问 + 粘贴 |
| 粘贴的 token 不以 `ob_` 开头 | `Invalid token format. Token should start with ob_`，退出码 1 |
| login 超时（5 分钟无输入） | `Login timed out. Please try again.`，退出码 1 |
| 发布时映射中的 slug 服务端已删除 | 自动清除旧映射，重新发布为新文档 |
| 发布时服务端返回 401 | 显示错误信息，退出码 1（不自动重试 login） |
| 发布时服务端返回 413 | 显示 `✗ Publish failed: Rendered HTML too large` |
| list 结果为空 | 显示 `No published documents yet.` |
| remove 的参数既不是文件名也不是 slug | 当作 slug 直接传给 API，由服务端返回 404 |
| remove 的 .openbird 中没有匹配 | 直接将参数作为 slug 传给 API |
| .openbird 文件不存在 | `readMappings()` 返回空 Map，不影响发布（创建新文档） |

---

## 错误输出格式

所有错误统一格式，退出码 1：

```
✗ Not logged in. Run `openbird login` first.
✗ Cannot read file: xxx.md
✗ Unsupported file type. Allowed extensions: .md, .markdown, .mdx, .txt, .text
✗ Publish failed: <server message>
✗ Remove failed: <server message>
```
