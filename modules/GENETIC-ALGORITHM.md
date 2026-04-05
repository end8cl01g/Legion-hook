# 🧬 Genetic Algorithm - 遺傳演算法優化模組

> **模擬自然演化 · 尋找最優解** — 解決複雜優化問題的強大工具

## 什麼是遺傳演算法？

遺傳演算法（Genetic Algorithm, GA）是一種受生物演化啟發的優化技術：

```
┌─────────────────────────────────────────────────────────────┐
│                    遺傳演算法流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   初始種群 → 評估適應度 → 選擇 → 交配 → 突變 → 新一代      │
│      ↑                                                      │
│      └──────────────────────────────────────────────────┘   │
│                        (重複直到滿足條件)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心概念

| 概念 | 生物學類比 | 計算機科學意義 |
|------|-----------|---------------|
| **染色體 (Chromosome)** | DNA 序列 | 解決方案的編碼 |
| **基因 (Gene)** | 遺傳單位 | 參數/變數 |
| **適應度 (Fitness)** | 生存能力 | 解決方案質量 |
| **種群 (Population)** | 群體 | 候選解集合 |
| **選擇 (Selection)** | 自然選擇 | 保留優秀解 |
| **交配 (Crossover)** | 有性繁殖 | 組合優秀特徵 |
| **突變 (Mutation)** | 基因突變 | 引入多樣性 |

---

## 內建優化問題

### 1️⃣ Maximize Ones（簡單測試）

**問題：** 最大化二進制串中 1 的數量

```typescript
// 運行
ga:run max-ones

