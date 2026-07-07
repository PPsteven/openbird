# Spec 11: 自动派生 Username

> 交付物：创建用户时自动从 email 派生 username，消除手动 `PUT /api/v1/account` 步骤
> 前置依赖：D10（已完成）

---

## 验证标准

```bash
# 1. 新注册用户自动有 username
curl -s -X POST https://openbird.jhao.space/api/v1/register \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"pass123"}' | python3 -c "
import json,sys; d=json.load(sys.stdin)
assert 'apiKey' in d, 'no apiKey'
print('✓ registered:', d.get('email'))
"

# 2. 用新用户 publish --namespace 成功（无需额外设置 username）
KEY=$(curl -s -X POST https://openbird.jhao.space/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"pass123"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['apiKey'])")
curl -s -X POST https://openbird.jhao.space/api/v1/publish \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test","namespaced":true}' | python3 -c "
import json,sys; d=json.load(sys.stdin)
assert d.get('username') == 'alice', f'expected alice, got {d.get(\"username\")}'
print('✓ namespaced publish with auto-username:', d['url'])
"

# 3. seedAdminUser 创建的 admin 也有 username
curl -s -X POST https://openbird.jhao.space/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ppsteven","password":"dianshiji"}' | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('✓ admin login ok')
"
# 然后 publish --namespace 验证
ADMIN_KEY=$(curl -s -X POST https://openbird.jhao.space/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ppsteven","password":"dianshiji"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['apiKey'])")
curl -s -X POST https://openbird.jhao.space/api/v1/publish \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Admin Test","namespaced":true}' | python3 -c "
import json,sys; d=json.load(sys.stdin)
assert d.get('username') == 'ppsteven', f'expected ppsteven, got {d.get(\"username\")}'
print('✓ admin namespaced publish:', d['url'])
"
```

---

## 文件结构

```
worker/src/index.js  # 仅修改此文件
```

无新增文件。改动集中在两个函数：`seedAdminUser` 和 `handleRegister`。

---

## 核心代码

### seedAdminUser — 自动派生 username

```javascript
// worker/src/index.js
// 在创建用户时从 ADMIN_EMAIL 派生 username

// 当前 seedAdminUser 创建用户时未设 username 字段
// 改为：const username = adminEmail.split('@')[0]
// 写入 user 对象时带上 username
```

### handleRegister — 自动派生 username

```javascript
// worker/src/index.js
// 在创建用户时从 email 参数派生 username

// 当前 handleRegister 创建用户时未设 username 字段
// 改为：const username = email.split('@')[0]
// 写入 user 对象时带上 username
```

### 已有用户不受影响

已有 KV 中的 user 记录没有 `username` 字段。两种处理方式：
- **方案 A（推荐）**：仅新创建的用户自动带 username，已有用户手动调用 `PUT /api/v1/account` 设置
- **方案 B**：在登录时检测，若 user 无 username 则自动从 email 派生并回写

选择方案 A，简单、可预测、无副作用。

---

## 设计说明

### 为什么从 email 派生

email 天然唯一且用户已知，`email.split('@')[0]` 得到的前缀通常就是用户期望的标识符。无需额外输入、无需校验唯一性（email 已唯一）。

### 为什么不保留 `PUT /api/v1/account`

保留该端点，供用户自定义 username（例如 email 前缀不符合预期时）。新用户创建时自动设置只是消除了默认情况下的手动步骤。

### 边界情况

| 场景 | 处理方式 |
|------|----------|
| email 前缀含特殊字符（如 `alice.123@`） | 直接取 `split('@')[0]` 原始字符串，不做 sanitize。username 格式校验由 `PUT /api/v1/account` 保证，自动派生的值不做校验 |
| email 前缀为空（如 `@example.com`） | 极罕见，仍设为空字符串，后续用户可通过 `PUT /api/v1/account` 修正 |
| 已有用户无 username | 保持现状，不自动回填。用户可通过 `PUT /api/v1/account` 或重新登录（方案 B 暂不实现） |
| 用户名冲突（两个用户同前缀） | email 已唯一，不可能发生 |

---

## 数据模型

无变更。user 对象新增 `username` 字段：

```json
{
  "id": "user_abc123",
  "email": "alice@example.com",
  "username": "alice",
  "passwordHash": "sha256hex...",
  "keys": [...],
  "createdAt": "2026-07-07T08:00:00.000Z"
}
```

---

## 部署/测试

```bash
cd worker
wrangler deploy
# 验证命令见「验证标准」章节
```
