/**
 * Legion Hook - Infinite Kernel for OpenClaw
 * 
 * A modular kernel that enables reverse execution from output results
 * and provides infinite possibilities for low-level code development.
 * All I/O operations are confined to hooks/legion/ directory.
 */

import type { HookHandler } from 'openclaw/hooks';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Kernel Configuration
// ============================================================================

const LEGION_ROOT = '/mnt/data/openclaw/workspace/.openclaw/workspace/hooks/legion';
const KERNEL_DIR = path.join(LEGION_ROOT, 'kernel');
const MODULES_DIR = path.join(LEGION_ROOT, 'modules');
const IO_READ_DIR = path.join(LEGION_ROOT, 'io', 'read');
const IO_WRITE_DIR = path.join(LEGION_ROOT, 'io', 'write');
const STATE_DIR = path.join(LEGION_ROOT, 'state');
const STATE_FILE = path.join(STATE_DIR, 'registry.json');

// ============================================================================
// Kernel Core Types
// ============================================================================

interface LegionModule {
  id: string;
  name: string;
  description: string;
  trigger?: string;
  handler?: (ctx: KernelContext) => Promise<any>;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

interface KernelContext {
  output: string;
  modules: Map<string, LegionModule>;
  io: IOTracker;
  state: KernelState;
  reverseExecute: (targetOutput: string) => Promise<ExecutionPlan>;
  registerModule: (module: LegionModule) => void;
}

interface KernelState {
  initialized: boolean;
  modules: Record<string, LegionModule>;
  executionHistory: ExecutionRecord[];
  lastOutput: string | null;
}

interface ExecutionRecord {
  timestamp: number;
  targetOutput: string;
  modulesUsed: string[];
  success: boolean;
}

interface ExecutionPlan {
  targetOutput: string;
  steps: ExecutionStep[];
  requiredModules: string[];
  ioOperations: IOOperation[];
}

interface ExecutionStep {
  order: number;
  action: string;
  module?: string;
  code?: string;
  description: string;
}

interface IOOperation {
  type: 'read' | 'write';
  path: string;
  content?: string;
  timestamp: number;
}

class IOTracker {
  private operations: IOOperation[] = [];
  private confinedRoot: string;

  constructor(rootPath: string) {
    this.confinedRoot = rootPath;
  }

  async read(relativePath: string): Promise<string | null> {
    const safePath = path.join(this.confinedRoot, 'io', 'read', relativePath);
    
    // Enforce confinement
    if (!safePath.startsWith(this.confinedRoot)) {
      throw new Error(`IO confinement violation: read attempt outside legion directory`);
    }

    const logOp: IOOperation = {
      type: 'read',
      path: safePath,
      timestamp: Date.now()
    };
    this.operations.push(logOp);

    try {
      if (fs.existsSync(safePath)) {
        return fs.readFileSync(safePath, 'utf-8');
      }
      return null;
    } catch (error) {
      this.logOperation(logOp);
      throw error;
    }
  }

  async write(relativePath: string, content: string): Promise<void> {
    const safePath = path.join(this.confinedRoot, 'io', 'write', relativePath);
    
    // Enforce confinement
    if (!safePath.startsWith(this.confinedRoot)) {
      throw new Error(`IO confinement violation: write attempt outside legion directory`);
    }

    const logOp: IOOperation = {
      type: 'write',
      path: safePath,
      content,
      timestamp: Date.now()
    };
    this.operations.push(logOp);

    // Ensure directory exists
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(safePath, content, 'utf-8');
    this.logOperation(logOp);
  }

  private logOperation(op: IOOperation) {
    const logFile = path.join(STATE_DIR, `io-log-${new Date().toISOString().split('T')[0]}.jsonl`);
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    fs.appendFileSync(logFile, JSON.stringify(op) + '\n');
  }

  getOperations(): IOOperation[] {
    return [...this.operations];
  }
}

// ============================================================================
// Reverse Execution Engine
// ============================================================================

async function reverseExecute(
  targetOutput: string,
  modules: Map<string, LegionModule>,
  io: IOTracker
): Promise<ExecutionPlan> {
  const steps: ExecutionStep[] = [];
  const requiredModules: string[] = [];
  const ioOperations: IOOperation[] = [];

  // Step 1: Analyze the target output
  steps.push({
    order: 1,
    action: 'analyze',
    description: `Analyze target output: ${targetOutput}`,
    code: `// Target: ${targetOutput}`
  });

  // Step 2: Find matching modules
  for (const [id, mod] of modules) {
    if (mod.trigger && targetOutput.includes(mod.trigger)) {
      requiredModules.push(id);
      steps.push({
        order: steps.length + 1,
        action: 'invoke',
        module: id,
        description: `Invoke module: ${mod.name}`,
        code: `await kernel.modules.get('${id}').handler(ctx)`
      });
    }
  }

  // Step 3: Generate execution code
  const generatedCode = generateCodeForOutput(targetOutput, modules);
  steps.push({
    order: steps.length + 1,
    action: 'generate',
    description: 'Generate execution code',
    code: generatedCode
  });

  // Step 4: Log the reverse execution
  const logEntry = {
    type: 'reverse_execution',
    target: targetOutput,
    modules: requiredModules,
    timestamp: Date.now()
  };
  
  await io.write(`reverse/${Date.now()}.json`, JSON.stringify(logEntry, null, 2));
  ioOperations.push({
    type: 'write',
    path: path.join(LEGION_ROOT, 'io', 'write', `reverse/${Date.now()}.json`),
    content: JSON.stringify(logEntry, null, 2),
    timestamp: Date.now()
  });

  return {
    targetOutput,
    steps,
    requiredModules,
    ioOperations
  };
}

function generateCodeForOutput(targetOutput: string, modules: Map<string, LegionModule>): string {
  // Parse the output and generate appropriate code
  const printMatch = targetOutput.match(/print\s*\(\s*["'](.+?)["']\s*\)/);
  
  if (printMatch) {
    const message = printMatch[1];
    return `# Generated by Legion Kernel
# Target output: ${targetOutput}

print("${message}")
`;
  }

  // Default template for unknown output patterns
  return `# Generated by Legion Kernel
# Target output: ${targetOutput}

# TODO: Implement logic to produce: ${targetOutput}
`;
}

// ============================================================================
// Module Registry
// ============================================================================

class ModuleRegistry {
  private modules: Map<string, LegionModule> = new Map();

  register(module: LegionModule): void {
    this.modules.set(module.id, module);
  }

  get(id: string): LegionModule | undefined {
    return this.modules.get(id);
  }

  getAll(): Map<string, LegionModule> {
    return new Map(this.modules);
  }

  findMatching(output: string): LegionModule[] {
    const matches: LegionModule[] = [];
    for (const mod of this.modules.values()) {
      if (mod.trigger && output.includes(mod.trigger)) {
        matches.push(mod);
      }
    }
    return matches;
  }
}

// ============================================================================
// State Management
// ============================================================================

function loadState(): KernelState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Legion] Failed to load state:', error);
  }

  return {
    initialized: false,
    modules: {},
    executionHistory: [],
    lastOutput: null
  };
}

function saveState(state: KernelState): void {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Legion] Failed to save state:', error);
  }
}

