import { useCallback } from 'react'

import { useDialog } from '@/hooks/useDialog'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service.tsx'
import {
  usePartialUpdateCollaboratorContract,
  type CollaboratorContract,
  type CollaboratorContractList,
} from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import {
  canCancel,
  ContractStatus,
} from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'

type ContractLike = CollaboratorContract | CollaboratorContractList

export const useCollaboratorContractCancel = (onSuccess?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const patchMutation = usePartialUpdateCollaboratorContract()
  const invalidateQueries = useInvalidateQueries()

  const openCancelDialog = useCallback(
    (contract: ContractLike) => {
      if (!canCancel(contract.status)) {
        toastService.warning('Chỉ có thể huỷ hợp đồng đang ở trạng thái Bản nháp')
        return
      }

      displayConfirm({
        title: 'Huỷ hợp đồng',
        content: (
          <div className="text-content-dark-2">
            Huỷ hợp đồng <b className="typo-body-lg-regular text-content-dark-2">{contract.code}</b>
            ?
            <br />
            Sau khi huỷ, không thể khôi phục.
          </div>
        ),
        confirmText: 'Huỷ hợp đồng',
        cancelText: 'Đóng',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await patchMutation.mutateAsync({
              id: contract.id,
              data: { status: ContractStatus.cancelled },
            })
            await invalidateQueries.invalidateByPrefix('sales/collaborator-contracts')
            toastService.success('Đã huỷ hợp đồng')
            onSuccess?.()
          } catch {
            // error toast handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, patchMutation, invalidateQueries, onSuccess]
  )

  return {
    openCancelDialog,
    isPending: patchMutation.isPending,
  }
}
