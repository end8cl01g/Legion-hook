# 🛡️ Context Guardian - 根治 Context Window 溢出

> **主動監控 · 自動清理 · 智能摘要** — 永不溢出的對話管理系統

## 問題背景

LLM 的 context window 限制是常見痛點：
- ❌ 對話過長導致 token 溢出
- ❌ 重要資訊被截斷
- ❌ 錯誤和異常行為
- ❌ 需要手動管理對話歷史

## 解決方案

Context Guardian 提供**三層防護機制**：

```
┌─────────────────────────────────────────────────────────────┐
│                    Context Guardian                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 實時監控                                           │
│  • 每輪對話前估算 token 使用                                  │
│  • 80% 警告，90% 自動干預                                     │
│  • 支持多模型 context window 配置                              │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: 自動清理                                           │
│  • 移除最早的消息（保留最近 N 條）                             │
│  • 壓縮工具調用記錄                                           │
│  • 可配置的清理策略                                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: 智能摘要                                           │
│  • 提取關鍵決策和用戶偏好                                     │
│  • 生成濃縮的對話摘要                                         │
│  • 保留重要資訊，丟棄冗餘                                     │
└─────────────────────────────────────────────────────────────┘
```

## 安裝

```bash
# Legion Hook 已包含此模組
# 只需確保 legion hook 已啟用

openclaw hooks list  # 確認 legion 已啟用
```

## 使用方式

### 1️⃣ 自動模式（推薦）

無需手動操作，系統會自動：
- 監控每輪對話的 token 使用
- 在 80% 時發出警告
- 在 90% 時自動清理

### 2️⃣ 手動命令

```typescript
// 查看當前狀態
context:status

// 檢查健康狀態
context:check

// 手動清理
context:clean

// 摘要早期對話
context:summarize

// 修改配置
context:set keepRecentMessages=30
context:set warningThreshold=75
```

### 3️⃣ 作為獨立模組使用

```typescript
import contextGuardian from './modules/context-guardian';

// 在您的代碼中使用
const result = await contextGuardian.handler({
  output: 'context:status',
  io: kernel.io,
  modules: kernel.modules
});
```

## 配置選項

| 配置項 | 預設值 | 說明 |
|--------|--------|------|
| `maxTokens` | 262144 | 最大 token 數（根據模型調整） |
| `warningThreshold` | 0.7 (70%) | 警告閾值 |
| `cleanupThreshold` | 0.85 (85%) | 自動清理閾值 |
| `summarizeThreshold` | 0.8 (80%) | 摘要觸發閾值 |
| `keepRecentMessages` | 20 | 保留最近消息數量 |
| `enableAutoSummarize` | true | 啟用自動摘要 |

### 修改配置

```typescript
// 方法 1: 使用命令
context:set keepRecentMessages=30
context:set warningThreshold=75

// 方法 2: 直接修改配置文件
// hooks/legion/io/write/context-guardian/config.json
{
  "keepRecentMessages": 30,
  "warningThreshold": 0.75
}
```

## 清理策略詳解

### 策略 1: 移除舊消息 (Prune)

```
原始：[M1, M2, M3, M4, M5, M6, M7, M8, M9, M10]
保留最近 5 條：[M6, M7, M8, M9, M10]
```

**優點：** 簡單快速，節省大量 token  
**缺點：** 丢失早期對話內容

### 策略 2: 智能摘要 (Summarize)

```
原始：[M1, M2, M3, M4, M5, M6, M7, M8, M9, M10]
摘要後：[【摘要】M1-M5 的關鍵資訊，M6, M7, M8, M9, M10]
```

**優點：** 保留重要資訊，平衡 token 使用  
**缺點：** 需要額外計算生成摘要

### 策略 3: 壓縮工具記錄 (Compress)

```
原始：[Tool: {詳細結果 5000 字}]
壓縮後：[Tool: {結果已壓縮，5000 字節}]
```

