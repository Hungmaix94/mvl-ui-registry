import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// Type definitions from generated schema
export type ExportStatusResponse = components['schemas']['ExportStatusResponse']
export type ExportAsyncResponse = components['schemas']['ExportAsyncResponse']
export type ExportS3DeliveryResponse = components['schemas']['ExportS3DeliveryResponse']
export type ImportJob = components['schemas']['ImportJob']

export type GetHrmRecruitmentCandidatesExportParams =
  paths['/api/hrm/recruitment-candidates/export/']['get']['parameters']['query']

export type GetHrmRecruitmentExpenseExportParams =
  paths['/api/hrm/recruitment-expenses/export/']['get']['parameters']['query']

export type GetHrmHolidaysExportParams =
  paths['/api/hrm/holidays/export/']['get']['parameters']['query']

export type GetHrmAttendanceGeolocationsExportParams =
  paths['/api/hrm/attendance-geolocations/export/']['get']['parameters']['query']

export type GetHrmEmployeeRelationshipsExportParams =
  paths['/api/hrm/employee-relationships/export/']['get']['parameters']['query']

// Request parameter types
export type GetExportStatusParams = paths['/api/export/status/']['get']['parameters']['query']
export type GetImportStatusParams = paths['/api/import/status/']['get']['parameters']['query']

/**
 * Export service extending the base API service
 * Provides export-related API operations
 */
export class ExportService extends BaseApiService {
  /**
   * Get export task status
   */
  async getExportStatus(taskId: string) {
    return await this.get(ApiPaths.export_status_retrieve, {
      query: { task_id: taskId },
    })
  }

  async getHrmRecruitmentCandidatesExport(params: GetHrmRecruitmentCandidatesExportParams) {
    return await this.get(ApiPaths.hrm_recruitment_candidates_export_retrieve, {
      query: params,
    })
  }

  async getHrmRecruitmentExpenseExport(params: GetHrmRecruitmentExpenseExportParams) {
    return await this.get(ApiPaths.hrm_recruitment_expenses_export_retrieve, {
      query: params,
    })
  }

  async getHrmHolidaysExport(params: GetHrmHolidaysExportParams) {
    return await this.get(ApiPaths.hrm_holidays_export_retrieve, {
      query: params,
    })
  }

  async getHrmAttendanceGeolocationsExport(params: GetHrmAttendanceGeolocationsExportParams) {
    return await this.get(ApiPaths.hrm_attendance_geolocations_export_retrieve, {
      query: params,
    })
  }

  async getHrmEmployeeRelationshipsExport(params: GetHrmEmployeeRelationshipsExportParams) {
    return await this.get(ApiPaths.hrm_employee_relationships_export_retrieve, {
      query: params,
    })
  }

  /**
   * Get import task status
   */
  async getImportStatus(params: GetImportStatusParams) {
    return await this.get(ApiPaths.import_status_retrieve, {
      query: params,
    })
  }
}

// Create service instance via factory (lazy construction)
let _exportService: ExportService | null = null

export function getExportService(): ExportService {
  if (!_exportService) {
    _exportService = new ExportService()
  }
  return _exportService
}

// For backward compatibility, export a getter
export const exportService = {
  get instance() {
    return getExportService()
  },
}

// React Query hook for export operations
export function useExportStatus(taskId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.EXPORT.STATUS(taskId),
    () => getExportService().getExportStatus(taskId),
    {
      enabled: options?.enabled !== false && !!taskId,
      staleTime: 1000 * 5, // 5 seconds (export status changes frequently)
      refetchInterval: (query) => {
        // Stop refetching if status is SUCCESS or FAILURE
        const status = query.state.data?.status
        if (status === 'SUCCESS' || status === 'FAILURE') {
          return false
        }
        return 1000 * 3 // Refetch every 3 seconds while pending
      },
    }
  )
}

export function useExportCandidates(
  params?: GetHrmRecruitmentCandidatesExportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.EXPORT.RECRUITMENT_CANDIDATES(params || {}),
    () => getExportService().getHrmRecruitmentCandidatesExport(params),
    {
      enabled: options?.enabled !== false,
      staleTime: 1000 * 5, // 5 seconds (export status changes frequently)
      refetchInterval: (query) => {
        // Stop refetching if status is SUCCESS or FAILURE
        const status = query.state.status
        if (status === 'success' || status === 'error') {
          return false
        }
        return 1000 * 3 // Refetch every 3 seconds while pending
      },
    }
  )
}

export function useExportRecruitmentExpense(
  params: GetHrmRecruitmentExpenseExportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.EXPORT.RECRUITMENT_EXPENSES(params || {}),
    () => getExportService().getHrmRecruitmentExpenseExport(params),
    {
      enabled: options?.enabled !== false,
      staleTime: 1000 * 5, // 5 seconds (export status changes frequently)
      refetchInterval: (query) => {
        // Stop refetching if status is SUCCESS or FAILURE
        const status = query.state.status
        if (status === 'success' || status === 'error') {
          return false
        }
        return 1000 * 3 // Refetch every 3 seconds while pending
      },
    }
  )
}

type UseImportStatusOptions = {
  enabled?: boolean
  staleTimeMs?: number
  refetchIntervalMs?: number
}

export function useImportStatus(params: GetImportStatusParams, options?: UseImportStatusOptions) {
  return useApiQuery(
    QUERY_KEYS.IMPORT.STATUS(params.task_id),
    () => getExportService().getImportStatus(params),
    {
      enabled: options?.enabled !== false && !!params.task_id,
      staleTime: options?.staleTimeMs ?? 400 * 1, // 1 second (import status changes frequently)
      refetchInterval: (query) => {
        // Stop refetching if status is succeeded or failed
        const status = query.state.data?.status
        if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
          return false
        }
        return options?.refetchIntervalMs ?? 500 * 1 // Refetch every 0.5 seconds while pending
      },
    }
  )
}

export function useExportHolidays(
  params?: GetHrmHolidaysExportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.EXPORT.HOLIDAYS(params || {}),
    () => getExportService().getHrmHolidaysExport(params),
    {
      enabled: options?.enabled !== false,
      staleTime: 1000 * 5, // 5 seconds (export status changes frequently)
      refetchInterval: (query) => {
        // Stop refetching if status is SUCCESS or FAILURE
        const status = query.state.status
        if (status === 'success' || status === 'error') {
          return false
        }
        return 1000 * 3 // Refetch every 3 seconds while pending
      },
    }
  )
}

export function useExportAttendanceGeolocations(
  params?: GetHrmAttendanceGeolocationsExportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.EXPORT.ATTENDANCE_GEOLOCATIONS(params || {}),
    () => getExportService().getHrmAttendanceGeolocationsExport(params),
    {
      enabled: options?.enabled !== false,
      staleTime: 1000 * 5, // 5 seconds (export status changes frequently)
      refetchInterval: (query) => {
        // Stop refetching if status is SUCCESS or FAILURE
        const status = query.state.status
        if (status === 'success' || status === 'error') {
          return false
        }
        return 1000 * 3 // Refetch every 3 seconds while pending
      },
    }
  )
}
