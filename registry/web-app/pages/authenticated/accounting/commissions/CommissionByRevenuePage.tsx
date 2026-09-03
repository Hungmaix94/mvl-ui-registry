import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { PageTitle, Button } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { useDebounceValue } from 'usehooks-ts'
import { useDepartmentMonthlyKpis } from '@/features/accounting/department-monthly-kpi/services/department-monthly-kpi-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import {
  CommissionByRevenueTable,
  type CommissionByRevenueScope,
} from '@/features/accounting/management-commission/components/CommissionByRevenueTable'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import DepartmentMonthlyKpiFilter, {
  DepartmentMonthlyKpiFilterRef,
} from '@/features/accounting/department-monthly-kpi/components/DepartmentMonthlyKpiFilter'
import { GetDepartmentMonthlyKpisParams } from '@/features/accounting/department-monthly-kpi/types/department-monthly-kpi-types'
import {
  applyDepartmentMonthlyKpiFilters,
  countDepartmentMonthlyKpiFilters,
  findInvertedDepartmentMonthlyKpiRanges,
  readDepartmentMonthlyKpiFilters,
  readDepartmentMonthlyKpiFormValues,
  readDepartmentMonthlyKpiSimpleParams,
} from '@/features/accounting/department-monthly-kpi/utils/department-monthly-kpi-filters'
import {
  useComputeManagementCommission,
  useComputePreflight,
  useReopenSummariesForPeriod,
  type ManagementCommissionComputeExtras,
} from '@/features/accounting/management-commission/services/management-commission-service'
import { useDialog } from '@/hooks/useDialog'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { formatCurrencyVND, parsePositiveInt } from '@/utils/common'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
// R18 của CR: dùng bộ phân trang chung của hệ thống (25/50/100) thay cho bộ 10/20/50/100
// riêng của màn này.
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'

/** Toast dài quá thì không ai đọc — quá số này thì gộp phần còn lại thành "và N phòng khác". */
const MAX_DEPARTMENTS_IN_WARNING = 3

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetDepartmentMonthlyKpisParams {
  const params: GetDepartmentMonthlyKpisParams = {}
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize
  const search = searchParams.get('search')
  if (search) params.search = search

  const year = parsePositiveInt(searchParams.get('year'))
  if (year) params.year = year
  const month = parsePositiveInt(searchParams.get('month'))
  if (month) params.month = month
  // Cùng một parser với `countDepartmentMonthlyKpiFilters`: badge và request phải loại bỏ cùng
  // những giá trị rác như nhau, không thì `?branch=0` bị request bỏ mà badge vẫn đếm là 1.
  Object.assign(
    params,
    readDepartmentMonthlyKpiSimpleParams(searchParams),
    readDepartmentMonthlyKpiFilters(searchParams)
  )

  return params
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams) {
  return {
    branch: parsePositiveInt(searchParams.get('branch')),
    block: parsePositiveInt(searchParams.get('block')),
    department: parsePositiveInt(searchParams.get('department')),
    has_revenue: searchParams.get('has_revenue'),
    is_computed: searchParams.get('is_computed'),
    ...readDepartmentMonthlyKpiFormValues(searchParams),
  }
}

