# Status

> 进度跟踪。每次会话结束时更新。

## 当前焦点

D2 实现完成，本地验证 6 个命令全部通过。准备进入 D3 (Images)。

## 进度

- [x] D0: JotBird 逆向参考
- [x] D1-D4: 设计文档编写（已补充设计说明 + 边界情况 + 数据模型）
- [x] 项目结构确定（spec 驱动）
- [x] D1: Worker Core — register/publish/list/remove + 页面展示
- [x] D2: CLI Core — login/publish/list/remove + 映射文件
- [ ] D3: Images — R2 上传 + CLI 自动重写
- [ ] D4: Namespace — @username/slug 永久 URL

## 已知问题

- workers.dev 子域名刚注册，DNS 传播中，远程 curl 暂时连接超时。本地 `wrangler dev` 全部 5 个端点验证通过
- `wrangler.toml` 中的 `routes`（custom_domain）部署失败，需在 Cloudflare Dashboard 手动绑定域名
- `npm install` 在 worker/ 目录下超时（sharp 编译耗时过长），wrangler 已全局安装，不依赖本地 node_modules

## 踩坑记录

- 第一轮设计文档太分散（README + cli.md + api.md + architecture.md 互相重复），改为 spec 驱动后清晰很多
- 初始 D-spec 缺少设计说明和边界情况章节，agent 实现时容易忽略意图和异常处理。现已按 skill 模板补齐全部 5 章节
- 架构变更：HTML 从 KV 改为 R2 存储。KV 只存轻量元信息（~200 字节/篇），R2 存渲染后的 HTML 页面。去掉 `/:slug.md` 接口。理由：R2 免费 10GB 比 KV 1GB 大 10 倍，对象存储天然适合存文件
- `wrangler.toml` 的 `routes` 配置必须放在 `[[kv_namespaces]]` 之前，否则会被解析为 r2_buckets 的子字段
- workers.dev 子域名注册后需要等待 DNS 传播（数分钟到数小时），期间无法远程访问
- R2 bucket 创建前需先在 Cloudflare Dashboard 手动启用 R2 服务

## 下一步

实现 D3 (Images)：
1. 读取 docs/D3-images.md
2. Worker 端新增 /api/v1/upload 端点（R2 存储图片）
3. CLI 端新增 images.js — 扫描 markdown 中的本地图片，上传后重写 URL
4. publish 流程集成图片上传步骤
5. 验证：发布含本地图片的 md，浏览器打开确认图片正常显示
