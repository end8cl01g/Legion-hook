/**
 * Genetic Algorithm Module
 * 
 * 遺傳演算法優化引擎
 * 將解決方案編碼成染色體，通過選擇、交配、突變演化出最優解
 */

import type { LegionModule, KernelContext } from '../types';

// ============================================================================
// 類型定義
// ============================================================================

/**
 * 染色體（個體）
 */
interface Chromosome {
  /** 基因序列（可以是二進制、實數、排列等） */
  genes: number[];
  
  /** 適應度分數 */
  fitness: number;
  
  /** 世代編號 */
  generation: number;
  
  /** 父代 ID */
  parentIds?: string[];
  
  /** 唯一 ID */
  id: string;
}

/**
 * 種群
 */
interface Population {
  chromosomes: Chromosome[];
  generation: number;
  bestFitness: number;
  avgFitness: number;
}

/**
 * GA 配置
 */
interface GAConfig {
  /** 種群大小 */
  populationSize: number;
  
  /** 染色體長度（基因數量） */
  chromosomeLength: number;
  
  /** 基因類型 */
  geneType: 'binary' | 'real' | 'permutation';
  
  /** 交叉機率 */
  crossoverRate: number;
  
  /** 突變機率 */
  mutationRate: number;
  
  /** 精英保留數量 */
  elitismCount: number;
  
  /** 最大世代數 */
  maxGenerations: number;
  
  /** 適應度閾值（達到即停止） */
  fitnessThreshold?: number;
  
  /** 選擇方法 */
  selectionMethod: 'roulette' | 'tournament' | 'rank';
  
  /** 錦標賽大小（用於 tournament selection） */
  tournamentSize?: number;
  
  /** 隨機種子 */
  seed?: number;
}

/**
 * 優化問題定義
 */
interface OptimizationProblem {
  /** 問題 ID */
  id: string;
  
  /** 問題名稱 */
  name: string;
  
  /** 問題描述 */
  description: string;
  
  /** 適應度函數 */
  fitnessFunction: (genes: number[]) => number;
  
  /** 基因範圍（用於 real 類型） */
  geneRange?: { min: number; max: number };
  
  /** 約束條件 */
  constraints?: Array<(genes: number[]) => boolean>;
  
  /** 初始化函數（可選） */
  initialize?: () => number[];
}

/**
 * GA 運行狀態
 */
interface GAState {
  problemId: string;
  config: GAConfig;
  population: Population;
  bestChromosome: Chromosome | null;
  history: {
    generation: number;
    bestFitness: number;
    avgFitness: number;
  }[];
  isRunning: boolean;
  startTime: number;
  endTime?: number;
}

// ============================================================================
// 隨機數生成器（可重複）
// ============================================================================

class SeededRandom {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  /** 生成 0-1 之間的隨機數 */
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  /** 生成範圍內的隨機整數 */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  /** 生成範圍內的隨機實數 */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
  
  /** 從數組中隨機選擇 */
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
  
  /** 洗牌算法 */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ============================================================================
// 遺傳演算法核心引擎
// ============================================================================

class GeneticAlgorithm {
  private config: GAConfig;
  private rng: SeededRandom;
  private problem: OptimizationProblem;
  private state: GAState | null = null;
  
  constructor(problem: OptimizationProblem, config: Partial<GAConfig> = {}) {
    this.problem = problem;
    this.config = this.mergeConfig(config);
    this.rng = new SeededRandom(this.config.seed);
  }
  
  /**
   * 合併配置
   */
  private mergeConfig(custom: Partial<GAConfig>): GAConfig {
    return {
      populationSize: custom.populationSize || 100,
      chromosomeLength: custom.chromosomeLength || 10,
      geneType: custom.geneType || 'binary',
      crossoverRate: custom.crossoverRate || 0.8,
      mutationRate: custom.mutationRate || 0.01,
      elitismCount: custom.elitismCount || 2,
      maxGenerations: custom.maxGenerations || 1000,
      fitnessThreshold: custom.fitnessThreshold,
      selectionMethod: custom.selectionMethod || 'tournament',
      tournamentSize: custom.tournamentSize || 5,
      seed: custom.seed || Date.now()
    };
  }
  
