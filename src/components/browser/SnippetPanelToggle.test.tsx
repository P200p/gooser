import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WebBrowser } from './WebBrowser'

// Mock sonner toast to avoid issues in tests
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Snippet Panel Toggle', () => {
  it('should render snippet panel toggle button', () => {
    render(<WebBrowser />)
    
    // Look for the snippet panel toggle button by title
    const toggleButton = screen.getByTitle('Open Snippet Panel')
    expect(toggleButton).toBeInTheDocument()
  })

  it('should toggle snippet panel visibility when clicked', () => {
    render(<WebBrowser />)
    
    // Initially, snippet panel should be closed
    const toggleButton = screen.getByTitle('Open Snippet Panel')
    expect(toggleButton).toBeInTheDocument()
    
    // Click to open the panel
    fireEvent.click(toggleButton)
    
    // Button title should change to "Close"
    const closeButton = screen.getByTitle('Close Snippet Panel')
    expect(closeButton).toBeInTheDocument()
    
    // Should show snippet panel content
    expect(screen.getByText('Snippet Manager')).toBeInTheDocument()
  })

  it('should show responsive button text', () => {
    render(<WebBrowser />)
    
    const toggleButton = screen.getByTitle('Open Snippet Panel')
    
    // Should contain the "Snippets" text (on larger screens)
    expect(toggleButton).toHaveTextContent('Snippets')
  })
})