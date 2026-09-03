import { useCallback, useRef } from 'react'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import {
  useConfirmPromotionDistribution,
  useReopenPromotionDistribution,
  useVoidPromotionDistribution,
  usePartialUpdatePromotionDistribution,
  useDeletePromotionDistribution,
  type ProjectPromotionDistribution,
  type ProjectPromotionDistributionRequest,
  type PatchedProjectPromotionDistributionInputRequest,
} from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import {
  PROMOTION_DISTRIBUTION_ACTIONS as A,
  PROMOTION_DISTRIBUTION_SUBJECT as SUBJECT,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'
import PromotionDistributionVoidDialogContent, {
  type PromotionDistributionVoidDialogContentRef,
} from '@/features/accounting/promotion-distributions/components/PromotionDistributionVoidDialogContent'

type UsePromotionDistributionActionsOptions = {
  /** Called after any successful state change so the caller can refetch or navigate. */
  onChanged?: () => void
}

/** Build the PUT/confirm/reopen body from a record (the API re-validates the full input). */
function toRequestBody(record: ProjectPromotionDistribution): ProjectPromotionDistributionRequest {
  return {
    project: record.project,
    accounting_period: record.accounting_period,
    mkt_cutoff_date: record.mkt_cutoff_date,
    marketing_cost: record.marketing_cost,
    note: record.note,
  }
}

/**
 * Build the PATCH body for the "Tính lại" (recompute) action. BE re-snapshots
 * lines on every PATCH using the supplied inputs. Note is excluded — the patched
 * input schema only accepts the calculation inputs (project, period, cutoff, cost).
 */
function toPartialRequestBody(
  record: ProjectPromotionDistribution
): PatchedProjectPromotionDistributionInputRequest {
  return {
    project: record.project,
    accounting_period: record.accounting_period,
    ...(record.mkt_cutoff_date ? { mkt_cutoff_date: record.mkt_cutoff_date } : {}),
    marketing_cost: record.marketing_cost ?? '0',
  }
}

export function usePromotionDistributionActions(options?: UsePromotionDistributionActionsOptions) {
  const ability = useAbility()
  const { displayConfirm, displayCustom, setLoading, displayClose } = useDialog()
  const voidDialogRef = useRef<PromotionDistributionVoidDialogContentRef | null>(null)

  const confirmMutation = useConfirmPromotionDistribution()
  const reopenMutation = useReopenPromotionDistribution()
  const voidMutation = useVoidPromotionDistribution()
  const partialUpdateMutation = usePartialUpdatePromotionDistribution()
  const deleteMutation = useDeletePromotionDistribution()

  const onChanged = options?.onChanged

  const confirm = useCallback(
    (record: ProjectPromotionDistribution) => {
      if (!ability.can(A.CONFIRM, SUBJECT)) return
      displayConfirm({
        title: 'Xác nhận phiếu',
        content: `Xác nhận phiếu hoa hồng xúc tiến của dự án "${record.project_name}"? Sau khi xác nhận sẽ chuyển sang trạng thái Chính thức.`,
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          await confirmMutation.mutateAsync({ id: record.id, data: toRequestBody(record) })
          toastService.success('Đã xác nhận phiếu')
          onChanged?.()
        },
      })
    },
    [ability, displayConfirm, confirmMutation, onChanged]
  )

  const reopen = useCallback(
    (record: ProjectPromotionDistribution) => {
      if (!ability.can(A.REOPEN, SUBJECT)) return
      displayConfirm({
        title: 'Mở lại phiếu',
        content: `Mở lại phiếu của dự án "${record.project_name}" về trạng thái Nháp?`,
        confirmText: 'Mở lại',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          await reopenMutation.mutateAsync({ id: record.id, data: toRequestBody(record) })
          toastService.success('Đã mở lại phiếu')
          onChanged?.()
        },
      })
    },
    [ability, displayConfirm, reopenMutation, onChanged]
  )

  const recompute = useCallback(
    (record: ProjectPromotionDistribution) => {
      if (!ability.can(A.RECOMPUTE, SUBJECT)) return
      displayConfirm({
        title: 'Tính lại phiếu',
        content: `Tính lại doanh thu và phân chia hoa hồng cho dự án "${record.project_name}"?`,
        confirmText: 'Tính lại',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          await partialUpdateMutation.mutateAsync({
            id: record.id,
            data: toPartialRequestBody(record),
          })
          toastService.success('Đã tính lại phiếu')
          onChanged?.()
        },
      })
    },
    [ability, displayConfirm, partialUpdateMutation, onChanged]
  )

  const remove = useCallback(
    (record: ProjectPromotionDistribution) => {
      if (!ability.can(A.DESTROY, SUBJECT)) return
      displayConfirm({
        title: 'Xóa khỏi kỳ',
        content: `Xóa phiếu của dự án "${record.project_name}" khỏi kỳ này? Hành động này không thể hoàn tác.`,
        onConfirm: async () => {
          await deleteMutation.mutateAsync(record.id)
          toastService.success('Đã xóa phiếu khỏi kỳ')
          onChanged?.()
        },
      })
    },
    [ability, displayConfirm, deleteMutation, onChanged]
  )

  const openVoid = useCallback(
    (record: ProjectPromotionDistribution) => {
      if (!ability.can(A.VOID, SUBJECT)) return
      voidDialogRef.current = null
      displayCustom({
        title: 'Vô hiệu hoá phiếu',
        content: (
          <PromotionDistributionVoidDialogContent
            ref={(r) => {
              voidDialogRef.current = r
            }}
          />
        ),
        confirmText: 'Vô hiệu hoá',
        cancelText: 'Đóng',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'md',
        // Cho phép đóng dialog: hiện nút X (cần onClose + không chặn backdrop) và nút "Đóng" (cần onCancel).
        onCancel: () => displayClose(),
        onClose: () => {
          voidDialogRef.current = null
        },
        onConfirm: async () => {
          const data = voidDialogRef.current?.getData()
          if (!data) {
            const error = new Error('Validation failed')
            ;(error as { isValidationError?: boolean }).isValidationError = true
            throw error
          }
          setLoading(true)
          try {
            await voidMutation.mutateAsync({ id: record.id, data })
            toastService.success('Đã vô hiệu hoá phiếu')
            onChanged?.()
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [ability, displayCustom, setLoading, voidMutation, onChanged, displayClose]
  )

  return { confirm, reopen, recompute, remove, openVoid }
}
