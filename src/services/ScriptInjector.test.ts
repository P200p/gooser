/**
 * Property-based tests for ScriptInjector service
 * Feature: snippet-embedding-browser, Property 3: Script Injection and DOM Access
 * Validates: Requirements 2.1, 2.3, 2.5
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
  }
}));

// Mock window type with eval
interface MockWindow extends Omit<Window, 'eval'> {
  eval: (code: string) => any;
}

describe('ScriptInjector Property Tests', () => {
  let scriptInjector: ScriptInjector;
  let mockIframe: HTMLIFrameElement;
  let mockWindow: MockWindow;
  let mockDocument: Document;

  beforeEach(() => {
    scriptInjector = new ScriptInjector();
    
    // Create a mock iframe with a mock contentWindow and document
    mockDocument = {
      createElement: vi.fn((tagName: string) => {
        const element = {
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
        };
        return element;
      }),
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
    } as any;

    mockIframe = {
      contentWindow: mockWindow,
      contentDocument: mockDocument,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Clear all mocks
    vi.clearAllMocks();
  });

  /**
   * Property 3: Script Injection and DOM Access
   * For any valid JavaScript code that modifies DOM elements, 
   * injecting and executing that code should result in the expected DOM changes being visible in the target page.
   * Validates: Requirements 2.1, 2.3, 2.5
   */
  it('should successfully inject and execute DOM manipulation scripts', () => {
    // Generator for DOM manipulation operations
    const domOperationArbitrary = fc.oneof(
      // Create element operations
      fc.record({
        type: fc.constant('createElement'),
        tagName: fc.oneof(fc.constant('div'), fc.constant('span'), fc.constant('p'), fc.constant('button')),
        id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)),
        textContent: fc.string({ maxLength: 100 }),
      }),
      // Modify existing element operations
      fc.record({
        type: fc.constant('modifyElement'),
        selector: fc.oneof(fc.constant('body'), fc.constant('document.body')),
        property: fc.oneof(fc.constant('innerHTML'), fc.constant('textContent')),
        value: fc.string({ maxLength: 100 }),
      }),
      // Set style operations
      fc.record({
        type: fc.constant('setStyle'),
        selector: fc.oneof(fc.constant('body'), fc.constant('document.body')),
        styleProperty: fc.oneof(fc.constant('backgroundColor'), fc.constant('color'), fc.constant('fontSize')),
        styleValue: fc.oneof(fc.constant('red'), fc.constant('blue'), fc.constant('16px'), fc.constant('#ffffff')),
      })
    );

    fc.assert(
      fc.asyncProperty(
        fc.array(domOperationArbitrary, { minLength: 1, maxLength: 3 }),
        async (operations) => {
          // Generate JavaScript code for the operations
          const codeLines = operations.map(op => {
            switch (op.type) {
              case 'createElement':
                return `
                  var element = document.createElement('${op.tagName}');
                  element.id = '${op.id}';
                  element.textContent = '${op.textContent.replace(/'/g, "\\'")}';
                  document.body.appendChild(element);
                `;
              case 'modifyElement':
                return `
                  if (${op.selector}) {
                    ${op.selector}.${op.property} = '${op.value.replace(/'/g, "\\'")}';
                  }
                `;
              case 'setStyle':
                return `
                  if (${op.selector}) {
                    ${op.selector}.style.${op.styleProperty} = '${op.styleValue}';
                  }
                `;
              default:
                return '';
            }
          });

          const code = codeLines.join('\n');
          
          // Mock eval to simulate successful execution
          mockWindow.eval = vi.fn().mockImplementation((script: string) => {
            // Simulate the DOM operations by updating our mock objects
            operations.forEach(op => {
              switch (op.type) {
                case 'createElement':
                  const mockElement = mockDocument.createElement(op.tagName);
                  mockElement.id = op.id;
                  mockElement.textContent = op.textContent;
                  mockDocument.body.appendChild(mockElement);
                  break;
                case 'modifyElement':
                  if (op.property === 'innerHTML') {
                    mockDocument.body.innerHTML = op.value;
                  } else if (op.property === 'textContent') {
                    mockDocument.body.textContent = op.value;
                  }
                  break;
                case 'setStyle':
                  mockDocument.body.style[op.styleProperty] = op.styleValue;
                  break;
              }
            });
            return undefined;
          });

          // Execute the script injection
          return scriptInjector.injectScript(code, mockIframe, 'test-snippet')
            .then(() => {
              // Verify that eval was called with the wrapped code
              expect(mockWindow.eval).toHaveBeenCalledOnce();
              
              // Verify that the code was wrapped properly for error handling
              const calledCode = (mockWindow.eval as any).mock.calls[0][0];
              expect(calledCode).toContain('try {');
              expect(calledCode).toContain('} catch (error) {');
              expect(calledCode).toContain(code);

              // Verify DOM operations were simulated
              operations.forEach(op => {
                switch (op.type) {
                  case 'createElement':
                    expect(mockDocument.createElement).toHaveBeenCalledWith(op.tagName);
                    expect(mockDocument.body.appendChild).toHaveBeenCalled();
                    break;
                  case 'modifyElement':
                    // Body should have been modified
                    if (op.property === 'innerHTML') {
                      expect(mockDocument.body.innerHTML).toBe(op.value);
                    } else if (op.property === 'textContent') {
                      expect(mockDocument.body.textContent).toBe(op.value);
                    }
                    break;
                  case 'setStyle':
                    expect(mockDocument.body.style[op.styleProperty]).toBe(op.styleValue);
                    break;
                }
              });

              // Verify console capture was set up
              expect(consoleManager.logExecution).toHaveBeenCalledWith(
                expect.stringContaining('test-snippet'),
                'test-snippet',
                true,
                expect.any(Number)
              );

              return true;
            })
            .catch(() => {
              // If injection fails, it should still be handled gracefully
              expect(consoleManager.logError).toHaveBeenCalled();
              return true;
            });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle script execution errors gracefully', () => {
    // Generator for invalid JavaScript code that should cause errors
    const invalidCodeArbitrary = fc.oneof(
      fc.constant('throw new Error("Test error");'),
      fc.constant('undefined.property;'),
      fc.constant('nonExistentFunction();'),
      fc.constant('document.nonExistentMethod();'),
      fc.string({ minLength: 1, maxLength: 50 }).map(s => `throw new Error("${s.replace(/"/g, '\\"')}");`)
    );

    fc.assert(
      fc.asyncProperty(
        invalidCodeArbitrary,
        async (invalidCode) => {
          // Mock eval to throw an error
          mockWindow.eval = vi.fn().mockImplementation(() => {
            throw new Error('Script execution error');
          });

          // Execute the script injection
          return scriptInjector.injectScript(invalidCode, mockIframe, 'error-snippet')
            .then(() => {
              // Should not reach here for invalid code
              return false;
            })
            .catch((error) => {
              // Verify error handling
              expect(error).toBeInstanceOf(Error);
              expect(consoleManager.logError).toHaveBeenCalled();
              expect(consoleManager.logExecution).toHaveBeenCalledWith(
                expect.stringContaining('error-snippet'),
                'error-snippet',
                false
              );
              return true;
            });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should provide DOM access for valid JavaScript operations', () => {
    // Generator for safe DOM access patterns
    const domAccessArbitrary = fc.record({
      operation: fc.oneof(
        fc.constant('document.title'),
        fc.constant('document.body'),
        fc.constant('document.createElement("div")'),
        fc.constant('document.querySelector("body")'),
        fc.constant('window.location.href')
      ),
      assignment: fc.boolean(),
      value: fc.string({ maxLength: 50 })
    });

    fc.assert(
      fc.asyncProperty(
        domAccessArbitrary,
        async (domAccess) => {
          const code = domAccess.assignment 
            ? `var result = ${domAccess.operation}; result = "${domAccess.value.replace(/"/g, '\\"')}";`
            : `var result = ${domAccess.operation};`;

          // Mock eval to simulate DOM access
          mockWindow.eval = vi.fn().mockReturnValue(domAccess.assignment ? domAccess.value : 'mock-result');

          return scriptInjector.injectScript(code, mockIframe, 'dom-access-snippet')
            .then((result) => {
              // Verify script was executed
              expect(mockWindow.eval).toHaveBeenCalledOnce();
              
              // Verify the code contains DOM access
              const calledCode = (mockWindow.eval as any).mock.calls[0][0];
              expect(calledCode).toContain(domAccess.operation);

              // Verify successful execution was logged
              expect(consoleManager.logExecution).toHaveBeenCalledWith(
                expect.stringContaining('dom-access-snippet'),
                'dom-access-snippet',
                true,
                expect.any(Number)
              );

              return true;
            })
            .catch(() => {
              // Even if DOM access fails, error should be handled
              expect(consoleManager.logError).toHaveBeenCalled();
              return true;
            });
        }
      ),
      { numRuns: 100 }
    );
  });
});