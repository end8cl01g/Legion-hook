# 🧠 Neuroevolution - 神經演化模組

> **自動設計神經網路** - 將進化理論應用於網路結構與權重的自動優化

## 簡介

**神經演化 (Neuroevolution)** 是一種將遺傳演算法應用於神經網路的方法：

- **自動架構設計**：不需要手動決定層數、神經元數量
- **結構進化**：網路可以「長出」新的節點和連接
- **權重優化**：直接優化連接強度，無需反向傳播
- **無需大量標籤數據**：適合強化學習、遊戲 AI 等場景

### NEAT 算法

本模組實現了 **NEAT (NeuroEvolution of Augmenting Topologies)** 的核心概念：
- 從簡單網路開始
- 逐步增加複雜度（添加節點、連接）
- 使用創新編號追蹤結構演化
- 同時優化結構和權重

## 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                  Neuroevolution Engine                       │
├─────────────────────────────────────────────────────────────┤
│  🧬 基因組 (Genome)                                          │
│  • 神經元節點 (Neurons)                                      │
│  • 連接權重 (Connections)                                    │
│  • 創新編號 (Innovation Numbers)                             │
├─────────────────────────────────────────────────────────────┤
│  🔬 結構突變                                                 │
│  • Add Connection - 添加新連接                               │
│  • Add Node - 添加新節點（斷開舊連接，插入新節點）             │
├─────────────────────────────────────────────────────────────┤
│  ⚙️ 權重突變                                                 │
│  • 高斯擾動調整連接強度                                      │
├─────────────────────────────────────────────────────────────┤
│  🧬 交叉 (Crossover)                                         │
│  • 匹配同源基因                                              │
│  • 遺傳較好的結構                                            │
└─────────────────────────────────────────────────────────────┘
```

## 內建問題

### 1. XOR Gate (異或閘)

**目標**：學習 XOR 邏輯函數

```
輸入    輸出
0 0  →  0
0 1  →  1
1 0  →  1
1 1  →  0
```

**特點**：
- 2 個輸入，1 個輸出
- 非線性可分問題
- 適合測試基本學習能力

### 2. Function Approximation (函數逼近)

**目標**：逼近函數 `f(x) = sin(2πx)`

**特點**：
- 1 個輸入，1 個輸出
- 連續值逼近
- 評估誤差

### 3. Classification (分類)

**目標**：二分類問題

**特點**：
- 2 個輸入，1 個輸出
- 複雜邊界分類
- 準確率評估

## 使用方式

### 1. 查看可用問題

```typescript
neuro:problems

// 返回：
{
  "problems": [
    { "id": "xor", "name": "XOR Gate" },
    { "id": "function-approximation", "name": "Function Approximation" },
    { "id": "classification", "name": "Classification" }
  ]
}
```

### 2. 運行優化

```typescript
// 解決 XOR 問題
neuro:run xor

// 函數逼近
neuro:run function-approximation

// 分類問題
neuro:run classification
```

### 3. 快速演示

```typescript
neuro:demo

// 返回：
{
  "action": "demo",
  "problem": "XOR Gate",
  "bestFitness": 4,  // 完美得分
  "generations": 87,
  "complexity": 7  // 3 個神經元 + 4 個連接
}
```

## 配置選項

```typescript
const config = {
  // 種群大小（建議 50-100）
  populationSize: 50,
  
  // 最大世代數
  maxGenerations: 200,
  
  // 適應度閾值（達到即停止）
  fitnessThreshold: 4,
  
  // 交叉機率
  crossoverRate: 0.7,
  
  // 總體突變機率
  mutationRate: 0.1,
  
  // 結構突變機率
  structureMutationRate: 0.05,
  
  // 權重突變機率
  weightMutationRate: 0.3,
  
  // 權重突變幅度
  weightMutationMagnitude: 0.1,
  
  // 精英保留數量
  elitismCount: 2,
  
  // 隨機種子（可重複）
  seed: 42
};
```

## 演化過程

### 階段 1：初始化

```
Generation 0:
- 50 個隨機網路
- 平均適應度：0.5
- 最佳適應度：0.5
- 網路複雜度：2-4
```

### 階段 2：結構進化

```
Generation 50:
- 網路開始變複雜
- 平均適應度：2.0
- 最佳適應度：3.0
- 平均複雜度：6-8
```

### 階段 3：收斂

```
Generation 100:
- 網路結構穩定
- 平均適應度：3.8
- 最佳適應度：4.0 (完美)
- 複雜度：7 (2 輸入 + 1 隱藏 + 1 輸出)
```

## 結果分析

### 最佳網路結構

```
XOR 問題最佳解：

     輸入 0 (0/1) ─────┐
                        ├──[隱藏節點]──┐
     輸入 1 (0/1) ─────┘               │
                                       ├──[輸出] → 0/1
     [偏置] ────────────────┘
