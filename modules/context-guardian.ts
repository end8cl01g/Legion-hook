/**
 * Context Window Guardian Module
 * 
 * 監控和管理 token 使用，防止 context window 溢出
 * 提供自動清理、壓縮、摘要策略
 */

import type { LegionModule, KernelContext } from '../types';

// ============================================================================
// Configuration
// ============================================================================

interface ContextGuardianConfig {
  /** 最大 token 數（預設：模型的 context window） */
  maxTokens: number;
  
  /** 警告閾值（% of max） */
  warningThreshold: number;
  
  /** 自動清理閾值（% of max） */
  cleanupThreshold: number;
  
  /** 保留的最新消息數量 */
  keepRecentMessages: number;
  
  /** 是否啟用自動摘要 */
  enableAutoSummarize: boolean;
  
  /** 摘要閾值（% of max） */
  summarizeThreshold: number;
  
  /** 日志路徑 */
  logPath: string;
}

const DEFAULT_CONFIG: ContextGuardianConfig = {
  maxTokens: 262144,  // Qwen3.5-397B default
  warningThreshold: 0.7,    // 70% 警告
  cleanupThreshold: 0.85,   // 85% 自動清理
  summarizeThreshold: 0.8,  // 80% 觸發摘要
  keepRecentMessages: 20,   // 保留最近 20 條消息
  enableAutoSummarize: true,
  logPath: 'context-guardian/'
};

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * 估算字符串的 token 數量
 * 簡化算法：英文 ~4 chars/token, 中文 ~2 chars/token
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  
  // 中文約 2 chars/token，英文約 4 chars/token
  return Math.ceil(chineseChars / 2) + Math.ceil(otherChars / 4);
}

/**
 * 計算對話歷史的 token 總數
 */
function calculateContextTokens(messages: Array<{ role: string; content: string }>): number {
  let total = 0;
  
  // 每條消息的基礎 overhead
  total += messages.length * 4;  // role + formatting
  
  for (const msg of messages) {
    total += estimateTokens(msg.content || '');
  }
  
  return total;
}

// ============================================================================
// Compression Strategies
// ============================================================================

interface CompressionResult {
  originalTokens: number;
  compressedTokens: number;
  saved: number;
  strategy: string;
  messages: Array<{ role: string; content: string }>;
}

/**
 * 策略 1: 移除最早的消息
 */
function pruneOldMessages(
  messages: Array<{ role: string; content: string }>,
  keepCount: number
): CompressionResult {
  const originalTokens = calculateContextTokens(messages);
  
  if (messages.length <= keepCount) {
    return {
      originalTokens,
      compressedTokens: originalTokens,
      saved: 0,
      strategy: 'prune-old-messages (no-op)',
      messages
    };
  }
  
  const pruned = messages.slice(-keepCount);
  const compressedTokens = calculateContextTokens(pruned);
  
  return {
    originalTokens,
    compressedTokens,
    saved: originalTokens - compressedTokens,
    strategy: `prune-old-messages (kept ${keepCount}/${messages.length})`,
    messages: pruned
  };
}

/**
 * 策略 2: 摘要早期對話
 */
function summarizeEarlyMessages(
  messages: Array<{ role: string; content: string }>,
  summaryTarget: number
): CompressionResult {
  const originalTokens = calculateContextTokens(messages);
  
  if (messages.length < 3) {
    return {
      originalTokens,
      compressedTokens: originalTokens,
      saved: 0,
      strategy: 'summarize-early (no-op, too few messages)',
      messages
    };
  }
  
  // 保留最近 5 條，摘要之前的
  const keepRecent = 5;
  const toSummarize = messages.slice(0, -keepRecent);
  const recent = messages.slice(-keepRecent);
  
  // 生成摘要（簡化：只保留關鍵資訊）
  const summary = generateSummary(toSummarize);
  
  const summarizedMessages = [
    { role: 'system', content: `【對話摘要】${summary}` },
    ...recent
  ];
  
  const compressedTokens = calculateContextTokens(summarizedMessages);
  
  return {
    originalTokens,
    compressedTokens,
    saved: originalTokens - compressedTokens,
    strategy: `summarize-early (summarized ${toSummarize.length} messages)`,
    messages: summarizedMessages
  };
}

