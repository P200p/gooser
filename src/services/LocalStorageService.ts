/**
 * LocalStorageService for snippet persistence
 * Implements requirements 3.1, 3.2 for local storage management
 */

import { Snippet, BrowserSettings, StorageData } from '../types/snippet';

const STORAGE_KEY = 'snippet-browser-data';
const SNIPPETS_KEY = 'snippet-browser-snippets'; // Legacy key for migration
const SETTINGS_KEY = 'snippet-browser-settings';

const DEFAULT_SETTINGS: BrowserSettings = {
  autoExecute: true,
  showConsole: true,
  editorTheme: 'dark'
};

export class LocalStorageService {
  /**
   * Save a snippet to local storage
   */
  static saveSnippet(snippet: Snippet): void {
    const snippets = this.getSnippets();
    const existingIndex = snippets.findIndex(s => s.id === snippet.id);
    
    if (existingIndex >= 0) {
      snippets[existingIndex] = { ...snippet, updatedAt: new Date() };
    } else {
      snippets.push(snippet);
    }
    
    this.saveSnippets(snippets);
  }

  /**
   * Get all snippets from local storage
   */
  static getSnippets(): Snippet[] {
    try {
      // Try new storage format first
      const data = this.getStorageData();
      if (data.snippets.length > 0) {
        return data.snippets.map(this.deserializeSnippet);
      }

      // Fallback to legacy format for migration
      const legacyData = localStorage.getItem(SNIPPETS_KEY);
      if (legacyData) {
        const parsed = JSON.parse(legacyData);
        const snippets = Array.isArray(parsed) ? parsed : [];
        return snippets.map(this.deserializeSnippet);
      }

      return [];
    } catch (error) {
      console.error('Failed to load snippets from storage:', error);
      return [];
    }
  }

  /**
   * Delete a snippet by ID
   */
  static deleteSnippet(id: string): void {
    const snippets = this.getSnippets().filter(s => s.id !== id);
    this.saveSnippets(snippets);
  }

  /**
   * Update an existing snippet
   */
  static updateSnippet(snippet: Snippet): void {
    const updatedSnippet = { ...snippet, updatedAt: new Date() };
    this.saveSnippet(updatedSnippet);
  }

  /**
   * Export all snippets as JSON string
   */
  static exportSnippets(): string {
    const data = this.getStorageData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import snippets from JSON string
   */
  static importSnippets(jsonData: string): Snippet[] {
    try {
      const parsed = JSON.parse(jsonData);
      
      // Handle different import formats
      let snippets: any[] = [];
      
      if (parsed.snippets && Array.isArray(parsed.snippets)) {
        // New format with settings
        snippets = parsed.snippets;
        if (parsed.settings) {
          this.saveSettings(parsed.settings);
        }
      } else if (Array.isArray(parsed)) {
        // Legacy format - just array of snippets
        snippets = parsed;
      } else {
        throw new Error('Invalid import format');
      }

      const importedSnippets = snippets.map(this.deserializeSnippet);
      
      // Merge with existing snippets (avoid duplicates by ID)
      const existingSnippets = this.getSnippets();
      const mergedSnippets = [...existingSnippets];
      
      importedSnippets.forEach(imported => {
        const existingIndex = mergedSnippets.findIndex(s => s.id === imported.id);
        if (existingIndex >= 0) {
          mergedSnippets[existingIndex] = imported;
        } else {
          mergedSnippets.push(imported);
        }
      });

      this.saveSnippets(mergedSnippets);
      return importedSnippets;
    } catch (error) {
      console.error('Failed to import snippets:', error);
      throw new Error('Invalid JSON format or corrupted data');
    }
  }

  /**
   * Get browser settings
   */
  static getSettings(): BrowserSettings {
    try {
      const data = this.getStorageData();
      return { ...DEFAULT_SETTINGS, ...data.settings };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save browser settings
   */
  static saveSettings(settings: BrowserSettings): void {
    try {
      const data = this.getStorageData();
      data.settings = { ...DEFAULT_SETTINGS, ...settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Clear all data (for testing or reset)
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SNIPPETS_KEY); // Remove legacy key too
    localStorage.removeItem(SETTINGS_KEY);
  }

  /**
   * Get the complete storage data structure
   */
  private static getStorageData(): StorageData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          snippets: parsed.snippets || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
        };
      }
    } catch (error) {
      console.error('Failed to parse storage data:', error);
    }

    return {
      snippets: [],
      settings: DEFAULT_SETTINGS
    };
  }

  /**
   * Save snippets array to storage
   */
  private static saveSnippets(snippets: Snippet[]): void {
    try {
      const data = this.getStorageData();
      data.snippets = snippets.map(this.serializeSnippet);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save snippets:', error);
      throw new Error('Failed to save snippets to local storage');
    }
  }

  /**
   * Serialize snippet for storage (convert Dates to strings)
   */
  private static serializeSnippet(snippet: Snippet): any {
    return {
      ...snippet,
      createdAt: snippet.createdAt.toISOString(),
      updatedAt: snippet.updatedAt.toISOString()
    };
  }

  /**
   * Deserialize snippet from storage (convert strings back to Dates)
   */
  private static deserializeSnippet(data: any): Snippet {
    return {
      id: data.id || crypto.randomUUID(),
      name: data.name || 'Untitled Snippet',
      code: data.code || '',
      urlPattern: data.urlPattern || '.*',
      enabled: data.enabled !== false, // Default to true
      executeOnLoad: data.executeOnLoad !== false, // Default to true
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    };
  }
}