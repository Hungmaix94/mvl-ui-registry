import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'
import { useQueryClient } from '@tanstack/react-query'

// ===== TYPE DEFINITIONS =====
export type RecoveryVoucher = components['schemas']['RecoveryVoucher']
export type RecoveryVoucherRequest = components['schemas']['RecoveryVoucherRequest']
export type PatchedRecoveryVoucherRequest = components['schemas']['PatchedRecoveryVoucherRequest']
export type PaginatedRecoveryVoucherList = components['schemas']['PaginatedRecoveryVoucherList']

export type GetRecoveryVouchersParams =
  paths['/api/payroll/recovery-vouchers/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class RecoveryVoucherService extends BaseApiService {
  /**
   * Get all recovery vouchers
   */
  async getRecoveryVouchers(params?: GetRecoveryVouchersParams) {
    return await this.getPaginated(ApiPaths.payroll_recovery_vouchers_list, params)
  }

  /**
   * Create a new recovery voucher
   */
  async createRecoveryVoucher(voucherData: RecoveryVoucherRequest) {
    return await this.post(ApiPaths.payroll_recovery_vouchers_create, voucherData)
  }

  /**
   * Get recovery voucher by ID
   */
  async getRecoveryVoucher(id: number) {
    return await this.get(ApiPaths.payroll_recovery_vouchers_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update recovery voucher
   */
  async updateRecoveryVoucher(id: number, voucherData: RecoveryVoucherRequest) {
    return await this.put(ApiPaths.payroll_recovery_vouchers_update, voucherData, { path: { id } })
  }

  /**
   * Partially update recovery voucher
   */
  async partialUpdateRecoveryVoucher(id: number, voucherData: PatchedRecoveryVoucherRequest) {
    return await this.patch(ApiPaths.payroll_recovery_vouchers_partial_update, voucherData, {
      path: { id },
    })
  }

  /**
   * Delete recovery voucher
   */
  async deleteRecoveryVoucher(id: number) {
    return await this.delete(ApiPaths.payroll_recovery_vouchers_destroy, { path: { id } })
  }

  /**
   * Export recovery vouchers to XLSX
   */
  async exportRecoveryVouchers(params?: {
    async?: boolean
    delivery?: 'link' | 'direct'
    fields?: string
    [key: string]: any
  }) {
    return await this.get(ApiPaths.payroll_recovery_vouchers_export_retrieve, { query: params })
  }

  /**
   * Get recovery voucher histories
   */
  async getRecoveryVoucherHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_recovery_vouchers_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  /**
   * Get recovery voucher history detail
   */
  async getRecoveryVoucherHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_recovery_vouchers_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _recoveryVoucherService: RecoveryVoucherService | null = null

export function getRecoveryVoucherService(): RecoveryVoucherService {
  if (!_recoveryVoucherService) {
    _recoveryVoucherService = new RecoveryVoucherService()
  }
  return _recoveryVoucherService
}

// ===== REACT QUERY HOOKS =====
export function useRecoveryVouchers(
  params?: GetRecoveryVouchersParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.RECOVERY_VOUCHERS.LIST(params || {}),
    () => getRecoveryVoucherService().getRecoveryVouchers(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    }
  )
}

export function useRecoveryVoucher(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.RECOVERY_VOUCHERS.DETAIL(id),
    () => getRecoveryVoucherService().getRecoveryVoucher(id),
    {
      enabled: options?.enabled !== false && !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateRecoveryVoucher() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: RecoveryVoucherRequest) => getRecoveryVoucherService().createRecoveryVoucher(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'recovery-vouchers', 'list'],
        })
      },
    }
  )
}

export function useUpdateRecoveryVoucher() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: RecoveryVoucherRequest }) =>
      getRecoveryVoucherService().updateRecoveryVoucher(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.RECOVERY_VOUCHERS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'recovery-vouchers', 'list'],
        })
      },
    }
  )
}

export function usePartialUpdateRecoveryVoucher() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedRecoveryVoucherRequest }) =>
      getRecoveryVoucherService().partialUpdateRecoveryVoucher(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.RECOVERY_VOUCHERS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'recovery-vouchers', 'list'],
        })
      },
    }
  )
}

export function useDeleteRecoveryVoucher() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getRecoveryVoucherService().deleteRecoveryVoucher(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payroll', 'recovery-vouchers', 'list'],
      })
    },
  })
}

export function useExportRecoveryVouchers() {
  return useApiMutation(
    (params?: {
      async?: boolean
      delivery?: 'link' | 'direct'
      fields?: string
      [key: string]: any
    }) => getRecoveryVoucherService().exportRecoveryVouchers(params)
  )
}

export function useRecoveryVoucherHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.RECOVERY_VOUCHERS.HISTORIES(id, params || {}),
    () => getRecoveryVoucherService().getRecoveryVoucherHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useRecoveryVoucherHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.RECOVERY_VOUCHERS.HISTORY_DETAIL(id, logId),
    () => getRecoveryVoucherService().getRecoveryVoucherHistory(id, logId),
    {
      enabled: options?.enabled !== false && !!id && !!logId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}
