/**
 * Identity Manager Module
 * 
 * 多身份管理系統 - 允許創建、切換、管理不同的 AI 身份/人格
 * 每個身份有獨立的 SOUL.md、USER.md、行為準則等配置
 */

import type { LegionModule, KernelContext } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 類型定義
// ============================================================================

interface Identity {
  /** 身份 ID（文件名，不含.md） */
  id: string;
  
  /** 身份名稱 */
  name: string;
  
  /** 身份描述 */
  description: string;
  
  /** 創建時間 */
  createdAt: number;
  
  /** 最後使用時間 */
  lastUsedAt?: number;
  
  /** 使用次數 */
  usageCount: number;
  
  /** 身份配置 */
  config: IdentityConfig;
}

interface IdentityConfig {
  /** SOUL.md 內容 */
  soul?: string;
  
  /** USER.md 內容 */
  user?: string;
  
  /** 額外系統提示 */
  systemPrompt?: string;
  
  /** 行為準則 */
  guidelines?: string[];
  
  /** 語氣風格 */
  tone?: 'formal' | 'casual' | 'friendly' | 'professional' | 'creative' | 'custom';
  
  /** 自定義語氣描述 */
  customTone?: string;
  
  /** 表情符號偏好 */
  emoji?: string;
  
  /** 頭像（路徑或 URL） */
  avatar?: string;
  
  /** 語言偏好 */
  language?: 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'custom';
  
  /** 自定義語言 */
  customLanguage?: string;
  
  /** 回應長度偏好 */
  responseLength?: 'concise' | 'balanced' | 'detailed';
  
  /** 專業領域標籤 */
  expertise?: string[];
  
  /** 禁止事項 */
  restrictions?: string[];
  
  /** 自定義元數據 */
  metadata?: Record<string, any>;
}

interface IdentityManagerState {
  /** 當前激活的身份 ID */
  activeIdentity: string | null;
  
  /** 所有已註冊身份 */
  identities: Record<string, Identity>;
  
  /** 身份存儲路徑 */
  storagePath: string;
  
  /** 自動切換歷史 */
  switchHistory: SwitchRecord[];
}

interface SwitchRecord {
  /** 切換時間 */
  timestamp: number;
  
  /** 從哪個身份 */
  fromIdentity: string | null;
  
  /** 切換到哪個身份 */
  toIdentity: string;
  
  /** 切換原因/備註 */
  reason?: string;
}

// ============================================================================
// 預設身份模板
// ============================================================================

const DEFAULT_IDENTITIES: Record<string, IdentityConfig> = {
  // 1. 預設助手
  'default': {
    name: 'Default Assistant',
    description: '預設的 AI 助手身份',
    soul: '你是一個樂於助人的 AI 助手。保持友好、專業、有耐心。',
    tone: 'friendly',
    emoji: '🤖',
    language: 'zh-TW',
    responseLength: 'balanced'
  },
  
  // 2. 專業顧問
  'consultant': {
    name: '專業顧問',
    description: '專業、嚴謹的商業顧問',
    soul: '你是一位經驗豐富的專業顧問。提供精準、有根據的建議。注重數據和事實。',
    tone: 'professional',
    emoji: '💼',
    language: 'zh-TW',
    responseLength: 'detailed',
    expertise: ['business', 'strategy', 'analysis'],
    guidelines: [
      '提供基於證據的建議',
      '避免猜測',
      '引用可靠來源',
      '保持客觀中立'
    ]
  },
  
  // 3. 創意夥伴
  'creative': {
    name: '創意夥伴',
    description: '充滿想像力的創意合作者',
    soul: '你是一個富有創意的夥伴。大膽想像，跳出框架思考。鼓勵實驗和創新。',
    tone: 'creative',
    emoji: '🎨',
    language: 'zh-TW',
    responseLength: 'detailed',
    expertise: ['art', 'writing', 'design', 'brainstorming'],
    guidelines: [
      '鼓勵天馬行空的想法',
      '提供多種視角',
      '善用比喻和類比',
      '激發靈感'
    ]
  },
  
  // 4. 程式導師
  'coding-mentor': {
    name: '程式導師',
    description: '專業的程式開發導師',
    soul: '你是一位資深的程式導師。耐心解釋概念，提供最佳實踐，幫助除錯。',
    tone: 'friendly',
    emoji: '💻',
    language: 'zh-TW',
    responseLength: 'detailed',
    expertise: ['programming', 'debugging', 'architecture', 'best-practices'],
    guidelines: [
      '提供可運行的代碼示例',
      '解釋為什麼而不只是怎麼做',
      '指出潛在問題',
      '推薦學習資源'
    ]
  },
  
  // 5. 簡潔模式
  'concise': {
    name: '簡潔模式',
    description: '只提供關鍵資訊，不囉嗦',
    soul: '你是一個極簡主義者。只回答必要的內容，避免冗長解釋。',
    tone: 'formal',
    emoji: '⚡',
    language: 'zh-TW',
    responseLength: 'concise',
    guidelines: [
      '直接回答問題',
      '避免冗長解釋',
      '使用要點列表',
      '不重複已知資訊'
    ]
  },
  
  // 6. 研究者
  'researcher': {
    name: '研究員',
    description: '嚴謹的學術研究者',
    soul: '你是一位嚴謹的研究員。深入分析，批判性思考，追求真相。',
    tone: 'formal',
    emoji: '🔬',
    language: 'zh-TW',
    responseLength: 'detailed',
    expertise: ['research', 'analysis', 'science', 'academia'],
    guidelines: [
      '提供完整參考文獻',
      '說明假設和限制',
      '區分事實和觀點',
      '保持學術誠信'
    ]
  }
};

