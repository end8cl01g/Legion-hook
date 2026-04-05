/**
 * Neuroevolution Module
 * 
 * 神經演化 - 將遺傳演算法應用於神經網路結構與權重的自動設計
 * 實現 NEAT (NeuroEvolution of Augmenting Topologies) 核心概念
 */

import type { LegionModule, KernelContext } from '../types';

// ============================================================================
// 神經網路基本結構
// ============================================================================

/**
 * 神經元
 */
interface Neuron {
  id: number;
  type: 'input' | 'hidden' | 'output';
  activation: 'relu' | 'sigmoid' | 'tanh' | 'linear';
}

/**
 * 連接
 */
interface Connection {
  id: number;
  from: number;
  to: number;
  weight: number;
  enabled: boolean;
  innovation?: number;  // NEAT 創新編號
}

/**
 * 神經網路個體
 */
interface NeuralNetwork {
  id: string;
  genes: Genome;
  fitness: number;
  inputs: number;
  outputs: number;
}

/**
 * 基因組
 */
interface Genome {
  neurons: Neuron[];
  connections: Connection[];
  innovationNumber: number;
}

/**
 * 神經網路配置
 */
interface NetworkConfig {
  /** 輸入節點數 */
  inputNodes: number;
  
  /** 輸出節點數 */
  outputNodes: number;
  
  /** 隱藏層節點數（可為 null 表示動態） */
  hiddenNodes?: number | null;
  
  /** 激活函數 */
  activation?: 'relu' | 'sigmoid' | 'tanh' | 'linear';
}

/**
 * 神經演化配置
 */
interface NeuroConfig {
  /** 種群大小 */
  populationSize: number;
  
  /** 最大世代數 */
  maxGenerations: number;
  
  /** 適應度閾值 */
  fitnessThreshold?: number;
  
  /** 交叉機率 */
  crossoverRate: number;
  
  /** 突變機率 */
  mutationRate: number;
  
  /** 結構突變機率 */
  structureMutationRate: number;
  
  /** 權重突變機率 */
  weightMutationRate: number;
  
  /** 權重突變幅度 */
  weightMutationMagnitude: number;
  
  /** 適應度平滑係數 */
  fitnessSmoothing: number;
  
  /**  elitism 數量 */
  elitismCount: number;
  
  /** 隨機種子 */
  seed?: number;
}

/**
 * 神經網路狀態
 */
interface NetworkState {
  /** 當前世代 */
  generation: number;
  
  /** 當前種群 */
  population: NeuralNetwork[];
  
  /** 最佳網路 */
  bestNetwork: NeuralNetwork | null;
  
  /** 最佳適應度 */
  bestFitness: number;
  
  /** 平均適應度 */
  avgFitness: number;
  
  /** 演化歷史 */
  history: {
    generation: number;
    bestFitness: number;
    avgFitness: number;
    networkComplexity: number;
  }[];
  
  /** 運行狀態 */
  isRunning: boolean;
  
  /** 開始時間 */
  startTime: number;
  
  /** 結束時間 */
  endTime?: number;
}

// ============================================================================
// 隨機數生成器
// ============================================================================

class SeededRandom {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  gaussian(mean: number = 0, std: number = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
}

// ============================================================================
// 神經網路實現
// ============================================================================

class SimpleNeuralNetwork {
  private neurons: Neuron[];
  private connections: Connection[];
  private inputValues: number[];
  private outputValues: number[];
  
  constructor(genome: Genome, inputs: number, outputs: number) {
    this.neurons = [...genome.neurons];
    this.connections = genome.connections.filter(c => c.enabled);
    this.inputValues = new Array(inputs).fill(0);
    this.outputValues = new Array(outputs).fill(0);
  }
  
  /**
   * 設置輸入值
   */
  setInput(values: number[]): void {
    this.inputValues = [...values];
  }
  
