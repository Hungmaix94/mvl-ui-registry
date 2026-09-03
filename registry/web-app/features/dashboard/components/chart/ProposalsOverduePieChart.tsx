import { useMemo, useState } from 'react'
import { ApiPaths, components, ProposalsOverdueLevel } from '@/api/schema'
import {
  useHrmCommonOverdueProposalsStatistics,
  type GetHrmCommonOverdueProposalsStatisticsParams,
} from '@/features/dashboard/services/dashboard-service'
import { useAbility } from '@/lib/ability'
import { LoadingWrapper } from '@/components'
import DoughnutChart, { ChartSegment } from '@/components/ui/chart/DoughnutChart'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import ProposalOverdueGauge from '@/features/dashboard/components/chart/ProposalOverdueGauge'
import ProposalOverdueRatioBar from '@/features/dashboard/components/chart/ProposalOverdueRatioBar'
import { formatDateToMonth, parseMonthFromApi } from '@/utils/date-utils'
import { cn } from '@/utils'

type ProposalsOverdue = components['schemas']['ProposalsOverdue']
type ProposalsOverdueRatio = components['schemas']['ProposalsOverdueRatio']

function buildSegmentsFromProposalsOverdue(
  overdue: ProposalsOverdue | undefined | null
): ChartSegment[] {
  if (!overdue?.items?.length) return []

  const total = overdue.items.reduce((sum, item) => sum + (item.count ?? 0), 0)
  if (!total) return []

  const segments: ChartSegment[] = overdue.items
    .filter((item) => (item.count ?? 0) > 0)
    .map((item) => ({
      label: item.label,
      count: item.count,
      percentage: ((item.count ?? 0) / total) * 100,
    }))

  return segments.sort((a, b) => b.percentage - a.percentage)
}

const ProposalsOverduePieChart = () => {
  const ability = useAbility()

  const canView = useMemo(
    () => ability.can('overdue_proposals_statistics', 'hrm.dashboard.common'),
    [ability]
  )

  // Month filter — undefined defaults to the current month (backend default). Selecting a month
  // re-fetches and updates every widget below (gauge, by-type breakdown, overdue/on-time ratio).
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(undefined)

  const queryParams = useMemo<GetHrmCommonOverdueProposalsStatisticsParams>(() => {
    if (!selectedMonth) return {}
    return {
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear(),
    }
  }, [selectedMonth])

  const { data: response, isLoading } = useHrmCommonOverdueProposalsStatistics(queryParams, {
    enabled: canView,
  })

  const overdue = response?.proposals_overdue as ProposalsOverdue | undefined
  const overdueRatio = response?.proposals_overdue_ratio as ProposalsOverdueRatio | undefined

  const segments = useMemo(() => buildSegmentsFromProposalsOverdue(overdue), [overdue])

  // Period actually reported by the backend (falls back to the picked month while loading).
  const periodLabel = useMemo(() => {
    if (response?.report_month && response?.report_year) {
      const monthDate = parseMonthFromApi(`${response.report_month}/${response.report_year}`)
      if (monthDate) return `Tháng ${formatDateToMonth(monthDate)}`
    }
    if (selectedMonth) return `Tháng ${formatDateToMonth(selectedMonth)}`
    return ''
  }, [response?.report_month, response?.report_year, selectedMonth])

  if (!canView) return null

  return (
    <div
      className={cn('flex flex-col gap-4', 'border-border-1 border', 'bg-white p-5')}
      data-api={ApiPaths.hrm_dashboard_hrm_common_overdue_proposals_statistics_retrieve}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="typo-body-lg-semibold text-content-dark-1">
            Đề xuất quá hạn (4 ngày làm việc)
          </span>
          {periodLabel && <span className="typo-body-sm text-content-dark-3">{periodLabel}</span>}
        </div>
        <div className="w-full sm:w-[200px] md:w-xs">
          <MonthPicker placeholder="Chọn tháng" value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
        {/* Widget 1 — cảnh báo mức độ đề xuất quá hạn */}
        <ProposalOverdueGauge
          count={overdue?.count ?? 0}
          level={overdue?.level ?? ProposalsOverdueLevel.low}
        />

        {/* Cơ cấu đề xuất quá hạn theo loại đề xuất (biểu đồ tròn hiện có) */}
        <div className="flex flex-col gap-1">
          <span className="typo-body-sm text-content-dark-3 text-center">
            Cơ cấu đề xuất quá hạn theo loại đề xuất
          </span>
          <LoadingWrapper
            isLoading={isLoading}
            data={segments}
            noDataMessage="Không có dữ liệu để hiển thị"
          >
            <DoughnutChart segments={segments} compact />
          </LoadingWrapper>
        </div>

        {/* Widget 2 — tỷ lệ đề xuất quá hạn / đúng hạn trong tháng */}
        <ProposalOverdueRatioBar
          overdueRatio={overdueRatio?.overdue_ratio ?? 0}
          onTimeRatio={overdueRatio?.on_time_ratio ?? 0}
          overdueCount={overdueRatio?.overdue_count ?? 0}
          onTimeCount={overdueRatio?.on_time_count ?? 0}
        />
      </div>
    </div>
  )
}

export default ProposalsOverduePieChart
