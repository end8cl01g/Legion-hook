/**
 * Secret-Shield Module
 * 
 * 實時掃描輸出內容，攔截和脫敏敏感數據
 * 防止 PAT、密碼、API Key、Token 等洩露
 */

import type { LegionModule, KernelContext } from '../types';

// ============================================================================
// 敏感數據模式定義
// ============================================================================

interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'redact' | 'warn';
  description: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // GitHub Personal Access Token
  {
    id: 'github-pat',
    name: 'GitHub PAT',
    pattern: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
    severity: 'critical',
    action: 'block',
    description: 'GitHub Personal Access Token'
  },
  
  // GitHub OAuth Token
  {
    id: 'github-oauth',
    name: 'GitHub OAuth',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
    action: 'block',
    description: 'GitHub OAuth Token'
  },
  
  // GitHub App Token
  {
    id: 'github-app',
    name: 'GitHub App Token',
    pattern: /ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
    action: 'block',
    description: 'GitHub App Installation/User Token'
  },
  
  // GitLab PAT
  {
    id: 'gitlab-pat',
    name: 'GitLab PAT',
    pattern: /glpat-[a-zA-Z0-9\-]{20,}/g,
    severity: 'critical',
    action: 'block',
    description: 'GitLab Personal Access Token'
  },
  
  // Generic API Key
  {
    id: 'generic-api-key',
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey)["'\s:=]+[a-zA-Z0-9]{16,}/gi,
    severity: 'high',
    action: 'redact',
    description: 'Generic API Key'
  },
  
  // AWS Access Key
  {
    id: 'aws-access-key',
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    action: 'block',
    description: 'AWS Access Key ID'
  },
  
  // AWS Secret Key
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Key',
    pattern: /(?:aws[_-]?secret|secret[_-]?key)["'\s:=]+[a-zA-Z0-9\/+=]{40}/gi,
    severity: 'critical',
    action: 'block',
    description: 'AWS Secret Access Key'
  },
  
  // Private Key (PEM)
  {
    id: 'private-key',
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]{50,}-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    action: 'block',
    description: 'Private Key (PEM format)'
  },
  
  // Password in URL
  {
    id: 'password-url',
    name: 'Password in URL',
    pattern: /:\/\/[^:]+:[^@]+@/g,
    severity: 'high',
    action: 'redact',
    description: 'Password embedded in URL'
  },
  
  // Generic Password
  {
    id: 'generic-password',
    name: 'Generic Password',
    pattern: /(?:password|passwd|pwd)["'\s:=]+[^\s"'`,]{8,}/gi,
    severity: 'high',
    action: 'redact',
    description: 'Generic Password'
  },
  
  // Bearer Token
  {
    id: 'bearer-token',
    name: 'Bearer Token',
    pattern: /(?:bearer|token)["'\s:=]+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/gi,
    severity: 'high',
    action: 'redact',
    description: 'JWT/Bearer Token'
  },
  
  // Slack Token
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
    severity: 'critical',
    action: 'block',
    description: 'Slack Bot/User/Access Token'
  },
  
  // Stripe Key
  {
    id: 'stripe-key',
    name: 'Stripe Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}|rk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'critical',
    action: 'block',
    description: 'Stripe Live API Key'
  },
  
  // Google API Key
  {
    id: 'google-api-key',
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: 'high',
    action: 'redact',
    description: 'Google Cloud API Key'
  },
  
  // Twilio API Key
  {
    id: 'twilio-key',
    name: 'Twilio API Key',
    pattern: /SK[0-9a-fA-F]{32}/g,
    severity: 'high',
    action: 'redact',
    description: 'Twilio API Key'
  },
  
  // Database Connection String
  {
    id: 'db-connection',
    name: 'Database Connection',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/gi,
    severity: 'high',
    action: 'redact',
    description: 'Database Connection String'
  },
  
  // Email Address (low severity)
  {
    id: 'email',
    name: 'Email Address',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    severity: 'low',
    action: 'warn',
    description: 'Email Address'
  },
  
  // Phone Number (medium severity)
  {
    id: 'phone',
    name: 'Phone Number',
    pattern: /(?:\+?[\d\s\-\(\)]{10,15})/g,
    severity: 'medium',
    action: 'warn',
    description: 'Phone Number'
  },
  
  // IP Address (internal)
  {
    id: 'internal-ip',
    name: 'Internal IP',
    pattern: /(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})/g,
    severity: 'medium',
    action: 'warn',
    description: 'Internal IP Address'
  }
];

// ============================================================================
// 掃描結果類型
// ============================================================================

interface ScanResult {
  hasSecrets: boolean;
  findings: SecretFinding[];
  originalLength: number;
  sanitizedContent: string;
  action: 'allow' | 'blocked' | 'redacted' | 'warned';
}