  /**
   * 前向傳播
   */
  forward(): number[] {
    // 重置輸出
    this.outputValues.fill(0);
    
    // 計算隱藏層
    for (const neuron of this.neurons) {
      if (neuron.type === 'input') continue;
      
      let sum = 0;
      for (const conn of this.connections) {
        if (conn.to === neuron.id && conn.enabled) {
          const fromNeuron = this.neurons.find(n => n.id === conn.from);
          if (fromNeuron) {
            const inputVal = fromNeuron.type === 'input' 
              ? this.inputValues[fromNeuron.id] 
              : this.getNeuronOutput(fromNeuron.id);
            sum += conn.weight * inputVal;
          }
        }
      }
      
      // 應用激活函數
      neuron.output = this.activate(sum, neuron.activation);
    }
    
    // 獲取輸出
    const outputs: number[] = [];
    for (const neuron of this.neurons) {
      if (neuron.type === 'output') {
        outputs.push(neuron.output || 0);
      }
    }
    
    return outputs;
  }
  
  private getNeuronOutput(id: number): number {
    const neuron = this.neurons.find(n => n.id === id);
    return neuron?.output || 0;
  }
  
  private activate(value: number, activation: string): number {
    switch (activation) {
      case 'sigmoid':
        return 1 / (1 + Math.exp(-value));
      case 'tanh':
        return Math.tanh(value);
      case 'relu':
        return Math.max(0, value);
      case 'linear':
      default:
        return value;
    }
  }
  
  /**
   * 獲取網路複雜度（節點數 + 連接數）
   */
  getComplexity(): number {
    return this.neurons.length + this.connections.length;
  }
  
  /**
   * 複製網路
   */
  clone(): SimpleNeuralNetwork {
    const clone = new SimpleNeuralNetwork(
      { neurons: [...this.neurons], connections: [...this.connections], innovationNumber: 0 },
      0,
      0
    );
    clone.inputValues = [...this.inputValues];
    clone.outputValues = [...this.outputValues];
    return clone;
  }
}

// ============================================================================
// 基因組操作（NEAT 核心）
// ============================================================================

class GenomeOperator {
  private rng: SeededRandom;
  
  constructor(seed?: number) {
    this.rng = new SeededRandom(seed);
  }
  
  /**
   * 創建初始基因組
   */
  createInitial(config: NetworkConfig): Genome {
    const neurons: Neuron[] = [];
    const connections: Connection[] = [];
    let innovationNum = 0;
    
    // 創建輸入節點
    for (let i = 0; i < config.inputNodes; i++) {
      neurons.push({
        id: i,
        type: 'input',
        activation: 'linear'
      });
    }
    
    // 創建隱藏節點（如果有指定）
    let hiddenStart = config.inputNodes;
    if (config.hiddenNodes && config.hiddenNodes > 0) {
      for (let i = 0; i < config.hiddenNodes; i++) {
        neurons.push({
          id: hiddenStart + i,
          type: 'hidden',
          activation: config.activation || 'relu'
        });
      }
      hiddenStart += config.hiddenNodes;
    }
    
    // 創建輸出節點
    const outputStart = hiddenStart;
    for (let i = 0; i < config.outputNodes; i++) {
      neurons.push({
        id: outputStart + i,
        type: 'output',
        activation: config.activation || 'linear'
      });
    }
    
    // 創建初始連接（輸入→輸出或輸入→隱藏→輸出）
    const inputNodes = neurons.filter(n => n.type === 'input');
    const outputNodes = neurons.filter(n => n.type === 'output');
    const hiddenNodes = neurons.filter(n => n.type === 'hidden');
    
    // 全連接輸入到輸出
    for (const input of inputNodes) {
      for (const output of outputNodes) {
        connections.push({
          id: innovationNum++,
          from: input.id,
          to: output.id,
          weight: this.rng.gaussian(0, 1),
          enabled: true
        });
      }
    }
    
    // 如果有多層，創建隱藏層連接
    if (hiddenNodes.length > 0) {
      for (const hidden of hiddenNodes) {
        for (const input of inputNodes) {
          connections.push({
            id: innovationNum++,
            from: input.id,
            to: hidden.id,
            weight: this.rng.gaussian(0, 1),
            enabled: true
          });
        }
      }
      
      for (const hidden of hiddenNodes) {
        for (const output of outputNodes) {
          connections.push({
            id: innovationNum++,
            from: hidden.id,
            to: output.id,
            weight: this.rng.gaussian(0, 1),
            enabled: true
          });
        }
      }
    }
    
    return {
      neurons,
      connections,
      innovationNumber: innovationNum
    };
  }
  
