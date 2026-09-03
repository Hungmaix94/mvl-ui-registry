import { useMemo } from 'react'
import { formatCurrencyVND, formatNumber } from '@/utils'
import ResignedChip from '@/components/commons/ResignedChip'
import { ProjectPromotionDepartmentAllocationSplit_status as SplitStatus } from '@/api/schema'
import type {
  ProjectPromotionDistributionLine,
  ProjectPromotionDepartmentAllocation,
} from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import {
  PROMOTION_PCT_TYPE_LABEL,
  PROMOTION_PCT_TYPE_ORDER,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

type PromotionDistributionBreakdownTableProps = {
  /** Individual employee lines (direct recipients + split results). */
  lines: ProjectPromotionDistributionLine[]
  /**
   * Department-pool allocations. A pool that is still PENDING_SPLIT is shown as
   * a single department recipient; a SPLIT_DONE pool is expanded into its
   * individual `lines`.
   */
  departmentAllocations?: ProjectPromotionDepartmentAllocation[]
  /** Label for the pink total footer row. When omitted, the footer is not rendered. */
  totalLabel?: string
}

type Recipient =
  | { kind: 'employee'; line: ProjectPromotionDistributionLine }
  | { kind: 'department'; alloc: ProjectPromotionDepartmentAllocation }

type DisplayRow = {
  key: string
  pctType: string
  inhousePct: number
  contribution: number
  amount: number
  recipient: Recipient
}

function toEmployeeRow(line: ProjectPromotionDistributionLine, pctType: string): DisplayRow {
  return {
    key: `line-${line.id}`,
    pctType,
    inhousePct: Number(line.snapshot_pct_split ?? 0),
    contribution: Number(line.snapshot_contribution_level ?? 0),
    amount: Number(line.amount ?? 0),
    recipient: { kind: 'employee', line },
  }
}

/**
 * Flatten the record into one display row per recipient. Department pools that
 * are not yet split surface as a department recipient; split pools expand into
 * their member lines. Direct employee lines (not tied to a pool) are appended.
 */
function buildRows(
  lines: ProjectPromotionDistributionLine[],
  allocations: ProjectPromotionDepartmentAllocation[]
): DisplayRow[] {
  const rows: DisplayRow[] = []

  allocations.forEach((alloc) => {
    const splitLines = alloc.lines ?? []
    if (alloc.split_status === SplitStatus.SPLIT_DONE && splitLines.length > 0) {
      splitLines.forEach((line) => rows.push(toEmployeeRow(line, alloc.pct_type)))
    } else {
      rows.push({
        key: `alloc-${alloc.id}`,
        pctType: alloc.pct_type,
        inhousePct: Number(alloc.snapshot_pct_split ?? 0),
        contribution: Number(alloc.snapshot_contribution_level ?? 0),
        amount: Number(alloc.amount ?? 0),
        recipient: { kind: 'department', alloc },
      })
    }
  })

  // Direct employee lines that don't belong to a department pool.
  lines.forEach((line) => {
    if (line.department_allocation == null) rows.push(toEmployeeRow(line, line.pct_type))
  })

  return rows
}

/** Pretty-print a percent without trailing zeros (e.g. 0.24, 100). */
function fmtPct(value: number): string {
  return `${formatNumber(value, { maximumFractionDigits: 4 })}%`
}

/** Renders the "Người / Phòng nhận" cell for an employee or a department pool. */
function RecipientInfo({ recipient }: { recipient: Recipient }) {
  if (recipient.kind === 'employee') {
    const { line } = recipient
    const detail = line.employee_detail
    const orgUnit = detail?.department?.name || detail?.block?.name
    const sub = [orgUnit, detail?.position?.name].filter(Boolean).join(' · ')
    return (
      <div className="flex flex-col">
        <span className="flex items-center gap-1.5 font-medium">
          {line.employee_name || '—'}
          <ResignedChip
            isWorking={line.employee_is_working}
            statusDisplay={line.employee_status_display}
          />
        </span>
        {sub ? (
          <span className="text-content-dark-3 text-xs">{sub}</span>
        ) : line.employee_code ? (
          <span className="text-content-dark-3 text-xs">{line.employee_code}</span>
        ) : null}
      </div>
    )
  }

  const { alloc } = recipient
  const departmentName = alloc.department_name || alloc.department_detail?.name
  const leaderName = alloc.department_detail?.leader?.fullname
  return (
    <div className="flex flex-col">
      <span className="font-medium">{departmentName || '—'}</span>
      {leaderName ? (
        <span className="text-content-dark-3 text-xs">TP: {leaderName}</span>
      ) : (
        <span className="text-content-dark-3 text-xs">Phòng ban</span>
      )}
    </div>
  )
}

const HEAD_CELL =
  'border-border-1 text-content-dark-2 border-b border-r last:border-r-0 px-3 py-3 text-sm font-semibold'
const HEAD_FORMULA = 'text-content-dark-4 ml-1 text-[11px] font-normal'
const BODY_CELL =
  'border-border-1 border-b border-r last:border-r-0 px-3 py-3 text-sm text-content-dark-1 align-middle'

export default function PromotionDistributionBreakdownTable({
  lines,
  departmentAllocations,
  totalLabel,
}: PromotionDistributionBreakdownTableProps) {
  const rows = useMemo(
    () => buildRows(lines ?? [], departmentAllocations ?? []),
    [lines, departmentAllocations]
  )

  const groups = useMemo(() => {
    return PROMOTION_PCT_TYPE_ORDER.map((type) => ({
      type,
      label: PROMOTION_PCT_TYPE_LABEL[type] ?? type,
      rows: rows.filter((r) => r.pctType === type),
    })).filter((g) => g.rows.length > 0)
  }, [rows])

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows])

  if (!rows.length) {
    return (
      <div className="border-border-1 text-content-dark-3 rounded-md border border-dashed p-6 text-center text-sm">
        Chưa có dòng phân chia hoa hồng nào.
      </div>
    )
  }

  return (
    <div className="border-border-1 overflow-x-auto rounded-lg border bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-background-2 text-left">
            <th className={HEAD_CELL}>Loại xúc tiến</th>
            <th className={`${HEAD_CELL} text-right`}>
              <span className="text-content-dark-4 mr-1">(7)</span>Tỷ lệ In-house (%)
            </th>
            <th className={HEAD_CELL}>Người / Phòng nhận</th>
            <th className={`${HEAD_CELL} text-right`}>
              <span className="text-content-dark-4 mr-1">(8)</span>Mức độ đóng góp (%)
            </th>
            <th className={`${HEAD_CELL} text-right`}>
              <div className="flex flex-col items-end">
                <span>
                  <span className="text-content-dark-4 mr-1">(9)</span>Tỷ lệ thực tế (%)
                </span>
                <span className={HEAD_FORMULA}>= (7) × (8) ÷ 100</span>
              </div>
            </th>
            <th className={`${HEAD_CELL} text-right`}>
              <div className="flex flex-col items-end">
                <span>
                  <span className="text-content-dark-4 mr-1">(10)</span>Thành tiền
                </span>
                <span className={HEAD_FORMULA}>= (5) × (9) ÷ 100 × (6)</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) =>
            group.rows.map((row, ri) => {
              const isMulti = group.rows.length > 1
              const actual = (row.inhousePct * row.contribution) / 100
              return (
                <tr key={row.key} className={isMulti ? 'bg-background-2/40' : undefined}>
                  {ri === 0 && (
                    <td
                      className={`${BODY_CELL} align-middle font-medium`}
                      rowSpan={group.rows.length}
                    >
                      {group.label}
                    </td>
                  )}
                  {ri === 0 && (
                    <td
                      className={`${BODY_CELL} text-right align-middle`}
                      rowSpan={group.rows.length}
                    >
                      {formatNumber(group.rows[0].inhousePct)}%
                    </td>
                  )}
                  <td className={BODY_CELL}>
                    <RecipientInfo recipient={row.recipient} />
                  </td>
                  <td className={`${BODY_CELL} text-right`}>{formatNumber(row.contribution)}%</td>
                  <td className={`${BODY_CELL} text-right`}>{fmtPct(actual)}</td>
                  <td className={`${BODY_CELL} text-right font-medium`}>
                    {formatCurrencyVND(row.amount)}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
        {totalLabel ? (
          <tfoot>
            <tr className="bg-action-primary-red-activated">
              <td
                colSpan={5}
                className="text-action-primary-red-default px-3 py-3 text-right text-sm font-semibold"
              >
                {totalLabel}
              </td>
              <td className="text-action-primary-red-default px-3 py-3 text-right text-sm font-semibold">
                {formatCurrencyVND(total)} VNĐ
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
