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
  canMarkSigned,
  ContractStatus,
} from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'

type ContractLike = CollaboratorContract | CollaboratorContractList

export const useCollaboratorContractMarkSigned = (onSuccess?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const patchMutation = usePartialUpdateCollaboratorContract()
  const invalidateQueries = useInvalidateQueries()

  const openMarkSignedDialog = useCallback(
    (contract: ContractLike) => {
      if (!canMarkSigned(contract.status)) {
        toastService.warning('Chỉ có thể ký hợp đồng đang ở trạng thái Bản nháp')
        return
      }

      displayConfirm({
        title: 'Đánh dấu đã ký',
        content: (
          <div className="text-content-dark-2">
            Đánh dấu hợp đồng{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{contract.code}</b> là{' '}
            <b className="typo-body-lg-regular text-content-dark-2">Đã ký</b>?
            <br />
            Sau khi đánh dấu, không thể quay về trạng thái Bản nháp.
          </div>
        ),
        confirmText: 'Đánh dấu đã ký',
        cancelText: 'Huỷ',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await patchMutation.mutateAsync({
              id: contract.id,
              data: { status: ContractStatus.signed },
            })
            await invalidateQueries.invalidateByPrefix('sales/collaborator-contracts')
            toastService.success('Đã đánh dấu hợp đồng là Đã ký')
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
    openMarkSignedDialog,
    isPending: patchMutation.isPending,
  }
}