```

### 適應度曲線

```
Fitness
  4.0 |               ╭─────
      |             ╭─╯
  3.0 |           ╭─╯
      |         ╭─╯
  2.0 |       ╭─╯
      |     ╭─╯
  1.0 |   ╭─╯
      | ╭─╯
  0.0 └───────────────────
      0   20  40  60  80  100
                 Generation
```

## 應用場景

### 🎮 遊戲 AI

- **吃豆人**：學習路徑規劃
- **格鬥遊戲**：學習戰鬥策略
- **即時戰略**：學習資源管理

### 🤖 機器人控制

- **行走控制**：學習步態
- **抓取操作**：學習抓握策略
- **平衡控制**：學習維持平衡

### 📊 函數優化

- **參數調優**：自動調整超參數
- **設計優化**：自動設計最佳結構
- **資源分配**：優化資源配置

### 🎨 創意生成

- **音樂生成**：學習旋律結構
- **藝術創作**：學習風格特徵
- **文本生成**：學習語法模式

## 進階使用

### 自定義問題

```typescript
import { Neuroevolution } from './neuroevolution';

const customProblem = {
  id: 'my-problem',
  name: 'My Custom Problem',
  description: '...',
  config: {
    inputNodes: 3,
    outputNodes: 1
  },
  fitnessFunction: (network) => {
    // 自定義適應度評估
    // ...
    return fitness;
  }
};

const neuro = new Neuroevolution(customProblem, {
  populationSize: 100,
  maxGenerations: 500
});

const result = await neuro.run();
console.log('Best fitness:', result.bestFitness);
```

### 監控演化過程

```typescript
const neuro = new Neuroevolution(problem);

const result = await neuro.run((state) => {
  console.log(`Generation ${state.generation}:`);
  console.log(`  Best fitness: ${state.bestFitness}`);
  console.log(`  Avg fitness: ${state.avgFitness}`);
  console.log(`  Complexity: ${state.history[state.history.length-1].networkComplexity}`);
});
```

### 獲取最佳網路

```typescript
const result = await neuro.run();

if (result.bestNetwork) {
  const network = new SimpleNeuralNetwork(
    result.bestNetwork.genes,
    result.bestNetwork.inputs,
    result.bestNetwork.outputs
  );
  
  // 使用最佳網路進行推斷
  network.setInput([0.5, 0.3]);
  const output = network.forward();
  console.log('Output:', output);
}
```

## 性能指標

| 問題 | 世代數 | 最佳適應度 | 複雜度 | 耗時 |
|------|--------|-----------|--------|------|
| XOR | 50-150 | 4/4 | 7 | ~1s |
| 函數逼近 | 100-300 | 10-20 | 10-15 | ~3s |
| 分類 | 80-200 | 0.8-1.0 | 8-12 | ~2s |

## 限制與注意事項

### 1. 計算成本

- 每輪需要評估整個種群
- 複雜問題可能需要大量世代
- 建議使用並行計算

### 2. 適應度函數設計

- 需要清晰可量化的目標
- 避免過於複雜的評估
- 考慮使用平滑適應度

### 3. 超參數調優

- 種群大小：50-200
- 突變率：0.01-0.1
- 需要根據問題調整

## 未來擴展

- [ ] 多目標優化
- [ ] 分布式演化
- [ ] 遷移學習
- [ ] 與反向傳播混合
- [ ] 更複雜的交叉操作
- [ ] 適應度共享機制

---

**讓網路自己進化！** 🧠🧬
