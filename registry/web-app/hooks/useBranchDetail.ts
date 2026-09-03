import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useBranch, type Branch } from '@/features/org/services/branch-service'
import { isNotFoundError } from '@/utils/error-utils'

type UseBranchDetailReturn = {
  branch: Branch | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  isError: boolean
  branchId: number
}

/**
 * Custom hook to fetch and manage branch detail data
 * Extracts branchId from URL params and fetches branch data using the HRM service
 *
 * @returns Branch detail data with loading, error, and not found states
 */
export const useBranchDetail = (): UseBranchDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const branchId = Number(id)

  // Fetch branch data using the HRM service hook
  const { data: branchResponse, isLoading, error } = useBranch(branchId)

  // Extract branch data from response
  const branch = useMemo(() => {
    return branchResponse || null
  }, [branchResponse])

  // Determine if branch was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !branch
  }, [isLoading, error, branch])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    branch,
    isLoading,
    error: error as Error | null,
    isNotFound,
    isError,
    branchId,
  }
}
