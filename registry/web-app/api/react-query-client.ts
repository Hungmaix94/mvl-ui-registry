import { QueryClient } from '@tanstack/react-query'

function is401Error(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  if (e.status === 401) return true
  const res = e.response as Record<string, unknown> | undefined
  if (res && typeof res.status === 'number' && res.status === 401) return true
  return false
}

// Create standard React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => (is401Error(error) ? false : failureCount < 1),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

export { queryClient as default }
