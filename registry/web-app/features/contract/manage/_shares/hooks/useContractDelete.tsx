import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteContract,
  type Contract,
  type ContractList,
} from '@/features/contract/services/contract-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useContractDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteContractMutation = useDeleteContract()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (contract: Contract | ContractList, onSuccess?: () => void) => {
      displayConfirm({
        title: 'Xoá hợp đồng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá hợp đồng{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {contract.contract_number || contract.code}
            </b>{' '}
            không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteContractMutation.mutateAsync(contract.id)

            // Invalidate all contracts queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xoá hợp đồng thành công')

            if (typeof onSuccess === 'function' && onSuccess) {
              onSuccess()
            } else if (typeof onSuccessfullyDelete === 'function' && onSuccessfullyDelete) {
              onSuccessfullyDelete()
            }
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteContractMutation, invalidateQueries, onSuccessfullyDelete, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteContractMutation.isPending,
  }
}