/**
 * 生成對話摘要
 */
function generateSummary(messages: Array<{ role: string; content: string }>): string {
  const keyPoints: string[] = [];
  
  // 提取關鍵決策、事實、用戶偏好
  for (const msg of messages) {
    const content = msg.content || '';
    
    // 關鍵詞檢測
    if (content.includes('決定') || content.includes('選擇') || content.includes('prefer')) {
      keyPoints.push(content.substring(0, 100));
    }
    if (msg.role === 'user' && content.includes('我叫') || content.includes('我是')) {
      keyPoints.push(content.substring(0, 100));
    }
  }
  
  return keyPoints.slice(0, 5).join(' | ') || '無關鍵資訊';
}

/**
 * 策略 3: 壓縮工具調用記錄
 */
function compressToolCalls(
  messages: Array<{ role: string; content: string }>
): CompressionResult {
  const originalTokens = calculateContextTokens(messages);
  
  // 移除 tool response 的詳細內容，只保留結果
  const compressed = messages.map(msg => {
    if (msg.role === 'tool' && msg.content.length > 200) {
      return {
        ...msg,
        content: `[Tool result truncated, ${msg.content.length} chars]`
      };
    }
    return msg;
  });
  
  const compressedTokens = calculateContextTokens(compressed);
  
  return {
    originalTokens,
    compressedTokens,
    saved: originalTokens - compressedTokens,
    strategy: 'compress-tool-calls',
    messages: compressed
  };
}

// ============================================================================
// Main Module
// ============================================================================

const contextGuardianModule: LegionModule = {
  id: 'context-guardian',
  name: 'Context Window Guardian',
  description: '監控和管理 token 使用，防止 context window 溢出',
  trigger: 'context:',
  
  handler: async (ctx: KernelContext) => {
    const config = await loadConfig(ctx);
    const state = await loadState(ctx);
    
    // 解析命令
    const command = ctx.output.replace('context:', '').trim();
    
    switch (command) {
      case 'status':
        return await getContextStatus(ctx, config);
      
      case 'check':
        return await checkContextHealth(ctx, config);
      
      case 'clean':
        return await cleanupContext(ctx, config);
      
      case 'summarize':
        return await summarizeContext(ctx, config);
      
      default:
        if (command.startsWith('set ')) {
          return await updateConfig(ctx, command.slice(4), config);
        }
        return { error: 'Unknown command', usage: 'context:status|check|clean|summarize|set <key>=<value>' };
    }
  },
  
  metadata: {
    version: '1.0.0',
    author: 'Legion Kernel',
    tags: ['context', 'memory', 'optimization', 'token-management'],
    aliases: ['ctx-guardian', 'token-manager', 'memory-guard']
  }
};

// ============================================================================
// Actions
// ============================================================================

async function getContextStatus(ctx: KernelContext, config: ContextGuardianConfig) {
  // 模擬上下文（實際需要從 session 獲取）
  const mockMessages = generateMockMessages();
  const currentTokens = calculateContextTokens(mockMessages);
  const usagePercent = (currentTokens / config.maxTokens) * 100;
  
  const status = {
    currentTokens,
    maxTokens: config.maxTokens,
    usagePercent: usagePercent.toFixed(2) + '%',
    remainingTokens: config.maxTokens - currentTokens,
    status: getStatusLevel(usagePercent, config),
    messages: mockMessages.length,
    config: {
      warningThreshold: config.warningThreshold * 100 + '%',
      cleanupThreshold: config.cleanupThreshold * 100 + '%',
      keepRecentMessages: config.keepRecentMessages
    }
  };
  
  // 記錄狀態
  await ctx.io.append(`${config.logPath}status.jsonl`, JSON.stringify({
    timestamp: Date.now(),
    ...status
  }) + '\n');
  
  return status;
}

