import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type PayrollSlip = components['schemas']['PayrollSlip']
// PayrollSlipDetail is same as PayrollSlip in schema
export type PayrollSlipHoldRequest = components['schemas']['PayrollSlipHoldRequest']
export type PayrollSlipStatusUpdateRequest = components['schemas']['PayrollSlipStatusUpdateRequest']
export type PaginatedPayrollSlipList = components['schemas']['PaginatedPayrollSlipList']

export type GetPayrollSlipsParams =
  paths['/api/payroll/payroll-slips/']['get']['parameters']['query']
export type GetPayrollSlipsExportParams =
  paths['/api/payroll/payroll-slips/export/']['get']['parameters']['query']
export type GetPayrollSlipsByPeriodExportParams =
  paths['/api/payroll/salary-periods/{id}/payrollslips-export/']['get']['parameters']['query']
export type GetReadyPayrollSlipsParams =
  paths['/api/payroll/salary-periods/{id}/ready/']['get']['parameters']['query']
export type GetNotReadyPayrollSlipsParams =
  paths['/api/payroll/salary-periods/{id}/not-ready/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class PayrollSlipService extends BaseApiService {
  /**
   * Get payroll slips list
   */
  async getPayrollSlips(params?: GetPayrollSlipsParams) {
    return await this.getPaginated(ApiPaths.payroll_payroll_slips_list, params)
  }

  /**
   * Get ready payroll slips for salary period
   */
  async getReadyPayrollSlips(id: number, params?: GetReadyPayrollSlipsParams) {
    return await this.get(ApiPaths.payroll_salary_periods_ready_list, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get not ready payroll slips for salary period
   */
  async getNotReadyPayrollSlips(id: number, params?: GetNotReadyPayrollSlipsParams) {
    return await this.get(ApiPaths.payroll_salary_periods_not_ready_list, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get payroll slip by ID
   */
  async getPayrollSlip(id: number) {
    return await this.get(ApiPaths.payroll_payroll_slips_retrieve, {
      path: { id },
    })
  }

  /**
   * Export payroll slips to XLSX
   */
  async exportPayrollSlips(params?: GetPayrollSlipsExportParams) {
    return await this.get(ApiPaths.payroll_payroll_slips_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export payroll slip document (single).
   *
   * Dùng `delivery` mặc định (`direct`) → BE trả file đính kèm (206), nên `parseAs: 'blob'`.
   * Schema lại mô tả nhánh 200 `delivery=link` (JSON `ExportDocumentS3Response`), nên type suy ra
   * từ `client.GET` là envelope JSON chứ không phải Blob — cast ở đây để chữ ký hàm nói đúng cái
   * runtime thực sự trả về (cùng pattern với các service export khác).
   */
  async exportPayrollSlipDocument(id: number): Promise<Blob | undefined> {
    const response = (await this.client.GET(
      ApiPaths.payroll_payroll_slips_export_document_retrieve,
      {
        params: {
          path: { id },
        },
        parseAs: 'blob',
      }
    )) as unknown as { data?: Blob; error?: unknown }

    if (response.error) {
      throw new Error((response.error as any).message || 'Không thể xuất tài liệu')
    }

    return response.data
  }

  /**
   * Export payroll slips by period to XLSX
   */
  async exportPayrollSlipsByPeriod(id: number, params?: GetPayrollSlipsByPeriodExportParams) {
    return await this.get(ApiPaths.payroll_salary_periods_payrollslips_export_retrieve, {
      path: { id },
      query: params,
    })
  }

  /**
   * Send payroll slip email
   */
  async sendPayrollSlipEmail(id: number) {
    return await this.post(ApiPaths.payroll_payroll_slips_send_email_create, undefined, {
      path: { id },
    })
  }

  /**
   * Deliver payroll slip
   */
  async deliverPayrollSlip(id: number, data: PayrollSlipStatusUpdateRequest) {
    return await this.post(ApiPaths.payroll_payroll_slips_deliver_create, data, {
      path: { id },
    })
  }

  /**
   * Hold payroll slip
   */
  async holdPayrollSlip(id: number, data: PayrollSlipHoldRequest) {
    return await this.post(ApiPaths.payroll_payroll_slips_hold_create, data, {
      path: { id },
    })
  }

  /**
   * Unhold payroll slip (reverse the hold)
   */
  async unholdPayrollSlip(id: number) {
    return await this.post(ApiPaths.payroll_payroll_slips_unhold_create, undefined, {
      path: { id },
    })
  }

  /**
   * Mark payroll slip as ready
   */
  async readyPayrollSlip(id: number, data: PayrollSlipStatusUpdateRequest) {
    return await this.post(ApiPaths.payroll_payroll_slips_ready_create, data, {
      path: { id },
    })
  }

  /**
   * Recalculate payroll slip
   */
  async recalculatePayrollSlip(id: number) {
    return await this.post(ApiPaths.payroll_payroll_slips_recalculate_create, undefined, {
      path: { id },
    })
  }

  /**
   * Get payroll slip histories
   */
  async getPayrollSlipHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_payroll_slips_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get payroll slip history detail
   */
  async getPayrollSlipHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_payroll_slips_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _payrollSlipService: PayrollSlipService | null = null

export function getPayrollSlipService(): PayrollSlipService {
  if (!_payrollSlipService) {
    _payrollSlipService = new PayrollSlipService()
  }
  return _payrollSlipService
}

// ===== REACT QUERY HOOKS =====
export function usePayrollSlips(params?: GetPayrollSlipsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.PAYROLL_SLIPS.LIST(params || {}),
    () => getPayrollSlipService().getPayrollSlips(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollSlip(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.PAYROLL_SLIPS.DETAIL(id),
    () => getPayrollSlipService().getPayrollSlip(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useExportPayrollSlips() {
  return useExport({
    exportFunction: (params?: GetPayrollSlipsExportParams) =>
      getPayrollSlipService().exportPayrollSlips(params),
    defaultFilename: 'payroll-slips',
  })
}

export function useExportPayrollSlipDocument() {
  return useApiMutation((id: number) => getPayrollSlipService().exportPayrollSlipDocument(id))
}

export function useExportPayrollSlipsByPeriod() {
  return useExport({
    exportFunction: ({
      id,
      params,
    }: {
      id: number
      params?: GetPayrollSlipsByPeriodExportParams
    }) => getPayrollSlipService().exportPayrollSlipsByPeriod(id, params),
    defaultFilename: 'payroll-slips-by-period',
  })
}

export function useSendPayrollSlipEmail() {
  return useApiMutation((id: number) => getPayrollSlipService().sendPayrollSlipEmail(id))
}

export function useDeliverPayrollSlip() {
  return useApiMutation(({ id, data }: { id: number; data: PayrollSlipStatusUpdateRequest }) =>
    getPayrollSlipService().deliverPayrollSlip(id, data)
  )
}

export function useHoldPayrollSlip() {
  return useApiMutation(({ id, data }: { id: number; data: PayrollSlipHoldRequest }) =>
    getPayrollSlipService().holdPayrollSlip(id, data)
  )
}

export function useReadyPayrollSlip() {
  return useApiMutation(({ id, data }: { id: number; data: PayrollSlipStatusUpdateRequest }) =>
    getPayrollSlipService().readyPayrollSlip(id, data)
  )
}

export function useRecalculatePayrollSlip() {
  return useApiMutation((id: number) => getPayrollSlipService().recalculatePayrollSlip(id))
}

export function useReadyPayrollSlips(
  id: number,
  params?: GetReadyPayrollSlipsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALARY_PERIODS.READY(id, params || {}),
    () => getPayrollSlipService().getReadyPayrollSlips(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: (options?.enabled ?? true) && !!id,
    }
  )
}

export function useNotReadyPayrollSlips(
  id: number,
  params?: GetNotReadyPayrollSlipsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALARY_PERIODS.NOT_READY(id, params || {}),
    () => getPayrollSlipService().getNotReadyPayrollSlips(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: (options?.enabled ?? true) && !!id,
    }
  )
}
