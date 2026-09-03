import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip } from '@/components/ui'
import { CursorActionMenuOverlay } from '@/components/ui/table/CursorActionMenuOverlay'
import type { TableAction } from '@/types/table'
import {
  IconArrowcounterclockwise,
  IconArrowsclockwise,
  IconCheck,
  IconEye,
  IconPencilsimple,
  IconProhibit,
  IconTrash,
} from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { cn, formatCurrencyVND } from '@/utils'
import type { ProjectPromotionDistribution } from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import {
  computeDeptCommission,
  computeRevenue,
} from '@/features/accounting/promotion-distributions/utils/promotion-distribution-calc'
import {
  PROMOTION_DISTRIBUTION_ACTIONS,
  PROMOTION_DISTRIBUTION_STATUS_LABEL,
  PROMOTION_DISTRIBUTION_STATUS_VARIANT,
  PROMOTION_DISTRIBUTION_SUBJECT,
  PromotionDistributionStatus,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

export { computeRevenue, computeDeptCommission }

export type PromotionDistributionTableProps = {
  data: ProjectPromotionDistribution[]
  isLoading: boolean
  periodLabel?: string
  onEdit?: (record: ProjectPromotionDistribution) => void
  onRecompute?: (record: ProjectPromotionDistribution) => void
  onConfirm?: (record: ProjectPromotionDistribution) => void
  onVoid?: (record: ProjectPromotionDistribution) => void
  onReopen?: (record: ProjectPromotionDistribution) => void
  onDelete?: (record: ProjectPromotionDistribution) => void
}

const HEAD_CELL = 'px-4 py-3 text-xs font-semibold text-content-dark-2 uppercase tracking-wide'
const BODY_CELL = 'px-4 py-3.5 text-sm text-content-dark-1 align-middle'
const COLOR_REVENUE_BASE = 'text-[#2563EB]'
const COLOR_COST = 'text-[#B45309]'
const COLOR_COMMISSION = 'text-action-primary-red-default'

function periodCell(record: ProjectPromotionDistribution): string {
  if (!record.period_month || !record.period_year) return '—'
  return `${String(record.period_month).padStart(2, '0')}/${record.period_year}`
}

const PromotionDistributionTable = ({
  data,
  isLoading,
  periodLabel,
  onEdit,
  onRecompute,
  onConfirm,
  onVoid,
  onReopen,
  onDelete,
}: PromotionDistributionTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const A = PROMOTION_DISTRIBUTION_ACTIONS
  const S = PROMOTION_DISTRIBUTION_SUBJECT

  const [cursorMenu, setCursorMenu] = useState<{
    x: number
    y: number
    row: ProjectPromotionDistribution
  } | null>(null)
  const closeCursorMenu = () => setCursorMenu(null)

  const buildActions = (): TableAction<ProjectPromotionDistribution>[] => {
    const actions: TableAction<ProjectPromotionDistribution>[] = []
    if (ability.can(A.RETRIEVE, S)) {
      actions.push({
        label: 'Xem chi tiết phân chia',
        icon: <IconEye size={16} />,
        onClick: (r) =>
          navigate(APP_PATH.PROMOTION_DISTRIBUTION_TRACKING_DETAIL.replace(':id', String(r.id))),
      })
    }
    if (ability.can(A.UPDATE, S)) {
      actions.push({
        label: 'Sửa dự án',
        icon: <IconPencilsimple size={16} />,
        show: (r) => r.status === PromotionDistributionStatus.DRAFT,
        onClick: (r) => onEdit?.(r),
      })
    }
    if (ability.can(A.RECOMPUTE, S)) {
      actions.push({
        label: 'Tính lại',
        icon: <IconArrowsclockwise size={16} />,
        show: (r) => r.status === PromotionDistributionStatus.DRAFT,
        onClick: (r) => onRecompute?.(r),
      })
    }
    if (ability.can(A.CONFIRM, S)) {
      actions.push({
        label: 'Xác nhận',
        icon: <IconCheck size={16} />,
        show: (r) => r.status === PromotionDistributionStatus.DRAFT,
        onClick: (r) => onConfirm?.(r),
      })
    }
    if (ability.can(A.VOID, S)) {
      actions.push({
        label: 'Vô hiệu hoá',
        icon: <IconProhibit size={16} />,
        variant: 'danger',
        show: (r) => r.status === PromotionDistributionStatus.CONFIRMED,
        onClick: (r) => onVoid?.(r),
      })
    }
    if (ability.can(A.REOPEN, S)) {
      actions.push({
        label: 'Mở lại',
        icon: <IconArrowcounterclockwise size={16} />,
        show: (r) => r.status === PromotionDistributionStatus.VOIDED,
        onClick: (r) => onReopen?.(r),
      })
    }
    if (ability.can(A.DESTROY, S)) {
      actions.push({
        label: 'Xóa khỏi kỳ',
        icon: <IconTrash size={16} />,
        variant: 'danger',
        show: (r) => r.status === PromotionDistributionStatus.DRAFT,
        onClick: (r) => onDelete?.(r),
      })
    }
    return actions
  }
  const rowActions = useMemo(buildActions, [
    ability,
    navigate,
    onEdit,
    onRecompute,
    onConfirm,
    onVoid,
    onReopen,
    onDelete,
  ])

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, r) => ({
          fee: acc.fee + Number(r.total_fee_calculation_price ?? 0),
          revenue: acc.revenue + computeRevenue(r),
          cost: acc.cost + Number(r.marketing_cost ?? 0),
          base: acc.base + Number(r.revenue_base ?? 0),
          commission: acc.commission + computeDeptCommission(r),
        }),
        { fee: 0, revenue: 0, cost: 0, base: 0, commission: 0 }
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
            <th className={cn(HEAD_CELL, 'text-right')}>Tiền hàng</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Tỷ lệ doanh thu</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Doanh thu</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Chi phí bán hàng</th>
            <th className={cn(HEAD_CELL, 'text-right')}>DT tính hoa hồng</th>
            <th className={cn(HEAD_CELL, 'text-right')}>Hoa hồng Phòng</th>
            <th className={cn(HEAD_CELL, 'text-left')}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={9} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                Đang tải...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-content-dark-3 px-4 py-10 text-center text-sm">
                Không có dự án nào trong kỳ {periodLabel ?? ''}.
              </td>
            </tr>
          ) : (
            data.map((r) => {
              const statusLabel = PROMOTION_DISTRIBUTION_STATUS_LABEL[r.status] ?? String(r.status)
              const statusVariant = PROMOTION_DISTRIBUTION_STATUS_VARIANT[r.status]
              return (
                <tr
                  key={r.id}
                  className="border-border-1 hover:bg-background-2/60 cursor-pointer border-b transition-colors"
                  onClick={(e) => setCursorMenu({ x: e.clientX, y: e.clientY, row: r })}
                >
                  <td className={cn(BODY_CELL, 'font-normal')}>{periodCell(r)}</td>
                  <td className={BODY_CELL}>
                    <div className="flex flex-col">
                      <span className="font-normal text-gray-900">{r.project_name || '—'}</span>
                      {r.project_code ? (
                        <span className="text-content-dark-3 text-xs">{r.project_code}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    {formatCurrencyVND(Number(r.total_fee_calculation_price ?? 0))}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right font-medium')}>
                    {r.snapshot_pct_promotion_revenue == null ||
                    r.snapshot_pct_promotion_revenue === ''
                      ? '—'
                      : `${Number(r.snapshot_pct_promotion_revenue)}%`}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right')}>
                    {formatCurrencyVND(computeRevenue(r))}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right', COLOR_COST)}>
                    −{formatCurrencyVND(Number(r.marketing_cost ?? 0))}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right font-medium', COLOR_REVENUE_BASE)}>
                    {formatCurrencyVND(Number(r.revenue_base ?? 0))}
                  </td>
                  <td className={cn(BODY_CELL, 'text-right font-semibold', COLOR_COMMISSION)}>
                    {formatCurrencyVND(computeDeptCommission(r))}
                  </td>
                  <td className={BODY_CELL}>
                    {statusVariant ? (
                      <Chip variant={statusVariant} label={statusLabel} />
                    ) : (
                      <span>{statusLabel}</span>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
        {!isLoading && data.length > 0 && (
          <tfoot>
            <tr className="bg-background-2 border-border-1 border-t font-semibold">
              <td className={cn(BODY_CELL, 'font-bold')} colSpan={2}>
                TỔNG KỲ {periodLabel ?? ''}
              </td>
              <td className={cn(BODY_CELL, 'text-right')}>{formatCurrencyVND(totals.fee)}</td>
              <td className={BODY_CELL}></td>
              <td className={cn(BODY_CELL, 'text-right')}>{formatCurrencyVND(totals.revenue)}</td>
              <td className={cn(BODY_CELL, 'text-right', COLOR_COST)}>
                −{formatCurrencyVND(totals.cost)}
              </td>
              <td className={cn(BODY_CELL, 'text-right', COLOR_REVENUE_BASE)}>
                {formatCurrencyVND(totals.base)}
              </td>
              <td className={cn(BODY_CELL, 'text-right', COLOR_COMMISSION)}>
                {formatCurrencyVND(totals.commission)}
              </td>
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

export default PromotionDistributionTable
