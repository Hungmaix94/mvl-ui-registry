import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  useRecruitmentSource,
  type RecruitmentSource,
} from '@/features/recruitment/services/recruitment-source-service'
import { isNotFoundError } from '@/utils/error-utils'

type UseRecruitmentSourceDetailReturn = {
  source: RecruitmentSource | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  isError: boolean
  sourceId: number
}

/**
 * Custom hook to fetch and manage recruitment source detail data
 * Extracts sourceId from URL params and fetches source data using the HRM service
 *
 * @returns Recruitment source detail data with loading, error, and not found states
 */
export const useRecruitmentSourceDetail = (): UseRecruitmentSourceDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const sourceId = Number(id)

  // Fetch recruitment source data using the HRM service hook
  const { data: sourceResponse, isLoading, error } = useRecruitmentSource(sourceId)

  // Extract source data from response
  const source = useMemo(() => {
    if (!sourceResponse || Object.keys(sourceResponse).length === 0) {
      return null
    }
    return sourceResponse as RecruitmentSource
  }, [sourceResponse])

  // Determine if source was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !source
  }, [isLoading, error, source])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    source,
    isLoading,
    error: error as Error | null,
    isNotFound,
    isError,
    sourceId,
  }
}