  /**
   * 初始化種群
   */
  private initializePopulation(): Population {
    const chromosomes: Chromosome[] = [];
    
    for (let i = 0; i < this.config.populationSize; i++) {
      const genes = this.initializeGenes();
      const fitness = this.evaluateFitness(genes);
      
      chromosomes.push({
        genes,
        fitness,
        generation: 0,
        id: `gen0-ind${i}`
      });
    }
    
    return {
      chromosomes,
      generation: 0,
      bestFitness: Math.max(...chromosomes.map(c => c.fitness)),
      avgFitness: this.averageFitness(chromosomes)
    };
  }
  
  /**
   * 初始化基因
   */
  private initializeGenes(): number[] {
    if (this.problem.initialize) {
      return this.problem.initialize();
    }
    
    const genes: number[] = [];
    
    switch (this.config.geneType) {
      case 'binary':
        for (let i = 0; i < this.config.chromosomeLength; i++) {
          genes.push(this.rng.nextInt(0, 1));
        }
        break;
        
      case 'real':
        const { min = 0, max = 1 } = this.problem.geneRange || {};
        for (let i = 0; i < this.config.chromosomeLength; i++) {
          genes.push(this.rng.nextFloat(min, max));
        }
        break;
        
      case 'permutation':
        for (let i = 0; i < this.config.chromosomeLength; i++) {
          genes.push(i);
        }
        this.rng.shuffle(genes);
        break;
    }
    
    return genes;
  }
  
  /**
   * 評估適應度
   */
  private evaluateFitness(genes: number[]): number {
    // 檢查約束
    if (this.problem.constraints) {
      for (const constraint of this.problem.constraints) {
        if (!constraint(genes)) {
          return 0; // 不滿足約束，適應度為 0
        }
      }
    }
    
    return this.problem.fitnessFunction(genes);
  }
  
  /**
   * 選擇（錦標賽選擇）
   */
  private select(population: Chromosome[]): Chromosome {
    if (this.config.selectionMethod === 'roulette') {
      return this.rouletteSelection(population);
    }
    
    if (this.config.selectionMethod === 'rank') {
      return this.rankSelection(population);
    }
    
    // 默認：錦標賽選擇
    return this.tournamentSelection(population);
  }
  
  /**
   * 錦標賽選擇
   */
  private tournamentSelection(population: Chromosome[]): Chromosome {
    let best: Chromosome | null = null;
    
    for (let i = 0; i < (this.config.tournamentSize || 5); i++) {
      const idx = this.rng.nextInt(0, population.length - 1);
      const candidate = population[idx];
      
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    
    return best!;
  }
  
  /**
   * 輪盤賭選擇
   */
  private rouletteSelection(population: Chromosome[]): Chromosome {
    const totalFitness = population.reduce((sum, c) => sum + c.fitness, 0);
    let spin = this.rng.nextFloat(0, totalFitness);
    
    for (const chromosome of population) {
      spin -= chromosome.fitness;
      if (spin <= 0) {
        return chromosome;
      }
    }
    
    return population[population.length - 1];
  }
  
  /**
   * 排名選擇
   */
  private rankSelection(population: Chromosome[]): Chromosome {
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    const rank = this.rng.nextInt(1, population.length);
    // 排名越高，被選中的機率越大
    const probability = (2 * rank) / (population.length * (population.length + 1));
    
    if (this.rng.next() < probability) {
      return sorted[rank - 1];
    }
    
    return this.tournamentSelection(population);
  }
  
  /**
   * 交叉（單點交叉）
   */
  private crossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
    if (this.rng.next() > this.config.crossoverRate) {
      return [parent1, parent2];
    }
    
    const point = this.rng.nextInt(1, this.config.chromosomeLength - 1);
    
    const genes1 = [...parent1.genes.slice(0, point), ...parent2.genes.slice(point)];
    const genes2 = [...parent2.genes.slice(0, point), ...parent1.genes.slice(point)];
    
    return [
      {
        genes: genes1,
        fitness: 0,
        generation: parent1.generation + 1,
        id: `gen${parent1.generation + 1}-ind${this.rng.nextInt(0, 999)}`,
        parentIds: [parent1.id, parent2.id]
      },
      {
        genes: genes2,
        fitness: 0,
        generation: parent2.generation + 1,
        id: `gen${parent2.generation + 1}-ind${this.rng.nextInt(0, 999)}`,
        parentIds: [parent1.id, parent2.id]
      }
    ];
  }
  
