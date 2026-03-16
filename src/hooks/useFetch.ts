import { useState, useEffect, useCallback, useRef } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseFetchReturn<T> extends FetchState<T> {
  refetch: () => void
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseFetchReturn<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  // stable ref so we can abort stale requests
  const abortRef = useRef(false)

  const execute = useCallback(async () => {
    abortRef.current = false
    setState({ data: null, loading: true, error: null })
    try {
      const data = await fetcher()
      if (!abortRef.current) setState({ data, loading: false, error: null })
    } catch (err: unknown) {
      if (!abortRef.current) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setState({ data: null, loading: false, error: message })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    execute()
    return () => { abortRef.current = true }
  }, [execute])

  return { ...state, refetch: execute }
}
