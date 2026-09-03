import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Button from '@/components/ui/button/Button.tsx'
import { IconCaretdown, IconFunnel, IconGearsix } from '@/assets/icons'
import RecruitmentByBranchChart from '../chart/RecruitmentByBranchChart.tsx'
import RecruitmentByExperienceChart from '../chart/RecruitmentByExperienceChart.tsx'
import RecruitmentBySourceChart from '../chart/RecruitmentBySourceChart.tsx'
// [HIDDEN] Ẩn biểu đồ "Số liệu tuyển mới theo nguồn và kênh tuyển dụng" theo yêu cầu — comment lại, không xoá
// import RecruitmentProgressChart from '../chart/RecruitmentProgressChart.tsx'
import { cn, hasPermission } from '@/utils'
import { Flex, Text } from '@radix-ui/themes'
import RecruitmentCostByBranches from '../chart/RecruitmentCostByBranches.tsx'
import CostBreakdownBySourceChart from '../chart/CostBreakdownBySourceChart.tsx'
import CostBreakdownByChannelChart from '../chart/CostBreakdownByChannelChart.tsx'
import CostBreakdownByBranchChart from '../chart/CostBreakdownByBranchChart.tsx'
import StaffGrowthByBranchesChart from '../chart/StaffGrowthByBranchesChart.tsx'
import AmountBadge from '@/components/ui/badge/amount-badge.tsx'
import RecruitmentStatistic from '@/features/dashboard/components/recruitment/RecruitmentStatistic.tsx'
import { DashboardFilterProvider } from '@/features/dashboard/context/DashboardFilterContext.tsx'
import { useDialog } from '@/hooks/useDialog.ts'
import RecruitmentDashboardFilterForm, {
  type RecruitmentDashboardFilterFormRef,
  type RecruitmentDashboardFilterFormValues,
} from './RecruitmentDashboardFilterForm.tsx'
import FilterFooter from '@/components/commons/FilterFooter.tsx'
import { cleanObject } from '@/utils/common.ts'
import { startOfYear } from 'date-fns'
import { formatDateRangeText } from '@/utils/date-utils.ts'
import { useAuth } from '@/hooks/useAuth.ts'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Checkbox from '@/components/ui/checkbox/Checkbox.tsx'

const GRID_INDEX_TO_CHART_KEY = ['experience', 'source', 'branch', 'costByChannel'] as const

const CHART_SETTINGS_LIST = [
  { id: 'staffGrowthByBranches' as const, label: 'Tăng trưởng nhân sự theo chi nhánh' },
  { id: 'experience' as const, label: 'Tỷ lệ tuyển mới theo kinh nghiệm' },
  { id: 'source' as const, label: 'Tỷ lệ tuyển mới theo nguồn và kênh tuyển dụng' },
  { id: 'branch' as const, label: 'Tỷ lệ tuyển mới theo chi nhánh' },
  { id: 'costBySource' as const, label: 'Chi phí theo nguồn' },
  { id: 'costByChannel' as const, label: 'Chi phí theo kênh' },
  { id: 'costByBranch' as const, label: 'Chi phí theo chi nhánh' },
  // [HIDDEN] Ẩn biểu đồ "Số liệu tuyển mới theo nguồn và kênh tuyển dụng" theo yêu cầu — comment lại, không xoá
  // { id: 'progress' as const, label: 'Số liệu tuyển mới theo nguồn và kênh tuyển dụng' },
  { id: 'costByBranches' as const, label: 'Chi phí tuyển dụng bình quân - Theo chi nhánh' },
]

const DEFAULT_CHART_VISIBILITY = CHART_SETTINGS_LIST.reduce(
  (acc, { id }) => ({ ...acc, [id]: true }),
  {} as Record<(typeof CHART_SETTINGS_LIST)[number]['id'], boolean>
)

function getChartVisibilityStorageKey(username: string | undefined) {
  return `recruitmentDashboardChartVisibility_${username || 'default'}`
}

