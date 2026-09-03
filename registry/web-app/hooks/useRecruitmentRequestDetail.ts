import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  type RecruitmentRequest,
  useRecruitmentRequest,
} from '@/features/recruitment/services/recruitment-request-service'
import { isNotFoundError } from '@/utils/error-utils'

type UseRecruitmentRequestDetailReturn = {
  request: RecruitmentRequest | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  isError: boolean
  requestId: number
}

export const useRecruitmentRequestDetail = (): UseRecruitmentRequestDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const requestId = Number(id)

  // Fetch recruitment request data using the HRM service hook
  const { data: request, isLoading, error } = useRecruitmentRequest(requestId)

  // Determine if request was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !request
  }, [isLoading, error, request])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    request: request || null,
    isLoading,
    error: error as Error | null,
    isNotFound,
    isError,
    requestId,
  }
}
