/**
 * URL pattern matching utilities for snippet execution
 * Supports regex patterns and wildcard matching
 */

/**
 * Check if a URL matches a given pattern
 * Supports:
 * - "*" for all URLs
 * - "*.domain.com" for wildcard subdomains
 * - Regular expressions
 * - Simple string contains matching
 */
export function matchUrlPattern(url: string, pattern: string): boolean {
  if (!pattern || pattern === "*") {
    return true;
  }

  try {
    // Remove protocol for comparison
    const cleanUrl = url.replace(/^https?:\/\//, "").toLowerCase();
    const cleanPattern = pattern.replace(/^https?:\/\//, "").toLowerCase();
    
    // Handle wildcard patterns like *.example.com
    if (cleanPattern.startsWith("*.")) {
      const domain = cleanPattern.slice(2);
      return cleanUrl.includes(domain);
    }
    
    // Try as regex pattern first
    try {
      const regex = new RegExp(cleanPattern, 'i');
      return regex.test(cleanUrl);
    } catch {
      // If regex fails, fall back to simple contains check
      return cleanUrl.includes(cleanPattern);
    }
  } catch (error) {
    console.warn('URL pattern matching failed:', error);
    return false;
  }
}

/**
 * Validate if a pattern string is a valid regex
 */
export function isValidPattern(pattern: string): boolean {
  if (!pattern || pattern === "*") {
    return true;
  }

  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get example URLs that would match a pattern (for UI hints)
 */
export function getPatternExamples(pattern: string): string[] {
  if (!pattern || pattern === "*") {
    return ["https://example.com", "https://github.com", "https://any-website.com"];
  }

  if (pattern.startsWith("*.")) {
    const domain = pattern.slice(2);
    return [
      `https://www.${domain}`,
      `https://subdomain.${domain}`,
      `https://${domain}`
    ];
  }

  // For regex patterns, provide generic examples
  return [
    `URLs matching: ${pattern}`,
    "Test your pattern with real URLs"
  ];
}