async function checkContextHealth(ctx: KernelContext, config: ContextGuardianConfig) {
  const mockMessages = generateMockMessages();
  const currentTokens = calculateContextTokens(mockMessages);
  const usagePercent = currentTokens / config.maxTokens;
  
  const health = {
    status: 'healthy',
    usagePercent: (usagePercent * 100).toFixed(2) + '%',
    recommendations: [] as string[]
  };
  
  if (usagePercent >= config.cleanupThreshold) {
    health.status = 'critical';
    health.recommendations.push('立即清理：已達自動清理閾值');
    health.recommendations.push('建議執行：context:clean');
  } else if (usagePercent >= config.warningThreshold) {
    health.status = 'warning';
    health.recommendations.push('注意：接近警告閾值');
    health.recommendations.push('考慮執行：context:summarize');
  }
  
  if (mockMessages.length > config.keepRecentMessages * 2) {
    health.recommendations.push(`消息數量過多 (${mockMessages.length})，建議清理`);
  }
  
  return health;
}

async function cleanupContext(ctx: KernelContext, config: ContextGuardianConfig) {
  const mockMessages = generateMockMessages();
  
  const result = pruneOldMessages(mockMessages, config.keepRecentMessages);
  
  const cleanup = {
    action: 'cleanup',
    originalTokens: result.originalTokens,
    cleanedTokens: result.compressedTokens,
    saved: result.saved,
    savedPercent: ((result.saved / result.originalTokens) * 100).toFixed(2) + '%',
    messagesBefore: mockMessages.length,
    messagesAfter: result.messages.length,
    strategy: result.strategy
  };
  
  // 記錄清理操作
  await ctx.io.append(`${config.logPath}cleanup.jsonl`, JSON.stringify({
    timestamp: Date.now(),
    ...cleanup
  }) + '\n');
  
  return cleanup;
}

async function summarizeContext(ctx: KernelContext, config: ContextGuardianConfig) {
  const mockMessages = generateMockMessages();
  
  const result = summarizeEarlyMessages(mockMessages, config.summarizeThreshold);
  
  const summary = {
    action: 'summarize',
    originalTokens: result.originalTokens,
    summarizedTokens: result.compressedTokens,
    saved: result.saved,
    savedPercent: ((result.saved / result.originalTokens) * 100).toFixed(2) + '%',
    messagesSummarized: mockMessages.length - 5,
    strategy: result.strategy
  };
  
  await ctx.io.append(`${config.logPath}summarize.jsonl`, JSON.stringify({
    timestamp: Date.now(),
    ...summary
  }) + '\n');
  
  return summary;
}

async function updateConfig(ctx: KernelContext, setting: string, config: ContextGuardianConfig) {
  const [key, value] = setting.split('=');
  
  if (!key || value === undefined) {
    return { error: 'Invalid format', usage: 'context:set key=value' };
  }
  
  const updates: Partial<ContextGuardianConfig> = {};
  
  switch (key.trim()) {
    case 'maxTokens':
      updates.maxTokens = parseInt(value, 10);
      break;
    case 'warningThreshold':
      updates.warningThreshold = parseFloat(value) / 100;
      break;
    case 'cleanupThreshold':
      updates.cleanupThreshold = parseFloat(value) / 100;
      break;
    case 'keepRecentMessages':
      updates.keepRecentMessages = parseInt(value, 10);
      break;
    default:
      return { error: `Unknown config key: ${key}` };
  }
  
  // 保存配置
  await ctx.io.write(`${config.logPath}config.json`, JSON.stringify({
    ...config,
    ...updates
  }, null, 2));
  
  return { updated: updates, newConfig: { ...config, ...updates } };
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusLevel(usagePercent: number, config: ContextGuardianConfig): string {
  if (usagePercent >= config.cleanupThreshold * 100) return 'critical';
  if (usagePercent >= config.warningThreshold * 100) return 'warning';
  return 'healthy';
}

async function loadConfig(ctx: KernelContext): Promise<ContextGuardianConfig> {
  try {
    const configStr = await ctx.io.read(`${DEFAULT_CONFIG.logPath}config.json`);
    if (configStr) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(configStr) };
    }
  } catch (e) {
    // 使用預設配置
  }
  return DEFAULT_CONFIG;
}

async function loadState(ctx: KernelContext) {
  return { lastCheck: 0, totalCleanups: 0 };
}

function generateMockMessages(): Array<{ role: string; content: string }> {
  // 模擬對話歷史（實際實現需要從 session 獲取）
  const messages = [];
  for (let i = 0; i < 50; i++) {
    messages.push({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}: ` + '這是一條測試消息 '.repeat(10)
    });
  }
  return messages;
}

export default contextGuardianModule;
