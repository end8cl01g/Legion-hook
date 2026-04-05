# 🎭 Identity Manager - 多身份管理系統

> **切換不同人格/身份** - 為不同場景定制專屬 AI 助手

## 簡介

Identity Manager 允許你創建、切換和管理多個不同的 AI 身份/人格。每個身份擁有獨立的：

- **SOUL.md** - 核心身份和價值觀
- **行為準則** - 特定的指導原則
- **語氣風格** - 正式、隨意、專業等
- **專業領域** - 擅長的知識範圍
- **回應偏好** - 簡潔或詳細

## 使用場景

| 場景 | 推薦身份 | 說明 |
|------|---------|------|
| 💼 商業會議 | `consultant` | 專業、嚴謹的建議 |
| 🎨 創意發想 | `creative` | 天馬行空的點子 |
| 💻 程式開發 | `coding-mentor` | 專業的程式指導 |
| 🔬 研究分析 | `researcher` | 嚴謹的學術態度 |
| ⚡ 快速查詢 | `concise` | 只給關鍵資訊 |
| 🤖 日常對話 | `default` | 友好的預設助手 |

---

## 內建身份

### 1. Default Assistant 🤖
- **描述:** 預設的 AI 助手
- **語氣:** 友好
- **特點:** 平衡、有耐心

### 2. 專業顧問 💼
- **描述:** 專業、嚴謹的商業顧問
- **語氣:** 專業
- **特點:** 注重數據和事實
- **專長:** 商業、策略、分析

### 3. 創意夥伴 🎨
- **描述:** 充滿想像力的創意合作者
- **語氣:** 創意
- **特點:** 跳出框架思考
- **專長:** 藝術、寫作、設計、腦力激盪

### 4. 程式導師 💻
- **描述:** 專業的程式開發導師
- **語氣:** 友好
- **特點:** 耐心解釋、提供最佳實踐
- **專長:** 程式設計、除錯、架構

### 5. 簡潔模式 ⚡
- **描述:** 只提供關鍵資訊
- **語氣:** 正式
- **特點:** 不囉嗦、直接
- **回應:** 簡潔

### 6. 研究員 🔬
- **描述:** 嚴謹的學術研究者
- **語氣:** 正式
- **特點:** 深入分析、批判性思考
- **專長:** 研究、分析、科學、學術

---

## 基本命令

### 列出所有身份
```bash
identity:list
# 或
identity:ls
```

**返回:**
```json
{
  "current": "default",
  "identities": [
    {
      "id": "default",
      "name": "Default Assistant",
      "emoji": "🤖",
      "isActive": true,
      "usageCount": 5
    },
    {
      "id": "consultant",
      "name": "專業顧問",
      "emoji": "💼",
      "isActive": false,
      "usageCount": 3
    }
  ]
}
```

### 切換身份
```bash
# 切換到專業顧問
identity:switch consultant

# 切換到創意夥伴
identity:switch creative

# 切換到程式導師
identity:switch coding-mentor

# 帶原因切換
identity:switch researcher 需要深入分析這個問題
```

**返回:**
```json
{
  "action": "switch",
  "success": true,
  "identity": {
    "id": "consultant",
    "name": "專業顧問",
    "emoji": "💼"
  },
  "message": "Switched to 💼 專業顧問"
}
```

### 查看當前身份
```bash
identity:current
# 或
identity:me
# 或
identity:whoami
```

**返回:**
```json
{
  "action": "current",
  "identity": {
    "id": "consultant",
    "name": "專業顧問",
    "description": "專業、嚴謹的商業顧問",
    "config": {
      "tone": "professional",
      "emoji": "💼",
      "language": "zh-TW",
      "expertise": ["business", "strategy", "analysis"]
    },
    "usageCount": 3,
    "lastUsedAt": 1712304000000
  }
}
```

### 創建自定義身份
```bash
# 創建基本身份
identity:create mybot

# 然後編輯配置
identity:edit mybot
```

### 刪除身份
```bash
identity:delete mybot
# 或
identity:rm mybot
```

### 查看切換歷史
```bash
# 查看最近 10 次
identity:history

# 查看最近 5 次
identity:history 5
```

**返回:**
```json
{
  "action": "history",
  "history": [
    {
      "timestamp": 1712304000000,
      "fromIdentity": "default",
      "toIdentity": "consultant",
      "reason": "需要專業建議",
      "time": "2026-04-05T08:00:00.000Z"
    }
  ]
}
```

### 查看統計
```bash
identity:stats
# 或
identity:statistics
```

**返回:**
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

## 自定義身份配置

### 完整配置選項

```json
{
  "name": "My Custom Bot",
  "description": "我的自定義 AI 身份",
  "soul": "你是一個獨特的 AI 助手...",
  "tone": "custom",
  "customTone": "溫暖、幽默、像朋友一樣",
  "emoji": "🌟",
  "language": "zh-TW",
  "responseLength": "balanced",
  "expertise": ["cooking", "travel", "lifestyle"],
  "guidelines": [
    "保持積極正向",
    "提供實用建議",
    "分享個人經驗"
  ],
  "restrictions": [
    "不提供醫療建議",
    "不討論政治"
  ],
  "avatar": "https://example.com/avatar.png"
}
```

### 語氣選項

| 選項 | 說明 |
|------|------|
| `formal` | 正式、嚴謹 |
| `casual` | 隨意、輕鬆 |
| `friendly` | 友好、親切 |
| `professional` | 專業、商務 |
| `creative` | 創意、活潑 |
| `custom` | 自定義描述 |

