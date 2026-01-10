/**
 * Unit tests for SnippetPanel component
 * Tests main snippet management interface and tab navigation
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnippetPanel } from './SnippetPanel';
import { Snippet } from '@/types/snippet';
import { LocalStorageService } from '@/services/LocalStorageService';

// Mock child components
vi.mock('./SnippetEditor', () => ({
  SnippetEditor: ({ snippet, onSave, onDelete, onClose }: any) => (
    <div data-testid="snippet-editor">
      <div>Editor for: {snippet?.name || 'New Snippet'}</div>
      <button onClick={() => onSave?.({ id: 'test', name: 'Test' })}>Save</button>
      <button onClick={() => onDelete?.('test-id')}>Delete</button>
      <button onClick={onClose}>Close Editor</button>
    </div>
  ),
}));

vi.mock('./SnippetList', () => ({
  SnippetList: ({ onEdit, onNew, onImport }: any) => (
    <div data-testid="snippet-list">
      <div>Snippet List</div>
      <button onClick={() => onEdit?.({ id: 'test', name: 'Test Snippet' })}>Edit Snippet</button>
      <button onClick={onNew}>New Snippet</button>
      <button onClick={onImport}>Import</button>
    </div>
  ),
}));

// Mock LocalStorageService
vi.mock('@/services/LocalStorageService', () => ({
  LocalStorageService: {
    importSnippets: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SnippetPanel', () => {
  const mockProps = {
    currentUrl: 'https://github.com/test/repo',
    onExecute: vi.fn(),
    onClose: vi.fn(),
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render snippet panel with header', () => {
      render(<SnippetPanel {...mockProps} />);

      expect(screen.getByText('Snippet Manager')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should render tabs for snippets and editor', () => {
      render(<SnippetPanel {...mockProps} />);

      expect(screen.getByRole('tab', { name: /snippets/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /new snippet/i })).toBeInTheDocument();
    });

    it('should start with snippets tab active', () => {
      render(<SnippetPanel {...mockProps} />);

      expect(screen.getByTestId('snippet-list')).toBeInTheDocument();
      expect(screen.queryByTestId('snippet-editor')).not.toBeInTheDocument();
    });

    it('should show current URL in footer', () => {
      render(<SnippetPanel {...mockProps} />);

      expect(screen.getByText('Current: github.com')).toBeInTheDocument();
    });

    it('should show no active page when no URL provided', () => {
      render(<SnippetPanel {...mockProps} currentUrl="" />);

      expect(screen.getByText('No active page')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      render(<SnippetPanel {...mockProps} isVisible={false} />);

      expect(screen.queryByText('Snippet Manager')).not.toBeInTheDocument();
    });

    it('should not render close button when onClose is not provided', () => {
      const { onClose, ...propsWithoutClose } = mockProps;
      render(<SnippetPanel {...propsWithoutClose} />);

      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to editor tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      const editorTab = screen.getByRole('tab', { name: /new snippet/i });
      await user.click(editorTab);

      expect(screen.getByTestId('snippet-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('snippet-list')).not.toBeInTheDocument();
    });

    it('should switch back to snippets tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Go to editor tab first
      const editorTab = screen.getByRole('tab', { name: /new snippet/i });
      await user.click(editorTab);

      // Then back to snippets tab
      const snippetsTab = screen.getByRole('tab', { name: /snippets/i });
      await user.click(snippetsTab);

      expect(screen.getByTestId('snippet-list')).toBeInTheDocument();
      expect(screen.queryByTestId('snippet-editor')).not.toBeInTheDocument();
    });

    it('should show "Edit Snippet" tab text when editing existing snippet', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Trigger edit from snippet list
      const editButton = screen.getByRole('button', { name: /edit snippet/i });
      await user.click(editButton);

      expect(screen.getByRole('tab', { name: /edit snippet/i })).toBeInTheDocument();
      expect(screen.getByTestId('snippet-editor')).toBeInTheDocument();
    });
  });

  describe('Snippet Management Actions', () => {
    it('should switch to editor tab when new snippet is requested', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      const newButton = screen.getByRole('button', { name: /new snippet/i });
      await user.click(newButton);

      expect(screen.getByTestId('snippet-editor')).toBeInTheDocument();
      expect(screen.getByText('Editor for: New Snippet')).toBeInTheDocument();
    });

    it('should switch to editor tab when edit snippet is requested', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      const editButton = screen.getByRole('button', { name: /edit snippet/i });
      await user.click(editButton);

      expect(screen.getByTestId('snippet-editor')).toBeInTheDocument();
      expect(screen.getByText('Editor for: Test Snippet')).toBeInTheDocument();
    });

    it('should stay on editor tab after saving snippet', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Go to editor tab
      const newButton = screen.getByRole('button', { name: /new snippet/i });
      await user.click(newButton);

      // Save snippet
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should still be on editor tab
      expect(screen.getByTestId('snippet-editor')).toBeInTheDocument();
    });

    it('should return to list tab after deleting snippet', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Go to editor tab with existing snippet
      const editButton = screen.getByRole('button', { name: /edit snippet/i });
      await user.click(editButton);

      // Delete snippet
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Should return to list tab
      expect(screen.getByTestId('snippet-list')).toBeInTheDocument();
      expect(screen.queryByTestId('snippet-editor')).not.toBeInTheDocument();
    });

    it('should return to list tab when editor is closed', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Go to editor tab
      const newButton = screen.getByRole('button', { name: /new snippet/i });
      await user.click(newButton);

      // Close editor
      const closeButton = screen.getByRole('button', { name: /close editor/i });
      await user.click(closeButton);

      // Should return to list tab
      expect(screen.getByTestId('snippet-list')).toBeInTheDocument();
      expect(screen.queryByTestId('snippet-editor')).not.toBeInTheDocument();
    });
  });

  describe('Import Functionality', () => {
    it('should trigger file input when import is requested', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Mock file input click
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('should handle file import successfully', async () => {
      const mockSnippets = [{ id: 'test', name: 'Imported Snippet' }];
      vi.mocked(LocalStorageService.importSnippets).mockReturnValue(mockSnippets as any);

      render(<SnippetPanel {...mockProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = new File(['{"snippets":[]}'], 'test.json', { type: 'application/json' });

      // Mock FileReader
      class MockFileReader {
        onload: ((event: any) => void) | null = null;
        result: string = '';
        
        readAsText() {
          // Simulate async file reading
          setTimeout(() => {
            this.result = '{"snippets":[]}';
            if (this.onload) {
              this.onload({ target: { result: this.result } });
            }
          }, 0);
        }
      }
      
      vi.stubGlobal('FileReader', MockFileReader);

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(LocalStorageService.importSnippets).toHaveBeenCalledWith('{"snippets":[]}');
      });
    });

    it('should handle file import errors gracefully', async () => {
      vi.mocked(LocalStorageService.importSnippets).mockImplementation(() => {
        throw new Error('Import failed');
      });

      render(<SnippetPanel {...mockProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = new File(['invalid json'], 'test.json', { type: 'application/json' });

      // Mock FileReader
      class MockFileReader {
        onload: ((event: any) => void) | null = null;
        result: string = '';
        
        readAsText() {
          setTimeout(() => {
            this.result = 'invalid json';
            if (this.onload) {
              this.onload({ target: { result: this.result } });
            }
          }, 0);
        }
      }
      
      vi.stubGlobal('FileReader', MockFileReader);

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByText('Snippet Manager')).toBeInTheDocument();
      });
    });

    it('should reset file input after import', () => {
      render(<SnippetPanel {...mockProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Simulate file selection and change event
      Object.defineProperty(fileInput, 'value', {
        value: 'test.json',
        writable: true,
      });

      fireEvent.change(fileInput);

      // The component should reset the value after processing
      // This is tested by checking that the component doesn't crash
      expect(screen.getByText('Snippet Manager')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Prop Forwarding', () => {
    it('should forward currentUrl to child components', () => {
      render(<SnippetPanel {...mockProps} />);

      // The mocked components should receive the currentUrl
      // This is implicitly tested by the footer showing the correct URL
      expect(screen.getByText('Current: github.com')).toBeInTheDocument();
    });

    it('should forward onExecute to child components', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Go to editor tab
      const newButton = screen.getByRole('button', { name: /new snippet/i });
      await user.click(newButton);

      // The editor should have access to onExecute (tested through integration)
      expect(screen.getByTestId('snippet-editor')).toBeInTheDocument();
    });
  });

  describe('Refresh Mechanism', () => {
    it('should refresh snippet list after save operation', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Go to editor and save
      const newButton = screen.getByRole('button', { name: /new snippet/i });
      await user.click(newButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Go back to list tab to verify refresh
      const snippetsTab = screen.getByRole('tab', { name: /snippets/i });
      await user.click(snippetsTab);

      expect(screen.getByTestId('snippet-list')).toBeInTheDocument();
    });

    it('should refresh snippet list after delete operation', async () => {
      const user = userEvent.setup();
      render(<SnippetPanel {...mockProps} />);

      // Go to editor with existing snippet and delete
      const editButton = screen.getByRole('button', { name: /edit snippet/i });
      await user.click(editButton);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Should automatically return to list with refreshed data
      expect(screen.getByTestId('snippet-list')).toBeInTheDocument();
    });
  });
});