// ============================================================================
// Identity Manager Class
// ============================================================================

class IdentityManager {
  private state: IdentityManagerState;
  private ctx: KernelContext | null = null;
  
  constructor(storagePath: string) {
    this.state = {
      activeIdentity: null,
      identities: {},
      storagePath,
      switchHistory: []
    };
    
    this.ensureStorage();
    this.loadIdentities();
  }
  
  setContext(ctx: KernelContext): void {
    this.ctx = ctx;
  }
  
  /**
   * 確保存儲目錄存在
   */
  private ensureStorage(): void {
    if (!fs.existsSync(this.state.storagePath)) {
      fs.mkdirSync(this.state.storagePath, { recursive: true });
    }
    
    const configDir = path.join(this.state.storagePath, 'configs');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }
  
  /**
   * 載入所有身份
   */
  private loadIdentities(): void {
    const configDir = path.join(this.state.storagePath, 'configs');
    
    if (!fs.existsSync(configDir)) {
      return;
    }
    
    const files = fs.readdirSync(configDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(configDir, file), 'utf-8');
          const identity: Identity = JSON.parse(content);
          this.state.identities[identity.id] = identity;
        } catch (error) {
          console.error(`[IdentityManager] Failed to load ${file}:`, error);
        }
      }
    }
    
    // 載入預設身份（如果不存在）
    for (const [id, config] of Object.entries(DEFAULT_IDENTITIES)) {
      if (!this.state.identities[id]) {
        this.state.identities[id] = {
          id,
          ...config,
          createdAt: Date.now(),
          usageCount: 0
        } as Identity;
      }
    }
  }
  
  /**
   * 保存身份
   */
  private saveIdentity(identity: Identity): void {
    const configPath = path.join(this.state.storagePath, 'configs', `${identity.id}.json`);
    fs.writeFileSync(configPath, JSON.stringify(identity, null, 2), 'utf-8');
  }
  
  /**
   * 列出所有身份
   */
  listIdentities(): Identity[] {
    return Object.values(this.state.identities).map(i => ({
      ...i,
      isActive: i.id === this.state.activeIdentity
    }));
  }
  
  /**
   * 獲取身份詳情
   */
  getIdentity(id: string): Identity | null {
    return this.state.identities[id] || null;
  }
  
  /**
   * 創建新身份
   */
  createIdentity(id: string, config: Partial<IdentityConfig>): Identity {
    if (this.state.identities[id]) {
      throw new Error(`Identity '${id}' already exists`);
    }
    
    const identity: Identity = {
      id,
      name: config.name || id,
      description: config.description || '',
      createdAt: Date.now(),
      usageCount: 0,
      config: config as IdentityConfig
    };
    
    this.state.identities[id] = identity;
    this.saveIdentity(identity);
    
    return identity;
  }
  
  /**
   * 更新身份
   */
  updateIdentity(id: string, updates: Partial<IdentityConfig>): Identity | null {
    const identity = this.state.identities[id];
    if (!identity) {
      return null;
    }
    
    identity.config = { ...identity.config, ...updates };
    if (updates.name) identity.name = updates.name;
    if (updates.description) identity.description = updates.description;
    
    this.saveIdentity(identity);
    
    return identity;
  }
  
  /**
   * 刪除身份
   */
  deleteIdentity(id: string): boolean {
    if (!this.state.identities[id]) {
      return false;
    }
    
    // 不能刪除當前激活的身份
    if (this.state.activeIdentity === id) {
      throw new Error('Cannot delete active identity. Switch to another identity first.');
    }
    
    // 不能刪除預設身份
    if (DEFAULT_IDENTITIES[id]) {
      throw new Error('Cannot delete built-in identity.');
    }
    
    const configPath = path.join(this.state.storagePath, 'configs', `${id}.json`);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    delete this.state.identities[id];
    
    return true;
  }
  
  /**
   * 切換身份
   */
  async switchIdentity(id: string, reason?: string): Promise<Identity | null> {
    const identity = this.state.identities[id];
    if (!identity) {
      return null;
    }
    
    const fromIdentity = this.state.activeIdentity;
    
    // 記錄切換歷史
    this.state.switchHistory.push({
      timestamp: Date.now(),
      fromIdentity,
      toIdentity: id,
      reason
    });
    
    // 保持歷史記錄長度
    if (this.state.switchHistory.length > 100) {
      this.state.switchHistory = this.state.switchHistory.slice(-100);
    }
    
    // 更新狀態
    this.state.activeIdentity = id;
    identity.usageCount++;
    identity.lastUsedAt = Date.now();
    this.saveIdentity(identity);
    
    // 注入身份配置
    await this.injectIdentity(identity);
    
    return identity;
  }
  
  /**
   * 注入身份配置到系統
   */
  private async injectIdentity(identity: Identity): Promise<void> {
    if (!this.ctx) {
      return;
    }
    
    // 生成系統提示
    const systemPrompt = this.generateSystemPrompt(identity);
    
    // 寫入身份文件
    const workspacePath = path.dirname(path.dirname(path.dirname(this.state.storagePath)));
    
    // 備份原始 SOUL.md
    const soulPath = path.join(workspacePath, 'SOUL.md');
    const userPath = path.join(workspacePath, 'USER.md');
    const backupDir = path.join(this.state.storagePath, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // 備份
    if (fs.existsSync(soulPath)) {
      const backupSoul = path.join(backupDir, `SOUL.${this.state.activeIdentity || 'default'}.md.bak`);
      fs.copyFileSync(soulPath, backupSoul);
    }
    
    // 寫入新的 SOUL.md
    const newSoul = identity.config.soul || `你是一個 AI 助手，身份：${identity.name}。\n\n${identity.config.description}`;
    fs.writeFileSync(soulPath, newSoul, 'utf-8');
    
    // 寫入身份元數據
    const identityMetaPath = path.join(this.state.storagePath, 'CURRENT_IDENTITY.json');
    fs.writeFileSync(identityMetaPath, JSON.stringify({
      activeIdentity: this.state.activeIdentity,
      switchedAt: Date.now(),
      identity
    }, null, 2), 'utf-8');
    
    console.log(`[IdentityManager] Injected identity: ${identity.name} (${identity.id})`);
  }
  
  /**
   * 生成系統提示
   */
  private generateSystemPrompt(identity: Identity): string {
    const parts: string[] = [];
    
    // 基礎身份
    parts.push(`# Current Identity: ${identity.name}`);
    parts.push('');
    
    // SOUL
    if (identity.config.soul) {
      parts.push('## Core Identity');
      parts.push(identity.config.soul);
      parts.push('');
    }
    
    // 語氣
    if (identity.config.tone) {
      parts.push(`## Tone: ${identity.config.tone.toUpperCase()}`);
      if (identity.config.customTone) {
        parts.push(identity.config.customTone);
      }
      parts.push('');
    }
    
    // 行為準則
    if (identity.config.guidelines && identity.config.guidelines.length > 0) {
      parts.push('## Guidelines');
      for (const guideline of identity.config.guidelines) {
        parts.push(`- ${guideline}`);
      }
      parts.push('');
    }
    
    // 專業領域
    if (identity.config.expertise && identity.config.expertise.length > 0) {
      parts.push(`## Expertise: ${identity.config.expertise.join(', ')}`);
      parts.push('');
    }
    
    // 限制
    if (identity.config.restrictions && identity.config.restrictions.length > 0) {
      parts.push('## Restrictions');
      for (const restriction of identity.config.restrictions) {
        parts.push(`- ${restriction}`);
      }
      parts.push('');
    }
    
    return parts.join('\n');
  }
  
  /**
   * 獲取當前身份
   */
  getCurrentIdentity(): Identity | null {
    if (!this.state.activeIdentity) {
      return null;
    }
    return this.state.identities[this.state.activeIdentity];
  }
  
  /**
   * 獲取切換歷史
   */
  getSwitchHistory(limit: number = 10): SwitchRecord[] {
    return this.state.switchHistory.slice(-limit);
  }
  
  /**
   * 導出身份
   */
  exportIdentity(id: string): string | null {
    const identity = this.state.identities[id];
    if (!identity) {
      return null;
    }
    return JSON.stringify(identity, null, 2);
  }
  
  /**
   * 導入身份
   */
  importIdentity(json: string): Identity | null {
    try {
      const identity: Identity = JSON.parse(json);
      if (!identity.id || !identity.config) {
        return null;
      }
      
      this.state.identities[identity.id] = identity;
      this.saveIdentity(identity);
      
      return identity;
    } catch (error) {
      console.error('[IdentityManager] Failed to import identity:', error);
      return null;
    }
  }
  
  /**
   * 重置為預設身份
   */
  async resetToDefault(): Promise<Identity | null> {
    return this.switchIdentity('default', 'Reset to default');
  }
  
  /**
   * 獲取統計數據
   */
  getStats(): {
    totalIdentities: number;
    activeIdentity: string | null;
    mostUsed: string | null;
    switchCount: number;
  } {
    const mostUsed = Object.values(this.state.identities)
      .sort((a, b) => b.usageCount - a.usageCount)[0]?.id || null;
    
    return {
      totalIdentities: Object.keys(this.state.identities).length,
      activeIdentity: this.state.activeIdentity,
      mostUsed,
      switchCount: this.state.switchHistory.length
    };
  }
}

