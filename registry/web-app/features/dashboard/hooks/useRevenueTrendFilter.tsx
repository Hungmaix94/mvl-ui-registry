import { useCallback, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import FilterFooter from '@/components/commons/FilterFooter'
import { formatDateRangeText, formatDateToApi } from '@/utils/date-utils.ts'
import RevenueTrendFilterForm, {
  DEFAULT_REVENUE_TREND_FILTER_VALUES,
  type RevenueTrendFilterFormRef,
  type RevenueTrendFilterFormValues,
} from '@/features/dashboard/components/sales/RevenueTrendFilterForm.tsx'
import { TIME_GROUP_OPTIONS } from '@/features/dashboard/components/sales/sales-admin-dashboard-constants.ts'
import { type DashboardPerformanceGroup as TimeGroup } from '@/constants/api-schema-aliases'

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? ''

/**
 * Bộ lọc dạng nút phễu + dialog cho khối "Xu hướng doanh thu", cùng pattern với
 * `usePerformanceByOrgFilter` và `useTransactionsByProjectFilter`.
 *
 * Trước 2026-08-26 khối này bày ba ô lọc thẳng trên thanh tiêu đề. Hai khối còn lại trên
 * cùng trang đã dùng nút phễu, nên một trang có hai cách lọc khác nhau: người dùng học được
 * nút phễu ở khối dưới rồi lên khối trên đi tìm nút không có. Thanh tiêu đề cũng bị ba ô đẩy
 * cho tràn dòng ở màn hẹp.
 */
export function useRevenueTrendFilter() {
  const refForm = useRef<RevenueTrendFilterFormRef>(null)
  const { displayFormContent, displayClose } = useDialog()

  const [filterParams, setFilterParams] = useState<RevenueTrendFilterFormValues>(
    DEFAULT_REVENUE_TREND_FILTER_VALUES
  )

  const apiParams = useMemo(() => {
    const params: {
      group: TimeGroup
      from?: string
      to?: string
      transaction_sheet_date_from?: string
      transaction_sheet_date_to?: string
    } = { group: filterParams.timeGroup }

    if (filterParams.dateRange?.from) {
      params.from = formatDateToApi(filterParams.dateRange.from) ?? undefined
    }
    if (filterParams.dateRange?.to) {
      params.to = formatDateToApi(filterParams.dateRange.to) ?? undefined
    }
    // Ngày làm phiếu TTGD — ĐỘC LẬP với `dateRange`, cộng thêm (AND), không ghi đè.
    if (filterParams.transactionSheetDateRange?.from) {
      params.transaction_sheet_date_from =
        formatDateToApi(filterParams.transactionSheetDateRange.from) ?? undefined
    }
    if (filterParams.transactionSheetDateRange?.to) {
      params.transaction_sheet_date_to =
        formatDateToApi(filterParams.transactionSheetDateRange.to) ?? undefined
    }
    return params
  }, [filterParams])

  /**
   * Ba ô lọc rời khỏi thanh tiêu đề vào trong dialog, nên phụ đề là chỗ DUY NHẤT còn nói được
   * biểu đồ đang vẽ cái gì. Luôn mở đầu bằng phạm vi thời gian, kể cả khi không lọc — "Tất cả
   * thời gian" là một câu trả lời, còn phụ đề chỉ có mỗi "Theo tháng" thì để ngỏ câu hỏi
   * chính: theo tháng của khoảng nào.
   */
  const subTitle = useMemo(() => {
    const parts: string[] = []

    const range = formatDateRangeText(
      filterParams.dateRange?.from,
      filterParams.dateRange?.to ?? undefined
    )
    parts.push(range || 'Tất cả thời gian')

    const transactionSheetRange = formatDateRangeText(
      filterParams.transactionSheetDateRange?.from,
      filterParams.transactionSheetDateRange?.to ?? undefined
    )
    if (transactionSheetRange) parts.push(`Ngày làm phiếu TTGD ${transactionSheetRange}`)

    parts.push(labelOf(TIME_GROUP_OPTIONS, filterParams.timeGroup))
    return parts.filter(Boolean).join(' · ')
  }, [filterParams])

  /**
   * KHÔNG đếm "Nhóm theo thời gian": nó chỉ đổi CÁCH GỘP, không bỏ bớt một dòng dữ liệu nào —
   * đếm nó thì badge không bao giờ nhỏ hơn 1 và mất hết ý nghĩa. Cùng phạm vi đếm với
   * `usePerformanceByOrgFilter` (user chốt 2026-08-24).
   */
  const filterCount = useMemo(() => {
    let count = 0
    if (filterParams.dateRange?.from || filterParams.dateRange?.to) count++
    if (filterParams.transactionSheetDateRange?.from || filterParams.transactionSheetDateRange?.to)
      count++
    return count
  }, [filterParams])

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setFilterParams(DEFAULT_REVENUE_TREND_FILTER_VALUES)
    displayClose()
  }, [displayClose])

  const onClickApply = useCallback(() => {
    const values = refForm.current?.getValues()
    if (values) {
      setFilterParams({ ...DEFAULT_REVENUE_TREND_FILTER_VALUES, ...values })
    }
    displayClose()
  }, [displayClose])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: <RevenueTrendFilterForm ref={refForm} initialValues={filterParams} />,
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [displayFormContent, filterParams, onClickApply, onClickClearFilter, displayClose])

  return { openFilterModal, filterParams, apiParams, subTitle, filterCount }
}