interface SecretFinding {
  patternId: string;
  patternName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'redact' | 'warn';
  match: string;
  redactedMatch?: string;
  position: {
    start: number;
    end: number;
    line?: number;
  };
  description: string;
}

interface ShieldConfig {
  enabled: boolean;
  blockOnCritical: boolean;
  logPath: string;
  allowList: string[];
  customPatterns: SecretPattern[];
}

const DEFAULT_CONFIG: ShieldConfig = {
  enabled: true,
  blockOnCritical: true,
  logPath: 'secret-shield/',
  allowList: [],
  customPatterns: []
};

// ============================================================================
// 核心掃描函數
// ============================================================================

/**
 * 掃描內容中的敏感數據
 */
function scanContent(content: string, config: ShieldConfig): ScanResult {
  const findings: SecretFinding[] = [];
  let sanitizedContent = content;
  const patterns = [...SECRET_PATTERNS, ...config.customPatterns];
  
  for (const pattern of patterns) {
    // 重置 lastIndex
    pattern.pattern.lastIndex = 0;
    
    let match: RegExpExecArray | null;
    while ((match = pattern.pattern.exec(content)) !== null) {
      const matchedText = match[0];
      
      // 檢查 allowlist
      if (config.allowList.includes(matchedText)) {
        continue;
      }
      
      // 計算位置
      const start = match.index;
      const end = match.index + matchedText.length;
      const line = content.substring(0, start).split('\n').length;
      
      // 生成脫敏版本
      const redactedMatch = redactSecret(matchedText, pattern.id);
      
      const finding: SecretFinding = {
        patternId: pattern.id,
        patternName: pattern.name,
        severity: pattern.severity,
        action: pattern.action,
        match: matchedText,
        redactedMatch,
        position: { start, end, line },
        description: pattern.description
      };
      
      findings.push(finding);
      
      // 脫敏內容
      if (pattern.action === 'redact' || pattern.action === 'block') {
        sanitizedContent = sanitizedContent.replace(
          new RegExp(escapeRegex(matchedText), 'g'),
          redactedMatch
        );
      }
    }
  }
  
  // 決定最終動作
  let action: 'allow' | 'blocked' | 'redacted' | 'warned' = 'allow';
  
  const criticalFindings = findings.filter(f => f.severity === 'critical');
  const highFindings = findings.filter(f => f.severity === 'high');
  
  if (criticalFindings.length > 0 && config.blockOnCritical) {
    action = 'blocked';
  } else if (highFindings.length > 0) {
    action = 'redacted';
  } else if (findings.length > 0) {
    action = 'warned';
  }
  
  return {
    hasSecrets: findings.length > 0,
    findings,
    originalLength: content.length,
    sanitizedContent,
    action
  };
}

/**
 * 脫敏敏感數據
 */
function redactSecret(secret: string, patternId: string): string {
  switch (patternId) {
    case 'github-pat':
    case 'github-oauth':
    case 'github-app':
      // 保留前綴，隱藏後面
      return secret.substring(0, 6) + '***REDACTED***';
    
    case 'private-key':
      return '-----BEGIN PRIVATE KEY-----\n[REDACTED]\n-----END PRIVATE KEY-----';
    
    case 'password-url':
      return '://***REDACTED***@';
    
    case 'aws-access-key':
      return 'AKIA' + '***REDACTED***';
    
    case 'email':
      // 保留部分郵箱
      const [user, domain] = secret.split('@');
      return user.substring(0, 2) + '***@' + domain;
    
    case 'phone':
      return '***REDACTED***';
    
    default:
      // 通用脫敏：保留前 4 位，隱藏後面
      if (secret.length > 8) {
        return secret.substring(0, 4) + '***REDACTED***' + secret.substring(secret.length - 4);
      }
      return '***REDACTED***';
  }
}

