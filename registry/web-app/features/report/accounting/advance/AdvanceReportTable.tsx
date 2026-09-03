import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import DealDetailLink from '@/components/commons/DealDetailLink'
import { IconCaretdown, IconCaretright } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { cn, formatCurrencyVND } from '@/utils'
import { formatDate } from '@/utils/date-utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import type {
  AdvanceSettlementRow,
  AdvanceSettlementSummary,
} from '@/features/accounting/reports/services/report-service'
import {
  getAdvanceRecipientLines,
  getAdvanceRowEmployees,
  getAdvanceSettlementDate,
  hasAdvanceRecipientBreakdown,
  type AdvanceRecipientLine,
  type AdvanceRowEmployee,
} from './advance-report-utils'

/** Mã NV above the full name, both pointing at the employee record when we know its id. */
const EmployeeIdentity = ({ employee }: { employee: AdvanceRowEmployee }) => {
  const detailPath = employee.id
    ? APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(employee.id))
    : undefined
  const name = employee.fullname || employee.code

  return (
    <div className="flex flex-col items-start gap-0.5">
      {employee.code ? <ReferenceCode code={employee.code} linkTo={detailPath} /> : null}
      {name && name !== employee.code ? (
        detailPath ? (
          <Link
            to={detailPath}
            target="_blank"
            className="text-brand-primary hover:text-brand-secondary text-sm font-medium transition-colors"
          >
            {name}
          </Link>
        ) : (
          <span className="text-sm font-medium">{name}</span>
        )
      ) : null}
    </div>
  )
}

/** ĐÃ THU HỒI reads green only when money actually came back; a plain 0 stays muted. */
const RecoveredAmount = ({ amount }: { amount: number }) => (
  <span
    className={
      amount > 0 ? 'text-data-green-default font-semibold' : 'text-content-dark-3 font-semibold'
    }
  >
    {formatCurrencyVND(amount)}
  </span>
)

type AdvanceReportTableProps = {
  /** Current page only. */
  data: AdvanceSettlementRow[]
  /**
   * Totals over the WHOLE filtered set, computed by the backend. Never derive these from
   * `data` — that is one page, and its sum would silently read as the filter's total.
   */
  summary?: AdvanceSettlementSummary
  isLoading?: boolean
  pageSize: number
  currentPageIndex: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
}

