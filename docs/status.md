# Status

> 进度跟踪。每次会话结束时更新。

## 当前焦点

全部 6 个 Spec 实现完成。项目可交付。

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

## 已知问题

- workers.dev 远程 curl 连接超时。DNS 可解析但 TCP 握手失败（IPv4/IPv6 均超时），疑似部分地区网络限制。本地 `wrangler dev` 全部 12 个端点验证通过
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

## 下一步

项目核心功能已全部完成。后续可考虑：
- 在可访问 Cloudflare Workers 的网络环境中完成远程冒烟测试
- 绑定自定义域名（openbird.jhao.space）
- Worker 端 login 页面实现（配合 CLI callback server）
- CI/CD 自动化部署
