/**
 * Legion Kernel Type Definitions
 * 
 * Shared types for the Legion hook system.
 */

// ============================================================================
// Module Types
// ============================================================================

export interface LegionModule {
  /** Unique identifier for the module */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what the module does */
  description: string;
  
  /** Output pattern that triggers this module (optional) */
  trigger?: string;
  
  /** Module handler function */
  handler?: (ctx: KernelContext) => Promise<any>;
  
  /** Module dependencies (other module IDs) */
  dependencies?: string[];
  
  /** Additional metadata */
  metadata?: {
    tags?: string[];
    aliases?: string[];
    version?: string;
    author?: string;
    composite?: boolean;
    composedOf?: string[];
    [key: string]: any;
  };
}

// ============================================================================
// Kernel Context Types
// ============================================================================

export interface KernelContext {
  /** Current output being processed */
  output: string;
  
  /** All registered modules */
  modules: Map<string, LegionModule>;
  
  /** IO tracker for confined operations */
  io: IOTracker;
  
  /** Current kernel state */
  state: KernelState;
  
  /** Reverse execute from target output */
  reverseExecute: (targetOutput: string) => Promise<ExecutionPlan>;
  
  /** Register a new module */
  registerModule: (module: LegionModule) => void;
}

// ============================================================================
// State Types
// ============================================================================

export interface KernelState {
  /** Whether the kernel has been initialized */
  initialized: boolean;
  
  /** Registered modules (serialized) */
  modules: Record<string, LegionModule>;
  
  /** History of executions */
  executionHistory: ExecutionRecord[];
  
  /** Last processed output */
  lastOutput: string | null;
}

export interface ExecutionRecord {
  /** Timestamp of execution */
  timestamp: number;
  
  /** Target output that was processed */
  targetOutput: string;
  
  /** Modules used in this execution */
  modulesUsed: string[];
  
  /** Whether execution succeeded */
  success: boolean;
  
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Execution Plan Types
// ============================================================================

export interface ExecutionPlan {
  /** The target output we're trying to achieve */
  targetOutput: string;
  
  /** Steps to execute */
  steps: ExecutionStep[];
  
  /** Required module IDs */
  requiredModules: string[];
  
  /** IO operations that will be performed */
  ioOperations: IOOperation[];
  
  /** Output analysis results */
  analysis?: {
    patterns: Array<{ name: string; match: RegExpMatchArray }>;
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedLines: number;
  };
  
  /** Generated code */
  generatedCode?: string;
}

export interface ExecutionStep {
  /** Order of execution */
  order: number;
  
  /** Type of action */
  action: 'analyze' | 'invoke' | 'generate' | 'recommend' | 'validate' | 'execute';
  
  /** Module ID if this step invokes a module */
  module?: string;
  
  /** Generated code for this step */
  code?: string;
  
  /** Human-readable description */
  description: string;
}

// ============================================================================
// IO Types
// ============================================================================

export interface IOOperation {
  /** Type of operation */
  type: 'read' | 'write' | 'append' | 'delete';
  
  /** Path of the file */
  path: string;
  
  /** Content (for write/append operations) */
  content?: string;
  
  /** Timestamp of operation */
  timestamp: number;
  
  /** Error message if operation failed */
  error?: string;
}

export interface IOTracker {
  /** Read a file */
  read(relativePath: string): Promise<string | null>;
  
  /** Write a file */
  write(relativePath: string, content: string): Promise<void>;
  
  /** Append to a file */
  append(relativePath: string, content: string): Promise<void>;
  
  /** Check if file exists */
  exists(relativePath: string): boolean;
  
  /** Delete a file */
  delete(relativePath: string): Promise<void>;
  
  /** List files in directory */
  list(relativePath: string): string[];
  
  /** Get all logged operations */
  getOperations(): IOOperation[];
}

// ============================================================================
// Hook Types
// ============================================================================

export interface HookEvent {
  /** Event type */
  type: 'agent' | 'tool' | 'system';
  
  /** Event action */
  action: string;
  
  /** Session key */
  sessionKey?: string;
  
  /** Event context */
  context?: any;
  
  /** Additional event data */
  [key: string]: any;
}

export type HookHandler = (event: HookEvent) => Promise<void> | void;

// ============================================================================
// Utility Types
// ============================================================================

export interface LegionConfig {
  /** Root path for legion directory */
  rootPath: string;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Enable strict IO confinement */
  strictIO?: boolean;
  
  /** Auto-save state interval (ms) */
  autoSaveInterval?: number;
}

export interface LegionAPI {
  /** Kernel instance */
  kernel: any;
  
  /** IO tracker */
  io: IOTracker;
  
  /** Module registry */
  modules: ModuleRegistry;
  
  /** Reverse execute */
  reverse: (output: string) => Promise<ExecutionPlan>;
  
  /** Register a module */
  register: (module: LegionModule) => void;
}

// Re-export for convenience
export type { ModuleRegistry } from './kernel/modules';
export type { IOTracker as IOTrackerClass } from './kernel/io';
export type { LegionKernel } from './kernel/core';
