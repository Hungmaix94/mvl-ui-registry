import { BaseApiService } from '@/api/base-service'
import { extractApiData } from '@/api/response-handler'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type Holiday = components['schemas']['Holiday']
export type HolidayDetail = components['schemas']['HolidayDetail']
export type HolidayRequest = components['schemas']['HolidayRequest']
export type PatchedHolidayRequest = components['schemas']['PatchedHolidayRequest']
export type PaginatedHolidayList = components['schemas']['PaginatedHolidayList']

export type CompensatoryWorkday = components['schemas']['CompensatoryWorkday']
export type CompensatoryWorkdayRequest = components['schemas']['CompensatoryWorkdayRequest']
export type PatchedCompensatoryWorkdayRequest =
  components['schemas']['PatchedCompensatoryWorkdayRequest']
export type PaginatedCompensatoryWorkdayList =
  components['schemas']['PaginatedCompensatoryWorkdayList']

export type GetHolidaysParams = paths['/api/hrm/holidays/']['get']['parameters']['query']
export type GetHolidaysExportParams =
  paths['/api/hrm/holidays/export/']['get']['parameters']['query']
export type GetCompensatoryWorkdaysParams = {
  page?: number
  page_size?: number
  search?: string
}

// ===== SERVICE CLASS =====
export class HolidayService extends BaseApiService {
  // ===== HOLIDAYS =====
  async getHolidays(params?: GetHolidaysParams) {
    return await this.getPaginated(ApiPaths.hrm_holidays_list, params)
  }

  async createHoliday(data: HolidayRequest) {
    return await this.post(ApiPaths.hrm_holidays_create, data)
  }

  async getHoliday(id: number) {
    return await this.get(ApiPaths.hrm_holidays_retrieve, { path: { id } })
  }

  async updateHoliday(id: number, data: HolidayRequest) {
    return await this.put(ApiPaths.hrm_holidays_update, data, { path: { id } })
  }

  async partialUpdateHoliday(id: number, data: PatchedHolidayRequest) {
    return await this.patch(ApiPaths.hrm_holidays_partial_update, data, { path: { id } })
  }

  async deleteHoliday(id: number) {
    return this.delete(ApiPaths.hrm_holidays_destroy, { path: { id } })
  }

  async exportHolidays(params?: GetHolidaysExportParams) {
    return await this.get(ApiPaths.hrm_holidays_export_retrieve, { query: params })
  }

