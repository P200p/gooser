/**
 * Property-based tests for LocalStorageService
 * Feature: snippet-embedding-browser, Property 5: Storage Operations Consistency
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, beforeEach, expect } from 'vitest';
import * as fc from 'fast-check';
import { LocalStorageService } from './LocalStorageService';
import { Snippet, BrowserSettings } from '../types/snippet';

describe('LocalStorageService Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    LocalStorageService.clearAll();
  });

  /**
   * Property 5: Storage Operations Consistency
   * For any snippet data (create, update, delete operations), the local storage should maintain 
   * consistency where saved snippets persist across sessions, updates are immediately reflected, 
   * and deleted snippets are completely removed.
   */
  it('should maintain storage consistency for all snippet operations', () => {
    // Generator for valid snippet data
    const snippetArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      code: fc.string({ maxLength: 10000 }),
      urlPattern: fc.oneof(
        fc.constant('.*'),
        fc.constant('.*github\\.com.*'),
        fc.constant('^https://example\\.com/.*'),
        fc.string({ minLength: 1, maxLength: 50 })
      ),
      enabled: fc.boolean(),
      executeOnLoad: fc.boolean(),
      // Use integer timestamps to avoid invalid Date objects
      createdAt: fc.integer({ min: 0, max: 2147483647 }).map(timestamp => new Date(timestamp * 1000)),
      updatedAt: fc.integer({ min: 0, max: 2147483647 }).map(timestamp => new Date(timestamp * 1000))
    });

    fc.assert(
      fc.property(
        fc.array(snippetArbitrary, { minLength: 0, maxLength: 10 }),
        (snippets: Snippet[]) => {
          // Clear storage at the start of each property test iteration
          LocalStorageService.clearAll();
          
          // Test 1: Save multiple snippets and verify they persist
          snippets.forEach(snippet => {
            LocalStorageService.saveSnippet(snippet);
          });

          const retrievedSnippets = LocalStorageService.getSnippets();
          
          // All saved snippets should be retrievable
          expect(retrievedSnippets).toHaveLength(snippets.length);
          
          // Each snippet should maintain its core properties
          snippets.forEach(originalSnippet => {
            const retrieved = retrievedSnippets.find(s => s.id === originalSnippet.id);
            expect(retrieved).toBeDefined();
            if (retrieved) {
              expect(retrieved.id).toBe(originalSnippet.id);
              expect(retrieved.name).toBe(originalSnippet.name);
              expect(retrieved.code).toBe(originalSnippet.code);
              expect(retrieved.urlPattern).toBe(originalSnippet.urlPattern);
              expect(retrieved.enabled).toBe(originalSnippet.enabled);
              expect(retrieved.executeOnLoad).toBe(originalSnippet.executeOnLoad);
              // Dates should be preserved (within reasonable tolerance)
              expect(Math.abs(retrieved.createdAt.getTime() - originalSnippet.createdAt.getTime())).toBeLessThan(1000);
            }
          });

          // Test 2: Update operations should be immediately reflected
          if (snippets.length > 0) {
            const snippetToUpdate = snippets[0];
            const beforeUpdateTime = new Date();
            
            const updatedSnippet = {
              ...snippetToUpdate,
              name: 'Updated Name',
              code: 'console.log("updated");',
              enabled: !snippetToUpdate.enabled
            };

            LocalStorageService.updateSnippet(updatedSnippet);
            const afterUpdate = LocalStorageService.getSnippets();
            const updated = afterUpdate.find(s => s.id === snippetToUpdate.id);
            
            expect(updated).toBeDefined();
            if (updated) {
              expect(updated.name).toBe('Updated Name');
              expect(updated.code).toBe('console.log("updated");');
              expect(updated.enabled).toBe(!snippetToUpdate.enabled);
              // updatedAt should be set to current time (within reasonable tolerance)
              expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdateTime.getTime() - 1000);
              expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(new Date().getTime() + 1000);
            }
          }

          // Test 3: Delete operations should completely remove snippets
          if (snippets.length > 0) {
            const snippetToDelete = snippets[0];
            LocalStorageService.deleteSnippet(snippetToDelete.id);
            
            const afterDelete = LocalStorageService.getSnippets();
            const deleted = afterDelete.find(s => s.id === snippetToDelete.id);
            
            expect(deleted).toBeUndefined();
            expect(afterDelete).toHaveLength(snippets.length - 1);
          }

          // Test 4: Storage should handle empty states gracefully
          LocalStorageService.clearAll();
          const emptyResult = LocalStorageService.getSnippets();
          expect(emptyResult).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Export-Import Round Trip
   * Feature: snippet-embedding-browser, Property 6: Export-Import Round Trip
   * For any set of snippets, exporting them to JSON and then importing the JSON should result 
   * in an equivalent set of snippets with identical functionality.
   * Validates: Requirements 3.5
   */
  it('Property 6: Export-Import Round Trip - should maintain identical functionality after export-import cycle', () => {
    const snippetArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      code: fc.string({ maxLength: 1000 }),
      urlPattern: fc.oneof(
        fc.constant('.*'),
        fc.constant('.*github\\.com.*'),
        fc.constant('^https://example\\.com/.*'),
        fc.string({ minLength: 1, maxLength: 50 })
      ),
      enabled: fc.boolean(),
      executeOnLoad: fc.boolean(),
      // Use integer timestamps to avoid invalid Date objects
      createdAt: fc.integer({ min: 0, max: 2147483647 }).map(timestamp => new Date(timestamp * 1000)),
      updatedAt: fc.integer({ min: 0, max: 2147483647 }).map(timestamp => new Date(timestamp * 1000))
    });

    const settingsArbitrary = fc.record({
      autoExecute: fc.boolean(),
      showConsole: fc.boolean(),
      editorTheme: fc.oneof(fc.constant('light'), fc.constant('dark'))
    });

    fc.assert(
      fc.property(
        fc.array(snippetArbitrary, { minLength: 0, maxLength: 5 }),
        settingsArbitrary,
        (originalSnippets: Snippet[], originalSettings: BrowserSettings) => {
          // Clear storage at the start of each property test iteration
          LocalStorageService.clearAll();
          
          // Save original data to establish baseline
          originalSnippets.forEach(snippet => LocalStorageService.saveSnippet(snippet));
          LocalStorageService.saveSettings(originalSettings);

          // Export all data to JSON
          const exportedJson = LocalStorageService.exportSnippets();
          
          // Verify export produces valid JSON
          expect(() => JSON.parse(exportedJson)).not.toThrow();
          
          // Clear storage completely to simulate fresh environment
          LocalStorageService.clearAll();
          
          // Import data back from JSON
          const importedSnippets = LocalStorageService.importSnippets(exportedJson);
          const importedSettings = LocalStorageService.getSettings();

          // Property verification: imported data should be equivalent to original
          
          // 1. Same number of snippets
          expect(importedSnippets).toHaveLength(originalSnippets.length);
          
          // 2. Each original snippet should have an equivalent imported snippet
          originalSnippets.forEach(originalSnippet => {
            const importedSnippet = importedSnippets.find(s => s.id === originalSnippet.id);
            expect(importedSnippet).toBeDefined();
            
            if (importedSnippet) {
              // Core functionality properties must be identical
              expect(importedSnippet.id).toBe(originalSnippet.id);
              expect(importedSnippet.name).toBe(originalSnippet.name);
              expect(importedSnippet.code).toBe(originalSnippet.code);
              expect(importedSnippet.urlPattern).toBe(originalSnippet.urlPattern);
              expect(importedSnippet.enabled).toBe(originalSnippet.enabled);
              expect(importedSnippet.executeOnLoad).toBe(originalSnippet.executeOnLoad);
              
              // Dates should be preserved (allowing for serialization precision)
              expect(importedSnippet.createdAt.getTime()).toBe(originalSnippet.createdAt.getTime());
              expect(importedSnippet.updatedAt.getTime()).toBe(originalSnippet.updatedAt.getTime());
            }
          });

          // 3. Settings should be preserved
          expect(importedSettings.autoExecute).toBe(originalSettings.autoExecute);
          expect(importedSettings.showConsole).toBe(originalSettings.showConsole);
          expect(importedSettings.editorTheme).toBe(originalSettings.editorTheme);

          // 4. Functional equivalence: all snippets should be accessible via getSnippets()
          const allImportedSnippets = LocalStorageService.getSnippets();
          expect(allImportedSnippets).toHaveLength(originalSnippets.length);
          
          // 5. Each imported snippet should maintain its functional properties
          originalSnippets.forEach(original => {
            const retrieved = allImportedSnippets.find(s => s.id === original.id);
            expect(retrieved).toBeDefined();
            
            if (retrieved) {
              // Verify the snippet can still be updated (functional test)
              const updatedSnippet = { ...retrieved, name: 'Test Update' };
              expect(() => LocalStorageService.updateSnippet(updatedSnippet)).not.toThrow();
              
              // Verify the snippet can still be deleted (functional test)
              expect(() => LocalStorageService.deleteSnippet(retrieved.id)).not.toThrow();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle concurrent operations consistently', () => {
    const snippetArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      code: fc.string({ maxLength: 500 }),
      urlPattern: fc.string({ minLength: 1, maxLength: 20 }),
      enabled: fc.boolean(),
      executeOnLoad: fc.boolean(),
      // Use integer timestamps to avoid invalid Date objects
      createdAt: fc.integer({ min: 0, max: 2147483647 }).map(timestamp => new Date(timestamp * 1000)),
      updatedAt: fc.integer({ min: 0, max: 2147483647 }).map(timestamp => new Date(timestamp * 1000))
    });

    fc.assert(
      fc.property(
        fc.array(snippetArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        (snippetsToSave: Snippet[], idsToDelete: string[]) => {
          // Clear storage at the start of each property test iteration
          LocalStorageService.clearAll();
          
          // Perform mixed operations
          snippetsToSave.forEach(snippet => {
            LocalStorageService.saveSnippet(snippet);
          });

          // Delete some snippets (may or may not exist)
          idsToDelete.forEach(id => {
            LocalStorageService.deleteSnippet(id);
          });

          const finalSnippets = LocalStorageService.getSnippets();

          // Verify consistency: only snippets that were saved and not deleted should remain
          const expectedSnippets = snippetsToSave.filter(s => !idsToDelete.includes(s.id));
          expect(finalSnippets).toHaveLength(expectedSnippets.length);

          expectedSnippets.forEach(expected => {
            const found = finalSnippets.find(s => s.id === expected.id);
            expect(found).toBeDefined();
            if (found) {
              expect(found.name).toBe(expected.name);
              expect(found.code).toBe(expected.code);
            }
          });

          // Verify no deleted snippets remain
          idsToDelete.forEach(deletedId => {
            const shouldNotExist = finalSnippets.find(s => s.id === deletedId);
            expect(shouldNotExist).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});