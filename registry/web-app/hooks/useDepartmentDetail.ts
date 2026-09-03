import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useDepartment, type Department } from '@/features/org/services/department-service'
import { isNotFoundError } from '@/utils/error-utils'

type UseDepartmentDetailReturn = {
  department: Department | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  isError: boolean
  departmentId: number
}

/**
 * Custom hook to fetch and manage department detail data
 * Extracts departmentId from URL params and fetches department data using the HRM service
 *
 * @returns Department detail data with loading, error, and not found states
 */
export const useDepartmentDetail = (): UseDepartmentDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const departmentId = Number(id)

  // Fetch department data using the HRM service hook
  const { data: departmentResponse, isLoading, error } = useDepartment(departmentId)

  // Extract department data from response
  const department = useMemo(() => departmentResponse || null, [departmentResponse])

  // Determine if department was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !department
  }, [isLoading, error, department])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    department,
    isLoading,
    error: error as Error | null,
    isNotFound,
    isError,
    departmentId,
  }
}
