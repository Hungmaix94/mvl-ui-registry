import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useExport } from '@/hooks/useExport'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type EmployeeTimesheet = components['schemas']['EmployeeTimesheet']
export type TimesheetEntry = components['schemas']['TimesheetEntry']
export type TimeSheetEntryDetail = components['schemas']['TimeSheetEntryDetail']
export type TimeSheetEntryUpdateRequest = components['schemas']['TimeSheetEntryUpdateRequest']
export type PaginatedEmployeeTimesheetList = components['schemas']['PaginatedEmployeeTimesheetList']
export type PaginatedTimeSheetEntryDetailList =
  components['schemas']['PaginatedTimeSheetEntryDetailList']
export type DailyTimesheetEntry = components['schemas']['DailyTimesheetEntry']
export type PaginatedDailyTimesheetEntryList =
  components['schemas']['PaginatedDailyTimesheetEntryList']

export type GetTimesheetsParams = paths['/api/hrm/timesheets/']['get']['parameters']['query']
export type GetTimesheetsExportParams =
  paths['/api/hrm/timesheets/export/']['get']['parameters']['query']
export type GetTimesheetEntriesParams =
  paths['/api/hrm/timesheet/entries/']['get']['parameters']['query']
export type GetDailyTimesheetEntriesParams =
  paths['/api/hrm/timesheet/daily-entries/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class TimesheetService extends BaseApiService {
  // ===== TIMESHEETS =====
  async getTimesheets(params?: GetTimesheetsParams) {
    return await this.getPaginated(ApiPaths.hrm_timesheets_list, params)
  }

  async getTimesheet(id: number) {
    return await this.get(ApiPaths.hrm_timesheets_retrieve, {
      path: { id },
    })
  }

  async getTimesheetHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_timesheets_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getTimesheetHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_timesheets_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async exportTimesheets(params?: GetTimesheetsExportParams) {
    return await this.get(ApiPaths.hrm_timesheets_export_retrieve, {
      query: params,
    })
  }

  // ===== DAILY TIMESHEET ENTRIES =====
  async getDailyTimesheetEntries(params?: GetDailyTimesheetEntriesParams) {
    return await this.getPaginated(ApiPaths.hrm_timesheet_daily_entries_list, params)
  }

  // ===== TIMESHEET ENTRIES =====
  async getTimesheetEntries(params?: GetTimesheetEntriesParams) {
    return await this.getPaginated(ApiPaths.hrm_timesheet_entries_list, params)
  }

  async getTimesheetEntry(id: number) {
    return await this.get(ApiPaths.hrm_timesheet_entries_retrieve, {
      path: { id },
    })
  }

  async updateTimesheetEntry(id: number, data: TimeSheetEntryUpdateRequest) {
    return await this.put(ApiPaths.hrm_timesheet_entries_update, data, { path: { id } })
  }

  async getTimesheetEntryHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_timesheet_entries_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getTimesheetEntryHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_timesheet_entries_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _timesheetService: TimesheetService | null = null

export function getTimesheetService(): TimesheetService {
  if (!_timesheetService) {
    _timesheetService = new TimesheetService()
  }
  return _timesheetService
}

// ===== REACT QUERY HOOKS =====
// ===== TIMESHEETS HOOKS =====
export function useTimesheets(params?: GetTimesheetsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.TIMESHEETS.LIST(params || {}),
    () => getTimesheetService().getTimesheets(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useTimesheet(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.TIMESHEETS.DETAIL(id),
    () => getTimesheetService().getTimesheet(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useDailyTimesheetEntries(
  params?: GetDailyTimesheetEntriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.TIMESHEET_DAILY_ENTRIES.LIST(params || {}),
    () => getTimesheetService().getDailyTimesheetEntries(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

// ===== TIMESHEET ENTRIES HOOKS =====
export function useTimesheetEntries(
  params?: GetTimesheetEntriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.TIMESHEET_ENTRIES.LIST(params || {}),
    () => getTimesheetService().getTimesheetEntries(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useTimesheetEntry(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.TIMESHEET_ENTRIES.DETAIL(id),
    () => getTimesheetService().getTimesheetEntry(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useUpdateTimesheetEntry() {
  return useApiMutation(({ id, data }: { id: number; data: TimeSheetEntryUpdateRequest }) =>
    getTimesheetService().updateTimesheetEntry(id, data)
  )
}

export function useExportTimesheets() {
  return useExport({
    exportFunction: (params?: GetTimesheetsExportParams) =>
      getTimesheetService().exportTimesheets(params),
    defaultFilename: 'timesheets',
  })
}
