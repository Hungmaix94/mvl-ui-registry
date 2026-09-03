import { useCallback, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import FilterFooter from '@/components/commons/FilterFooter'
import { formatDateRangeText, formatDateToApi } from '@/utils/date-utils.ts'
import TransactionsByProjectFilterForm, {
  DEFAULT_TRANSACTIONS_FILTER_VALUES,
  type TransactionsByProjectFilterFormRef,
  type TransactionsByProjectFilterFormValues,
} from '@/features/dashboard/components/sales/TransactionsByProjectFilterForm.tsx'

/**
 * Quá ngần này dự án thì phụ đề đếm số thay vì liệt kê tên. Nhãn dự án đã gồm cả mã
 * (`DA000000118 - Alacarte Hạ Long`) nên hai cái là vừa hết một dòng; ba cái thì phụ đề dài
 * hơn cả tiêu đề.
 */
const MAX_PROJECT_NAMES_IN_SUBTITLE = 2

/**
 * Bộ lọc dạng nút phễu + dialog cho khối "Giao dịch theo dự án", cùng pattern với
 * `usePerformanceByOrgFilter` và các khối chart khác trên dashboard.
 */
export function useTransactionsByProjectFilter({
  onFilterChange,
}: {
  /** Gọi mỗi lần bộ lọc đổi. */
  onFilterChange?: () => void
} = {}) {
  const refForm = useRef<TransactionsByProjectFilterFormRef>(null)
  const { displayFormContent, displayClose } = useDialog()

  const [filterParams, setFilterParams] = useState<TransactionsByProjectFilterFormValues>(
    DEFAULT_TRANSACTIONS_FILTER_VALUES
  )

  const selectedProjectIds = useMemo(() => filterParams.projects ?? [], [filterParams.projects])

  /**
   * Tham số gửi lên API — dùng cho cả tải dữ liệu lẫn Xuất Excel, nên file Excel luôn khớp
   * đúng những gì đang hiện trên màn hình.
   *
   * `project__in` nhận nhiều id (BE mở ở PR #3365, áp cho cả endpoint bảng lẫn endpoint
   * export). Trước đó endpoint chỉ nhận `project` một id nên FE phải tải hết rồi lọc tại
   * chỗ, và file Excel thì không lọc được — **đừng quay lại cách ấy**.
   */
  const apiParams = useMemo(() => {
    const params: {
      project__in?: number[]
      from?: string
      to?: string
      transaction_sheet_date_from?: string
      transaction_sheet_date_to?: string
    } = {}
    if (selectedProjectIds.length > 0) params.project__in = selectedProjectIds
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
  }, [filterParams.dateRange, filterParams.transactionSheetDateRange, selectedProjectIds])

  const subTitle = useMemo(() => {
    const names = (filterParams.projectNames ?? []).filter(Boolean)
    const projectLabel =
      selectedProjectIds.length === 0
        ? 'Tất cả dự án'
        : names.length > 0 && names.length <= MAX_PROJECT_NAMES_IN_SUBTITLE
          ? names.join(', ')
          : `${selectedProjectIds.length} dự án`

    const parts = [projectLabel]
    const range = formatDateRangeText(
      filterParams.dateRange?.from,
      filterParams.dateRange?.to ?? undefined
    )
    if (range) parts.push(range)
    const transactionSheetRange = formatDateRangeText(
      filterParams.transactionSheetDateRange?.from,
      filterParams.transactionSheetDateRange?.to ?? undefined
    )
    if (transactionSheetRange) parts.push(`Ngày làm phiếu TTGD ${transactionSheetRange}`)
    return parts.filter(Boolean).join(' · ')
  }, [
    filterParams.dateRange,
    filterParams.transactionSheetDateRange,
    filterParams.projectNames,
    selectedProjectIds,
  ])

  const filterCount = useMemo(() => {
    let count = 0
    if (selectedProjectIds.length > 0) count++
    if (filterParams.dateRange?.from || filterParams.dateRange?.to) count++
    if (filterParams.transactionSheetDateRange?.from || filterParams.transactionSheetDateRange?.to)
      count++
    return count
  }, [filterParams.dateRange, filterParams.transactionSheetDateRange, selectedProjectIds])

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setFilterParams(DEFAULT_TRANSACTIONS_FILTER_VALUES)
    onFilterChange?.()
    displayClose()
  }, [displayClose, onFilterChange])

  const onClickApply = useCallback(() => {
    const values = refForm.current?.getValues()
    if (values) {
      setFilterParams({ ...DEFAULT_TRANSACTIONS_FILTER_VALUES, ...values })
    }
    onFilterChange?.()
    displayClose()
  }, [displayClose, onFilterChange])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: <TransactionsByProjectFilterForm ref={refForm} initialValues={filterParams} />,
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [displayFormContent, filterParams, onClickApply, onClickClearFilter, displayClose])

  return { openFilterModal, filterParams, apiParams, subTitle, filterCount }
}
