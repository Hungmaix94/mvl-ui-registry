import { type ComponentProps, useMemo, useState } from 'react'

import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

import type { PooledFeeGroup, PooledSplitSubmit } from '../components/PooledSplitDialog'
import type { PooledBand, RecipientPayoutTable } from '../components/RecipientPayoutTable'
import {
  type CommissionSplitDetail,
  type CommissionSplitListRow,
  type PooledAllocationRecord,
  useApplyPooledSplit,
  useCancelPooledSplit,
} from '../services/commission-splits-service'
import { isDeductionType } from '../utils/payout-math'

type PayoutGroups = ComponentProps<typeof RecipientPayoutTable>['groups']

interface UsePooledSplitArgs {
  detail: CommissionSplitDetail
  groups: PayoutGroups
  currentWorksheet?: CommissionSplitListRow
  worksheetId: number
  isCommissionType: ComponentProps<typeof RecipientPayoutTable>['isCommissionType']
  onRefresh?: () => void
}

/**
 * "Chia gộp cho đối tượng khác" của Mục ④: một người nhận cắt ngang MỌI phần chia của kỳ
 * thay vì thuộc về một người đứng tên. Gồm các dải đang có (`pooledBands`), nguồn để dựng
 * dialog (`pooledFeeGroups`), và ba thao tác áp/huỷ/sửa.
 */
