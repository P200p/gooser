/**
 * Property-based tests for error isolation and handling
 * Feature: snippet-embedding-browser, Property 7: Error Isolation and Handling
 * Validates: Requirements 4.1, 4.5
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ScriptInjector } from './ScriptInjector';
import { consoleManager } from './ConsoleManager';

// Mock console manager to avoid side effects
vi.mock('./ConsoleManager', () => ({
  consoleManager: {
    addMessage: vi.fn(),
    logError: vi.fn(),
    logExecution: vi.fn(),
    logDetailedError: vi.fn(),
  }
}));

describe('ScriptInjector Error Isolation Property Tests', () => {
  let scriptInjector: ScriptInjector;
  let mockIframe: HTMLIFrameElement;
  let mockWindow: Window;
  let mockDocument: Document;

  beforeEach(() => {
    scriptInjector = new ScriptInjector();
    
    // Create a mock iframe with a mock contentWindow and document
    mockDocument = {
      createElement: vi.fn((tagName: string) => ({
        tagName: tagName.toUpperCase(),
        id: '',
        className: '',
        textContent: '',
        innerHTML: '',
        style: {},
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
      })),
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        innerHTML: '',
        style: {},
      },
      readyState: 'complete',
    } as any;

    mockWindow = {
      document: mockDocument,
      console: {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      },
      eval: vi.fn(),
      performance: {
        now: vi.fn(() => Date.now()),
      },
      MutationObserver: vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
      })),
    } as any;

    mockIframe = {
      contentWindow: mockWindow,
      contentDocument: mockDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      src: 'https://example.com',
    } as any;

    // Clear all mocks
    vi.clearAllMocks();
  });

  /**
   * Property 7: Error Isolation and Handling
   * For any JavaScript code containing syntax errors or runtime exceptions, 
   * executing that code should display appropriate error messages without crashing 
   * the browser interface or affecting other snippets.
   * Validates: Requirements 4.1, 4.5
   */
  it('should isolate syntax errors without crashing the browser interface', async () => {
    // Generator for various types of syntax errors
    const syntaxErrorArbitrary = fc.oneof(
      fc.constant('function unclosed() { console.log("missing brace");'), // Missing closing brace
      fc.constant('var x = [1, 2, 3; console.log(x);'), // Missing closing bracket
      fc.constant('if (true { console.log("missing parenthesis"); }'), // Missing closing parenthesis
      fc.constant('console.log("unterminated string;'), // Unterminated string
      fc.constant('var x = {key: "value", another: }; console.log(x);'), // Trailing comma in object
      fc.constant('function test() return "no braces"; }'), // Missing opening brace
      fc.constant('var x = 1 + + 2; console.log(x);'), // Invalid operator sequence
      fc.constant('123abc = "invalid variable name";'), // Invalid variable name
      fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s.replace(/['"]/g, '')}(`), // Random invalid syntax
    );

    await fc.assert(
      fc.asyncProperty(
        syntaxErrorArbitrary,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        async (invalidCode, snippetId) => {
          // Mock eval to throw syntax error
          mockWindow.eval = vi.fn().mockImplementation(() => {
            throw new SyntaxError('Unexpected token');
          });

          // Execute the script injection
          const result = await scriptInjector.injectScript(invalidCode, mockIframe, snippetId);

          // Verify error isolation - execution should fail gracefully
          expect(result.success).toBe(false);
          expect(result.error).toBeInstanceOf(Error);

          // Verify error was logged appropriately
          expect(consoleManager.logDetailedError).toHaveBeenCalledWith(
            expect.objectContaining({
              snippetId,
              error: expect.any(String),
              stackTrace: expect.any(String),
              timestamp: expect.any(Date),
            })
          );

          // Verify execution failure was logged
          expect(consoleManager.logExecution).toHaveBeenCalledWith(
            expect.stringContaining(snippetId.slice(0, 8)),
            snippetId,
            false
          );

          // Verify the browser interface remains functional (no uncaught exceptions)
          // The ScriptInjector should have caught and handled the error
          expect(mockWindow.eval).toHaveBeenCalledOnce();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should isolate runtime errors without affecting other snippets', async () => {
    // Generator for various types of runtime errors
    const runtimeErrorArbitrary = fc.oneof(
      fc.constant('undefined.property;'), // Accessing property of undefined
      fc.constant('null.method();'), // Calling method on null
      fc.constant('nonExistentFunction();'), // Calling non-existent function
      fc.constant('document.nonExistentMethod();'), // Calling non-existent DOM method
      fc.constant('throw new Error("Custom error");'), // Explicit error throwing
      fc.constant('JSON.parse("invalid json");'), // JSON parsing error
      fc.constant('new Date().nonExistentMethod();'), // Method doesn't exist on Date
      fc.constant('window.nonExistent.property;'), // Accessing nested property on undefined
      fc.string({ minLength: 1, maxLength: 30 }).map(s => `throw new Error("${s.replace(/"/g, '\\"')}");`),
    );

    await fc.assert(
      fc.asyncProperty(
        fc.array(runtimeErrorArbitrary, { minLength: 1, maxLength: 3 }),
        async (errorCodes) => {
          const results: any[] = [];
          
          // Execute each error-prone snippet independently
          for (let i = 0; i < errorCodes.length; i++) {
            const snippetId = `error-snippet-${i}`;
            
            // Mock eval to throw runtime error for this specific snippet
            mockWindow.eval = vi.fn().mockImplementation(() => {
              throw new Error(`Runtime error in snippet ${i}`);
            });

            const result = await scriptInjector.injectScript(errorCodes[i], mockIframe, snippetId);
            results.push(result);

            // Verify this snippet's error was isolated
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);

            // Verify error logging for this snippet
            expect(consoleManager.logDetailedError).toHaveBeenCalledWith(
              expect.objectContaining({
                snippetId,
                error: expect.any(String),
              })
            );
          }

          // Verify all snippets failed independently (isolation working)
          expect(results).toHaveLength(errorCodes.length);
          results.forEach(result => {
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
          });

          // Verify each snippet was attempted (no early termination due to previous errors)
          expect(mockWindow.eval).toHaveBeenCalledTimes(errorCodes.length);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle cross-origin restrictions gracefully', async () => {
    // Generator for scenarios that might trigger cross-origin errors
    const crossOriginScenarioArbitrary = fc.record({
      code: fc.oneof(
        fc.constant('window.parent.document.title;'), // Accessing parent frame
        fc.constant('window.top.location.href;'), // Accessing top frame
        fc.constant('frames[0].document.body;'), // Accessing other frames
        fc.constant('document.domain = "other-domain.com";'), // Changing document domain
      ),
      iframeAccessible: fc.boolean(),
    });

    await fc.assert(
      fc.asyncProperty(
        crossOriginScenarioArbitrary,
        fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
        async (scenario, snippetId) => {
          if (!scenario.iframeAccessible) {
            // Mock iframe with no contentWindow (cross-origin restriction)
            const restrictedIframe = {
              ...mockIframe,
              contentWindow: null,
            } as HTMLIFrameElement;

            const result = await scriptInjector.injectScript(scenario.code, restrictedIframe, snippetId);

            // Verify cross-origin restriction is handled gracefully
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toContain('cross-origin');

            // Verify appropriate error logging
            expect(consoleManager.logDetailedError).toHaveBeenCalledWith(
              expect.objectContaining({
                snippetId,
                error: expect.stringContaining('cross-origin'),
              })
            );
          } else {
            // Mock eval to throw security error
            mockWindow.eval = vi.fn().mockImplementation(() => {
              throw new Error('SecurityError: Blocked a frame with origin');
            });

            const result = await scriptInjector.injectScript(scenario.code, mockIframe, snippetId);

            // Verify security error is handled gracefully
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);

            // Verify error logging
            expect(consoleManager.logDetailedError).toHaveBeenCalled();
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should provide detailed error information for debugging', async () => {
    // Generator for errors with various stack trace patterns
    const errorWithStackArbitrary = fc.record({
      errorType: fc.oneof(
        fc.constant('SyntaxError'),
        fc.constant('ReferenceError'),
        fc.constant('TypeError'),
        fc.constant('RangeError'),
      ),
      message: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
      lineNumber: fc.integer({ min: 1, max: 100 }),
      columnNumber: fc.integer({ min: 1, max: 50 }),
    });

    await fc.assert(
      fc.asyncProperty(
        errorWithStackArbitrary,
        fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
        async (errorInfo, snippetId) => {
          // Create a mock error with enhanced properties
          const mockError = new Error(errorInfo.message);
          mockError.name = errorInfo.errorType;
          mockError.stack = `${errorInfo.errorType}: ${errorInfo.message}\n    at eval (eval at injectScript):${errorInfo.lineNumber}:${errorInfo.columnNumber}`;
          (mockError as any).lineNumber = errorInfo.lineNumber;
          (mockError as any).columnNumber = errorInfo.columnNumber;

          // Mock eval to throw the enhanced error
          mockWindow.eval = vi.fn().mockImplementation(() => {
            throw mockError;
          });

          const result = await scriptInjector.injectScript('test code', mockIframe, snippetId);

          // Verify error isolation
          expect(result.success).toBe(false);
          expect(result.error).toBe(mockError);

          // Verify detailed error logging with enhanced information
          expect(consoleManager.logDetailedError).toHaveBeenCalledWith(
            expect.objectContaining({
              snippetId,
              snippetName: expect.stringContaining(snippetId.slice(0, 8)),
              error: errorInfo.message,
              stackTrace: expect.stringContaining(errorInfo.errorType),
              timestamp: expect.any(Date),
              url: 'https://example.com',
              lineNumber: errorInfo.lineNumber,
              columnNumber: errorInfo.columnNumber,
            })
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain browser interface stability during error conditions', async () => {
    // Generator for multiple concurrent error scenarios
    const concurrentErrorArbitrary = fc.array(
      fc.record({
        code: fc.oneof(
          fc.constant('throw new Error("Concurrent error 1");'),
          fc.constant('undefined.property;'),
          fc.constant('nonExistentFunction();'),
          fc.constant('JSON.parse("invalid");'),
        ),
        snippetId: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
      }),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(
        concurrentErrorArbitrary,
        async (errorScenarios) => {
          // Ensure unique snippet IDs
          const uniqueScenarios = errorScenarios.map((scenario, index) => ({
            ...scenario,
            snippetId: `concurrent-${index}-${scenario.snippetId}`,
          }));

          const results: any[] = [];
          let evalCallCount = 0;

          // Execute all error scenarios
          for (const scenario of uniqueScenarios) {
            // Mock eval to throw different errors for each scenario
            mockWindow.eval = vi.fn().mockImplementation(() => {
              evalCallCount++;
              throw new Error(`Error in ${scenario.snippetId}`);
            });

            const result = await scriptInjector.injectScript(scenario.code, mockIframe, scenario.snippetId);
            results.push({ scenario, result });
          }

          // Verify all executions were attempted (no early termination)
          expect(evalCallCount).toBe(uniqueScenarios.length);

          // Verify each error was isolated and handled
          results.forEach(({ scenario, result }) => {
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toContain(scenario.snippetId);
          });

          // Verify all errors were logged appropriately
          expect(consoleManager.logDetailedError).toHaveBeenCalledTimes(uniqueScenarios.length);
          expect(consoleManager.logExecution).toHaveBeenCalledTimes(uniqueScenarios.length);

          // Verify no uncaught exceptions (browser interface remains stable)
          // All errors should have been caught and handled by ScriptInjector
          uniqueScenarios.forEach(scenario => {
            expect(consoleManager.logExecution).toHaveBeenCalledWith(
              expect.stringContaining(scenario.snippetId.slice(0, 8)),
              scenario.snippetId,
              false
            );
          });

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle timeout scenarios without affecting browser stability', async () => {
    // Test timeout handling (simulated)
    const timeoutScenario = fc.record({
      code: fc.oneof(
        fc.constant('while(true) { /* infinite loop */ }'),
        fc.constant('for(;;) { /* infinite loop */ }'),
        fc.constant('setInterval(() => {}, 0);'),
      ),
      snippetId: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
    });

    await fc.assert(
      fc.asyncProperty(
        timeoutScenario,
        async (scenario) => {
          // Create ScriptInjector with short timeout for testing
          const shortTimeoutInjector = new ScriptInjector({ timeout: 100 });

          // Mock eval to simulate long-running operation
          mockWindow.eval = vi.fn().mockImplementation(() => {
            // Simulate timeout by throwing timeout error
            throw new Error(`Script execution timeout after 100ms`);
          });

          const result = await shortTimeoutInjector.injectScript(scenario.code, mockIframe, scenario.snippetId);

          // Verify timeout is handled gracefully
          expect(result.success).toBe(false);
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error?.message).toContain('timeout');

          // Verify timeout error is logged
          expect(consoleManager.logDetailedError).toHaveBeenCalledWith(
            expect.objectContaining({
              snippetId: scenario.snippetId,
              error: expect.stringContaining('timeout'),
            })
          );

          // Verify execution failure is logged
          expect(consoleManager.logExecution).toHaveBeenCalledWith(
            expect.stringContaining(scenario.snippetId.slice(0, 8)),
            scenario.snippetId,
            false
          );

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});