export function CommissionByRevenuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { displayConfirm, updateConfig } = useDialog()
  const invalidateQueries = useInvalidateQueries()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const filterFormRef = useRef<DepartmentMonthlyKpiFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = allPeriods ?? []

  const apiParams = useMemo(() => buildApiParamsFromUrl(searchParams), [searchParams])
  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])
  // Counted off the URL, not off the seeded form values: an unticked checkbox seeds as `false`,
  // which is a value the form holds but not a filter the user applied.
  const filterBadgeCount = useMemo(
    () => countDepartmentMonthlyKpiFilters(searchParams),
    [searchParams]
  )

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/department-monthly-kpi/export/',
    'hoa-hong-theo-doanh-thu.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const activePeriodId = useMemo(() => {
    if (apiParams.year && apiParams.month) {
      return (
        periods.find((p) => p.year === apiParams.year && p.month === apiParams.month)?.id || null
      )
    }
    return null
  }, [periods, apiParams.year, apiParams.month])

  // Spread rather than re-listing each param: `buildApiParamsFromUrl` is already the one place
  // that decides what the URL contributes, and re-enumerating here is how a newly added filter
  // ends up in the URL, in the badge and in the export — but never in the list request.
  const { data, isLoading, isFetching, error } = useDepartmentMonthlyKpis(apiParams, {
    enabled: isUrlReady && !!apiParams.year && !!apiParams.month,
  })
  const { mutateAsync: compute, isPending: isComputing } = useComputeManagementCommission()
  const { mutateAsync: checkPreflight, isPending: isCheckingPreflight } = useComputePreflight()
  const { mutateAsync: reopenSummaries, isPending: isReopening } = useReopenSummariesForPeriod()

  // Một kết quả rỗng phải hiện rỗng: bộ lọc (vd "Chưa có doanh số") lọc hết dòng là chuyện
  // bình thường, và dựng dữ liệu giả ở đây sẽ hiện phòng ban không có thật.
  const tableData = useMemo(
    () => (isLoading || error ? [] : (data?.results ?? [])),
    [data, error, isLoading]
  )

  const totalRecords = useMemo(
    () => (isLoading || error ? 0 : (data?.count ?? 0)),
    [data, isLoading, error]
  )

  // Tổng của TOÀN tập đã lọc do BE trả cạnh `results`. Bỏ đi trong lúc tải/lỗi để dòng TỔNG CỘNG
  // không giữ số của lần lọc trước rồi ngồi dưới một bảng đã thay dữ liệu.
  //
  // Phải là `isFetching`, không phải `isLoading`: trong React Query v5 `isLoading` chỉ đúng ở lần
  // tải ĐẦU, nên sau khi bấm "Tính toán lại" và query bị invalidate, suốt vòng gọi mạng
  // `isLoading` vẫn false còn `data` vẫn là cache TRƯỚC khi tính lại — dòng tổng đứng im với số
  // cũ, không spinner, rồi lặng lẽ nhảy sang số mới.
  const summary = useMemo(
    () => (isFetching || error ? undefined : (data?.summary ?? undefined)),
    [data, isFetching, error]
  )

  // Query list không có toast lỗi mặc định (chỉ mutation mới có), nên một cú 500 sẽ hiện ra y hệt
  // "không có phòng nào khớp bộ lọc" — mà đó lại là kết quả hợp lệ của chính màn này.
  useEffect(() => {
    if (error) toastService.error(extractErrorMessage(error))
  }, [error])

  const scope = useMemo<CommissionByRevenueScope>(
    () => ({
      branch: !!apiParams.branch,
      block: !!apiParams.block,
      department: !!apiParams.department,
    }),
    [apiParams.branch, apiParams.block, apiParams.department]
  )

  /**
   * The org values the list is narrowed to, printed above the table because their columns are
   * gone. Read off the first row rather than resolving the ids again: every row shares the
   * value that was filtered on, and already carries its own name.
   */
  const scopeLabels = useMemo(() => {
    const detail = (data?.results?.[0] as any)?.department_detail
    if (!detail) return []
    const labels: { label: string; value: string }[] = []
    if (scope.branch && detail.branch?.name)
      labels.push({ label: 'Chi nhánh', value: detail.branch.name })
    if (scope.block && detail.block?.name) labels.push({ label: 'Khối', value: detail.block.name })
    if (scope.department && detail.name) labels.push({ label: 'Phòng ban', value: detail.name })
    return labels
  }, [data, scope])

  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')
    const hasYear = searchParams.has('year')
    const hasMonth = searchParams.has('month')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      if (!hasYear || !hasMonth) {
        const defaultPeriod = currentPeriod ?? periods[0]
        if (defaultPeriod) {
          newParams.set('year', String(defaultPeriod.year))
          newParams.set('month', String(defaultPeriod.month))
        }
      }
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  const handlePeriodSelect = useCallback(
    (periodId: number) => {
      const period = periods.find((p) => p.id === periodId)
      if (period) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('page', '1')
        newParams.set('year', String(period.year))
        newParams.set('month', String(period.month))
        setSearchParams(newParams, { replace: true })
      }
    },
    [periods, searchParams, setSearchParams]
  )

  useEffect(() => {
    if (!isUrlReady) return
    const currentSearch = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearch) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) newParams.set('search', debouncedSearch)
      else newParams.delete('search')
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    // Áp dụng đọc thẳng `getValues()` chứ không qua `handleSubmit`, nên `zodResolver` của form
    // không bao giờ chạy — kiểm ở đây mới có tác dụng. Khoảng gõ ngược luôn cho danh sách rỗng,
    // mà rỗng lại là kết quả hợp lệ của nhiều bộ lọc khác trên màn này: không chặn thì người
    // dùng chỉ thấy "không có dữ liệu" và không có manh mối nào là mình gõ nhầm.
    const inverted = findInvertedDepartmentMonthlyKpiRanges(formData)
    if (inverted.length > 0) {
      const message = `Giá trị "Đến" phải lớn hơn hoặc bằng "Từ": ${inverted.join(', ')}`
      toastService.error(message)
      // `isValidationError` là quy ước `AppDialog` dùng để GIỮ dialog mở (xem `handleConfirm`).
      // `return` trơn thì dialog vẫn đóng, và người dùng mất trắng những gì vừa gõ vào 14 ô.
      throw Object.assign(new Error(message), { isValidationError: true })
    }

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(apiParams.page_size))
    const search = searchParams.get('search')
    if (search) newParams.set('search', search)

    if (formData.branch) newParams.set('branch', String(formData.branch))
    else newParams.delete('branch')
    if (formData.block) newParams.set('block', String(formData.block))
    else newParams.delete('block')
    if (formData.department) newParams.set('department', String(formData.department))
    else newParams.delete('department')
    if (formData.has_revenue) newParams.set('has_revenue', formData.has_revenue)
    else newParams.delete('has_revenue')
    if (formData.is_computed) newParams.set('is_computed', formData.is_computed)
    else newParams.delete('is_computed')

    setSearchParams(applyDepartmentMonthlyKpiFilters(newParams, formData), { replace: true })
    setIsFilterDialogOpen(false)
  }, [apiParams.page_size, searchParams, setSearchParams])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handlePaginationChange = useCallback(
    (pageIndex: number, pageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(pageSize))
      setSearchParams(newParams, { replace: true })

      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const displayPeriod = useMemo(() => {
    const year = apiParams.year || new Date().getFullYear()
    const month = apiParams.month
    return month ? `0${month}`.slice(-2) + `/${year}` : `${year}`
  }, [apiParams.year, apiParams.month])

  /**
   * Một nút duy nhất cho cả "tính" lẫn "tính lại". BE chỉ còn `compute`, và bản thân nó đã xoá
   * sạch kết quả KPI_* của kỳ trước khi dựng lại — nên bấm lần hai CHÍNH LÀ tính lại. Trước đây
   * màn này có 2 nút gọi 2 endpoint, nhưng `recompute` ở BE chỉ là `return compute(...)`: hai nút
   * làm y hệt nhau, chỉ khác chữ trong hộp thoại.
   *
   * Nhãn nút để cố định, KHÔNG đổi theo "kỳ đã tính hay chưa": tín hiệu duy nhất suy ra được là
   * `computed_at` của các dòng ĐANG hiển thị, mà danh sách thì có phân trang và bộ lọc — sang
   * trang 2 hoặc lọc "Chưa có doanh số" là nhãn nói sai. Hệ quả thật (xoá rồi dựng lại) nói thẳng
   * trong hộp thoại, chỗ đó mới là chỗ người dùng cần đọc.
   */
  const canCompute = !!apiParams.year && !!apiParams.month

  /**
   * Chặn cú bấm thứ hai xảy ra TRƯỚC khi React kịp render trạng thái khoá.
   *
   * `updateConfig` khoá nút qua store nên chỉ có tác dụng từ lần render kế tiếp; hai cú bấm
   * trong cùng một nhịp vẫn lọt cả hai. Với thao tác xoá-rồi-dựng-lại cả kỳ thì lọt một lần là
   * chạy lại toàn bộ, nên cần thêm chốt đồng bộ.
   */
  const isRunningRef = useRef(false)

  /**
   * Chạy thao tác của hộp thoại xác nhận trong trạng thái "đang chạy" nhìn thấy được.
   *
   * `GlobalDialog` await `onConfirm()` rồi mới đóng, nên suốt thời gian tính (có kỳ tới hàng
   * chục giây) hộp thoại vẫn đứng nguyên. Không có mốc nào báo đã nhận cú bấm thì người dùng
   * không phân biệt được "chưa bấm trúng" với "đang chạy", và bấm lại — mỗi lần là một lần
   * xoá-và-dựng-lại kỳ. Ở đây khoá cả hai nút, bật spinner, đổi nhãn nút, và chặn đóng hộp
   * thoại bằng Esc/click nền cho tới khi xong.
   *
   * `idleConfirmText` được truyền vào để trả nhãn về như cũ: nếu tác vụ hỏng, hộp thoại còn mở
   * cho người dùng thử lại, không được kẹt ở chữ "Đang tính…".
   */
  const runInDialog = useCallback(
    async (task: () => Promise<void>, idleConfirmText: string) => {
      if (isRunningRef.current) return
      isRunningRef.current = true
      updateConfig({ loading: true, disableBackdropClose: true, confirmText: 'Đang tính…' })
      try {
        await task()
      } catch (error) {
        // Ba mutation của màn này đều không bật `showErrorToast`, nên không báo ở đây thì lỗi
        // chỉ nằm lại trong console: hộp thoại đóng, bảng không đổi, người dùng tưởng đã tính.
        toastService.error(extractErrorMessage(error))
      } finally {
        isRunningRef.current = false
        updateConfig({ loading: false, disableBackdropClose: false, confirmText: idleConfirmText })
      }
    },
    [updateConfig]
  )

  /**
   * Chạy `compute` rồi báo lại những gì kỳ này KHÔNG ghi nhận được.
   *
   * Hai cảnh báo hậu kiểm, cả hai đều từng im lặng: vai quản lý không có người nhận thì phần
   * hoa hồng của vai đó rơi khỏi kỳ, và kỳ lương đã chốt thì bảng lương không nhận doanh số
   * mới. Trước đây cả hai chỉ để lại một dòng log ở server.
   */
  const runCompute = useCallback(async () => {
    // Ép kiểu tại chỗ: các trường cảnh báo dưới đây chưa có trong `schema.ts` (chỉ sinh lại từ
    // BE đã deploy), và AGENTS.md cấm bơm chúng vào type schema dùng chung.
    const result = (await compute({
      year: apiParams.year as number,
      month: apiParams.month as number,
    })) as unknown as ManagementCommissionComputeExtras
    await invalidateQueries.invalidateByPrefix('accounting/department-monthly-kpi')

    let warned = false

    if (result?.unresolved_roles > 0) {
      // Nêu ĐÍCH DANH phòng: "1 vai thiếu người nhận" mà không nói phòng nào thì kế toán
      // phải dò lại cả danh sách mới biết đi gán ở đâu.
      const departments = [
        ...new Set((result.unresolved_detail ?? []).map((d) => d.department_name).filter(Boolean)),
      ]
      const shown = departments.slice(0, MAX_DEPARTMENTS_IN_WARNING)
      const rest = departments.length - shown.length
      const where = shown.length
        ? ` (${shown.join(', ')}${rest > 0 ? ` và ${rest} phòng khác` : ''})`
        : ''
      warned = true
      toastService.warning(
        `Đã tính xong, nhưng ${result.unresolved_roles} vai quản lý không có người nhận nên ` +
          `${formatCurrencyVND(Number(result.unresolved_amount || 0))} không được ghi nhận${where}. ` +
          'Gán người phụ trách rồi tính lại kỳ.'
      )
    }
    if (result?.salary_period_locked) {
      warned = true
      toastService.warning(
        `Kỳ lương ${displayPeriod} đã chốt nên doanh số KPI trên bảng lương KHÔNG được cập nhật theo lần tính này.`
      )
    }

    // Đường thành công trước đây im lặng hoàn toàn: chỉ có cảnh báo mới sinh toast. Hộp thoại
    // đóng, bảng tự nạp lại, và không có gì phân biệt "đã tính xong" với "bấm hụt". Hai nhánh
    // cảnh báo ở trên đã tự mở đầu bằng "Đã tính xong, nhưng…" nên chỉ báo thêm khi sạch, tránh
    // hai toast nói cùng một việc.
    if (!warned) {
      toastService.success(`Đã tính xong hoa hồng theo doanh thu kỳ ${displayPeriod}.`)
    }
  }, [compute, invalidateQueries, apiParams.year, apiParams.month, displayPeriod])

  const confirmAndCompute = useCallback(() => {
    displayConfirm({
      title: 'Tính toán hoa hồng',
      content: `Tính lại hoa hồng theo doanh thu kỳ ${displayPeriod} cho tất cả các phòng ban. Toàn bộ kết quả đã tính của kỳ này sẽ bị xoá và dựng lại theo dữ liệu hiện tại. Bạn có chắc chắn không?`,
      confirmText: 'Tính toán',
      cancelText: 'Huỷ',
      onConfirm: () => runInDialog(runCompute, 'Tính toán'),
    })
  }, [displayConfirm, displayPeriod, runCompute, runInDialog])

  /**
   * Hỏi BE xem có gì đang chặn trước khi mời người dùng bấm tính.
   *
   * `compute` dừng ở chướng ngại ĐẦU TIÊN và ném lỗi không nói được phải mở cái gì — kỳ kế toán
   * đang đóng, hay bảng kê nào đã chốt, hay tiền đã chi rồi. Ba tình huống, ba cách xử lý khác
   * hẳn nhau, nên phải liệt kê hết trước.
   */
  const handleCompute = useCallback(async () => {
    // Không có kỳ thì không có gì để tính. Fallback cũ là `year || 2026, month || 4` — URL thiếu
    // year/month sẽ lặng lẽ tính cho tháng 4/2026 thay vì kỳ đang xem, xoá sạch kết quả của một
    // kỳ mà người dùng còn không mở.
    if (!canCompute) return

    const period = { year: apiParams.year as number, month: apiParams.month as number }
    const preflight = await checkPreflight(period)

    if (preflight?.can_recompute) {
      confirmAndCompute()
      return
    }

    const blockers = preflight?.blockers ?? []
    const periodClosed = blockers.find((b) => b.type === 'period_closed')
    const frozen = blockers.filter((b) => b.type === 'summary_frozen')
    const stuck = frozen.filter((b) => !b.reopenable)

    // Kỳ đóng thì phải mở ở màn Kỳ kế toán — mở bảng kê trước cũng vô ích vì BE từ chối mở khi
    // kỳ đang hard-closed.
    if (periodClosed) {
      displayConfirm({
        title: 'Kỳ kế toán đang đóng',
        content: `Kỳ ${displayPeriod} đang ở trạng thái ${periodClosed.status}. Mở lại kỳ ở màn Kỳ kế toán rồi quay lại tính.`,
        confirmText: 'Đã hiểu',
        cancelText: '',
      })
      return
    }

    // Tiền đã ra khỏi nhà: KHÔNG được viết lại kỳ. Phần chi sai phải điều chỉnh ở kỳ mở gần
    // nhất, không phải bằng cách tính lại kỳ cũ.
    if (stuck.length > 0) {
      displayConfirm({
        title: 'Không tính lại được kỳ này',
        content: (
          <div className="space-y-2 text-sm">
            <p>
              {stuck.length} bảng kê của kỳ {displayPeriod} đã chi tiền, nên không thể mở lại để
              tính lại. Phần chi sai phải điều chỉnh ở kỳ mở gần nhất, không viết lại kỳ đã chi.
            </p>
            <ul className="list-disc pl-5">
              {stuck.map((b) => (
                <li key={b.summary_id}>
                  {b.beneficiary} — {b.status}
                </li>
              ))}
            </ul>
          </div>
        ),
        confirmText: 'Đã hiểu',
        cancelText: '',
      })
      return
    }

    displayConfirm({
      title: 'Cần mở lại bảng kê trước khi tính',
      content: (
        <div className="space-y-2 text-sm">
          <p>
            {frozen.length} bảng kê của kỳ {displayPeriod} đã chốt và đang giữ hoa hồng quản lý của
            kỳ. Mở lại các bảng kê này (đưa về Nháp) rồi tính lại?
          </p>
          <ul className="max-h-48 list-disc overflow-y-auto pl-5">
            {frozen.map((b) => (
              <li key={b.summary_id}>
                {b.beneficiary} — {formatCurrencyVND(Number(b.amount || 0))}
              </li>
            ))}
          </ul>
        </div>
      ),
      confirmText: 'Mở lại & tính',
      cancelText: 'Huỷ',
      // Nhánh này còn dài hơn nhánh tính thuần (mở lại bảng kê rồi mới tính), nên càng cần
      // trạng thái "đang chạy" nhìn thấy được.
      onConfirm: () =>
        runInDialog(async () => {
          const reopened = await reopenSummaries({ ...period, dry_run: false })
          if (reopened?.refused?.length) {
            toastService.error(
              `${reopened.refused.length} bảng kê không mở lại được, chưa tính lại kỳ. Kiểm tra lại rồi thử lại.`
            )
            return
          }
          await runCompute()
        }, 'Mở lại & tính'),
    })
  }, [
    canCompute,
    checkPreflight,
    confirmAndCompute,
    displayConfirm,
    displayPeriod,
    reopenSummaries,
    runInDialog,
    runCompute,
    apiParams.year,
    apiParams.month,
  ])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Hoa hồng theo doanh thu"
        breadcrumb={[
          { label: 'Kế toán', href: '/accounting/dashboard' },
          { label: 'Hoa hồng quản lý' },
          { label: 'Hoa hồng theo doanh thu' },
        ]}
        handleSearch={setSearchInput}
        searchPlaceholder="Tìm phòng, khối, chi nhánh, tên"
        searchValue={searchInput}
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
        customActions={
          <Button
            loading={isComputing || isCheckingPreflight || isReopening}
            disabled={!canCompute}
            variant="primary"
            onClick={handleCompute}
          >
            Tính toán
          </Button>
        }
        topSlot={
          <div className="-mt-1 mb-2 text-xs text-neutral-400">
            Kỳ {displayPeriod} • Hoa hồng quản lý theo doanh số phòng — áp dụng cho 3 cấp TP / GĐ /
            TGĐ theo quy định 20.11
          </div>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        {scopeLabels.length > 0 && (
          <div className="text-content-dark-2 flex flex-wrap items-center gap-x-6 gap-y-1 px-7 text-sm">
            {scopeLabels.map(({ label, value }) => (
              <span key={label}>
                {label}: <strong className="text-content-dark-1 font-semibold">{value}</strong>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
          <CommissionByRevenueTable
            data={tableData}
            summary={summary}
            isLoading={isLoading}
            pageCount={Math.ceil(totalRecords / (apiParams.page_size || PAGE_SIZE))}
            pageSize={apiParams.page_size || PAGE_SIZE}
            currentPage={apiParams.page || 1}
            totalRecords={totalRecords}
            scope={scope}
            onPaginationChange={handlePaginationChange}
            onViewDetail={(id) =>
              navigate(APP_PATH.COMMISSION_BY_REVENUE_DETAIL.replace(':id', String(id)))
            }
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DepartmentMonthlyKpiFilter
            ref={filterFormRef}
            // Không cần prop `isOpen`: `AppDialog` không `forceMount` nên khối này unmount lúc
            // đóng và mount lại lúc mở, `defaultValues` tự seed từ URL mỗi lần mở. Thêm effect
            // `reset()` theo `initialValues` là xoá mất giá trị user đang gõ dở khi URL đổi ngầm
            // (debounce ô tìm kiếm) — lỗi đã phải sửa ở bộ lọc báo cáo tạm ứng 21.3.
            initialValues={currentFilterParams as any}
            showStatus={false}
            showKpiFlags
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}

export default CommissionByRevenuePage
