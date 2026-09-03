import { useCallback, useRef } from 'react'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import {
  useConfirmDirectorCommission,
  useReopenDirectorCommission,
  useRecomputeDirectorCommission,
  useVoidDirectorCommission,
  type ProjectDirectorCommissionPeriod,
} from '@/features/accounting/director-commissions/services/director-commission-service'
import {
  DIRECTOR_COMMISSION_ACTIONS as A,
  DIRECTOR_COMMISSION_SUBJECT as SUBJECT,
} from '@/features/accounting/director-commissions/constants/director-commission-constants'
import DirectorCommissionVoidDialogContent, {
  type DirectorCommissionVoidDialogContentRef,
} from '@/features/accounting/director-commissions/components/DirectorCommissionVoidDialogContent'

type UseDirectorCommissionActionsOptions = {
  /** Called after any successful state change so the caller can refetch or navigate. */
  onChanged?: () => void
}

export function useDirectorCommissionActions(options?: UseDirectorCommissionActionsOptions) {
  const ability = useAbility()
  const { displayConfirm, displayCustom, setLoading, displayClose } = useDialog()
  const voidDialogRef = useRef<DirectorCommissionVoidDialogContentRef | null>(null)

  const confirmMutation = useConfirmDirectorCommission()
  const reopenMutation = useReopenDirectorCommission()
  const recomputeMutation = useRecomputeDirectorCommission()
  const voidMutation = useVoidDirectorCommission()

  const onChanged = options?.onChanged

  const confirm = useCallback(
    (record: ProjectDirectorCommissionPeriod) => {
      if (!ability.can(A.CONFIRM, SUBJECT)) return
      displayConfirm({
        title: 'Duyệt kỳ hoa hồng',
        content: `Duyệt kỳ hoa hồng Giám đốc dự án của "${record.project_name}"? Sau khi duyệt sẽ chuyển sang trạng thái Chính thức.`,
        confirmText: 'Duyệt',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          await confirmMutation.mutateAsync(record.id)
          toastService.success('Đã duyệt kỳ hoa hồng')
          onChanged?.()
        },
      })
    },
    [ability, displayConfirm, confirmMutation, onChanged]
  )

  const reopen = useCallback(
    (record: ProjectDirectorCommissionPeriod) => {
      if (!ability.can(A.REOPEN, SUBJECT)) return
      displayConfirm({
        title: 'Mở lại kỳ hoa hồng',
        content: `Mở lại kỳ của dự án "${record.project_name}" về trạng thái Nháp?`,
        confirmText: 'Mở lại',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          await reopenMutation.mutateAsync(record.id)
          toastService.success('Đã mở lại kỳ hoa hồng')
          onChanged?.()
        },
      })
    },
    [ability, displayConfirm, reopenMutation, onChanged]
  )

  const recompute = useCallback(
    (record: ProjectDirectorCommissionPeriod) => {
      if (!ability.can(A.RECOMPUTE, SUBJECT)) return
      displayConfirm({
        title: 'Tính lại kỳ hoa hồng',
        content: `Tính lại số liệu hoa hồng Giám đốc dự án cho "${record.project_name}"?`,
        confirmText: 'Tính lại',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          await recomputeMutation.mutateAsync(record.id)
          toastService.success('Đã tính lại kỳ hoa hồng')
          onChanged?.()
        },
      })
    },
    [ability, displayConfirm, recomputeMutation, onChanged]
  )

  const openVoid = useCallback(
    (record: ProjectDirectorCommissionPeriod) => {
      if (!ability.can(A.VOID, SUBJECT)) return
      voidDialogRef.current = null
      displayCustom({
        title: 'Vô hiệu hoá kỳ hoa hồng',
        content: (
          <DirectorCommissionVoidDialogContent
            ref={(r) => {
              voidDialogRef.current = r
            }}
          />
        ),
        confirmText: 'Vô hiệu hoá',
        cancelText: 'Đóng',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-content-light-1',
        size: 'md',
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
            toastService.success('Đã vô hiệu hoá kỳ hoa hồng')
            onChanged?.()
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [ability, displayCustom, setLoading, voidMutation, onChanged, displayClose]
  )

  return { confirm, reopen, recompute, openVoid }
}
