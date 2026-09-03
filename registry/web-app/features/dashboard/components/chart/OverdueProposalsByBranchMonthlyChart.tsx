import { useCallback, useMemo, useRef, useState } from 'react'
import { Funnel, FunnelChart, LabelList, Tooltip } from 'recharts'
import { ApiPaths } from '@/api/schema'
import { useHrmCommonOverdueProposalsByBranchMonthly } from '@/features/dashboard/services/dashboard-service'
import { useAbility } from '@/lib/ability'
import { LoadingWrapper } from '@/components'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import { Select } from '@/components/ui'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { APP_PATH } from '@/routes'
import { cn } from '@/utils'
import { formatDateToMonth, parseMonthFromApi } from '@/utils/date-utils'
import { useBranchSelect } from '@/hooks/useBranchSelect'
import { PAGE_SIZE } from '@/constants/table'
import {
  buildOverdueProposalsFunnelBands,
  OVERDUE_PROPOSALS_FUNNEL_LABEL_COLORS,
  OVERDUE_PROPOSALS_FUNNEL_ROW_HEIGHT,
  OVERDUE_PROPOSALS_FUNNEL_STROKE,
  OverdueProposalsFunnelTooltip,
} from '@/features/dashboard/components/chart/_shares/overdue-proposals-funnel-utils.tsx'

type MonthlyFilterState = {
  month?: Date
  branchIds?: number[]
}

const OverdueProposalsByBranchMonthlyChart = () => {
  const ability = useAbility()
  const chartRef = useRef<HTMLDivElement>(null)
  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect({ pageSize: PAGE_SIZE })

  const canView = useMemo(
    () => ability.can('overdue_proposals_by_branch_monthly', 'hrm.dashboard.common'),
    [ability]
  )

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [appliedFilter, setAppliedFilter] = useState<MonthlyFilterState>({})
  const [pendingFilter, setPendingFilter] = useState<MonthlyFilterState>({})

  const queryParams = useMemo(() => {
    const params: { month?: number; year?: number; branch_ids?: string } = {}
    if (appliedFilter.month) {
      params.month = appliedFilter.month.getMonth() + 1
      params.year = appliedFilter.month.getFullYear()
    }
    if (appliedFilter.branchIds?.length) {
      // BE expects branch_ids as a comma-separated list (e.g. '1,2,3')
      params.branch_ids = appliedFilter.branchIds.join(',')
    }
    return params
  }, [appliedFilter.branchIds, appliedFilter.month])

  const { data: response, isLoading } = useHrmCommonOverdueProposalsByBranchMonthly(queryParams)

  const bands = useMemo(
    () => buildOverdueProposalsFunnelBands(response?.data ?? []),
    [response?.data]
  )

  const periodLabel = useMemo(() => {
    if (response?.report_month && response?.report_year) {
      const monthDate = parseMonthFromApi(`${response.report_month}/${response.report_year}`)
      if (monthDate) return `Tháng ${formatDateToMonth(monthDate)}`
    }
    if (appliedFilter.month) {
      return `Tháng ${formatDateToMonth(appliedFilter.month)}`
    }
    return ''
  }, [appliedFilter.month, response?.report_month, response?.report_year])

  const chartHeight = useMemo(
    () => Math.max(240, bands.length * OVERDUE_PROPOSALS_FUNNEL_ROW_HEIGHT + 24),
    [bands.length]
  )

  const filterCount = useMemo(() => {
    let count = 0
    if (appliedFilter.month) count++
    if (appliedFilter.branchIds?.length) count++
    return count
  }, [appliedFilter.branchIds, appliedFilter.month])

  const handleOpenFilter = useCallback(() => {
    setPendingFilter(appliedFilter)
    setIsFilterOpen(true)
  }, [appliedFilter])

  const handleApplyFilter = useCallback(() => {
    setAppliedFilter(pendingFilter)
    setIsFilterOpen(false)
  }, [pendingFilter])

  const handleClearFilter = useCallback(() => {
    setAppliedFilter({})
    setPendingFilter({})
    setIsFilterOpen(false)
  }, [])

  const handleCancelFilter = useCallback(() => setIsFilterOpen(false), [])

  const handleDownloadChart = useCallback(async () => {
    if (!chartRef.current) return
    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-de-xuat-qua-han-trong-thang-theo-chi-nhanh.pdf',
      overlayMessage: 'Đang tạo biểu đồ Đề xuất quá hạn trong tháng theo chi nhánh...',
    })
  }, [])

  if (!canView) return null

  return (
    <div
      ref={chartRef}
      className={cn('flex flex-col gap-5', 'border-border-1 border', 'bg-white p-5')}
      data-api={ApiPaths.hrm_dashboard_hrm_common_overdue_proposals_by_branch_monthly_retrieve}
    >
      <DashboardChartTitle
        title="Tỷ lệ đề xuất quá hạn trong tháng theo chi nhánh"
        subTitle={`Đề xuất quá hạn (chờ + xử lý trễ) trên tổng đề xuất tạo trong tháng${
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
          <div className="flex flex-col gap-4 py-2">
            <MonthPicker
              label="Tháng"
              placeholder="Chọn tháng"
              value={pendingFilter.month}
              onChange={(month) =>
                setPendingFilter((prev) => ({ ...prev, month: month ?? undefined }))
              }
            />
            <Select
              label="Chi nhánh"
              placeholder="Tất cả chi nhánh"
              multiple
              triggerVariant="chips"
              loadOptions={loadBranchOptions}
              loadInitialOptions={loadInitialBranchOptions}
              pageSize={PAGE_SIZE}
              searchPlaceholder="Tìm kiếm chi nhánh..."
              enableSearch
              clearable
              value={pendingFilter.branchIds ?? []}
              onChange={(value) =>
                setPendingFilter((prev) => ({
                  ...prev,
                  branchIds: Array.isArray(value)
                    ? value.map(Number)
                    : value !== null && value !== undefined
                      ? [Number(value)]
                      : undefined,
                }))
              }
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

export default OverdueProposalsByBranchMonthlyChart
