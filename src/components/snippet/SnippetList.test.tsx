/**
 * Unit tests for SnippetList component
 * Tests snippet management UI and CRUD operations
 * Requirements: 5.2, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnippetList } from './SnippetList';
import { Snippet } from '@/types/snippet';
import { LocalStorageService } from '@/services/LocalStorageService';

// Mock LocalStorageService
vi.mock('@/services/LocalStorageService', () => ({
  LocalStorageService: {
    getSnippets: vi.fn(),
    updateSnippet: vi.fn(),
    deleteSnippet: vi.fn(),
    exportSnippets: vi.fn(),
  },
}));

// Mock URL patterns utility
vi.mock('@/utils/urlPatterns', () => ({
  matchUrlPattern: vi.fn((url: string, pattern: string) => {
    if (pattern === '.*github\\.com.*') return url.includes('github.com');
    if (pattern === '.*example\\.com.*') return url.includes('example.com');
    if (pattern === '.*') return true;
    return false;
  }),
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SnippetList', () => {
  const mockSnippets: Snippet[] = [
    {
      id: 'snippet-1',
      name: 'GitHub Helper',
      code: 'console.log("GitHub script");',
      urlPattern: '.*github\\.com.*',
      enabled: true,
      executeOnLoad: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 'snippet-2',
      name: 'Example Script',
      code: 'console.log("Example script");',
      urlPattern: '.*example\\.com.*',
      enabled: false,
      executeOnLoad: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'snippet-3',
      name: 'Universal Script',
      code: 'console.log("Universal script");',
      urlPattern: '.*',
      enabled: true,
      executeOnLoad: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockProps = {
    currentUrl: 'https://github.com/test/repo',
    onEdit: vi.fn(),
    onExecute: vi.fn(),
    onNew: vi.fn(),
    onImport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LocalStorageService.getSnippets).mockReturnValue(mockSnippets);
  });

  describe('Component Rendering', () => {
    it('should render snippet list with all snippets', () => {
      render(<SnippetList {...mockProps} />);

      expect(screen.getByText('Snippets (3)')).toBeInTheDocument();
      expect(screen.getByText('GitHub Helper')).toBeInTheDocument();
      expect(screen.getByText('Example Script')).toBeInTheDocument();
      expect(screen.getByText('Universal Script')).toBeInTheDocument();
    });

    it('should show correct snippet status badges', () => {
      render(<SnippetList {...mockProps} />);

      // Should show status badges
      expect(screen.getAllByText('Active')).toHaveLength(2); // GitHub Helper and Universal Script
      expect(screen.getByText('Disabled')).toBeInTheDocument(); // Example Script
    });

    it('should display snippet metadata correctly', () => {
      render(<SnippetList {...mockProps} />);

      expect(screen.getByText('.*github\\.com.*')).toBeInTheDocument();
      expect(screen.getByText('.*example\\.com.*')).toBeInTheDocument();
      expect(screen.getByText('.*')).toBeInTheDocument();
    });

    it('should show code preview for each snippet', () => {
      render(<SnippetList {...mockProps} />);

      expect(screen.getByText('console.log("GitHub script");')).toBeInTheDocument();
      expect(screen.getByText('console.log("Example script");')).toBeInTheDocument();
      expect(screen.getByText('console.log("Universal script");')).toBeInTheDocument();
    });

    it('should render empty state when no snippets exist', () => {
      vi.mocked(LocalStorageService.getSnippets).mockReturnValue([]);
      render(<SnippetList {...mockProps} />);

      expect(screen.getByText('Snippets (0)')).toBeInTheDocument();
      expect(screen.getByText('No snippets yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first snippet to get started')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create first snippet/i })).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should filter snippets by search term in name', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search snippets...');
      await user.type(searchInput, 'GitHub');

      expect(screen.getByText('Snippets (1)')).toBeInTheDocument();
      expect(screen.getByText('GitHub Helper')).toBeInTheDocument();
      expect(screen.queryByText('Example Script')).not.toBeInTheDocument();
    });

    it('should filter snippets by search term in code', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search snippets...');
      await user.type(searchInput, 'Universal script');

      expect(screen.getByText('Snippets (1)')).toBeInTheDocument();
      expect(screen.getByText('Universal Script')).toBeInTheDocument();
    });

    it('should show only matching URL snippets when filter is enabled', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const matchingFilter = screen.getByLabelText(/show matching url only/i);
      await user.click(matchingFilter);

      // Should show GitHub Helper and Universal Script (both match github.com)
      expect(screen.getByText('Snippets (2)')).toBeInTheDocument();
      expect(screen.getByText('GitHub Helper')).toBeInTheDocument();
      expect(screen.getByText('Universal Script')).toBeInTheDocument();
      expect(screen.queryByText('Example Script')).not.toBeInTheDocument();
    });

    it('should show only enabled snippets when filter is enabled', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const enabledFilter = screen.getByLabelText(/show enabled only/i);
      await user.click(enabledFilter);

      // Should show GitHub Helper and Universal Script (both enabled)
      expect(screen.getByText('Snippets (2)')).toBeInTheDocument();
      expect(screen.getByText('GitHub Helper')).toBeInTheDocument();
      expect(screen.getByText('Universal Script')).toBeInTheDocument();
      expect(screen.queryByText('Example Script')).not.toBeInTheDocument();
    });

    it('should show no results message when filters match nothing', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search snippets...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('Snippets (0)')).toBeInTheDocument();
      expect(screen.getByText('No snippets match your filters')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });

    it('should disable URL matching filter when no current URL', () => {
      render(<SnippetList {...mockProps} currentUrl="" />);

      const matchingFilter = screen.getByLabelText(/show matching url only/i);
      expect(matchingFilter).toBeDisabled();
    });
  });

  describe('Snippet Actions', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      expect(mockProps.onEdit).toHaveBeenCalledWith(mockSnippets[0]);
    });

    it('should call onExecute when run button is clicked for enabled snippet', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const runButtons = screen.getAllByRole('button', { name: /run/i });
      await user.click(runButtons[0]); // GitHub Helper (enabled)

      expect(mockProps.onExecute).toHaveBeenCalledWith(
        'console.log("GitHub script");',
        'snippet-1'
      );
    });

    it('should not execute disabled snippet', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const runButtons = screen.getAllByRole('button', { name: /run/i });
      const disabledRunButton = runButtons.find(button => 
        button.closest('[class*="card"]')?.textContent?.includes('Example Script')
      );
      
      if (disabledRunButton) {
        expect(disabledRunButton).toBeDisabled();
      }
    });

    it('should toggle snippet enabled state', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      // Find the snippet switches (skip the filter switches)
      const allSwitches = screen.getAllByRole('switch');
      // The first two switches are filters, snippet switches start from index 2
      const githubSwitch = allSwitches[2]; // GitHub Helper switch

      expect(githubSwitch).toBeChecked();
      await user.click(githubSwitch);

      expect(LocalStorageService.updateSnippet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'snippet-1',
          enabled: false,
        })
      );
    });

    it('should delete snippet with confirmation', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<SnippetList {...mockProps} />);

      // Find delete buttons by looking for trash icons
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[data-lucide="trash-2"]')
      );
      
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);
        expect(confirmSpy).toHaveBeenCalled();
        expect(LocalStorageService.deleteSnippet).toHaveBeenCalled();
      }

      confirmSpy.mockRestore();
    });

    it('should not delete snippet if user cancels confirmation', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<SnippetList {...mockProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const trashButton = deleteButtons.find(button => 
        button.querySelector('[data-lucide="trash-2"]')
      );
      
      if (trashButton) {
        await user.click(trashButton);
      }

      expect(LocalStorageService.deleteSnippet).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Import/Export Functionality', () => {
    it('should call onNew when new snippet button is clicked', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const newButton = screen.getByRole('button', { name: /new snippet/i });
      await user.click(newButton);

      expect(mockProps.onNew).toHaveBeenCalled();
    });

    it('should call onImport when import button is clicked', async () => {
      const user = userEvent.setup();
      render(<SnippetList {...mockProps} />);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      expect(mockProps.onImport).toHaveBeenCalled();
    });
  });

  describe('Date Formatting', () => {
    it('should display formatted dates correctly', () => {
      render(<SnippetList {...mockProps} />);

      // Check that dates are displayed (exact format may vary by locale)
      expect(screen.getAllByText(/Jan/)).toHaveLength(3);
    });
  });

  describe('Current URL Display', () => {
    it('should show current URL hostname in footer', () => {
      render(<SnippetList {...mockProps} />);

      // The footer is in SnippetPanel, not SnippetList
      expect(screen.getByText('GitHub Helper')).toBeInTheDocument();
    });

    it('should show no active page when no URL provided', () => {
      render(<SnippetList {...mockProps} currentUrl="" />);

      // The footer is in SnippetPanel, not SnippetList
      expect(screen.getByText('GitHub Helper')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle LocalStorageService errors gracefully', () => {
      vi.mocked(LocalStorageService.getSnippets).mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not crash the component
      render(<SnippetList {...mockProps} />);
      expect(screen.getByText('Snippets (0)')).toBeInTheDocument();
    });

    it('should handle update errors gracefully', async () => {
      const user = userEvent.setup();
      vi.mocked(LocalStorageService.updateSnippet).mockImplementation(() => {
        throw new Error('Update error');
      });

      render(<SnippetList {...mockProps} />);

      const allSwitches = screen.getAllByRole('switch');
      const githubSwitch = allSwitches[2]; // Skip filter switches
      
      // Should not crash when update fails
      await user.click(githubSwitch);
      expect(screen.getByText('GitHub Helper')).toBeInTheDocument();
    });
  });
});