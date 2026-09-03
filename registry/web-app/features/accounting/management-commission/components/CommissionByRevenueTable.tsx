import { useCallback, useMemo } from 'react'
import { ColumnDef, Table, Chip, Dash } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DepartmentMonthlyKpi,
  DepartmentMonthlyKpiSummary,
} from '../../department-monthly-kpi/types/department-monthly-kpi-types'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { formatSummaryCurrency, toSummaryNumber } from '@/utils/table/summary'
import { useStickyTableHeader } from '@/hooks/useStickyTableHeader'
import { PAGE_SIZES } from '@/constants/table'
import { readUnresolved } from '../constants/unresolved-role'
import { cn } from '@/utils'
import {
  ColoredValueVariant,
  _ManagerSplitRole as ManagerSplitRole,
  type components,
} from '@/api/schema'
import { useAbility } from '@/lib/ability'
import { COMMISSION_ACTION_PERMISSION } from '@/features/accounting/commissions/constants/commission-permissions'

/**
 * Which org levels the list is already narrowed to.
 *
 * A column repeating the value the user just filtered on carries no information, so each flag
 * drops its own column and the page prints the chosen value above the table instead.
 */
export type CommissionByRevenueScope = {
  branch: boolean
  block: boolean
  department: boolean
}

type CommissionByRevenueTableProps = {
  data: DepartmentMonthlyKpi[]
  /**
   * Tổng của TOÀN tập đã lọc, do BE trả cạnh `results`.
   *
   * Không bao giờ cộng lại từ `data`: đó là một trang, và tổng của nó sẽ nằm im dưới cái nhãn
   * "TỔNG CỘNG" đọc như tổng của cả bộ lọc.
   */
  summary?: DepartmentMonthlyKpiSummary
  isLoading: boolean
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  scope: CommissionByRevenueScope
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onViewDetail: (id: number) => void
}

/** Dòng phụ do bảng tự chèn: tiêu đề nhóm, cộng nhóm. */
type SyntheticRowKind = 'group' | 'groupTotal'

/** Scopes the sticky-header lookup to this table only. */
const TABLE_SCOPE_CLASS = 'js-comm-by-revenue-table'

/**
 * The three manager bonuses render as plain black figures.
 *
 * They used to be blue / sky / purple, which read as three unrelated categories when they are
 * one payout split three ways — and put three more colours on a row that already colour-codes
 * the completion chip.
 */
const AMOUNT_CLASS = 'text-content-dark-1'

/**
 * Số cột mà nhãn "Cộng nhóm" nuốt: STT + Chi nhánh + Khối + Phòng ban.
 *
 * Cố định được vì dòng nhóm CHỈ tồn tại khi chưa lọc theo đơn vị nào (`isOrgScoped`); lúc đó
 * ba cột tổ chức luôn hiển thị và hai cột số lượng chưa được đẩy lên đầu. Có test khoá.
 */
const GROUP_TOTAL_LABEL_SPAN = 4

type ManagerSplit = components['schemas']['_ManagerSplit']

/**
 * Ba vai được cột hoá trên bảng, khoá theo enum sinh từ schema.
 *
 * Khoá bằng `Record<...>` chứ không phải chuỗi trần: BE đổi mã vai thì đây thành lỗi biên dịch,
 * thay vì `.find()` trả `undefined` rồi mọi dòng cộng nhóm âm thầm báo 0 mà không có dấu hiệu gì.
 * `SALE_ADMIN_LEAD` cố ý không có mặt — bảng này chỉ trình bày ba cấp TP / GĐ / TGĐ, đúng bằng
 * ba cột tiền mà `summary` của BE trả về.
 */
const ROLE_TOTAL_KEYS: Record<'TPKD' | 'GDKD' | 'CEO', string> = {
  [ManagerSplitRole.TPKD]: 'tpkd_amount_total',
  [ManagerSplitRole.GDKD]: 'gdkd_amount_total',
  [ManagerSplitRole.CEO]: 'ceo_amount_total',
}

type ManagerRole = keyof typeof ROLE_TOTAL_KEYS

/**
 * Cộng các dòng của MỘT nhóm trong trang hiện tại — chỉ dùng cho dòng "Cộng nhóm".
 *
 * Tên có chữ `Group` để khỏi lẫn với `sumRows` của `@/utils/table/summary`, hàm dùng chung có
 * hợp đồng ngược lại (trả `null` khi không có số nào để cộng).
 */
