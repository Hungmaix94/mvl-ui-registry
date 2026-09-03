import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'
import { getDashboardApiRefreshDuration } from '@/config/environment'

// ===== TYPE DEFINITIONS =====
export type DashboardChartData = components['schemas']['DashboardRealtimeData']
export type DashboardRealtimeData = components['schemas']['DashboardRealtimeData']
export type BranchBreakdownResponse = components['schemas']['BranchBreakdownResponse']
export type CostBreakdownResponse = components['schemas']['CostBreakdownResponse']
export type CostBreakdownByChannelResponse = components['schemas']['CostBreakdownByChannelResponse']
export type CostBreakdownBySourceResponse = components['schemas']['CostBreakdownBySourceResponse']
export type BranchCostBreakdownResponse = components['schemas']['BranchCostBreakdownResponse']
export type CostByBranchesResponse = components['schemas']['CostByBranchesResponse']
export type ExperienceBreakdownResponse = components['schemas']['ExperienceBreakdownResponse']
export type MonthlyTrendsResponse = components['schemas']['MonthlyTrendsResponse']
export type SourceTypeBreakdownResponse = components['schemas']['SourceTypeBreakdownResponse']
export type StaffGrowthByBranchesResponse = components['schemas']['StaffGrowthByBranchesResponse']
export type HrmDashboardAttendanceStatisticsData =
  components['schemas']['HRMDashboardAttendanceStatisticsData']
export type OverdueProposalsByBranchResponse =
  components['schemas']['OverdueProposalsByBranchResponse']
export type OverdueProposalsByBranchItem = components['schemas']['OverdueProposalsByBranchItem']
export type OverdueProposalsByBranchMonthlyResponse =
  components['schemas']['OverdueProposalsByBranchMonthlyResponse']
export type OverdueProposalsByBranchMonthlyItem =
  components['schemas']['OverdueProposalsByBranchMonthlyItem']
export type OverdueProposalsStatisticsResponse =
  components['schemas']['OverdueProposalsStatisticsResponse']

export type GetDashboardChartsParams =
  paths['/api/hrm/dashboard/realtime/']['get']['parameters']['query']
export type GetBranchBreakdownParams =
  paths['/api/hrm/dashboard/charts/branch-breakdown/']['get']['parameters']['query']
export type GetCostBreakdownParams =
  paths['/api/hrm/dashboard/charts/cost-breakdown/']['get']['parameters']['query']
export type GetCostBreakdownByChannelParams =
  paths['/api/hrm/dashboard/charts/cost-breakdown-by-channel/']['get']['parameters']['query']
export type GetCostBreakdownBySourceParams =
  paths['/api/hrm/dashboard/charts/cost-breakdown-by-source/']['get']['parameters']['query']
export type GetCostBreakdownByBranchParams =
  paths['/api/hrm/dashboard/charts/cost-breakdown-by-branch/']['get']['parameters']['query']
export type GetCostByBranchesParams =
  paths['/api/hrm/dashboard/charts/cost-by-branches/']['get']['parameters']['query']
export type GetExperienceBreakdownParams =
  paths['/api/hrm/dashboard/charts/experience-breakdown/']['get']['parameters']['query']
export type GetMonthlyTrendsParams =
  paths['/api/hrm/dashboard/charts/monthly-trends/']['get']['parameters']['query']
export type GetSourceTypeBreakdownParams =
  paths['/api/hrm/dashboard/charts/source-type-breakdown/']['get']['parameters']['query']
export type GetStaffGrowthByBranchesParams =
  paths['/api/hrm/dashboard/charts/staff-growth-by-branches/']['get']['parameters']['query']
export type GetHrmCommonAttendanceStatisticsParams =
  paths['/api/hrm/dashboard/hrm/common/attendance-statistics/']['get']['parameters']['query']
export type GetHrmCommonOverdueProposalsByBranchParams =
  paths['/api/hrm/dashboard/hrm/common/overdue-proposals-by-branch/']['get']['parameters']['query']
export type GetHrmCommonOverdueProposalsByBranchMonthlyParams =
  paths['/api/hrm/dashboard/hrm/common/overdue-proposals-by-branch-monthly/']['get']['parameters']['query']
