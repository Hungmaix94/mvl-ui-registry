import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'

// ===== TYPE DEFINITIONS =====
export type HiredCandidateReportAggregated = components['schemas']['HiredCandidateReportAggregated']
export type RecruitmentChannelReportAggregated =
  components['schemas']['RecruitmentChannelReportAggregated']
export type RecruitmentCostReportAggregated =
  components['schemas']['RecruitmentCostReportAggregated']
export type RecruitmentCostByPayerReport = components['schemas']['RecruitmentCostByPayerReport']
export type RecruitmentCostByPayerReportItem =
  components['schemas']['RecruitmentCostByPayerReportItem']
export type RecruitmentCostBySourceReport = components['schemas']['RecruitmentCostBySourceReport']
export type RecruitmentCostBySourceReportItem =
  components['schemas']['RecruitmentCostBySourceReportItem']
export type RecruitmentSourceReportAggregated =
  components['schemas']['RecruitmentSourceReportAggregated']
export type ReferralCostEmployee = components['schemas']['ReferralCostEmployee']
export type ReferralCostReportAggregated = components['schemas']['ReferralCostReportAggregated']
export type StaffGrowthReportAggregated = components['schemas']['StaffGrowthReportAggregated']
export type StaffInOutMetric = components['schemas']['StaffInOutMetric']
export type StaffInOutNode = components['schemas']['StaffInOutNode']
export type StaffInOutReportAggregated = components['schemas']['StaffInOutReportAggregated']
export type EmployeeStatusBreakdownReportAggregated =
  components['schemas']['EmployeeStatusBreakdownReportAggregated']
export type EmployeeSeniority = components['schemas']['EmployeeSeniority']
export type PaginatedEmployeeSeniorityList = components['schemas']['PaginatedEmployeeSeniorityList']
export type EmployeeTypeConversionBranchItem =
  components['schemas']['EmployeeTypeConversionBranchItem']
export type PaginatedEmployeeTypeConversionBranchItemList =
  components['schemas']['PaginatedEmployeeTypeConversionBranchItemList']
export type EmployeeResignedReasonSummary = components['schemas']['EmployeeResignedReasonSummary']

export type GetHiredCandidateReportParams =
  paths['/api/hrm/reports/hired-candidate/']['get']['parameters']['query']
export type GetRecruitmentChannelReportParams =
  paths['/api/hrm/reports/recruitment-channel/']['get']['parameters']['query']
export type GetRecruitmentCostReportParams =
  paths['/api/hrm/reports/recruitment-cost/']['get']['parameters']['query']
export type GetCostByPayerReportParams =
  paths['/api/hrm/reports/cost-by-payer/']['get']['parameters']['query']
export type GetCostBySourceReportParams =
  paths['/api/hrm/reports/cost-by-source/']['get']['parameters']['query']
export type GetRecruitmentSourceReportParams =
  paths['/api/hrm/reports/recruitment-source/']['get']['parameters']['query']
export type GetReferralCostReportParams =
  paths['/api/hrm/reports/referral-cost/']['get']['parameters']['query']
export type GetStaffGrowthReportParams =
  paths['/api/hrm/reports/staff-growth/']['get']['parameters']['query']
export type GetEmployeeResignedBreakdownReportParams =
  paths['/api/hrm/reports/employee-resigned-breakdown/']['get']['parameters']['query']
export type GetEmployeeStatusBreakdownReportParams =
  paths['/api/hrm/reports/employee-status-breakdown/']['get']['parameters']['query']
export type GetEmployeeResignedReasonSummaryReportParams =
  paths['/api/hrm/reports/employee-resigned-reasons-summary/']['get']['parameters']['query']
export type GetEmployeeSeniorityReportParams =
  paths['/api/hrm/reports/employee-seniority-report/']['get']['parameters']['query']
export type GetEmployeeSeniorityReportExportParams =
  paths['/api/hrm/reports/employee-seniority-report/export/']['get']['parameters']['query']
export type GetEmployeeTypeConversionReportParams =
  paths['/api/hrm/reports/employee-type-conversion-report/']['get']['parameters']['query']
export type GetEmployeeTypeConversionReportExportParams =
  paths['/api/hrm/reports/employee-type-conversion-report/export/']['get']['parameters']['query']
export type JobTransferReport = components['schemas']['JobTransferReport']
export type GetJobTransferReportParams =
  paths['/api/hrm/reports/job-transfer/']['get']['parameters']['query']