  /**
   * 結構突變：添加連接
   */
  mutateAddConnection(genome: Genome): Genome {
    const newGenome = { ...genome, connections: [...genome.connections] };
    
    // 找到所有可能的連接
    const possibleConnections: { from: number; to: number }[] = [];
    
    for (const n1 of newGenome.neurons) {
      for (const n2 of newGenome.neurons) {
        if (n1.id !== n2.id) {
          // 檢查是否已存在連接
          const exists = newGenome.connections.some(
            c => c.from === n1.id && c.to === n2.id && c.enabled
          );
          if (!exists) {
            possibleConnections.push({ from: n1.id, to: n2.id });
          }
        }
      }
    }
    
    if (possibleConnections.length === 0) {
      return newGenome;
    }
    
    // 隨機選擇並添加連接
    const { from, to } = this.rng.choice(possibleConnections);
    newGenome.connections.push({
      id: newGenome.innovationNumber++,
      from,
      to,
      weight: this.rng.gaussian(0, 1),
      enabled: true,
      innovation: newGenome.innovationNumber - 1
    });
    
    return newGenome;
  }
  
  /**
   * 結構突變：添加節點
   */
  mutateAddNode(genome: Genome): Genome {
    if (genome.connections.length === 0) {
      return genome;
    }
    
    const newGenome = { ...genome, neurons: [...genome.neurons] };
    
    // 隨機選擇一個連接
    const connection = this.rng.choice(genome.connections);
    if (!connection.enabled) {
      return genome;
    }
    
    // 創建新節點
    const newNodeId = newGenome.neurons.length;
    const newNeuron: Neuron = {
      id: newNodeId,
      type: 'hidden',
      activation: genome.neurons.find(n => n.id === connection.to)?.activation || 'relu'
    };
    newGenome.neurons.push(newNeuron);
    
    // 斷開原連接
    const newConnections = genome.connections.map(c => {
      if (c.id === connection.id && c.enabled) {
        return { ...c, enabled: false };
      }
      return c;
    });
    
    // 創建兩個新連接
    newConnections.push({
      id: newGenome.innovationNumber++,
      from: connection.from,
      to: newNodeId,
      weight: 1.0,
      enabled: true,
      innovation: newGenome.innovationNumber - 1
    });
    
    newConnections.push({
      id: newGenome.innovationNumber++,
      from: newNodeId,
      to: connection.to,
      weight: connection.weight,
      enabled: true,
      innovation: newGenome.innovationNumber - 1
    });
    
    newGenome.connections = newConnections;
    
    return newGenome;
  }
  
  /**
   * 權重突變
   */
  mutateWeights(genome: Genome, magnitude: number): Genome {
    const newGenome = { 
      ...genome, 
      connections: genome.connections.map(c => {
        if (!c.enabled) return c;
        return {
          ...c,
          weight: c.weight + this.rng.gaussian(0, magnitude)
        };
      })
    };
    
    return newGenome;
  }
  
