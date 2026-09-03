import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Table as RadixTable } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { IconDownloadsimple } from '@/assets/icons'
import { LoadingWrapper } from '@/components'
import { useAbility } from '@/lib/ability'
import {
  getAdminDashboardService,
  useAdminDashboardRevenueTrend,
  type GetAdminDashboardRevenueTrendParams,
} from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import SalesOverviewFilterForm, {
  type SalesOverviewFilterFormRef,
  type SalesOverviewFilterFormValues,
} from '@/features/sales/admin-dashboard/components/SalesOverviewFilterForm'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { formatSummaryCurrency, sumRowsByKeys } from '@/utils/table/summary'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import {
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
} from '@/features/dashboard/components/sales/sales-admin-dashboard-constants'
import { DashboardPerformanceGroup as TrendGroup } from '@/constants/api-schema-aliases'

const GROUP_OPTIONS = [
  { value: TrendGroup.week, label: 'Theo tuần' },
  { value: TrendGroup.month, label: 'Theo tháng' },
  { value: TrendGroup.year, label: 'Theo năm' },
]

// `revenue-trend/` không phân trang — `points` luôn là trọn tập đã lọc, nên được phép cộng
// tổng ở FE (xem srs/docs/features/sales/18.7-admin-dashboard/fsd.md §4.3). Cả 5 cột đều
// tính per-bucket không chồng lấn (mỗi deal thuộc đúng 1 bucket), không có cột luỹ kế nào
// cần loại trừ.
const TOTAL_ROW_KEYS = [
  'deal_count',
  'revenue_amount',
  'goods_amount',
  'reconciliation',
  'remaining',
] as const

const COLUMN_LEGENDS: { term: string; description: string }[] = [
  { term: 'Số lượng', description: 'Số lượng cọc' },
  { term: 'Doanh thu', description: 'Doanh thu sale để tính lương, KPI' },
  { term: 'Tiền hàng', description: 'Là Tổng giá niêm yết (bao gồm VAT) của tất cả các căn' },
  {
    term: 'Đối chiếu',
    description: 'Là Thành tiền đối chiếu CĐT phải trả MV, dù thực tế đã đối chiếu hay chưa',
  },
  { term: 'Còn lại', description: 'Là "Đối chiếu" trừ đi "số tiền hoa hồng sale"' },
]

