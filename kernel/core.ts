/**
 * Legion Kernel Core
 * 
 * The central runtime engine for the Legion hook system.
 * Provides module orchestration, state management, and I/O confinement.
 */

import type { LegionModule, KernelContext, KernelState } from '../types';
import { IOTracker } from './io';
import { ModuleRegistry } from './modules';
import { reverseExecute } from './reverse';

export class LegionKernel {
  private io: IOTracker;
  private registry: ModuleRegistry;
  private state: KernelState;
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.io = new IOTracker(rootPath);
    this.registry = new ModuleRegistry();
    this.state = this.loadState();
  }

  /**
   * Initialize the kernel and all built-in modules
   */
  async initialize(): Promise<void> {
    // Ensure directory structure
    await this.ensureDirectories();
    
    // Register built-in modules
    this.registerBuiltInModules();
    
    // Load user modules
    await this.loadUserModules();
    
    // Mark as initialized
    this.state.initialized = true;
    this.saveState();
    
    console.log(`[LegionKernel] Initialized with ${this.registry.count()} modules`);
  }

  /**
   * Get the kernel context for module handlers
   */
  getContext(output: string = ''): KernelContext {
    return {
      output,
      modules: this.registry.getAll(),
      io: this.io,
      state: this.state,
      reverseExecute: (target: string) => this.reverseExecute(target),
      registerModule: (mod: LegionModule) => this.registry.register(mod)
    };
  }

  /**
   * Execute reverse engineering from target output
   */
  async reverseExecute(targetOutput: string) {
    return reverseExecute(targetOutput, this.registry, this.io);
  }

  /**
   * Register a module
   */
  registerModule(module: LegionModule): void {
    this.registry.register(module);
  }

  /**
   * Execute a module by ID
   */
  async executeModule(moduleId: string, context: KernelContext): Promise<any> {
    const module = this.registry.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }
    if (!module.handler) {
      throw new Error(`Module has no handler: ${moduleId}`);
    }
    return module.handler(context);
  }

  /**
   * Execute modules matching an output pattern
   */
  async executeMatching(output: string, context: KernelContext): Promise<any[]> {
    const matches = this.registry.findMatching(output);
    const results = [];
    
    for (const mod of matches) {
      if (mod.handler) {
        results.push(await mod.handler(context));
      }
    }
    
    return results;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async ensureDirectories(): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    
    const dirs = [
      path.join(this.rootPath, 'kernel'),
      path.join(this.rootPath, 'modules'),
      path.join(this.rootPath, 'io', 'read'),
      path.join(this.rootPath, 'io', 'write'),
      path.join(this.rootPath, 'state')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private registerBuiltInModules(): void {
    // Print Success Module
    this.registry.register({
      id: 'print-success',
      name: 'Print Success',
      description: 'Handles print("成功") output pattern',
      trigger: 'print("成功")',
      handler: async (ctx: KernelContext) => {
        await ctx.io.write('output/success.txt', '成功');
        return { success: true, output: '成功' };
      }
    });

    // Reverse Analyzer Module
    this.registry.register({
      id: 'reverse-analyzer',
      name: 'Reverse Analyzer',
      description: 'Analyzes output and generates reverse execution plan',
      handler: async (ctx: KernelContext) => {
        return await ctx.reverseExecute(ctx.output);
      }
    });

    // IO Logger Module
    this.registry.register({
      id: 'io-logger',
      name: 'IO Logger',
      description: 'Logs all I/O operations for audit trail',
      handler: async (ctx: KernelContext) => {
        const ops = ctx.io.getOperations();
        return { operations: ops, count: ops.length };
      }
    });
  }

  private async loadUserModules(): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    
    const modulesDir = path.join(this.rootPath, 'modules');
    if (!fs.existsSync(modulesDir)) {
      return;
    }

    const files = fs.readdirSync(modulesDir);
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        try {
          const modulePath = path.join(modulesDir, file);
          const mod = await import(modulePath);
          if (mod.default) {
            this.registry.register(mod.default);
          }
        } catch (error) {
          console.error(`[LegionKernel] Failed to load module ${file}:`, error);
        }
      }
    }
  }

  private loadState(): KernelState {
    const fs = require('fs');
    const path = require('path');
    
    const stateFile = path.join(this.rootPath, 'state', 'registry.json');
    try {
      if (fs.existsSync(stateFile)) {
        return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      }
    } catch (error) {
      console.error('[LegionKernel] Failed to load state:', error);
    }

    return {
      initialized: false,
      modules: {},
      executionHistory: [],
      lastOutput: null
    };
  }

  private saveState(): void {
    const fs = require('fs');
    const path = require('path');
    
    const stateDir = path.join(this.rootPath, 'state');
    const stateFile = path.join(stateDir, 'registry.json');
    
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    
    fs.writeFileSync(stateFile, JSON.stringify(this.state, null, 2), 'utf-8');
  }
}

// Singleton instance
let kernelInstance: LegionKernel | null = null;

export function getKernel(rootPath: string): LegionKernel {
  if (!kernelInstance) {
    kernelInstance = new LegionKernel(rootPath);
  }
  return kernelInstance;
}

export default LegionKernel;