  /**
   * 交叉（NEAT 交叉）
   */
  crossover(genome1: Genome, genome2: Genome): Genome {
    // 簡化版交叉：從較好的基因組複製
    const bestGenome = genome1.innovationNumber > genome2.innovationNumber ? genome1 : genome2;
    
    return {
      neurons: [...bestGenome.neurons],
      connections: [...bestGenome.connections],
      innovationNumber: Math.max(genome1.innovationNumber, genome2.innovationNumber)
    };
  }
}

// ============================================================================
// 神經演化引擎
// ============================================================================

class Neuroevolution {
  private config: NeuroConfig;
  private rng: SeededRandom;
  private genomeOp: GenomeOperator;
  private state: NetworkState | null = null;
  
  constructor(problem: AdaptationProblem, config: Partial<NeuroConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.rng = new SeededRandom(this.config.seed);
    this.genomeOp = new GenomeOperator(this.config.seed);
    this.problem = problem;
  }
  
  private mergeConfig(custom: Partial<NeuroConfig>): NeuroConfig {
    return {
      populationSize: custom.populationSize || 50,
      maxGenerations: custom.maxGenerations || 200,
      fitnessThreshold: custom.fitnessThreshold,
      crossoverRate: custom.crossoverRate || 0.7,
      mutationRate: custom.mutationRate || 0.1,
      structureMutationRate: custom.structureMutationRate || 0.05,
      weightMutationRate: custom.weightMutationRate || 0.3,
      weightMutationMagnitude: custom.weightMutationMagnitude || 0.1,
      fitnessSmoothing: custom.fitnessSmoothing || 0.1,
      elitismCount: custom.elitismCount || 2,
      seed: custom.seed || Date.now()
    };
  }
  
  /**
   * 初始化種群
   */
  private initializePopulation(): NeuralNetwork[] {
    const population: NeuralNetwork[] = [];
    
    for (let i = 0; i < this.config.populationSize; i++) {
      const genome = this.genomeOp.createInitial(this.problem.config);
      const network = new SimpleNeuralNetwork(genome, this.problem.config.inputNodes, this.problem.config.outputNodes);
      
      population.push({
        id: `net-${i}`,
        genes: genome,
        fitness: 0,
        inputs: this.problem.config.inputNodes,
        outputs: this.problem.config.outputNodes
      });
    }
    
    return population;
  }
  
  /**
   * 評估適應度
   */
  private evaluateFitness(network: NeuralNetwork): number {
    const networkInstance = new SimpleNeuralNetwork(network.genes, network.inputs, network.outputs);
    
    // 根據問題類型計算適應度
    return this.problem.fitnessFunction(networkInstance);
  }
  
  /**
   * 選擇
   */
  private select(population: NeuralNetwork[]): NeuralNetwork {
    // 輪盤賭選擇
    const totalFitness = population.reduce((sum, n) => sum + n.fitness, 0);
    let spin = this.rng.nextFloat(0, totalFitness);
    
    for (const network of population) {
      spin -= network.fitness;
      if (spin <= 0) {
        return network;
      }
    }
    
    return population[population.length - 1];
  }
  
  /**
   * 演化一代
   */
  private evolve(population: NeuralNetwork[]): NeuralNetwork[] {
    const newPopulation: NeuralNetwork[] = [];
    
    // 精英保留
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < this.config.elitismCount; i++) {
      newPopulation.push({ ...sorted[i] });
    }
    
    // 產生新個體
    while (newPopulation.length < this.config.populationSize) {
      // 選擇父母
      const parent1 = this.select(population);
      const parent2 = this.select(population);
      
      // 交叉
      let childGenome = this.genomeOp.crossover(parent1.genes, parent2.genes);
      
      // 結構突變
      if (this.rng.next() < this.config.structureMutationRate) {
        if (this.rng.next() < 0.5) {
          childGenome = this.genomeOp.mutateAddConnection(childGenome);
        } else {
          childGenome = this.genomeOp.mutateAddNode(childGenome);
        }
      }
      
      // 權重突變
      if (this.rng.next() < this.config.weightMutationRate) {
        childGenome = this.genomeOp.mutateWeights(
          childGenome,
          this.config.weightMutationMagnitude
        );
      }
      
      // 創建子代
      const childNetwork = new SimpleNeuralNetwork(childGenome, this.problem.config.inputNodes, this.problem.config.outputNodes);
      childNetwork.fitness = 0;
      
      newPopulation.push({
        id: `net-${this.rng.nextInt(0, 99999)}`,
        genes: childGenome,
        fitness: 0,
        inputs: this.problem.config.inputNodes,
        outputs: this.problem.config.outputNodes
      });
    }
    