export type GetHrmCommonOverdueProposalsStatisticsParams =
  paths['/api/hrm/dashboard/hrm/common/overdue-proposals-statistics/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class DashboardService extends BaseApiService {
  /**
   * Get dashboard chart data
   */
  async getDashboardCharts(params?: GetDashboardChartsParams) {
    return await this.get(ApiPaths.hrm_dashboard_realtime_retrieve, {
      query: params,
    })
  }

  /**
   * Get dashboard realtime data
   */
  async getDashboardRealtime() {
    return await this.get(ApiPaths.hrm_dashboard_realtime_retrieve)
  }

  /**
   * Get HRM common dashboard realtime data
   */
  async getHrmCommonDashboardRealtime() {
    return await this.get(ApiPaths.hrm_dashboard_hrm_common_realtime_retrieve)
  }

  /**
   * Get partner (investor / exchange) founding-anniversary tiles — CR STT27
   */
  async getPartnerDashboardRealtime() {
    return await this.get(ApiPaths.realestate_dashboard_partner_realtime_retrieve)
  }

  /**
   * Get HRM common dashboard attendance statistics
   */
  async getHrmCommonAttendanceStatistics(params?: GetHrmCommonAttendanceStatisticsParams) {
    return await this.get(ApiPaths.hrm_dashboard_hrm_common_attendance_statistics_retrieve, {
      query: params,
    })
  }

  /**
   * Get HRM common dashboard overdue proposals by branch
   */
  async getHrmCommonOverdueProposalsByBranch(params?: GetHrmCommonOverdueProposalsByBranchParams) {
    return await this.get(ApiPaths.hrm_dashboard_hrm_common_overdue_proposals_by_branch_retrieve, {
      query: params,
    })
  }

  /**
   * Get HRM common dashboard monthly overdue proposals by branch
   */
  async getHrmCommonOverdueProposalsByBranchMonthly(
    params?: GetHrmCommonOverdueProposalsByBranchMonthlyParams
  ) {
    return await this.get(
      ApiPaths.hrm_dashboard_hrm_common_overdue_proposals_by_branch_monthly_retrieve,
      { query: params }
    )
  }

  /**
   * Get HRM common dashboard overdue-proposals statistics (month/year filterable)
   */
  async getHrmCommonOverdueProposalsStatistics(
    params?: GetHrmCommonOverdueProposalsStatisticsParams
  ) {
    return await this.get(ApiPaths.hrm_dashboard_hrm_common_overdue_proposals_statistics_retrieve, {
      query: params,
    })
  }

  /**
   * Get manager dashboard realtime data
   */
  async getManagerDashboardRealtime() {
    return await this.get(ApiPaths.hrm_dashboard_manager_realtime_retrieve)
  }

  /**
   * Get branch breakdown chart data
   */
  async getBranchBreakdown(params?: GetBranchBreakdownParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_branch_breakdown_retrieve, {
      query: params,
    })
  }

  /**
   * Get cost breakdown chart data
   */
  async getCostBreakdown(params?: GetCostBreakdownParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_cost_breakdown_retrieve, {
      query: params,
    })
  }

  /**
   * Get cost breakdown by channel chart data
   */
  async getCostBreakdownByChannel(params?: GetCostBreakdownByChannelParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_cost_breakdown_by_channel_retrieve, {
      query: params,
    })
  }

  /**
   * Get cost breakdown by source chart data
   */
  async getCostBreakdownBySource(params?: GetCostBreakdownBySourceParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_cost_breakdown_by_source_retrieve, {
      query: params,
    })
  }

  /**
   * Get cost breakdown by branch chart data
   */
  async getCostBreakdownByBranch(params?: GetCostBreakdownByBranchParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_cost_breakdown_by_branch_retrieve, {
      query: params,
    })
  }

  /**
   * Get cost by branches chart data
   */
  async getCostByBranches(params?: GetCostByBranchesParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_cost_by_branches_retrieve, {
      query: params,
    })
  }

  /**
   * Get experience breakdown chart data
   */
  async getExperienceBreakdown(params?: GetExperienceBreakdownParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_experience_breakdown_retrieve, {
      query: params,
    })
  }

  /**
   * Get monthly trends chart data
   */
  async getMonthlyTrends(params?: GetMonthlyTrendsParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_monthly_trends_retrieve, {
      query: params,
    })
  }

  /**
   * Get source type breakdown chart data
   */
  async getSourceTypeBreakdown(params?: GetSourceTypeBreakdownParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_source_type_breakdown_retrieve, {
      query: params,
    })
  }

  /**
   * Get staff growth by branches chart data
   */
  async getStaffGrowthByBranches(params?: GetStaffGrowthByBranchesParams) {
    return await this.get(ApiPaths.hrm_dashboard_charts_staff_growth_by_branches_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _dashboardService: DashboardService | null = null

export function getDashboardService(): DashboardService {
  if (!_dashboardService) {
    _dashboardService = new DashboardService()
  }
  return _dashboardService
}

// ===== REACT QUERY HOOKS =====
export function useDashboardCharts(
  params?: GetDashboardChartsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.CHARTS(params || {}),
    () => getDashboardService().getDashboardCharts(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useDashboardRealtime(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.REALTIME(),
    () => getDashboardService().getDashboardRealtime(),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: getDashboardApiRefreshDuration(),
      enabled: options?.enabled ?? true,
    }
  )
}

export function useHrmCommonDashboardRealtime(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.HRM_COMMON_REALTIME(),
    () => getDashboardService().getHrmCommonDashboardRealtime(),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: getDashboardApiRefreshDuration(),
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePartnerDashboardRealtime(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.DASHBOARD.PARTNER_REALTIME(),
    () => getDashboardService().getPartnerDashboardRealtime(),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: getDashboardApiRefreshDuration(),
      enabled: options?.enabled ?? true,
    }
  )
}

export function useHrmCommonOverdueProposalsStatistics(
  params?: GetHrmCommonOverdueProposalsStatisticsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.HRM_COMMON_OVERDUE_PROPOSALS_STATISTICS(params || {}),
    () => getDashboardService().getHrmCommonOverdueProposalsStatistics(params),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: getDashboardApiRefreshDuration(),
      enabled: options?.enabled ?? true,
    }
  )
}