// ============================================================================
// Legion Module
// ============================================================================

let identityManager: IdentityManager | null = null;

const identityManagerModule: LegionModule = {
  id: 'identity-manager',
  name: 'Identity Manager',
  description: '多身份管理系統 - 創建、切換、管理不同的 AI 身份/人格',
  trigger: 'identity:',
  
  handler: async (ctx: KernelContext) => {
    // 初始化 Identity Manager
    if (!identityManager) {
      const storagePath = path.join(path.dirname(ctx.io.constructor.name === 'Function' ? '/tmp' : '/mnt/data/openclaw/workspace/.openclaw/workspace/hooks/legion/io/write'), 'identity-manager');
      identityManager = new IdentityManager('/mnt/data/openclaw/workspace/.openclaw/workspace/hooks/legion/io/write/identity-manager');
      identityManager.setContext(ctx);
    }
    
    const command = ctx.output.replace('identity:', '').trim();
    const parts = command.split(' ');
    const action = parts[0];
    const args = parts.slice(1).join(' ');
    
    // 列出所有身份
    if (action === 'list' || action === 'ls') {
      const identities = identityManager.listIdentities();
      const current = identityManager.getCurrentIdentity();
      
      return {
        action: 'list',
        current: current?.id || 'none',
        identities: identities.map(i => ({
          id: i.id,
          name: i.name,
          description: i.description,
          emoji: i.config.emoji,
          isActive: i.id === current?.id,
          usageCount: i.usageCount
        }))
      };
    }
    
    // 切換身份
    if (action === 'switch' || action === 'use' || action === 'set') {
      const id = args.split(' ')[0];
      const reason = args.slice(id.length).trim() || undefined;
      
      const identity = await identityManager.switchIdentity(id, reason);
      
      if (!identity) {
        return { error: `Identity '${id}' not found`, suggestion: 'Use identity:list to see available identities' };
      }
      
      return {
        action: 'switch',
        success: true,
        identity: {
          id: identity.id,
          name: identity.name,
          emoji: identity.config.emoji
        },
        message: `Switched to ${identity.config.emoji || ''} ${identity.name}`
      };
    }
    
    // 查看當前身份
    if (action === 'current' || action === 'me' || action === 'whoami') {
      const current = identityManager.getCurrentIdentity();
      
      if (!current) {
        return { action: 'current', identity: 'none' };
      }
      
      return {
        action: 'current',
        identity: {
          id: current.id,
          name: current.name,
          description: current.description,
          config: current.config,
          usageCount: current.usageCount,
          lastUsedAt: current.lastUsedAt
        }
      };
    }
    
    // 創建身份
    if (action === 'create' || action === 'new') {
      // 簡單解析：identity:create id name="Name" description="..."
      const match = args.match(/(\S+)\s+(.*)/);
      if (!match) {
        return { error: 'Usage: identity:create <id> [name="..." description="..."]' };
      }
      
      const id = match[1];
      const config: Partial<IdentityConfig> = {
        name: id,
        description: 'Custom identity'
      };
      
      try {
        const identity = identityManager.createIdentity(id, config);
        return {
          action: 'create',
          success: true,
          identity: { id: identity.id, name: identity.name },
          message: `Created identity: ${identity.name}`,
          nextStep: 'Use identity:edit to configure this identity'
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
    
    // 刪除身份
    if (action === 'delete' || action === 'rm') {
      const id = args.split(' ')[0];
      
      try {
        const success = identityManager.deleteIdentity(id);
        if (!success) {
          return { error: `Identity '${id}' not found` };
        }
        return { action: 'delete', success: true, id };
      } catch (error: any) {
        return { error: error.message };
      }
    }
    
    // 查看歷史
    if (action === 'history' || action === 'log') {
      const limit = parseInt(args) || 10;
      const history = identityManager.getSwitchHistory(limit);
      
      return {
        action: 'history',
        history: history.map(h => ({
          ...h,
          time: new Date(h.timestamp).toISOString()
        }))
      };
    }
    
    // 統計
    if (action === 'stats' || action === 'statistics') {
      return {
        action: 'stats',
        ...identityManager.getStats()
      };
    }
    
    // 重置
    if (action === 'reset' || action === 'default') {
      const identity = await identityManager.resetToDefault();
      return {
        action: 'reset',
        success: true,
        identity: identity?.id || 'default'
      };
    }
    
    // 幫助
    return {
      action: 'help',
      usage: 'identity:<command> [args]',
      commands: {
        'list': 'List all identities',
        'switch <id>': 'Switch to identity',
        'current': 'Show current identity',
        'create <id>': 'Create new identity',
        'delete <id>': 'Delete identity',
        'history [n]': 'Show switch history (last n)',
        'stats': 'Show statistics',
        'reset': 'Reset to default identity'
      },
      examples: [
        'identity:list',
        'identity:switch consultant',
        'identity:switch creative',
        'identity:current',
        'identity:create mybot',
        'identity:history 5',
        'identity:reset'
      ],
      builtin: Object.keys(DEFAULT_IDENTITIES)
    };
  },
  
  metadata: {
    version: '1.0.0',
    author: 'Legion Kernel',
    tags: ['identity', 'persona', 'role', 'switch', 'management'],
    aliases: ['id', 'persona', 'role']
  }
};

export default identityManagerModule;
export { IdentityManager, DEFAULT_IDENTITIES };
export type { Identity, IdentityConfig, IdentityManagerState, SwitchRecord };
