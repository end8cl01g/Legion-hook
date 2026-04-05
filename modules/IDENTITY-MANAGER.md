# 🎭 Identity Manager - 多身份管理系統

> **切換不同人格/身份** - 讓 AI 根據不同場景扮演不同角色

## 簡介

**Identity Manager** 允許你創建、切換、管理不同的 AI 身份/人格。每個身份有獨立的：

- SOUL.md（核心身份）
- 行為準則
- 語氣風格
- 專業領域
- 回應偏好

## 📋 內建身份 (6 個)

| ID | 名稱 | 表情 | 說明 |
|----|------|------|------|
| `default` | Default Assistant | 🤖 | 預設的 AI 助手 |
| `consultant` | 專業顧問 | 💼 | 專業、嚴謹的商業顧問 |
| `creative` | 創意夥伴 | 🎨 | 充滿想像力的創意合作者 |
| `coding-mentor` | 程式導師 | 💻 | 專業的程式開發導師 |
| `concise` | 簡潔模式 | ⚡ | 只提供關鍵資訊，不囉嗦 |
| `researcher` | 研究員 | 🔬 | 嚴謹的學術研究者 |

## 🚀 快速開始

### 1. 列出所有身份

```bash
identity:list
```

**返回：**
```json
{
  "current": "default",
  "identities": [
    { "id": "default", "name": "Default Assistant", "emoji": "🤖", "isActive": true },
    { "id": "consultant", "name": "專業顧問", "emoji": "💼", "isActive": false },
    { "id": "creative", "name": "創意夥伴", "emoji": "🎨", "isActive": false },
    ...
  ]
}
```

### 2. 切換身份

```bash
# 切換到專業顧問
identity:switch consultant

# 切換到創意模式
identity:switch creative

# 切換到簡潔模式
identity:switch concise
```

**返回：**
```json
{
  "action": "switch",
  "success": true,
  "identity": { "id": "consultant", "name": "專業顧問", "emoji": "💼" },
  "message": "Switched to 💼 專業顧問"
}
```

### 3. 查看當前身份

```bash
identity:current
# 或
identity:whoami
```

**返回：**
```json
{
  "action": "current",
  "identity": {
    "id": "consultant",
    "name": "專業顧問",
    "description": "專業、嚴謹的商業顧問",
    "config": {
      "soul": "你是一位經驗豐富的專業顧問...",
      "tone": "professional",
      "emoji": "💼",
      "guidelines": ["提供基於證據的建議", "避免猜測", ...]
    },
    "usageCount": 5,
    "lastUsedAt": 1712304000000
  }
}
```

## 🛠️ 高級功能

### 創建自定義身份

```bash
# 創建基本身份
identity:create mybot

# 然後使用 identity:edit 配置（待實現）
```

### 刪除身份

```bash
identity:delete mybot
```

**注意：**
- 不能刪除當前激活的身份
- 不能刪除內建身份

### 查看切換歷史

```bash
# 查看最近 10 次切換
identity:history

# 查看最近 5 次
identity:history 5
```

**返回：**
```json
{
  "action": "history",
  "history": [
    {
      "timestamp": 1712304000000,
      "fromIdentity": "default",
      "toIdentity": "consultant",
      "reason": "Need professional advice"
    },
    ...
  ]
}
```

### 查看統計

```bash
identity:stats
```

**返回：**
```json
{
  "totalIdentities": 6,
  "activeIdentity": "consultant",
  "mostUsed": "default",
  "switchCount": 15
}
```

### 重置為預設

```bash
identity:reset
# 或
identity:default
```

---

## 📝 身份配置詳解

每個身份包含以下配置：

### 核心配置

```json
{
  "id": "consultant",
  "name": "專業顧問",
  "description": "專業、嚴謹的商業顧問",
  "soul": "你是一位經驗豐富的專業顧問。提供精準、有根據的建議。注重數據和事實。",
  "tone": "professional",
  "emoji": "💼"
}
```

### 行為準則

```json
{
  "guidelines": [
    "提供基於證據的建議",
    "避免猜測",
    "引用可靠來源",
    "保持客觀中立"
  ]
}
```

### 專業領域

```json
{
  "expertise": ["business", "strategy", "analysis"]
}
```

### 回應偏好

```json
{
  "language": "zh-TW",
  "responseLength": "detailed"
}
```

### 限制事項

```json
{
  "restrictions": [
    "不提供醫療建議",
    "不提供法律意見",
    "不預測未來"
  ]
}
```

---

## 🎯 使用場景

### 1. 商業會議

```bash
identity:switch consultant
```
→ 專業、嚴謹的語氣，提供基於數據的建議

### 2. 頭腦風暴

```bash
identity:switch creative
```
→ 創意發散，跳出框架思考

### 3. 程式開發

```bash
identity:switch coding-mentor
```
→ 提供代碼示例，解釋概念，幫助除錯

### 4. 快速問答

```bash
identity:switch concise
```
→ 只回答必要內容，不囉嗦

### 5. 學術研究

```bash
identity:switch researcher
```
→ 嚴謹分析，引用文獻，批判性思考

---

## 🔄 身份切換流程

```
用戶：identity:switch consultant
  ↓
Identity Manager 處理
  ↓
1. 記錄切換歷史
  ↓
2. 更新使用統計
  ↓
3. 生成系統提示
  ↓
4. 寫入 SOUL.md
  ↓
5. 返回確認訊息
  ↓
AI 現在以「專業顧問」身份回應
```

---

## 📊 統計數據

```bash
identity:stats
```

**指標說明：**

| 指標 | 說明 |
|------|------|
| `totalIdentities` | 總身份數量 |
| `activeIdentity` | 當前激活的身份 |
| `mostUsed` | 最常用的身份 |
| `switchCount` | 總切換次數 |

---

## 💡 最佳實踐

### 1. 為不同任務使用不同身份

```
寫作任務 → creative
代碼審查 → coding-mentor
數據分析 → researcher
快速查詢 → concise
```

### 2. 創建專案專用身份

```bash
# 為特定專案創建專屬身份
identity:create project-alpha
```

### 3. 定期查看歷史

```bash
# 了解常用身份和使用模式
identity:history 20
identity:stats
```

### 4. 保持身份數量合理

建議保持 5-10 個身份，避免過多造成混亂。

---

## 🔮 未來擴展

- [ ] `identity:edit <id>` - 編輯身份配置
- [ ] `identity:export <id>` - 導出身份配置
- [ ] `identity:import <json>` - 導入身份配置
- [ ] `identity:template <type>` - 從模板創建
- [ ] 身份分享社區
- [ ] 自動身份切換（基於上下文）

---

## ⚠️ 注意事項

1. **不能刪除當前身份** - 必須先切換到其他身份
2. **不能刪除內建身份** - 預設身份受保護
3. **切換會修改 SOUL.md** - 原始文件會備份
4. **身份配置存儲在** - `hooks/legion/io/write/identity-manager/`

---

## 📁 文件結構

```
hooks/legion/io/write/identity-manager/
├── configs/
│   ├── default.json
│   ├── consultant.json
│   ├── creative.json
│   └── ...
├── CURRENT_IDENTITY.json    # 當前身份
└── backups/                  # SOUL.md 備份
    ├── SOUL.default.md.bak
    └── ...
```

---

**多重身份，隨心切換！** 🎭