const RECRUITMENT_CHART_CONFIGS = [
  {
    permissionCode: 'recruitment_dashboard.experience_breakdown_chart',
    Component: RecruitmentByExperienceChart,
  },
  {
    permissionCode: 'recruitment_dashboard.source_type_breakdown_chart',
    Component: RecruitmentBySourceChart,
  },
  {
    permissionCode: 'recruitment_dashboard.branch_breakdown_chart',
    Component: RecruitmentByBranchChart,
  },
  {
    permissionCode: 'recruitment_dashboard.cost_breakdown_by_channel_chart',
    Component: CostBreakdownByChannelChart,
  },
] as const

function RecruitmentDashboard() {
  const { user } = useAuth()
  const canViewExperience = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.experience_breakdown_chart'
  ).canViewChart
  const canViewSource = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.source_type_breakdown_chart'
  ).canViewChart
  const canViewBranch = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.branch_breakdown_chart'
  ).canViewChart
  const canViewProgress = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.monthly_trends_chart'
  ).canViewChart
  const canViewCostByBranches = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.cost_by_branches_chart'
  ).canViewChart
  const canViewCostBySource = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.cost_breakdown_by_source_chart'
  ).canViewChart
  const canViewCostByChannel = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.cost_breakdown_by_channel_chart'
  ).canViewChart
  const canViewCostByBranch = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.cost_breakdown_by_branch_chart'
  ).canViewChart
  const canViewStaffGrowthByBranches = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.staff_growth_by_branches_chart'
  ).canViewChart

  const chartSettingsListByPermission = useMemo(() => {
    const permissionByChartId: Record<string, boolean> = {
      experience: canViewExperience,
      source: canViewSource,
      branch: canViewBranch,
      costBySource: canViewCostBySource,
      costByChannel: canViewCostByChannel,
      costByBranch: canViewCostByBranch,
      progress: canViewProgress,
      costByBranches: canViewCostByBranches,
      staffGrowthByBranches: canViewStaffGrowthByBranches,
    }
    return CHART_SETTINGS_LIST.filter(({ id }) => permissionByChartId[id])
  }, [
    canViewExperience,
    canViewSource,
    canViewBranch,
    canViewProgress,
    canViewCostBySource,
    canViewCostByChannel,
    canViewCostByBranch,
    canViewStaffGrowthByBranches,
  ])

  const [chartVisibility, setChartVisibility] =
    useState<Record<string, boolean>>(DEFAULT_CHART_VISIBILITY)

  const chartVisibilityStats = useMemo(() => {
    const total = chartSettingsListByPermission.length
    const enabled = chartSettingsListByPermission.filter(
      ({ id }) => chartVisibility[id] !== false
    ).length
    return { enabled, total }
  }, [chartSettingsListByPermission, chartVisibility])

  useEffect(() => {
    const key = getChartVisibilityStorageKey(user?.username)
    try {
      const raw = localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : {}
      setChartVisibility((prev) =>
        CHART_SETTINGS_LIST.reduce(
          (acc, { id }) => ({ ...acc, [id]: parsed[id] ?? prev[id] ?? true }),
          {} as Record<string, boolean>
        )
      )
    } catch {
      // keep default
    }
  }, [user?.username])

  const setChartVisibilityAndPersist = useCallback(
    (id: string, value: boolean) => {
      setChartVisibility((prev) => {
        const next = { ...prev, [id]: value }
        try {
          localStorage.setItem(getChartVisibilityStorageKey(user?.username), JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    },
    [user?.username]
  )

  const visibleCharts = useMemo(() => {
    const visibility = [canViewExperience, canViewSource, canViewBranch, canViewCostByChannel]
    return RECRUITMENT_CHART_CONFIGS.map((config, index) => ({
      ...config,
      index,
      chartKey: GRID_INDEX_TO_CHART_KEY[index],
      canView: visibility[index],
    })).filter((c) => c.canView && chartVisibility[c.chartKey] !== false)
  }, [canViewExperience, canViewSource, canViewBranch, canViewCostByChannel, chartVisibility])

  const canViewChart = useMemo(
    () =>
      [
        'recruitment_dashboard.experience_breakdown_chart',
        'recruitment_dashboard.source_type_breakdown_chart',
        'recruitment_dashboard.branch_breakdown_chart',
        'recruitment_dashboard.monthly_trends_chart',
        'recruitment_dashboard.cost_by_branches_chart',
        'recruitment_dashboard.cost_breakdown_by_source_chart',
        'recruitment_dashboard.cost_breakdown_by_channel_chart',
        'recruitment_dashboard.cost_breakdown_by_branch_chart',
        'recruitment_dashboard.staff_growth_by_branches_chart',
      ].some((code) => hasPermission(user?.permissions || [], code)),
    [user?.permissions]
  )

  const canViewStatistic = useMemo(
    () => hasPermission(user?.permissions || [], 'recruitment_dashboard.realtime'),
    [user?.permissions]
  )

  const refForm = useRef<RecruitmentDashboardFilterFormRef>(null)
  const today = new Date()
  const defaultDateRange = { from: startOfYear(today), to: today }
  const [dashboardFilter, setDashboardFilter] =
    useState<RecruitmentDashboardFilterFormValues | null>(null)
  const [dashboardFilterVersion, setDashboardFilterVersion] = useState(0)

  const activeFiltersCount = useMemo(() => {
    if (!dashboardFilter) return 0
    let count = 0
    if (dashboardFilter.dateRange?.from || dashboardFilter.dateRange?.to) {
      count += 1
    }
    if (dashboardFilter.branch) {
      count += 1
    }
    return count
  }, [dashboardFilter])

  const subTitle = useMemo(
    () =>
      dashboardFilter
        ? formatDateRangeText(dashboardFilter.dateRange?.from, dashboardFilter.dateRange?.to)
        : '',
    [dashboardFilter]
  )

  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setDashboardFilter(null)
    setDashboardFilterVersion((prev) => prev + 1) // Increment version to notify charts
    displayClose()
  }, [displayClose])

  const onClickApply = useCallback(async () => {
    const formData = refForm.current?.getValues?.()
    if (formData) {
      const filteredParams = cleanObject(formData)
      setDashboardFilter(filteredParams)
      setDashboardFilterVersion((prev) => prev + 1) // Increment version to notify charts
      displayClose()
    }
  }, [displayClose])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <>
          <RecruitmentDashboardFilterForm
            ref={refForm}
            initialValues={dashboardFilter || { dateRange: defaultDateRange }}
            onApply={onClickApply}
            onClear={onClickClearFilter}
          />
        </>
      ),
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [
    displayFormContent,
    onClickApply,
    dashboardFilter,
    onClickClearFilter,
    displayClose,
    defaultDateRange,
  ])

  return (
    <>
      <DashboardFilterProvider value={{ dashboardFilter, dashboardFilterVersion }}>
        <div className="p-10 pt-6">
          {canViewStatistic && (
            <>
              <Flex direction={'column'} align={'start'} gap={'2'}>
                <h1 className="text-2xl font-bold">Tuyển dụng</h1>
              </Flex>
              <RecruitmentStatistic />
            </>
          )}

          {canViewChart && (
            <>
              <div className="mb-5 flex items-center gap-5">
                <Button
                  variant="secondary"
                  leftIcon={
                    <>
                      <IconFunnel
                        size={14}
                        className={cn(
                          activeFiltersCount &&
                            activeFiltersCount > 0 &&
                            'text-action-primary-red-default'
                        )}
                      />
                    </>
                  }
                  rightIcon={
                    activeFiltersCount && activeFiltersCount > 0 ? (
                      <>
                        <AmountBadge amount={activeFiltersCount} />
                      </>
                    ) : (
                      <IconCaretdown size={14} />
                    )
                  }
                  className={cn(
                    'text-nowrap',
                    'bg-data-light-grey-default',
                    'hover:bg-data-light-grey-hover',
                    'text-content-dark-3',
                    'typo-body-sm-medium',
                    'hover:text-content-dark-1',
                    'border-border-1 border',
                    'h-10',
                    activeFiltersCount &&
                      activeFiltersCount > 0 &&
                      'bg-action-primary-red-activated border-action-primary-red-default text-action-primary-red-default hover:text-action-primary-red-default'
                  )}
                  childrenClassName={'typo-body-sm-medium'}
                  onClick={openFilterModal}
                >
                  Bộ lọc
                </Button>
                {subTitle && (
                  <Text className="text-content-dark-3 typo-body-base-medium">{subTitle}</Text>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <Text className="text-content-dark-3 typo-body-xs-regular shrink-0">
                    Đang bật {chartVisibilityStats.enabled}/{chartVisibilityStats.total} biểu đồ
                  </Text>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        iconOnly
                        className="border-border-1 bg-data-light-grey-default hover:bg-data-light-grey-hover text-content-dark-3 hover:text-content-dark-1 h-10 w-10 border p-0"
                        aria-label="Cài đặt hiển thị biểu đồ"
                      >
                        <IconGearsix size={20} className="shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="border-border-1 bg-background-1 w-80">
                      <p className="text-content-dark-1 typo-body-sm-medium mb-3">
                        Hiển thị biểu đồ
                      </p>
                      <div className="flex flex-col gap-2">
                        {chartSettingsListByPermission.map(({ id, label }) => (
                          <Checkbox
                            key={id}
                            id={`chart-visibility-${id}`}
                            label={label}
                            checked={chartVisibility[id]}
                            onCheckedChange={(checked) =>
                              setChartVisibilityAndPersist(id, checked === true)
                            }
                            className="border-border-1"
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {canViewStaffGrowthByBranches && chartVisibility['staffGrowthByBranches'] && (
                <StaffGrowthByBranchesChart />
              )}

              {visibleCharts.length > 0 && (
                <div
                  className="border-border-1 grid w-full border-r border-b"
                  style={{
                    gridTemplateColumns: `repeat(${
                      visibleCharts.length === 5
                        ? 6
                        : visibleCharts.length <= 3
                          ? visibleCharts.length
                          : visibleCharts.length === 4
                            ? 2
                            : 3
                    }, minmax(0, 1fr))`,
                    gridTemplateRows: visibleCharts.length <= 3 ? 'auto' : 'auto auto',
                  }}
                >
                  {visibleCharts.map(({ Component, chartKey }, i) => {
                    const count = visibleCharts.length
                    const isFiveColLayout = count === 5
                    const gridCols = count <= 3 ? count : count === 4 ? 2 : 3
                    const gridRow = count <= 3 ? 1 : i < (count === 4 ? 2 : 3) ? 1 : 2
                    const compact = (count === 3 || count === 5) && gridRow === 1
                    if (isFiveColLayout) {
                      const isRightmost = (gridRow === 1 && i === 2) || (gridRow === 2 && i === 4)
                      const gridColumn =
                        gridRow === 1 ? `${2 * i + 1} / span 2` : `${3 * (i - 3) + 1} / span 3`
                      return (
                        <div
                          key={chartKey}
                          className={cn(
                            'border-border-1 overflow-visible border-t border-l p-2',
                            isRightmost && 'border-border-1 border-r'
                          )}
                          style={{
                            gridRow,
                            gridColumn,
                          }}
                        >
                          <Component compact={compact} />
                        </div>
                      )
                    }
                    const gridColumn =
                      count <= 3 ? i + 1 : count === 4 ? (i % 2) + 1 : i < 3 ? i + 1 : i - 2
                    const isRightmostDefault =
                      (gridRow === 1 && gridColumn === gridCols) ||
                      (gridRow === 2 && gridColumn === 2)
                    return (
                      <div
                        key={chartKey}
                        className={cn(
                          'border-border-1 overflow-visible border-t border-l p-2',
                          isRightmostDefault && 'border-border-1 border-r'
                        )}
                        style={{
                          gridRow,
                          gridColumn,
                        }}
                      >
                        <Component compact={compact} />
                      </div>
                    )
                  })}
                </div>
              )}

              {canViewCostBySource && chartVisibility['costBySource'] && (
                <div className="border-border-1 border-t border-r border-b border-l p-2">
                  <CostBreakdownBySourceChart />
                </div>
              )}

              {canViewCostByBranch && chartVisibility['costByBranch'] && (
                <div className="border-border-1 border-t border-r border-b border-l p-2">
                  <CostBreakdownByBranchChart />
                </div>
              )}

              {/* [HIDDEN] Ẩn biểu đồ "Số liệu tuyển mới theo nguồn và kênh tuyển dụng" theo yêu cầu — comment lại, không xoá */}
              {/* {canViewProgress && chartVisibility['progress'] && <RecruitmentProgressChart />} */}

              {canViewCostByBranches && chartVisibility['costByBranches'] && (
                <RecruitmentCostByBranches />
              )}
            </>
          )}
        </div>
      </DashboardFilterProvider>
    </>
  )
}

export default RecruitmentDashboard