function sumGroupRows(rows: DepartmentMonthlyKpi[]) {
  const add = (selector: (row: DepartmentMonthlyKpi) => unknown) =>
    rows.reduce((acc, row) => acc + (toSummaryNumber(selector(row)) ?? 0), 0)

  return {
    actual_amount: add((row) => row.actual_amount),
    target_amount: add((row) => row.target_amount),
    tpkd_amount_total: add((row) => splitOf(row, 'TPKD')?.amount),
    gdkd_amount_total: add((row) => splitOf(row, 'GDKD')?.amount),
    ceo_amount_total: add((row) => splitOf(row, 'CEO')?.amount),
  }
}

function groupKeyOf(row: any) {
  const branch = row.department_detail?.branch
  const block = row.department_detail?.block
  return `${branch?.id ?? branch?.name ?? '-'}|${block?.id ?? block?.name ?? '-'}`
}

function splitOf(row: DepartmentMonthlyKpi, role: ManagerRole): ManagerSplit | undefined {
  return row.manager_splits?.find((s) => s.role === role)
}

/** Tỷ lệ của một vai quản lý: "7%" / "2,5%", không bao giờ "7,00%". */
function rolePctCell(row: any, role: ManagerRole) {
  if (row._rowKind) return null
  const split = splitOf(row, role)
  if (!split?.pct) return <Dash />
  return `${formatNumber(Number(split.pct), { maximumFractionDigits: 2 })}%`
}

