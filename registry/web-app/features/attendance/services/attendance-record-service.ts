import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, operations, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

// ===== TYPE DEFINITIONS =====
export type AttendanceRecord = components['schemas']['AttendanceRecord']
export type PaginatedAttendanceRecordList = components['schemas']['PaginatedAttendanceRecordList']
export type OtherAttendanceBulkApproveRequest =
  components['schemas']['OtherAttendanceBulkApproveRequest']
export type OtherAttendanceRejectRequest = components['schemas']['OtherAttendanceRejectRequest']
export type OtherAttendanceConfirmRequest = components['schemas']['OtherAttendanceConfirmRequest']

export type GetAttendanceRecordsParams =
  paths['/api/hrm/attendance-records/']['get']['parameters']['query']

export type GetFirstAttendanceParams =
  operations['hrm_attendance_records_first_attendance_list']['parameters']['query']

export type GetAttendanceRecordsExportParams =
  paths['/api/hrm/attendance-records/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class AttendanceRecordService extends BaseApiService {
  async getAttendanceRecords(params?: GetAttendanceRecordsParams) {
    return await this.getPaginated(ApiPaths.hrm_attendance_records_list, params)
  }

  async getFirstAttendanceList(
    params?: GetFirstAttendanceParams
  ): Promise<PaginatedAttendanceRecordList> {
    if (params && 'search' in params && typeof params.search === 'string') {
      params = { ...params, search: params.search?.trim() }
    }
    return await this.get(ApiPaths.hrm_attendance_records_first_attendance_list as any, {
      query: params as Record<string, unknown>,
    })
  }

  async getAttendanceRecord(id: number) {
    return await this.get(ApiPaths.hrm_attendance_records_retrieve, {
      path: { id: id },
    })
  }

  async bulkApproveOtherAttendance(requestData: OtherAttendanceBulkApproveRequest) {
    return await this.post(ApiPaths.hrm_attendance_records_otherbulk_approve_create, requestData)
  }

  async rejectOtherAttendance(id: number, requestData: OtherAttendanceRejectRequest) {
    return await this.post(ApiPaths.hrm_attendance_records_reject_create, requestData, {
      path: { id },
    })
  }

  async confirmOtherAttendance(id: number, requestData: OtherAttendanceConfirmRequest) {
    return await this.post(ApiPaths.hrm_attendance_records_confirm_create, requestData, {
      path: { id },
    })
  }

  async exportAttendanceRecords(params?: GetAttendanceRecordsExportParams) {
    return await this.get(ApiPaths.hrm_attendance_records_export_retrieve, {
      query: params as Record<string, unknown>,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _attendanceRecordService: AttendanceRecordService | null = null

export function getAttendanceRecordService(): AttendanceRecordService {
  if (!_attendanceRecordService) {
    _attendanceRecordService = new AttendanceRecordService()
  }
  return _attendanceRecordService
}

// ===== REACT QUERY HOOKS =====
export function useAttendanceRecords(
  params?: GetAttendanceRecordsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_RECORDS.LIST(params || {}),
    () => getAttendanceRecordService().getAttendanceRecords(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceRecord(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_RECORDS.DETAIL(id),
    () => getAttendanceRecordService().getAttendanceRecord(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useFirstAttendanceList(
  params?: GetFirstAttendanceParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_RECORDS.FIRST_ATTENDANCE_LIST(params ?? {}),
    () => getAttendanceRecordService().getFirstAttendanceList(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useBulkApproveOtherAttendance() {
  return useApiMutation((data: OtherAttendanceBulkApproveRequest) =>
    getAttendanceRecordService().bulkApproveOtherAttendance(data)
  )
}

export function useRejectOtherAttendance() {
  return useApiMutation(({ id, note }: { id: number; note: string }) =>
    getAttendanceRecordService().rejectOtherAttendance(id, { note })
  )
}

export function useConfirmOtherAttendance() {
  return useApiMutation(
    ({ id, is_confirm, note }: { id: number; is_confirm: boolean; note?: string }) =>
      getAttendanceRecordService().confirmOtherAttendance(id, { is_confirm, note })
  )
}
