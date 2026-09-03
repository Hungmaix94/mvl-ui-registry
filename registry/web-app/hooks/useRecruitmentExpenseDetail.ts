import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  useRecruitmentExpense,
  type RecruitmentExpense,
} from '@/features/recruitment/services/recruitment-expense-service'
import { isNotFoundError } from '@/utils/error-utils'

type UseRecruitmentExpenseDetailReturn = {
  expense: RecruitmentExpense | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  isError: boolean
  expenseId: number
}

/**
 * Custom hook to fetch and manage recruitment expense detail data
 * Extracts expenseId from URL params and fetches expense data using the HRM service
 *
 * @returns Recruitment expense detail data with loading, error, and not found states
 */
export const useRecruitmentExpenseDetail = (): UseRecruitmentExpenseDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const expenseId = Number(id)

  // Fetch recruitment expense data using the HRM service hook
  const { data: expenseResponse, isLoading, error } = useRecruitmentExpense(expenseId)

  // Extract expense data from response
  const expense = useMemo(() => expenseResponse || null, [expenseResponse])

  // Determine if expense was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !expense
  }, [isLoading, error, expense])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    expense,
    isLoading,
    error: error as Error | null,
    isNotFound,
    isError,
    expenseId,
  }
}
