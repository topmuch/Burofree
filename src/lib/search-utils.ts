/**
 * Search Utilities for Maellis Full-Text Search
 *
 * Provides snippet generation, scoring, and filter parsing
 * for the advanced search API endpoint.
 */

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Extract a snippet of text around the first occurrence of the query,
 * wrapping matching text in `<mark>` tags.
 *
 * @param text     The full text to search within
 * @param query    The search query string
 * @param maxLength  Maximum snippet length (default 120)
 * @returns An HTML snippet with `<mark>` tags around matching portions
 */
export function generateSnippet(
  text: string,
  query: string,
  maxLength: number = 120
): string {
  if (!text || !query) return text ? truncate(text, maxLength) : ''

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // Find the first occurrence of the query in the text
  const matchIndex = lowerText.indexOf(lowerQuery)

  if (matchIndex === -1) {
    // No match found — return truncated beginning
    return truncate(text, maxLength)
  }

  // Calculate the snippet window centered around the match
  const matchEnd = matchIndex + query.length
  const contextBefore = Math.floor((maxLength - query.length) / 2)
  const contextAfter = Math.ceil((maxLength - query.length) / 2)

  let snippetStart = Math.max(0, matchIndex - contextBefore)
  let snippetEnd = Math.min(text.length, matchEnd + contextAfter)

  // Adjust to not cut words at boundaries
  if (snippetStart > 0) {
    const spaceBefore = text.lastIndexOf(' ', snippetStart)
    if (spaceBefore !== -1 && spaceBefore > snippetStart - 20) {
      snippetStart = spaceBefore + 1
    }
  }

  if (snippetEnd < text.length) {
    const spaceAfter = text.indexOf(' ', snippetEnd)
    if (spaceAfter !== -1 && spaceAfter < snippetEnd + 20) {
      snippetEnd = spaceAfter
    }
  }

  // Extract the raw snippet
  const rawSnippet = text.slice(snippetStart, snippetEnd)

  // Add ellipsis indicators
  const prefix = snippetStart > 0 ? '…' : ''
  const suffix = snippetEnd < text.length ? '…' : ''

  // Escape HTML first to prevent XSS, then apply <mark> tags
  const escapedSnippet = escapeHtml(rawSnippet)
  const markedSnippet = highlightMatches(escapedSnippet, escapeHtml(query))

  return `${prefix}${markedSnippet}${suffix}`
}

/**
 * Highlight all occurrences of the query in the text with `<mark>` tags.
 * IMPORTANT: The text should already be HTML-escaped before calling this.
 * Case-insensitive matching while preserving original casing.
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text

  // Escape special regex characters in the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')

  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return escapeHtml(text)
  // Try to break at a word boundary
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.6) {
    return escapeHtml(truncated.slice(0, lastSpace)) + '…'
  }
  return escapeHtml(truncated) + '…'
}

/**
 * Calculate a relevance score for a search result.
 *
 * Scoring rules:
 * - Title match: +3 points
 * - Body/description match: +1 point
 * - Recent items (within 7 days): +1 point
 * - Recent items (within 30 days): +0.5 point
 *
 * @param item  Object with match info and creation date
 * @returns Numeric score (higher = more relevant)
 */
export function calculateScore(item: {
  titleMatch: boolean
  bodyMatch: boolean
  createdAt: string | Date
}): number {
  let score = 0

  if (item.titleMatch) score += 3
  if (item.bodyMatch) score += 1

  // Recency bonus
  const createdDate = typeof item.createdAt === 'string'
    ? new Date(item.createdAt)
    : item.createdAt

  if (createdDate && !isNaN(createdDate.getTime())) {
    const now = new Date()
    const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)

    if (ageInDays <= 7) {
      score += 1
    } else if (ageInDays <= 30) {
      score += 0.5
    }
  }

  // Round to 1 decimal
  return Math.round(score * 10) / 10
}

/**
 * Parse a comma-separated filter string of key:value pairs.
 *
 * Example: "tag:urgent,client:acme" → { tag: "urgent", client: "acme" }
 *
 * Handles edge cases:
 * - Empty or null input returns empty object
 * - Values with colons (only first colon is the separator)
 * - Whitespace trimming
 * - Duplicate keys (last value wins)
 *
 * @param filterStr  The raw filter string from the query parameter
 * @returns An object mapping filter keys to their values
 */
export function parseFilters(filterStr: string): Record<string, string> {
  if (!filterStr || typeof filterStr !== 'string') return {}

  const filters: Record<string, string> = {}

  const pairs = filterStr.split(',')

  for (const pair of pairs) {
    const trimmed = pair.trim()
    if (!trimmed) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim().toLowerCase()
    const value = trimmed.slice(colonIndex + 1).trim()

    if (key && value) {
      filters[key] = value
    }
  }

  return filters
}