  async getHolidayHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_holidays_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getHolidayHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_holidays_history_retrieve, { path: { id, log_id: logId } })
  }

  // ===== COMPENSATORY WORKDAYS =====
  async getCompensatoryWorkdays(holidayId: number, params?: GetCompensatoryWorkdaysParams) {
    const response = await this.client.GET(ApiPaths.hrm_holidays_compensatory_days_list, {
      params: { path: { holiday_pk: holidayId }, query: params as any },
    })
    return extractApiData<PaginatedCompensatoryWorkdayList>(response)
  }

  async createCompensatoryWorkday(holidayId: number, data: CompensatoryWorkdayRequest) {
    return await this.post(ApiPaths.hrm_holidays_compensatory_days_create, data, {
      path: { holiday_pk: holidayId },
    })
  }

  async getCompensatoryWorkday(holidayId: number, id: number) {
    return await this.get(ApiPaths.hrm_holidays_compensatory_days_retrieve, {
      path: { holiday_pk: holidayId, id },
    })
  }

  async updateCompensatoryWorkday(holidayId: number, id: number, data: CompensatoryWorkdayRequest) {
    return await this.put(ApiPaths.hrm_holidays_compensatory_days_update, data, {
      path: { holiday_pk: holidayId, id },
    })
  }

  async partialUpdateCompensatoryWorkday(
    holidayId: number,
    id: number,
    data: PatchedCompensatoryWorkdayRequest
  ) {
    return await this.patch(ApiPaths.hrm_holidays_compensatory_days_partial_update, data, {
      path: { holiday_pk: holidayId, id },
    })
  }

  async deleteCompensatoryWorkday(holidayId: number, id: number) {
    return this.delete(ApiPaths.hrm_holidays_compensatory_days_destroy, {
      path: { holiday_pk: holidayId, id },
    })
  }

  async getCompensatoryWorkdayHistories(holidayId: number, id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_holidays_compensatory_days_histories_retrieve, {
      path: { holiday_pk: holidayId, id },
      query: params,
    })
  }

  async getCompensatoryWorkdayHistoryDetail(holidayId: number, id: number, logId: string) {
    return await this.get(ApiPaths.hrm_holidays_compensatory_days_history_retrieve, {
      path: { holiday_pk: holidayId, id, log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _holidayService: HolidayService | null = null

export function getHolidayService(): HolidayService {
  if (!_holidayService) {
    _holidayService = new HolidayService()
  }
  return _holidayService
}

// ===== REACT QUERY HOOKS =====
// ===== HOLIDAYS HOOKS =====
export function useHolidays(params?: GetHolidaysParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.HOLIDAYS.LIST(params || {}),
    () => getHolidayService().getHolidays(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useHoliday(id: number) {
  return useApiQuery(QUERY_KEYS.HRM.HOLIDAYS.DETAIL(id), () => getHolidayService().getHoliday(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateHoliday() {
  return useApiMutation((data: HolidayRequest) => getHolidayService().createHoliday(data))
}

export function useUpdateHoliday() {
  return useApiMutation(({ id, data }: { id: number; data: HolidayRequest }) =>
    getHolidayService().updateHoliday(id, data)
  )
}

export function usePartialUpdateHoliday() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedHolidayRequest }) =>
    getHolidayService().partialUpdateHoliday(id, data)
  )
}

export function useDeleteHoliday() {
  return useApiMutation((id: number) => getHolidayService().deleteHoliday(id))
}

export function useExportHolidays() {
  return useApiMutation((params?: GetHolidaysExportParams) =>
    getHolidayService().exportHolidays(params)
  )
}

// ===== COMPENSATORY WORKDAYS HOOKS =====
export function useCompensatoryWorkdays(
  holidayId: number,
  params?: GetCompensatoryWorkdaysParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['hrm', 'compensatory-workdays', 'list', holidayId, JSON.stringify(params || {})],
    () => getHolidayService().getCompensatoryWorkdays(holidayId, params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: (options?.enabled ?? true) && !!holidayId,
    }
  )
}

export function useCompensatoryWorkday(holidayId: number, id: number) {
  return useApiQuery(
    ['hrm', 'compensatory-workdays', 'detail', holidayId, id],
    () => getHolidayService().getCompensatoryWorkday(holidayId, id),
    {
      enabled: !!holidayId && !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateCompensatoryWorkday() {
  return useApiMutation(
    ({ holidayId, data }: { holidayId: number; data: CompensatoryWorkdayRequest }) =>
      getHolidayService().createCompensatoryWorkday(holidayId, data)
  )
}

export function useUpdateCompensatoryWorkday() {
  return useApiMutation(
    ({
      holidayId,
      id,
      data,
    }: {
      holidayId: number
      id: number
      data: CompensatoryWorkdayRequest
    }) => getHolidayService().updateCompensatoryWorkday(holidayId, id, data)
  )
}

export function usePartialUpdateCompensatoryWorkday() {
  return useApiMutation(
    ({
      holidayId,
      id,
      data,
    }: {
      holidayId: number
      id: number
      data: PatchedCompensatoryWorkdayRequest
    }) => getHolidayService().partialUpdateCompensatoryWorkday(holidayId, id, data)
  )
}

export function useDeleteCompensatoryWorkday() {
  return useApiMutation(({ holidayId, id }: { holidayId: number; id: number }) =>
    getHolidayService().deleteCompensatoryWorkday(holidayId, id)
  )
}
