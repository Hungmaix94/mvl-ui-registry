import { useCallback, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import StackedBarChart, {
  StackedBarDataItem,
  StackedBarSegment,
} from '@/components/ui/chart/StackedBarChart.tsx'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useAttendanceByBranchRateReport } from '@/features/report/services/attendance-report-service'
import { LoadingWrapper } from '@/components'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { getDefaultDateString } from '@/features/attendance/attendance-log/hooks/useAttendanceLogFilter'
import { DATE_FORMAT } from '@/constants/date-format'
import { cn } from '@/utils'
import { ApiPaths } from '@/api/schema'
import { APP_PATH } from '@/routes'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { formatDateToApi } from '@/utils/date-utils'

type AttendanceRateByBranchChartProps = { compact?: boolean }

const COLORS = {
  checkedIn: '#D32F2F',
  notCheckedIn: '#EF9A9A',
  lineRate: 'var(--color-content-dark-3)',
}

const SEGMENTS: StackedBarSegment[] = [
  {
    dataKey: 'checkedIn',
    name: 'Đã chấm công',
    color: COLORS.checkedIn,
  },
  {
    dataKey: 'notCheckedIn',
    name: 'Chưa chấm công',
    color: COLORS.notCheckedIn,
    showLabel: false,
  },
]

function AttendanceRateByBranchChart({ compact }: AttendanceRateByBranchChartProps = {}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState<string>(() => getDefaultDateString())
  const [filterFormDate, setFilterFormDate] = useState<string>('')

  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_reports.by_branch_rate'
  )

  const isDefaultDate = attendanceDate === getDefaultDateString()

  const { data: apiData, isLoading } = useAttendanceByBranchRateReport(
    { attendance_date: attendanceDate },
    { enableAutoRefresh: isDefaultDate }
  )

  const subTitle = useMemo(() => {
    try {
      return format(parseISO(attendanceDate), DATE_FORMAT)
    } catch {
      return attendanceDate
    }
  }, [attendanceDate])

  const chartData = useMemo((): StackedBarDataItem[] => {
    const branches = apiData?.branches ?? []
    return branches.map((branch) => {
      const total = branch.total_employees ?? 0
      const checkedIn = branch.checked_in_employees ?? 0
      const notCheckedIn = Math.max(0, total - checkedIn)
      return {
        label: branch.name || branch.code || '-',
        checkedIn,
        notCheckedIn,
        totalEmployees: total,
        percentage: parseFloat(branch.attendance_rate ?? '0') || 0,
      }
    })
  }, [apiData?.branches])

  const getTotalEmployees = useCallback((item: StackedBarDataItem) => {
    return (item.totalEmployees as number) || 0
  }, [])

  const renderCustomTooltip = useCallback((active: boolean, payload: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="border-border-1 rounded-lg border bg-white p-3 shadow-lg">
          <p className="typo-body-sm-semibold text-content-dark-1 mb-2">{data.label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.checkedIn }} />
              <span className="typo-body-sm-regular text-content-dark-2">
                Đã chấm công: {data.checkedIn}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: COLORS.notCheckedIn }}
              />
              <span className="typo-body-sm-regular text-content-dark-2">
                Chưa chấm công: {data.notCheckedIn}
              </span>
            </div>
            <div className="border-border-1 mt-2 border-t pt-2">
              <span className="typo-body-sm-semibold text-content-dark-1">
                Tỷ lệ: {data.percentage}%
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }, [])

  const renderCustomLegend = useCallback(() => {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
        {SEGMENTS.map((segment) => (
          <div key={segment.dataKey} className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: segment.color }} />
            <span className="typo-body-sm-regular text-content-dark-2">{segment.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: COLORS.lineRate }} />
          <span className="typo-body-sm-regular text-content-dark-2">Tỷ lệ %</span>
        </div>
      </div>
    )
  }, [])

  const handleDownloadChart = useCallback(async () => {
    if (!chartRef.current) return

    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-ty-le-cham-cong-theo-chi-nhanh.pdf',
      overlayMessage: 'Đang tạo biểu đồ Tỷ lệ chấm công theo chi nhánh...',
    })
  }, [])

  const handleOpenFilter = useCallback(() => {
    setFilterFormDate(attendanceDate ? format(parseISO(attendanceDate), DATE_FORMAT) : '')
    setIsFilterOpen(true)
  }, [attendanceDate])

  const handleApplyFilter = useCallback(() => {
    const apiDate = filterFormDate ? formatDateToApi(filterFormDate) : ''
    if (apiDate) {
      setAttendanceDate(apiDate)
    }
    setIsFilterOpen(false)
  }, [filterFormDate])

  const handleClearFilter = useCallback(() => {
    setAttendanceDate(getDefaultDateString())
    setIsFilterOpen(false)
  }, [])

  const handleCancelFilter = useCallback(() => {
    setIsFilterOpen(false)
  }, [])

  const filterCount = isDefaultDate ? 0 : 1

  if (!canViewChart) {
    return null
  }

  return (
    <div
      ref={chartRef}
      className={cn(
        'flex flex-col gap-8',
        compact ? 'p-4' : 'p-5',
        'border-border-1 border',
        'bg-white'
      )}
      data-api={ApiPaths.hrm_attendance_reports_by_branch_rate_retrieve}
    >
      <DashboardChartTitle
        title="Tỷ lệ chấm công theo chi nhánh"
        subTitle={subTitle}
        reportLink={APP_PATH.REPORT_ATTENDANCE_METHOD}
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
            <DatePicker
              label="Ngày"
              value={filterFormDate || undefined}
              onChange={(value) => setFilterFormDate(value ?? '')}
              placeholder="Chọn ngày"
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
        data={chartData}
        noDataMessage="Không có dữ liệu để hiển thị"
        hasActiveFilters={filterCount > 0}
      >
        <StackedBarChart
          data={chartData}
          segments={SEGMENTS}
          yAxisLabel="Nhân sự"
          height={compact ? 320 : 500}
          showPercentage={false}
          showTotalOnTop={true}
          getTotalValue={getTotalEmployees}
          renderCustomTooltip={renderCustomTooltip}
          renderCustomLegend={renderCustomLegend}
          barCategoryGap={12}
          barSize={73}
          rightYAxis={{ label: '', dataKey: 'percentage' }}
          lineSeries={{
            dataKey: 'percentage',
            name: 'Tỷ lệ %',
            color: COLORS.lineRate,
            showDataLabel: true,
            formatDataLabel: (value) => `${value}%`,
          }}
        />
      </LoadingWrapper>
    </div>
  )
}

export default AttendanceRateByBranchChart
