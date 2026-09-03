import { useState, useCallback } from 'react'

interface UseSearchQueryOptions {
  initialQuery?: string
}

interface UseSearchQueryResult {
  searchQuery: string
  setSearchQuery: (query: string) => void
  handleSearchChange: (query: string) => void
}

export function useSearchQuery(options?: UseSearchQueryOptions): UseSearchQueryResult {
  const [searchQuery, setSearchQuery] = useState(options?.initialQuery || '')

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    handleSearchChange,
  }
}
