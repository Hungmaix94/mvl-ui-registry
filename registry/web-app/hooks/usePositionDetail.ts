import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { usePosition, type Position } from '@/features/org/services/position-service'
import { isNotFoundError } from '@/utils/error-utils'

type UsePositionDetailReturn = {
  position: Position | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  isError: boolean
  positionId: number
}

/**
 * Custom hook to fetch and manage position detail data
 * Extracts positionId from URL params and fetches position data using the HRM service
 *
 * @returns Position detail data with loading, error, and not found states
 */
export const usePositionDetail = (): UsePositionDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const positionId = Number(id)

  // Fetch position data using the HRM service hook
  const { data: positionResponse, isLoading, error } = usePosition(positionId)

  // Extract position data from response
  const position = useMemo(() => {
    return positionResponse || null
  }, [positionResponse])

  // Determine if position was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !position
  }, [isLoading, error, position])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    position,
    isLoading,
    error: error as Error | null,
    isNotFound,
    isError,
    positionId,
  }
}
