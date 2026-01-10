/**
 * Core data models for the snippet embedding browser
 * Based on requirements 3.1, 3.2 for snippet management and persistence
 */

export interface Snippet {
  id: string;
  name: string;
  code: string;
  urlPattern: string; // regex pattern for matching URLs
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  executeOnLoad: boolean;
}

export interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  source: 'snippet' | 'page';
  snippetId?: string;
}

export interface ErrorLog {
  snippetId: string;
  snippetName: string;
  error: string;
  stackTrace: string;
  timestamp: Date;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface BrowserSettings {
  autoExecute: boolean;
  showConsole: boolean;
  editorTheme: 'light' | 'dark';
}

export interface StorageData {
  snippets: Snippet[];
  settings: BrowserSettings;
}