**優點：** 幾乎不丢失資訊，節省 token  
**適用：** 工具調用頻繁的場景

## 監控日誌

所有操作都會記錄在：

```
hooks/legion/io/write/context-monitor/
├── state.json           # 全局狀態和統計
├── tokens-YYYY-MM-DD.jsonl  # 每日 token 使用日誌
├── cleanup.jsonl        # 清理操作記錄
├── summarize.jsonl      # 摘要操作記錄
└── status.jsonl         # 狀態檢查記錄
```

### 查看統計

```bash
# 查看今日 token 使用
cat hooks/legion/io/write/context-monitor/tokens-$(date +%Y-%m-%d).jsonl

# 查看全局統計
cat hooks/legion/io/write/context-monitor/state.json
```

## 模型支持

| 模型 | Context Window | 安全限制 | 臨界限制 |
|------|---------------|---------|---------|
| Gensee/Qwen3.5-397B | 262,144 | 209,715 (80%) | 235,930 (90%) |
| Gensee/Qwen3.5-35B | 262,144 | 209,715 (80%) | 235,930 (90%) |
| 預設 | 128,000 | 102,400 (80%) | 115,200 (90%) |

添加新模型：

```typescript
// 在 context-monitor.ts 的 MODEL_LIMITS 中添加
'Model/Name': {
  contextWindow: 200000,
  safeLimit: 160000,
  criticalLimit: 180000
}
```

## 性能影響

| 操作 | Token 估算耗時 | 備註 |
|------|--------------|------|
| 實時監控 | <1ms | 每輪對話前執行 |
| 移除舊消息 | <1ms | O(n) 複雜度 |
| 智能摘要 | ~10-50ms | 需要生成摘要文本 |
| 壓縮工具記錄 | <1ms | 簡單字符串替換 |

## 最佳實踐

### 1. 根據場景調整閾值

```typescript
// 長對話場景（客服、諮詢）
context:set warningThreshold=60
context:set keepRecentMessages=50

// 短對話場景（問答、查詢）
context:set warningThreshold=80
context:set keepRecentMessages=10
```

### 2. 定期清理

```bash
# 每天凌晨自動清理（使用 cron）
0 2 * * * openclaw message "context:clean"
```

### 3. 監控趨勢

```bash
# 查看 token 使用趨勢
cat hooks/legion/io/write/context-monitor/tokens-*.jsonl | \
  jq -s 'group_by(.session) | .[] | {session: .[0].session, avg: (map(.tokens) | add / length)}'
```

## 故障排除

### 問題：清理後 token 仍然很高

**原因：** 可能有大型工具調用結果

**解決：**
```typescript
context:clean  # 會同時壓縮工具記錄
```

### 問題：摘要丢失重要資訊

**原因：** 摘要算法未識別關鍵內容

**解決：**
```typescript
# 增加保留消息數量
context:set keepRecentMessages=30

# 或手動編輯摘要
# hooks/legion/io/write/context-guardian/summary.txt
```

### 問題：性能影響明顯

**原因：** 對話歷史過長

**解決：**
```typescript
# 降低監控頻率（修改 hook 配置）
# 或減少 keepRecentMessages
context:set keepRecentMessages=15
```

## API 參考

### 模組导出

```typescript
import contextGuardian from './modules/context-guardian';

// 模組資訊
contextGuardian.id           // 'context-guardian'
contextGuardian.name         // 'Context Window Guardian'
contextGuardian.trigger      // 'context:'

// 執行
const result = await contextGuardian.handler(ctx);
```

### Hook 导出

```typescript
import contextMonitor from './hooks/context-monitor';

// 自動注入到 agent bootstrap 和每輪對話
```

## 未來計劃

- [ ] 支持自定義摘要模型
- [ ] 用戶偏好學習（自動識別重要內容）
- [ ] 多 session 聚合統計
- [ ] Web UI 可視化監控
- [ ] 導出/導入對話摘要

---

**永不溢出，從容對話。** 🛡️
