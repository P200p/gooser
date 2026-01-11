/**
 * Type declarations for test environment
 * Extends Window interface to include eval for script injection tests
 */

declare global {
  interface Window {
    eval: (code: string) => any;
  }
}

export {};