export type GetJobTransferReportExportParams =
  paths['/api/hrm/reports/job-transfer/export/']['get']['parameters']['query']
export type GetHrmReportsExportParams =
  paths['/api/hrm/reports/export/']['get']['parameters']['query']
export type GetReferralCostReportExportParams =
  paths['/api/hrm/reports/referral-cost/export/']['get']['parameters']['query']
export type GetStaffInOutReportParams =
  paths['/api/hrm/reports/staff-in-out/']['get']['parameters']['query']
export type GetStaffInOutReportExportParams =
  paths['/api/hrm/reports/staff-in-out/export/']['get']['parameters']['query']
export type GetCostByPayerReportExportParams =
  paths['/api/hrm/reports/cost-by-payer/export/']['get']['parameters']['query']
export type GetCostBySourceReportExportParams =
  paths['/api/hrm/reports/cost-by-source/export/']['get']['parameters']['query']
export type GetRecruitmentChannelReportExportParams =
  paths['/api/hrm/reports/recruitment-channel/export/']['get']['parameters']['query']
export type GetRecruitmentSourceReportExportParams =
  paths['/api/hrm/reports/recruitment-source/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class HrmReportService extends BaseApiService {
  /**
   * Get hired candidate report
   */
  async getHiredCandidateReport(params?: GetHiredCandidateReportParams) {
    return await this.get(ApiPaths.hrm_reports_hired_candidate_retrieve, {
      query: params,
    })
  }

  /**
   * Get recruitment channel report
   */
  async getRecruitmentChannelReport(params?: GetRecruitmentChannelReportParams) {
    return await this.get(ApiPaths.hrm_reports_recruitment_channel_retrieve, {
      query: params,
    })
  }

  /**
   * Get recruitment cost report
   */
  async getRecruitmentCostReport(params?: GetRecruitmentCostReportParams) {
    return await this.get(ApiPaths.hrm_reports_recruitment_cost_retrieve, {
      query: params,
    })
  }

  /**
   * Get cost by payer report
   */
  async getCostByPayerReport(params?: GetCostByPayerReportParams) {
    return await this.get(ApiPaths.hrm_reports_cost_by_payer_retrieve, {
      query: params,
    })
  }

  /**
   * Get cost by source report
   */
  async getCostBySourceReport(params?: GetCostBySourceReportParams) {
    return await this.get(ApiPaths.hrm_reports_cost_by_source_retrieve, {
      query: params,
    })
  }

  /**
   * Get recruitment source report
   */
  async getRecruitmentSourceReport(params?: GetRecruitmentSourceReportParams) {
    return await this.get(ApiPaths.hrm_reports_recruitment_source_retrieve, {
      query: params,
    })
  }

  /**
   * Get referral cost report
   */
  async getReferralCostReport(params?: GetReferralCostReportParams) {
    return await this.get(ApiPaths.hrm_reports_referral_cost_retrieve, {
      query: params,
    })
  }

  /**
   * Get staff growth report
   */
  async getStaffGrowthReport(params?: GetStaffGrowthReportParams) {
    return await this.get(ApiPaths.hrm_reports_staff_growth_retrieve, {
      query: params,
    })
  }

  /**
   * Get staff in/out report (CR193)
   */
  async getStaffInOutReport(params: GetStaffInOutReportParams) {
    return await this.get(ApiPaths.hrm_reports_staff_in_out_retrieve, {
      query: params,
    })
  }

  /**
   * Export staff in/out report as styled XLSX
   */
  async exportStaffInOutReport(params: GetStaffInOutReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_staff_in_out_export, {
      query: params,
    })
  }

  /**
   * Get employee resigned breakdown report
   */
  async getEmployeeResignedBreakdownReport(params: GetEmployeeResignedBreakdownReportParams) {
    return await this.get(ApiPaths.hrm_reports_employee_resigned_breakdown_retrieve, {
      query: params,
    })
  }

  /**
   * Get employee resigned reasons summary report
   */
  async getEmployeeResignedReasonSummaryReport(
    params?: GetEmployeeResignedReasonSummaryReportParams
  ) {
    return await this.get(ApiPaths.hrm_reports_employee_resigned_reasons_summary_retrieve, {
      query: params,
    })
  }

  /**
   * Get employee status breakdown report
   */
  async getEmployeeStatusBreakdownReport(params: GetEmployeeStatusBreakdownReportParams) {
    return await this.get(ApiPaths.hrm_reports_employee_status_breakdown_retrieve, {
      query: params,
    })
  }

  /**
   * Get employee seniority report
   */
  async getEmployeeSeniorityReport(params?: GetEmployeeSeniorityReportParams) {
    return await this.getPaginated(ApiPaths.hrm_reports_employee_seniority_report_list, params)
  }

  /**
   * Export employee seniority report
   */
  async exportEmployeeSeniorityReport(params?: GetEmployeeSeniorityReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_employee_seniority_report_export_retrieve, {
      query: params,
    })
  }

  /**
   * Get employee type conversion report
   */
  async getEmployeeTypeConversionReport(params?: GetEmployeeTypeConversionReportParams) {
    return await this.getPaginated(
      ApiPaths.hrm_reports_employee_type_conversion_report_list,
      params
    )
  }

  /**
   * Export employee type conversion report
   */
  async exportEmployeeTypeConversionReport(params?: GetEmployeeTypeConversionReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_employee_type_conversion_report_export_retrieve, {
      query: params,
    })
  }

  /**
   * Get job transfer report (department/position changes with old & new units)
   */
  async getJobTransferReport(params?: GetJobTransferReportParams) {
    return await this.getPaginated(ApiPaths.hrm_reports_job_transfer_report_list, params)
  }

  /**
   * Export job transfer report
   */
  async exportJobTransferReport(params?: GetJobTransferReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_job_transfer_export_retrieve, {
      query: params,
    })
  }

  /**
   * Generic HRM reports export (recruitment_reports.export)
   */
  async exportHrmReports(params?: GetHrmReportsExportParams) {
    return await this.get(ApiPaths.hrm_reports_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export referral cost report as styled XLSX
   */
  async exportReferralCostReport(params?: GetReferralCostReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_referral_cost_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export cost-by-payer report (recruitment cost by employee) as styled XLSX
   */
  async exportCostByPayerReport(params?: GetCostByPayerReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_cost_by_payer_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export cost-by-source report (recruitment cost by source/channel) as styled XLSX
   */
  async exportCostBySourceReport(params?: GetCostBySourceReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_cost_by_source_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export recruitment-channel report as styled XLSX
   */
  async exportRecruitmentChannelReport(params?: GetRecruitmentChannelReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_recruitment_channel_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export recruitment-source report as styled XLSX
   */
  async exportRecruitmentSourceReport(params?: GetRecruitmentSourceReportExportParams) {
    return await this.get(ApiPaths.hrm_reports_recruitment_source_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _hrmReportService: HrmReportService | null = null

export function getHrmReportService(): HrmReportService {
  if (!_hrmReportService) {
    _hrmReportService = new HrmReportService()
  }
  return _hrmReportService
}

// ===== REACT QUERY HOOKS =====
export function useHiredCandidateReport(
  params?: GetHiredCandidateReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.HIRED_CANDIDATE(params || {}),
    () => getHrmReportService().getHiredCandidateReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useRecruitmentChannelReport(
  params?: GetRecruitmentChannelReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.RECRUITMENT_CHANNEL(params || {}),
    () => getHrmReportService().getRecruitmentChannelReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useRecruitmentCostReport(
  params?: GetRecruitmentCostReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.RECRUITMENT_COST(params || {}),
    () => getHrmReportService().getRecruitmentCostReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCostByPayerReport(
  params?: GetCostByPayerReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.COST_BY_PAYER(params || {}),
    () => getHrmReportService().getCostByPayerReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCostBySourceReport(
  params?: GetCostBySourceReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.COST_BY_SOURCE(params || {}),
    () => getHrmReportService().getCostBySourceReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useRecruitmentSourceReport(
  params?: GetRecruitmentSourceReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.RECRUITMENT_SOURCE(params || {}),
    () => getHrmReportService().getRecruitmentSourceReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useReferralCostReport(
  params?: GetReferralCostReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.REFERRAL_COST(params || {}),
    () => getHrmReportService().getReferralCostReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStaffGrowthReport(
  params?: GetStaffGrowthReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.STAFF_GROWTH(params || {}),
    () => getHrmReportService().getStaffGrowthReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStaffInOutReport(
  params?: GetStaffInOutReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.STAFF_IN_OUT(params || {}),
    () => getHrmReportService().getStaffInOutReport(params!),
    {
      staleTime: 1000 * 60 * 5,
      enabled: (options?.enabled ?? true) && !!params,
    }
  )
}

export function useEmployeeResignedBreakdownReport(
  params?: GetEmployeeResignedBreakdownReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.EMPLOYEE_RESIGNED_BREAKDOWN(params || {}),
    () => getHrmReportService().getEmployeeResignedBreakdownReport(params!),
    {
      staleTime: 1000 * 60 * 5,
      enabled: (options?.enabled ?? true) && !!params,
    }
  )
}

export function useEmployeeResignedReasonSummaryReport(
  params?: GetEmployeeResignedReasonSummaryReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.EMPLOYEE_RESIGNED_REASONS_SUMMARY(params || {}),
    () => getHrmReportService().getEmployeeResignedReasonSummaryReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useEmployeeStatusBreakdownReport(
  params?: GetEmployeeStatusBreakdownReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.EMPLOYEE_STATUS_BREAKDOWN(params || {}),
    () => getHrmReportService().getEmployeeStatusBreakdownReport(params!),
    {
      staleTime: 1000 * 60 * 5,
      enabled: (options?.enabled ?? true) && !!params,
    }
  )
}

export function useEmployeeSeniorityReport(
  params?: GetEmployeeSeniorityReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.EMPLOYEE_SENIORITY(params || {}),
    () => getHrmReportService().getEmployeeSeniorityReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExportEmployeeSeniorityReport() {
  return useExport({
    exportFunction: (params?: GetEmployeeSeniorityReportExportParams) =>
      getHrmReportService().exportEmployeeSeniorityReport(params),
    defaultFilename: 'employee-seniority-report',
  })
}

export function useJobTransferReport(
  params?: GetJobTransferReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.JOB_TRANSFER(params || {}),
    () => getHrmReportService().getJobTransferReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExportJobTransferReport() {
  return useExport({
    exportFunction: (params?: GetJobTransferReportExportParams) =>
      getHrmReportService().exportJobTransferReport(params),
    defaultFilename: 'job-transfer-report',
  })
}

export function useEmployeeTypeConversionReport(
  params?: GetEmployeeTypeConversionReportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.REPORTS.EMPLOYEE_TYPE_CONVERSION(params || {}),
    () => getHrmReportService().getEmployeeTypeConversionReport(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExportEmployeeTypeConversionReport() {
  return useExport({
    exportFunction: (params?: GetEmployeeTypeConversionReportExportParams) =>
      getHrmReportService().exportEmployeeTypeConversionReport(params),
    defaultFilename: 'employee-type-conversion-report',
  })
}

export function useExportHrmReports() {
  return useExport({
    exportFunction: (params?: GetHrmReportsExportParams) =>
      getHrmReportService().exportHrmReports(params),
    defaultFilename: 'hrm-reports',
  })
}

export function useExportReferralCostReport() {
  return useExport({
    exportFunction: (params?: GetReferralCostReportExportParams) =>
      getHrmReportService().exportReferralCostReport(params),
    defaultFilename: 'referral-cost-report',
  })
}

export function useExportStaffInOutReport() {
  return useExport({
    exportFunction: (params: GetStaffInOutReportExportParams) =>
      getHrmReportService().exportStaffInOutReport(params),
    defaultFilename: 'staff-in-out-report',
  })
}

export function useExportCostByPayerReport() {
  return useExport({
    exportFunction: (params?: GetCostByPayerReportExportParams) =>
      getHrmReportService().exportCostByPayerReport(params),
    defaultFilename: 'cost-by-payer-report',
  })
}

export function useExportCostBySourceReport() {
  return useExport({
    exportFunction: (params?: GetCostBySourceReportExportParams) =>
      getHrmReportService().exportCostBySourceReport(params),
    defaultFilename: 'cost-by-source-report',
  })
}

export function useExportRecruitmentChannelReport() {
  return useExport({
    exportFunction: (params?: GetRecruitmentChannelReportExportParams) =>
      getHrmReportService().exportRecruitmentChannelReport(params),
    defaultFilename: 'recruitment-channel-report',
  })
}

export function useExportRecruitmentSourceReport() {
  return useExport({
    exportFunction: (params?: GetRecruitmentSourceReportExportParams) =>
      getHrmReportService().exportRecruitmentSourceReport(params),
    defaultFilename: 'recruitment-source-report',
  })
}
