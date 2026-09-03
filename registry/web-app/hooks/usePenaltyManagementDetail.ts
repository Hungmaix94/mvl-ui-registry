import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { usePenaltyTicket } from '@/features/payroll/services/penalty-ticket-service'
import { parsePositiveInt } from '@/utils/common.ts'
import { isNotFoundError } from '@/utils/error-utils'

export function usePenaltyManagementDetail() {
  const { id } = useParams<{ id: string }>()
  const penaltyTicketId = useMemo(() => parsePositiveInt(id ?? null), [id])

  const {
    data: penaltyTicket,
    isLoading,
    error,
  } = usePenaltyTicket(penaltyTicketId || 0, {
    enabled: !!penaltyTicketId && penaltyTicketId > 0,
  })

  // Determine if penalty ticket was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !penaltyTicket
  }, [isLoading, error, penaltyTicket])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    penaltyTicket,
    isLoading,
    error,
    isNotFound,
    isError,
    penaltyTicketId: penaltyTicketId || 0,
  }
}
