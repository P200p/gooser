/**
 * Unit tests for SnippetEditor component
 * Tests code editor functionality and user interactions
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnippetEditor } from './SnippetEditor';
import { Snippet } from '@/types/snippet';
import { LocalStorageService } from '@/services/LocalStorageService';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Monaco Editor Mock"
    />
  ),
}));

// Mock LocalStorageService
vi.mock('@/services/LocalStorageService', () => ({
  LocalStorageService: {
    saveSnippet: vi.fn(),
    deleteSnippet: vi.fn(),
    getSnippets: vi.fn(() => []),
  },
}));

// Mock URL patterns utility
vi.mock('@/utils/urlPatterns', () => ({
  matchUrlPattern: vi.fn((url: string, pattern: string) => {
    if (pattern === '.*github\\.com.*') return url.includes('github.com');
    if (pattern === '.*') return true;
    return false;
  }),
  isValidPattern: vi.fn((pattern: string) => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }),
  getPatternExamples: vi.fn(() => ['https://example.com', 'https://github.com']),
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SnippetEditor', () => {
  const mockSnippet: Snippet = {
    id: 'test-id',
    name: 'Test Snippet',
    code: 'console.log("test");',
    urlPattern: '.*github\\.com.*',
    enabled: true,
    executeOnLoad: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProps = {
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onExecute: vi.fn(),
    onClose: vi.fn(),
    currentUrl: 'https://github.com/test/repo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render new snippet editor with default values', () => {
      render(<SnippetEditor {...mockProps} />);

      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // name input
      expect(screen.getByDisplayValue('.*')).toBeInTheDocument(); // url pattern input
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      expect(screen.getByText('New Snippet')).toBeInTheDocument();
    });

    it('should render existing snippet with populated values', () => {
      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      expect(screen.getByDisplayValue('Test Snippet')).toBeInTheDocument();
      expect(screen.getByDisplayValue('.*github\\.com.*')).toBeInTheDocument();
      expect(screen.getByTestId('monaco-editor')).toHaveValue('console.log("test");');
      expect(screen.getByText('Edit Snippet')).toBeInTheDocument();
    });

    it('should show URL pattern match status', () => {
      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      expect(screen.getByText('Matches')).toBeInTheDocument();
    });

    it('should show enabled and executeOnLoad switches in correct state', () => {
      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      const enabledSwitch = screen.getByRole('switch', { name: /enable snippet/i });
      const executeOnLoadSwitch = screen.getByRole('switch', { name: /execute on page load/i });

      expect(enabledSwitch).toBeChecked();
      expect(executeOnLoadSwitch).toBeChecked();
    });
  });

  describe('User Interactions', () => {
    it('should update snippet name when user types', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} />);

      const nameInput = screen.getByLabelText(/snippet name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Test Name');

      expect(nameInput).toHaveValue('New Test Name');
    });

    it('should update URL pattern when user types', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} />);

      const patternInput = screen.getByLabelText(/url pattern/i);
      await user.clear(patternInput);
      await user.type(patternInput, '.*example\\.com.*');

      expect(patternInput).toHaveValue('.*example\\.com.*');
    });

    it('should update code when user types in editor', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} />);

      const editor = screen.getByTestId('monaco-editor');
      await user.clear(editor);
      await user.type(editor, 'console.log("new code");');

      expect(editor).toHaveValue('console.log("new code");');
    });

    it('should toggle enabled switch', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      const enabledSwitch = screen.getByRole('switch', { name: /enable snippet/i });
      expect(enabledSwitch).toBeChecked();

      await user.click(enabledSwitch);
      expect(enabledSwitch).not.toBeChecked();
    });

    it('should toggle executeOnLoad switch', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      const executeOnLoadSwitch = screen.getByRole('switch', { name: /execute on page load/i });
      expect(executeOnLoadSwitch).toBeChecked();

      await user.click(executeOnLoadSwitch);
      expect(executeOnLoadSwitch).not.toBeChecked();
    });
  });

  describe('Snippet CRUD Operations', () => {
    it('should save new snippet with correct data', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} />);

      // Fill in snippet data
      await user.type(screen.getByLabelText(/snippet name/i), 'Test Save');
      await user.clear(screen.getByTestId('monaco-editor'));
      await user.type(screen.getByTestId('monaco-editor'), 'console.log("save test");');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save snippet/i });
      await user.click(saveButton);

      expect(LocalStorageService.saveSnippet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Save',
          code: 'console.log("save test");',
          urlPattern: '.*',
          enabled: true,
          executeOnLoad: true,
        })
      );
      expect(mockProps.onSave).toHaveBeenCalled();
    });

    it('should update existing snippet', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      // Modify snippet data
      const nameInput = screen.getByDisplayValue('Test Snippet');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Snippet');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save snippet/i });
      await user.click(saveButton);

      expect(LocalStorageService.saveSnippet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          name: 'Updated Snippet',
          code: 'console.log("test");',
        })
      );
    });

    it('should not save snippet with empty name', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} />);

      const saveButton = screen.getByRole('button', { name: /save snippet/i });
      await user.click(saveButton);

      expect(LocalStorageService.saveSnippet).not.toHaveBeenCalled();
      expect(mockProps.onSave).not.toHaveBeenCalled();
    });

    it('should not save snippet with invalid URL pattern', async () => {
      const user = userEvent.setup();
      const { isValidPattern } = await import('@/utils/urlPatterns');
      vi.mocked(isValidPattern).mockReturnValue(false);

      render(<SnippetEditor {...mockProps} />);

      await user.type(screen.getByLabelText(/snippet name/i), 'Test');
      await user.clear(screen.getByLabelText(/url pattern/i));
      await user.type(screen.getByLabelText(/url pattern/i), 'invalid-pattern');

      const saveButton = screen.getByRole('button', { name: /save snippet/i });
      await user.click(saveButton);

      expect(LocalStorageService.saveSnippet).not.toHaveBeenCalled();
    });

    it('should delete existing snippet with confirmation', async () => {
      const user = userEvent.setup();
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Test Snippet"?');
      expect(LocalStorageService.deleteSnippet).toHaveBeenCalledWith('test-id');
      expect(mockProps.onDelete).toHaveBeenCalledWith('test-id');
      expect(mockProps.onClose).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should not delete snippet if user cancels confirmation', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(LocalStorageService.deleteSnippet).not.toHaveBeenCalled();
      expect(mockProps.onDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should execute snippet code', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      const runButton = screen.getByRole('button', { name: /run code/i });
      await user.click(runButton);

      expect(mockProps.onExecute).toHaveBeenCalledWith('console.log("test");', 'test-id');
    });

    it('should not execute empty code', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} />);

      // Clear the default code
      await user.clear(screen.getByTestId('monaco-editor'));

      const runButton = screen.getByRole('button', { name: /run code/i });
      await user.click(runButton);

      expect(mockProps.onExecute).not.toHaveBeenCalled();
    });
  });

  describe('Export and Copy Functionality', () => {
    it('should copy code to clipboard', async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      
      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
      });

      render(<SnippetEditor {...mockProps} snippet={mockSnippet} />);

      const copyButton = screen.getByRole('button', { name: /copy code/i });
      await user.click(copyButton);

      expect(writeTextSpy).toHaveBeenCalledWith('console.log("test");');
      
      // Should show "Copied!" temporarily
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Button States', () => {
    it('should disable save button when name is empty', () => {
      render(<SnippetEditor {...mockProps} />);

      const saveButton = screen.getByRole('button', { name: /save snippet/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when name and valid pattern are provided', async () => {
      const user = userEvent.setup();
      const { isValidPattern } = await import('@/utils/urlPatterns');
      vi.mocked(isValidPattern).mockReturnValue(true);

      render(<SnippetEditor {...mockProps} />);

      await user.type(screen.getByLabelText(/snippet name/i), 'Test Name');
      
      // Wait for the component to update
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save snippet/i });
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<SnippetEditor {...mockProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });
});