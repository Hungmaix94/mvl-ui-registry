import { useCallback, useMemo, useRef, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { Funnel, FunnelChart, LabelList, Tooltip } from 'recharts'
import { ApiPaths } from '@/api/schema'
import { useHrmCommonOverdueProposalsByBranch } from '@/features/dashboard/services/dashboard-service'
import { useAbility } from '@/lib/ability'
import { LoadingWrapper } from '@/components'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { APP_PATH } from '@/routes'
import { cn } from '@/utils'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import {
  buildOverdueProposalsFunnelBands,
  OVERDUE_PROPOSALS_FUNNEL_LABEL_COLORS,
  OVERDUE_PROPOSALS_FUNNEL_ROW_HEIGHT,
  OVERDUE_PROPOSALS_FUNNEL_STROKE,
  OverdueProposalsFunnelTooltip,
} from '@/features/dashboard/components/chart/_shares/overdue-proposals-funnel-utils.tsx'

const OverdueProposalsByBranchChart = () => {
  const ability = useAbility()
  const chartRef = useRef<HTMLDivElement>(null)
  const canView = useMemo(
    () => ability.can('overdue_proposals_by_branch', 'hrm.dashboard.common'),
    [ability]
  )

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  // Applied range drives the query; pending range is edited inside the dialog
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(undefined)
  const [filterRange, setFilterRange] = useState<DateRange | undefined>(undefined)

  const queryParams = useMemo(() => {
    const params: { from_date?: string; to_date?: string } = {}
    if (appliedRange?.from) params.from_date = formatDateToApi(appliedRange.from)
    if (appliedRange?.to) params.to_date = formatDateToApi(appliedRange.to)
    return params
  }, [appliedRange?.from, appliedRange?.to])

  const { data: response, isLoading } = useHrmCommonOverdueProposalsByBranch(queryParams)

  const bands = useMemo(
    () => buildOverdueProposalsFunnelBands(response?.data ?? []),
    [response?.data]
  )

  const periodLabel = useMemo(() => {
    if (!response?.report_from_date || !response?.report_to_date) return ''
    return `${formatDate(response.report_from_date)} - ${formatDate(response.report_to_date)}`
  }, [response?.report_from_date, response?.report_to_date])

  const chartHeight = useMemo(
    () => Math.max(240, bands.length * OVERDUE_PROPOSALS_FUNNEL_ROW_HEIGHT + 24),
    [bands.length]
  )

  const filterCount = appliedRange?.from || appliedRange?.to ? 1 : 0

  const handleOpenFilter = useCallback(() => {
    setFilterRange(appliedRange)
    setIsFilterOpen(true)
  }, [appliedRange])

  const handleApplyFilter = useCallback(() => {
    setAppliedRange(filterRange)
    setIsFilterOpen(false)
  }, [filterRange])

  const handleClearFilter = useCallback(() => {
    setAppliedRange(undefined)
    setFilterRange(undefined)
    setIsFilterOpen(false)
  }, [])

  const handleCancelFilter = useCallback(() => setIsFilterOpen(false), [])

  const handleDownloadChart = useCallback(async () => {
    if (!chartRef.current) return
    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-de-xuat-qua-han-theo-chi-nhanh.pdf',
      overlayMessage: 'Đang tạo biểu đồ Đề xuất quá hạn theo chi nhánh...',
    })
  }, [])

  if (!canView) return null

  return (
    <div
      ref={chartRef}
      className={cn('flex flex-col gap-5', 'border-border-1 border', 'bg-white p-5')}
      data-api={ApiPaths.hrm_dashboard_hrm_common_overdue_proposals_by_branch_retrieve}
    >
      <DashboardChartTitle
        title="Phiếu đề xuất quá hạn hiện tại theo chi nhánh"
        subTitle={`Phiếu đang chờ quá 4 ngày làm việc trên tổng đề xuất tạo trong kỳ${
          periodLabel ? ` · ${periodLabel}` : ''
        }`}
        reportLink={APP_PATH.PROPOSAL_MANAGEMENT}
        handleDownloadChart={handleDownloadChart}
        handleFilter={handleOpenFilter}
        filterCount={filterCount}
      />

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <div className="py-2">
            <DateRangePicker
              label="Khoảng thời gian"
              value={filterRange}
              onChange={(range) => setFilterRange(range ?? undefined)}
              showQuickSelect
            />
          </div>
        }
        onConfirm={handleApplyFilter}
        onCancel={handleCancelFilter}
        onClearFilter={handleClearFilter}
        confirmText="Áp dụng"
        cancelText="Hủy"
      />

      <LoadingWrapper
        isLoading={isLoading}
        data={bands}
        noDataMessage="Không có dữ liệu để hiển thị"
        containerHeight={360}
        hasActiveFilters={filterCount > 0}
      >
        <div className="mx-auto w-full max-w-[760px]">
          <FunnelChart
            responsive
            style={{ width: '100%', height: chartHeight }}
            margin={{ top: 12, right: 84, bottom: 12, left: 112 }}
          >
            <Tooltip content={<OverdueProposalsFunnelTooltip />} />
            <Funnel
              dataKey="value"
              nameKey="branch_name"
              data={bands}
              lastShapeType="rectangle"
              isAnimationActive
              stroke={OVERDUE_PROPOSALS_FUNNEL_STROKE}
              strokeWidth={2}
            >
              <LabelList
                position="left"
                dataKey="branch_name"
                fill={OVERDUE_PROPOSALS_FUNNEL_LABEL_COLORS.name}
                stroke="none"
                fontSize={12}
                fontWeight={600}
              />
              <LabelList
                position="right"
                dataKey="ratioLabel"
                fill={OVERDUE_PROPOSALS_FUNNEL_LABEL_COLORS.ratio}
                stroke="none"
                fontSize={13}
                fontWeight={700}
              />
            </Funnel>
          </FunnelChart>
        </div>
      </LoadingWrapper>
    </div>
  )
}

export default OverdueProposalsByBranchChart
