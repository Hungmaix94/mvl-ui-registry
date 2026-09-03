import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type AttendanceWifiDevice = components['schemas']['AttendanceWifiDevice']
export type AttendanceWifiDeviceRequest = components['schemas']['AttendanceWifiDeviceRequest']
export type PatchedAttendanceWifiDeviceRequest =
  components['schemas']['PatchedAttendanceWifiDeviceRequest']
export type PaginatedAttendanceWifiDeviceList =
  components['schemas']['PaginatedAttendanceWifiDeviceList']

export type GetAttendanceWifiDevicesParams =
  paths['/api/hrm/attendance-wifi-devices/']['get']['parameters']['query']
export type GetAttendanceWifiDevicesExportParams =
  paths['/api/hrm/attendance-wifi-devices/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class AttendanceWifiService extends BaseApiService {
  async getAttendanceWifiDevices(params?: GetAttendanceWifiDevicesParams) {
    return await this.getPaginated(ApiPaths.hrm_attendance_wifi_devices_list, params)
  }

  async createAttendanceWifiDevice(data: AttendanceWifiDeviceRequest) {
    return await this.post(ApiPaths.hrm_attendance_wifi_devices_create, data)
  }

  async getAttendanceWifiDevice(id: number) {
    return await this.get(ApiPaths.hrm_attendance_wifi_devices_retrieve, {
      path: { id },
    })
  }

  async updateAttendanceWifiDevice(id: number, data: AttendanceWifiDeviceRequest) {
    return await this.put(ApiPaths.hrm_attendance_wifi_devices_update, data, { path: { id } })
  }

  async partialUpdateAttendanceWifiDevice(id: number, data: PatchedAttendanceWifiDeviceRequest) {
    return await this.patch(ApiPaths.hrm_attendance_wifi_devices_partial_update, data, {
      path: { id },
    })
  }

  async deleteAttendanceWifiDevice(id: number) {
    return await this.delete(ApiPaths.hrm_attendance_wifi_devices_destroy, { path: { id } })
  }

  async exportAttendanceWifiDevices(params?: GetAttendanceWifiDevicesExportParams) {
    return await this.get(ApiPaths.hrm_attendance_wifi_devices_export_retrieve, { query: params })
  }

  async getAttendanceWifiDeviceHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_attendance_wifi_devices_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getAttendanceWifiDeviceHistory(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_attendance_wifi_devices_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _attendanceWifiService: AttendanceWifiService | null = null

export function getAttendanceWifiService(): AttendanceWifiService {
  if (!_attendanceWifiService) {
    _attendanceWifiService = new AttendanceWifiService()
  }
  return _attendanceWifiService
}

// ===== REACT QUERY HOOKS =====
export function useAttendanceWifiDevices(
  params?: GetAttendanceWifiDevicesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['hrm', 'attendance-wifi-devices', 'list', JSON.stringify(params || {})],
    () => getAttendanceWifiService().getAttendanceWifiDevices(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceWifiDevice(id: number) {
  return useApiQuery(
    ['hrm', 'attendance-wifi-devices', 'detail', id],
    () => getAttendanceWifiService().getAttendanceWifiDevice(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateAttendanceWifiDevice() {
  return useApiMutation((data: AttendanceWifiDeviceRequest) =>
    getAttendanceWifiService().createAttendanceWifiDevice(data)
  )
}

export function useUpdateAttendanceWifiDevice() {
  return useApiMutation(({ id, data }: { id: number; data: AttendanceWifiDeviceRequest }) =>
    getAttendanceWifiService().updateAttendanceWifiDevice(id, data)
  )
}

export function usePartialUpdateAttendanceWifiDevice() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedAttendanceWifiDeviceRequest }) =>
    getAttendanceWifiService().partialUpdateAttendanceWifiDevice(id, data)
  )
}

export function useDeleteAttendanceWifiDevice() {
  return useApiMutation((id: number) => getAttendanceWifiService().deleteAttendanceWifiDevice(id))
}

export function useExportAttendanceWifiDevices() {
  return useApiMutation((params?: GetAttendanceWifiDevicesExportParams) =>
    getAttendanceWifiService().exportAttendanceWifiDevices(params)
  )
}