export default function ReportSalesOverviewPage() {
  const ability = useAbility()
  const canExport = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.EXPORT_REVENUE_TREND,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )

  const [searchParams, setSearchParams] = useSearchParams()
  const [isExporting, setIsExporting] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const formRef = useRef<SalesOverviewFilterFormRef>(null)

  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const transactionSheetDateFromStr = searchParams.get('transaction_sheet_date_from')
  const transactionSheetDateToStr = searchParams.get('transaction_sheet_date_to')

  const groupParam = searchParams.get('group') as TrendGroup | null
  const group = groupParam || TrendGroup.month

  // Carried in the URL as the CSV the API itself takes, so a shared link reproduces the
  // report exactly and no separate encoding can drift from the request.
  const dealStatusStr = searchParams.get('deal_status')
  const dealStatus = useMemo(
    () => (dealStatusStr ? dealStatusStr.split(',').filter(Boolean) : []),
    [dealStatusStr]
  )

  const filterFormValues = useMemo<SalesOverviewFilterFormValues>(
    () => ({
      dateFrom: parseDateFromApi(fromStr),
      dateTo: parseDateFromApi(toStr),
      dealStatus,
      transactionSheetDateFrom: parseDateFromApi(transactionSheetDateFromStr),
      transactionSheetDateTo: parseDateFromApi(transactionSheetDateToStr),
    }),
    [fromStr, toStr, dealStatus, transactionSheetDateFromStr, transactionSheetDateToStr]
  )

  // The date range counts as a single active filter, the status selection as another, and
  // the transaction-sheet date range (independent, AND-able with the deposit date) a third.
  // An empty selection is the report's own default scope, not a filter the user set.
  const activeFilterCount = useMemo(
    () =>
      (fromStr || toStr ? 1 : 0) +
      (dealStatus.length > 0 ? 1 : 0) +
      (transactionSheetDateFromStr || transactionSheetDateToStr ? 1 : 0),
    [fromStr, toStr, dealStatus, transactionSheetDateFromStr, transactionSheetDateToStr]
  )

  const params = useMemo(() => {
    // Typed off the generated schema rather than a hand-written shape, so a backend rename
    // of `deal_status` fails type-check here instead of silently sending a dead param.
    const next: NonNullable<GetAdminDashboardRevenueTrendParams> = { group }
    if (fromStr) next.from = fromStr
    if (toStr) next.to = toStr
    if (dealStatus.length > 0) next.deal_status = dealStatus.join(',')
    if (transactionSheetDateFromStr) next.transaction_sheet_date_from = transactionSheetDateFromStr
    if (transactionSheetDateToStr) next.transaction_sheet_date_to = transactionSheetDateToStr
    return next
  }, [fromStr, toStr, group, dealStatus, transactionSheetDateFromStr, transactionSheetDateToStr])

  const { data, isLoading, error } = useAdminDashboardRevenueTrend(params)
  const points = data?.points ?? []
  const totals = useMemo(() => sumRowsByKeys(points, TOTAL_ROW_KEYS), [points])

  const handleGroupChange = useCallback(
    (next: string | number | (string | number)[] | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (typeof next === 'string') {
        newParams.set('group', next)
      } else {
        newParams.delete('group')
      }
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((key) => key + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    if (formData.dateFrom) newParams.set('from', formatDateToApi(formData.dateFrom) ?? '')
    else newParams.delete('from')
    if (formData.dateTo) newParams.set('to', formatDateToApi(formData.dateTo) ?? '')
    else newParams.delete('to')
    if (formData.dealStatus?.length) newParams.set('deal_status', formData.dealStatus.join(','))
    else newParams.delete('deal_status')
    if (formData.transactionSheetDateFrom)
      newParams.set(
        'transaction_sheet_date_from',
        formatDateToApi(formData.transactionSheetDateFrom) ?? ''
      )
    else newParams.delete('transaction_sheet_date_from')
    if (formData.transactionSheetDateTo)
      newParams.set(
        'transaction_sheet_date_to',
        formatDateToApi(formData.transactionSheetDateTo) ?? ''
      )
    else newParams.delete('transaction_sheet_date_to')

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  // File dựng ở backend (StyledExportXLSXMixin — title banner, khối "điều kiện lọc",
  // dòng Tổng cộng, cột tiền định dạng đúng chuẩn module 20) từ CÙNG query params
  // đang tải dữ liệu màn hình này, nên không thể lệch với những gì đang hiển thị.
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const filename = `Bao_cao_tong_quan_doanh_thu_theo_${
        group === TrendGroup.month ? 'thang' : group === TrendGroup.week ? 'tuan' : 'nam'
      }.xlsx`
      await getAdminDashboardService().exportRevenueTrend(params, filename)
      toastService.success('Xuất Excel thành công.')
    } catch {
      toastService.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [params, group])

  const labelHeader = useMemo(() => {
    if (group === TrendGroup.week) return 'Tuần cọc'
    if (group === TrendGroup.year) return 'Năm cọc'
    return 'Tháng cọc'
  }, [group])

  return (
    <div className="bg-neutral-2 flex h-full flex-col">
      <PageTitle
        title="Tổng quan doanh thu theo tháng"
        toolbarLeftContent={
          <Select
            options={GROUP_OPTIONS}
            value={group}
            onChange={handleGroupChange}
            // Không clearable: kỳ nhóm là trục bắt buộc của báo cáo, xoá đi chỉ rơi về
            // mặc định `month` nên nút xoá vô nghĩa (và ăn mất chỗ hiển thị nhãn).
            clearable={false}
            wrapperClassName="w-[170px]"
          />
        }
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        customActions={
          canExport ? (
            <Button
              variant="secondary-border"
              size="small"
              onClick={handleExport}
              disabled={isExporting}
            >
              <span className="flex items-center gap-2">
                <IconDownloadsimple size={16} />
                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
              </span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {error ? (
          <div className="border-border-1 bg-content-light-1 flex flex-1 items-center justify-center rounded-md border p-6 text-red-500">
            Có lỗi xảy ra khi tải dữ liệu: {(error as any)?.message || 'Unknown error'}
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <LoadingWrapper isLoading={isLoading} containerHeight={300}>
              <RadixTable.Root size="2" variant="surface">
                <RadixTable.Header>
                  <RadixTable.Row>
                    <RadixTable.ColumnHeaderCell>{labelHeader}</RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="center">
                      Số lượng cọc
                    </RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">
                      Doanh thu sale (VND)
                    </RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">
                      Tiền hàng (VND)
                    </RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">
                      Đối chiếu (VND)
                    </RadixTable.ColumnHeaderCell>
                    <RadixTable.ColumnHeaderCell align="right">
                      Còn lại (VND)
                    </RadixTable.ColumnHeaderCell>
                  </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                  {points.length === 0 ? (
                    <RadixTable.Row>
                      <RadixTable.Cell colSpan={6}>
                        <p className="text-content-dark-3 py-6 text-center text-sm">
                          Không có dữ liệu
                        </p>
                      </RadixTable.Cell>
                    </RadixTable.Row>
                  ) : (
                    <>
                      {points.map((point, index) => (
                        <RadixTable.Row key={index}>
                          <RadixTable.Cell className="font-medium">{point.label}</RadixTable.Cell>
                          <RadixTable.Cell align="center">
                            {formatNumber(point.deal_count)}
                          </RadixTable.Cell>
                          <RadixTable.Cell align="right">
                            {formatCurrencyVND(Number(point.revenue_amount) || 0)}
                          </RadixTable.Cell>
                          <RadixTable.Cell align="right">
                            {formatCurrencyVND(Number(point.goods_amount) || 0)}
                          </RadixTable.Cell>
                          <RadixTable.Cell align="right">
                            {formatCurrencyVND(Number(point.reconciliation) || 0)}
                          </RadixTable.Cell>
                          <RadixTable.Cell align="right">
                            {formatCurrencyVND(Number(point.remaining) || 0)}
                          </RadixTable.Cell>
                        </RadixTable.Row>
                      ))}
                      <RadixTable.Row className="bg-neutral-10 border-neutral-60 border-t border-double font-bold">
                        <RadixTable.Cell>Tổng cộng</RadixTable.Cell>
                        <RadixTable.Cell align="center">
                          {totals.deal_count === null ? '—' : formatNumber(totals.deal_count)}
                        </RadixTable.Cell>
                        <RadixTable.Cell align="right">
                          {formatSummaryCurrency(totals.revenue_amount)}
                        </RadixTable.Cell>
                        <RadixTable.Cell align="right">
                          {formatSummaryCurrency(totals.goods_amount)}
                        </RadixTable.Cell>
                        <RadixTable.Cell align="right">
                          {formatSummaryCurrency(totals.reconciliation)}
                        </RadixTable.Cell>
                        <RadixTable.Cell align="right">
                          {formatSummaryCurrency(totals.remaining)}
                        </RadixTable.Cell>
                      </RadixTable.Row>
                    </>
                  )}
                </RadixTable.Body>
              </RadixTable.Root>

              {/* Column legends */}
              <div className="mt-4">
                <RadixTable.Root size="1" variant="surface" className="max-w-3xl">
                  <RadixTable.Header>
                    <RadixTable.Row>
                      <RadixTable.ColumnHeaderCell colSpan={2}>
                        Diễn giải
                      </RadixTable.ColumnHeaderCell>
                    </RadixTable.Row>
                  </RadixTable.Header>
                  <RadixTable.Body>
                    {COLUMN_LEGENDS.map((legend) => (
                      <RadixTable.Row key={legend.term}>
                        <RadixTable.Cell className="w-[140px] font-medium whitespace-nowrap">
                          {legend.term}
                        </RadixTable.Cell>
                        <RadixTable.Cell>{legend.description}</RadixTable.Cell>
                      </RadixTable.Row>
                    ))}
                  </RadixTable.Body>
                </RadixTable.Root>
              </div>
            </LoadingWrapper>
          </div>
        )}
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <SalesOverviewFilterForm
            key={String(filterDialogOpenKey)}
            ref={formRef}
            initialValues={filterFormValues}
          />
        }
        onClearFilter={() => formRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