### 回應長度

| 選項 | 說明 |
|------|------|
| `concise` | 簡潔、要點式 |
| `balanced` | 平衡、適中 |
| `detailed` | 詳細、完整 |

---

## 進階功能

### 身份注入機制

當切換身份時，系統會：

1. **備份當前 SOUL.md**
   ```
   hooks/legion/io/write/identity-manager/backups/SOUL.<id>.md.bak
   ```

2. **寫入新的 SOUL.md**
   ```
   workspace/SOUL.md
   ```

3. **記錄當前身份**
   ```json
   {
     "activeIdentity": "consultant",
     "switchedAt": 1712304000000,
     "identity": {...}
   }
   ```

### 身份存儲結構

```
hooks/legion/io/write/identity-manager/
├── configs/
│   ├── default.json
│   ├── consultant.json
│   ├── creative.json
│   └── custom-bot.json
├── backups/
│   ├── SOUL.default.md.bak
│   └── SOUL.consultant.md.bak
└── CURRENT_IDENTITY.json
```

### 導出/導入身份

```typescript
// 導出
const json = identityManager.exportIdentity('mybot');
// 保存 JSON 字符串

// 導入
const identity = identityManager.importIdentity(jsonString);
```

---

## 實際使用範例

### 範例 1: 商業諮詢場景

```bash
# 切換到專業顧問
identity:switch consultant

# 詢問商業問題
"我們公司應該如何進入東南亞市場？"

# 切換到創意夥伴尋求創意點子
identity:switch creative

"有什麼創新的行銷方式可以考慮？"

# 回到專業顧問做最終決策
identity:switch consultant

"綜合以上，建議的執行步驟是？"
```

### 範例 2: 程式開發場景

```bash
# 切換到程式導師
identity:switch coding-mentor

# 詢問技術問題
"如何優化這個 React 元件的性能？"

# 切換到簡潔模式快速查詢
identity:switch concise

"React.memo 的語法？"

# 切換回程式導師深入討論
identity:switch coding-mentor

"解釋一下 useMemo 和 useCallback 的區別"
```

### 範例 3: 創意寫作場景

```bash
# 切換到創意夥伴
identity:switch creative

"幫我想一個科幻小說的設定"

# 切換到研究員驗證科學合理性
identity:switch researcher

"這個設定在物理上合理嗎？"

# 切換回創意夥伴調整
identity:switch creative

"那我們如何讓它既科學又有趣？"
```

---

## API 參考

### IdentityManager Class

```typescript
import { IdentityManager } from './identity-manager';

const manager = new IdentityManager(storagePath);

// 列出身份
manager.listIdentities(): Identity[];

// 獲取身份
manager.getIdentity(id: string): Identity | null;

// 創建身份
manager.createIdentity(id: string, config: Partial<IdentityConfig>): Identity;

// 更新身份
manager.updateIdentity(id: string, updates: Partial<IdentityConfig>): Identity | null;

// 刪除身份
manager.deleteIdentity(id: string): boolean;

// 切換身份
await manager.switchIdentity(id: string, reason?: string): Promise<Identity | null>;

// 獲取當前身份
manager.getCurrentIdentity(): Identity | null;

// 獲取歷史
manager.getSwitchHistory(limit: number): SwitchRecord[];

// 導出
manager.exportIdentity(id: string): string | null;

// 導入
manager.importIdentity(json: string): Identity | null;

// 重置
await manager.resetToDefault(): Promise<Identity | null>;

// 統計
manager.getStats(): { ... };
```

---

## 最佳實踐

### 1. 為不同任務創建專用身份

```bash
# 為特定專案創建身份
identity:create project-alpha

# 為特定客戶創建身份
identity:create client-abc

# 為特定技能創建身份
identity:create data-analyst
```

### 2. 定期查看使用統計

```bash
# 了解哪些身份最常用
identity:stats

# 查看最近切換歷史
identity:history 10
```

### 3. 清理不用的身份

```bash
# 刪除不再需要的身份
identity:delete old-project
```

### 4. 備份重要身份

```typescript
// 定期導出自定義身份
const backups = {
  'my-bot': manager.exportIdentity('my-bot'),
  'specialist': manager.exportIdentity('specialist')
};
```

---

## 限制與注意事項

### 1. 不能刪除的身份
- 當前激活的身份
- 內建身份（default, consultant, creative 等）

### 2. 身份切換影響
- 切換身份會修改 `SOUL.md`
- 建議在切換前保存重要對話

### 3. 身份名稱限制
- ID 不能包含特殊字符
- 建議使用連字符：`my-bot` 而非 `my bot`

---

## 故障排除

### 問題：身份切換後行為沒有改變

**原因:** SOUL.md 可能被其他程序覆蓋

**解決:**
```bash
# 重新切換
identity:reset
identity:switch <desired-identity>
```

### 問題：找不到自定義身份

**原因:** 身份文件可能損壞

**解決:**
```bash
# 查看配置文件
ls hooks/legion/io/write/identity-manager/configs/

# 重新創建
identity:create <id>
```

### 問題：切換歷史丢失

**原因:** 歷史記錄限制為 100 條

**解決:** 這是正常行為，定期導出重要記錄

---

## 未來擴展

- [ ] 身份模板市場
- [ ] 身份分享功能
- [ ] 自動身份建議
- [ ] 身份組合（混合多個身份特點）
- [ ] 身份版本控制
- [ ] 批量操作

---

**找到最適合每個場景的身份！** 🎭