export function useManagerDashboardRealtime(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.MANAGER_REALTIME(),
    () => getDashboardService().getManagerDashboardRealtime(),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useHrmCommonAttendanceStatistics(
  params?: GetHrmCommonAttendanceStatisticsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.HRM_COMMON_ATTENDANCE_STATISTICS(params || {}),
    () => getDashboardService().getHrmCommonAttendanceStatistics(params),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: getDashboardApiRefreshDuration(),
      enabled: options?.enabled ?? true,
    }
  )
}

export function useHrmCommonOverdueProposalsByBranch(
  params?: GetHrmCommonOverdueProposalsByBranchParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.HRM_COMMON_OVERDUE_PROPOSALS_BY_BRANCH(params || {}),
    () => getDashboardService().getHrmCommonOverdueProposalsByBranch(params),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: getDashboardApiRefreshDuration(),
      enabled: options?.enabled ?? true,
    }
  )
}

export function useHrmCommonOverdueProposalsByBranchMonthly(
  params?: GetHrmCommonOverdueProposalsByBranchMonthlyParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.HRM_COMMON_OVERDUE_PROPOSALS_BY_BRANCH_MONTHLY(params || {}),
    () => getDashboardService().getHrmCommonOverdueProposalsByBranchMonthly(params),
    {
      staleTime: 1000 * 60 * 5,
      refetchInterval: getDashboardApiRefreshDuration(),
      enabled: options?.enabled ?? true,
    }
  )
}

export function useBranchBreakdown(
  params?: GetBranchBreakdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.BRANCH_BREAKDOWN(params || {}),
    () => getDashboardService().getBranchBreakdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCostBreakdown(params?: GetCostBreakdownParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.COST_BREAKDOWN(params || {}),
    () => getDashboardService().getCostBreakdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCostBreakdownByChannel(
  params?: GetCostBreakdownByChannelParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.COST_BREAKDOWN_BY_CHANNEL(params || {}),
    () => getDashboardService().getCostBreakdownByChannel(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCostBreakdownBySource(
  params?: GetCostBreakdownBySourceParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.COST_BREAKDOWN_BY_SOURCE(params || {}),
    () => getDashboardService().getCostBreakdownBySource(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCostBreakdownByBranch(
  params?: GetCostBreakdownByBranchParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.COST_BREAKDOWN_BY_BRANCH(params || {}),
    () => getDashboardService().getCostBreakdownByBranch(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCostByBranches(
  params?: GetCostByBranchesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.COST_BY_BRANCHES(params || {}),
    () => getDashboardService().getCostByBranches(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExperienceBreakdown(
  params?: GetExperienceBreakdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.EXPERIENCE_BREAKDOWN(params || {}),
    () => getDashboardService().getExperienceBreakdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useMonthlyTrends(params?: GetMonthlyTrendsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.MONTHLY_TRENDS(params || {}),
    () => getDashboardService().getMonthlyTrends(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useSourceTypeBreakdown(
  params?: GetSourceTypeBreakdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.SOURCE_TYPE_BREAKDOWN(params || {}),
    () => getDashboardService().getSourceTypeBreakdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStaffGrowthByBranches(
  params?: GetStaffGrowthByBranchesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DASHBOARD.STAFF_GROWTH_BY_BRANCHES(params || {}),
    () => getDashboardService().getStaffGrowthByBranches(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}
