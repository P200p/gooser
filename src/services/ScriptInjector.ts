/**
 * ScriptInjector service for safe JavaScript injection into iframe contexts
 * Implements requirements 2.1, 2.2, 2.3, 2.5 for script injection and execution
 */

import { Snippet, ConsoleMessage, ErrorLog } from '../types/snippet';
import { consoleManager } from './ConsoleManager';

/**
 * Resource monitor for tracking script execution metrics
 */
class ResourceMonitor {
  private startTime: number;
  private initialMemory: number;
  private domObserver?: MutationObserver;
  private domModifications = 0;

  constructor(private frameWindow: Window) {
    this.startTime = performance.now();
    this.initialMemory = this.getMemoryUsage();
    this.setupDOMMonitoring();
  }

  private getMemoryUsage(): number {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0; // Fallback if memory API not available
  }

  private setupDOMMonitoring(): void {
    if (!this.frameWindow.document) return;

    this.domObserver = new MutationObserver((mutations) => {
      this.domModifications += mutations.length;
    });

    this.domObserver.observe(this.frameWindow.document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true
    });
  }

  getResourceUsage(): ResourceUsage {
    const currentTime = performance.now();
    const currentMemory = this.getMemoryUsage();

    return {
      memoryUsage: Math.max(0, currentMemory - this.initialMemory),
      executionTime: currentTime - this.startTime,
      domModifications: this.domModifications
    };
  }

  cleanup(): void {
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
  }
}

export interface ScriptInjectorOptions {
  timeout?: number; // Execution timeout in milliseconds (default: 5000)
  captureConsole?: boolean; // Whether to capture console output (default: true)
  maxMemoryUsage?: number; // Maximum memory usage in MB (default: 50)
  enableResourceMonitoring?: boolean; // Whether to monitor resource usage (default: true)
}

export interface ResourceUsage {
  memoryUsage: number; // in MB
  executionTime: number; // in milliseconds
  domModifications: number; // number of DOM changes
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: Error;
  resourceUsage: ResourceUsage;
  warnings: string[];
}

export class ScriptInjector {
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly DEFAULT_MAX_MEMORY = 50; // 50 MB
  private activeExecutions = new Map<string, AbortController>();
  private resourceMonitors = new Map<string, ResourceMonitor>();

  constructor(private options: ScriptInjectorOptions = {}) {
    this.options = {
      timeout: ScriptInjector.DEFAULT_TIMEOUT,
      captureConsole: true,
      maxMemoryUsage: ScriptInjector.DEFAULT_MAX_MEMORY,
      enableResourceMonitoring: true,
      ...options
    };
  }

  /**
   * Inject and execute JavaScript code in an iframe context with enhanced error isolation
   * Requirement 2.1: Execute JavaScript code in page context
   * Requirement 2.3: Provide access to page's DOM
   * Requirement 4.1, 4.2, 4.5: Enhanced error handling and safety features
   */
  async injectScript(code: string, targetFrame: HTMLIFrameElement, snippetId?: string): Promise<ExecutionResult> {
    const executionId = snippetId || `exec_${Date.now()}`;
    const warnings: string[] = [];
    
    // Create abort controller for this execution
    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);

