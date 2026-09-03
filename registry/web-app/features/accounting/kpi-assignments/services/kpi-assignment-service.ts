import { BaseApiService } from '@/api/base-service'
import { extractApiData } from '@/api/response-handler'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type EmployeeKpiAssignment = components['schemas']['EmployeeKpiAssignment']
export type EmployeeKpiAssignmentRequest = components['schemas']['EmployeeKpiAssignmentRequest']
export type PatchedEmployeeKpiAssignmentRequest =
  components['schemas']['PatchedEmployeeKpiAssignmentRequest']
export type EmployeeKpiAssignmentBulkRequest =
  components['schemas']['EmployeeKpiAssignmentBulkRequest']
export type EmployeeKpiAssignmentImportResult =
  components['schemas']['EmployeeKpiAssignmentImportResult']
export type EmployeeKpiAssignmentImportRequest =
  components['schemas']['EmployeeKpiAssignmentImportRequestRequest']
/**
 * Payload FE cho import Excel: schema sinh ra `file: string` (binary) nên
 * thay bằng `File` thật — service sẽ tự build FormData khi gửi.
 */
export type EmployeeKpiAssignmentImportPayload = Omit<
  EmployeeKpiAssignmentImportRequest,
  'file'
> & {
  file: File
}
export type GetKpiAssignmentsParams =
  paths['/api/accounting/kpi-assignments/']['get']['parameters']['query']

class KpiAssignmentService extends BaseApiService {
  async getKpiAssignments(params?: GetKpiAssignmentsParams) {
    const res = await this.getPaginated(ApiPaths.accounting_kpi_assignments_list, params)
    // Handle case where backend returns raw array instead of paginated object
    if (Array.isArray(res)) {
      return {
        count: (res as any).length,
        results: res,
      } as any
    }
    return res
  }

  async getKpiAssignment(id: number) {
    return await this.get(ApiPaths.accounting_kpi_assignments_retrieve, { path: { id } })
  }

  async createKpiAssignment(data: EmployeeKpiAssignmentRequest) {
    return await this.post(ApiPaths.accounting_kpi_assignments_create, data)
  }

  async updateKpiAssignment(id: number, data: EmployeeKpiAssignmentRequest) {
    return await this.put(ApiPaths.accounting_kpi_assignments_update, data, { path: { id } })
  }

  async partialUpdateKpiAssignment(id: number, data: PatchedEmployeeKpiAssignmentRequest) {
    return await this.patch(ApiPaths.accounting_kpi_assignments_partial_update, data, {
      path: { id },
    })
  }

  async deleteKpiAssignment(id: number) {
    return await this.delete(ApiPaths.accounting_kpi_assignments_destroy, { path: { id } })
  }

  async bulkCreateKpiAssignments(data: EmployeeKpiAssignmentBulkRequest) {
    return await this.post(ApiPaths.accounting_kpi_assignments_bulk_create, data)
  }

  /**
   * Endpoint chỉ nhận multipart/form-data (file Excel binary). Schema sinh ra
   * type `file: string` nên body chỉ mang metadata đúng kiểu; bodySerializer
   * gửi FormData thật (openapi-fetch giữ nguyên FormData, browser tự set
   * Content-Type + boundary).
   */
  async importExcelKpiAssignments(payload: EmployeeKpiAssignmentImportPayload) {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('year', String(payload.year))
    formData.append('month', String(payload.month))
    const response = await this.client.POST(
      ApiPaths.accounting_kpi_assignments_import_excel_create,
      {
        body: { file: payload.file.name, year: payload.year, month: payload.month },
        bodySerializer: () => formData,
      }
    )
    // Op chỉ khai báo response 200 nên type của `error` là never — vẫn phải
    // check runtime vì non-2xx trả error envelope qua openapi-fetch.
    const { error } = response
    if (error) {
      throw error
    }
    return extractApiData<EmployeeKpiAssignmentImportResult>(response)
  }

  async computeKpiAssignments(data: { year: number; month: number }) {
    return await this.post(
      ApiPaths.accounting_kpi_assignments_compute_create,
      data as unknown as EmployeeKpiAssignmentRequest
    )
  }

  async confirmKpiAssignment(id: number) {
    return await this.post(
      ApiPaths.accounting_kpi_assignments_confirm_create,
      {} as unknown as EmployeeKpiAssignmentRequest,
      {
        path: { id },
      }
    )
  }

  async getKpiAssignmentHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_kpi_assignments_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getKpiAssignmentHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_kpi_assignments_history_retrieve, {
      path: { id, log_id: logId },
    })
  }
}

let _service: KpiAssignmentService | null = null

export function getKpiAssignmentService(): KpiAssignmentService {
  if (!_service) _service = new KpiAssignmentService()
  return _service
}

export function useKpiAssignments(
  params?: GetKpiAssignmentsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_ASSIGNMENTS.LIST(params || {}),
    () => getKpiAssignmentService().getKpiAssignments(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useKpiAssignment(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_ASSIGNMENTS.DETAIL(id),
    () => getKpiAssignmentService().getKpiAssignment(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useComputeKpiAssignments() {
  return useApiMutation((data: { year: number; month: number }) =>
    getKpiAssignmentService().computeKpiAssignments(data)
  )
}

export function useConfirmKpiAssignment() {
  return useApiMutation((id: number) => getKpiAssignmentService().confirmKpiAssignment(id))
}

export function useCreateKpiAssignment() {
  return useApiMutation((data: EmployeeKpiAssignmentRequest) =>
    getKpiAssignmentService().createKpiAssignment(data)
  )
}

export function useUpdateKpiAssignment() {
  return useApiMutation((variables: { id: number; data: EmployeeKpiAssignmentRequest }) =>
    getKpiAssignmentService().updateKpiAssignment(variables.id, variables.data)
  )
}

export function usePartialUpdateKpiAssignment() {
  return useApiMutation((variables: { id: number; data: PatchedEmployeeKpiAssignmentRequest }) =>
    getKpiAssignmentService().partialUpdateKpiAssignment(variables.id, variables.data)
  )
}

export function useDeleteKpiAssignment() {
  return useApiMutation((id: number) => getKpiAssignmentService().deleteKpiAssignment(id))
}

export function useBulkCreateKpiAssignments() {
  return useApiMutation((data: EmployeeKpiAssignmentBulkRequest) =>
    getKpiAssignmentService().bulkCreateKpiAssignments(data)
  )
}

export function useImportExcelKpiAssignments() {
  return useApiMutation((payload: EmployeeKpiAssignmentImportPayload) =>
    getKpiAssignmentService().importExcelKpiAssignments(payload)
  )
}

export function useKpiAssignmentHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_ASSIGNMENTS.HISTORIES(id, params || {}),
    () => getKpiAssignmentService().getKpiAssignmentHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useKpiAssignmentHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_ASSIGNMENTS.HISTORY_DETAIL(id, logId),
    () => getKpiAssignmentService().getKpiAssignmentHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