// 示例輸出
{
  "bestFitness": 20,
  "bestGenes": [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  "generations": 15
}
```

---

### 2️⃣ Knapsack Problem（背包問題）

**問題：** 在容量限制下最大化總價值

```
物品列表：
┌──────┬────────┬────────┐
│ 物品 │ 重量   │ 價值   │
├──────┼────────┼────────┤
│ 1    │ 10     │ 60     │
│ 2    │ 20     │ 100    │
│ 3    │ 30     │ 120    │
│ 4    │ 15     │ 80     │
│ 5    │ 25     │ 110    │
│ 6    │ 35     │ 140    │
└──────┴────────┴────────┘
背包容量：100

最優解：選擇物品 1,2,4,5,6 (總重 105→超載，需調整)
```

```typescript
// 運行
ga:run knapsack pop=100 gen=500

// 示例輸出
{
  "bestFitness": 470,
  "bestGenes": [1,1,0,1,1,1],  // 選擇物品 1,2,4,5,6
  "generations": 87
}
```

---

### 3️⃣ Traveling Salesman Problem（旅行商問題）

**問題：** 找到訪問所有城市的最短路徑

```
城市坐標：
  5 │   ●       ●
  4 │           ●
  3 │       ●
  2 │   ●
  1 │       ●
  0 │ ●
    └────────────────
      0   2   4   6
```

```typescript
// 運行（使用排列編碼）
ga:run tsp pop=200 gen=1000

// 示例輸出
{
  "bestFitness": 0.089,  // 1/距離
  "bestGenes": [0,2,1,4,5,3],  // 訪問順序
  "generations": 234
}
```

---

### 4️⃣ Function Maximization（函數最大化）

**問題：** 最大化 f(x) = x * sin(10πx) + 1

```typescript
// 運行（使用實數編碼）
ga:run function-max pop=50 gen=100

// 示例輸出
{
  "bestFitness": 1.95,
  "bestGenes": [0.95],  // x 值
  "generations": 45
}
```

---

### 5️⃣ Job Scheduling（工作排程）

**問題：** 最小化總完成時間

```
工作處理時間：
┌──────┬────────┐
│ 工作 │ 時間   │
├──────┼────────┤
│ 0    │ 5      │
│ 1    │ 3      │
│ 2    │ 8      │
│ 3    │ 2      │
│ 4    │ 6      │
│ 5    │ 4      │
└──────┴────────┘

最優順序：短工作優先 → [3,1,5,0,4,2]
```

```typescript
// 運行（使用排列編碼）
ga:run scheduling pop=100 gen=300

// 示例輸出
{
  "bestFitness": 0.015,  // 1/總完成時間
  "bestGenes": [3,1,5,0,4,2],  // 最優順序
  "generations": 67
}
```

---

## 使用命令

### 基本命令

```bash
# 列出所有內建問題
ga:problems

# 運行優化
ga:run <problem_id> [options]

# 快速演示
ga:demo

# 查看幫助
ga:
```

### 配置選項

| 參數 | 簡寫 | 說明 | 預設值 |
|------|------|------|--------|
| `populationSize` | `pop` | 種群大小 | 100 |
| `maxGenerations` | `gen` | 最大世代數 | 1000 |
| `mutationRate` | `mut` | 突變機率 | 0.01 |
| `crossoverRate` | `cross` | 交叉機率 | 0.8 |
| `elitismCount` | `elite` | 精英保留數 | 2 |
| `selectionMethod` | `select` | 選擇方法 | tournament |

### 使用示例

```bash
# 基本運行
ga:run max-ones

# 自定義種群和世代
ga:run knapsack pop=200 gen=500

# 調整突變率（增加多樣性）
ga:run tsp mut=0.1

# 調整交叉率
ga:run scheduling cross=0.9

# 完整配置
ga:run function-max pop=100 gen=200 mut=0.05 cross=0.85 elite=5
```

---

## 演算法詳解

### 1. 編碼方式

#### 二進制編碼 (Binary)
```
染色體：[1, 0, 1, 1, 0, 0, 1, 0]
應用：背包問題、特征選擇
```

#### 實數編碼 (Real)
```
染色體：[0.73, 0.15, 0.92, 0.44]
應用：函數優化、參數調整
```

#### 排列編碼 (Permutation)
```
染色體：[3, 1, 4, 0, 2, 5]
應用：TSP、排程問題
```

---

### 2. 選擇方法

#### 錦標賽選擇 (Tournament)
```
隨機選 k 個個體 → 選擇最好的
優點：快速、並行化容易
缺點：可能過早收斂
```

#### 輪盤賭選擇 (Roulette)
```
適應度越高 → 被選中機率越大
優點：自然、直觀
缺點：需要計算總適應度
```

#### 排名選擇 (Rank)
```
按適應度排名 → 基於排名選擇
優點：避免早熟收斂
缺點：計算複雜
```

---

### 3. 交叉算子

#### 單點交叉
```
父代 1: [1 1 1 | 0 0 0]
父代 2: [0 0 0 | 1 1 1]
              ↓
子代 1: [1 1 1 | 1 1 1]
子代 2: [0 0 0 | 0 0 0]
```

#### 兩點交叉
```
父代 1: [1 1 | 0 0 | 1 1]
父代 2: [0 0 | 1 1 | 0 0]
              ↓
子代 1: [1 1 | 1 1 | 1 1]
子代 2: [0 0 | 0 0 | 0 0]
```

#### 均勻交叉
```
每個基因隨機來自任一父代
```

---

### 4. 突變算子

#### 二進制突變
```
[1, 0, 1, 1, 0] → [1, 0, 0, 1, 0]  (第 3 位翻轉)
```

#### 實數突變
```
[0.5, 0.3, 0.8] → [0.5, 0.7, 0.8]  (第 2 位隨機重設)
```

#### 排列突變（交換）
```
[0, 1, 2, 3, 4] → [0, 3, 2, 1, 4]  (交換第 1 和第 3 位)
```

---

## 進階應用

### 應用場景 1: AI 模型超參數優化

```typescript
// 定義問題
const problem: OptimizationProblem = {
  id: 'ml-hyperparams',
  name: 'ML Hyperparameter Tuning',
  description: '優化機器學習模型超參數',
  fitnessFunction: (genes) => {
    // genes: [learning_rate, batch_size, num_layers, ...]
    const lr = genes[0];
    const batchSize = Math.round(genes[1]);
    const numLayers = Math.round(genes[2]);
    
    // 訓練模型並返回驗證準確率
    const accuracy = trainAndEvaluate(lr, batchSize, numLayers);
    return accuracy;
  },
  geneRange: { min: 0, max: 1 },
  geneType: 'real'
};
```

---

### 應用場景 2: 金融交易策略優化

```typescript
const tradingStrategy: OptimizationProblem = {
  id: 'trading-strategy',
  name: 'Trading Strategy Optimization',
  description: '優化交易策略參數',
  fitnessFunction: (genes) => {
    // genes: [entry_threshold, exit_threshold, stop_loss, ...]
    const sharpeRatio = backtest(genes);
    return sharpeRatio;  // 夏普比率越高越好
  }
};
```

---

### 應用場景 3: 天線設計優化

```typescript
const antennaDesign: OptimizationProblem = {
  id: 'antenna-design',
  name: 'Antenna Design Optimization',
  description: '優化天線幾何參數',
  fitnessFunction: (genes) => {
    // genes: [length, width, height, material_index, ...]
    const gain = simulateAntennaGain(genes);
    const swr = simulateSWR(genes);
    return gain - swr * 10;  // 高增益，低 SWR
  }
};
```

---

## 性能調優指南

### 問題診斷

| 症狀 | 可能原因 | 解決方案 |
|------|---------|---------|
| 過早收斂 | 多樣性不足 | 增加突變率、增大種群 |
| 收斂太慢 | 選擇壓力不足 | 增加錦標賽大小、減少突變 |
| 陷入局部最優 | 探索不足 | 增加突變率、使用多種選擇方法 |
| 結果不穩定 | 隨機性太大 | 設置隨機種子、增加世代數 |

### 參數建議

| 問題類型 | 種群大小 | 突變率 | 交叉率 | 世代數 |
|---------|---------|--------|--------|--------|
| 簡單（Max Ones） | 50-100 | 0.01 | 0.8 | 100-200 |
| 中等（Knapsack） | 100-200 | 0.05 | 0.8 | 500-1000 |
| 複雜（TSP） | 200-500 | 0.1 | 0.9 | 1000-5000 |
| 實數優化 | 50-100 | 0.1 | 0.8 | 200-500 |

---

## API 參考

### 核心類

```typescript
import { GeneticAlgorithm, SeededRandom } from './modules/genetic-algorithm';

// 創建 GA 實例
const ga = new GeneticAlgorithm(problem, {
  populationSize: 100,
  maxGenerations: 500,
  chromosomeLength: 10
});

// 運行優化
const result = await ga.run((state) => {
  console.log(`Gen ${state.population.generation}: ${state.population.bestFitness}`);
});

// 獲取結果
console.log('Best fitness:', result.bestChromosome?.fitness);
console.log('Best genes:', result.bestChromosome?.genes);
```

### 類型定義

```typescript
interface Chromosome {
  genes: number[];
  fitness: number;
  generation: number;
  id: string;
}

interface Population {
  chromosomes: Chromosome[];
  generation: number;
  bestFitness: number;
  avgFitness: number;
}

interface GAState {
  problemId: string;
  config: GAConfig;
  population: Population;
  bestChromosome: Chromosome | null;
  history: Array<{ generation: number; bestFitness: number; avgFitness: number }>;
}
```

---

## 最佳實踐

### 1. 問題編碼
- 選擇合適的編碼方式（二進制/實數/排列）
- 確保編碼能表達所有可能的解
- 避免冗餘編碼

### 2. 適應度函數設計
- 準確反映解的質量
- 計算效率高
- 避免數值溢出
- 處理約束條件

### 3. 參數調整
- 從默認值開始
- 根據收斂情況調整
- 多次運行取平均
- 記錄最佳參數組合

### 4. 終止條件
- 最大世代數
- 適應度閾值
- 多代無改善
- 時間限制

---

**演化不息，優化無止境。** 🧬♾️
