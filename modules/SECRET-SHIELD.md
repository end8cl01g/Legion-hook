# 🛡️ Secret-Shield - 敏感數據防護模組

> **實時掃描 · 自動攔截 · 智能脫敏** — 防止敏感數據洩露

## 問題背景

在 AI 輔助開發中，敏感數據洩露是重大風險：
- ❌ GitHub PAT 意外輸出
- ❌ AWS 密钥寫入日誌
- ❌ 數據庫連接字符串洩露
- ❌ 私鑰文件被讀取
- ❌ 密碼嵌入 URL

## 解決方案

Secret-Shield 提供**三層防護**：

```
┌─────────────────────────────────────────────────────────────┐
│                    Secret-Shield                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 模式匹配                                           │
│  • 18+ 種敏感數據模式                                        │
│  • GitHub/GitLab/AWS/Slack/Stripe 等                         │
│  • 自定義規則支持                                            │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: 實時攔截                                           │
│  • 每輪輸出自動掃描                                          │
│  • Critical 級別直接攔截                                     │
│  • High 級別自動脫敏                                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: 審計日誌                                           │
│  • 所有發現記錄在案                                          │
│  • 分類統計和趨勢分析                                        │
│  • 可配置的 allowlist                                        │
└─────────────────────────────────────────────────────────────┘
```

## 安裝

```bash
# Legion Hook 已包含此模組
# 只需確保 legion hook 已啟用

openclaw hooks list  # 確認 legion 已啟用
```

## 支持的敏感數據類型

| 類型 | ID | 嚴重性 | 動作 |
|------|-----|--------|------|
| GitHub PAT | `github-pat` | 🔴 Critical | 攔截 |
| GitHub OAuth | `github-oauth` | 🔴 Critical | 攔截 |
| GitHub App Token | `github-app` | 🔴 Critical | 攔截 |
| GitLab PAT | `gitlab-pat` | 🔴 Critical | 攔截 |
| AWS Access Key | `aws-access-key` | 🔴 Critical | 攔截 |
| AWS Secret Key | `aws-secret-key` | 🔴 Critical | 攔截 |
| Private Key (PEM) | `private-key` | 🔴 Critical | 攔截 |
| Slack Token | `slack-token` | 🔴 Critical | 攔截 |
| Stripe Live Key | `stripe-key` | 🔴 Critical | 攔截 |
| 通用 API Key | `generic-api-key` | 🟠 High | 脫敏 |
| 密碼 URL | `password-url` | 🟠 High | 脫敏 |
| 通用密碼 | `generic-password` | 🟠 High | 脫敏 |
| Bearer Token | `bearer-token` | 🟠 High | 脫敏 |
| Google API Key | `google-api-key` | 🟠 High | 脫敏 |
| Twilio Key | `twilio-key` | 🟠 High | 脫敏 |
| 數據庫連接 | `db-connection` | 🟠 High | 脫敏 |
| 內部 IP | `internal-ip` | 🟡 Medium | 警告 |
| 電話號碼 | `phone` | 🟡 Medium | 警告 |
| 電子郵件 | `email` | 🟢 Low | 警告 |

## 使用方式

### 1️⃣ 手動掃描

```typescript
// 掃描內容
shield:scan 我的 token 是 ghp_1234567890abcdefghijklmnopqrstuvwxyz

// 返回：
{
  "hasSecrets": true,
  "findings": [{
    "patternName": "GitHub PAT",
    "severity": "critical",
    "action": "block",
    "redactedMatch": "ghp_***REDACTED***"
  }],
  "blocked": true,
  "sanitizedContent": "我的 token 是 ghp_***REDACTED***"
}
```

### 2️⃣ 測試模式

```typescript
// 測試 GitHub token 檢測
shield:test github

// 測試 AWS key 檢測
shield:test aws

// 測試密碼檢測
shield:test password
```

### 3️⃣ 查看狀態

```typescript
shield:status

// 返回：
{
  "enabled": true,
  "blockOnCritical": true,
  "patterns": 18,
  "stats": {
    "totalScans": 150,
    "totalFindings": 5,
    "blockedCount": 2,
    "redactedCount": 3
  }
}
```

### 4️⃣ 配置管理

```typescript
// 啟用防護
shield:config enable

// 禁用防護
shield:config disable

// 添加到 allowlist（白名單）
shield:config allow ghp_known_good_token
```

## 自動防護

### 每輪輸出自動掃描

Secret-Shield 會在每輪對話結束時自動掃描輸出：

```
用戶：帮我生成一个部署脚本
  ↓
AI 生成回應（包含 AWS 密钥）
  ↓
Secret-Shield 掃描
  ↓
檢測到 critical 級別敏感數據
  ↓
自動攔截並替換為 [內容已攔截：檢測到敏感數據]
```

### 嚴重性分級處理

| 嚴重性 | 處理方式 | 示例 |
|--------|---------|------|
| **Critical** | 直接攔截 | GitHub PAT, AWS Key, Private Key |
| **High** | 自動脫敏 | API Key, 密碼，Token |
| **Medium** | 警告 + 記錄 | 內部 IP, 電話 |
| **Low** | 僅記錄 | 電子郵件 |

## 配置選項

```json
{
  "enabled": true,
  "blockOnCritical": true,
  "logPath": "secret-shield/",
  "allowList": [],
  "customPatterns": []
}
```

### 添加自定義模式

