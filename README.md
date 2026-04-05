# 🜂 Legion Hook

> **從輸出逆向執行** — 為 OpenClaw 設計的模塊化 Kernel Hook

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Hook-blue)](https://github.com/openclaw/openclaw)

## 簡介

Legion 是一個 OpenClaw workspace hook，提供**逆向執行引擎**和**模塊化架構**，讓您從期望的輸出結果開始開發，而非從代碼開始。

```typescript
// 從輸出開始
const plan = await kernel.reverseExecute('print("成功")');

// Kernel 自動生成執行計劃
console.log(plan.generatedCode);
// print("成功")
```

## ✨ 特性

| 特性 | 說明 |
|------|------|
| 🔄 **逆向執行** | 從輸出結果反向生成代碼和執行計劃 |
| 🧩 **模塊化** | 一切皆為模塊，可動態註冊、組合、替換 |
| 🔒 **I/O 封閉** | 所有操作限制在 hook 目錄內，安全可控 |
| 📝 **操作審計** | 所有 I/O 操作自動記錄，可追溯 |
| ♾️ **無限擴展** | 設計用於無限制的功能擴展 |

## 📦 安裝

### 前置要求

- OpenClaw Gateway v1.0+
- Node.js v18+

### 步驟

```bash
# 1. 克隆或下載此倉庫到 OpenClaw workspace
git clone https://github.com/YOUR_USERNAME/legion-hook.git
mv legion-hook ~/.openclaw/workspace/hooks/legion

# 2. 啟用 hook
openclaw hooks enable legion

# 3. 重啟 Gateway
openclaw gateway restart
```

## 🚀 快速開始

### 逆向執行

```typescript
// Kernel 在 agent bootstrap 時自動注入
const plan = await kernel.reverseExecute('print("成功")');

// 查看生成的執行計劃
plan.steps.forEach(step => {
  console.log(`Step ${step.order}: ${step.action}`);
  console.log(step.code);
});
```

### 創建自定義模塊

在 `modules/my-module.ts` 中：

```typescript
import type { LegionModule, KernelContext } from '../types';

const myModule: LegionModule = {
  id: 'my-module',
  name: 'My Module',
  description: '處理特定輸出模式',
  trigger: 'my-pattern',
  handler: async (ctx: KernelContext) => {
    // 安全的 I/O 操作
    await ctx.io.write('output/result.txt', ctx.output);
    return { success: true };
  }
};

export default myModule;
```

### I/O 操作

```typescript
// 所有操作自動限制在 hooks/legion/io/ 內
await kernel.io.write('data.json', JSON.stringify({ key: 'value' }));
const data = await kernel.io.read('data.json');
await kernel.io.append('logs/app.log', 'Log entry\n');
```

## 📁 目錄結構

```
legion-hook/
├── HOOK.md              # Hook 元數據
├── README.md            # 本文件
├── handler.ts           # OpenClaw hook 處理器
├── types.ts             # TypeScript 型別定義
├── kernel/
│   ├── core.ts          # Kernel 核心
│   ├── reverse.ts       # 逆向執行引擎
│   ├── modules.ts       # 模組系統
│   └── io.ts            # I/O 追蹤器
├── modules/
│   └── sample-module.ts # 示例模組
├── io/
│   ├── read/            # 讀取目錄
│   └── write/           # 寫入目錄
└── state/
    └── registry.json    # 模組註冊表
```

## 📖 API 參考

### Kernel

| 方法 | 說明 |
|------|------|
| `reverseExecute(output)` | 從輸出逆向生成執行計劃 |
| `registerModule(module)` | 註冊新模組 |
| `getContext(output)` | 獲取 Kernel 上下文 |
| `executeModule(id, ctx)` | 執行指定模組 |

### IOTracker

| 方法 | 說明 |
|------|------|
| `read(path)` | 讀取檔案 |
| `write(path, content)` | 寫入檔案 |
| `append(path, content)` | 追加內容 |
| `exists(path)` | 檢查是否存在 |
| `delete(path)` | 刪除檔案 |
| `list(path)` | 列出目錄內容 |

### ModuleRegistry

| 方法 | 說明 |
|------|------|
| `register(module)` | 註冊模組 |
| `get(id)` | 獲取模組 |
| `getAll()` | 獲取所有模組 |
| `findMatching(output)` | 查找匹配的模組 |
| `compose(id, ids, name, desc)` | 組合模組 |

## 🔒 安全

- **I/O 封閉**: 所有檔案操作限制在 hook 目錄內
- **路徑淨化**: 自動移除 `..` 等路徑遍歷嘗試
- **操作審計**: 所有 I/O 記錄於 `state/io-log-*.jsonl`
- **模組驗證**: 註冊時驗證必要欄位

## 🧪 測試

```bash
# 檢查 hook 狀態
openclaw hooks list

# 查看 kernel 狀態
cat ~/.openclaw/workspace/hooks/legion/state/registry.json

# 查看 I/O 日誌
cat ~/.openclaw/workspace/hooks/legion/state/io-log-*.jsonl
```

## 📝 授權

MIT License — 詳見 [LICENSE](LICENSE) 檔案

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

1. Fork 此倉庫
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📮 聯繫

- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- OpenClaw Discord: https://discord.gg/clawd

---

**從輸出開始，無限可能。** 🜂
