import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type AttendanceGeolocation = components['schemas']['AttendanceGeolocation']
export type AttendanceGeolocationRequest = components['schemas']['AttendanceGeolocationRequest']
export type PatchedAttendanceGeolocationRequest =
  components['schemas']['PatchedAttendanceGeolocationRequest']
export type PaginatedAttendanceGeolocationList =
  components['schemas']['PaginatedAttendanceGeolocationList']

export type GetAttendanceGeolocationsParams =
  paths['/api/hrm/attendance-geolocations/']['get']['parameters']['query']
export type GetAttendanceGeolocationsExportParams =
  paths['/api/hrm/attendance-geolocations/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class AttendanceGeolocationService extends BaseApiService {
  async getAttendanceGeolocations(params?: GetAttendanceGeolocationsParams) {
    return await this.getPaginated(ApiPaths.hrm_attendance_geolocations_list, params)
  }

  async getAttendanceGeolocation(id: number) {
    return await this.get(ApiPaths.hrm_attendance_geolocations_retrieve, {
      path: { id: id },
    })
  }

  async createAttendanceGeolocation(geolocationData: AttendanceGeolocationRequest) {
    return await this.post(ApiPaths.hrm_attendance_geolocations_create, geolocationData)
  }

  async updateAttendanceGeolocation(id: number, geolocationData: AttendanceGeolocationRequest) {
    return await this.put(ApiPaths.hrm_attendance_geolocations_update, geolocationData, {
      path: { id },
    })
  }

  async partialUpdateAttendanceGeolocation(
    id: number,
    geolocationData: PatchedAttendanceGeolocationRequest
  ) {
    return await this.patch(ApiPaths.hrm_attendance_geolocations_partial_update, geolocationData, {
      path: { id },
    })
  }

  async deleteAttendanceGeolocation(id: number) {
    return await this.delete(ApiPaths.hrm_attendance_geolocations_destroy, { path: { id } })
  }

  async exportAttendanceGeolocations(params?: GetAttendanceGeolocationsExportParams) {
    return await this.get(ApiPaths.hrm_attendance_geolocations_export_retrieve, {
      query: params,
    })
  }

  async getAttendanceGeolocationHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_attendance_geolocations_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  async getAttendanceGeolocationHistory(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_attendance_geolocations_history_retrieve, {
      path: { id: id, log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _attendanceGeolocationService: AttendanceGeolocationService | null = null

export function getAttendanceGeolocationService(): AttendanceGeolocationService {
  if (!_attendanceGeolocationService) {
    _attendanceGeolocationService = new AttendanceGeolocationService()
  }
  return _attendanceGeolocationService
}

// ===== REACT QUERY HOOKS =====
export function useAttendanceGeolocations(
  params?: GetAttendanceGeolocationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_GEOLOCATIONS.LIST(params || {}),
    () => getAttendanceGeolocationService().getAttendanceGeolocations(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceGeolocation(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_GEOLOCATIONS.DETAIL(id),
    () => getAttendanceGeolocationService().getAttendanceGeolocation(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateAttendanceGeolocation() {
  return useApiMutation((data: AttendanceGeolocationRequest) =>
    getAttendanceGeolocationService().createAttendanceGeolocation(data)
  )
}

export function useUpdateAttendanceGeolocation() {
  return useApiMutation(({ id, data }: { id: number; data: AttendanceGeolocationRequest }) =>
    getAttendanceGeolocationService().updateAttendanceGeolocation(id, data)
  )
}

export function usePartialUpdateAttendanceGeolocation() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedAttendanceGeolocationRequest }) =>
    getAttendanceGeolocationService().partialUpdateAttendanceGeolocation(id, data)
  )
}

export function useDeleteAttendanceGeolocation() {
  return useApiMutation((id: number) =>
    getAttendanceGeolocationService().deleteAttendanceGeolocation(id)
  )
}

export function useExportAttendanceGeolocations() {
  return useApiMutation((params?: GetAttendanceGeolocationsExportParams) =>
    getAttendanceGeolocationService().exportAttendanceGeolocations(params)
  )
}
