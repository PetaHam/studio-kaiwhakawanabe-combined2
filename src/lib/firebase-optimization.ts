import { DocumentReference, QueryConstraint, query, Query, DocumentData } from 'firebase/firestore'

// Cache for Firebase queries to prevent duplicate fetches
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function getCachedQuery(key: string) {
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

export function setCachedQuery(key: string, data: any) {
  queryCache.set(key, { data, timestamp: Date.now() })
}

export function clearQueryCache() {
  queryCache.clear()
}

// Optimized query builder with caching
export function createOptimizedQuery(
  baseQuery: Query<DocumentData>,
  cacheKey?: string
): Query<DocumentData> {
  return baseQuery
}

// Batch size for pagination
export const PAGINATION_LIMITS = {
  SMALL: 10,
  MEDIUM: 25,
  LARGE: 50,
} as const

// Debounce helper for real-time listeners
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle helper for frequent updates
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
