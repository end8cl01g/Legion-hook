/**
 * IO Tracker
 * 
 * Manages confined I/O operations for the Legion kernel.
 * All read/write operations are logged and restricted to the legion directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IOOperation } from '../types';

export class IOTracker {
  private operations: IOOperation[] = [];
  private confinedRoot: string;
  private logFile: string | null = null;

  constructor(rootPath: string) {
    this.confinedRoot = rootPath;
    this.ensureDirectories();
    this.startLog();
  }

  /**
   * Read a file from the confined IO directory
   */
  async read(relativePath: string): Promise<string | null> {
    const safePath = this.sanitizePath(relativePath, 'read');
    
    const logOp: IOOperation = {
      type: 'read',
      path: safePath,
      timestamp: Date.now()
    };

    try {
      if (fs.existsSync(safePath)) {
        const content = fs.readFileSync(safePath, 'utf-8');
        this.logOperation(logOp);
        return content;
      }
      return null;
    } catch (error) {
      this.logOperation({ ...logOp, error: String(error) });
      throw new Error(`IO read failed: ${error}`);
    }
  }

  /**
   * Write a file to the confined IO directory
   */
  async write(relativePath: string, content: string): Promise<void> {
    const safePath = this.sanitizePath(relativePath, 'write');
    
    const logOp: IOOperation = {
      type: 'write',
      path: safePath,
      content,
      timestamp: Date.now()
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(safePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(safePath, content, 'utf-8');
      this.logOperation(logOp);
    } catch (error) {
      this.logOperation({ ...logOp, error: String(error) });
      throw new Error(`IO write failed: ${error}`);
    }
  }

  /**
   * Append to a file
   */
  async append(relativePath: string, content: string): Promise<void> {
    const safePath = this.sanitizePath(relativePath, 'write');
    
    const logOp: IOOperation = {
      type: 'append',
      path: safePath,
      content,
      timestamp: Date.now()
    };

    try {
      const dir = path.dirname(safePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.appendFileSync(safePath, content, 'utf-8');
      this.logOperation(logOp);
    } catch (error) {
      this.logOperation({ ...logOp, error: String(error) });
      throw new Error(`IO append failed: ${error}`);
    }
  }

  /**
   * Check if a file exists
   */
  exists(relativePath: string): boolean {
    const safePath = this.sanitizePath(relativePath, 'read');
    return fs.existsSync(safePath);
  }

  /**
   * Delete a file
   */
  async delete(relativePath: string): Promise<void> {
    const safePath = this.sanitizePath(relativePath, 'write');
    
    const logOp: IOOperation = {
      type: 'delete',
      path: safePath,
      timestamp: Date.now()
    };

    try {
      if (fs.existsSync(safePath)) {
        fs.unlinkSync(safePath);
      }
      this.logOperation(logOp);
    } catch (error) {
      this.logOperation({ ...logOp, error: String(error) });
      throw new Error(`IO delete failed: ${error}`);
    }
  }

  /**
   * List files in a directory
   */
  list(relativePath: string = ''): string[] {
    const safePath = this.sanitizePath(relativePath, 'read');
    
    try {
      if (fs.existsSync(safePath)) {
        return fs.readdirSync(safePath);
      }
      return [];
    } catch (error) {
      console.error(`[IOTracker] List failed:`, error);
      return [];
    }
  }

  /**
   * Get all logged operations
   */
  getOperations(): IOOperation[] {
    return [...this.operations];
  }

  /**
   * Get operations filtered by type
   */
  getOperationsByType(type: 'read' | 'write' | 'append' | 'delete'): IOOperation[] {
    return this.operations.filter(op => op.type === type);
  }

  /**
   * Clear operation log
   */
  clearLog(): void {
    this.operations = [];
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Sanitize and confine path to legion directory
   */
  private sanitizePath(relativePath: string, operation: string): string {
    // Remove any path traversal attempts
    const sanitized = relativePath.replace(/\.\./g, '').replace(/^\/+/, '');
    
    // Determine target subdirectory based on operation
    let targetDir: string;
    switch (operation) {
      case 'read':
        targetDir = path.join(this.confinedRoot, 'io', 'read');
        break;
      case 'write':
      case 'append':
      case 'delete':
        targetDir = path.join(this.confinedRoot, 'io', 'write');
        break;
      default:
        targetDir = path.join(this.confinedRoot, 'io');
    }

    const safePath = path.join(targetDir, sanitized);

    // Enforce confinement - path must start with confined root
    if (!safePath.startsWith(this.confinedRoot)) {
      throw new Error(
        `IO confinement violation: ${operation} attempt to escape legion directory. ` +
        `Requested: ${relativePath}, Resolved: ${safePath}`
      );
    }

    return safePath;
  }

  /**
   * Ensure IO directory structure exists
   */
  private ensureDirectories(): void {
    const dirs = [
      path.join(this.confinedRoot, 'io', 'read'),
      path.join(this.confinedRoot, 'io', 'write'),
      path.join(this.confinedRoot, 'state')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create .gitkeep files
    const keepFiles = [
      path.join(this.confinedRoot, 'io', 'read', '.gitkeep'),
      path.join(this.confinedRoot, 'io', 'write', '.gitkeep')
    ];
    for (const file of keepFiles) {
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '', 'utf-8');
      }
    }
  }

  /**
   * Start daily IO log file
   */
  private startLog(): void {
    const today = new Date().toISOString().split('T')[0];
    this.logFile = path.join(
      this.confinedRoot,
      'state',
      `io-log-${today}.jsonl`
    );
  }

  /**
   * Log an operation to the daily log file
   */
  private logOperation(op: IOOperation): void {
    this.operations.push(op);

    if (this.logFile) {
      try {
        // Check if we need a new log file (new day)
        const today = new Date().toISOString().split('T')[0];
        if (!this.logFile.includes(today)) {
          this.startLog();
        }

        fs.appendFileSync(this.logFile, JSON.stringify(op) + '\n');
      } catch (error) {
        console.error('[IOTracker] Failed to write log:', error);
      }
    }
  }
}

export default IOTracker;
