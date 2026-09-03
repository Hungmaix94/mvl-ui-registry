import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

/**
 * Generic hook for API queries using React Query
 */
export function useApiQuery<TData, TError = Error>(
  queryKey: (string | number | boolean | null | undefined)[],
  queryFunction: (context: { signal: AbortSignal }) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFunction({ signal }),
    ...options,
  })
}

/**
 * Extended options for useApiMutation with error toast support
 */
type ApiMutationOptions<TData, TError, TVariables> = UseMutationOptions<
  TData,
  TError,
  TVariables
> & {
  /** If true, shows toast error message on mutation failure (default: false) */
  showErrorToast?: boolean
  /** If true, skips the default global invalidateQueries() on success (default: false) */
  skipInvalidateOnSuccess?: boolean
}

/**
 * Generic hook for API mutations using React Query
 * @param mutationFunction - The async function to execute
 * @param options - React Query mutation options + showErrorToast
 */
export function useApiMutation<TData, TError = Error, TVariables = unknown>(
  mutationFunction: (variables: TVariables) => Promise<TData>,
  options?: ApiMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient()
  const { showErrorToast, skipInvalidateOnSuccess, ...mutationOptions } = options || {}

  return useMutation({
    mutationFn: mutationFunction,
    onSuccess: (data, variables, context) => {
      if (!skipInvalidateOnSuccess) {
        queryClient.invalidateQueries().then().finally()
      }
      mutationOptions?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      // Show toast error if enabled
      if (showErrorToast) {
        toastService.error(extractErrorMessage(error))
      }
      mutationOptions?.onError?.(error, variables, context)
    },
    ...mutationOptions,
  })
}

/**
 * Hook for invalidating specific queries
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateByKey: (queryKey: (string | number | boolean | null | undefined)[]) =>
      queryClient.invalidateQueries({ queryKey }),
    invalidateByPrefix: (prefix: string) =>
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          if (!Array.isArray(key) || key.length === 0) return false
          const path = key.filter((k): k is string => typeof k === 'string').join('/')
          return path.startsWith(prefix)
        },
      }),
  }
}