const AdvanceReportTable = ({
  data,
  summary,
  isLoading,
  pageSize,
  currentPageIndex,
  totalRecords,
  onPaginationChange,
}: AdvanceReportTableProps) => {
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  // Which advances the user folded away. Keyed by advance id, not by row index: the pager
  // reuses indices across pages, so an index-keyed set would fold an unrelated advance after
  // turning the page. Empty by default — the breakdown is the point of the report, so it is
  // open until someone chooses otherwise.
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<number>>(() => new Set<number>())

  const toggleCollapsed = useCallback((advanceId: number) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous)
      if (!next.delete(advanceId)) next.add(advanceId)
      return next
    })
  }, [])

  const totals = useMemo(
    () => ({
      paid: Number(summary?.total_paid ?? 0),
      recovered: Number(summary?.total_recovered ?? 0),
      remaining: Number(summary?.total_outstanding ?? 0),
    }),
    [summary]
  )

  const columns = useMemo<ColumnDef<AdvanceSettlementRow>[]>(
    () => [
      {
        id: 'employee',
        header: 'NHÂN SỰ',
        // CR 21.3 merged the old MÃ NV + HỌ TÊN pair: two columns for one person read as two
        // people once a request carried several recipients.
        cell: ({ row }) => {
          const advance = row.original

          // Several recipients — the row stands for the advance, and each person gets a
          // sub-row of their own below it (see `renderRowSubComponent`). Naming one of them
          // here would repeat the original bug: the report claimed a single person for money
          // that belonged to three.
          if (hasAdvanceRecipientBreakdown(advance)) {
            const recipientCount = getAdvanceRecipientLines(advance).length
            const isCollapsed = collapsedIds.has(advance.id)

            return (
              <div className="flex items-start gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleCollapsed(advance.id)
                  }}
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? 'Mở' : 'Thu gọn'} ${recipientCount} người nhận của phiếu ${advance.code}`}
                  className="mt-0.5 shrink-0 p-0.5 hover:opacity-75"
                >
                  {isCollapsed ? (
                    <IconCaretright className="h-4 w-4" />
                  ) : (
                    <IconCaretdown className="h-4 w-4" />
                  )}
                </button>
                <div className="flex flex-col items-start gap-0.5">
                  <ReferenceCode
                    code={advance.code}
                    linkTo={APP_PATH.COMMISSION_ADVANCE_DETAIL.replace(':id', String(advance.id))}
                  />
                  <span className="text-content-dark-3 text-sm">{recipientCount} người nhận</span>
                </div>
              </div>
            )
          }

          // An employee record with neither code nor name is not an identity — rendering it would
          // leave a blank cell that reads as a layout bug rather than as missing data.
          const employees = getAdvanceRowEmployees(advance).filter(
            (emp) => emp.code || emp.fullname
          )
          if (employees.length === 0) return '-'

          return (
            <div className="flex flex-col gap-1.5">
              {employees.map((emp, idx) => (
                <EmployeeIdentity key={emp.key ?? idx} employee={emp} />
              ))}
            </div>
          )
        },
        size: 200,
        meta: { sortable: false },
      },
      {
        accessorKey: 'paid_effective_date',
        header: 'NGÀY TẠM ỨNG',
        cell: ({ row }) =>
          row.original.paid_effective_date ? formatDate(row.original.paid_effective_date) : '-',
        size: 140,
        meta: { sortable: false, align: 'center' },
      },
      {
        // Sits right next to NGÀY TẠM ỨNG (CR 21.3) — the pair is what tells you whether a
        // request is still outstanding, so reading them apart defeats the report.
        id: 'settlement_date',
        header: 'NGÀY HOÀN TẠM ỨNG',
        cell: ({ row }) => {
          const settledAt = getAdvanceSettlementDate(row.original)
          return settledAt ? formatDate(settledAt) : '-'
        },
        size: 150,
        meta: { sortable: false, align: 'center' },
      },
      {
        id: 'deal',
        header: 'THÔNG TIN DEAL',
        cell: ({ row }) => {
          const deal = row.original.deal
          const unitNumber = deal?.product_inventory?.unit_number
          const projectName = deal?.project?.name
          const dealCode = deal?.code
          const dealId = deal?.id

          if (!unitNumber && !projectName && !dealCode && !dealId) return '-'

          const unitLabel = unitNumber || dealCode || (dealId ? `#${dealId}` : '')

          return (
            <div className="flex flex-col items-start gap-0.5">
              {projectName ? (
                <span className="text-content-dark-1 text-sm font-medium">{projectName}</span>
              ) : null}
              {unitLabel ? (
                <DealDetailLink
                  dealId={dealId}
                  title={dealCode ? `Giao dịch ${dealCode}` : undefined}
                  className="text-sm font-medium"
                >
                  {unitLabel}
                </DealDetailLink>
              ) : null}
            </div>
          )
        },
        size: 200,
        meta: { sortable: false },
      },
      {
        accessorKey: 'paid_amount',
        header: 'SỐ TIỀN TẠM ỨNG',
        cell: ({ row }) =>
          row.original.paid_amount != null ? (
            <span className="text-content-dark-1 font-semibold">
              {formatCurrencyVND(Number(row.original.paid_amount))}
            </span>
          ) : (
            '-'
          ),
        footer: () => formatSummaryCurrency(totals.paid),
        size: 160,
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'recovered_amount',
        header: 'ĐÃ THU HỒI TẠM ỨNG',
        // Was blue for every value, which made a plain `0` look like a link you could click.
        // Green now marks money actually recovered; nothing recovered stays muted (CR 21.3).
        cell: ({ row }) =>
          row.original.recovered_amount == null ? (
            '-'
          ) : (
            <RecoveredAmount amount={Number(row.original.recovered_amount)} />
          ),
        footer: () => formatSummaryCurrency(totals.recovered),
        size: 170,
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'remaining',
        header: 'CÒN LẠI',
        cell: ({ row }) => {
          const paid = Number(row.original.paid_amount || 0)
          const recovered = Number(row.original.recovered_amount || 0)
          const remaining = paid - recovered
          return (
            <span className="text-content-dark-1 font-semibold">
              {formatCurrencyVND(remaining)}
            </span>
          )
        },
        footer: () => formatSummaryCurrency(totals.remaining),
        size: 160,
        meta: { sortable: false, align: 'right' },
      },
    ],
    [totals, collapsedIds, toggleCollapsed]
  )

  /**
   * One sub-row per recipient, drawn against the parent's own columns.
   *
   * The cells are generated from `row.getVisibleCells()` rather than hand-listed so a sub-row
   * cannot drift out of the grid when a column is resized or reordered: every column gets a
   * `<td>` of the same width, and only the four that mean something per person carry content.
   * The rest stay blank on purpose — the advance's date and deal belong to the whole advance
   * and already sit on the parent row directly above.
   */
  const renderRowSubComponent = useCallback(
    (row: Row<AdvanceSettlementRow>) => {
      const advance = row.original
      if (!hasAdvanceRecipientBreakdown(advance) || collapsedIds.has(advance.id)) return null

      const cells = row.getVisibleCells()

      const renderSubCell = (columnId: string, line: AdvanceRecipientLine) => {
        switch (columnId) {
          case 'employee':
            return line.employee ? (
              <div className="flex items-start gap-1">
                <span className="text-content-dark-3 mt-0.5 shrink-0 text-sm">└</span>
                <EmployeeIdentity employee={line.employee} />
              </div>
            ) : (
              '-'
            )
          case 'paid_amount':
            return (
              <span className="text-content-dark-1 font-semibold">
                {formatCurrencyVND(line.paidAmount)}
              </span>
            )
          case 'recovered_amount':
            return <RecoveredAmount amount={line.recoveredAmount} />
          case 'remaining':
            return (
              <span className="text-content-dark-1 font-semibold">
                {formatCurrencyVND(line.remainingAmount)}
              </span>
            )
          default:
            return null
        }
      }

      return getAdvanceRecipientLines(advance).map((line) => (
        <tr key={`${advance.id}-${line.key}`} className="bg-background-2">
          {cells.map((cell) => {
            const columnId = cell.column.id
            const align = cell.column.columnDef.meta?.align || 'left'
            const width = cell.column.getSize()

            return (
              <td
                key={cell.id}
                data-column-id={columnId}
                className={cn(
                  'border-border-1 border-r border-b last:border-r-0',
                  'bg-clip-padding px-3 py-[10px]',
                  'break-words whitespace-normal',
                  align === 'center' && 'text-center',
                  align === 'right' && 'text-right'
                )}
                style={width > 0 ? { width, minWidth: width, maxWidth: width } : undefined}
              >
                {renderSubCell(columnId, line)}
              </td>
            )
          })}
        </tr>
      ))
    },
    [collapsedIds]
  )

  return (
    <Table
      data={data}
      columns={columns}
      isLoading={isLoading}
      showSTT={true}
      // Unfrozen on purpose: `TableFooter` refuses to merge the "TỔNG CỘNG" label into a frozen
      // column (a merged sticky cell would ride over the body while scrolling sideways), and CR
      // 21.3 asks for that label to occupy the STT cell. This table is narrow enough that a
      // pinned STT buys little. Sub-rows lean on the same choice: with nothing sticky, their
      // cells need no frozen offsets to stay aligned with the parent's.
      sttFrozen={false}
      enablePagination={true}
      manualPagination={true}
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      emptyMessage="Không có dữ liệu"
      bordered
      showSummaryRow={!!summary && summary.row_count > 0}
      summaryRowCount={summary?.row_count}
      // Recipient sub-rows are part of reading the report, not a detail to go hunting for, so
      // every row starts open; `collapsedIds` is what actually folds one away.
      defaultExpanded={true}
      renderRowSubComponent={renderRowSubComponent}
      /*
        `stickyHeader` thay cho `useStickyTableHeader` (gỡ 25/08/2026) — hook đó đẩy `<thead>` bằng
        `translateY` theo giả định *trang* đang cuộn, nên khi `stickyHeader` chặn chiều cao khung thì
        thứ cuộn là khung, `table.getBoundingClientRect().top` chạy âm và hook đẩy hàng tiêu đề TRÔI
        XUỐNG. Đo 25/08: cuộn khung 400px, thead lệch 0 → 170px. Đừng bật lại hook ở đây.
      */
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
    />
  )
}

export default AdvanceReportTable
