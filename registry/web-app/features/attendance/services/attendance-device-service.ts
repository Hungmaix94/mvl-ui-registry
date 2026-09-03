import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type AttendanceDevice = components['schemas']['AttendanceDevice']
export type AttendanceDeviceRequest = components['schemas']['AttendanceDeviceRequest']
export type PatchedAttendanceDeviceRequest = components['schemas']['PatchedAttendanceDeviceRequest']
export type PaginatedAttendanceDeviceList = components['schemas']['PaginatedAttendanceDeviceList']

export type GetAttendanceDevicesParams =
  paths['/api/hrm/attendance-devices/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class AttendanceDeviceService extends BaseApiService {
  async getAttendanceDevices(params?: GetAttendanceDevicesParams) {
    return await this.getPaginated(ApiPaths.hrm_attendance_devices_list, params)
  }

  async createAttendanceDevice(deviceData: AttendanceDeviceRequest) {
    return await this.post(ApiPaths.hrm_attendance_devices_create, deviceData)
  }

  async getAttendanceDevice(id: number) {
    return await this.get(ApiPaths.hrm_attendance_devices_retrieve, {
      path: { id: id },
    })
  }

  async updateAttendanceDevice(id: number, deviceData: AttendanceDeviceRequest) {
    return await this.put(ApiPaths.hrm_attendance_devices_update, deviceData, { path: { id } })
  }

  async partialUpdateAttendanceDevice(id: number, deviceData: PatchedAttendanceDeviceRequest) {
    return await this.patch(ApiPaths.hrm_attendance_devices_partial_update, deviceData, {
      path: { id },
    })
  }

  async deleteAttendanceDevice(id: number) {
    return await this.delete(ApiPaths.hrm_attendance_devices_destroy, { path: { id } })
  }

  async getAttendanceDeviceHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_attendance_devices_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  async getAttendanceDeviceHistory(id: number, logId: number) {
    return await this.get(ApiPaths.hrm_attendance_devices_history_retrieve, {
      path: { id: id, log_id: logId },
    })
  }

  async checkAttendanceDeviceConnection(id: number) {
    return await this.post(ApiPaths.hrm_attendance_devices_check_connection_create, undefined, {
      path: { id },
    })
  }

  async toggleAttendanceDeviceEnabled(id: number) {
    return await this.post(ApiPaths.hrm_attendance_devices_toggle_enabled_create, undefined, {
      path: { id },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _attendanceDeviceService: AttendanceDeviceService | null = null

export function getAttendanceDeviceService(): AttendanceDeviceService {
  if (!_attendanceDeviceService) {
    _attendanceDeviceService = new AttendanceDeviceService()
  }
  return _attendanceDeviceService
}

// ===== REACT QUERY HOOKS =====
export function useAttendanceDevices(
  params?: GetAttendanceDevicesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_DEVICES.LIST(params || {}),
    () => getAttendanceDeviceService().getAttendanceDevices(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceDevice(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.ATTENDANCE_DEVICES.DETAIL(id),
    () => getAttendanceDeviceService().getAttendanceDevice(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateAttendanceDevice() {
  return useApiMutation((data: AttendanceDeviceRequest) =>
    getAttendanceDeviceService().createAttendanceDevice(data)
  )
}

export function useUpdateAttendanceDevice() {
  return useApiMutation(({ id, data }: { id: number; data: AttendanceDeviceRequest }) =>
    getAttendanceDeviceService().updateAttendanceDevice(id, data)
  )
}

export function usePartialUpdateAttendanceDevice() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedAttendanceDeviceRequest }) =>
    getAttendanceDeviceService().partialUpdateAttendanceDevice(id, data)
  )
}

export function useDeleteAttendanceDevice() {
  return useApiMutation((id: number) => getAttendanceDeviceService().deleteAttendanceDevice(id))
}

export function useCheckAttendanceDeviceConnection() {
  return useApiMutation((id: number) =>
    getAttendanceDeviceService().checkAttendanceDeviceConnection(id)
  )
}

export function useToggleAttendanceDeviceEnabled() {
  return useApiMutation((id: number) =>
    getAttendanceDeviceService().toggleAttendanceDeviceEnabled(id)
  )
}
