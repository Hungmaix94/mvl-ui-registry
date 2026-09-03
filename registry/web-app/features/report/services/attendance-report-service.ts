import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useExport } from '@/hooks/useExport'
import { useApiQuery } from '@/hooks/useApiQuery'
import { getDashboardApiRefreshDuration } from '@/config/environment'

// ===== TYPE DEFINITIONS =====
export type AttendanceMethodReport = components['schemas']['AttendanceMethodReport']
export type AttendanceMethodChildItem = components['schemas']['AttendanceMethodChildItem']
export type UncheckinReport = components['schemas']['UncheckinReport']
export type UncheckinReportItem = components['schemas']['UncheckinReportItem']
export type AttendanceProjectReportAggregration =
  components['schemas']['AttendanceProjectReportAggregration']
export type AttendanceProjectOrgReportAggregration =
  components['schemas']['AttendanceProjectOrgReportAggregration']
export type BranchAttendanceRateItem = components['schemas']['BranchAttendanceRateItem']
export type BranchAttendanceRateReport = components['schemas']['BranchAttendanceRateReport']

export type GetAttendanceByMethodReportParams =
  paths['/api/hrm/attendance-reports/by-method/']['get']['parameters']['query']
export type GetAttendanceByMethodExportParams =
  paths['/api/hrm/attendance-reports/by-method/export/']['get']['parameters']['query']
export type GetAttendanceByProjectReportParams =
  paths['/api/hrm/attendance-reports/by-project/']['get']['parameters']['query']
export type GetAttendanceByProjectOrganizationReportParams =
  paths['/api/hrm/attendance-reports/by-project-organization/']['get']['parameters']['query']
export type GetAttendanceByBranchRateParams =
  paths['/api/hrm/attendance-reports/by-branch-rate/']['get']['parameters']['query']
export type GetUncheckinReportParams =
  paths['/api/hrm/attendance-reports/by-uncheckin/']['get']['parameters']['query']
export type GetUncheckinExportParams =
  paths['/api/hrm/attendance-reports/by-uncheckin/export/']['get']['parameters']['query']
export type GetAttendanceByMethodEmployeeRateExportParams =
  paths['/api/hrm/attendance-reports/by-method/employee-rate/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class AttendanceReportService extends BaseApiService {
  /**
   * Get attendance report by method
   */
  async getAttendanceByMethodReport(params?: GetAttendanceByMethodReportParams) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_method_retrieve, { query: params })
  }

  /**
   * Export attendance report by method to XLSX
   */
  async exportAttendanceByMethodReport(params?: GetAttendanceByMethodExportParams) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_method_export_retrieve, {
      query: params,
    })
  }

  /**
   * Get attendance report by project
   */
  async getAttendanceByProjectReport(params: GetAttendanceByProjectReportParams) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_project_retrieve, { query: params })
  }

  /**
   * Get attendance report by project organization
   */
  async getAttendanceByProjectOrganizationReport(
    params?: GetAttendanceByProjectOrganizationReportParams
  ) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_project_organization_retrieve, {
      query: params,
    })
  }

  /**
   * Get attendance rate report by branch
   */
  async getAttendanceByBranchRateReport(params?: GetAttendanceByBranchRateParams) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_branch_rate_retrieve, {
      query: params,
    })
  }

  /**
   * Get list of employees who did not check in on a specific date
   */
  async getUncheckinReport(params?: GetUncheckinReportParams) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_uncheckin_retrieve, { query: params })
  }

  /**
   * Export uncheckin report to XLSX
   */
  async exportUncheckinReport(params?: GetUncheckinExportParams) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_uncheckin_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export per-employee attendance rate by method to XLSX (CR214).
   * BE chấp nhận filter: month range (from_month / to_month, max 12 tháng,
   * default 3 tháng gần nhất) + org scope (branch / block / department) + async + delivery.
   */
  async exportAttendanceByMethodEmployeeRate(
    params?: GetAttendanceByMethodEmployeeRateExportParams
  ) {
    return await this.get(ApiPaths.hrm_attendance_reports_by_method_employee_rate_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _attendanceReportService: AttendanceReportService | null = null

export function getAttendanceReportService(): AttendanceReportService {
  if (!_attendanceReportService) {
    _attendanceReportService = new AttendanceReportService()
  }
  return _attendanceReportService
}

// ===== REACT QUERY HOOKS =====
export function useAttendanceByMethodReport(
  params?: GetAttendanceByMethodReportParams,
  options?: { enabled?: boolean; enableAutoRefresh?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.ATTENDANCE_BY_METHOD(params || {}),
    () => getAttendanceReportService().getAttendanceByMethodReport(params),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: options?.enableAutoRefresh ? getDashboardApiRefreshDuration() : false,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceByProjectReport(
  params: GetAttendanceByProjectReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.ATTENDANCE_BY_PROJECT(params),
    () => getAttendanceReportService().getAttendanceByProjectReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceByProjectOrganizationReport(
  params?: GetAttendanceByProjectOrganizationReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.ATTENDANCE_BY_PROJECT_ORGANIZATION(params || {}),
    () => getAttendanceReportService().getAttendanceByProjectOrganizationReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useAttendanceByBranchRateReport(
  params?: GetAttendanceByBranchRateParams,
  options?: { enabled?: boolean; enableAutoRefresh?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.ATTENDANCE_BY_BRANCH_RATE(params || {}),
    () => getAttendanceReportService().getAttendanceByBranchRateReport(params),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: options?.enableAutoRefresh ? getDashboardApiRefreshDuration() : false,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExportAttendanceReportByMethod() {
  return useExport({
    exportFunction: (params?: GetAttendanceByMethodExportParams) =>
      getAttendanceReportService().exportAttendanceByMethodReport(params),
    defaultFilename: 'attendance-reports-by-method',
  })
}

export function useUncheckinReport(
  params?: GetUncheckinReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.ATTENDANCE_BY_UNCHECKIN(params || {}),
    () => getAttendanceReportService().getUncheckinReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExportUncheckinReport() {
  return useExport({
    exportFunction: (params?: GetUncheckinExportParams) =>
      getAttendanceReportService().exportUncheckinReport(params),
    defaultFilename: 'attendance-uncheckin-report',
  })
}

export function useExportAttendanceByMethodEmployeeRate() {
  return useExport({
    exportFunction: (params?: GetAttendanceByMethodEmployeeRateExportParams) =>
      getAttendanceReportService().exportAttendanceByMethodEmployeeRate(params),
    defaultFilename: 'attendance-by-method-employee-rate',
  })
}
