/**
 * Sample Legion Module Template
 * 
 * Copy this file to hooks/legion/modules/your-module.ts
 * and customize for your needs.
 */

import type { LegionModule, KernelContext } from '../types';

/**
 * Example Module: Print Success
 * 
 * This module handles the output pattern print("成功")
 * and writes the success message to the IO directory.
 */
const printSuccessModule: LegionModule = {
  id: 'print-success',
  name: 'Print Success',
  description: 'Handles print("成功") output pattern and logs success',
  trigger: 'print("成功")',
  
  /**
   * Module handler - called when trigger matches
   */
  handler: async (ctx: KernelContext) => {
    // Write success to confined IO
    await ctx.io.write('output/success.txt', '成功');
    
    // Log the execution
    await ctx.io.append('logs/executions.jsonl', JSON.stringify({
      module: 'print-success',
      timestamp: Date.now(),
      output: '成功'
    }) + '\n');
    
    return {
      success: true,
      output: '成功',
      path: 'io/write/output/success.txt'
    };
  },
  
  /**
   * Module dependencies (other module IDs this module requires)
   */
  dependencies: [],
  
  /**
   * Additional metadata
   */
  metadata: {
    version: '1.0.0',
    author: 'Legion Kernel',
    tags: ['output', 'success', 'print'],
    aliases: ['success-print', 'print-ok']
  }
};

export default printSuccessModule;

// ============================================================================
// Module Creation Guide
// ============================================================================

/*
 * To create your own module:
 * 
 * 1. Copy this file to hooks/legion/modules/your-module.ts
 * 
 * 2. Customize the module definition:
 *    - id: Unique identifier (use kebab-case)
 *    - name: Human-readable name
 *    - description: What the module does
 *    - trigger: Output pattern that activates this module (optional)
 *    - handler: Async function that runs when triggered
 *    - dependencies: Array of other module IDs this needs
 *    - metadata: Optional tags, aliases, version, etc.
 * 
 * 3. The handler receives a KernelContext with:
 *    - ctx.output: The current output being processed
 *    - ctx.io: Confined IO tracker (read/write within legion/)
 *    - ctx.modules: All registered modules
 *    - ctx.reverseExecute: Function to generate execution plans
 *    - ctx.registerModule: Function to register new modules
 * 
 * 4. Your module will be auto-loaded on kernel initialization
 * 
 * Example: Create a module that handles any print statement
 * 
 * const printHandler: LegionModule = {
 *   id: 'generic-print',
 *   name: 'Generic Print Handler',
 *   description: 'Handles any print() statement',
 *   trigger: 'print(',
 *   handler: async (ctx) => {
 *     // Extract the message from print("message")
 *     const match = ctx.output.match(/print\(["'](.+?)["']\)/);
 *     if (match) {
 *       const message = match[1];
 *       await ctx.io.write(`output/print-${Date.now()}.txt`, message);
 *       return { captured: message };
 *     }
 *     return { captured: null };
 *   }
 * };
 * 
 * export default printHandler;
 */