export function usePooledSplit({
  detail,
  groups,
  currentWorksheet,
  worksheetId,
  isCommissionType,
  onRefresh,
}: UsePooledSplitArgs) {
  const { displayConfirm } = useDialog()

  const [pooledDialogOpen, setPooledDialogOpen] = useState(false)
  const [pooledEditing, setPooledEditing] = useState<PooledBand | null>(null)
  const [savingPooled, setSavingPooled] = useState(false)
  const { mutateAsync: applyPooledSplit } = useApplyPooledSplit()
  const { mutateAsync: cancelPooledSplit } = useCancelPooledSplit()

  const pooledBands: PooledBand[] = useMemo(
    () =>
      // Regen 2026-07-27: BE khai `pooled_allocations` là túi opaque
      // (`{[key: string]: unknown}[]`) nên phải neo lại về shape FE đã mô tả sẵn.
      ((detail.pooled_allocations || []) as unknown as PooledAllocationRecord[]).map((a) => ({
        id: a.id,
        payeeKey: a.employee_id
          ? `employee-${a.employee_id}`
          : a.collaborator_id
            ? `collaborator-${a.collaborator_id}`
            : `exchange-${a.exchange_id}`,
        name: a.payee_name || '—',
        isCtv: !!a.collaborator_id,
        isExchange: !!a.exchange_id,
        feePct: a.fee_pct != null ? Number(a.fee_pct) : null,
        fee: Number(a.fee_amount || 0),
        bonus: Number(a.bonus_amount || 0),
        // BE gửi giảm trừ ÂM (signed money); bảng này theo quy ước độ lớn dương như mọi
        // dòng khác, nên đảo dấu ở đúng một chỗ là đây.
        deduction: Math.abs(Number(a.deduction_amount || 0)),
        bonusPoolPct: a.bonus_pool_pct != null ? Number(a.bonus_pool_pct) : null,
        deductionRatioPct: a.deduction_ratio_pct != null ? Number(a.deduction_ratio_pct) : null,
      })),
    [detail]
  )

  // Dialog input: one row per stand person's FEE position (deduction/bonus types are
  // excluded by isCommissionType). sharePct must be the PERSONAL effective fee percent
  // ("% từng sale" of the accountant's spreadsheet: pool rate × participation) — NOT the
  // share's raw pool rate, which reads the same for every participant. Derive it from
  // money (share_full_amount ÷ fee basis), which stays correct for amount-mode and
  // custom-override shares; fall back to rate × participation when full money is absent.
  const pooledFeeGroups: PooledFeeGroup[] = useMemo(() => {
    const basis = Number(currentWorksheet?.basis || 0)
    return groups
      .map((g): PooledFeeGroup | null => {
        const feePos = g.positions.find((p) => isCommissionType(p.posData.pct_type || ''))
        if (!feePos) return null
        const posData = feePos.posData
        const owner = (posData.recipients || []).find(
          (r) =>
            (g.recipient_type === 'employee' && String(r.employee_id) === String(g.recipient_id)) ||
            (g.recipient_type === 'collaborator' &&
              String(r.collaborator_id) === String(g.recipient_id)) ||
            (g.recipient_type === 'exchange' && String(r.exchange_id) === String(g.recipient_id))
        )
        const shareFull = Number(posData.share_full_amount || 0)
        const sharePct =
          basis > 0 && shareFull > 0
            ? (shareFull / basis) * 100
            : Number(posData.percentage || 0) *
              (g.participationPct != null ? g.participationPct / 100 : 1)
        // Pool thưởng + bucket giảm trừ của CÙNG người đứng tên, để preview khớp BE:
        // BONUS lấy theo tỷ lệ pool đã phân bổ kỳ này, DEDUCTION suy ra từ ratio phí.
        const bonusExpected = g.positions
          .filter((p) => !isCommissionType(p.posData.pct_type || '') && !isDeductionType(p.posData))
          .reduce((s, p) => s + Number(p.posData.expected_amount || 0), 0)
        const deductionExpected = g.positions
          .filter((p) => isDeductionType(p.posData))
          .reduce((s, p) => s + Number(p.posData.expected_amount || 0), 0)
        return {
          code: g.code,
          name: g.name,
          kind: g.recipient_type,
          participationPct: g.participationPct,
          sharePct,
          feeExpected: Number(posData.expected_amount || 0),
          ownerAmount: Number(posData.expected_amount || owner?.amount || 0),
          bonusExpected,
          deductionExpected,
        }
      })
      // `!== 0`: nhóm chỉ mang tiền ÂM (đòi lại) với `percentage` = 0 vẫn phải hiện ở bảng
      // chia gộp, nếu không thì không có cách nào chia phần thu hồi cho người nhận hộ.
      .filter((g): g is PooledFeeGroup => !!g && (g.sharePct !== 0 || g.feeExpected !== 0))
  }, [groups, currentWorksheet, isCommissionType])

  const submitPooledSplit = async ({
    payee,
    feePct,
    bonusPoolPct,
    bonusAmount,
    note,
  }: PooledSplitSubmit) => {
    if (!worksheetId) {
      toastService.error('Không tìm thấy ID bảng tính hoa hồng')
      return
    }
    try {
      setSavingPooled(true)
      await applyPooledSplit({
        id: worksheetId,
        data: {
          employee_id: payee.kind === 'employee' ? payee.id : null,
          collaborator_id: payee.kind === 'collaborator' ? payee.id : null,
          exchange_id: payee.kind === 'exchange' ? payee.id : null,
          // Kênh nào không nhập thì KHÔNG gửi field: BE coi vắng mặt là "tắt kênh" và fold
          // phần đã trừ về người đứng tên. Gửi 0 sẽ bị BE từ chối (0 không phải công tắc).
          ...(feePct ? { fee_pct: feePct } : {}),
          ...(bonusPoolPct ? { bonus_pool_pct: bonusPoolPct } : {}),
          ...(bonusAmount ? { bonus_amount: bonusAmount } : {}),
          note,
        },
      })
      toastService.success('Đã lưu chia gộp')
      setPooledDialogOpen(false)
      setPooledEditing(null)
      onRefresh?.()
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    } finally {
      setSavingPooled(false)
    }
  }

  const onCancelPooled = (band: PooledBand) => {
    if (!worksheetId) return
    displayConfirm({
      title: 'Hủy chia gộp',
      content: `Hủy chia gộp cho ${band.name}? Phần đã trừ sẽ trả về từng sale/F2 theo tỷ lệ tham gia.`,
      confirmText: 'Hủy chia gộp',
      onConfirm: async () => {
        try {
          await cancelPooledSplit({ id: worksheetId, data: { allocation_id: band.id } })
          toastService.success('Đã hủy chia gộp')
          onRefresh?.()
        } catch (error) {
          toastService.error(extractErrorMessage(error))
        }
      },
    })
  }

  const onEditPooled = (band: PooledBand) => {
    setPooledEditing(band)
    setPooledDialogOpen(true)
  }

  return {
    pooledDialogOpen,
    setPooledDialogOpen,
    pooledEditing,
    setPooledEditing,
    savingPooled,
    pooledBands,
    pooledFeeGroups,
    submitPooledSplit,
    onCancelPooled,
    onEditPooled,
  }
}
