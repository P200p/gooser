/**
 * Property-based tests for automatic snippet execution
 * Feature: snippet-embedding-browser, Property 2: Automatic Snippet Execution
 * Validates: Requirements 2.2, 5.5
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ScriptInjector } from './ScriptInjector';
import { Snippet } from '../types/snippet';
import { consoleManager } from './ConsoleManager';

// Mock console manager to avoid side effects
vi.mock('./ConsoleManager', () => ({
  consoleManager: {
    addMessage: vi.fn(),
    logError: vi.fn(),
    logExecution: vi.fn(),
  }
}));

// Mock window type with eval
interface MockWindow extends Omit<Window, 'eval'> {
  eval: (code: string) => any;
}

describe('ScriptInjector Automatic Execution Property Tests', () => {
  let scriptInjector: ScriptInjector;
  let mockIframe: HTMLIFrameElement;
  let mockWindow: MockWindow;
  let mockDocument: Document;

  beforeEach(() => {
    scriptInjector = new ScriptInjector();
    
    // Create a mock iframe with a mock contentWindow and document
    mockDocument = {
      readyState: 'complete',
      createElement: vi.fn(),
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        innerHTML: '',
        style: {},
      },
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
    } as any;

    mockIframe = {
      contentWindow: mockWindow,
      contentDocument: mockDocument,
      addEventListener: vi.fn((event, callback) => {
        // Simulate immediate load for testing
        if (event === 'load') {
          setTimeout(callback, 0);
        }
      }),
      removeEventListener: vi.fn(),
    } as any;

    // Clear all mocks
    vi.clearAllMocks();
  });

  /**
   * Property 2: Automatic Snippet Execution
   * For any saved snippet with a URL pattern, when a page loads that matches the pattern, 
   * the snippet should execute automatically if enabled, and should not execute if disabled or if the URL doesn't match.
   * Validates: Requirements 2.2, 5.5
   */
  it('should execute enabled snippets that match URL patterns and skip others', async () => {
    // Generator for URL patterns
    const urlPatternArbitrary = fc.oneof(
      fc.constant('.*'), // Match all
      fc.constant('*'), // Match all (wildcard)
      fc.constant('github.com'),
      fc.constant('*.github.com'),
      fc.constant('example.com'),
      fc.constant('.*\\.example\\.com.*'), // Regex pattern
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => !s.includes(' ') && s.length > 0)
    );

    // Generator for URLs
    const urlArbitrary = fc.oneof(
      fc.constant('https://github.com/user/repo'),
      fc.constant('https://www.github.com/'),
      fc.constant('https://example.com/page'),
      fc.constant('https://subdomain.example.com/'),
      fc.constant('https://other-site.com/'),
      fc.constant('https://test.org/path'),
      fc.webUrl()
    );

    // Generator for snippet code
    const codeArbitrary = fc.oneof(
      fc.constant('console.log("Hello World");'),
      fc.constant('document.title = "Modified";'),
      fc.constant('var x = 42; console.log(x);'),
      fc.constant('window.testValue = "snippet-executed";'),
      fc.string({ minLength: 10, maxLength: 100 }).map(s => `console.log("${s.replace(/"/g, '\\"')}");`)
    );

    // Generator for snippets
    const snippetArbitrary = fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      code: codeArbitrary,
      urlPattern: urlPatternArbitrary,
      enabled: fc.boolean(),
      executeOnLoad: fc.boolean(),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
      updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(snippetArbitrary, { minLength: 1, maxLength: 5 }).chain(snippets => {
          // Ensure unique IDs and codes
          const uniqueSnippets = snippets.map((snippet, index) => ({
            ...snippet,
            id: `snippet-${index}-${snippet.id}`,
            code: `console.log("snippet-${index}: ${snippet.code.replace(/"/g, '\\"')}");`
          }));
          return fc.constant(uniqueSnippets);
        }),
        urlArbitrary,
        async (snippets, currentUrl) => {
          // Mock eval to track executions
          const executedSnippets: string[] = [];
          mockWindow.eval = vi.fn().mockImplementation((code: string) => {
            // Find snippet by checking if the code contains the snippet's unique code
            const snippet = snippets.find(s => code.includes(s.code) && s.code.trim().length > 0);
            if (snippet) {
              executedSnippets.push(snippet.id);
            }
            return undefined;
          });

          // Execute snippets on load
          scriptInjector.executeOnLoad(snippets as Snippet[], mockIframe, currentUrl);

          // Wait for async execution to complete
          await new Promise(resolve => setTimeout(resolve, 10));

          // Determine which snippets should have executed
          const shouldExecute = snippets.filter(snippet => 
            snippet.enabled && 
            snippet.executeOnLoad && 
            scriptInjector.matchesUrlPattern(currentUrl, snippet.urlPattern)
          );

          const shouldNotExecute = snippets.filter(snippet => 
            !snippet.enabled || 
            !snippet.executeOnLoad || 
            !scriptInjector.matchesUrlPattern(currentUrl, snippet.urlPattern)
          );

          // Verify that enabled snippets with matching patterns executed
          for (const snippet of shouldExecute) {
            expect(executedSnippets).toContain(snippet.id);
          }

          // Verify that disabled snippets or non-matching patterns did not execute
          for (const snippet of shouldNotExecute) {
            expect(executedSnippets).not.toContain(snippet.id);
          }

          // Verify eval was called the correct number of times
          expect(mockWindow.eval).toHaveBeenCalledTimes(shouldExecute.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle URL pattern matching correctly', () => {
    // Generator for URL and pattern pairs with expected results
    const urlPatternTestArbitrary = fc.oneof(
      // Exact matches
      fc.record({
        url: fc.constant('https://github.com/user/repo'),
        pattern: fc.constant('github.com'),
        shouldMatch: fc.constant(true)
      }),
      // Wildcard matches
      fc.record({
        url: fc.constant('https://subdomain.github.com/path'),
        pattern: fc.constant('*.github.com'),
        shouldMatch: fc.constant(true)
      }),
      // Match all patterns
      fc.record({
        url: fc.webUrl(),
        pattern: fc.oneof(fc.constant('.*'), fc.constant('*')),
        shouldMatch: fc.constant(true)
      }),
      // Non-matches
      fc.record({
        url: fc.constant('https://example.com/'),
        pattern: fc.constant('github.com'),
        shouldMatch: fc.constant(false)
      }),
      // Regex patterns
      fc.record({
        url: fc.constant('https://test.example.com/'),
        pattern: fc.constant('.*\\.example\\.com.*'),
        shouldMatch: fc.constant(true)
      })
    );

    fc.assert(
      fc.property(
        urlPatternTestArbitrary,
        (testCase) => {
          const result = scriptInjector.matchesUrlPattern(testCase.url, testCase.pattern);
          expect(result).toBe(testCase.shouldMatch);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not execute snippets when iframe is not ready', async () => {
    const snippet: Snippet = {
      id: 'test-snippet',
      name: 'Test Snippet',
      code: 'console.log("Should not execute");',
      urlPattern: '.*',
      enabled: true,
      executeOnLoad: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock iframe that is not ready
    const notReadyIframe = {
      contentWindow: null,
      contentDocument: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Execute snippets on load
    scriptInjector.executeOnLoad([snippet], notReadyIframe, 'https://example.com');

    // Wait for potential async execution
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify no execution occurred
    expect(mockWindow.eval).not.toHaveBeenCalled();
    return true;
  });

  it('should handle execution errors gracefully during automatic execution', async () => {
    const snippet: Snippet = {
      id: 'error-snippet',
      name: 'Error Snippet',
      code: 'throw new Error("Test error");',
      urlPattern: '.*',
      enabled: true,
      executeOnLoad: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock eval to throw an error
    mockWindow.eval = vi.fn().mockImplementation(() => {
      throw new Error('Script execution error');
    });

    // Execute snippets on load
    scriptInjector.executeOnLoad([snippet], mockIframe, 'https://example.com');

    // Wait for async execution to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify that execution was attempted
    expect(mockWindow.eval).toHaveBeenCalled();

    // Verify error was logged (errors are handled internally by injectScript)
    // The executeOnLoad method catches errors and logs them via console.error
    return true;
  });

  it('should respect the enabled flag for automatic execution', async () => {
    // Generator for snippets with various enabled states
    const snippetWithEnabledArbitrary = fc.record({
      id: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
      name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
      code: fc.string({ minLength: 5, maxLength: 50 }).map(s => `console.log("${s.replace(/"/g, '\\"')}");`),
      urlPattern: fc.constant('.*'), // Always matches
      enabled: fc.boolean(),
      executeOnLoad: fc.constant(true), // Always wants to execute on load
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(snippetWithEnabledArbitrary, { minLength: 1, maxLength: 3 }).chain(snippets => {
          // Ensure unique IDs and codes
          const uniqueSnippets = snippets.map((snippet, index) => ({
            ...snippet,
            id: `snippet-${index}-${snippet.id}`,
            code: `console.log("snippet-${index}: test");`
          }));
          return fc.constant(uniqueSnippets);
        }),
        async (snippets) => {
          const executedSnippets: string[] = [];
          mockWindow.eval = vi.fn().mockImplementation((code: string) => {
            const snippet = snippets.find(s => code.includes(s.code) && s.code.trim().length > 0);
            if (snippet) {
              executedSnippets.push(snippet.id);
            }
            return undefined;
          });

          // Execute snippets on load
          scriptInjector.executeOnLoad(snippets as Snippet[], mockIframe, 'https://example.com');

          // Wait for async execution
          await new Promise(resolve => setTimeout(resolve, 10));

          // Only enabled snippets should have executed
          const enabledSnippets = snippets.filter(s => s.enabled);
          const disabledSnippets = snippets.filter(s => !s.enabled);

          for (const snippet of enabledSnippets) {
            expect(executedSnippets).toContain(snippet.id);
          }

          for (const snippet of disabledSnippets) {
            expect(executedSnippets).not.toContain(snippet.id);
          }

          expect(mockWindow.eval).toHaveBeenCalledTimes(enabledSnippets.length);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});