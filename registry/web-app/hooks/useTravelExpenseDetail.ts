import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTravelExpense } from '@/features/payroll/services/travel-expense-service'
import { parsePositiveInt } from '@/utils/common.ts'
import { isNotFoundError } from '@/utils/error-utils'

export function useTravelExpenseDetail() {
  const { id } = useParams<{ id: string }>()
  const expenseId = useMemo(() => parsePositiveInt(id ?? null), [id])

  const {
    data: expense,
    isLoading,
    error,
  } = useTravelExpense(expenseId || 0, {
    enabled: !!expenseId && expenseId > 0,
  })

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
    error,
    isNotFound,
    isError,
    expenseId: expenseId || 0,
  }
}
