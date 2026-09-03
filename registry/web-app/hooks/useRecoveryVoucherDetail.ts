import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useRecoveryVoucher } from '@/features/payroll/services/recovery-voucher-service'
import { parsePositiveInt } from '@/utils/common.ts'
import { isNotFoundError } from '@/utils/error-utils'

export function useRecoveryVoucherDetail() {
  const { id } = useParams<{ id: string }>()
  const voucherId = useMemo(() => parsePositiveInt(id ?? null), [id])

  const {
    data: voucher,
    isLoading,
    error,
  } = useRecoveryVoucher(voucherId || 0, {
    enabled: !!voucherId && voucherId > 0,
  })

  // Determine if voucher was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !voucher
  }, [isLoading, error, voucher])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    voucher,
    isLoading,
    error,
    isNotFound,
    isError,
    voucherId: voucherId || 0,
  }
}
