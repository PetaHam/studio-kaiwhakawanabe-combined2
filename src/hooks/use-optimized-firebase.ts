'use client'

import { useEffect, useState, useRef } from 'react'
import { DocumentReference, onSnapshot, Query, DocumentData } from 'firebase/firestore'
import { getCachedQuery, setCachedQuery, debounce } from './firebase-optimization.ts'

interface UseOptimizedDocOptions {
  enableCache?: boolean
  cacheKey?: string
  debounceMs?: number
}

// Optimized useDoc hook with caching
export function useOptimizedDoc<T = DocumentData>(
  ref: DocumentReference | null,
  options: UseOptimizedDocOptions = {}
) {
  const { enableCache = true, cacheKey, debounceMs = 0 } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!ref) {
      setData(null)
      setLoading(false)
      return
    }

    // Check cache first
    if (enableCache && cacheKey) {
      const cached = getCachedQuery(cacheKey)
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }
    }

    setLoading(true)

    const updateData = debounceMs > 0
      ? debounce((newData: T) => {
          setData(newData)
          if (enableCache && cacheKey) {
            setCachedQuery(cacheKey, newData)
          }
        }, debounceMs)
      : (newData: T) => {
          setData(newData)
          if (enableCache && cacheKey) {
            setCachedQuery(cacheKey, newData)
          }
        }

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          updateData({ id: snapshot.id, ...snapshot.data() } as T)
        } else {
          setData(null)
        }
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Firestore error:', err)
        setError(err as Error)
        setLoading(false)
      }
    )

    unsubscribeRef.current = unsubscribe
    return () => unsubscribe()
  }, [ref, enableCache, cacheKey, debounceMs])

  return { data, loading, error }
}

// Optimized useCollection hook with caching
export function useOptimizedCollection<T = DocumentData>(
  queryRef: Query<DocumentData> | null,
  options: UseOptimizedDocOptions = {}
) {
  const { enableCache = true, cacheKey, debounceMs = 100 } = options
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!queryRef) {
      setData([])
      setLoading(false)
      return
    }

    // Check cache first
    if (enableCache && cacheKey) {
      const cached = getCachedQuery(cacheKey)
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }
    }

    setLoading(true)

    const updateData = debounceMs > 0
      ? debounce((newData: T[]) => {
          setData(newData)
          if (enableCache && cacheKey) {
            setCachedQuery(cacheKey, newData)
          }
        }, debounceMs)
      : (newData: T[]) => {
          setData(newData)
          if (enableCache && cacheKey) {
            setCachedQuery(cacheKey, newData)
          }
        }

    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[]
        updateData(docs)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Firestore error:', err)
        setError(err as Error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [queryRef, enableCache, cacheKey, debounceMs])

  return { data, loading, error }
}