    // 評估適應度
    for (const network of newPopulation) {
      network.fitness = this.evaluateFitness(network);
    }
    
    return newPopulation;
  }
  
  /**
   * 運行演化
   */
  async run(onProgress?: (state: NetworkState) => void): Promise<NetworkState> {
    let population = this.initializePopulation();
    
    // 評估初始適應度
    for (const network of population) {
      network.fitness = this.evaluateFitness(network);
    }
    
    let bestNetwork = population.reduce((best, n) => n.fitness > best.fitness ? n : best);
    let bestFitness = bestNetwork.fitness;
    
    this.state = {
      generation: 0,
      population,
      bestNetwork,
      bestFitness,
      avgFitness: population.reduce((sum, n) => sum + n.fitness, 0) / population.length,
      history: [],
      isRunning: true,
      startTime: Date.now()
    };
    
    while (this.state.generation < this.config.maxGenerations &&
           (!this.config.fitnessThreshold || bestFitness < this.config.fitnessThreshold)) {
      
      // 演化
      population = this.evolve(population);
      
      // 更新最佳
      const newBest = population.reduce((best, n) => n.fitness > best.fitness ? n : best);
      if (newBest.fitness > bestFitness) {
        bestNetwork = newBest;
        bestFitness = newBest.fitness;
      }
      
      // 更新狀態
      this.state.population = population;
      this.state.bestNetwork = bestNetwork;
      this.state.bestFitness = bestFitness;
      this.state.avgFitness = population.reduce((sum, n) => sum + n.fitness, 0) / population.length;
      this.state.generation++;
      
      // 記錄歷史
      this.state.history.push({
        generation: this.state.generation,
        bestFitness,
        avgFitness: this.state.avgFitness,
        networkComplexity: bestNetwork.genes.neurons.length + bestNetwork.genes.connections.length
      });
      
      // 進度回調
      if (onProgress) {
        onProgress(this.state);
      }
      
      // 避免阻塞
      if (this.state.generation % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    this.state.isRunning = false;
    this.state.endTime = Date.now();
    
    return this.state;
  }
  
  getState(): NetworkState | null {
    return this.state;
  }
}

// ============================================================================
// 內建問題
// ============================================================================

interface AdaptationProblem {
  id: string;
  name: string;
  description: string;
  config: NetworkConfig;
  fitnessFunction: (network: SimpleNeuralNetwork) => number;
}

const BUILTIN_PROBLEMS: Record<string, AdaptationProblem> = {
  // 1. XOR 問題
  'xor': {
    id: 'xor',
    name: 'XOR Gate',
    description: 'XOR 邏輯閘 - 神經網路基本測試',
    config: { inputNodes: 2, outputNodes: 1 },
    fitnessFunction: (network) => {
      const inputs = [
        [0, 0], [0, 1], [1, 0], [1, 1]
      ];
      const expected = [0, 1, 1, 0];
      
      let correct = 0;
      for (let i = 0; i < inputs.length; i++) {
        network.setInput(inputs[i]);
        const output = network.forward()[0];
        const predicted = output > 0.5 ? 1 : 0;
        if (predicted === expected[i]) correct++;
      }
      
      return correct; // 最高 4 分
    }
  },
  
  // 2. 函數逼近
  'function-approximation': {
    id: 'function-approximation',
    name: 'Function Approximation',
    description: '逼近函數 f(x) = sin(2πx)',
    config: { inputNodes: 1, outputNodes: 1 },
    fitnessFunction: (network) => {
      let error = 0;
      for (let i = 0; i <= 1; i += 0.1) {
        network.setInput([i]);
        const output = network.forward()[0];
        const expected = Math.sin(2 * Math.PI * i);
        error += Math.abs(output - expected);
      }
      return 1 / (error + 0.1);
    }
  },
  
  // 3. 分類問題
  'classification': {
    id: 'classification',
    name: 'Classification',
    description: '二分類問題',
    config: { inputNodes: 2, outputNodes: 1 },
    fitnessFunction: (network) => {
      const inputs = [
        [0.1, 0.1], [0.2, 0.2], [0.1, 0.9], [0.9, 0.1],
        [0.9, 0.9], [0.8, 0.2], [0.2, 0.8], [0.7, 0.7]
      ];
      const labels = [0, 0, 1, 1, 0, 1, 1, 0];
      
      let correct = 0;
      for (let i = 0; i < inputs.length; i++) {
        network.setInput(inputs[i]);
        const output = network.forward()[0];
        const predicted = output > 0.5 ? 1 : 0;
        if (predicted === labels[i]) correct++;
      }
      
      return correct / inputs.length;
    }
  }
};

// ============================================================================
// Legion 模組
// ============================================================================

const neuroevolutionModule: LegionModule = {
  id: 'neuroevolution',
  name: 'Neuroevolution Engine',
  description: '神經演化 - 自動設計神經網路結構與權重',
  trigger: 'neuro:',
  
  handler: async (ctx: KernelContext) => {
    const command = ctx.output.replace('neuro:', '').trim();
    
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
    
    if (command.startsWith('run ')) {
      const parts = command.slice(4).split(' ');
      const problemId = parts[0];
      const problem = BUILTIN_PROBLEMS[problemId];
      
      if (!problem) {
        return { error: `Unknown problem: ${problemId}`, available: Object.keys(BUILTIN_PROBLEMS) };
      }
      
      const neuro = new Neuroevolution(problem, {
        populationSize: 50,
        maxGenerations: 100,
        seed: Date.now()
      });
      
      const result = await neuro.run();
      
      return {
        action: 'run',
        problem: problem.name,
        completed: true,
        generations: result.generation,
        bestFitness: result.bestFitness,
        bestGenes: result.bestNetwork?.genes,
        complexity: result.bestNetwork?.genes.neurons.length + result.bestNetwork?.genes.connections.length
      };
    }
    
    if (command === 'demo') {
      const neuro = new Neuroevolution(BUILTIN_PROBLEMS['xor'], {
        populationSize: 50,
        maxGenerations: 100
      });
      
      const result = await neuro.run();
      
      return {
        action: 'demo',
        problem: 'XOR Gate',
        bestFitness: result.bestFitness,
        generations: result.generation,
        complexity: result.bestNetwork?.genes.neurons.length + result.bestNetwork?.genes.connections.length
      };
    }
    
    return {
      action: 'help',
      usage: 'neuro:problems|neuro:run <problem>|neuro:demo',
      examples: [
        'neuro:problems - List available problems',
        'neuro:run xor - Solve XOR problem',
        'neuro:run function-approximation - Function approximation',
        'neuro:demo - Quick demonstration'
      ],
      problems: Object.keys(BUILTIN_PROBLEMS)
    };
  },
  
  metadata: {
    version: '1.0.0',
    author: 'Legion Kernel',
    tags: ['neuroevolution', 'neural-network', 'evolution', 'ai'],
    aliases: ['neuro', 'neat', 'evolution']
  }
};

export default neuroevolutionModule;
export { Neuroevolution, SimpleNeuralNetwork, GenomeOperator, BUILTIN_PROBLEMS };
export type { NeuralNetwork, Genome, NetworkState, NeuroConfig, AdaptationProblem };