/**
 * 轉義正則表達式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// 日誌記錄
// ============================================================================

async function logFinding(ctx: KernelContext, config: ShieldConfig, finding: SecretFinding, content: string): Promise<void> {
  const logEntry = {
    timestamp: Date.now(),
    finding,
    contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    action: finding.action
  };
  
  const today = new Date().toISOString().split('T')[0];
  await ctx.io.append(`${config.logPath}findings-${today}.jsonl`, JSON.stringify(logEntry) + '\n');
}

async function logStats(ctx: KernelContext, config: ShieldConfig, stats: ShieldStats): Promise<void> {
  await ctx.io.write(`${config.logPath}stats.json`, JSON.stringify(stats, null, 2));
}

interface ShieldStats {
  totalScans: number;
  totalFindings: number;
  findingsByType: Record<string, number>;
  findingsBySeverity: Record<string, number>;
  blockedCount: number;
  redactedCount: number;
  lastScan: number;
}

// ============================================================================
// 主模組
// ============================================================================

const secretShieldModule: LegionModule = {
  id: 'secret-shield',
  name: 'Secret Shield',
  description: '實時掃描輸出，攔截 PAT、密碼和敏感數據',
  trigger: 'shield:',
  
  handler: async (ctx: KernelContext) => {
    const config = await loadConfig(ctx);
    const command = ctx.output.replace('shield:', '').trim();
    
    // 掃描命令
    if (command.startsWith('scan ')) {
      const content = command.slice(5);
      const result = scanContent(content, config);
      
      // 記錄發現
      for (const finding of result.findings) {
        await logFinding(ctx, config, finding, content);
      }
      
      return {
        action: 'scan',
        hasSecrets: result.hasSecrets,
        findings: result.findings.map(f => ({
          ...f,
          match: f.redactedMatch || f.match  // 只返回脫敏版本
        })),
        sanitizedContent: result.sanitizedContent,
        blocked: result.action === 'blocked'
      };
    }
    
    // 狀態命令
    if (command === 'status') {
      const stats = await loadStats(ctx);
      return {
        enabled: config.enabled,
        blockOnCritical: config.blockOnCritical,
        patterns: SECRET_PATTERNS.length + config.customPatterns.length,
        stats
      };
    }
    
    // 測試命令
    if (command.startsWith('test ')) {
      const testType = command.slice(5);
      const testCases: Record<string, string> = {
        'github': 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
        'aws': 'AKIAIOSFODNN7EXAMPLE',
        'password': 'password=mysecretpassword123',
        'private-key': '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...'
      };
      
      const testCase = testCases[testType] || 'No test case found';
      const result = scanContent(testCase, config);
      
      return {
        action: 'test',
        testType,
        result
      };
    }
    
    // 配置命令
    if (command.startsWith('config ')) {
      const configCmd = command.slice(7);
      
      if (configCmd === 'enable') {
        config.enabled = true;
        await saveConfig(ctx, config);
        return { action: 'config', enabled: true };
      }
      
      if (configCmd === 'disable') {
        config.enabled = false;
        await saveConfig(ctx, config);
        return { action: 'config', enabled: false };
      }
      
      if (configCmd.startsWith('allow ')) {
        const secret = configCmd.slice(6);
        config.allowList.push(secret);
        await saveConfig(ctx, config);
        return { action: 'config', allowList: config.allowList };
      }
    }
    
    return {
      error: 'Unknown command',
      usage: 'shield:scan <content>|status|test <type>|config <enable|disable|allow>'
    };
  },
  
  metadata: {
    version: '1.0.0',
    author: 'Legion Kernel',
    tags: ['security', 'secret', 'redact', 'protection'],
    aliases: ['secret-scan', 'data-protection', 'leak-prevention']
  }
};

// ============================================================================
// 配置管理
// ============================================================================

async function loadConfig(ctx: KernelContext): Promise<ShieldConfig> {
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

async function saveConfig(ctx: KernelContext, config: ShieldConfig): Promise<void> {
  await ctx.io.write(`${config.logPath}config.json`, JSON.stringify(config, null, 2));
}

async function loadStats(ctx: KernelContext): Promise<ShieldStats> {
  try {
    const statsStr = await ctx.io.read(`${DEFAULT_CONFIG.logPath}stats.json`);
    if (statsStr) {
      return JSON.parse(statsStr);
    }
  } catch (e) {
    // 使用預設統計
  }
  
  return {
    totalScans: 0,
    totalFindings: 0,
    findingsByType: {},
    findingsBySeverity: {},
    blockedCount: 0,
    redactedCount: 0,
    lastScan: 0
  };
}

// ============================================================================
// Hook 處理器 - 自動掃描每輪輸出
// ============================================================================

const secretShieldHookHandler = async (event: any) => {
  if (!event || typeof event !== 'object') {
    return;
  }
  
  // 在 agent:turn:end 時掃描輸出
  if (event.type === 'agent' && event.action === 'turn:end') {
    const response = (event.context as any)?.response || '';
    if (!response) return;
    
    const config = DEFAULT_CONFIG;  // 簡化：實際應從 io 讀取
    
    const result = scanContent(response, config);
    
    if (result.hasSecrets) {
      console.log('[SecretShield] Found secrets in response:', result.findings.length);
      
      // 如果是 blocked，需要修改輸出
      if (result.action === 'blocked') {
        console.warn('[SecretShield] BLOCKED response due to critical secrets');
        (event.context as any).response = '[內容已攔截：檢測到敏感數據]';
      } else if (result.action === 'redacted') {
        console.log('[SecretShield] REDACTED secrets from response');
        (event.context as any).response = result.sanitizedContent;
      }
    }
  }
};

export default secretShieldModule;
export { scanContent, SECRET_PATTERNS, secretShieldHookHandler };
