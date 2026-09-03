import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip } from '@/components/ui'
import { EmployeeProfileLink, ReferenceCode } from '@/components/commons'
import ProjectDetailLink from '@/components/commons/ProjectDetailLink'
import { CursorActionMenuOverlay } from '@/components/ui/table/CursorActionMenuOverlay'
import type { TableAction } from '@/types/table'
import {
  IconArrowcounterclockwise,
  IconArrowsclockwise,
  IconCheck,
  IconDotsthreevertical,
  IconEye,
  IconPencilsimple,
  IconProhibit,
} from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { cn, formatCurrencyVND } from '@/utils'
import type { ProjectDirectorCommissionPeriod } from '@/features/accounting/director-commissions/services/director-commission-service'
import {
  BALANCE_STATE_VARIANT,
  DIRECTOR_COMMISSION_ACTIONS as A,
  DIRECTOR_COMMISSION_STATUS_VARIANT,
  DIRECTOR_COMMISSION_SUBJECT as S,
  DirectorCommissionStatus,
} from '@/features/accounting/director-commissions/constants/director-commission-constants'
import { useDirectorCommissionConstants } from '@/features/accounting/director-commissions/hooks/useDirectorCommissionConstants'

export type DirectorCommissionTableProps = {
  data: ProjectDirectorCommissionPeriod[]
  isLoading: boolean
  periodLabel?: string
  onEdit?: (record: ProjectDirectorCommissionPeriod) => void
  onRecompute?: (record: ProjectDirectorCommissionPeriod) => void
  onConfirm?: (record: ProjectDirectorCommissionPeriod) => void
  onVoid?: (record: ProjectDirectorCommissionPeriod) => void
  onReopen?: (record: ProjectDirectorCommissionPeriod) => void
}

const HEAD_CELL = 'px-4 py-3 text-xs font-semibold text-content-dark-2 uppercase tracking-wide'
const BODY_CELL = 'px-4 py-3.5 text-sm text-content-dark-1 align-middle'

function periodCell(record: ProjectDirectorCommissionPeriod): string {
  if (!record.period_month || !record.period_year) return '—'
  return `${String(record.period_month).padStart(2, '0')}/${record.period_year}`
}

/** Signed payout: positive = disbursed (red), negative = clawback "Đòi lại" (orange). */
function PayoutCell({ value }: { value: string }) {
  const amt = Number(value ?? 0)
  if (amt < 0) {
    return (
      <span className="text-data-orange-default font-semibold">
        Đòi lại {formatCurrencyVND(Math.abs(amt))}
      </span>
    )
  }
  return <span className="text-data-red-default font-semibold">{formatCurrencyVND(amt)}</span>
}

