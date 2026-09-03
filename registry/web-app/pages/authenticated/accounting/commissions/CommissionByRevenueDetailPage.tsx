import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { PageTitle, Table, ColumnDef, Button, Chip } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { ReferenceCode } from '@/components/commons'
import EmployeeProfileLink from '@/components/commons/EmployeeProfileLink'
import AppDialog from '@/components/dialog/AppDialog'
import {
  useDepartmentMonthlyKpi,
  useEmployeeMonthlyKpis,
} from '@/features/accounting/department-monthly-kpi/services/department-monthly-kpi-service'
import { formatCurrencyVND, formatNumber, parsePositiveInt } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { ColoredValueVariant, components } from '@/api/schema'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { cn } from '@/utils'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { getMonthlySummaryService } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  EmployeeMonthlyKpiFilter,
  EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS,
  type EmployeeMonthlyKpiFilterFormData,
  type EmployeeMonthlyKpiFilterRef,
} from '@/features/accounting/employee-monthly-kpi/components/EmployeeMonthlyKpiFilter'
import { exportElementToPdf } from '@/utils/exportChart'
import { IconDownload } from '@/assets/icons'
// CR 86eyj31ch R5: bộ phân trang dùng chung của hệ thống (25/50/100) thay cho bộ 10/20/50/100
// riêng của màn này.
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { readUnresolved } from '@/features/accounting/management-commission/constants/unresolved-role'
import type { TableAction } from '@/types/table'

type EmployeeMonthlyKpiRow = components['schemas']['EmployeeMonthlyKpi']

/**
 * Dấu chỗ cho ô rỗng (CR 86eyj31ch R8). Một hằng số thay vì rải chuỗi khắp `accessorFn`:
 * trước đây màn này in `'---'`, và sửa sót một chỗ thì lệch hiển thị chỉ lộ ra ở đúng dòng
 * có dữ liệu rỗng — thứ khó bắt nhất khi review.
 */
const EMPTY_PLACEHOLDER = '-'

const SEARCH_DEBOUNCE_MS = 500