```typescript
// 在 modules/secret-shield.ts 中添加
const customPattern: SecretPattern = {
  id: 'my-company-token',
  name: 'My Company Token',
  pattern: /MYCO_[a-zA-Z0-9]{32}/g,
  severity: 'critical',
  action: 'block',
  description: 'My Company API Token'
};

// 添加到配置
config.customPatterns.push(customPattern);
```

## 日誌和審計

### 日誌位置

```
hooks/legion/io/write/secret-shield/
├── config.json              # 當前配置
├── stats.json               # 統計數據
├── findings-YYYY-MM-DD.jsonl  # 每日發現記錄
└── findings-*.jsonl         # 歷史記錄
```

### 查看統計

```bash
# 查看今日發現
cat hooks/legion/io/write/secret-shield/findings-$(date +%Y-%m-%d).jsonl

# 查看統計
cat hooks/legion/io/write/secret-shield/stats.json
```

### 統計指標

```json
{
  "totalScans": 150,
  "totalFindings": 5,
  "findingsByType": {
    "github-pat": 2,
    "aws-access-key": 1,
    "email": 2
  },
  "findingsBySeverity": {
    "critical": 3,
    "low": 2
  },
  "blockedCount": 3,
  "redactedCount": 0,
  "lastScan": 1712304000000
}
```

## 脫敏規則

| 類型 | 原始 | 脫敏後 |
|------|------|--------|
| GitHub PAT | `ghp_abc123...xyz` | `ghp_***REDACTED***` |
| AWS Key | `AKIAIOSFODNN7EXAMPLE` | `AKIA***REDACTED***` |
| Private Key | `-----BEGIN...` | `-----BEGIN PRIVATE KEY-----\n[REDACTED]\n-----END...` |
| 密碼 URL | `://user:pass123@` | `://***REDACTED***@` |
| 電子郵件 | `john@example.com` | `jo***@example.com` |
| 通用 | `secret123456` | `secr***REDACTED***56` |

## 最佳實踐

### 1. 定期審查日誌

```bash
# 每週審查發現記錄
cat hooks/legion/io/write/secret-shield/findings-*.jsonl | \
  jq -s 'group_by(.finding.patternId) | .[] | {type: .[0].finding.patternName, count: length}'
```

### 2. 維護 Allowlist

```typescript
# 添加已知的安全 token（謹慎使用）
shield:config allow <token>

# 定期審查 allowlist
cat hooks/legion/io/write/secret-shield/config.json
```

### 3. 自定義規則

根據公司/項目需求添加自定義模式：

```typescript
// 公司內部 token
{
  "id": "company-token",
  "pattern": /CORP_[a-zA-Z0-9]{24}/g,
  "severity": "critical",
  "action": "block"
}
```

### 4. 集成 CI/CD

在 CI/CD 流程中使用 Secret-Shield：

```bash
# 掃描輸出文件
shield:scan "$(cat output.log)"

# 如果檢測到 secrets，失敗退出
if [ $(shield:scan "$OUTPUT" | jq '.blocked') = "true" ]; then
  echo "Secret detected! Build failed."
  exit 1
fi
```

## 性能影響

| 操作 | 耗時 | 備註 |
|------|------|------|
| 單次掃描 (<1KB) | <5ms | 18 個正則匹配 |
| 單次掃描 (10KB) | <20ms | 線性增長 |
| 自動攔截 | <1ms | 字符串替換 |
| 日誌記錄 | <5ms | 異步寫入 |

## 故障排除

### 問題：誤報（False Positive）

**原因：** 普通文本匹配了敏感模式

**解決：**
```typescript
# 添加到 allowlist
shield:config allow <誤報內容>

# 或調整正則模式（修改源碼）
```

### 問題：漏報（False Negative）

**原因：** 新類型的敏感數據未被識別

**解決：**
```typescript
# 添加自定義模式
config.customPatterns.push({
  id: 'new-type',
  pattern: /your_pattern/g,
  severity: 'high',
  action: 'redact'
});
```

### 問題：性能下降

**原因：** 大量文本掃描

**解決：**
```typescript
# 禁用自動掃描（僅手動）
shield:config disable

# 或增加掃描閾值（修改源碼）
```

## 合規性

Secret-Shield 幫助滿足以下合規要求：

- ✅ **SOC 2** - 敏感數據保護
- ✅ **GDPR** - 個人數據處理（郵箱、電話）
- ✅ **PCI DSS** - 支付數據保護
- ✅ **HIPAA** - 健康數據保護（需自定義規則）

## API 參考

### 模組導出

```typescript
import secretShield, { scanContent, SECRET_PATTERNS } from './modules/secret-shield';

// 掃描內容
const result = scanContent(content, config);

// 模組資訊
secretShield.id           // 'secret-shield'
secretShield.name         // 'Secret Shield'
secretShield.trigger      // 'shield:'
```

### ScanResult 類型

```typescript
interface ScanResult {
  hasSecrets: boolean;
  findings: SecretFinding[];
  originalLength: number;
  sanitizedContent: string;
  action: 'allow' | 'blocked' | 'redacted' | 'warned';
}
```

## 未來計劃

- [ ] 機器學習輔助檢測（減少誤報）
- [ ] 實時監控儀表板
- [ ] Slack/Email 告警集成
- [ ] 自動輪換檢測到的 secrets
- [ ] 更多雲服務商支持（Azure, GCP, etc.）

---

**守護數據，從不洩露開始。** 🛡️