const DirectorCommissionTable = ({
  data,
  isLoading,
  periodLabel,
  onEdit,
  onRecompute,
  onConfirm,
  onVoid,
  onReopen,
}: DirectorCommissionTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { statusLabels, balanceLabels } = useDirectorCommissionConstants()

  const [cursorMenu, setCursorMenu] = useState<{
    x: number
    y: number
    row: ProjectDirectorCommissionPeriod
  } | null>(null)
  const closeCursorMenu = () => setCursorMenu(null)

  const goToDetail = (id: number) =>
    navigate(APP_PATH.DIRECTOR_COMMISSION_TRACKING_DETAIL.replace(':id', String(id)))

  const rowActions = useMemo<TableAction<ProjectDirectorCommissionPeriod>[]>(() => {
    const actions: TableAction<ProjectDirectorCommissionPeriod>[] = []
    if (ability.can(A.RETRIEVE, S)) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (r) => goToDetail(r.id),
      })
    }
    if (ability.can(A.PARTIAL_UPDATE, S)) {
      actions.push({
        label: 'Sửa',
        icon: <IconPencilsimple size={16} />,
        show: (r) => r.status === DirectorCommissionStatus.DRAFT,
        onClick: (r) => onEdit?.(r),
      })
    }
    if (ability.can(A.RECOMPUTE, S)) {
      actions.push({
        label: 'Tính lại',
        icon: <IconArrowsclockwise size={16} />,
        show: (r) =>
          r.status === DirectorCommissionStatus.DRAFT ||
          r.status === DirectorCommissionStatus.CONFIRMED,
        onClick: (r) => onRecompute?.(r),
      })
    }
    if (ability.can(A.CONFIRM, S)) {
      actions.push({
        label: 'Duyệt',
        icon: <IconCheck size={16} />,
        show: (r) => r.status === DirectorCommissionStatus.DRAFT,
        onClick: (r) => onConfirm?.(r),
      })
    }
    if (ability.can(A.VOID, S)) {
      actions.push({
        label: 'Vô hiệu hoá',
        icon: <IconProhibit size={16} />,
        variant: 'danger',
        show: (r) => r.status === DirectorCommissionStatus.CONFIRMED,
        onClick: (r) => onVoid?.(r),
      })
    }
    if (ability.can(A.REOPEN, S)) {
      actions.push({
        label: 'Mở lại',
        icon: <IconArrowcounterclockwise size={16} />,
        show: (r) => r.status === DirectorCommissionStatus.VOIDED,
        onClick: (r) => onReopen?.(r),
      })
    }
    return actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ability, navigate, onEdit, onRecompute, onConfirm, onVoid, onReopen])

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, r) => ({
          receipt: acc.receipt + Number(r.receipt_in_period ?? 0),
          payout: acc.payout + Number(r.payout_amount ?? 0),
          balance: acc.balance + Number(r.balance_after ?? 0),
        }),
        { receipt: 0, payout: 0, balance: 0 }
      ),
    [data]
  )

  return (
    <div className="border-border-1 overflow-x-auto rounded-lg border bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-border-1 border-b">
            <th className={cn(HEAD_CELL, 'text-left')}>Tháng</th>
            <th className={cn(HEAD_CELL, 'text-left')}>Dự án</th>
            <th className={cn(HEAD_CELL, 'text-left')}>Giám đốc dự án</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Tiền về trong kỳ</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Lũy kế tiền về</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Mức %</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Chi / (Đòi lại)</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Số dư</th>
            <th className={cn(HEAD_CELL, 'text-left')}>Trạng thái</th>
            <th className={cn(HEAD_CELL, 'text-right')}></th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={10} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                Đang tải...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                Không có dự án nào trong kỳ {periodLabel ?? ''}.
              </td>
            </tr>
          ) : (
            data.map((r) => {
              const statusLabel = statusLabels[r.status] ?? String(r.status)
              const statusVariant = DIRECTOR_COMMISSION_STATUS_VARIANT[r.status]
              const balanceLabel = balanceLabels[r.balance_state] ?? String(r.balance_state)
              const balanceVariant = BALANCE_STATE_VARIANT[r.balance_state]
              const pctPayout = Number(r.pct_payout ?? 0)
              const pctEntitled = Number(r.pct_entitled ?? 0)
              const pctDiffers = pctPayout !== pctEntitled
              return (
                <tr
                  key={r.id}
                  className="border-border-1 hover:bg-background-2/60 cursor-pointer border-b transition-colors"
                  onClick={() => goToDetail(r.id)}
                >
                  <td className={cn(BODY_CELL, 'font-normal')}>{periodCell(r)}</td>
                  <td className={BODY_CELL}>
                    <div className="flex flex-col">
                      <ProjectDetailLink projectId={r.project} className="font-normal">
                        {r.project_name || '—'}
                      </ProjectDetailLink>
                      {r.project_code ? (
                        <span className="text-content-dark-3 text-xs">{r.project_code}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className={BODY_CELL}>
                    <div className="flex flex-col items-start gap-1">
                      <EmployeeProfileLink employeeId={r.director} className="font-normal">
                        {r.director_name || '—'}
                      </EmployeeProfileLink>
                      {r.director_code ? (
                        <ReferenceCode
                          code={r.director_code}
                          className="[&_code]:px-1 [&_code]:py-0 [&_code]:text-xs"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    {formatCurrencyVND(Number(r.receipt_in_period ?? 0))}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    {formatCurrencyVND(Number(r.receipt_cum ?? 0))}
                  </td>
                  <td
                    className={cn(BODY_CELL, 'text-right font-medium')}
                    title={pctDiffers ? `Được hưởng: ${pctEntitled}%` : undefined}
                  >
                    {pctPayout}%
                    {pctDiffers ? (
                      <span className="text-content-dark-3 ml-1 text-xs">({pctEntitled}%)</span>
                    ) : null}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    <PayoutCell value={r.payout_amount} />
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    <div className="flex items-center justify-end gap-2">
                      <span className="">{formatCurrencyVND(Number(r.balance_after ?? 0))}</span>
                      {balanceVariant ? (
                        <Chip variant={balanceVariant} label={balanceLabel} size="small" />
                      ) : null}
                    </div>
                  </td>
                  <td className={BODY_CELL}>
                    {statusVariant ? (
                      <Chip variant={statusVariant} label={statusLabel} />
                    ) : (
                      <span>{statusLabel}</span>
                    )}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    {rowActions.length > 0 ? (
                      <button
                        type="button"
                        className="hover:bg-background-2 text-content-dark-3 inline-flex h-8 w-8 items-center justify-center rounded-md"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCursorMenu({ x: e.clientX, y: e.clientY, row: r })
                        }}
                      >
                        <IconDotsthreevertical size={18} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
        {!isLoading && data.length > 0 && (
          <tfoot>
            <tr className="bg-background-2 border-border-1 border-t font-semibold">
              <td className={cn(BODY_CELL, 'font-bold')} colSpan={3}>
                TỔNG KỲ {periodLabel ?? ''}
              </td>
              <td className={cn(BODY_CELL, 'text-right')}>{formatCurrencyVND(totals.receipt)}</td>
              <td className={BODY_CELL}></td>
              <td className={BODY_CELL}></td>
              <td className={cn(BODY_CELL, 'text-right')}>
                <PayoutCell value={String(totals.payout)} />
              </td>
              <td className={cn(BODY_CELL, 'text-right')}>{formatCurrencyVND(totals.balance)}</td>
              <td className={BODY_CELL}></td>
              <td className={BODY_CELL}></td>
            </tr>
          </tfoot>
        )}
      </table>
      <CursorActionMenuOverlay
        position={cursorMenu ? { x: cursorMenu.x, y: cursorMenu.y } : null}
        row={cursorMenu?.row ?? null}
        actions={rowActions}
        onClose={closeCursorMenu}
      />
    </div>
  )
}

export default DirectorCommissionTable
