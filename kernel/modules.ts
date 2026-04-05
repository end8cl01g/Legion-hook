/**
 * Module System
 * 
 * Provides a modular architecture for the Legion kernel.
 * Modules can be registered, discovered, and composed dynamically.
 */

import type { LegionModule } from '../types';

/**
 * Module Registry - manages all registered modules
 */
export class ModuleRegistry {
  private modules: Map<string, LegionModule> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a module
   */
  register(module: LegionModule): void {
    if (!module.id) {
      throw new Error('Module must have an id');
    }
    if (!module.name) {
      throw new Error('Module must have a name');
    }
    
    this.modules.set(module.id, module);
    
    // Register aliases if provided
    if (module.metadata?.aliases) {
      for (const alias of module.metadata.aliases) {
        this.aliases.set(alias, module.id);
      }
    }
  }

  /**
   * Get a module by ID or alias
   */
  get(idOrAlias: string): LegionModule | undefined {
    // Try direct ID first
    const module = this.modules.get(idOrAlias);
    if (module) return module;

    // Try alias
    const actualId = this.aliases.get(idOrAlias);
    if (actualId) {
      return this.modules.get(actualId);
    }

    return undefined;
  }

  /**
   * Check if a module exists
   */
  has(idOrAlias: string): boolean {
    return this.modules.has(idOrAlias) || this.aliases.has(idOrAlias);
  }

  /**
   * Remove a module
   */
  remove(id: string): boolean {
    const module = this.modules.get(id);
    if (module?.metadata?.aliases) {
      for (const alias of module.metadata.aliases) {
        this.aliases.delete(alias);
      }
    }
    return this.modules.delete(id);
  }

  /**
   * Get all modules
   */
  getAll(): Map<string, LegionModule> {
    return new Map(this.modules);
  }

  /**
   * Get module count
   */
  count(): number {
    return this.modules.size;
  }

  /**
   * Find modules matching an output pattern
   */
  findMatching(output: string): LegionModule[] {
    const matches: LegionModule[] = [];
    for (const mod of this.modules.values()) {
      if (mod.trigger && output.includes(mod.trigger)) {
        matches.push(mod);
      }
    }
    return matches;
  }

  /**
   * Find modules by tag
   */
  findByTag(tag: string): LegionModule[] {
    const matches: LegionModule[] = [];
    for (const mod of this.modules.values()) {
      if (mod.metadata?.tags?.includes(tag)) {
        matches.push(mod);
      }
    }
    return matches;
  }

  /**
   * List all module IDs
   */
  listIds(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Export registry as JSON
   */
  export(): Record<string, LegionModule> {
    const result: Record<string, LegionModule> = {};
    for (const [id, mod] of this.modules) {
      result[id] = mod;
    }
    return result;
  }

  /**
   * Import modules from JSON
   */
  import(modules: Record<string, LegionModule>): void {
    for (const [id, mod] of Object.entries(modules)) {
      this.register(mod);
    }
  }

  /**
   * Compose multiple modules into a composite module
   */
  compose(
    compositeId: string,
    moduleIds: string[],
    name: string,
    description: string
  ): LegionModule | null {
    const modulesToCompose: LegionModule[] = [];
    
    for (const id of moduleIds) {
      const mod = this.get(id);
      if (!mod) {
        console.warn(`[ModuleRegistry] Module not found for composition: ${id}`);
        continue;
      }
      modulesToCompose.push(mod);
    }

    if (modulesToCompose.length === 0) {
      return null;
    }

    // Create composite module
    const composite: LegionModule = {
      id: compositeId,
      name,
      description,
      metadata: {
        composite: true,
        composedOf: moduleIds,
        tags: ['composite']
      },
      handler: async (ctx) => {
        const results = [];
        for (const mod of modulesToCompose) {
          if (mod.handler) {
            results.push(await mod.handler(ctx));
          }
        }
        return results;
      }
    };

    this.register(composite);
    return composite;
  }
}

/**
 * Module Builder - fluent API for creating modules
 */
export class ModuleBuilder {
  private module: Partial<LegionModule> = {};

  id(id: string): ModuleBuilder {
    this.module.id = id;
    return this;
  }

  name(name: string): ModuleBuilder {
    this.module.name = name;
    return this;
  }

  description(desc: string): ModuleBuilder {
    this.module.description = desc;
    return this;
  }

  trigger(trigger: string): ModuleBuilder {
    this.module.trigger = trigger;
    return this;
  }

  handler(handler: (ctx: any) => Promise<any>): ModuleBuilder {
    this.module.handler = handler;
    return this;
  }

  dependencies(...deps: string[]): ModuleBuilder {
    this.module.dependencies = deps;
    return this;
  }

  tag(...tags: string[]): ModuleBuilder {
    if (!this.module.metadata) {
      this.module.metadata = {};
    }
    this.module.metadata.tags = tags;
    return this;
  }

  alias(...aliases: string[]): ModuleBuilder {
    if (!this.module.metadata) {
      this.module.metadata = {};
    }
    this.module.metadata.aliases = aliases;
    return this;
  }

  build(): LegionModule {
    if (!this.module.id || !this.module.name) {
      throw new Error('Module must have at least id and name');
    }
    return this.module as LegionModule;
  }
}

/**
 * Create a new module builder
 */
export function createModule(): ModuleBuilder {
  return new ModuleBuilder();
}

export default ModuleRegistry;