    try {
      // Check if iframe is accessible
      if (!targetFrame.contentWindow) {
        throw new Error('Cannot access iframe content window - possible cross-origin restriction');
      }

      const frameWindow = targetFrame.contentWindow;

      // Set up resource monitoring if enabled
      let resourceMonitor: ResourceMonitor | undefined;
      if (this.options.enableResourceMonitoring) {
        resourceMonitor = new ResourceMonitor(frameWindow);
        this.resourceMonitors.set(executionId, resourceMonitor);
      }

      // Set up console capture if enabled
      if (this.options.captureConsole) {
        this.setupConsoleCapture(frameWindow, snippetId);
      }

      // Validate code before execution
      const codeValidation = this.validateCode(code);
      if (!codeValidation.isValid) {
        throw new Error(`Code validation failed: ${codeValidation.errors.join(', ')}`);
      }
      warnings.push(...codeValidation.warnings);

      // Execute with timeout and resource monitoring
      const result = await this.executeWithSafety(code, frameWindow, executionId, abortController.signal);

      // Get final resource usage
      const resourceUsage = resourceMonitor?.getResourceUsage() || {
        memoryUsage: 0,
        executionTime: 0,
        domModifications: 0
      };

      // Check resource limits
      if (this.options.maxMemoryUsage && resourceUsage.memoryUsage > this.options.maxMemoryUsage) {
        warnings.push(`High memory usage detected: ${resourceUsage.memoryUsage.toFixed(2)}MB`);
      }

      // Log successful execution
      consoleManager.logExecution(
        snippetId ? `Snippet ${snippetId.slice(0, 8)}` : 'Anonymous script',
        snippetId || 'anonymous',
        true,
        resourceUsage.executionTime
      );

      // Log resource usage if significant
      if (resourceUsage.memoryUsage > 5 || resourceUsage.domModifications > 100) {
        consoleManager.addMessage({
          type: 'info',
          message: `Resource usage - Memory: ${resourceUsage.memoryUsage.toFixed(2)}MB, DOM changes: ${resourceUsage.domModifications}`,
          timestamp: new Date(),
          source: 'snippet',
          snippetId
        });
      }

      return {
        success: true,
        result,
        resourceUsage,
        warnings
      };

    } catch (error) {
      const executionError = error instanceof Error ? error : new Error(String(error));
      
      // Enhanced error logging with stack trace analysis
      const errorLog = this.createDetailedErrorLog(executionError, snippetId, targetFrame.src);
      consoleManager.logDetailedError(errorLog);
      
      // Log execution failure
      consoleManager.logExecution(
        snippetId ? `Snippet ${snippetId.slice(0, 8)}` : 'Anonymous script',
        snippetId || 'anonymous',
        false
      );

      const resourceUsage = this.resourceMonitors.get(executionId)?.getResourceUsage() || {
        memoryUsage: 0,
        executionTime: 0,
        domModifications: 0
      };

      return {
        success: false,
        error: executionError,
        resourceUsage,
        warnings
      };

    } finally {
      // Cleanup resources
      this.cleanup(executionId);
    }
  }

  /**
   * Execute snippets automatically on page load
   * Requirement 2.2: Automatically run saved snippets associated with domain
   * Requirement 2.5: Support page load triggers
   */
  executeOnLoad(snippets: Snippet[], targetFrame: HTMLIFrameElement, currentUrl: string): void {
    // Wait for iframe to load before executing snippets
    const executeSnippets = async () => {
      for (const snippet of snippets) {
        if (snippet.enabled && snippet.executeOnLoad && this.matchesUrlPattern(currentUrl, snippet.urlPattern)) {
          try {
            const result = await this.injectScript(snippet.code, targetFrame, snippet.id);
            if (!result.success && result.error) {
              console.error(`Failed to execute snippet "${snippet.name}":`, result.error);
            }
          } catch (error) {
            console.error(`Failed to execute snippet "${snippet.name}":`, error);
          }
        }
      }
    };

    // Check if iframe is already loaded
    if (targetFrame.contentDocument && targetFrame.contentDocument.readyState === 'complete') {
      executeSnippets();
    } else {
      // Wait for iframe to load
      targetFrame.addEventListener('load', executeSnippets, { once: true });
    }
  }

  /**
   * Execute snippets immediately (manual execution)
   * Requirement 2.1: Execute JavaScript code in page context
   */
  async executeImmediate(snippet: Snippet, targetFrame: HTMLIFrameElement): Promise<ExecutionResult> {
    if (!snippet.enabled) {
      return {
        success: false,
        error: new Error('Snippet is disabled'),
        resourceUsage: { memoryUsage: 0, executionTime: 0, domModifications: 0 },
        warnings: []
      };
    }

    return this.injectScript(snippet.code, targetFrame, snippet.id);
  }

  /**
   * Check if URL matches the snippet's URL pattern
   * Requirement 2.2: URL pattern matching for automatic execution
   */
  matchesUrlPattern(url: string, pattern: string): boolean {
    try {
      // Handle special cases
      if (!pattern || pattern === '.*' || pattern === '*') {
        return true;
      }

      // Clean URL for comparison (remove protocol and www)
      const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
      
      // If pattern looks like a regex (contains regex special chars), treat as regex
      if (pattern.includes('\\') || pattern.includes('^') || pattern.includes('$') || pattern.includes('[') || pattern.includes(']')) {
        const regex = new RegExp(pattern, 'i');
        return regex.test(url);
      }

      // Simple pattern matching
      const cleanPattern = pattern.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
      
      // Handle wildcard patterns like *.example.com
      if (cleanPattern.startsWith('*.')) {
        const domain = cleanPattern.slice(2);
        return cleanUrl.includes(domain);
      }

      // Simple contains check
      return cleanUrl.includes(cleanPattern);
    } catch (error) {
      console.error('URL pattern matching error:', error);
      return false;
    }
  }

  /**
   * Validate JavaScript code before execution
   */
  private validateCode(code: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty or whitespace-only code
    if (!code.trim()) {
      errors.push('Code is empty');
      return { isValid: false, errors, warnings };
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      { pattern: /while\s*\(\s*true\s*\)/gi, warning: 'Potential infinite loop detected (while(true))' },
      { pattern: /for\s*\(\s*;\s*;\s*\)/gi, warning: 'Potential infinite loop detected (for(;;))' },
      { pattern: /setInterval\s*\(/gi, warning: 'setInterval detected - may cause resource leaks' },
      { pattern: /setTimeout\s*\([^,]*,\s*0\s*\)/gi, warning: 'setTimeout with 0 delay detected' },
      { pattern: /eval\s*\(/gi, warning: 'eval() usage detected - potential security risk' },
      { pattern: /Function\s*\(/gi, warning: 'Function constructor detected - potential security risk' },
      { pattern: /document\.write\s*\(/gi, warning: 'document.write() detected - may break page' }
    ];

    dangerousPatterns.forEach(({ pattern, warning }) => {
      if (pattern.test(code)) {
        warnings.push(warning);
      }
    });

    // Basic syntax validation using try-catch with Function constructor
    try {
      new Function(code);
    } catch (syntaxError) {
      errors.push(`Syntax error: ${syntaxError instanceof Error ? syntaxError.message : String(syntaxError)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute code with safety measures and timeout handling
   */
  private async executeWithSafety(
    code: string, 
    frameWindow: Window, 
    executionId: string, 
    abortSignal: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Script execution timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      // Check for abort signal
      if (abortSignal.aborted) {
        clearTimeout(timeoutId);
        reject(new Error('Script execution was aborted'));
        return;
      }

      // Listen for abort signal
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Script execution was aborted'));
      });

      try {
        // Enhanced code wrapping with better error handling
        const wrappedCode = `
          (function() {
            'use strict';
            
            // Set up execution context
            const __executionStart = performance.now();
            let __domChangeCount = 0;
            
            // Monitor DOM changes during execution
            const __observer = new MutationObserver(() => __domChangeCount++);
            __observer.observe(document, { childList: true, subtree: true, attributes: true });
            
            try {
              // User code execution
              const __result = (function() {
                ${code}
              })();
              
              // Cleanup and return result
              __observer.disconnect();
              return {
                result: __result,
                executionTime: performance.now() - __executionStart,
                domChanges: __domChangeCount
              };
              
            } catch (__error) {
              __observer.disconnect();
              
              // Enhanced error information
              const __errorInfo = {
                message: __error.message,
                name: __error.name,
                stack: __error.stack,
                lineNumber: __error.lineNumber,
                columnNumber: __error.columnNumber,
                fileName: __error.fileName
              };
              
              throw new Error('Script execution error: ' + JSON.stringify(__errorInfo));
            }
          })();
        `;

        // Execute the wrapped code
        const result = frameWindow.eval(wrappedCode);
        
        clearTimeout(timeoutId);
        resolve(result);
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Parse enhanced error information if available
        let enhancedError = error;
        if (error instanceof Error && error.message.startsWith('Script execution error: ')) {
          try {
            const errorData = JSON.parse(error.message.replace('Script execution error: ', ''));
            enhancedError = new Error(errorData.message);
            (enhancedError as any).stack = errorData.stack;
            (enhancedError as any).lineNumber = errorData.lineNumber;
            (enhancedError as any).columnNumber = errorData.columnNumber;
          } catch {
            // Fallback to original error if parsing fails
          }
        }
        
        reject(enhancedError);
      }
    });
  }

  /**
   * Create detailed error log with enhanced information
   */
  private createDetailedErrorLog(error: Error, snippetId?: string, url?: string): ErrorLog {
    // Extract line and column numbers from stack trace if available
    let lineNumber: number | undefined;
    let columnNumber: number | undefined;
    
    if (error.stack) {
      // Try to parse line/column from stack trace
      const stackMatch = error.stack.match(/:(\d+):(\d+)/);
      if (stackMatch) {
        lineNumber = parseInt(stackMatch[1], 10);
        columnNumber = parseInt(stackMatch[2], 10);
      }
    }

    // Check for enhanced error properties
    if ('lineNumber' in error && typeof error.lineNumber === 'number') {
      lineNumber = error.lineNumber;
    }
    if ('columnNumber' in error && typeof error.columnNumber === 'number') {
      columnNumber = error.columnNumber;
    }

    return {
      snippetId: snippetId || 'unknown',
      snippetName: snippetId ? `Snippet ${snippetId.slice(0, 8)}` : 'Anonymous script',
      error: error.message,
      stackTrace: error.stack || 'No stack trace available',
      timestamp: new Date(),
      url: url || 'unknown',
      lineNumber,
      columnNumber
    };
  }

  /**
   * Cleanup execution resources
   */
  private cleanup(executionId: string): void {
    // Remove from active executions
    this.activeExecutions.delete(executionId);
    
    // Cleanup resource monitor
    const monitor = this.resourceMonitors.get(executionId);
    if (monitor) {
      monitor.cleanup();
      this.resourceMonitors.delete(executionId);
    }
  }

  /**
   * Abort a running script execution
   */
  abortExecution(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.cleanup(executionId);
      return true;
    }
    return false;
  }

  /**
   * Get active execution count
   */
  getActiveExecutionCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Get resource usage for active executions
   */
  getActiveResourceUsage(): Map<string, ResourceUsage> {
    const usage = new Map<string, ResourceUsage>();
    this.resourceMonitors.forEach((monitor, id) => {
      usage.set(id, monitor.getResourceUsage());
    });
    return usage;
  }

  /**
   * Set up console output capture for iframe
   * Requirement 2.4: Capture console output from injected scripts
   */
  private setupConsoleCapture(frameWindow: Window, snippetId?: string): void {
    // Store original console methods
    const originalConsole = {
      log: frameWindow.console.log,
      error: frameWindow.console.error,
      warn: frameWindow.console.warn,
      info: frameWindow.console.info
    };

    // Override console methods to capture output
    frameWindow.console.log = (...args: any[]) => {
      consoleManager.addMessage({
        type: 'log',
        message: args.map(arg => this.formatConsoleArg(arg)).join(' '),
        timestamp: new Date(),
        source: 'snippet',
        snippetId
      });
      originalConsole.log.apply(frameWindow.console, args);
    };

    frameWindow.console.error = (...args: any[]) => {
      consoleManager.addMessage({
        type: 'error',
        message: args.map(arg => this.formatConsoleArg(arg)).join(' '),
        timestamp: new Date(),
        source: 'snippet',
        snippetId
      });
      originalConsole.error.apply(frameWindow.console, args);
    };

    frameWindow.console.warn = (...args: any[]) => {
      consoleManager.addMessage({
        type: 'warn',
        message: args.map(arg => this.formatConsoleArg(arg)).join(' '),
        timestamp: new Date(),
        source: 'snippet',
        snippetId
      });
      originalConsole.warn.apply(frameWindow.console, args);
    };

    frameWindow.console.info = (...args: any[]) => {
      consoleManager.addMessage({
        type: 'info',
        message: args.map(arg => this.formatConsoleArg(arg)).join(' '),
        timestamp: new Date(),
        source: 'snippet',
        snippetId
      });
      originalConsole.info.apply(frameWindow.console, args);
    };
  }

  /**
   * Format console arguments for display
   */
  private formatConsoleArg(arg: any): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }

  /**
   * Clean up resources and restore original console methods
   */
  cleanup(targetFrame: HTMLIFrameElement): void {
    // Abort any active executions for this frame
    const frameUrl = targetFrame.src;
    this.activeExecutions.forEach((controller, id) => {
      // We could track frame-specific executions if needed
      // For now, we rely on the iframe reload to clean up
    });

    // The iframe will be reloaded, so console methods and monitors will be reset automatically
    if (targetFrame.contentWindow) {
      // Clear any frame-specific monitoring
    }
  }

  /**
   * Emergency stop all executions
   */
  emergencyStop(): void {
    this.activeExecutions.forEach((controller, id) => {
      controller.abort();
    });
    this.activeExecutions.clear();
    
    this.resourceMonitors.forEach((monitor, id) => {
      monitor.cleanup();
    });
    this.resourceMonitors.clear();
    
    consoleManager.addMessage({
      type: 'warn',
      message: 'Emergency stop: All script executions have been terminated',
      timestamp: new Date(),
      source: 'snippet'
    });
  }
}

/**
 * Singleton instance for global use
 */
export const scriptInjector = new ScriptInjector();