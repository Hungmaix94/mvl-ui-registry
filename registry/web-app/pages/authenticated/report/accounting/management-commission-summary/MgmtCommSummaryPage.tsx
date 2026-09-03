import { useMemo, useEffect, useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { PageTitle, Table, type ColumnDef } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { Flex } from '@radix-ui/themes'
import { IconCheck, IconMoney } from '@/assets/icons'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
import type { TableAction } from '@/types/table'
import {
  useCommPayrolls,
  useApproveCommPayroll,
  useMarkPaidCommPayroll,
  type CommissionPayrollRow,
} from '@/features/accounting/comm-payroll/services/comm-payroll-service'
import { useEmployeesByIds } from '@/features/employee/services/employee-service'
import { useCollaborators } from '@/features/accounting/collaborators/services/collaborator-service'
import { useExchanges } from '@/services/realestate-service'
import { formatPayrollTotal } from '@/features/accounting/comm-payroll/utils/payroll-totals'
import { formatCurrencyVND, parsePositiveInt } from '@/utils/common'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  useCurrentAccountingPeriod,
  useAllAccountingPeriods,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import MgmtCommSummaryFilter, {
  type MgmtCommSummaryFilterRef,
} from '@/features/report/accounting/management-commission-summary/MgmtCommSummaryFilter'
import {
  MGMT_COMM_SUMMARY_SEARCH_PARAM,
  buildMgmtCommSummaryApiParams,
  buildMgmtCommSummaryFilterParams,
  buildMgmtCommSummarySearchParams,
  countMgmtCommSummaryFilters,
  parseMgmtCommSummaryFilters,
} from '@/features/report/accounting/management-commission-summary/mgmt-comm-summary-filters'

export default function MgmtCommSummaryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const filterFormRef = useRef<MgmtCommSummaryFilterRef>(null)
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const { data: currentPeriod } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  // Sync default URL params on mount if not present
  useEffect(() => {
    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')
    const hasYear = searchParams.has('year')
    const hasMonth = searchParams.has('month')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      if (!hasYear) newParams.set('year', String(currentPeriod?.year ?? currentYear))
      if (!hasMonth) newParams.set('month', String(currentPeriod?.month ?? currentMonth))
      setSearchParams(newParams, { replace: true })
    }
  }, [currentPeriod, currentYear, currentMonth, searchParams, setSearchParams])

  const pageFromUrl = parsePositiveInt(searchParams.get('page'))
  const page = pageFromUrl ?? 1

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const yearFromUrl = searchParams.get('year')
  const monthFromUrl = searchParams.get('month')
  const parsedYear = Number(yearFromUrl) || currentYear
  const parsedMonth = Number(monthFromUrl) || currentMonth

  const activePeriodId = useMemo(() => {
    if (parsedYear && parsedMonth) {
      return periods.find((p) => p.year === parsedYear && p.month === parsedMonth)?.id || null
    }
    return null
  }, [periods, parsedYear, parsedMonth])

  // Bộ lọc + ô tìm kiếm đọc thẳng từ URL (CR 86eyqgf5k) — cùng một nguồn với badge và với giá
  // trị seed lại vào dialog, nên ba chỗ không thể lệch nhau.
  const filterApiParams = useMemo(() => buildMgmtCommSummaryApiParams(searchParams), [searchParams])
  const filterCount = useMemo(() => countMgmtCommSummaryFilters(searchParams), [searchParams])
  const currentFilters = useMemo(() => parseMgmtCommSummaryFilters(searchParams), [searchParams])
  const searchKeyword = searchParams.get(MGMT_COMM_SUMMARY_SEARCH_PARAM) ?? ''

  // Ô tìm kiếm giữ state CỤC BỘ rồi mới ghi lên URL sau khi gõ xong 500ms — pattern của
  // `PermissionManagementPage` (trang canonical cho mọi list page) và 92/102 màn dùng
  // `PageTitle.handleSearch`. Ghi thẳng mỗi ký tự thì mỗi phím là một request, mà query của màn
  // này nặng: BE dựng row trong Python và prefetch 3 nhánh quan hệ.
  // Input đọc `searchInput` chứ không đọc URL, nếu không chữ vừa gõ bị nuốt trong lúc chờ debounce.
  const [searchInput, setSearchInput] = useState(searchKeyword)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // URL đổi mà không do gõ (bấm Back, mở link chia sẻ, "Xoá bộ lọc") thì kéo ô nhập theo.
  useEffect(() => {
    if (searchKeyword !== searchInput && searchKeyword !== debouncedSearch) {
      setSearchInput(searchKeyword)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword])

  useEffect(() => {
    if (debouncedSearch === searchKeyword) return
    setSearchParams(buildMgmtCommSummarySearchParams(searchParams, debouncedSearch), {
      replace: true,
    })
  }, [debouncedSearch, searchKeyword, searchParams, setSearchParams])

  const {
    data: payrollsData,
    isLoading: isLoadingList,
    refetch: refetchList,
  } = useCommPayrolls('manager', {
    year: parsedYear,
    month: parsedMonth,
    page,
    page_size: pageSize,
    ...filterApiParams,
  })

  const payrollRows = useMemo<CommissionPayrollRow[]>(() => {
    if (!payrollsData) return []
    if (Array.isArray(payrollsData)) return payrollsData as CommissionPayrollRow[]
    if (Array.isArray((payrollsData as any).data))
      return (payrollsData as any).data as CommissionPayrollRow[]
    if (Array.isArray((payrollsData as any).results))
      return (payrollsData as any).results as CommissionPayrollRow[]
    return []
  }, [payrollsData])

  const totalRecords = useMemo(() => {
    if (!payrollsData) return 0
    if (typeof (payrollsData as any).count === 'number') return (payrollsData as any).count
    return payrollRows.length
  }, [payrollsData, payrollRows.length])

  const pageCount = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0

  // Dòng TỔNG CỘNG lấy từ khối `summary` của API — tổng trên TOÀN kỳ đã lọc, mọi trang.
  // Endpoint này phân trang thật, nên cộng `payrollRows` ở FE chỉ ra tổng của trang đang
  // xem dưới cái nhãn đọc như tổng cả kỳ.
  const totals = payrollsData?.summary

  // Gather IDs for name mapping
  const employeeIds = useMemo(() => {
    return Array.from(
      new Set(
        payrollRows
          .map((r) => r.beneficiary_employee_id)
          .filter((id): id is number => typeof id === 'number')
      )
    )
  }, [payrollRows])

  // Fetch names lookup
  const { data: employeesResponse } = useEmployeesByIds(employeeIds, {
    enabled: employeeIds.length > 0,
  })
  const { data: collaboratorsResponse } = useCollaborators({ page_size: 1000 })
  const { data: exchangesResponse } = useExchanges({ page_size: 1000 })

  const employeeMap = useMemo(() => {
    const map = new Map<number, any>()
    employeesResponse?.results?.forEach((e: any) => {
      map.set(e.id, e)
    })
    return map
  }, [employeesResponse])

  const collaboratorMap = useMemo(() => {
    const map = new Map<number, string>()
    ;(collaboratorsResponse?.results ?? []).forEach((c) => map.set(c.id, c.name || ''))
    return map
  }, [collaboratorsResponse])

  const exchangeMap = useMemo(() => {
    const map = new Map<number, string>()
    ;(exchangesResponse?.results ?? []).forEach((x) => map.set(x.id, x.name || ''))
    return map
  }, [exchangesResponse])

  const getBeneficiaryName = useCallback(
    (row: CommissionPayrollRow) => {
      const type = (row.beneficiary_type || '').toLowerCase()
      if (type === 'employee' && row.beneficiary_employee_id) {
        const emp = employeeMap.get(row.beneficiary_employee_id)
        return emp?.fullname || emp?.name || `Nhân viên #${row.beneficiary_employee_id}`
      }
      if (type === 'collaborator' && row.beneficiary_collaborator_id) {
        return (
          collaboratorMap.get(row.beneficiary_collaborator_id) ||
          `CTV #${row.beneficiary_collaborator_id}`
        )
      }
      if (type === 'exchange' && row.beneficiary_exchange_id) {
        return exchangeMap.get(row.beneficiary_exchange_id) || `Sàn #${row.beneficiary_exchange_id}`
      }
      return 'Không xác định'
    },
    [employeeMap, collaboratorMap, exchangeMap]
  )

  // Mutations
  const approveMutation = useApproveCommPayroll()
  const payMutation = useMarkPaidCommPayroll()

  const handleApprove = useCallback(
    async (id: number) => {
      // Chặn bấm lần hai khi lượt trước còn bay: menu 3 chấm đóng ngay sau click nên
      // không có nút nào để disable, `isPending` là chốt chặn duy nhất.
      if (approveMutation.isPending) return
      try {
        await approveMutation.mutateAsync({ role: 'manager', id })
        toastService.success('Đã phê duyệt đợt chi hoa hồng quản lý thành công')
        refetchList()
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [approveMutation, refetchList]
  )

  const handleMarkPaid = useCallback(
    async (id: number) => {
      if (payMutation.isPending) return
      try {
        await payMutation.mutateAsync({ role: 'manager', id })
        toastService.success('Xác nhận đã chi tiền thành công')
        refetchList()
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [payMutation, refetchList]
  )

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Bump mỗi lần mở dialog để remount cả form — đó là lý do form không cần `useEffect` đồng bộ
  // lại `initialValues` (xem `conventions.md` › Quy tắc Bộ lọc Trang Báo cáo).
  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((key) => key + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleApplyFilter = useCallback(() => {
    const values = filterFormRef.current?.getValues()
    if (!values) return
    setSearchParams(buildMgmtCommSummaryFilterParams(searchParams, values), { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const columns = useMemo<ColumnDef<CommissionPayrollRow>[]>(
    () => [
      {
        id: 'position',
        header: 'Chức vụ',
        cell: ({ row }) => {
          if (row.original.beneficiary_employee_id) {
            const emp = employeeMap.get(row.original.beneficiary_employee_id)
            return emp?.position?.name || emp?.position?.title || '-'
          }
          return '-'
        },
        meta: { width: 'w-[140px]', frozen: true },
      },
      {
        id: 'employee_code',
        header: 'Mã NV',
        cell: ({ row }) => {
          if (row.original.beneficiary_employee_id) {
            const emp = employeeMap.get(row.original.beneficiary_employee_id)
            return emp?.code || '-'
          }
          return '-'
        },
        meta: { width: 'w-[110px]', frozen: true },
      },
      {
        id: 'fullname',
        header: 'Họ và tên',
        cell: ({ row }) => getBeneficiaryName(row.original),
        meta: { width: 'w-[170px]', frozen: true },
      },
      {
        id: 'block',
        header: 'Khối',
        cell: ({ row }) => {
          if (row.original.beneficiary_employee_id) {
            const emp = employeeMap.get(row.original.beneficiary_employee_id)
            if (emp?.block?.name) return emp.block.name
          }
          const type = (row.original.beneficiary_type || '').toLowerCase()
          return type === 'employee'
            ? 'Nhân viên'
            : type === 'collaborator'
              ? 'Cộng tác viên'
              : type === 'exchange'
                ? 'Sàn giao dịch'
                : '-'
        },
        meta: { width: 'w-[120px]' },
      },
      {
        id: 'rate',
        header: 'Tỷ lệ',
        cell: () => '-',
        meta: { width: 'w-[90px]', align: 'right' },
      },
      {
        id: 'tp_amount',
        header: 'Hoa hồng TP',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.tp_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.tp_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'gd_amount',
        header: 'Hoa hồng GĐ',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.gd_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.gd_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'tgd_amount',
        header: 'Hoa Hồng TGĐ',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.tgd_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.tgd_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'bonus_tp',
        header: 'Thưởng TP',
        cell: () => '-',
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'bonus_gd',
        header: 'Thưởng GĐ',
        cell: () => '-',
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'bonus_gdda',
        header: 'Thưởng GĐ DA',
        cell: () => '-',
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'gdda_amount',
        header: 'HHGĐ Dự Án',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.gdda_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.gdda_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'bonus_hhbs',
        header: 'Thưởng HHBS',
        cell: ({ row }) =>
          row.original.promotion_amount && Number(row.original.promotion_amount) > 0
            ? `${formatCurrencyVND(Number(row.original.promotion_amount))} đ`
            : '-',
        footer: () => formatPayrollTotal(totals?.promotion_amount),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'bonus_tgd',
        header: 'Thưởng TGĐ',
        cell: () => '-',
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'bonus_secretary',
        header: 'Thưởng thư ký',
        cell: ({ row }) =>
          row.original.thu_ky_amount && Number(row.original.thu_ky_amount) > 0
            ? `${formatCurrencyVND(Number(row.original.thu_ky_amount))} đ`
            : '-',
        footer: () => formatPayrollTotal(totals?.thu_ky_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'investment',
        header: 'Đầu tư',
        cell: () => '-',
        meta: { width: 'w-[110px]', align: 'right' },
      },
      {
        id: 'back_commission',
        header: 'Backoffice',
        cell: ({ row }) =>
          row.original.backoffice_amount && Number(row.original.backoffice_amount) > 0
            ? `${formatCurrencyVND(Number(row.original.backoffice_amount))} đ`
            : '-',
        footer: () => formatPayrollTotal(totals?.backoffice_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      // Ba cột dưới đây phải nằm TRONG khoảng "Hoa hồng TP" → "F2": biểu mẫu đọc
      // "Cộng thực tế = Sum từ HH TP đến hết F2", nên đặt ra ngoài khoảng là công thức lại sai
      // dù con số đúng.
      //
      // Chúng in số kể cả khi bằng 0, theo đúng cách nhóm cột đã nối field làm sẵn
      // (`tp_amount`/`gd_amount`/`tgd_amount`/`gdda_amount`). Trên bảng này `'-'` dành cho cột
      // CHƯA có nguồn dữ liệu ("Thưởng TP", "Đầu tư", "F2"…) và cho khoản thưởng tuỳ có tuỳ không
      // ("Thưởng HHBS", "Thưởng thư ký", "Backoffice") — nên một cột đã nối field mà in `'-'` sẽ
      // đọc nhầm thành "chưa có dữ liệu" thay vì "bằng 0".
      {
        id: 'other_mgmt',
        header: 'HHQL khác',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.other_mgmt_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.other_mgmt_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'slk',
        header: 'HH Sàn liên kết',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.slk_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.slk_amount),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'transfer_net',
        header: 'Chuyển/Khấu trừ HHQL',
        // Màn tham chiếu "HH theo tháng — Quản lý" tách khái niệm này làm BA cột (khấu trừ cho
        // người khác / thưởng từ khấu trừ / khấu trừ khác). Ở đây gộp một cột có dấu vì bảng 20.14
        // đã 32 cột và chính BA vừa báo "thừa cột" (86eykqe00) — nhưng giữ nguyên cách đọc số âm
        // của màn kia (`text-data-red-default`) để hai màn không có hai thứ đỏ khác nhau.
        cell: ({ row }) => {
          const amount = Number(row.original.transfer_net_amount || 0)
          const text = `${formatCurrencyVND(amount)} đ`
          return amount < 0 ? <span className="text-data-red-default">{text}</span> : text
        },
        footer: () => formatPayrollTotal(totals?.transfer_net_amount),
        meta: { width: 'w-[170px]', align: 'right' },
      },
      {
        id: 'f2',
        header: 'F2',
        cell: () => '-',
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'actual_total',
        header: 'Cộng thực tế',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.role_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.role_amount),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'clawback',
        header: 'NS nghỉ ko TT/ Thu hồi HHQL',
        cell: () => '-',
        meta: { width: 'w-[180px]', align: 'right' },
      },
      // "Nhận qua ngân hàng" / "Nhận tiền mặt" đã bị bỏ (ClickUp 86eykqe00): chúng lặp
      // nghĩa với "Chuyển khoản" / "Tiền mặt" ở cuối bảng, và cả hai cặp đều chưa có
      // nguồn dữ liệu nên bảng cõng 4 cột gạch ngang cho cùng một khái niệm.
      {
        id: 'pit_amount',
        header: 'Thuế TNCN',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.pit_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.pit_amount),
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'pit_10',
        header: 'Thuế TNCN 10%',
        cell: () => '-',
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'net_payable',
        header: 'Thực nhận CK',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.net_payable || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.net_payable),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'advance_deduction',
        header: 'Trừ tạm ứng',
        cell: () => '-',
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'supp_comm',
        header: 'TT bổ sung HH',
        cell: () => '-',
        meta: { width: 'w-[130px]', align: 'right' },
      },
      // "Chuyển khoản" / "Tiền mặt" là tiền ĐÃ CHI, không phải tiền phải trả: BE cộng dòng
      // EmployeeCommissionPayoutBatchLine của batch đã `PAID`, phân loại theo `payment_method` của
      // phiếu chi. Kỳ chưa chi thì cả hai bằng 0 — đó là đúng, đừng "sửa" thành số phải trả.
      {
        id: 'bank_payout',
        header: 'Chuyển khoản',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.bank_payout_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.bank_payout_amount),
        meta: { width: 'w-[130px]', align: 'right' },
      },
      {
        id: 'cash_payout',
        header: 'Tiền mặt',
        cell: ({ row }) => `${formatCurrencyVND(Number(row.original.cash_payout_amount || 0))} đ`,
        footer: () => formatPayrollTotal(totals?.cash_payout_amount),
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'payout_total',
        header: 'Tổng',
        // Theo biểu mẫu: Tổng = Chuyển khoản + Tiền mặt (ClickUp 86eykqunv Bug1). KHÔNG phải
        // `pre_tax_total` như bản cũ — đó là tổng thu nhập trước thuế, một đại lượng khác hẳn và
        // nó đã có mặt ở cột "Cộng thực tế". Tiền chi bằng hình thức khác (bù trừ, cấn tạm ứng)
        // không nằm trong hai cột nguồn nên cũng không vào đây; cần "đã chi mọi hình thức" thì
        // đọc `paid_amount` của payout wave.
        cell: ({ row }) =>
          `${formatCurrencyVND(
            Number(row.original.bank_payout_amount || 0) +
              Number(row.original.cash_payout_amount || 0)
          )} đ`,
        // `totals` chưa về (đang tải) thì để `formatPayrollTotal` render "—"; cộng hai `?? 0` ở
        // đây sẽ hiện "0 đ" và đọc như "chưa chi đồng nào", một khẳng định chưa có cơ sở.
        footer: () =>
          formatPayrollTotal(
            totals
              ? Number(totals.bank_payout_amount ?? 0) + Number(totals.cash_payout_amount ?? 0)
              : undefined
          ),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'account_no',
        header: 'Số tk chuyển',
        cell: () => '-',
        meta: { width: 'w-[150px]' },
      },
      {
        // Nhãn + màu lấy từ component dùng chung (nhãn do BE trả qua `useAppConstant`), giống 4
        // bảng hoa hồng tháng anh em. Bản tự chế trước đây chỉ biết 'APPROVED' — một giá trị BE
        // KHÔNG hề có (`MonthlySummaryStatus` = DRAFT · CONFIRMED · EMAIL_SENT · PAID), nên phiếu
        // đã duyệt rơi vào nhánh mặc định và hiện ngược thành "Chưa duyệt".
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <MonthlySummaryStatusBadge status={row.original.status} />,
        meta: { width: 'w-[120px]', align: 'center' },
      },
    ],
    [getBeneficiaryName, totals]
  )

  // Thao tác đi theo đúng luồng của BE: DRAFT --duyệt--> CONFIRMED --gửi email đối chiếu-->
  // EMAIL_SENT --đánh dấu đã chi--> PAID. `mark_paid` của BE đòi EMAIL_SENT (CONFIRMED mà gọi là
  // 409), nên "Đánh dấu đã chi" chỉ hiện ở EMAIL_SENT. Bước gửi email nằm ở màn HHQL theo tháng.
  const actions: TableAction<CommissionPayrollRow>[] = useMemo(
    () => [
      {
        label: 'Duyệt bảng kê',
        icon: <IconCheck size={16} />,
        show: (record) => record.status === MonthlyStatus.DRAFT,
        onClick: (record) => handleApprove(record.summary_id),
      },
      {
        label: 'Đánh dấu đã chi',
        icon: <IconMoney size={16} />,
        show: (record) => record.status === MonthlyStatus.EMAIL_SENT,
        onClick: (record) => handleMarkPaid(record.summary_id),
      },
    ],
    [handleApprove, handleMarkPaid]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="20.14 HHQL bảng Tổng"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã NV, họ tên..."
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterCount}
        toolbarLeftContent={
          <div className="flex items-center gap-2">
            <AccountingPeriodSelect
              periods={periods}
              selectedPeriodId={activePeriodId}
              onSelect={(periodId) => {
                const period = periods.find((p) => p.id === periodId)
                if (period) {
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set('year', String(period.year))
                  newParams.set('month', String(period.month))
                  newParams.set('page', '1') // Reset page on period change
                  setSearchParams(newParams, { replace: true })
                }
              }}
            />
          </div>
        }
      />

      <Flex flexGrow="1" direction="column" gap="4" className="overflow-hidden">
        <Table
          data={payrollRows}
          columns={columns}
          showSTT
          enablePagination
          manualPagination
          pageCount={pageCount}
          pageSize={pageSize}
          currentPageIndex={page - 1}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          isLoading={isLoadingList}
          showActions
          rowActions={actions}
          // Bấm vào dòng mở menu ở CẢ HAI chế độ (`TableRow.handleRowClick` luôn gọi
          // `triggerActionMenu`); khác nhau chỉ ở chỗ menu neo vào đâu — `cursor` thả nổi tại con
          // trỏ, `cell` neo vào đúng nút ⋮.
          // Trước đây chọn `cell` "cho khớp 6 bảng kế toán anh em"; cả 7 bảng đó nay đã về
          // `cursor` (CR 86eyqrn7k, 25/08) nên lý do ấy không còn. Với bảng rộng 4384px ngay dưới
          // đây thì `cursor` mới là lựa chọn đúng: neo vào ô cuối là bắt người dùng kéo ngang hết
          // bảng chỉ để bấm một hành động.
          actionMenuPosition="cursor"
          emptyMessage="Không có dữ liệu tổng hợp hoa hồng quản lý cho kỳ này."
          className="flex-1 px-7"
          // Bảng rộng 4384px: `static` mới dựng thanh cuộn ngang cố định ở đáy trang cạnh thanh
          // phân trang, thay vì bắt người dùng cuộn xuống hết bảng mới thấy thanh cuộn.
          // `disableInnerOverflow` đi kèm là BẮT BUỘC — để nguyên `overflow-x-auto` của container
          // trong là ra hai thanh cuộn ngang chồng nhau.
          paginationPosition="static"
          disableInnerOverflow
          // Bộ ba `static` + `disableInnerOverflow` + `stickyHeader` luôn đi cùng nhau ở trang
          // danh sách (`docs/ai/conventions.md` §9). Bảng này 32 cột và là màn ĐỐI SOÁT: cuộn
          // xuống giữa bảng mà mất hàng tiêu đề thì không còn biết cột tiền nào là cột nào.
          // `sticky top-0` sẵn có trong `TableHeader` KHÔNG tự chạy — phải bật prop này để
          // viewport bị chặn chiều cao và trở thành scrollport thật.
          //
          // Kèm theo: `Table` truyền `hasOwnScrollContainer` xuống `TableFooter`, nên dòng TỔNG
          // CỘNG chuyển sang `sticky bottom-0` thật thay vì phép nâng theo `window.innerHeight`
          // — phép nâng đó giả định thứ cuộn là cả TRANG và sẽ đè lên dòng cuối khi bảng tự cuộn.
          stickyHeader
          showSummaryRow
          // Số bản ghi mà `summary` bao phủ, do chính BE đếm — không phải `payrollRows.length`
          // (số dòng của trang đang xem), để nhãn "N bản ghi" luôn khớp với con số bên cạnh nó.
          summaryRowCount={totals?.beneficiary_count ?? totalRecords}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <MgmtCommSummaryFilter
            // Remount mỗi lần mở dialog ⇒ `defaultValues` luôn tươi, nên form không cần (và
            // không được có) `useEffect` đồng bộ lại `initialValues`.
            key={filterDialogOpenKey}
            ref={filterFormRef}
            initialValues={currentFilters}
          />
        }
        onClearFilter={() => filterFormRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
