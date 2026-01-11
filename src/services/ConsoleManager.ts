/**
 * ConsoleManager service for capturing and managing console output
 * Implements requirements 2.4, 4.3, 4.4, 5.4 for console output capture and display
 */

import { ConsoleMessage, ErrorLog } from '../types/snippet';

export type ConsoleOutputCallback = (message: ConsoleMessage) => void;

export interface ErrorSuggestion {
  pattern: RegExp;
  suggestion: string;
  category: 'syntax' | 'runtime' | 'security' | 'performance' | 'dom';
}

export class ConsoleManager {
  private outputCallback?: ConsoleOutputCallback;
  private messageHistory: ConsoleMessage[] = [];
  private errorHistory: ErrorLog[] = [];
  private maxHistorySize: number = 1000;
  private errorSuggestions: ErrorSuggestion[] = [];

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize;
    this.initializeErrorSuggestions();
  }

  /**
   * Initialize common error patterns and their suggestions
   */
  private initializeErrorSuggestions(): void {
    this.errorSuggestions = [
      // Syntax errors
      {
        pattern: /Unexpected token/i,
        suggestion: 'Check for missing semicolons, brackets, or quotes. Verify proper JavaScript syntax.',
        category: 'syntax'
      },
      {
        pattern: /Unexpected end of input/i,
        suggestion: 'Missing closing bracket, parenthesis, or quote. Check code structure.',
        category: 'syntax'
      },
      {
        pattern: /Invalid or unexpected token/i,
        suggestion: 'Check for special characters or encoding issues in your code.',
        category: 'syntax'
      },

      // Runtime errors
      {
        pattern: /Cannot read propert(y|ies) of (null|undefined)/i,
        suggestion: 'Check if the object exists before accessing its properties. Use optional chaining (?.) or null checks.',
        category: 'runtime'
      },
      {
        pattern: /is not a function/i,
        suggestion: 'Verify the method exists and is callable. Check for typos in function names.',
        category: 'runtime'
      },
      {
        pattern: /Cannot set propert(y|ies) of (null|undefined)/i,
        suggestion: 'Ensure the target object is initialized before setting properties.',
        category: 'runtime'
      },

      // DOM errors
      {
        pattern: /Cannot read propert(y|ies) of null.*querySelector|getElementById/i,
        suggestion: 'Element not found. Check if the element exists in the DOM or wait for page load.',
        category: 'dom'
      },
      {
        pattern: /Node was not found/i,
        suggestion: 'DOM element may have been removed or not yet created. Check timing of DOM operations.',
        category: 'dom'
      },

      // Security errors
      {
        pattern: /Blocked a frame with origin.*from accessing a cross-origin frame/i,
        suggestion: 'Cross-origin access blocked. This is a browser security feature.',
        category: 'security'
      },
      {
        pattern: /Script error/i,
        suggestion: 'Generic script error, often due to cross-origin restrictions or blocked resources.',
        category: 'security'
      },

      // Performance errors
      {
        pattern: /Maximum call stack size exceeded/i,
        suggestion: 'Infinite recursion detected. Check for recursive function calls without proper exit conditions.',
        category: 'performance'
      },
      {
        pattern: /Script execution timeout/i,
        suggestion: 'Script took too long to execute. Check for infinite loops or heavy computations.',
        category: 'performance'
      }
    ];
  }

  /**
   * Get debugging suggestions for an error
   */
  private getErrorSuggestions(error: string): { suggestion: string; category: string }[] {
    const suggestions: { suggestion: string; category: string }[] = [];
    
    this.errorSuggestions.forEach(({ pattern, suggestion, category }) => {
      if (pattern.test(error)) {
        suggestions.push({ suggestion, category });
      }
    });

    return suggestions;
  }

  /**
   * Log detailed error with enhanced information and suggestions
   * Requirement 4.3, 4.4: Show detailed error information for debugging
   */
  logDetailedError(errorLog: ErrorLog): void {
    // Add to error history
    this.errorHistory.push(errorLog);
    
    // Trim error history if needed
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Get suggestions for this error
    const suggestions = this.getErrorSuggestions(errorLog.error);

    // Log the main error message
    this.addMessage({
      type: 'error',
      message: `❌ ${errorLog.snippetName}: ${errorLog.error}`,
      timestamp: errorLog.timestamp,
      source: 'snippet',
      snippetId: errorLog.snippetId
    });

    // Log location information if available
    if (errorLog.lineNumber || errorLog.columnNumber) {
      const location = `Line ${errorLog.lineNumber || '?'}:${errorLog.columnNumber || '?'}`;
      this.addMessage({
        type: 'error',
        message: `📍 Error location: ${location}`,
        timestamp: errorLog.timestamp,
        source: 'snippet',
        snippetId: errorLog.snippetId
      });
    }

    // Log stack trace if available and meaningful
    if (errorLog.stackTrace && errorLog.stackTrace !== 'No stack trace available') {
      // Clean up stack trace for better readability
      const cleanStackTrace = this.cleanStackTrace(errorLog.stackTrace);
      this.addMessage({
        type: 'error',
        message: `📋 Stack trace:\n${cleanStackTrace}`,
        timestamp: errorLog.timestamp,
        source: 'snippet',
        snippetId: errorLog.snippetId
      });
    }

    // Log suggestions if available
    suggestions.forEach(({ suggestion, category }) => {
      const categoryIcon = this.getCategoryIcon(category);
      this.addMessage({
        type: 'info',
        message: `${categoryIcon} Suggestion (${category}): ${suggestion}`,
        timestamp: errorLog.timestamp,
        source: 'snippet',
        snippetId: errorLog.snippetId
      });
    });

    // Log URL context if available
    if (errorLog.url && errorLog.url !== 'unknown') {
      this.addMessage({
        type: 'info',
        message: `🌐 Context: ${errorLog.url}`,
        timestamp: errorLog.timestamp,
        source: 'snippet',
        snippetId: errorLog.snippetId
      });
    }
  }

  /**
   * Clean up stack trace for better readability
   */
  private cleanStackTrace(stackTrace: string): string {
    return stackTrace
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 5) // Limit to first 5 lines
      .map(line => line.trim())
      .join('\n');
  }

  /**
   * Get icon for error category
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      syntax: '📝',
      runtime: '⚡',
      dom: '🏗️',
      security: '🔒',
      performance: '⏱️'
    };
    return icons[category] || '💡';
  }
  /**
   * Set the callback function for console output
   * Requirement 2.4: Capture console output from injected scripts
   */
  setOutputCallback(callback: ConsoleOutputCallback): void {
    this.outputCallback = callback;
  }

  /**
   * Add a console message to the history and notify callback
   * Requirement 4.3, 4.4: Display script output and errors in readable format
   */
  addMessage(message: ConsoleMessage): void {
    // Add timestamp if not provided
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date()
    };

    // Add to history
    this.messageHistory.push(messageWithTimestamp);

    // Trim history if it exceeds max size
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }

    // Notify callback
    if (this.outputCallback) {
      this.outputCallback(messageWithTimestamp);
    }
  }

  /**
   * Enhanced error logging with better context
   * Requirement 4.3, 4.4: Show detailed error information for debugging
   */
  logError(error: Error, snippetId?: string, context?: string): void {
    const errorMessage = context 
      ? `${context}: ${error.message}`
      : error.message;

    // Create detailed error log
    const errorLog: ErrorLog = {
      snippetId: snippetId || 'unknown',
      snippetName: snippetId ? `Snippet ${snippetId.slice(0, 8)}` : 'Anonymous script',
      error: error.message,
      stackTrace: error.stack || 'No stack trace available',
      timestamp: new Date(),
      url: 'unknown',
      lineNumber: (error as any).lineNumber,
      columnNumber: (error as any).columnNumber
    };

    this.logDetailedError(errorLog);
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorLog[] {
    return [...this.errorHistory];
  }

  /**
   * Get errors by snippet ID
   */
  getErrorsBySnippet(snippetId: string): ErrorLog[] {
    return this.errorHistory.filter(error => error.snippetId === snippetId);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySnippet: Record<string, number>;
    recentErrors: ErrorLog[];
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySnippet: Record<string, number> = {};

    this.errorHistory.forEach(error => {
      // Count by snippet
      errorsBySnippet[error.snippetId] = (errorsBySnippet[error.snippetId] || 0) + 1;

      // Categorize error
      const suggestions = this.getErrorSuggestions(error.error);
      const category = suggestions.length > 0 ? suggestions[0].category : 'unknown';
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
    });

    // Get recent errors (last 10)
    const recentErrors = this.errorHistory.slice(-10);

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySnippet,
      recentErrors
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Clear errors for a specific snippet
   */
  clearSnippetErrors(snippetId: string): void {
    this.errorHistory = this.errorHistory.filter(error => error.snippetId !== snippetId);
  }

  /**
   * Log a message from a snippet
   * Requirement 5.4: Provide immediate feedback through console panel
   */
  logFromSnippet(type: ConsoleMessage['type'], message: string, snippetId?: string): void {
    this.addMessage({
      type,
      message,
      timestamp: new Date(),
      source: 'snippet',
      snippetId
    });
  }

  /**
   * Log a message from the page
   */
  logFromPage(type: ConsoleMessage['type'], message: string): void {
    this.addMessage({
      type,
      message,
      timestamp: new Date(),
      source: 'page'
    });
  }

  /**
   * Log execution information
   */
  logExecution(snippetName: string, snippetId: string, success: boolean, executionTime?: number): void {
    const message = success 
      ? `✅ Executed "${snippetName}" successfully${executionTime ? ` (${executionTime}ms)` : ''}`
      : `❌ Failed to execute "${snippetName}"`;

    this.addMessage({
      type: success ? 'info' : 'error',
      message,
      timestamp: new Date(),
      source: 'snippet',
      snippetId
    });
  }

  /**
   * Get all messages in history
   */
  getHistory(): ConsoleMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Get messages filtered by source
   */
  getMessagesBySource(source: ConsoleMessage['source']): ConsoleMessage[] {
    return this.messageHistory.filter(msg => msg.source === source);
  }

  /**
   * Get messages filtered by snippet ID
   */
  getMessagesBySnippet(snippetId: string): ConsoleMessage[] {
    return this.messageHistory.filter(msg => msg.snippetId === snippetId);
  }

  /**
   * Clear all console messages
   */
  clear(): void {
    this.messageHistory = [];
  }

  /**
   * Clear messages from a specific snippet
   */
  clearSnippetMessages(snippetId: string): void {
    this.messageHistory = this.messageHistory.filter(msg => msg.snippetId !== snippetId);
    this.clearSnippetErrors(snippetId);
  }

  /**
   * Get message count by type
   */
  getMessageCounts(): Record<ConsoleMessage['type'], number> {
    const counts: Record<ConsoleMessage['type'], number> = {
      log: 0,
      error: 0,
      warn: 0,
      info: 0,
      auto: 0
    };

    this.messageHistory.forEach(msg => {
      counts[msg.type]++;
    });

    return counts;
  }

  /**
   * Export console history as text with enhanced formatting
   */
  exportAsText(): string {
    const messages = this.messageHistory
      .map(msg => {
        const timestamp = msg.timestamp.toISOString();
        const source = msg.snippetId ? `[${msg.snippetId.slice(0, 8)}]` : `[${msg.source}]`;
        const type = msg.type.toUpperCase();
        return `${timestamp} ${source} ${type}: ${msg.message}`;
      })
      .join('\n');

    const errors = this.errorHistory
      .map(error => {
        const timestamp = error.timestamp.toISOString();
        const location = error.lineNumber ? ` (Line ${error.lineNumber}:${error.columnNumber || 0})` : '';
        return `${timestamp} [${error.snippetId.slice(0, 8)}] ERROR${location}: ${error.error}\nStack: ${error.stackTrace}`;
      })
      .join('\n\n');

    return `=== CONSOLE MESSAGES ===\n${messages}\n\n=== DETAILED ERRORS ===\n${errors}`;
  }

  /**
   * Export console history as JSON with enhanced data
   */
  exportAsJSON(): string {
    return JSON.stringify({
      messages: this.messageHistory,
      errors: this.errorHistory,
      statistics: this.getErrorStatistics(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Export error report for debugging
   */
  exportErrorReport(): string {
    const stats = this.getErrorStatistics();
    
    let report = `=== ERROR REPORT ===\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Errors: ${stats.totalErrors}\n\n`;

    report += `=== ERRORS BY CATEGORY ===\n`;
    Object.entries(stats.errorsByCategory).forEach(([category, count]) => {
      report += `${category}: ${count}\n`;
    });

    report += `\n=== ERRORS BY SNIPPET ===\n`;
    Object.entries(stats.errorsBySnippet).forEach(([snippetId, count]) => {
      report += `${snippetId.slice(0, 8)}: ${count}\n`;
    });

    report += `\n=== RECENT ERRORS ===\n`;
    stats.recentErrors.forEach(error => {
      const location = error.lineNumber ? ` (Line ${error.lineNumber}:${error.columnNumber || 0})` : '';
      report += `${error.timestamp.toISOString()} - ${error.snippetName}${location}: ${error.error}\n`;
    });

    return report;
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    if (this.messageHistory.length > size) {
      this.messageHistory = this.messageHistory.slice(-size);
    }
  }
}

/**
 * Global console manager instance
 */
export const consoleManager = new ConsoleManager();