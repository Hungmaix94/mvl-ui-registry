import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery, useInvalidateQueries } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type AttendanceExemption = components['schemas']['AttendanceExemption']
export type AttendanceExemptionRequest = components['schemas']['AttendanceExemptionRequest']
export type PaginatedAttendanceExemptionList =
  components['schemas']['PaginatedAttendanceExemptionList']

export type GetAttendanceExemptionsParams =
  paths['/api/hrm/attendance-exemptions/']['get']['parameters']['query']
export type GetAttendanceExemptionsExportParams =
  paths['/api/hrm/attendance-exemptions/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class AttendanceExemptionService extends BaseApiService {
  async getAttendanceExemptions(params?: GetAttendanceExemptionsParams) {
    return await this.getPaginated(ApiPaths.hrm_attendance_exemptions_list, params)
  }

  async createAttendanceExemption(data: AttendanceExemptionRequest) {
    return await this.post(ApiPaths.hrm_attendance_exemptions_create, data)
  }

  async getAttendanceExemption(id: number) {
    return await this.get(ApiPaths.hrm_attendance_exemptions_retrieve, { path: { id } })
  }

  async disableAttendanceExemption(id: number) {
    return await this.post(ApiPaths.hrm_attendance_exemptions_disable_create, undefined, {
      path: { id },
    })
  }

  async exportAttendanceExemptions(params?: GetAttendanceExemptionsExportParams) {
    return await this.get(ApiPaths.hrm_attendance_exemptions_export_retrieve, { query: params })
  }

  async getAttendanceExemptionHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_attendance_exemptions_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getAttendanceExemptionHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_attendance_exemptions_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  async getAttendanceExemptionImportTemplate() {
    return await this.get(ApiPaths.hrm_attendance_exemptions_import_template_retrieve)
  }

  async startAttendanceExemptionImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_attendance_exemptions_import_create, data)
  }
}

// ===== SERVICE SINGLETON =====
let _attendanceExemptionService: AttendanceExemptionService | null = null

export function getAttendanceExemptionService(): AttendanceExemptionService {
  if (!_attendanceExemptionService) {
    _attendanceExemptionService = new AttendanceExemptionService()
  }
  return _attendanceExemptionService
}

// ===== REACT QUERY HOOKS =====
export function useAttendanceExemptions(
  params?: GetAttendanceExemptionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_EXEMPTIONS.LIST(params || {}),
    () => getAttendanceExemptionService().getAttendanceExemptions(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceExemption(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_EXEMPTIONS.DETAIL(id),
    () => getAttendanceExemptionService().getAttendanceExemption(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateAttendanceExemption() {
  return useApiMutation((data: AttendanceExemptionRequest) =>
    getAttendanceExemptionService().createAttendanceExemption(data)
  )
}

export function useDisableAttendanceExemption() {
  return useApiMutation((id: number) =>
    getAttendanceExemptionService().disableAttendanceExemption(id)
  )
}

export function useExportAttendanceExemptions() {
  return useApiMutation((params?: GetAttendanceExemptionsExportParams) =>
    getAttendanceExemptionService().exportAttendanceExemptions(params)
  )
}

export function useAttendanceExemptionImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_EXEMPTIONS.IMPORT_TEMPLATE(),
    () => getAttendanceExemptionService().getAttendanceExemptionImportTemplate(),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartAttendanceExemptionImport() {
  const { invalidateByPrefix } = useInvalidateQueries()
  return useApiMutation(
    (data: ImportStartRequest) =>
      getAttendanceExemptionService().startAttendanceExemptionImport(data),
    {
      onSuccess: () => {
        invalidateByPrefix('hrm')
      },
    }
  )
}
