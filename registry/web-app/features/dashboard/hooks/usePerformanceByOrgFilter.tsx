import { useCallback, useMemo, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import FilterFooter from '@/components/commons/FilterFooter'
import {
  formatDateRangeText,
  formatDateToApi,
  formatPeriodLabel,
  getPeriodLabelRangeApi,
} from '@/utils/date-utils.ts'
import PerformanceByOrgFilterForm, {
  getDefaultPerformanceFilterValues,
  ORG_ACTIVITY_SUBTITLE_LABELS,
  ORG_GROUP_OPTIONS,
  type PerformanceByOrgFilterFormRef,
  type PerformanceByOrgFilterFormValues,
} from '@/features/dashboard/components/sales/PerformanceByOrgFilterForm.tsx'
import { TIME_GROUP_OPTIONS } from '@/features/dashboard/components/sales/sales-admin-dashboard-constants.ts'
import {
  DashboardOrgActivity as OrgActivity,
  type DashboardPerformanceGroup as TimeGroup,
  type DashboardPerformanceGroupOrg as OrgGroup,
} from '@/constants/api-schema-aliases'

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? ''

/**
 * Quá ngần này tên thì phụ đề đếm số thay vì liệt kê — ba tên chi nhánh đã dài hơn cả tiêu đề.
 */
const MAX_ORG_NAMES_IN_SUBTITLE = 2

/** `[]` → rỗng (không lọc thì không in ra); có tên thì liệt kê, đông quá thì đếm. */
function summariseNames(ids: number[], names: string[] | undefined, noun: string): string {
  if (ids.length === 0) return ''
  const known = (names ?? []).filter(Boolean)
  if (known.length > 0 && known.length <= MAX_ORG_NAMES_IN_SUBTITLE) return known.join(', ')
  return `${ids.length} ${noun}`
}

/**
 * Bộ lọc dạng nút phễu + dialog cho khối "Hiệu suất theo tổ chức", theo đúng
 * pattern các khối khác trên dashboard đang dùng (xem `useSalesRevenueDashboardFilter`).
 */
export function usePerformanceByOrgFilter({
  onFilterChange,
}: {
  /** Gọi mỗi lần bộ lọc đổi — bảng dùng để đưa phân trang về trang 1. */
  onFilterChange?: () => void
} = {}) {
  const refForm = useRef<PerformanceByOrgFilterFormRef>(null)
  const { displayFormContent, displayClose } = useDialog()

  // Khởi tạo lười: mặc định chứa kỳ hiện tại, tính lại mỗi lần dựng thay vì đóng băng.
  const [filterParams, setFilterParams] = useState<PerformanceByOrgFilterFormValues>(
    getDefaultPerformanceFilterValues
  )

  const selectedBranchIds = useMemo(() => filterParams.branches ?? [], [filterParams.branches])
  const selectedBlockIds = useMemo(() => filterParams.blocks ?? [], [filterParams.blocks])

  const apiParams = useMemo(() => {
    const params: {
      group: TimeGroup
      group_org: OrgGroup
      org_activity: OrgActivity
      from?: string
      to?: string
      branch__in?: number[]
      block__in?: number[]
      transaction_sheet_date_from?: string
      transaction_sheet_date_to?: string
    } = {
      group: filterParams.timeGroup,
      group_org: filterParams.groupOrg,
      /**
       * Đơn vị có / không phát sinh giao dịch. Luôn gửi lên: đây không phải bộ lọc thu hẹp
       * một tập có sẵn mà là câu hỏi "lấy tập đơn vị nào" — bỏ trống thì server không có
       * mặc định nào khác ngoài "có phát sinh", tức vẫn phải nói ra.
       */
      org_activity: filterParams.orgActivity,
    }

    /**
     * Ngày làm phiếu TTGD — ĐỘC LẬP hoàn toàn với `dateRange`/`period` bên dưới: không bị
     * kỳ ghi đè, cộng thêm (AND) vào bất kỳ tổ hợp from/to nào được set sau đây.
     */
    if (filterParams.transactionSheetDateRange?.from) {
      params.transaction_sheet_date_from =
        formatDateToApi(filterParams.transactionSheetDateRange.from) ?? undefined
    }
    if (filterParams.transactionSheetDateRange?.to) {
      params.transaction_sheet_date_to =
        formatDateToApi(filterParams.transactionSheetDateRange.to) ?? undefined
    }

    /**
     * `branch__in` / `block__in` THU HẸP các dòng, khác hẳn `group_org` chỉ đổi cách gộp
     * (BE PR #3371, áp cho cả endpoint bảng lẫn endpoint export). Cho cả hai thì BE giao
     * chúng lại — chọn chi nhánh A cùng một khối không thuộc A sẽ ra rỗng, nên form đã xoá
     * ô khối mỗi khi chi nhánh đổi.
     */
    if (selectedBranchIds.length > 0) params.branch__in = selectedBranchIds
    if (selectedBlockIds.length > 0) params.block__in = selectedBlockIds

    /**
     * Endpoint không có tham số `period` — chọn một kỳ tức là thu hẹp `from`/`to` về đúng
     * hai mốc của kỳ đó. Ghi đè lên "Khoảng thời gian" là ĐÚNG chứ không phải bỏ qua ý người
     * dùng: danh sách kỳ vốn đã được cắt theo khoảng đó, nên kỳ chọn được luôn nằm trong
     * khoảng, và mốc của kỳ là phần giao của hai bộ lọc.
     */
    const periodRange = getPeriodLabelRangeApi(filterParams.period)
    if (periodRange) {
      params.from = periodRange.from
      params.to = periodRange.to
      return params
    }

    if (filterParams.dateRange?.from) {
      params.from = formatDateToApi(filterParams.dateRange.from) ?? undefined
    }
    if (filterParams.dateRange?.to) {
      params.to = formatDateToApi(filterParams.dateRange.to) ?? undefined
    }
    return params
  }, [filterParams, selectedBranchIds, selectedBlockIds])

  /**
   * Đọc theo đúng thứ tự các ô trong dialog: cái ĐANG THU HẸP dữ liệu trước, cách bày sau.
   * Trước đây "Phòng ban · Theo tháng" đứng đầu và đẩy kỳ xuống cuối, nên thứ người ta cần
   * liếc thấy nhất — đang xem kỳ nào, chi nhánh nào — lại nằm ở chỗ mắt tới sau cùng.
   */
  const subTitle = useMemo(() => {
    const parts: string[] = []

    // Chọn kỳ thì kỳ THAY chỗ khoảng ngày, vì `apiParams` cũng ghi đè như vậy — in cả hai
    // sẽ mô tả một bộ lọc không phải bộ lọc đang chạy.
    if (filterParams.period) {
      parts.push(formatPeriodLabel(filterParams.period))
    } else {
      const range = formatDateRangeText(
        filterParams.dateRange?.from,
        filterParams.dateRange?.to ?? undefined
      )
      if (range) parts.push(range)
    }

    // Ngày làm phiếu TTGD độc lập, không bị `period` ghi đè — luôn in riêng khi có giá trị.
    const transactionSheetRange = formatDateRangeText(
      filterParams.transactionSheetDateRange?.from,
      filterParams.transactionSheetDateRange?.to ?? undefined
    )
    if (transactionSheetRange) parts.push(`Ngày làm phiếu TTGD ${transactionSheetRange}`)

    // Chỉ in ra khi ĐANG lọc: "Tất cả chi nhánh" là trạng thái mặc định, in ra chỉ tổ dài
    // phụ đề mà không thêm thông tin gì.
    const branchLabel = summariseNames(selectedBranchIds, filterParams.branchNames, 'chi nhánh')
    if (branchLabel) parts.push(branchLabel)
    const blockLabel = summariseNames(selectedBlockIds, filterParams.blockNames, 'khối')
    if (blockLabel) parts.push(blockLabel)

    // Chỉ nói khi KHÁC mặc định: "đơn vị có phát sinh giao dịch" là biểu đồ vốn có từ trước,
    // in ra thì phụ đề dài thêm mà không cho biết điều gì mới.
    if (filterParams.orgActivity !== OrgActivity.with_deals) {
      // Nhãn DÀI, không phải nhãn của `Select`: xem `ORG_ACTIVITY_SUBTITLE_LABELS`.
      parts.push(ORG_ACTIVITY_SUBTITLE_LABELS[filterParams.orgActivity])
    }

    parts.push(labelOf(ORG_GROUP_OPTIONS, filterParams.groupOrg))
    parts.push(labelOf(TIME_GROUP_OPTIONS, filterParams.timeGroup))
    return parts.filter(Boolean).join(' · ')
  }, [filterParams, selectedBranchIds, selectedBlockIds])

  /**
   * Hễ một ô LỌC đang có giá trị là đếm nó, kể cả khi giá trị đó là mặc định của màn.
   * User chốt 2026-08-24: *"cứ khi nào bộ lọc có giá trị là phải đếm nó vào"* — badge trả
   * lời câu "màn này đang bị thu hẹp bởi mấy điều kiện", chứ không phải "tôi đã bấm mấy lần".
   * Kỳ mặc định (tháng đang chạy) vẫn thu hẹp dữ liệu thật, nên nó phải được đếm.
   *
   * Kỳ và khoảng ngày đếm RIÊNG, mỗi cái một điểm. Chúng là hai ô riêng trên dialog, nên gộp
   * thành 1 thì badge và số ô đang có giá trị lệch nhau — người dùng mở ra đếm bằng mắt sẽ
   * thấy sai. (Việc kỳ ghi đè khoảng ngày ở `apiParams` là chuyện của truy vấn, và phụ đề đã
   * nói rõ cái nào đang chạy.)
   *
   * KHÔNG đếm "Nhóm theo tổ chức" / "Nhóm theo thời gian": chúng là tham số bắt buộc của
   * endpoint và chỉ đổi CÁCH GỘP, không bỏ bớt một dòng dữ liệu nào — đếm chúng thì badge
   * không bao giờ nhỏ hơn 2 và mất hết ý nghĩa. User chốt phạm vi này cùng ngày.
   */
  const filterCount = useMemo(() => {
    let count = 0
    if (filterParams.period) count++
    if (filterParams.dateRange?.from || filterParams.dateRange?.to) count++
    if (filterParams.transactionSheetDateRange?.from || filterParams.transactionSheetDateRange?.to)
      count++
    if (selectedBranchIds.length > 0) count++
    if (selectedBlockIds.length > 0) count++
    // Khác "Nhóm theo …": ô này ĐỔI TẬP DÒNG được trả về, nên nó là một điều kiện thật sự
    // đang thu hẹp/mở rộng màn hình. Không đếm giá trị mặc định, cùng lẽ với phụ đề.
    if (filterParams.orgActivity !== OrgActivity.with_deals) count++
    return count
  }, [filterParams, selectedBranchIds, selectedBlockIds])

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setFilterParams(getDefaultPerformanceFilterValues())
    onFilterChange?.()
    displayClose()
  }, [displayClose, onFilterChange])

  const onClickApply = useCallback(() => {
    const values = refForm.current?.getValues()
    if (values) {
      setFilterParams({ ...getDefaultPerformanceFilterValues(), ...values })
    }
    onFilterChange?.()
    displayClose()
  }, [displayClose, onFilterChange])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: <PerformanceByOrgFilterForm ref={refForm} initialValues={filterParams} />,
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [displayFormContent, filterParams, onClickApply, onClickClearFilter, displayClose])

  return { openFilterModal, filterParams, apiParams, subTitle, filterCount }
}