export function CommissionByRevenueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const departmentMonthlyKpiId = Number(id)

  const { data, isLoading, isError } = useDepartmentMonthlyKpi(departmentMonthlyKpiId)

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterFormRef = useRef<EmployeeMonthlyKpiFilterRef>(null)

  const page = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  /**
   * Bộ lọc ĐÃ áp dụng, phân giải đúng một lần — request, badge và dialog đều đọc từ đây.
   *
   * Id đi qua `parsePositiveInt` chứ không phải `Number`: `?position=abc` mà dùng `Number` thì
   * gửi đi `NaN` (BE trả 400), còn `?position=0` thì gửi một khoá không tồn tại và bảng rỗng —
   * cả hai đều kèm badge "1" khoe rằng có bộ lọc đang chạy. Đếm badge bằng ĐÚNG giá trị mà
   * request dùng là luật đã rút ra từ CR bộ lọc màn list (xem `docs/ai/domain`).
   */
  const employeeParam = searchParams.get('employee')
  const positionParam = searchParams.get('position')
  const employeeTypeParam = searchParams.get('employee_type_snapshot')
  // Phụ thuộc vào GIÁ TRỊ chứ không vào identity của `searchParams`: `searchParams` là object
  // mới sau mỗi lần đổi URL, kể cả khi chỉ đổi trang hay gõ ô tìm kiếm. Memo theo identity thì
  // `currentFilters` cũng đổi theo, kéo `reset()` trong dialog chạy — xoá trắng thứ người dùng
  // vừa chọn dở nếu dialog đang mở. Đúng cái bẫy đã ghi lại ở bộ lọc màn list.
  const appliedFilters = useMemo(
    () => ({
      employee: parsePositiveInt(employeeParam),
      position: parsePositiveInt(positionParam),
      employee_type_snapshot: employeeTypeParam || undefined,
    }),
    [employeeParam, positionParam, employeeTypeParam]
  )
  const search = searchParams.get('search') || ''

  // R1: ô tìm kiếm nằm ngoài dialog. URL là nguồn sự thật, `searchInput` chỉ là những gì user
  // đang gõ dở — tách ra để mỗi phím không thành một request.
  const [searchInput, setSearchInput] = useState(search)
  const [debouncedSearch] = useDebounceValue(searchInput, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    if (debouncedSearch === search) return
    const newParams = new URLSearchParams(searchParams)
    if (debouncedSearch) newParams.set('search', debouncedSearch)
    else newParams.delete('search')
    // Về trang 1: kết quả tìm kiếm thu hẹp lại thì trang 5 cũ thường không còn tồn tại, và
    // một trang rỗng đọc ra thành "không tìm thấy gì" chứ không phải "hết trang".
    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
  }, [debouncedSearch, search, searchParams, setSearchParams])

  // Dialog seed lại từ giá trị đã phân giải, không phải từ chuỗi thô trên URL: mở dialog ra mà
  // thấy "position = abc" trong khi danh sách không hề lọc theo nó là tự mâu thuẫn.
  const currentFilters = useMemo<EmployeeMonthlyKpiFilterFormData>(
    () => ({
      employee: appliedFilters.employee != null ? String(appliedFilters.employee) : null,
      position: appliedFilters.position != null ? String(appliedFilters.position) : null,
      employee_type_snapshot: appliedFilters.employee_type_snapshot ?? null,
    }),
    [appliedFilters]
  )

  const filterBadgeCount = useMemo(
    () =>
      EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS.filter((field) => appliedFilters[field] !== undefined)
        .length,
    [appliedFilters]
  )

  // R9: đúng MỘT request cho bảng. Trước đây màn này gọi hook hai lần — lần thứ hai kéo toàn
  // bộ bản ghi chỉ để cộng ra dòng TỔNG. R6 bỏ dòng TỔNG, nên query đó cũng đi theo.
  const {
    data: employeeData,
    isLoading: isEmployeeLoading,
    error: employeeError,
  } = useEmployeeMonthlyKpis(
    {
      department_monthly_kpi: departmentMonthlyKpiId,
      page,
      page_size: pageSize,
      employee: appliedFilters.employee,
      position: appliedFilters.position,
      employee_type_snapshot: appliedFilters.employee_type_snapshot as
        | EmployeeMonthlyKpiRow['employee_type_snapshot']
        | undefined,
      search: search || undefined,
    },
    { enabled: !!departmentMonthlyKpiId }
  )

  // Query list không tự toast lỗi (chỉ mutation mới có), mà bảng rỗng lại là kết quả hợp lệ của
  // chính màn này — nên một cú 400/500 hiện ra y hệt "phòng này không có nhân viên nào khớp".
  // Các param của CR làm ngõ đó rộng thêm: `employee_type_snapshot` sai giá trị hay `position`
  // không phải số đều bị BE trả 400.
  useEffect(() => {
    if (employeeError) toastService.error(extractErrorMessage(employeeError))
  }, [employeeError])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))
    EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS.forEach((field) => {
      const value = formData[field]
      if (value) newParams.set(field, String(value))
      else newParams.delete(field)
    })

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const tableCardRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })

      if (tableCardRef.current) {
        tableCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (exportRef.current) {
        exportRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [searchParams, setSearchParams]
  )

  const handleExportPdf = useCallback(async () => {
    if (!exportRef.current) return
    const filename = `ChiTietHH_DT_${data?.department_detail?.name || 'Phong'}_Ky_${data?.month}_${data?.year}.pdf`
    try {
      await exportElementToPdf(exportRef.current, {
        fileName: filename,
        overlayMessage: 'Đang tạo PDF...',
      })
    } catch (error) {
      toastService.error('Có lỗi xảy ra khi xuất PDF')
    }
  }, [data])

  const breadcrumb = useMemo(() => {
    return [
      { label: 'Kế toán', href: APP_PATH.DASHBOARD || '/accounting/dashboard' },
      { label: 'Hoa hồng quản lý' },
      { label: 'HH theo doanh thu', href: APP_PATH.COMMISSION_BY_REVENUE },
      { label: data?.department_detail?.name || 'Chi tiết' },
    ]
  }, [data])

  const pageTitle = useMemo(() => {
    if (!data?.department_detail?.name) return 'Chi tiết phòng'
    return `Chi tiết phòng · ${data.department_detail.name}`
  }, [data])

  // R7 chuyển chi nhánh / khối / phòng ban thành một dải riêng phía trên các thẻ, nên phụ đề
  // chỉ còn giữ kỳ và mức hoàn thành — để cùng một thông tin không hiện hai chỗ.
  const displaySubtitle = useMemo(() => {
    if (!data) return ''
    const monthStr = data.month ? `0${data.month}`.slice(-2) : '--'
    const period = `Kỳ ${monthStr}/${data.year || '----'}`
    const completion = `${formatNumber(data.completion_pct || 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% hoàn thành chỉ tiêu quản lý`
    return `${period} • ${completion}`
  }, [data])

  /**
   * R7: chi nhánh / khối / phòng ban, hiển thị TRÊN hai thẻ số liệu.
   *
   * Cột "Phòng ban" bị bỏ khỏi bảng vì mọi dòng đều cùng một giá trị — lặp lại nó ở từng dòng
   * chiếm chỗ mà không phân biệt được gì. Ba giá trị này thuộc về phạm vi của cả trang.
   */
  const orgScope = useMemo(() => {
    const detail = data?.department_detail
    return [
      { label: 'Chi nhánh', value: detail?.branch?.name || EMPTY_PLACEHOLDER },
      { label: 'Khối', value: detail?.block?.name || EMPTY_PLACEHOLDER },
      { label: 'Phòng ban', value: detail?.name || EMPTY_PLACEHOLDER },
    ]
  }, [data])

  const cards = useMemo(() => {
    if (!data) return []

    const defaultCards = [
      {
        label: 'Doanh số phòng',
        value: Number(data.actual_amount || 0),
        color: 'text-neutral-900',
        suffix: '₫',
      },
      {
        label: 'Chỉ tiêu quản lý',
        // Sửa map nhầm field, user báo 2026-08-27: thẻ này từng lấy `business_target_amount`
        // nên cùng một phòng cùng một kỳ hiện hai số khác nhau ở hai màn.
        //
        // `target_amount` = "Management target amount" ở BE và là MẪU SỐ của `completion_pct`
        // mà phụ đề trang này in ra (`actual / target_amount × 100`,
        // `management_commission_service._compute`) — nên nó mới là "Chỉ tiêu quản lý".
        // `business_target_amount` = "Business target amount" vẫn đúng chỗ của nó: cột
        // "Chỉ tiêu kinh doanh" của bảng nhân viên bên dưới. Chi tiết + phép thử để phân biệt
        // hai field: docs/ai/domain/accounting-vouchers-commissions.md.
        value: Number(data.target_amount || 0),
        color: 'text-neutral-500',
        suffix: '₫',
      },
    ]

    const splitCards = (data.manager_splits || []).map((split) => {
      const rate = split.pct ? `${Number(split.pct)}%` : '0%'
      const amount = Number(split.amount || 0)
      const roleUpper = String(split.role || '').toUpperCase()

      let roleStr = 'TGĐ'
      let color = 'text-purple-600'
      if (roleUpper === 'TPKD' || roleUpper === 'TP') {
        roleStr = 'TP'
        color = 'text-blue-600'
      } else if (roleUpper === 'GDKD' || roleUpper === 'GD') {
        roleStr = 'GĐ'
        color = 'text-sky-600'
      } else if (roleUpper === 'CEO') {
        roleStr = 'TGĐ'
        color = 'text-purple-600'
      } else if (roleUpper === 'SALE_ADMIN_LEAD' || roleUpper === 'TKKD') {
        roleStr = 'TKKD'
        color = 'text-amber-600'
      }

      return {
        // Bug 86eyr1vam: khoản này là HOA HỒNG quản lý, không phải thưởng — nó lấy từ
        // `manager_splits[].amount`, thứ BE phát thành `CommissionPayable`. Màn danh sách đã
        // gọi đúng ("HH Quản lý Trưởng phòng / Giám đốc / Tổng giám đốc"), chỉ thẻ số liệu ở
        // màn chi tiết này còn ghi "Thưởng" nên hai màn nói khác nhau về cùng một con số.
        label: `HH ${roleStr} (${rate})`,
        value: amount,
        color,
        suffix: '₫',
      }
    })

    return [...defaultCards, ...splitCards]
  }, [data])

  const handleViewEmployeeCommission = useCallback(
    async (row: EmployeeMonthlyKpiRow) => {
      const empId = row.employee
      const targetYear = data?.year
      const targetMonth = data?.month
      if (!empId || !targetYear || !targetMonth) return

      try {
        const res = await getMonthlySummaryService().getMonthlySummaries('employees', {
          beneficiary_employee: empId,
          year: targetYear,
          month: targetMonth,
        })
        const summary = res.results?.[0]
        if (summary?.id) {
          navigate(APP_PATH.COMMISSION_SALE_MONTHLY_DETAIL.replace(':id', String(summary.id)))
        } else {
          toastService.warning('Chưa có bảng tổng hợp hoa hồng cho nhân viên này trong kỳ.')
        }
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [data?.year, data?.month, navigate]
  )

  const columns = useMemo<ColumnDef<EmployeeMonthlyKpiRow>[]>(
    () => [
      {
        // R2: mã NV và họ tên gộp thành một cột. R3: tên để màu đen — `EmployeeProfileLink`
        // mặc định tô đỏ theo action token, ở đây cả cột đều là link nên màu đó không còn
        // phân biệt được gì, chỉ làm bảng ồn.
        id: 'employee',
        accessorFn: (row) => row.employee_detail?.fullname || EMPTY_PLACEHOLDER,
        header: 'Nhân viên',
        cell: ({ row }) => {
          const detail = row.original.employee_detail
          const fullname = detail?.fullname || EMPTY_PLACEHOLDER
          return (
            <div className="flex flex-col items-start gap-1">
              <EmployeeProfileLink
                employeeId={row.original.employee}
                className="text-content-dark-1 text-sm font-medium"
                title={fullname}
              >
                {fullname}
              </EmployeeProfileLink>
              <ReferenceCode code={detail?.code} fallback={EMPTY_PLACEHOLDER} />
            </div>
          )
        },
        meta: { width: 'w-[220px]' },
      },
      {
        id: 'position',
        accessorFn: (row) => row.employee_detail?.position?.name || EMPTY_PLACEHOLDER,
        header: 'Chức vụ',
        cell: ({ getValue }) => (getValue() as string) || EMPTY_PLACEHOLDER,
        meta: { width: 'w-[120px]' },
      },
      {
        id: 'startDate',
        accessorFn: (row) => row.employee_start_date,
        header: 'Ngày làm việc',
        // `formatDate` đã trả về '-' cho giá trị rỗng, khớp sẵn quy ước dấu chỗ của màn.
        cell: ({ getValue }) => formatDate(getValue() as string | null),
        meta: { width: 'w-[120px]' },
      },
      {
        id: 'empType',
        accessorFn: (row) => row.employee_type_label || EMPTY_PLACEHOLDER,
        header: 'Loại NV',
        cell: ({ getValue, row }) => {
          const label = getValue() as string
          const isOfficial = row.original.employee_type_snapshot === 'OFFICIAL'
          return (
            <Chip
              label={label}
              variant={isOfficial ? ColoredValueVariant.BLUE : ColoredValueVariant.YELLOW}
            />
          )
        },
        meta: { width: 'w-[180px]', align: 'center' },
      },
      {
        id: 'note',
        accessorFn: (row) => row.employee_note || '',
        header: 'Ghi chú',
        // Ghi chú nhân sự là text tự do không giới hạn độ dài — cắt một dòng kèm `title` để một
        // ghi chú dài không đội chiều cao cả hàng lên gấp mấy lần các hàng còn lại. Ô rỗng thì
        // không gắn `title`: dấu chỗ có bị cắt đâu mà cần tooltip.
        cell: ({ getValue }) => {
          const note = getValue() as string
          if (!note) return EMPTY_PLACEHOLDER
          return (
            <span className="block truncate" title={note}>
              {note}
            </span>
          )
        },
        meta: { width: 'w-[150px]' },
      },
      {
        // Nhãn cột là "Ngày đổi trạng thái", nhưng nghiệp vụ xác nhận (2026-08-08) muốn nói
        // đổi LOẠI nhân viên — nên field đọc là `employee_type_change_date`. Hai sự kiện này
        // nằm cùng một nhật ký công tác và đều cho ra ngày trông hợp lệ, chọn nhầm thì nhìn
        // màn hình không thể phát hiện.
        id: 'typeChangeDate',
        accessorFn: (row) => row.employee_type_change_date,
        header: 'Ngày đổi trạng thái',
        cell: ({ getValue }) => formatDate(getValue() as string | null),
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'workingDays',
        accessorFn: (row) => (row.standard_working_days ? Number(row.standard_working_days) : 0),
        header: 'Ngày công',
        cell: ({ getValue }) => {
          const val = Number(getValue() || 0)
          return <span className="text-neutral-800">{val}</span>
        },
        meta: { width: 'w-[90px]', align: 'center' },
      },
      {
        id: 'target',
        accessorFn: (row) => (row.business_target_amount ? Number(row.business_target_amount) : 0),
        header: 'Chỉ tiêu kinh doanh',
        cell: ({ getValue }) => {
          const val = Number(getValue() || 0)
          return <span className="text-neutral-600">{formatCurrencyVND(val)}</span>
        },
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'revenue',
        accessorFn: (row) => (row.actual_revenue ? Number(row.actual_revenue) : 0),
        header: 'Doanh số',
        cell: ({ getValue }) => {
          const val = Number(getValue() || 0)
          return <span className="font-semibold text-neutral-900">{formatCurrencyVND(val)}</span>
        },
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'deals',
        accessorFn: (row) => row.revenue_deals_count || 0,
        header: 'Số GD',
        cell: ({ getValue }) => getValue() as number,
        meta: { width: 'w-[80px]', align: 'center' },
      },
      {
        id: 'completion',
        accessorFn: (row) =>
          row.business_completion_pct ? Number(row.business_completion_pct) : 0,
        header: 'Tỷ lệ',
        cell: ({ getValue }) => {
          const val = getValue() as number
          let variant = ColoredValueVariant.RED
          if (val >= 121) variant = ColoredValueVariant.GREEN
          else if (val >= 70) variant = ColoredValueVariant.BLUE
          else if (val >= 50) variant = ColoredValueVariant.YELLOW

          return (
            <Chip
              label={`${formatNumber(val, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              variant={variant}
            />
          )
        },
        meta: { width: 'w-[100px]', align: 'center' },
      },
    ],
    []
  )

  /**
   * "Xem hoa hồng" chạm HAI resource của BE, nên nó cần HAI mã quyền thuộc hai subject khác
   * nhau — gộp về một subject cho gọn chính là cách đẻ ra lỗi (`docs/ai/conventions.md` §
   * "Gate một hành động bằng đúng quyền mà hành động đó GỌI TỚI", tiền lệ `ProductInventoryTable`
   * / ClickUp 86eynyqfh):
   *
   * 1. tra bảng tổng hợp — `GET /api/accounting/monthly-summaries/employees/`
   *    ⇒ `employeemonthlycommissionsummary.list`
   * 2. điều hướng sang chi tiết HH — route `COMMISSION_SALE_MONTHLY_DETAIL` khai
   *    `permission: 'salesmonthlycommissionsummary.retrieve'` trong `AppRoute.tsx`
   *
   * Thiếu (1) ⇒ 403 rồi toast lỗi; thiếu (2) ⇒ `PermissionGuard` đẩy sang `/unauthorized`.
   * Cả hai đều là ngõ cụt, nên action chỉ được hiện khi có ĐỦ cả hai (ClickUp 86eync7g0).
   *
   * Dựng mảng theo điều kiện (thay vì `show:`) vì quyền ở đây không phụ thuộc vào dòng: mảng
   * rỗng làm `Table` bỏ luôn cả nút ⋯ lẫn menu ngữ cảnh, không để lại menu rỗng bấm được.
   */
  const rowActions = useMemo<TableAction<EmployeeMonthlyKpiRow>[]>(() => {
    const canReadEmployeeSummaries = ability.can('list', 'employeemonthlycommissionsummary')
    const canOpenSaleCommissionDetail = ability.can('retrieve', 'salesmonthlycommissionsummary')
    if (!canReadEmployeeSummaries || !canOpenSaleCommissionDetail) return []

    return [
      {
        label: 'Xem hoa hồng',
        onClick: (row: EmployeeMonthlyKpiRow) => {
          handleViewEmployeeCommission(row)
        },
      },
    ]
  }, [ability, handleViewEmployeeCommission])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={pageTitle}
        sub={displaySubtitle}
        enableBackButton
        breadcrumb={breadcrumb}
        handleSearch={setSearchInput}
        searchPlaceholder="Tìm theo tên, mã nhân viên"
        searchValue={searchInput}
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
        customActions={
          <Button
            variant="secondary-border"
            leftIcon={<IconDownload />}
            className="print:hidden"
            onClick={handleExportPdf}
          >
            Xuất PDF
          </Button>
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={!data}
        isError={isError}
        hasPermission={ability.can('retrieve', 'departmentmonthlykpi')}
      >
        {/*
          `pb-20` (80px) thay cho `pb-6` chuẩn: `Table` bên dưới dùng `paginationPosition="static"`,
          tức thanh cuộn ngang + phân trang nằm trong khối `fixed bottom-0` ĐÈ lên nội dung chứ
          không đẩy nội dung lên. Không chừa đủ chỗ thì dòng cuối bảng bị che (86eyj31ch).

          80px = 62px chiều cao khối đó (đo ở zoom 100%) + ~18px thở. Đúng bằng 62px thì ở zoom
          67–80% khoảng hở rơi xuống 1px, sát tới mức làm tròn nửa pixel cũng cắn vào viền.

          Khoảng chừa đặt ở wrapper trang, KHÔNG phải `pb-16` mặc định bên trong `Table`: ở màn
          này bảng nằm trong thẻ có viền, chừa bên trong thẻ sẽ thành dải trắng trông như một
          dòng rỗng thừa ngay dưới dòng cuối.
        */}
        <div ref={exportRef} className="flex flex-1 flex-col gap-4 overflow-hidden px-7 pt-4 pb-20">
          {/* Summary cards & Management roster */}
          <div className="flex shrink-0 flex-col gap-4">
            {/* R7: phạm vi tổ chức của cả trang, đặt trên các thẻ số liệu */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              {orgScope.map((item) => (
                <div key={item.label} className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-neutral-800">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {cards.map((c, i) => (
                <div key={i} className="border-border-1 rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                    {c.label}
                  </div>
                  <div className={cn('mt-1.5 text-xl font-extrabold', c.color)}>
                    {formatCurrencyVND(c.value).replace(' ₫', '')}{' '}
                    <span className="text-xs font-semibold text-neutral-400">{c.suffix}</span>
                  </div>
                </div>
              ))}
            </div>

            {!!data?.manager_splits && data.manager_splits.length > 0 && (
              <div className="border-border-1 rounded-xl border bg-white p-5 shadow-sm">
                <div className="mb-3 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                  Ban quản lý phụ trách phòng ban
                </div>
                <div className="flex flex-wrap gap-8 lg:gap-14">
                  {data.manager_splits.map((split, i) => {
                    const roleUpper = String(split.role || '').toUpperCase()
                    let roleLabel: string = split.role || 'Quản lý'
                    let roleColor = 'text-neutral-600'
                    if (roleUpper === 'TPKD' || roleUpper === 'TP') {
                      roleLabel = 'Trưởng phòng'
                      roleColor = 'text-blue-600'
                    } else if (roleUpper === 'GDKD' || roleUpper === 'GD') {
                      roleLabel = 'Giám đốc khối'
                      roleColor = 'text-sky-600'
                    } else if (roleUpper === 'CEO') {
                      roleLabel = 'Tổng giám đốc'
                      roleColor = 'text-purple-600'
                    } else if (roleUpper === 'SALE_ADMIN_LEAD' || roleUpper === 'TKKD') {
                      roleLabel = 'Trưởng phòng TKKD'
                      roleColor = 'text-amber-600'
                    }

                    const emp = (split as any).employee_detail
                    // `unresolved` / `unresolved_reason` chưa có trong schema.ts (chỉ sinh lại
                    // từ BE đã deploy) nên đọc bằng ép kiểu tại chỗ.
                    const { unresolved, reasonLabel } = readUnresolved(split)
                    // Vai không có người nhận thì kỳ này KHÔNG sinh phiếu cho vai đó. Để dấu
                    // gạch ngang ở đây đọc như "chưa nhập tên", trong khi thật ra là một khoản
                    // tiền đã rơi khỏi kỳ — phải nói thẳng.
                    if (unresolved) {
                      return (
                        <div key={i} className="flex flex-col gap-1">
                          <span
                            className={cn(
                              'flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase',
                              roleColor
                            )}
                          >
                            {roleLabel}
                          </span>
                          <span className="text-text-warning-default text-sm font-semibold">
                            Chưa có người nhận
                          </span>
                          <span className="text-text-warning-default text-xs font-normal">
                            {reasonLabel} — kỳ này không sinh phiếu
                          </span>
                        </div>
                      )
                    }
                    return (
                      <div key={i} className="flex flex-col gap-1">
                        <span
                          className={cn(
                            'flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase',
                            roleColor
                          )}
                        >
                          {roleLabel}
                        </span>
                        <span className="text-sm font-semibold text-neutral-800">
                          {emp?.fullname || EMPTY_PLACEHOLDER}
                        </span>
                        <span className="font-mono text-xs font-normal text-neutral-400">
                          {emp?.code || EMPTY_PLACEHOLDER}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Employee table card */}
          <div
            ref={tableCardRef}
            className="border-border-1 flex flex-1 flex-col overflow-hidden border bg-white"
          >
            <div className="flex flex-1 flex-col overflow-hidden">
              <Table
                columns={columns}
                data={employeeData?.results || []}
                isLoading={isEmployeeLoading}
                pageCount={Math.ceil((employeeData?.count || 0) / pageSize)}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZES}
                currentPageIndex={page - 1}
                totalRecords={employeeData?.count || 0}
                onPaginationChange={handlePaginationChange}
                showSTT
                manualPagination
                paginationPosition="static"
                disableInnerOverflow
                // `!pb-0` để khung bảng ôm sát dòng cuối. Khoảng chừa cho khối phân trang
                // `fixed bottom-0` nằm ở `pb-16` của wrapper trang — đặt ở ĐÂY (bên trong thẻ
                // có viền) thì nó hiện ra thành một dải trắng như dòng rỗng thừa.
                className="flex-1 !space-y-0 overflow-hidden !px-0 !pb-0"
                tableContainerClassName="border-0 pt-0 pb-0 flex-1 overflow-auto"
                showActions
                rowActions={rowActions}
              />
            </div>
          </div>
        </div>
      </DetailPageWrapper>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <EmployeeMonthlyKpiFilter
            ref={filterFormRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
            department={data?.department}
          />
        }
        onClearFilter={() => filterFormRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}

export default CommissionByRevenueDetailPage
