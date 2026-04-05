---
name: legion
description: "Kernel for infinite low-level code development with modular architecture"
metadata: {"openclaw":{"emoji":"♾️","events":["agent:bootstrap","tool:exec","tool:write"]}}
---

# Legion Hook - Infinite Kernel

A modular kernel hook that enables reverse execution from output results and provides infinite possibilities for low-level code development.

## Core Principles

1. **Reverse Execution**: Start from desired output (e.g., `print("成功")`) and work backwards to generate the necessary code
2. **Modular Architecture**: Everything is a module that can be composed, extended, and replaced
3. **Confined I/O**: All read/write operations occur only within `hooks/legion/` directory
4. **Infinite Possibilities**: The kernel is designed to be extended without limits

## What It Does

- Injects a kernel runtime context during agent bootstrap
- Provides reverse execution engine for output-driven development
- Manages modular components within the legion directory
- Tracks all I/O operations to ensure confinement

## Directory Structure

```
hooks/legion/
├── HOOK.md          # This file
├── handler.ts       # Hook handler
├── kernel/          # Core kernel runtime
│   ├── core.ts      # Kernel core
│   ├── reverse.ts   # Reverse execution engine
│   └── modules.ts   # Module system
├── modules/         # Modular components
│   └── .gitkeep
├── io/              # Confined I/O operations
│   ├── read/        # Read operations log
│   └── write/       # Write operations log
└── state/           # Kernel state
    └── registry.json
```

## Configuration

Enable with:

```bash
openclaw hooks enable legion
```

## Usage

### Reverse Execution Example

```typescript
// Start from desired output
const output = 'print("成功")';

// Kernel generates the path to achieve this output
const plan = await kernel.reverseExecute(output);
// Returns: { steps: [...], modules: [...], io: {...} }
```

### Module Registration

```typescript
kernel.registerModule({
  name: 'print-success',
  trigger: 'print("成功")',
  handler: async (ctx) => { /* ... */ }
});
```

## I/O Confinement

All file operations are logged and confined:
- Reads: `hooks/legion/io/read/`
- Writes: `hooks/legion/io/write/`
- State: `hooks/legion/state/`

Attempting to write outside these paths will be intercepted and redirected.