/** Thành tiền của một vai quản lý trên dòng phòng ban, hoặc trên dòng cộng nhóm. */
function roleAmountCell(row: any, role: ManagerRole) {
  if (row._rowKind === 'group') return null
  if (row._rowKind) {
    return (
      <span className={cn('font-bold', AMOUNT_CLASS)}>
        {formatCurrencyVND(Number(row[ROLE_TOTAL_KEYS[role]] || 0))}
      </span>
    )
  }
  const split = splitOf(row, role)
  if (!split?.amount) return <Dash />

  // Vai không tìm được người nhận lúc tính: số tiền vẫn tính ra được từ % × doanh số, nhưng
  // KHÔNG có phiếu chi nào đứng sau nó. Hiện y như các ô khác là mời người dùng cộng vào một
  // khoản không tồn tại — đúng cái đã làm ~19,8tr hoa hồng GĐKD biến mất mà không ai biết.
  const { unresolved, reasonLabel } = readUnresolved(split)
  if (unresolved) {
    return (
      // Chữ "Chưa có người nhận" phải HIỆN, không nằm trong tooltip: bảng này được in ra và
      // chụp màn hình để đối chiếu, mà tooltip thì không đi theo. Người đọc bản in phải thấy
      // ngay số tiền này chưa có phiếu nào đứng sau.
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex flex-col items-end">
            <span className="text-text-warning-default font-semibold">
              {formatCurrencyVND(Number(split.amount))}
            </span>
            <span className="text-text-warning-default text-xs font-normal whitespace-nowrap underline decoration-dotted underline-offset-2">
              Chưa có người nhận
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {reasonLabel} nên kỳ này KHÔNG sinh phiếu hoa hồng cho vai này. Gán người phụ trách rồi
          tính lại kỳ thì khoản này mới được ghi nhận.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <span className={cn('font-semibold', AMOUNT_CLASS)}>
      {formatCurrencyVND(Number(split.amount))}
    </span>
  )
}

function countCell({ row, getValue }: any) {
  if (row.original._rowKind) return null
  return formatNumber(Number(getValue() || 0))
}

export function CommissionByRevenueTable({
  data,
  summary,
  isLoading,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  scope,
  onPaginationChange,
  onViewDetail,
}: CommissionByRevenueTableProps) {
  const ability = useAbility()
  // Grouping restates the branch/block a filter has already fixed, so it goes away as soon as
  // the list is scoped — leaving one flat run of departments under the printed heading.
  const isOrgScoped = scope.branch || scope.block || scope.department

  /**
   * Dòng TỔNG CỘNG đọc thẳng số của BE, không cộng `data`.
   *
   * `sumGroupRows` chỉ còn phục vụ dòng "Cộng nhóm" — nhóm nằm trong trang nên cộng tại chỗ,
   * còn tổng cuối bảng phải phủ mọi trang.
   *
   * Giữ nguyên giá trị thô (kể cả `undefined`) rồi để `formatSummaryCurrency` quyết định hiển
   * thị: `?? 0` ở đây sẽ biến "BE không trả số" thành một số 0 đọc y như một kỳ không phát sinh
   * doanh thu — đúng loại sai lệch mà cả thay đổi này sinh ra để dẹp.
   */
  const grandTotals = useMemo(
    () => ({
      actual_amount: summary?.actual_amount,
      target_amount: summary?.target_amount,
      tpkd_amount_total: summary?.tpkd_amount,
      gdkd_amount_total: summary?.gdkd_amount,
      ceo_amount_total: summary?.ceo_amount,
    }),
    [summary]
  )

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: 'stt',
        header: 'STT',
        // Ô này gánh cả nhãn của hai dòng bảng tự chèn, vì `getCellColSpan` gộp từ đây sang
        // phải: dòng tiêu đề nhóm trải hết bề ngang, dòng cộng nhóm trải hết cụm cột chữ.
        // STT tự quản: bảng chèn thêm dòng nhóm nên chỉ số theo vị trí hiển thị của
        // `showSTT` sẽ nhảy cóc. `_stt` đã được đánh sẵn khi dựng dữ liệu.
        cell: ({ row }) => {
          const { _rowKind, label, departmentCount, _stt } = row.original
          if (_rowKind === 'group') {
            // `sticky left-0` + `w-fit`: ô đã gộp rộng bằng cả bảng (~1.800px, quá khổ màn
            // hình), nên đẩy số phòng sang mép phải bằng `justify-between` là đẩy nó ra ngoài
            // vùng nhìn thấy. Neo cả cụm về trái và ghim lại — cuộn ngang tới cột thưởng nào
            // thì tên phân đoạn vẫn còn đó, khỏi phải cuộn ngược về mới biết đang ở nhóm nào.
            return (
              <div className="sticky left-0 flex w-fit items-baseline gap-2 text-left">
                <span className="typo-body-sm-semibold text-content-dark-1">{label}</span>
                {typeof departmentCount === 'number' && (
                  <span className="typo-body-xs-regular text-content-dark-3 shrink-0">
                    · {departmentCount} phòng
                  </span>
                )}
              </div>
            )
          }
          if (_rowKind === 'groupTotal') {
            return (
              <span className="typo-body-sm-semibold text-content-dark-2 block text-left">
                {label}
              </span>
            )
          }
          return _stt
        },
        // Deliberately not frozen: the summary row merges its "TỔNG CỘNG" label leftwards into
        // this cell, and `TableFooter` refuses to merge into a frozen column (a merged cell can
        // only carry one sticky offset).
        meta: { width: 'w-16', align: 'center', rowSpan: 2 },
      },
    ]

    // Scoped to one department, headcount and deal count stop being a footnote on the
    // department name and become the two things the row is actually about.
    if (scope.department) {
      cols.push(
        {
          accessorKey: 'employee_count',
          header: 'Số lượng nhân viên',
          cell: countCell,
          meta: { width: 'w-[120px]', align: 'right', rowSpan: 2 },
        },
        {
          accessorKey: 'revenue_deals_count',
          header: 'Số lượng giao dịch',
          cell: countCell,
          meta: { width: 'w-[120px]', align: 'right', rowSpan: 2 },
        }
      )
    }

    if (!scope.branch) {
      cols.push({
        id: 'branch',
        accessorFn: (row) => row.department_detail?.branch?.name || '',
        header: 'Chi nhánh',
        cell: ({ row, getValue }) => {
          // Nhãn nhóm không còn nằm ở đây — ô STT gộp sang đã nuốt trọn cột này.
          if (row.original._rowKind) return null
          return (getValue() as string) || <Dash />
        },
        meta: { width: 'w-[120px]', rowSpan: 2 },
      })
    }

    if (!scope.block) {
      cols.push({
        id: 'block',
        accessorFn: (row) => row.department_detail?.block?.name || '',
        header: 'Khối',
        cell: ({ row, getValue }) => {
          if (row.original._rowKind) return null
          return (getValue() as string) || <Dash />
        },
        meta: { width: 'w-[140px]', rowSpan: 2 },
      })
    }

    if (!scope.department) {
      cols.push({
        id: 'department',
        accessorFn: (row) => row.department_detail?.name || '',
        header: 'Phòng ban',
        cell: ({ row }) => {
          // Nhãn "Cộng nhóm" đã chuyển sang ô STT gộp, nên cột này chỉ còn dữ liệu thật.
          if (row.original._rowKind) return null
          return (
            <div className="flex flex-col">
              <span className="font-normal text-gray-900">
                {row.original.department_detail?.name || <Dash />}
              </span>
              <span className="text-[11px] text-gray-400">
                {row.original.employee_count || 0} nhân viên ·{' '}
                {row.original.revenue_deals_count || 0} giao dịch
              </span>
            </div>
          )
        },
        meta: { width: 'w-[180px]', rowSpan: 2 },
      })
    }

    cols.push(
      {
        accessorKey: 'actual_amount',
        header: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-4">
                Doanh số
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              Doanh số ghi nhận cho phòng, tính theo <b>phòng lúc bán</b> và chỉ tính cho phòng
              thuộc khối kinh doanh. Deal bán khi nhân viên còn ở phòng ngoài khối kinh doanh không
              được tính cho phòng nào, kể cả phòng họ chuyển đến sau đó — nên số này có thể khác
              tổng doanh số của các nhân viên trong phòng.
            </TooltipContent>
          </Tooltip>
        ),
        cell: ({ getValue, row }) => {
          if (row.original._rowKind === 'group') return null
          const val = Number(getValue() || 0)
          return (
            <span
              className={cn('font-semibold text-gray-950', row.original._rowKind && 'font-bold')}
            >
              {formatCurrencyVND(val)}
            </span>
          )
        },
        footer: () => formatSummaryCurrency(grandTotals.actual_amount),
        meta: { width: 'w-[140px]', align: 'right', rowSpan: 2 },
      },
      {
        accessorKey: 'target_amount',
        header: 'Chỉ tiêu quản lý',
        cell: ({ getValue, row }) => {
          if (row.original._rowKind === 'group') return null
          const val = Number(getValue() || 0)
          return (
            <span
              className={cn(row.original._rowKind ? 'font-bold text-gray-950' : 'text-gray-600')}
            >
              {formatCurrencyVND(val)}
            </span>
          )
        },
        footer: () => formatSummaryCurrency(grandTotals.target_amount),
        meta: { width: 'w-[140px]', align: 'right', rowSpan: 2 },
      },
      {
        accessorKey: 'completion_pct',
        header: 'Tỷ lệ hoàn thành',
        cell: ({ getValue, row }) => {
          if (row.original._rowKind) return null
          const val = Number(getValue() || 0)
          let variant = ColoredValueVariant.RED
          if (val >= 121) variant = ColoredValueVariant.GREEN
          else if (val >= 70) variant = ColoredValueVariant.BLUE
          else if (val >= 50) variant = ColoredValueVariant.YELLOW

          // A flat zero reads as "0%": the trailing ",0" was noise on the many rows that have
          // booked nothing yet, and a decimal only earns its place when there is one.
          return (
            <Chip label={`${formatNumber(val, { maximumFractionDigits: 1 })}%`} variant={variant} />
          )
        },
        meta: { width: 'w-[130px]', align: 'center', rowSpan: 2 },
      },
      {
        header: 'HH Quản lý Trưởng phòng',
        meta: { align: 'center' },
        columns: [
          {
            id: 'tpkd_rate',
            header: 'Tỷ lệ',
            cell: ({ row }) => rolePctCell(row.original, 'TPKD'),
            meta: { width: 'w-[80px]', align: 'right' },
          },
          {
            id: 'tpkd_amount',
            header: 'Thành tiền',
            cell: ({ row }) => roleAmountCell(row.original, 'TPKD'),
            footer: () => formatSummaryCurrency(grandTotals.tpkd_amount_total),
            meta: { width: 'w-[130px]', align: 'right' },
          },
        ],
      },
      {
        header: 'HH Quản lý Giám đốc',
        meta: { align: 'center' },
        columns: [
          {
            id: 'gdkd_rate',
            header: 'Tỷ lệ',
            cell: ({ row }) => rolePctCell(row.original, 'GDKD'),
            meta: { width: 'w-[80px]', align: 'right' },
          },
          {
            id: 'gdkd_amount',
            header: 'Thành tiền',
            cell: ({ row }) => roleAmountCell(row.original, 'GDKD'),
            footer: () => formatSummaryCurrency(grandTotals.gdkd_amount_total),
            meta: { width: 'w-[130px]', align: 'right' },
          },
        ],
      },
      {
        header: 'HH Quản lý Tổng giám đốc',
        meta: { align: 'center' },
        columns: [
          {
            id: 'ceo_rate',
            header: 'Tỷ lệ',
            cell: ({ row }) => rolePctCell(row.original, 'CEO'),
            meta: { width: 'w-[80px]', align: 'right' },
          },
          {
            id: 'ceo_amount',
            header: 'Thành tiền',
            cell: ({ row }) => roleAmountCell(row.original, 'CEO'),
            footer: () => formatSummaryCurrency(grandTotals.ceo_amount_total),
            meta: { width: 'w-[130px]', align: 'right' },
          },
        ],
      }
    )

    return cols
  }, [scope.branch, scope.block, scope.department, grandTotals])

  // Backend sắp xếp sẵn theo chi nhánh -> khối -> phòng, nên chỉ cần quét tuần tự và cắt
  // nhóm mỗi khi khoá đổi. Gom trọn nhóm TRƯỚC rồi mới trải ra, vì dòng tiêu đề nhóm cần
  // biết số phòng của chính nó — thứ chỉ đếm được sau khi đã duyệt hết nhóm. Nhóm và tổng
  // nhóm tính trong phạm vi TRANG hiện tại; tổng cuối bảng do dòng sticky `showSummaryRow` lo.
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return []

    const sttStart = (currentPage - 1) * pageSize
    if (isOrgScoped) {
      return data.map((row, index) => ({ ...row, _stt: sttStart + index + 1 }))
    }

    const groups: { key: string; label: string; members: DepartmentMonthlyKpi[] }[] = []
    data.forEach((row: any) => {
      const key = groupKeyOf(row)
      const current = groups[groups.length - 1]
      if (current?.key === key) {
        current.members.push(row)
        return
      }
      const branchName = row.department_detail?.branch?.name || '—'
      const blockName = row.department_detail?.block?.name || '—'
      groups.push({ key, label: `${branchName} › ${blockName}`, members: [row] })
    })

    const rows: any[] = []
    let index = 0
    groups.forEach((group, groupIndex) => {
      // Nhóm chạm mép trang thì có thể còn phòng nằm ở trang bên cạnh: nhóm được cắt theo `data`
      // của TRANG, không phải theo toàn tập. Không phát hiện được từ đây (trang trước/sau không
      // có trong tay), nên cứ chạm mép là coi như chưa đủ — thà nói "phần trong trang" còn hơn
      // dán nhãn "Cộng nhóm" lên một tổng thiếu mà kế toán mang đi đối chiếu.
      const isPartial =
        (groupIndex === 0 && currentPage > 1) ||
        (groupIndex === groups.length - 1 && currentPage < pageCount)

      rows.push({
        _rowKind: 'group' as SyntheticRowKind,
        label: group.label,
        // Số phòng chỉ in ra khi đếm được đủ. Nhóm cắt ngang trang mà vẫn in "· 25 phòng" là
        // đưa ra một con số sai, và đổi cỡ trang lại ra số khác.
        departmentCount: isPartial ? undefined : group.members.length,
      })
      group.members.forEach((member) => {
        rows.push({ ...member, _stt: sttStart + index + 1 })
        index += 1
      })
      rows.push({
        _rowKind: 'groupTotal' as SyntheticRowKind,
        label: isPartial ? 'Cộng nhóm (phần trong trang)' : 'Cộng nhóm',
        ...sumGroupRows(group.members),
      })
    })

    return rows
  }, [data, currentPage, pageSize, pageCount, isOrgScoped])

  useStickyTableHeader(`.${TABLE_SCOPE_CLASS}`, tableData)

  /**
   * Gộp ô cho hai dòng bảng tự chèn, cả hai đều bắt đầu từ ô STT.
   *
   * Tiêu đề nhóm trải hết bề ngang (`Infinity`) để thành một dải phân đoạn thật sự, thay vì
   * nhồi tên chi nhánh › khối vào đúng cột hẹp nó rơi trúng rồi xuống ba dòng. Dòng cộng nhóm
   * chỉ nuốt cụm cột chữ, để các cột số giữ nguyên vị trí và thẳng cột với dòng TỔNG CỘNG.
   */
  const getCellColSpan = useCallback((row: any, columnId: string) => {
    if (columnId !== 'stt' || !row._rowKind) return undefined
    return row._rowKind === 'group' ? Infinity : GROUP_TOTAL_LABEL_SPAN
  }, [])

  const rowActions = useMemo(
    () => [
      {
        label: 'Xem chi tiết nhân viên',
        // `show`, not `hidden` — the action menu only honours `show`, so the group and
        // subtotal rows used to offer a detail link that leads nowhere.
        //
        // Điều hướng `COMMISSION_BY_REVENUE_DETAIL` — route khai `departmentmonthlykpi.retrieve`.
        // Chú ý subject KHÁC `departmentcommissionpool` của màn "Chỉ tiêu phòng" dù hai màn nghe
        // rất giống nhau: đó là hai resource riêng ở BE (ClickUp 86eync7g0).
        show: (row: any) =>
          !row._rowKind &&
          ability.can(
            COMMISSION_ACTION_PERMISSION.VIEW_REVENUE_DEPT_DETAIL.action,
            COMMISSION_ACTION_PERMISSION.VIEW_REVENUE_DEPT_DETAIL.subject
          ),
        onClick: (row: DepartmentMonthlyKpi) => onViewDetail(row.id),
      },
    ],
    [ability, onViewDetail]
  )

  return (
    <Table
      className={`${TABLE_SCOPE_CLASS} !px-0`}
      columns={columns as any}
      data={tableData as any}
      isLoading={isLoading}
      pageCount={pageCount}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZES}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onRowClick={(row: any) => {
        if (row._rowKind) return
        onViewDetail(row.id)
      }}
      showSTT={false}
      showActions
      rowActions={rowActions}
      manualPagination
      bordered
      disableInnerOverflow={true}
      paginationPosition="static"
      stickyHeader
      // Không có `summary` thì KHÔNG dựng dòng tổng. Một dòng "TỔNG CỘNG (0 bản ghi) — 0 ₫"
      // dưới 25 phòng đang có doanh thu tiền tỷ đọc y hệt một kỳ chưa phát sinh gì: số 0 là giá
      // trị kế toán hợp lệ nên không có gì báo cho người dùng biết nó là số bịa.
      showSummaryRow={!!summary}
      // Số phòng của TOÀN tập, không phải số dòng đang xem — cùng nguồn với các cột tiền bên
      // cạnh, để dòng tổng không trộn một con số theo trang với năm con số theo bộ lọc.
      // `department_count` là optional trong schema; thiếu thì lùi về `totalRecords` (BE đảm bảo
      // hai số này luôn bằng nhau) chứ không hiện "(0 bản ghi)" cãi nhau với thanh phân trang.
      summaryRowCount={summary?.department_count ?? totalRecords}
      getCellColSpan={getCellColSpan}
      getRowClassName={(row: any) => {
        // Dòng do bảng tự chèn: không phải dữ liệu nên không nhận hiệu ứng hover/con trỏ của
        // dòng bấm được. Dòng cộng nhóm thêm một đường kẻ trên — vạch tổng của sổ kế toán.
        // Dải mở phân đoạn lấy sắc đỏ nhạt nhất của bộ token (`red-10`, #f7ebeb): xám nhạt
        // chìm nghỉm giữa các dòng phòng ban, còn đỏ là màu nhấn của hệ thống nên mắt bắt
        // được ranh giới chi nhánh › khối ngay cả khi lướt nhanh 25 dòng.
        if (row._rowKind === 'group') {
          return 'bg-red-10 hover:bg-red-10 cursor-default'
        }
        // Dòng đóng phân đoạn giữ nền trung tính + kẻ trên: tô đỏ cả hai đầu là hai vệt màu
        // tranh nhau, không còn phân biệt được đâu là mở đâu là tổng.
        if (row._rowKind === 'groupTotal') {
          return 'bg-background-2/40 hover:bg-background-2/40 cursor-default [&>td]:border-border-1 [&>td]:border-t'
        }
        return ''
      }}
    />
  )
}
