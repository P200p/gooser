import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'
import { WebBrowser } from './WebBrowser'

// Mock sonner toast to avoid issues in tests
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('WebBrowser URL Navigation Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  /**
   * Feature: snippet-embedding-browser, Property 1: URL Navigation Consistency
   * For any valid URL input, navigating to that URL should result in the browser 
   * displaying the corresponding website content and updating the address bar to 
   * reflect the current location.
   * Validates: Requirements 1.1, 1.2
   */
  it('should maintain URL navigation consistency for any valid URL', () => {
    fc.assert(
      fc.property(
        // Generate valid URLs for testing
        fc.oneof(
          fc.webUrl(),
          fc.record({
            protocol: fc.constantFrom('http', 'https'),
            domain: fc.domain(),
            path: fc.option(fc.string().map(s => '/' + s.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/g, '')), { nil: '' })
          }).map(({ protocol, domain, path }) => `${protocol}://${domain}${path || ''}`)
        ),
        (url) => {
          // Render the WebBrowser component
          render(<WebBrowser />)
          
          // Find the URL input field
          const urlInput = screen.getByPlaceholderText('Enter URL...')
          expect(urlInput).toBeInTheDocument()
          
          // Clear any existing value and enter the test URL
          fireEvent.change(urlInput, { target: { value: '' } })
          fireEvent.change(urlInput, { target: { value: url } })
          
          // Simulate pressing Enter to navigate
          fireEvent.keyDown(urlInput, { key: 'Enter', code: 'Enter' })
          
          // Verify the URL input reflects the navigated URL
          // The component may normalize URLs (add https:// if missing)
          const expectedUrl = url.startsWith('http://') || url.startsWith('https://') 
            ? url 
            : `https://${url}`
          
          expect(urlInput).toHaveValue(expectedUrl)
          
          // Verify navigation was logged (check console logs)
          const consoleElement = screen.getByText(/กำลังไปที่:/i)
          expect(consoleElement).toBeInTheDocument()
        }
      ),
      { 
        numRuns: 100,
        verbose: true 
      }
    )
  })

  it('should handle navigation history correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.webUrl(), { minLength: 2, maxLength: 5 }),
        (urls) => {
          render(<WebBrowser />)
          
          const urlInput = screen.getByPlaceholderText('Enter URL...')
          
          // Navigate through all URLs
          urls.forEach((url) => {
            fireEvent.change(urlInput, { target: { value: url } })
            fireEvent.keyDown(urlInput, { key: 'Enter', code: 'Enter' })
          })
          
          // The current URL should be the last one navigated to
          const lastUrl = urls[urls.length - 1]
          expect(urlInput).toHaveValue(lastUrl)
          
          // Test back navigation if we have multiple URLs
          if (urls.length > 1) {
            const backButton = screen.getByRole('button', { name: /back/i })
            fireEvent.click(backButton)
            
            // Should navigate to the previous URL
            const previousUrl = urls[urls.length - 2]
            expect(urlInput).toHaveValue(previousUrl)
          }
        }
      ),
      { 
        numRuns: 50,
        verbose: true 
      }
    )
  })

  it('should handle URL normalization consistently', () => {
    fc.assert(
      fc.property(
        fc.record({
          domain: fc.domain(),
          hasProtocol: fc.boolean(),
          protocol: fc.constantFrom('http', 'https')
        }),
        ({ domain, hasProtocol, protocol }) => {
          const inputUrl = hasProtocol ? `${protocol}://${domain}` : domain
          const expectedUrl = hasProtocol ? inputUrl : `https://${domain}`
          
          render(<WebBrowser />)
          
          const urlInput = screen.getByPlaceholderText('Enter URL...')
          
          fireEvent.change(urlInput, { target: { value: inputUrl } })
          fireEvent.keyDown(urlInput, { key: 'Enter', code: 'Enter' })
          
          // URL should be normalized to include protocol
          expect(urlInput).toHaveValue(expectedUrl)
        }
      ),
      { 
        numRuns: 100,
        verbose: true 
      }
    )
  })
})