  /**
   * 突變
   */
  private mutate(chromosome: Chromosome): Chromosome {
    const genes = [...chromosome.genes];
    
    for (let i = 0; i < genes.length; i++) {
      if (this.rng.next() < this.config.mutationRate) {
        switch (this.config.geneType) {
          case 'binary':
            genes[i] = genes[i] === 0 ? 1 : 0;
            break;
            
          case 'real':
            const { min = 0, max = 1 } = this.problem.geneRange || {};
            genes[i] = this.rng.nextFloat(min, max);
            break;
            
          case 'permutation':
            const j = this.rng.nextInt(0, genes.length - 1);
            [genes[i], genes[j]] = [genes[j], genes[i]];
            break;
        }
      }
    }
    
    return {
      ...chromosome,
      genes
    };
  }
  
  /**
   * 計算平均適應度
   */
  private averageFitness(population: Chromosome[]): number {
    return population.reduce((sum, c) => sum + c.fitness, 0) / population.length;
  }
  
  /**
   * 演化一代
   */
  private evolve(population: Population): Population {
    const newChromosomes: Chromosome[] = [];
    
    // 精英保留
    const sorted = [...population.chromosomes].sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < this.config.elitismCount; i++) {
      newChromosomes.push({ ...sorted[i] });
    }
    
    // 產生新個體
    while (newChromosomes.length < this.config.populationSize) {
      // 選擇
      const parent1 = this.select(population.chromosomes);
      const parent2 = this.select(population.chromosomes);
      
      // 交叉
      let [child1, child2] = this.crossover(parent1, parent2);
      
      // 突變
      child1 = this.mutate(child1);
      child2 = this.mutate(child2);
      
      // 評估
      child1.fitness = this.evaluateFitness(child1.genes);
      child2.fitness = this.evaluateFitness(child2.genes);
      
      newChromosomes.push(child1);
      if (newChromosomes.length < this.config.populationSize) {
        newChromosomes.push(child2);
      }
    }
    
    const bestFitness = Math.max(...newChromosomes.map(c => c.fitness));
    
    return {
      chromosomes: newChromosomes,
      generation: population.generation + 1,
      bestFitness,
      avgFitness: this.averageFitness(newChromosomes)
    };
  }
  