// ============================================================================
// Kernel Initialization
// ============================================================================

function initializeKernel(): { io: IOTracker; registry: ModuleRegistry; state: KernelState } {
  // Ensure directory structure exists
  const dirs = [KERNEL_DIR, MODULES_DIR, IO_READ_DIR, IO_WRITE_DIR, STATE_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Create .gitkeep files
  const keepFiles = [
    path.join(MODULES_DIR, '.gitkeep'),
    path.join(IO_READ_DIR, '.gitkeep'),
    path.join(IO_WRITE_DIR, '.gitkeep')
  ];
  for (const file of keepFiles) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '', 'utf-8');
    }
  }

  // Load state
  const state = loadState();
  
  // Initialize IO tracker
  const io = new IOTracker(LEGION_ROOT);

  // Initialize module registry
  const registry = new ModuleRegistry();

  // Register built-in modules
  registry.register({
    id: 'print-success',
    name: 'Print Success',
    description: 'Handles print("成功") output pattern',
    trigger: 'print("成功")',
    handler: async (ctx: KernelContext) => {
      await ctx.io.write('output/success.txt', '成功');
      return { success: true, output: '成功' };
    }
  });

  registry.register({
    id: 'reverse-analyzer',
    name: 'Reverse Analyzer',
    description: 'Analyzes output and generates reverse execution plan',
    handler: async (ctx: KernelContext) => {
      return await ctx.reverseExecute(ctx.output);
    }
  });

  // Update state
  state.initialized = true;
  saveState(state);

  return { io, registry, state };
}

// ============================================================================
// Hook Handler
// ============================================================================

const handler: HookHandler = async (event) => {
  // Safety checks
  if (!event || typeof event !== 'object') {
    return;
  }

  const sessionKey = (event as any).sessionKey || '';
  
  // Initialize kernel on bootstrap
  if (event.type === 'agent' && event.action === 'bootstrap') {
    const { io, registry, state } = initializeKernel();

    // Create kernel context
    const kernelContext: KernelContext = {
      output: '',
      modules: registry.getAll(),
      io,
      state,
      reverseExecute: async (target: string) => reverseExecute(target, registry.getAll(), io),
      registerModule: (mod: LegionModule) => registry.register(mod)
    };

    // Inject kernel documentation as virtual file
    const kernelDoc = `# Legion Kernel - Active Session

**Initialized:** ${new Date().toISOString()}
**State:** ${state.initialized ? 'Ready' : 'Initializing'}
**Modules:** ${Array.from(registry.getAll().keys()).join(', ')}

## Quick Start

\`\`\`typescript
// Reverse execute from desired output
const plan = await kernel.reverseExecute('print("成功")');

// Register a new module
kernel.registerModule({
  id: 'my-module',
  name: 'My Module',
  description: '...',
  handler: async (ctx) => { /* ... */ }
});

// Confined I/O
await kernel.io.write('data.json', JSON.stringify({ hello: 'world' }));
const data = await kernel.io.read('data.json');
\`\`\`

## Available Modules

${Array.from(registry.getAll().values()).map(m => `- **${m.id}**: ${m.description}`).join('\n')}

## I/O Confinement

All operations are logged and confined to: \`${LEGION_ROOT}/io/\`
`;

    if (Array.isArray((event.context as any)?.bootstrapFiles)) {
      (event.context as any).bootstrapFiles.push({
        path: 'LEGION_KERNEL.md',
        content: kernelDoc,
        virtual: true,
      });
    }

    console.log('[Legion] Kernel initialized with', registry.getAll().size, 'modules');
  }

  // Intercept tool:exec and tool:write for logging
  if (event.type === 'tool') {
    const state = loadState();
    
    if (event.action === 'exec' || event.action === 'write') {
      state.executionHistory.push({
        timestamp: Date.now(),
        targetOutput: JSON.stringify(event),
        modulesUsed: [],
        success: true
      });
      saveState(state);
    }
  }
};

export default handler;
