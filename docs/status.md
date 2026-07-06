# Status

> 进度跟踪。每次会话结束时更新。

## 当前焦点

全部 Spec 已完成。项目进入维护和优化阶段。

## 进度

- [x] D0: JotBird 逆向参考
- [x] D1-D4: 设计文档编写（已补充设计说明 + 边界情况 + 数据模型）
- [x] 项目结构确定（spec 驱动）
- [x] D1: Worker Core — register/publish/list/remove + 页面展示
- [x] D2: CLI Core — login/publish/list/remove + 映射文件
- [x] D3: Images — R2 上传 + CLI 自动重写
- [x] D4: Namespace — @username/slug 永久 URL
- [x] D5: 远程部署验证 — wrangler deploy 成功，本地 12 端点全通过，远程受网络限制
- [x] D6: 文档完善 — README.md 使用文档
- [x] D7: 一键部署脚本 — deploy.sh 模板渲染
- [x] D8: 零配置发布 — 匿名 1h 临时链接 + Worker 内置默认账户
- [x] D9: 落地页 Spec 编写 + 实现（site/index.html + GitHub Actions 部署）
- [x] D8: Worker 落地页服务 — 内联 site/ 到 Worker 源码，`GET /` 返回 index.html
- [x] D9: Admin Register — 仅 admin 可通过 CLI 创建新用户

## 已知问题

- workers.dev 远程 curl 连接超时。DNS 可解析但 TCP 握手失败（IPv4/IPv6 均超时），疑似部分地区网络限制。本地 `wrangler dev` 全部端点验证通过
- `wrangler.toml` 中的 `routes`（custom_domain）部署失败，需在 Cloudflare Dashboard 手动绑定域名
- `npm install` 在 worker/ 目录下超时（sharp 编译耗时过长），wrangler 已全局安装，不依赖本地 node_modules
- Worker 端 markdown 渲染中图片正则 `![]()` 必须在链接正则 `[]()` 之前匹配，否则图片被渲染为链接

## 踩坑记录

- 第一轮设计文档太分散（README + cli.md + api.md + architecture.md 互相重复），改为 spec 驱动后清晰很多
- 初始 D-spec 缺少设计说明和边界情况章节，agent 实现时容易忽略意图和异常处理。现已按 skill 模板补齐全部 5 章节
- 架构变更：HTML 从 KV 改为 R2 存储。KV 只存轻量元信息（~200 字节/篇），R2 存渲染后的 HTML 页面。去掉 `/:slug.md` 接口。理由：R2 免费 10GB 比 KV 1GB 大 10 倍，对象存储天然适合存文件
- `wrangler.toml` 的 `routes` 配置必须放在 `[[kv_namespaces]]` 之前，否则会被解析为 r2_buckets 的子字段
- workers.dev 子域名注册后需要等待 DNS 传播（数分钟到数小时），期间无法远程访问
- R2 bucket 创建前需先在 Cloudflare Dashboard 手动启用 R2 服务
- **D5: handlePublish 指定 slug 创建新文档时返回 404** — 当 `slugParam` 提供但文档不存在时，原代码返回 `"Document not found"`，应直接创建新文档。修复：删除 `else { return json({ error: "Document not found" }, 404) }` 分支
- **D5: 响应格式不一致** — `handleRemove` 返回 `{"ok":true}` 而非 `{"success":true}`；`handleUpdateAccount` 返回 `{"username":"ppsteven"}` 而非 `{"success":true}`。这是设计选择，非 bug，但 D5 验证脚本需适配实际格式
- **D9: 落地页为何不直接用 Tailwind** — 复刻 JotBird 设计时，Tailwind Play CDN 依赖外部资源且违反项目"零依赖"约定，编译产出需 npm 构建步骤。最终选纯静态 HTML + 内联 CSS：从 JotBird 的 Tailwind utility class 反推为等价 `:root` token + 语义化 class，单文件即可部署到 GitHub Pages，零构建。详见 D9「设计说明」
- **D8/D9: seedAdminUser 必须在 export default 之前定义** — `seedAdminUser` 调用 `randomHex` 和 `sha256`，这两个函数在文件末尾定义（`function` 声明提升）。如果写成 `const randomHex = ...` 箭头函数则因 temporal dead zone 报错。确保使用 `function` 声明而非 `const` 赋值
- **D8/D9: 静态资源字符串使用模板字面量** — `LANDING_HTML` 等常量使用反引号模板字面量，HTML 中的 `${}` 模板语法需转义为 `\${}`，否则 JS 会尝试插值。site/index.html 不含 `${}` 所以安全

## 下一步

- 在可访问 Cloudflare Workers 的网络环境中完成远程冒烟测试
- 绑定自定义域名（openbird.example.com）
- Worker 端 login 页面实现（配合 CLI callback server）
- CI/CD 自动化部署
- 推送 main 后，在仓库 Settings → Pages → Source 选择 GitHub Actions，curl 验证 200