  /**
   * 運行 GA
   */
  async run(onProgress?: (state: GAState) => void): Promise<GAState> {
    this.state = {
      problemId: this.problem.id,
      config: this.config,
      population: this.initializePopulation(),
      bestChromosome: null,
      history: [],
      isRunning: true,
      startTime: Date.now()
    };
    
    while (
      this.state.population.generation < this.config.maxGenerations &&
      (!this.config.fitnessThreshold || 
       this.state.population.bestFitness < this.config.fitnessThreshold)
    ) {
      // 演化
      this.state.population = this.evolve(this.state.population);
      
      // 更新最佳染色體
      const best = this.state.population.chromosomes.reduce(
        (best, c) => c.fitness > best.fitness ? c : best
      );
      
      if (!this.state.bestChromosome || best.fitness > this.state.bestChromosome.fitness) {
        this.state.bestChromosome = { ...best };
      }
      
      // 記錄歷史
      this.state.history.push({
        generation: this.state.population.generation,
        bestFitness: this.state.population.bestFitness,
        avgFitness: this.state.population.avgFitness
      });
      
      // 進度回調
      if (onProgress) {
        onProgress(this.state);
      }
      
      // 避免阻塞，讓出事件循環
      if (this.state.population.generation % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    this.state.isRunning = false;
    this.state.endTime = Date.now();
    
    return this.state;
  }
  
  /**
   * 獲取當前狀態
   */
  getState(): GAState | null {
    return this.state;
  }
  
  /**
   * 重置
   */
  reset(): void {
    this.state = null;
    this.rng = new SeededRandom(this.config.seed);
  }
}

// ============================================================================
// 內建優化問題
// ============================================================================

const BUILTIN_PROBLEMS: Record<string, OptimizationProblem> = {
  // 1. 最大化 1 的數量（簡單測試）
  'max-ones': {
    id: 'max-ones',
    name: 'Maximize Ones',
    description: '簡單測試：最大化二進制串中 1 的數量',
    fitnessFunction: (genes) => genes.reduce((sum, g) => sum + g, 0)
  },
  
  // 2. 背包問題
  'knapsack': {
    id: 'knapsack',
    name: 'Knapsack Problem',
    description: '0/1 背包問題：在容量限制下最大化總價值',
    fitnessFunction: (genes) => {
      // 預設物品（重量，價值）
      const items = [
        { w: 10, v: 60 }, { w: 20, v: 100 }, { w: 30, v: 120 },
        { w: 15, v: 80 }, { w: 25, v: 110 }, { w: 35, v: 140 }
      ];
      const capacity = 100;
      
      let totalWeight = 0;
      let totalValue = 0;
      
      for (let i = 0; i < genes.length && i < items.length; i++) {
        if (genes[i] === 1) {
          totalWeight += items[i].w;
          totalValue += items[i].v;
        }
      }
      
      // 超過容量，適應度為 0
      if (totalWeight > capacity) return 0;
      return totalValue;
    },
    constraints: [(genes) => {
      const items = [
        { w: 10 }, { w: 20 }, { w: 30 }, { w: 15 }, { w: 25 }, { w: 35 }
      ];
      let totalWeight = 0;
      for (let i = 0; i < genes.length && i < items.length; i++) {
        if (genes[i] === 1) totalWeight += items[i].w;
      }
      return totalWeight <= 100;
    }]
  },
  
  // 3. 旅行商問題 (TSP)
  'tsp': {
    id: 'tsp',
    name: 'Traveling Salesman Problem',
    description: 'TSP：找到訪問所有城市的最短路徑',
    fitnessFunction: (genes) => {
      // 預設城市坐標
      const cities = [
        { x: 0, y: 0 }, { x: 1, y: 2 }, { x: 3, y: 1 },
        { x: 5, y: 3 }, { x: 2, y: 5 }, { x: 4, y: 4 }
      ];
      
      let totalDistance = 0;
      for (let i = 0; i < genes.length - 1; i++) {
        const c1 = cities[genes[i]];
        const c2 = cities[genes[i + 1]];
        totalDistance += Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);
      }
      // 回到起點
      const first = cities[genes[0]];
      const last = cities[genes[genes.length - 1]];
      totalDistance += Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
      
      // 適應度 = 1/距離（距離越短，適應度越高）
      return 1 / (totalDistance + 1);
    },
    geneType: 'permutation' as const
  },
  
  // 4. 函數最大化
  'function-max': {
    id: 'function-max',
    name: 'Function Maximization',
    description: '最大化數學函數：f(x) = x * sin(10πx) + 1',
    fitnessFunction: (genes) => {
      // 將基因解碼為 x 值
      const x = genes[0];
      return x * Math.sin(10 * Math.PI * x) + 1;
    },
    geneRange: { min: 0, max: 1 },
    geneType: 'real' as const
  },
  
  // 5. 排程問題
  'scheduling': {
    id: 'scheduling',
    name: 'Job Scheduling',
    description: '工作排程：最小化總完成時間',
    fitnessFunction: (genes) => {
      // 預設工作處理時間
      const processingTimes = [5, 3, 8, 2, 6, 4];
      
      // genes 表示工作執行順序
      let currentTime = 0;
      let totalCompletionTime = 0;
      
      for (const jobIdx of genes) {
        currentTime += processingTimes[jobIdx];
        totalCompletionTime += currentTime;
      }
      
      // 適應度 = 1/總完成時間（越短越好）
      return 1 / (totalCompletionTime + 1);
    },
    geneType: 'permutation' as const
  }
};

// ============================================================================
// Legion 模組
// ============================================================================

const gaModule: LegionModule = {
  id: 'genetic-algorithm',
  name: 'Genetic Algorithm Optimizer',
  description: '遺傳演算法優化引擎 - 選擇、交配、突變演化最優解',
  trigger: 'ga:',
  
  handler: async (ctx: KernelContext) => {
    const command = ctx.output.replace('ga:', '').trim();
    
    // 列出內建問題
    if (command === 'problems' || command === 'list') {
      return {
        action: 'list',
        problems: Object.values(BUILTIN_PROBLEMS).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description
        }))
      };
    }
    
    // 運行優化
    if (command.startsWith('run ')) {
      const parts = command.slice(4).split(' ');
      const problemId = parts[0];
      
      const problem = BUILTIN_PROBLEMS[problemId];
      if (!problem) {
        return { error: `Unknown problem: ${problemId}`, available: Object.keys(BUILTIN_PROBLEMS) };
      }
      
      // 解析配置
      const config: Partial<GAConfig> = {};
      for (const part of parts.slice(1)) {
        const [key, value] = part.split('=');
        if (key === 'pop') config.populationSize = parseInt(value);
        if (key === 'gen') config.maxGenerations = parseInt(value);
        if (key === 'mut') config.mutationRate = parseFloat(value);
        if (key === 'cross') config.crossoverRate = parseFloat(value);
      }
      
      // 創建並運行 GA
      const ga = new GeneticAlgorithm(problem, {
        ...config,
        chromosomeLength: problem.geneType === 'permutation' ? 6 : 10,
        geneType: problem.geneType || 'binary'
      });
      
      const result = await ga.run();
      
      return {
        action: 'run',
        problem: problem.name,
        completed: true,
        generations: result.population.generation,
        bestFitness: result.bestChromosome?.fitness,
        bestGenes: result.bestChromosome?.genes,
        runtime: result.endTime! - result.startTime,
        history: result.history.slice(-10) // 最後 10 代
      };
    }
    
    // 演示模式
    if (command === 'demo') {
      const problem = BUILTIN_PROBLEMS['max-ones'];
      const ga = new GeneticAlgorithm(problem, {
        populationSize: 50,
        maxGenerations: 100,
        chromosomeLength: 20
      });
      
      const result = await ga.run();
      
      return {
        action: 'demo',
        problem: 'Maximize Ones',
        bestFitness: result.bestChromosome?.fitness,
        bestGenes: result.bestChromosome?.genes.join(''),
        generations: result.population.generation
      };
    }
    
    // 說明
    return {
      action: 'help',
      usage: 'ga:problems|ga:run <problem> [options]|ga:demo',
      examples: [
        'ga:problems - List built-in problems',
        'ga:run max-ones pop=100 gen=200 - Run optimization',
        'ga:run knapsack mut=0.05 - Run with custom mutation rate',
        'ga:demo - Quick demonstration'
      ],
      problems: Object.keys(BUILTIN_PROBLEMS)
    };
  },
  
  metadata: {
    version: '1.0.0',
    author: 'Legion Kernel',
    tags: ['optimization', 'genetic-algorithm', 'evolution', 'ai'],
    aliases: ['ga', 'evolution', 'optimizer']
  }
};

// ============================================================================
// 導出
// ============================================================================

export default gaModule;
export { GeneticAlgorithm, SeededRandom, BUILTIN_PROBLEMS };
export type { Chromosome, Population, GAConfig, OptimizationProblem, GAState };
